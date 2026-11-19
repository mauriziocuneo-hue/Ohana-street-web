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
  assert.equal(item.color,"Colorazione da verificare");
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
