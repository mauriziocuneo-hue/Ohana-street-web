#!/usr/bin/env python3
"""OHANA STREET: install the first manually visually reviewed 3-photo shoe collection.

Input: a time-limited PUBLIC-ONLY ZIP, SHA256 pinned.
No Yupoo URLs, supplier credentials or private maps can enter the public repo.
Keep ALL earlier products in catalogo.json; hide non-editorial ones temporarily.
"""
import hashlib,io,json,os,pathlib,re,zipfile
import requests

ROOT=pathlib.Path(__file__).resolve().parents[1]
PIN=os.environ.get("OHANA_EDITORIAL_ZIP_SHA256","")
URL=os.environ.get("OHANA_EDITORIAL_ZIP_URL","")
assert re.fullmatch(r"[a-f0-9]{64}",PIN)
assert URL.startswith("https://sdmntprnortheu.oaiusercontent.com/files/")
# IDs/angles reviewed side-by-side in the 12-photo contact sheets.
SELECT=[
 ("OH-00E2EDB5A284", (1,8,12), "Jordan", "Air Jordan 4 Retro — Giallo oro", "Sneakers",
  "Una Jordan 4 dalla colorazione giallo oro uniforme, con inserti laterali a rete, silhouette strutturata e dettagli della suola a contrasto."),
 ("OH-C4A8F3895241", (1,3,9), "Jordan", "Air Jordan 4 Retro Bred — Nero e rosso", "Sneakers",
  "L'iconica linea della Jordan 4 con tomaia nera, dettagli bianchi e rossi, gabbia laterale e suola dal contrasto deciso."),
 ("OH-43A7C1F5ADA6", (1,6,12), "Adidas", "adidas Samba OG — Nero e grigio", "Sneakers",
  "Sneaker bassa dal profilo essenziale: tomaia scura, tre strisce grigie, punta rinforzata e suola color gomma."),
 ("OH-3DBCE285049D", (1,6,12), "Adidas", "adidas Gazelle Indoor — Bianco e acquamarina", "Sneakers",
  "Interpretazione chiara della Gazelle Indoor, con strisce e dettagli acquamarina, linea slanciata e suola color miele."),
 ("OH-778CBBE3DA85", (1,4,10), "New Balance", "New Balance 530 — Bianco e tortora", "Sneakers",
  "Una sneaker ispirata al running rétro, con pannelli chiari e tortora, inserti laterali a contrasto e una linea sportiva."),
 ("OH-4D65578D838A", (1,2,6), "ASICS", "ASICS GEL-1130 — Nero e argento", "Running",
  "Silhouette running dall'ispirazione rétro, con tomaia nera, dettagli argento, pannelli sovrapposti e suola strutturata."),
 ("OH-27E5B90E5B24", (1,2,7), "Balenciaga", "Balenciaga Runner — Nero e bianco", "Running",
  "Una sneaker dalla struttura a pannelli sovrapposti, contrasti netti bianco e nero e suola voluminosa dal profilo tecnico."),
 ("OH-75B06B7D4905", (1,3,7), "Balenciaga", "Balenciaga Runner — Bianco e rosso", "Running",
  "Profilo sportivo con tomaia prevalentemente bianca, dettagli grafici rossi e intersuola importante in tonalità chiare."),
 ("OH-2FBF94AD6BDD", (1,2,4), "Salomon", "Salomon XT-Quest x OAMC — Nero", "Trail e outdoor",
  "Scarpa dal carattere outdoor con tomaia nera, rinforzi tecnici laterali e suola scolpita. Dettagli OAMC visibili nelle fotografie."),
 ("OH-E97A2E41E360", (1,2,7), "Salomon", "Salomon XT-6 GTX — Sabbia", "Trail e outdoor",
  "Sneaker ispirata al trail in tonalità sabbia, con allacciatura tecnica, pannelli sovrapposti e suola dal disegno marcato."),
 ("OH-E8FB3C102CD1", (1,4,9), "Golden Goose", "Golden Goose Ball Star Wishes — Bianco e leopardato", "Sneakers",
  "Silhouette bassa in tonalità chiare, stella laterale color tortora, lacci neri e dettaglio leopardato sul tallone."),
 ("OH-AEE9524F4735", (1,3,5), "Golden Goose", "Golden Goose Ball Star Wishes — Bianco e verde", "Sneakers",
  "Sneaker bassa con tomaia chiara, stella e tallone verdi, dettagli a contrasto e suola dal colore naturale."),
]
assert len(SELECT)==12 and len({p[0] for p in SELECT})==12
response=requests.get(URL,timeout=45,headers={"User-Agent":"OHANA-editorial-import/1.0"})
response.raise_for_status()
blob=response.content
assert len(blob)<15_000_000 and hashlib.sha256(blob).hexdigest()==PIN,"Unexpected photo archive contents"
existing=json.loads((ROOT/"catalogo.json").read_text(encoding="utf-8"))
assert isinstance(existing,list) and len(existing)>=418
assert len({p["id"] for p in existing})==len(existing)
by_id={p["id"]:p for p in existing}
with zipfile.ZipFile(io.BytesIO(blob)) as archive:
    names=set(archive.namelist())
    assert "CANDIDATI_DA_VERIFICARE.json" in names
    candidates=json.loads(archive.read("CANDIDATI_DA_VERIFICARE.json"))
    sources={p["id"]:p for p in candidates}
    staged=[]
    for index,(pid,views,brand,model,sub,description) in enumerate(SELECT):
        source=sources.get(pid)
        assert source and source["brand"]==brand, f"Unexpected candidate brand: {pid}"
        assert source["status"]=="DA_VERIFICARE_VISIVAMENTE"
        assert all(1<=n<=len(source["images"]) for n in views)
        assert len(set(views))==3
        paths=[source["images"][n-1] for n in views]
        assert all(re.fullmatch(r"assets/products/OH-[A-F0-9]{12}_[0-9]+\.webp",p) for p in paths)
        assert all(p in names for p in paths)
        hashes=[]
        for file in paths:
            image=archive.read(file)
            assert len(image)>1500 and image[:4]==b"RIFF" and image[8:12]==b"WEBP"
            hashes.append(hashlib.sha256(image).hexdigest())
            staged.append((file,image))
        assert len(set(hashes))==3, f"Repeated same image for {pid}"
        product=by_id.get(pid)
        if product is None:
            product={"id":pid};existing.append(product);by_id[pid]=product
        assert not re.search(r"[\u3400-\u9fff\uf900-\ufaff]",model+description)
        product.update({
            "brand":brand,"model":model,"genere":"Scarpe","sottogenere":sub,
            "category":sub,"kind":"sneaker","style":"Selezione OHANA",
            "status":"Selezione fotografica","tone":index%8,
            "tags":[brand.lower(),sub.lower()],"image":paths[0],"images":paths,
            "descrizione":description,"modelloVerificato":True,
            "selezione":"editoriale","vetrina":True
        })
        product.pop("duplicatoDi",None)
        product.pop("variante",None)
    # Hide but NEVER delete archived products, their IDs, or private supplier maps.
    selected_ids={r[0] for r in SELECT}
    for p in existing:
        if p["genere"]=="Scarpe" and p["id"] not in selected_ids:
            p["vetrina"]=False
            p.pop("duplicatoDi",None)
            p.pop("variante",None)
    assert len([p for p in existing if p["genere"]=="Scarpe" and p.get("vetrina") is not False])==12
    assert len([p for p in existing if p["genere"]=="Abbigliamento"])==160
    for path,data in staged:
        target=ROOT/path
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(data)
(ROOT/"catalogo.json").write_text(json.dumps(existing,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"Editorial preview READY: 12 curated shoes, 36 photos, {len(existing)} archived+visible total; no supplier links.")
