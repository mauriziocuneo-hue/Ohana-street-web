#!/usr/bin/env python3
"""Mirror public OHANA V3 photographic previews as optimized metadata-free WebP.

Inputs are ONLY the anonymized public OHANA Edge image URLs. No protected
supplier URLs or Supabase credentials enter GitHub or the static catalog.
"""
import argparse
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_JSON = ROOT / "data" / "catalogo-v3.json"
IMAGE_DIR = ROOT / "assets" / "v3"
UUID_RE = re.compile(r"^OH3P-([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$")
IMAGE_URL = "https://tqkmrejfbvzchfplgxzl.supabase.co/functions/v1/ohana-v3-photo"
MAX_FILES_BYTES = 400_000_000
MAX_JPEG_BYTES = 950_000
MAX_WEBP_BYTES = 170_000


def valid_file(path):
    if not path.is_file() or not 700 <= path.stat().st_size <= MAX_WEBP_BYTES:
        return False
    with path.open("rb") as handle:
        header = handle.read(12)
    return header[:4] == b"RIFF" and header[8:] == b"WEBP"


def fetch_and_optimize(uuid, index, destination):
    query = urllib.parse.urlencode({"id": uuid, "n": index})
    url = IMAGE_URL + "?" + query
    for attempt in range(2):
        try:
            request = urllib.request.Request(url, headers={
                "Accept": "image/jpeg",
                "User-Agent": "OHANA-Street-Approved-Photo-Mirror/1.0",
            })
            with urllib.request.urlopen(request, timeout=25) as response:
                if urllib.parse.urlsplit(response.geturl()).hostname != "tqkmrejfbvzchfplgxzl.supabase.co":
                    raise ValueError("Image host redirection is forbidden")
                if "image/jpeg" not in response.headers.get("Content-Type", "").lower():
                    raise ValueError("Expected image/jpeg from OHANA photo proxy")
                data = response.read(MAX_JPEG_BYTES + 1)
            if len(data) > MAX_JPEG_BYTES or len(data) < 1000 or data[:3] != b"\xff\xd8\xff":
                raise ValueError("Invalid JPEG response size or signature")
            with Image.open(io.BytesIO(data)) as original:
                original.verify()
            with Image.open(io.BytesIO(data)) as original:
                image = ImageOps.exif_transpose(original).convert("RGB")
                image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
                data_out = io.BytesIO()
                image.save(data_out, format="WEBP", quality=80, method=4)
                if data_out.tell() > MAX_WEBP_BYTES:
                    data_out = io.BytesIO()
                    image.save(data_out, format="WEBP", quality=65, method=3)
                if not 700 <= data_out.tell() <= MAX_WEBP_BYTES:
                    raise ValueError("Optimized WebP exceeds configured limit")
                out_bytes = data_out.getvalue()
            tmp = destination.with_suffix(destination.suffix + ".tmp")
            try:
                with tmp.open("wb") as out:
                    out.write(out_bytes)
                os.replace(tmp, destination)
            finally:
                if tmp.exists():
                    tmp.unlink()
            return True
        except (urllib.error.URLError, TimeoutError, OSError, ValueError):
            if attempt == 0:
                time.sleep(0.4)
                continue
            return False
    return False


def mirror_one(item):
    match = UUID_RE.fullmatch(str(item.get("id", "")))
    if not match or item.get("status") != "preview" or item.get("verifiedProduct") is not False:
        raise ValueError("Untrusted preview item in public JSON")
    uuid = match.group(1)
    images = item.get("images")
    if not isinstance(images, list) or not 1 <= len(images) <= 3:
        raise ValueError("Invalid number of images")
    completed = 0
    failed = 0
    for index in range(1, len(images) + 1):
        target = IMAGE_DIR / (uuid + "-" + str(index) + ".webp")
        if valid_file(target):
            continue
        if fetch_and_optimize(uuid, index, target):
            completed += 1
        else:
            failed += 1
    return completed, failed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=300)
    parser.add_argument("--workers", type=int, default=12)
    options = parser.parse_args()
    limit = min(900, max(1, options.limit))
    workers = min(16, max(1, options.workers))
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    before_bytes = sum(f.stat().st_size for f in IMAGE_DIR.glob("*.webp"))
    if before_bytes >= MAX_FILES_BYTES:
        print("Photo mirror budget reached; V3 remains available using OHANA Edge previews.")
        return 0

    doc = json.loads(PUBLIC_JSON.read_text(encoding="utf-8"))
    products = doc.get("photoPreviews", [])
    if not isinstance(products, list):
        raise ValueError("Invalid public preview format")
    pending = []
    for item in products:
        uuid_match = UUID_RE.fullmatch(str(item.get("id", "")))
        if not uuid_match:
            raise ValueError("Unexpected public preview ID")
        uuid = uuid_match.group(1)
        images = item.get("images")
        if not isinstance(images, list) or not 1 <= len(images) <= 3:
            raise ValueError("Invalid preview image array")
        if not all(valid_file(IMAGE_DIR / (uuid + "-" + str(i) + ".webp")) for i in range(1, len(images) + 1)):
            pending.append(item)
        if len(pending) >= limit:
            break

    converted = errors = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(mirror_one, item) for item in pending]
        for future in as_completed(futures):
            done, failed = future.result()
            converted += done
            errors += failed

    used = sum(f.stat().st_size for f in IMAGE_DIR.glob("*.webp"))
    print(f"OHANA V3 WebP mirror: {converted} new files, {errors} failed downloads, "
          f"{len(pending)} preview groups inspected, {used / 1048576:.1f} MiB total.")
    if used > MAX_FILES_BYTES:
        raise RuntimeError("Photo mirror surpassed maximum storage budget")
    # Failure to fetch a vendor-sourced image is not fatal: static JSON will
    # retain the anonymous Edge proxy until all image files are locally ready.
    return 0


if __name__ == "__main__":
    sys.exit(main())
