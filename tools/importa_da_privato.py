#!/usr/bin/env python3
"""Importa solo foto approvate dal repository privato, senza esporre URL fornitori."""
import ast,base64,hashlib,json,os,pathlib,re,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
REPO="mauriziocuneo-hue/Ohana-street"
PREFIX="importazione/risultati_vetrina_pubblica/"
TOKEN=os.environ["PRIVATE_TOKEN"]
def private_file(path):
    url="https://api.github.com/repos/"+REPO+"/contents/"+path
    request=urllib.request.Request(url,headers={"Authorization":"Bearer "+TOKEN,"Accept":"application/vnd.github+json","User-Agent":"ohana-curated-release"})
    with urllib.request.urlopen(request,timeout=30) as response:
        payload=json.load(response)
    assert payload["encoding"]=="base64"
    return base64.b64decode(payload["content"])
manifest=json.loads(private_file(PREFIX+"FOTO_VERIFICATE_MANIFEST.json"))
source=ast.parse((ROOT/"tools/importa_collezione_curata.py").read_text(encoding="utf-8"))
select=next(ast.literal_eval(n.value) for n in source.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=="SELECT" for t in n.targets))
assert len(select)==12 and len(manifest)==12
by_manifest={m["id"]:m for m in manifest}
existing=json.loads((ROOT/"catalogo.json").read_text(encoding="utf-8"))
assert len(existing)>=418
by_id={p["id"]:p for p in existing}
staged=[]
hashes=set()
for i,(pid,views,brand,model,sub,description) in enumerate(select):
    m=by_manifest[pid]
    assert m["brand"]==brand and len(m["images"])==3
    assert [int(x["path"].rsplit("_",1)[1].split(".")[0]) for x in m["images"]]==list(views)
    paths=[]
    for img in m["images"]:
        path=img["path"]
        assert re.fullmatch(r"assets/products/OH-[A-F0-9]{12}_[0-9]+\.webp",path)
        raw=private_file(PREFIX+path)
        digest=hashlib.sha256(raw).hexdigest()
        assert digest==img["sha256"] and len(raw)==img["size"]
        assert raw[:4]==b"RIFF" and raw[8:12]==b"WEBP" and digest not in hashes
        hashes.add(digest)
        staged.append((path,raw))
        paths.append(path)
    p=by_id.get(pid)
    if p is None:
        p={"id":pid};existing.append(p);by_id[pid]=p
    p.update({"brand":brand,"model":model,"genere":"Scarpe","sottogenere":sub,"category":sub,"kind":"sneaker","style":"Selezione OHANA","status":"Selezione fotografica","tone":i%8,"tags":[brand.lower(),sub.lower()],"image":paths[0],"images":paths,"descrizione":description,"modelloVerificato":True,"selezione":"editoriale","vetrina":True})
    p.pop("duplicatoDi",None);p.pop("variante",None)
selected={x[0] for x in select}
for p in existing:
    if p["genere"]=="Scarpe" and p["id"] not in selected:
        p["vetrina"]=False
        p.pop("duplicatoDi",None);p.pop("variante",None)
assert len(staged)==36 and len(hashes)==36
assert len([p for p in existing if p["genere"]=="Scarpe" and p.get("vetrina") is not False])==12
assert len([p for p in existing if p["genere"]=="Abbigliamento"])==160
for path,raw in staged:
    dest=ROOT/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
(ROOT/"catalogo.json").write_text(json.dumps(existing,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("PASS: 12 schede, 36 foto validate, nessun link privato nel catalogo.")
