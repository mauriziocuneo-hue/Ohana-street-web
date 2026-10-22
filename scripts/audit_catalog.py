#!/usr/bin/env python3
"""OHANA Street: validate catalog structure and locally stored product photos."""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
items = json.loads((ROOT / "catalogo.json").read_text(encoding="utf-8"))
active = [p for p in items if p.get("genere") == "Scarpe" and p.get("vetrina") is not False]
errors = []
warnings = []
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
        if not isinstance(name, str) or not re.fullmatch(r"assets/products/[A-Za-z0-9_.-]+\\.webp", name):
            errors.append(f"{pid}: percorso foto non consentito {name!r}")
            continue
        photo = ROOT / name
        if not photo.is_file():
            errors.append(f"{pid}: foto mancante {name}")
        elif photo.stat().st_size < 1000:
            warnings.append(f"{pid}: foto sospettosamente piccola {name}")
    if not (p.get("model") or "").strip() or not (p.get("brand") or "").strip():
        errors.append(f"{pid}: marchio o modello mancante")
    if not (p.get("descrizione") or "").strip():
        warnings.append(f"{pid}: descrizione assente")
print(f"Schede archiviate: {len(items)}; vetrina: {len(active)}; marchi: {len(set(p['brand'] for p in active))}; immagini attese: {len(active)*3}")
for w in warnings:
    print("WARN:", w)
for e in errors:
    print("ERRORE:", e)
print(f"Esito: {len(errors)} errori, {len(warnings)} avvisi")
sys.exit(1 if errors else 0)
