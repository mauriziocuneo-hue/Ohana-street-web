"""Build an isolated static DEMO, never the production site or Supabase config."""
import json, shutil, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
dest=Path(sys.argv[1]).resolve()
if dest==root or root in dest.parents:
    raise SystemExit('Choose a destination outside the OHANA checkout.')
dest.mkdir(parents=True,exist_ok=True)
(dest/'gestione').mkdir(exist_ok=True)
files=['richieste-demo.html','richieste-demo.mjs','demo-shell.css','ordini-demo.css','ordini-demo.mjs','ordini-core.mjs']
for name in files: shutil.copy2(root/'gestione'/name,dest/'gestione'/name)
for name in ['catalogo.json','catalogo-nuovo.json','favicon.svg']: shutil.copy2(root/name,dest/name)
# Only images referenced by the existing catalogs. No new product database.
old=json.loads((root/'catalogo.json').read_text())
new=json.loads((root/'catalogo-nuovo.json').read_text())['products']
for p in old+new:
    path=Path(p['image'])
    if path.parts[:2]!=('assets','products') or '..' in path.parts: raise SystemExit('Unsafe image path')
    (dest/path).parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(root/path,dest/path)
(dest/'index.html').write_text('<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noimageindex,nosnippet"><meta http-equiv="refresh" content="0;url=gestione/richieste-demo.html"><title>OHANA DEMO</title></head><body><a href="gestione/richieste-demo.html">Apri Richieste e ordini DEMO</a></body></html>')
assert not (dest/'gestione/config.js').exists()
print('Demo isolated: no production config, private supplier data or payment SDK.')
