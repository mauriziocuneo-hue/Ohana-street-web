#!/usr/bin/env python3
"""Verifica il catalogo e prepara SOLTANTO i file pubblici per GitHub Pages."""
from pathlib import Path
import json
import re
import shutil

root = Path(".")
dest = Path("_site")
catalog = json.loads(Path("catalogo.json").read_text(encoding="utf-8"))
assert isinstance(catalog, list) and 68 <= len(catalog) <= 40000, "Catalogo non valido o incompleto"
required = ["index.html", "catalogo.json", "favicon.svg", "gestione/index.html", "gestione/config.js", "assets/ohana-chat.css", "assets/ohana-chat.js"]
for file in required:
    assert Path(file).is_file(), f"File mancante: {file}"
    if file.endswith((".html", ".json", ".js")):
        txt = Path(file).read_text(encoding="utf-8")
        assert "yupoo.com" not in txt.lower(), f"Riferimenti a fornitori nel file pubblico: {file}"

found = set()
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
    raw = file.read_bytes()[:12]
    assert raw[:3] == b"\xff\xd8\xff" or raw[:8] == b"\x89PNG\r\n\x1a\n" or (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"), f"Non è una foto valida: {path}"

assert "href=\"gestione/\"" in Path("index.html").read_text(encoding="utf-8"), "Il pulsante gestori manca"
config = Path("gestione/config.js").read_text(encoding="utf-8")
assert "tqkmrejfbvzchfplgxzl.supabase.co" in config, "Configurazione Supabase da verificare"
assert "service_role" not in config and "sb_secret_" not in config, "Chiave segreta nel codice pubblico"

if dest.exists(): shutil.rmtree(dest)
dest.mkdir()
for item in ["index.html", "catalogo.json", "favicon.svg"]:
    shutil.copy2(item, dest / item)
shutil.copytree("assets/products", dest / "assets/products")
for item in ["ohana-chat.css", "ohana-chat.js"]:
    shutil.copy2(Path("assets") / item, dest / "assets" / item)
(dest / "gestione").mkdir()
for item in ["index.html", "config.js"]:
    shutil.copy2(Path("gestione") / item, dest / "gestione" / item)
(dest / ".nojekyll").write_text("", encoding="utf-8")
print(f"PASS: {len(catalog)} articoli con foto, login gestori predisposto, nessun URL Yupoo nei file pubblici.")
