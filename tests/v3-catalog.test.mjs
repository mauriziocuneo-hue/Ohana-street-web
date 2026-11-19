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
const previews=data.photoPreviews||[];
assert.ok(Array.isArray(previews));
assert.ok(previews.length<=5000);
const previewIds=new Set();
for(const item of previews){
  assert.equal(item.verifiedProduct,false,"Preview cannot claim verified status");
  assert.equal(item.status,"preview");
  assert.match(item.id,/^OH3P-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  assert.ok(!previewIds.has(item.id));
  previewIds.add(item.id);
  assert.ok(data.collections.some(x=>x.brand===item.brand&&x.model===item.family));
  assert.equal(item.model,item.brand+" "+item.family);
  assert.ok(["Colorazione da verificare","Colori su richiesta"].includes(item.color),"Only safe unverified colors are allowed");
  assert.ok(item.images.length>=1 && item.images.length<=3);
  assert.equal(item.image,item.images[0]);
  const pid=item.id.slice(5);
  const rev=item.photoRevision??1;
  assert.ok(Number.isInteger(rev)&&rev>=1&&rev<=99,"Invalid photo revision");
  const suffix=rev>1?`-r${rev}`:"";
  let localCount=0;
  for(let n=1;n<=item.images.length;n++){
    const proxy=`https://tqkmrejfbvzchfplgxzl.supabase.co/functions/v1/ohana-v3-photo?id=${pid}&n=${n}`+
      (rev>1?`&rev=${rev}`:"");
    const local=`assets/v3/${pid}${suffix}-${n}.webp`;
    assert.ok(item.images[n-1]===proxy||item.images[n-1]===local,"Unknown V3 photo host/path");
    if(item.images[n-1]===local){
      localCount++;
      assert.ok(fs.existsSync(local),"Local V3 WebP reference must exist");
      const img=fs.readFileSync(local);
      assert.equal(img.subarray(0,4).toString("ascii"),"RIFF");
      assert.equal(img.subarray(8,12).toString("ascii"),"WEBP");
    }
  }
  assert.ok(localCount===0||localCount===item.images.length,"No mixed gallery sources");
}

for(const path of ["data/catalogo-v3.json","catalogo-v3.html","assets/ohana-v3.js","assets/ohana-v3.css"]){
  const content=read(path);
  assert.doesNotMatch(content,/yupoo\.com|album_url|catalog_url|supplier_url|sb_secret_/i,path);
}
assert.match(read("catalogo-v3.html"),/assets\/ohana-catalogo.css/);
assert.match(read("assets/ohana-v3.js"),/photoPreviews/);
assert.match(read("assets/ohana-v3.js"),/photo-preview/);
const v3App=read("assets/ohana-v3.js");
const v3Page=read("catalogo-v3.html");
assert.doesNotMatch(v3Page,/anteprima fotografica|fotografie in revisione|in preparazione|identificazione da confermare/i,
  "No unfinished copy on public catalog");
assert.doesNotMatch(v3App,/Anteprima fotografica · identificazione da confermare|Richiesta multipla in preparazione|Preferiti in preparazione/,
  "No developer labels in public cards");
assert.match(v3App,/toggleFavorite/,"V3 favorites must be functional");
assert.match(v3App,/get\("openSelection"\)\.addEventListener\("click",showSelection\)/,
  "V3 multi-item request must open");
assert.match(v3App,/get\("selectionForm"\)\.addEventListener\("submit",reviewSelection\)/,
  "V3 WhatsApp request must be reviewed");
assert.match(v3App,/get\("shareProduct"\)\.addEventListener/,
  "V3 product sharing must be functional");
assert.match(v3App,/photo_visibility|excludedPoorPreviews/,
  "V3 must protect public from editorially rejected galleries");

assert.match(v3App,/preferredCategoryCovers/,"V3 needs curated category covers");
assert.match(v3App,/OH3P-62f122d0-a026-4f7d-99b4-afb938f9fa19/,
  "Dunk SB Low 85 must use reviewed full-shoe cover");
assert.match(v3App,/excludedPoorPreviews/,"Visually rejected insole-only previews must be hidden");
assert.match(v3App,/addCoverImage/,"Every V3 card needs resilient image fallback");
assert.match(v3App,/displayModel/,"Misleading supplier category labels must use a public display alias");
assert.match(v3App,/Air Force 1 — varianti/,"Unverified AF1 chip claims must not appear as customer-facing model names");
assert.match(v3App,/FOTO\\nNON DISPONIBILE/,"Unrecoverable image errors need a neutral placeholder");
assert.match(read("assets/ohana-v3.js"),/functions\/v1\/ohana-v3-photo/);
assert.match(read("catalogo-v3.html"),/assets\/ohana-theme.css/);
assert.match(read("catalogo-v3.html"),/assets\/ohana-v3.js/);
assert.match(read("gestione/index.html"),/v3-review.html/);

const reviewer=read("gestione/v3-review.js");
const reviewerHtml=read("gestione/v3-review.html");
assert.match(reviewer,/selected_photo_indices/,"Only explicitly selected pictures may be approved");
assert.match(reviewer,/selected\.length!==3/,"Photo review needs exactly three pictures");
assert.match(reviewer,/loaded\.has\(i\)/,"Only loaded photos may be approved");
assert.match(reviewer,/source_photo_caption/,"Unverified photo captions are available to reviewers");
assert.match(reviewer,/query=query\.eq\("category_id",model\)/,"Manager can filter specific V3 model");
assert.match(reviewerHtml,/id="model"/,"Model select exists in reviewer");
assert.doesNotMatch(reviewer,/(?:https?:\/\/[a-z0-9.-]+\.x\.yupoo\.com\/albums\/[0-9]{6,}|\/albums\/[0-9]{6,})/i,
  "No literal supplier links should be embedded in public manager code");

console.log("PASS V3 collections, reviewed photos, vendor isolation, canonical OHANA layout");
