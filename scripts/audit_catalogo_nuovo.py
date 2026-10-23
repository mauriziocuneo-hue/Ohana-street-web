"""Validate the trial catalog and every approved locally hosted album photo."""
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
 assert len(p['images'])==3 and p['images']==p['photos'][:3] and p['image']==p['images'][0]
 hashes=set()
 for name in p['photos']:
  assert re.fullmatch(r'assets/products/OH-N-[A-F0-9]{12}_\d+\.webp',name)
  raw=(ROOT/name).read_bytes();assert len(raw)>1000 and raw[:4]==b'RIFF' and raw[8:12]==b'WEBP'
  digest=hashlib.sha256(raw).hexdigest();assert digest not in hashes,(p['id'],'repeated photograph');hashes.add(digest);photo_count+=1
 cover=hashlib.sha256((ROOT/p['image']).read_bytes()).hexdigest();assert cover not in covers;covers.add(cover)
for name in ['catalogo-nuovo.html','assets/ohana-catalogo.js','assets/ohana-catalogo.css']:
 assert 'yupoo.com' not in (ROOT/name).read_text().lower()
print(f'PASS nuovo catalogo: {len(ids)} articoli, {photo_count} foto valide, tre viste principali per scheda, nessun collegamento privato.')
