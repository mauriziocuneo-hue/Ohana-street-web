#!/usr/bin/env python3
"""Publish only approved OHANA V3 catalog metadata to GitHub Pages static JSON.

Reads a public, RLS-whitelisted Supabase catalog table with the already-public
publishable key. Never reads the private supplier tables or supplier URLs.
"""
import json
import re
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data" / "catalogo-v3.json"
CONFIG = ROOT / "gestione" / "config.js"
VALID_BRANDS = {"Nike", "Jordan", "Adidas", "New Balance"}
PRODUCT_BUCKET = "/storage/v1/object/public/ohana-v3-products/"
TARGET_HOST = "tqkmrejfbvzchfplgxzl.supabase.co"


def config_value(text: str, key: str) -> str:
    match = re.search(r"\b" + re.escape(key) + r"\s*:\s*(['\"])([^'\"\r\n]+)\1", text)
    if not match:
        raise ValueError("Missing Supabase public configuration: " + key)
    return match.group(2)


def public_photo(url: str, public_id: str, index: int) -> bool:
    if not isinstance(url, str):
        return False
    parsed = urllib.parse.urlsplit(url)
    expected = PRODUCT_BUCKET + public_id + "/" + str(index) + ".jpg"
    return parsed.scheme == "https" and parsed.netloc == TARGET_HOST and parsed.path == expected and not parsed.query


def read_rows(config: str):
    base = config_value(config, "supabaseUrl")
    key = config_value(config, "supabaseAnonKey")
    if base != "https://" + TARGET_HOST or not key.startswith("sb_publishable_"):
        raise ValueError("Unexpected Supabase public configuration")
    rows = []
    while True:
        params = urllib.parse.urlencode({
            "select": "public_id,brand,collection_model,product_name,color,description,images",
            "published": "eq.true", "order": "published_at.asc",
            "limit": "500", "offset": str(len(rows))
        })
        req = urllib.request.Request(base + "/rest/v1/ohana_v3_public_items?" + params,
            headers={"apikey": key, "Accept": "application/json",
                     "User-Agent": "ohana-v3-static-publisher/1.0"})
        with urllib.request.urlopen(req, timeout=30) as response:
            batch = json.load(response)
        if not isinstance(batch, list):
            raise ValueError("Unexpected public table payload")
        rows.extend(batch)
        if len(batch) < 500:
            break
        if len(rows) > 10000:
            raise ValueError("Unexpectedly large public catalog")
    return rows


def main():
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    assert data["schemaVersion"] == 3
    collections = data["collections"]
    allowed = {(v["brand"], v["model"]) for v in collections}
    public_items = []
    seen = set()
    for row in read_rows(CONFIG.read_text(encoding="utf-8")):
        pid = str(row["public_id"])
        if not re.fullmatch(r"[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}", pid):
            raise ValueError("Invalid public ID")
        if pid in seen:
            raise ValueError("Duplicated public ID")
        seen.add(pid)
        brand, family = row["brand"], row["collection_model"]
        if brand not in VALID_BRANDS or (brand, family) not in allowed:
            raise ValueError("Published item outside approved category list")
        photos = row["images"]
        if not isinstance(photos, list) or len(photos) != 3:
            raise ValueError("Expected exactly three photos")
        if not all(public_photo(u, pid, i) for i, u in enumerate(photos, 1)):
            raise ValueError("Untrusted image URL in published data")
        name = row["product_name"].strip()
        color = row["color"].strip()
        description = row["description"].strip()
        if any(re.search(r"[\u3400-\u9fff]|yupoo|supplier|catalog_url|album_url", v, re.I)
               for v in [name, color, description]):
            raise ValueError("Private or untranslated information in published product")
        public_items.append({
            "id": "OH3-" + pid,
            "brand": brand, "family": family, "model": name,
            "color": color, "description": description,
            "image": photos[0], "images": photos, "status": "published",
            "verifiedProduct": True
        })
    counts = Counter((p["brand"], p["family"]) for p in public_items)
    for group in collections:
        count = counts[(group["brand"], group["model"])]
        group["verifiedProducts"] = count
        group["status"] = "published" if count else "da-catalogare"
    data["products"] = public_items
    data["catalogVersion"] = "v3"
    data["visibility"] = "anteprima" if not public_items else "pubblico-verificato"
    content = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if CATALOG.read_text(encoding="utf-8") != content:
        CATALOG.write_text(content, encoding="utf-8")
        print(f"V3 updated: {len(public_items)} reviewed products across {len(counts)} collections")
    else:
        print(f"V3 unchanged: {len(public_items)} reviewed products")


if __name__ == "__main__":
    main()
