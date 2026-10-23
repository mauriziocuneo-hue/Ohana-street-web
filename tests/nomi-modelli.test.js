'use strict';
const assert=require('node:assert/strict');
const reviews=require('../nomi-modelli.json').products;
const legacy=require('../catalogo.json').filter(p=>p.genere==='Scarpe'&&p.vetrina!==false);
const products=require('../catalogo-nuovo.json').products;
const {family}=require('../assets/ohana-media.js');
const {filterProducts,related}=require('../assets/ohana-catalogo.js');
const {productInfo}=require('../assets/ohana-chat.js');
const find=id=>products.find(p=>p.id===id);
for(const [id,r] of Object.entries(reviews)){
 const old=legacy.find(p=>p.id===id),p=find(id);
 assert(old&&p,'Nessuna scheda revisionata deve andare persa');
 assert.equal(p.brand,r.brand);assert.equal(p.family,r.family);
 assert.equal(p.modelNameStatus,r.status);
 assert(old.model.startsWith(r.name+' — '));
 assert.equal(productInfo(p).label,p.brand+' · '+p.name,'WhatsApp usa lo stesso nome mostrato nella scheda');
 assert(filterProducts(products,{query:r.name}).some(x=>x.id===id),'Il modello deve essere ricercabile');
 assert.equal(family(old),p.variantGroup,'Bot precedente e catalogo devono condividere i gruppi');
 if(r.status!=='identified'||r.variantFamily===null){assert.equal(p.variantGroup,null);assert.deepEqual(related(products,p),[]);}
}
assert.equal(find('OHY-001').name,'Air Jordan 4');
const jordan4=filterProducts(products,{query:'Air Jordan 4'});
assert(jordan4.length>0&&jordan4.every(p=>/^Air Jordan 4\b/.test(p.name||p.family)),'Il numero 4 nel codice OHANA non deve far comparire altri modelli');
assert(filterProducts(products,{query:'Cloudmonster 3'}).every(p=>p.family==='Cloudmonster 3'));
assert(related(products,find('OHY-001')).length>0);
assert(related(products,find('OHY-001')).every(p=>!p.family.includes('SB')),'Air Jordan 4 non va associata alla SB');
assert.equal(find('OHY-013').family,'Tokyo Decon','Non attribuire Samba alle Tokyo Decon');
assert.equal(find('OH-0179DC981468').family,'Air Jordan 5');
assert.equal(find('OH-217E1860ECAA').family,'Six Rings');
assert.equal(find('OH-0EC34260BBCF').family,'Shox R4');
assert.equal(find('OH-A3B69FE3C3E7').family,'Shox Z');
assert.notEqual(find('OH-0EC34260BBCF').variantGroup,find('OH-A3B69FE3C3E7').variantGroup);
const cloud3=find('OH-142CC9280AC3');
assert(related(products,cloud3).every(p=>p.family==='Cloudmonster 3'));
assert.equal(find('OH-148AA9D070C4').modelNameStatus,'pending','Un titolo incoerente con la foto deve restare da verificare');
assert.equal(find('OH-F2546D8E0082').modelNameStatus,'pending','Un riferimento non coerente con la foto non conferma il modello');
assert(!products.some(p=>/^(Sneaker|Scarpa |Ciabatta |Sandalo |Stival|Sabot|Mocassino)/.test(p.family)),'Nessun titolo generico senza indicazione della verifica');
const prada=find('OH-0ADB669CCF97');
assert.equal(prada.family,'1E506O','Un riferimento ufficiale descrittivo va identificato con il codice, senza inventare un nome commerciale');
assert.equal(prada.modelNameStatus,'identified');
assert.equal(prada.galleryIncomplete,false);assert.equal(prada.images.length,3);
assert.deepEqual(related(products,prada),[],'Il riferimento Prada resta separato dalle famiglie Prax');
assert(!find('OH-F2546D8E0082').photos.some(x=>x.includes('extra_recovered')),'La fotografia oliva con suola gum non appartiene alla variante sabbia');
for(const [id,familyName] of [['OH-5A54217FFBF7','Lowmel Guard'],['OH-57750200FD55','Lowmel Guard'],['OH-5CA563FB87E3','Lowmel Guard'],['OH-5EBACB0CB15F','Ball Star'],['OH-0D0D097C4F75','Runner']]){
 const item=find(id);assert.equal(item.family,familyName);assert.equal(item.modelNameStatus,'family');assert.match(item.name,/versione da verificare/);assert.equal(item.variantGroup,null);assert.deepEqual(related(products,item),[],'Le famiglie parzialmente riconosciute restano fuori dalle varianti confermate');
}
assert(!find('OH-0D0D097C4F75').name.includes('Track'),'Il titolo di un album non corrispondente non deve prevalere sulla scritta Runner nella foto');
for(const id of ['OH-0BDF23690CBC','OH-2C601CEA01BA','OH-0D0D097C4F75']){
 const p=find(id);assert.equal(p.images.length,3);assert.equal(p.photos.length,3);assert.equal(p.galleryIncomplete,false);assert.equal(p.images[0],p.image,'Il recupero conserva la copertina originale');
}
assert.equal(products.length,375);
assert.equal(products.reduce((n,p)=>n+p.photos.length,0),1162);
console.log(`PASS: ${Object.keys(reviews).length} nomi revisionati, ricerca, contesto WhatsApp, identità, separazione modelli e casi da verificare.`);
