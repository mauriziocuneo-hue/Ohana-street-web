#!/usr/bin/env python3
"""Verifica il catalogo e prepara SOLTANTO i file pubblici per GitHub Pages."""
from pathlib import Path
import hashlib
import json
import re
import shutil

root = Path(".")
dest = Path("_site")
catalog = json.loads(Path("catalogo.json").read_text(encoding="utf-8"))
assert isinstance(catalog, list) and 68 <= len(catalog) <= 40000, "Catalogo non valido o incompleto"
required = ["index.html", "catalogo.json", "modelli.html", "modelli.json", "favicon.svg", "gestione/index.html", "gestione/config.js", "assets/ohana-chat.css", "assets/ohana-chat.js", "assets/ohana-media.js", "assets/ohana-media.css", "foto-extra.json"]
for file in required:
    assert Path(file).is_file(), f"File mancante: {file}"
    if file.endswith((".html", ".json", ".js")):
        txt = Path(file).read_text(encoding="utf-8")
        assert "yupoo.com" not in txt.lower(), f"Riferimenti a fornitori nel file pubblico: {file}"

found = set()
visible_photo_digests = {}
all_products_by_id = {p['id']: p for p in catalog}
for p in catalog:
    assert all(p.get(k) for k in ("id", "brand", "model", "genere", "sottogenere", "image")), f"Prodotto incompleto: {p}"
    assert p["id"] not in found, f"Codice duplicato: {p['id']}"
    # Evita che le prossime importazioni reintroducano titoli in cinese o altre scritture CJK.
    for key in ("brand", "model", "genere", "sottogenere", "category", "style"):
        if p.get(key):
            assert not re.search(r"[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f]", str(p[key])), f"Testo non tradotto ({key}): {p['id']}"
    found.add(p["id"])
    assert not any(re.search(r"supplier|album_url|catalog_url|password", str(k), re.I) for k in p), "Campi privati nel catalogo"
    path = p["image"]
    assert isinstance(path, str) and re.fullmatch(r"assets/products/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|webp|png)", path, re.I), f"Percorso non valido: {path}"
    file = Path(path)
    assert file.is_file() and file.stat().st_size > 1000, f"Foto mancante/vuota: {path}"
    raw = file.read_bytes()
    assert raw[:3] == b"\xff\xd8\xff" or raw[:8] == b"\x89PNG\r\n\x1a\n" or (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"), f"Non è una foto valida: {path}"
    # Pubblicare due card che usano gli stessi byte immagine confonde il cliente.
    if p["genere"] == "Scarpe":
        if p.get("vetrina") is False:
            # Archivio editoriale: preserva schede e mapping ma non renderle pubbliche.
            # I vecchi link duplicatoDi possono essere archiviati indipendentemente.
            pass
        else:
            digest = hashlib.sha256(raw).hexdigest()
            assert digest not in visible_photo_digests, (
                f"Foto duplicata esposta per {p['id']} e {visible_photo_digests.get(digest)}"
            )
            visible_photo_digests[digest] = p["id"]
            if p.get("selezione")=="editoriale":
                gallery=p.get("images")
                assert isinstance(gallery,list) and len(gallery)==3 and gallery[0]==path, f"Galleria diversa da 3 foto: {p['id']}"
                image_hashes=set()
                for photo_path in gallery:
                    assert isinstance(photo_path,str) and re.fullmatch(r"assets/products/[A-Za-z0-9_.-]+\.webp",photo_path), "Percorso galleria non valido"
                    photo=Path(photo_path)
                    assert photo.is_file() and photo.stat().st_size>1000, f"Foto galleria mancante: {photo_path}"
                    raw_gallery=photo.read_bytes()
                    assert raw_gallery[:4]==b"RIFF" and raw_gallery[8:12]==b"WEBP", "Foto galleria non WebP"
                    image_hashes.add(hashlib.sha256(raw_gallery).hexdigest())
                assert len(image_hashes)==3, f"Due foto esattamente identiche: {p['id']}"
                assert p.get("modelloVerificato") is True, f"Modello non verificato: {p['id']}"
                assert isinstance(p.get("descrizione"),str) and 35<=len(p["descrizione"])<=350, f"Descrizione mancante: {p['id']}"

# Il bot espone solo foto approvate, locali, collegate a un articolo visibile.
media = json.loads(Path('foto-extra.json').read_text(encoding='utf-8'))
assert media.get('version') == 1 and isinstance(media.get('products'), dict), 'Indice foto extra non valido'
for pid, photos in media['products'].items():
    product = all_products_by_id.get(pid)
    assert product and product.get('vetrina') is True, f'Foto extra per articolo non pubblico: {pid}'
    assert isinstance(photos, list) and photos, f'Foto extra vuote: {pid}'
    hashes = {hashlib.sha256(Path(name).read_bytes()).hexdigest() for name in product['images']}
    for photo in photos:
        name = photo.get('src', '')
        assert re.fullmatch(r'assets/products/[A-Za-z0-9_.-]+\.webp', name), 'Percorso foto extra non valido'
        raw = Path(name).read_bytes()
        assert len(raw) > 1000 and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP', f'Foto extra non valida: {name}'
        digest = hashlib.sha256(raw).hexdigest()
        assert digest not in hashes, f'Foto extra duplicata: {name}'
        hashes.add(digest)
        assert isinstance(photo.get('label'), str) and 3 <= len(photo['label']) <= 60, 'Didascalia foto extra mancante'

# L'indice modelli e' una fotografia informativa del censimento: non va confuso con schede prodotto pubblicabili.
models = json.loads(Path("modelli.json").read_text(encoding="utf-8"))
assert models.get("version") == 1 and models.get("totale_album_scarpe") == 16841, "Indice modelli incompleto"
brands = models.get("brands")
assert isinstance(brands, list) and len(brands) == 20, "Mancano gruppi di marchio"
assert len(set(b.get("brand") for b in brands)) == 20, "Marchi ripetuti nell'indice"
assert sum(b.get("album_censiti",0) for b in brands) == 16841, "Album non corrispondenti al censimento"
family_count = 0
for brand_row in brands:
    entries=brand_row.get("modelli")
    assert isinstance(entries,list), "Elenco famiglie non valido"
    names=set()
    for family in entries:
        name=family.get("nome","")
        assert isinstance(name,str) and 2 <= len(name) <= 90 and not re.search(r"[\u3400-\u9fff\uf900-\ufaff]", name), "Nome famiglia non valido"
        assert name not in names, "Famiglia ripetuta"
        names.add(name)
        assert isinstance(family.get("album_ricondotti"),int) and 0 < family["album_ricondotti"] <= brand_row["album_censiti"], "Conteggio famiglia non valido"
        family_count += 1
assert 140 <= family_count <= 220, "Indice incompleto o imprevisto"
assert "href=\"catalogo-nuovo.html#catalogo\"" in Path("index.html").read_text(encoding="utf-8"), "Collegamento al catalogo completo mancante"
assert "href=\"gestione/\"" in Path("index.html").read_text(encoding="utf-8"), "Il pulsante gestori manca"
config = Path("gestione/config.js").read_text(encoding="utf-8")
assert "tqkmrejfbvzchfplgxzl.supabase.co" in config, "Configurazione Supabase da verificare"
assert "service_role" not in config and "sb_secret_" not in config, "Chiave segreta nel codice pubblico"

# The trial catalog has its own reviewed albums and public-file allowlist.
import runpy
runpy.run_path(str(Path('scripts/audit_catalogo_nuovo.py').resolve()))
if dest.exists(): shutil.rmtree(dest)
dest.mkdir()
for item in ["index.html", "catalogo.json", "modelli.html", "modelli.json", "favicon.svg", "verifica-responsive.html", "foto-extra.json"]:
    shutil.copy2(item, dest / item)
for item in ['catalogo-nuovo.html', 'catalogo-nuovo.json']:
    shutil.copy2(item, dest / item)
shutil.copytree("assets/products", dest / "assets/products")
for item in ["ohana-chat.css", "ohana-chat.js", "ohana-media.css", "ohana-media.js"]:
    shutil.copy2(Path("assets") / item, dest / "assets" / item)
for item in ['ohana-catalogo.js','ohana-catalogo.css','ohana-theme.css']:
    shutil.copy2(Path('assets') / item, dest / 'assets' / item)
(dest / "gestione").mkdir()
for item in ["index.html", "config.js"]:
    shutil.copy2(Path("gestione") / item, dest / "gestione" / item)
(dest / ".nojekyll").write_text("", encoding="utf-8")
print(f"PASS: {len(catalog)} schede archiviate; {len(visible_photo_digests)} foto di scarpe distinte esposte; {family_count} famiglie modello consultabili, nessun link privato.")

