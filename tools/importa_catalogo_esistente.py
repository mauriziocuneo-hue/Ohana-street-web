"""Move every active legacy shoe into the model catalog without copying or changing photographs."""
import json,re,subprocess,unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
legacy=json.loads((ROOT/'catalogo.json').read_text())
active=[p for p in legacy if p.get('genere')=='Scarpe' and p.get('vetrina') is not False]
reviews=json.loads((ROOT/'nomi-modelli.json').read_text())['products']
assert set(reviews).issubset(p['id'] for p in active), 'Name review for an inactive or missing article'
for p in active:
 review=reviews.get(p['id'])
 if not review:continue
 assert p['brand']==review['brand'], 'Model review brand mismatch'
 color=', '.join(p.get('colori_disponibili') or [re.split(r'\s+[—–]\s+',p['model'])[-1]])
 p['model']=review['name']+' — '+color
 p['famiglia_modello']=review['family']
 p['famiglia_varianti']=review['variantFamily']
 p['stato_nome_modello']=review['status']
 p['modelloVerificato']=review['status']=='identified'
 prefix='Nome del modello da verificare.' if review['status']=='pending' else p['brand']+' '+review['name']+'.'
 p['descrizione']=prefix+' Colorazione: '+color+'. Le fotografie mostrano l’articolo di riferimento.'
(ROOT/'catalogo.json').write_text(json.dumps(legacy,ensure_ascii=False,indent=2)+'\n')
existing=json.loads((ROOT/'catalogo-nuovo.json').read_text())
pilot=[p for p in existing['products'] if not p.get('legacy')]
extras=json.loads((ROOT/'foto-extra.json').read_text())['products']
key_script="const api=require('./assets/ohana-media.js');const p=require('./catalogo.json').filter(p=>p.genere==='Scarpe'&&p.vetrina!==false);process.stdout.write(JSON.stringify(Object.fromEntries(p.map(p=>[p.id,api.family(p)]))));"
keys=json.loads(subprocess.run(['node','-e',key_script],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
def norm(s):return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower()).strip()
aliases={'air jordan 4 retro':'Air Jordan 4','air jordan 4 retro bred':'Air Jordan 4','air jordan 5 retro':'Air Jordan 5','samba og':'Samba'}
def trim_brand(name,brand):
 for prefix in [brand,'On' if brand=='On Running' else '']:
  if prefix and name.lower().startswith(prefix.lower()+' '):name=name[len(prefix):].strip()
 return name
for p in pilot:
 p['variantGroup']=norm(p['brand'])+':'+norm(aliases.get(norm(p['family']),p['family']))
 p['legacy']=False
products=[]
for p in active:
 parts=re.split(r'\s+[—–]\s+',p['model']);name=trim_brand(parts[0].strip(),p['brand'])
 family=p.get('famiglia_modello') or aliases.get(norm(name),name)
 colors=p.get('colori_disponibili')
 color=', '.join(colors) if isinstance(colors,list) and colors else (parts[-1].strip() if len(parts)>1 else 'Colorazione nelle fotografie')
 images=list(p['images']);photos=list(dict.fromkeys(images+[x['src'] for x in extras.get(p['id'],[])]))
 code=p.get('codice_modello','')
 if not code:
  match=re.search(r'(?:^|[—–\s])([A-Z]{1,4}\d{3,8}(?:-\d{2,4})?)\s*$',p['model'],re.I)
  code=match[1] if match else ''
 products.append({'id':p['id'],'brand':p['brand'],'family':family,'name':name,'modelNameStatus':p.get('stato_nome_modello','existing'),'color':color,'type':p['sottogenere'],'code':code,'description':p['descrizione'],'image':p['image'],'images':images,'photos':photos,'tags':p.get('tags',[]),'variantGroup':keys[p['id']],'galleryIncomplete':len(images)<3,'legacy':True})
ids={p['id'] for p in products}
assert not ids.intersection(p['id'] for p in pilot),'IDs overlap between legacy and new albums'
products+=pilot
assert len({p['id'] for p in products})==len(products)
out={'version':1,'products':products}
(ROOT/'catalogo-nuovo.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(f'Migrated {len(active)} legacy shoes + {len(pilot)} current shoes = {len(products)}; {len(set(p["brand"] for p in products))} brands; {sum(len(p["photos"]) for p in products)} available photographs.')
