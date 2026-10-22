#!/usr/bin/env python3
"""OHANA Street: validate catalog structure and locally stored product photos."""
import json
import hashlib
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
items = json.loads((ROOT / "catalogo.json").read_text(encoding="utf-8"))
active = [p for p in items if p.get("genere") == "Scarpe" and p.get("vetrina") is not False]
errors = []
warnings = []
image_hashes = {}
image_total_bytes = 0
ids = Counter(p.get("id", "") for p in active)
for item_id, count in ids.items():
    if not item_id or count > 1:
        errors.append(f"ID non valido/duplicato: {item_id!r} ({count})")
for p in active:
    pid = p.get("id", "<senza ID>")
    images = p.get("images")
    if not isinstance(images, list) or len(images) != 3:
        errors.append(f"{pid}: richieste esattamente tre immagini")
        continue
    if p.get("image") != images[0]:
        errors.append(f"{pid}: copertina diversa dalla prima foto")
    if len(set(images)) != 3:
        errors.append(f"{pid}: immagini ripetute nella galleria")
    for name in images:
        if not isinstance(name, str) or not re.fullmatch(r"assets/products/[A-Za-z0-9_.-]+\.webp", name):
            errors.append(f"{pid}: percorso foto non consentito {name!r}")
            continue
        photo = ROOT / name
        if not photo.is_file():
            errors.append(f"{pid}: foto mancante {name}")
        else:
            size = photo.stat().st_size
            image_total_bytes += size
            if size < 1000:
                warnings.append(f"{pid}: foto sospettosamente piccola {name}")
            with photo.open("rb") as fh:
                signature = fh.read(12)
                if signature[:4] != b"RIFF" or signature[8:12] != b"WEBP":
                    errors.append(f"{pid}: file non valido come WebP: {name}")
            digest = hashlib.sha256(photo.read_bytes()).hexdigest()
            other = image_hashes.get(digest)
            if other and other != name:
                warnings.append(f"{pid}: immagine identica ad altro file {other}")
            image_hashes[digest] = name
    if not (p.get("model") or "").strip() or not (p.get("brand") or "").strip():
        errors.append(f"{pid}: marchio o modello mancante")
    if not (p.get("descrizione") or "").strip():
        warnings.append(f"{pid}: descrizione assente")
print(f"Schede archiviate: {len(items)}; vetrina: {len(active)}; marchi: {len(set(p['brand'] for p in active))}; immagini attese: {len(active)*3}")
for w in warnings:
    print("WARN:", w)
for e in errors:
    print("ERRORE:", e)
print(f"File fotografici unici SHA256: {len(image_hashes)}; byte immagini controllate: {image_total_bytes}")
print(f"Esito: {len(errors)} errori, {len(warnings)} avvisi")
sys.exit(1 if errors else 0)
