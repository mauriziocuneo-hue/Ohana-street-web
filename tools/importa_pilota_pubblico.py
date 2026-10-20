#!/usr/bin/env python3
"""Import a trusted public-only pilot ZIP into the OHANA STREET public website.
No private supplier URLs are allowed in this program's input or output.
"""
import hashlib,io,json,os,pathlib,sys,zipfile
from urllib.parse import urlsplit
import requests

ROOT=pathlib.Path(__file__).resolve().parents[1]
expected="fce5e38170c2b8928e5b43191758b9ec8898667f0f1dbff1117a6207e2a234b6"
url=os.environ.get("OHANA_PUBLIC_ZIP_URL","")
if not url.startswith("https://sdmntprnortheu.oaiusercontent.com/files/"):
    raise SystemExit("Untrusted or absent public-only ZIP source")
existing=json.loads((ROOT/"catalogo.json").read_text(encoding="utf-8"))
assert len(existing)>=68
old_ids={entry["id"] for entry in existing}
headers={"User-Agent":"OHANA-STREET-validated-import/1.0"}
response=requests.get(url,headers=headers,timeout=45)
if response.status_code!=200:raise SystemExit(f"Public file download failed: HTTP {response.status_code}")
body=response.content
assert len(body)<6_000_000,"Zip exceeds pilot limit"
if hashlib.sha256(body).hexdigest()!=expected:raise SystemExit("Public photo package SHA256 mismatch")
with zipfile.ZipFile(io.BytesIO(body)) as z:
    names=z.namelist()
    assert len(names)==101 and "catalogo_aggiunte.json" in names
    src=z.read("catalogo_aggiunte.json")
    assert not any(bad in src.lower() for bad in (b"yupoo.com",b"album_url",b"catalog_url",b"sb_secret_"))
    cards=json.loads(src)
    assert isinstance(cards,list) and len(cards)==100
    ids=set(); staged=[]
    for p in cards:
        pid=p.get("id")
        assert isinstance(pid,str) and pid.startswith("OH-") and len(pid)==15
        assert pid not in ids
        ids.add(pid)
        image=p.get("image")
        assert image==f"assets/products/{pid}.webp"
        assert image in names
        photo=z.read(image)
        assert len(photo)>1000 and photo[:4]==b"RIFF" and photo[8:12]==b"WEBP"
        assert p.get("genere") in ("Scarpe","Abbigliamento")
        assert p.get("brand") and p.get("model") and p.get("sottogenere")!="Da classificare"
        staged.append((image,photo))
    assert set(names)=={"catalogo_aggiunte.json",*(path for path,_ in staged)}
    if ids.issubset(old_ids):
        print("All 100 pilot records already installed: skip safely")
        sys.exit(0)
    if ids.intersection(old_ids):
        raise SystemExit("Partial/duplicate import: manual repair required")
    for image,photo in staged:
        path=ROOT/image
        if path.exists() and path.read_bytes()!=photo:
            raise SystemExit("Conflicting image: "+image)
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(photo)
    (ROOT/"catalogo.json").write_text(json.dumps(existing+cards,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"Public catalog prepared: {len(existing)} -> {len(existing)+len(cards)}. New images: {len(staged)}")
