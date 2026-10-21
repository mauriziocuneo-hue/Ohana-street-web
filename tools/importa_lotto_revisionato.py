#!/usr/bin/env python3
"""Importazione additiva delle sole scarpe revisionate dall'archivio PRIVATO.
Preserva le 12 schede editoriali esistenti, non pubblica URL dei fornitori.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
PRIVATE="mauriziocuneo-hue/Ohana-street"
TOKEN=os.environ.get("OHANA_PRIVATE_READ_TOKEN","").strip()
assert TOKEN, "Manca il token di sola lettura del repository privato"
MANIFEST="importazione/risultati/LOTTO_35_REVISIONE_EDITORIALE.json"
PREFIX="importazione/lotto35_privato/"
def read_private(path):
    assert re.fullmatch(r"[A-Za-z0-9_/.\-]+",path) and ".." not in path
    url="https://api.github.com/repos/"+PRIVATE+"/contents/"+path
    req=urllib.request.Request(url,headers={
        "Authorization":"Bearer "+TOKEN,
        "Accept":"application/vnd.github+json",
        "User-Agent":"ohana-reviewed-editorial-import"
    })
    with urllib.request.urlopen(req,timeout=35) as response:
        result=json.load(response)
    assert result.get("type")=="file" and result.get("encoding")=="base64"
    return base64.b64decode(result["content"])

manifest=json.loads(read_private(MANIFEST))
assert manifest.get("version")==1
assert manifest.get("photographic_use_permission","").startswith("confirmed_by_catalog_owner")
assert manifest.get("product_authenticity_not_assessed") is True
products=manifest.get("products",[])
assert len(products)==12
catalog=json.loads((ROOT/"catalogo.json").read_text(encoding="utf-8"))
assert len(catalog)>=419
by_id={p["id"]:p for p in catalog}
assert len(by_id)==len(catalog)
prior_visible={p["id"] for p in catalog if p.get("genere")=="Scarpe" and p.get("vetrina") is not False}
assert len(prior_visible)>=12
assert all(by_id[x]["modelloVerificato"] is True for x in prior_visible), "Le schede attive precedenti non sono tutte verificate"

seen_urls=set()
seen_hashes={hashlib.sha256((ROOT/p["image"]).read_bytes()).hexdigest()
             for p in catalog if p.get("genere")=="Scarpe" and p.get("vetrina") is not False}
files=[]
for number,p in enumerate(products):
    pid=p["id"]
    assert re.fullmatch(r"OH-[A-F0-9]{12}",pid)
    assert pid not in prior_visible,"Una scheda visibile esistente non può essere riscritta"
    assert p["brand"] in ("Jordan","Nike","New Balance","Balenciaga")
    assert p.get("family_colorway_visually_reviewed") is True
    assert p.get("photo_use_authorized_user_confirmed") is True
    assert p.get("supplier_style_code_unverified") is True
    assert p.get("availability_unverified") is True
    assert p.get("brand_authenticity_unverified") is True
    assert p["id"] not in seen_urls;seen_urls.add(pid)
    assert not re.search(r"[\u3400-\u9fff]",p["model"]+p["description"])
    assert 8<=len(p["model"])<=105
    paths=[]
    for view in (1,2,3):
        name=f"assets/products/{pid}_{view}.webp"
        raw=read_private(PREFIX+name)
        assert len(raw)>5000 and raw[:4]==b"RIFF" and raw[8:12]==b"WEBP"
        digest=hashlib.sha256(raw).hexdigest()
        assert digest not in seen_hashes,"Immagine duplicata rispetto alla selezione precedente"
        seen_hashes.add(digest)
        files.append((name,raw))
        paths.append(name)
    assert len(paths)==3
    assert pid not in by_id, "Un articolo esistente non deve essere sovrascritto"
    description=p["description"].strip()+" Identificazione fotografica della famiglia; disponibilità e dettagli commerciali da verificare."
    assert 35<=len(description)<=350
    catalog.append({
        "id":pid,"brand":p["brand"],"model":p["model"],"genere":"Scarpe",
        "sottogenere":p["subgenre"],"category":p["subgenre"],"kind":"sneaker",
        "style":"Selezione OHANA","tags":[p["brand"].lower(),"sneakers"],
        "tone":number%8,"image":paths[0],"images":paths,"descrizione":description,
        "modelloVerificato":True,"status":"Selezione fotografica",
        "selezione":"editoriale","vetrina":True
    })
assert len(files)==36
assert len([p for p in catalog if p.get("genere")=="Scarpe" and p.get("vetrina") is not False])==len(prior_visible)+12
for path,raw in files:
    dest=ROOT/path
    dest.parent.mkdir(parents=True,exist_ok=True)
    assert not dest.exists(),"Foto gia' esistente: "+path
    dest.write_bytes(raw)
(ROOT/"catalogo.json").write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"PASS: {len(prior_visible)} scarpe precedenti intatte; 12 nuove scarpe; 36 foto; 0 URL fornitori nei dati pubblici.")
