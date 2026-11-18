import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const data=JSON.parse(read("data/catalogo-v3.json"));
assert.equal(data.schemaVersion,3);
assert.equal(data.collections.length,45);
assert.equal(data.collections.reduce((x,v)=>x+v.reportedAlbumCount,0),2014);
assert.deepEqual([...new Set(data.collections.map(x=>x.brand))].sort(),["Adidas","Jordan","New Balance","Nike"]);
assert.equal(new Set(data.collections.map(x=>x.id)).size,45);
for(const item of data.products){
  assert.equal(item.verifiedProduct,true);
  assert.equal(item.status,"published");
  assert.equal(item.images.length,3);
  assert.equal(item.image,item.images[0]);
  assert.match(item.id,/^OH3-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  const uuid=item.id.slice(4);
  item.images.forEach((url,index)=>assert.equal(url,
    `https://tqkmrejfbvzchfplgxzl.supabase.co/storage/v1/object/public/ohana-v3-products/${uuid}/${index+1}.jpg`));
}
for(const path of ["data/catalogo-v3.json","catalogo-v3.html","assets/ohana-v3.js","assets/ohana-v3.css"]){
  const content=read(path);
  assert.doesNotMatch(content,/jsl68|yupoo\.com|album_url|catalog_url|supplier_url|sb_secret_/i,path);
}
assert.match(read("catalogo-v3.html"),/assets\/ohana-catalogo.css/);
assert.match(read("catalogo-v3.html"),/assets\/ohana-theme.css/);
assert.match(read("catalogo-v3.html"),/assets\/ohana-v3.js/);
assert.match(read("gestione/index.html"),/v3-review.html/);
console.log("PASS V3 collections, reviewed photos, vendor isolation, canonical OHANA layout");
