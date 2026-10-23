"""Validate the complete model catalog, every photograph, and legacy migration coverage."""
import hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'catalogo-nuovo.json').read_text())
assert data['version']==1 and len(data['products'])>=1
ids=set();covers=set();photo_count=0
for p in data['products']:
 assert p['id'] not in ids;ids.add(p['id'])
 assert all(isinstance(p[k],str) and p[k] for k in ['id','brand','family','color','type','description','image'])
 assert not re.search(r'yupoo|supplier|album_url|catalog_url|password|service_role',json.dumps(p),re.I)
 assert not re.search(r'[\u3400-\u9fff]',json.dumps(p,ensure_ascii=False))
 expected=1 if p.get('galleryIncomplete') is True else 3
 assert len(p['images'])==expected and p['images']==p['photos'][:expected] and p['image']==p['images'][0]
 assert p.get('variantGroup') is None or isinstance(p.get('variantGroup'),str)
 hashes=set()
 for name in p['photos']:
  assert re.fullmatch(r'assets/products/[A-Za-z0-9_.-]+\.webp',name)
  raw=(ROOT/name).read_bytes();assert len(raw)>1000 and raw[:4]==b'RIFF' and raw[8:12]==b'WEBP'
  digest=hashlib.sha256(raw).hexdigest();assert digest not in hashes,(p['id'],'repeated photograph');hashes.add(digest);photo_count+=1
 cover=hashlib.sha256((ROOT/p['image']).read_bytes()).hexdigest();assert cover not in covers;covers.add(cover)
for name in ['catalogo-nuovo.html','assets/ohana-catalogo.js','assets/ohana-catalogo.css']:
 assert 'yupoo.com' not in (ROOT/name).read_text().lower()
legacy=json.loads((ROOT/'catalogo.json').read_text())
active=[p for p in legacy if p.get('genere')=='Scarpe' and p.get('vetrina') is not False]
by_id={p['id']:p for p in data['products']}
extras=json.loads((ROOT/'foto-extra.json').read_text())['products']
for old in active:
 assert old['id'] in by_id,('Legacy article missing',old['id'])
 p=by_id[old['id']]
 assert p['brand']==old['brand'] and p['image']==old['image'] and p['images']==old['images'],('Legacy identity/gallery changed',old['id'])
 assert p['description']==old['descrizione'] and p['type']==old['sottogenere']
 assert all(x['src'] in p['photos'] for x in extras.get(old['id'],[])),('Extra photo lost',old['id'])
archived={p['id'] for p in legacy if p.get('vetrina') is False}
assert not archived.intersection(ids),'Archived articles accidentally made visible'
print(f'PASS catalogo: {len(ids)} articoli, {photo_count} foto valide; tutti i {len(active)} articoli precedenti conservati, nessun collegamento privato.')
