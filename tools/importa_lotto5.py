#!/usr/bin/env python3
"""OHANA STREET: publish the photo-reviewed Lotto 5 after explicit rights approval.

Reads a pinned private staging manifest and approval record. Supplier URLs stay
in the private Supabase manager database, never in catalogo.json.
"""
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import re
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_REPO = "mauriziocuneo-hue/Ohana-street"
STAGING_PATH = "importazione/risultati/LOTTO5_66_SCHEDE_STAGING_CONSOLIDATO_20261021.json"
APPROVAL_PATH = "importazione/risultati/LOTTO5_AUTORIZZAZIONE_PUBBLICAZIONE.json"
TOKEN = os.environ.get("OHANA_PRIVATE_READ_TOKEN", "")
PRODUCT_ID = re.compile(r"OH-[A-F0-9]{12}\Z")
IMAGE_PATH = re.compile(r"importazione/lotto5_privato/assets/products/OH-[A-F0-9]{12}_[123]\.webp\Z")
CJK = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")
assert TOKEN, "Token privato mancante"

def read_private(path):
    assert re.fullmatch(r"[A-Za-z0-9_./-]+", path) and ".." not in path, "Percorso non valido"
    url = "https://api.github.com/repos/" + PRIVATE_REPO + "/contents/" + path
    req = Request(url, headers={
        "Authorization": "Bearer " + TOKEN,
        "Accept": "application/vnd.github+json",
        "User-Agent": "OHANA-lotto5-reviewed-release",
    })
    with urlopen(req, timeout=45) as response:
        payload = json.load(response)
    assert payload["type"] == "file" and payload["encoding"] == "base64"
    return base64.b64decode(payload["content"]), payload["sha"]

def git_blob_sha(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

def build_release():
    manifest_raw, manifest_sha = read_private(STAGING_PATH)
    staging = json.loads(manifest_raw)
    assert staging["version"] == 1 and staging["staged_cards"] == 66
    assert staging["staged_images"] == 198 and staging["release_allowed"] is False
    products = staging["products"]
    assert len(products) == 66
    ids = [p["id"] for p in products]
    assert len(set(ids)) == 66 and all(PRODUCT_ID.fullmatch(x) for x in ids)

    approval_raw, _ = read_private(APPROVAL_PATH)
    approval = json.loads(approval_raw)
    assert approval.get("manifest_blob_sha") == manifest_sha, "Manifest modificato: riapprovare"
    assert approval.get("photo_use_authorized_by_catalog_owner") is True, "Diritti immagini non confermati"
    assert approval.get("approval_scope") == "OHANA_STREET_LOTTO5_66_PHOTOS"
    assert approval.get("approved_product_ids") == sorted(ids), "Approvazione lotto incompleta"
    assert isinstance(approval.get("authorization_note"), str) and len(approval["authorization_note"]) >= 15

    catalog_file = ROOT / "catalogo.json"
    catalog = json.loads(catalog_file.read_text(encoding="utf-8"))
    assert len(catalog) >= 481
    old_ids = {p["id"] for p in catalog}
    assert len(old_ids) == len(catalog)
    # Two legacy Cortez records exist as hidden placeholders with wrong titles.
    # Upgrade these in place, preserving all other historical catalog entries.
    upgrades = {"OH-C121AC985A18", "OH-7075FE998A59"}
    assert old_ids.intersection(ids) == upgrades, "Collisione inattesa con il catalogo esistente"
    previous = {p["id"]: p for p in catalog}
    for pid in upgrades:
        old = previous[pid]
        assert old.get("genere") == "Scarpe" and old.get("vetrina") is False
        assert old["image"] == "assets/products/" + pid + ".webp"
    current_visible = [p for p in catalog if p.get("genere") == "Scarpe" and p.get("vetrina") is not False]
    assert len(current_visible) >= 74
    old_image_hashes = set()
    for p in current_visible:
        for img in p.get("images") or [p["image"]]:
            old_image_hashes.add(hashlib.sha256((ROOT / img).read_bytes()).hexdigest())

    requests = []
    cards = []
    for i, p in enumerate(products):
        pid = p["id"]
        brand = p["brand"]
        title = p["titolo_it"].strip()
        description = p["descrizione_it"].strip()
        assert isinstance(brand, str) and 2 <= len(brand) <= 40
        assert 8 <= len(title) <= 105 and not CJK.search(title)
        assert 35 <= len(description) <= 350 and not CJK.search(description)
        gallery = p["images"]
        assert len(gallery) == 3
        photo_paths = []
        for view, img in enumerate(gallery, 1):
            original = img["private_path"]
            target = "assets/products/{}_{}.webp".format(pid, view)
            assert IMAGE_PATH.fullmatch(original) and original.endswith("/" + target)
            assert re.fullmatch(r"[a-f0-9]{40}", img["git_blob_sha"])
            assert int(img["bytes"]) >= 4500
            assert not (ROOT / target).exists(), "Immagine gia presente"
            requests.append((original, img["git_blob_sha"], int(img["bytes"]), target))
            photo_paths.append(target)
        cards.append({
            "id": pid, "brand": brand, "model": title,
            "genere": "Scarpe", "sottogenere": "Sneakers", "category": "Sneakers",
            "kind": "sneaker", "style": "Selezione OHANA",
            "tags": [brand.lower(), "sneakers"], "tone": i % 8,
            "image": photo_paths[0], "images": photo_paths,
            "descrizione": description, "modelloVerificato": True,
            "status": "Selezione fotografica", "selezione": "editoriale", "vetrina": True,
        })
    assert len(requests) == 198 and len({r[0] for r in requests}) == 198

    def download(item):
        data, _ = read_private(item[0])
        assert len(data) == item[2] and git_blob_sha(data) == item[1], "Foto diversa dal manifesto"
        assert data[:4] == b"RIFF" and data[8:12] == b"WEBP", "Foto non WebP"
        return item[3], data

    with ThreadPoolExecutor(max_workers=8) as pool:
        images = list(pool.map(download, requests))
    unique_hashes = set(old_image_hashes)
    for target, data in images:
        digest = hashlib.sha256(data).hexdigest()
        assert digest not in unique_hashes, "Fotografia gia presente o duplicata: " + target
        unique_hashes.add(digest)

    # Change local files only after all authorization, manifests and images pass.
    for target, data in images:
        dest = ROOT / target
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
    additions = {p["id"]: p for p in cards}
    merged = [additions.pop(old["id"], old) for old in catalog]
    assert len(additions) == 64, "Attesi 64 nuovi articoli e 2 aggiornamenti legacy"
    merged.extend(additions.values())
    assert len(merged) == len(catalog) + 64
    assert sum(p.get("genere") == "Scarpe" and p.get("vetrina") is not False for p in merged) == len(current_visible) + 66
    catalog_file.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("PASS: +64 nuove schede, 2 Cortez corrette, +198 foto; URL fornitori solo privati.")

if __name__ == "__main__":
    build_release()
