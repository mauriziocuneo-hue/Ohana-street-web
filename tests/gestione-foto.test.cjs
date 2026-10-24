// Requires linkedom@0.18.12 in NODE_PATH.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');const tick=()=>new Promise(r=>setImmediate(r));
function setup(){
 const {document,window}=parseHTML('<html><body><section id="workspace"><div class="actions"><button id="logout">Esci</button></div><div id="results"><button data-variants="OHY-001">Varianti</button></div></section></body></html>');
 const dialog=Object.getPrototypeOf(document.createElement('dialog'));dialog.showModal=function(){this.open=true};dialog.close=function(){this.open=false};
 const pixels=new Uint8ClampedArray(16*16*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=90;pixels[i+1]=130;pixels[i+2]=170;pixels[i+3]=255;}
 Object.getPrototypeOf(document.createElement('canvas')).getContext=()=>({fillRect(){},drawImage(){},getImageData(){return {data:pixels}}});
 const album=(id)=>({album_key:id,model_key:'test:model',model_name:'Test',color:'Bianco e nero',status:'confirmed',supplier:'example.invalid',album_url:'https://example.invalid/'+id,image_features:{review:{observed_color:'Bianco e nero'}}});
 let signedOut,rpcArgs,resolveRpc;const client={auth:{onAuthStateChange(fn){signedOut=fn}},rpc(name,args){rpcArgs={name,args};return new Promise(resolve=>{resolveRpc=resolve})},from(table){const q={filters:{},select(){return q},eq(k,v){q.filters[k]=v;return q},neq(){return q},order(){return q},range(){return q},in(){return q},maybeSingle(){return Promise.resolve({data:{album_key:'anchor'}})},single(){return Promise.resolve({data:{album_key:'anchor',model_key:'test:model'}})},then(resolve){if(table==='ohana_variant_products')return resolve({data:[{product_id:'OHY-001',album_key:'a'}]});return resolve({data:[album('a'),album('b')],count:2});}};return q;}};
 const source=fs.readFileSync('gestione/index.html','utf8').match(/\/\/ BEGIN OHANA PRIVATE VARIANTS\n([\s\S]*?)\/\/ END OHANA PRIVATE VARIANTS/)[1];
 const context=vm.createContext({document,URL,console,client,createImageBitmap:async()=>({width:16,height:16,close(){}})});vm.runInContext(source+'\nmountVariants(client);',context);
 return {document,window,context,logout:()=>signedOut('SIGNED_OUT'),get rpcArgs(){return rpcArgs},resolve:()=>resolveRpc({data:[{album_key:'a',distance:0},{album_key:'b',distance:.1}]})};
}
test('confirmed observed colors group offers, without hiding original supplier albums',async()=>{
 const s=setup();s.document.querySelector('[data-variants]').click();await tick();await tick();
 assert.equal(s.document.querySelectorAll('dialog .item').length,1);assert.equal(s.document.querySelectorAll('dialog .supplier-offer').length,2);
 assert.match(s.document.querySelector('dialog').textContent,/Confronta edizione e materiali/);
 assert.equal(vm.runInContext("observedColorGroup({status:'review',image_features:{review:{observed_color:'Bianco e nero'}}})",s.context),null);
});
test('photo search sends only signatures, opens mapped article and clears after logout',async()=>{
 const s=setup();s.document.querySelector('#photoSearch').click();const input=s.document.querySelector('#photoInput');
 Object.defineProperty(input,'files',{value:[{type:'image/png',size:100}],configurable:true});input.dispatchEvent(new s.window.Event('change'));await tick();
 const run=[...s.document.querySelectorAll('button')].find(b=>b.textContent==='Confronta foto');assert.equal(run.disabled,false);run.click();
 assert.equal(s.rpcArgs.name,'ohana_search_photo');assert.match(s.rpcArgs.args.p_dhash,/^[0-9a-f]{16}$/);assert.equal(s.rpcArgs.args.p_hist.length,24);assert.deepEqual(Object.keys(s.rpcArgs.args).sort(),['p_ahash','p_brand','p_dhash','p_hist','p_limit']);
 s.resolve();await tick();await tick();assert.equal(s.document.querySelectorAll('dialog .item').length,2);assert.ok(s.document.querySelector('a[href="?articolo=OHY-001"]'));
 s.logout();assert.equal(s.document.querySelector('dialog').open,false);assert.equal(s.document.querySelectorAll('dialog canvas,dialog a').length,0);
});
test('invalid files are rejected and stale photo results cannot repopulate logged-out dialog',async()=>{
 const s=setup();s.document.querySelector('#photoSearch').click();let input=s.document.querySelector('#photoInput');
 Object.defineProperty(input,'files',{value:[{type:'text/html',size:100}],configurable:true});input.dispatchEvent(new s.window.Event('change'));await tick();assert.equal(s.rpcArgs,undefined);
 Object.defineProperty(input,'files',{value:[{type:'image/webp',size:100}],configurable:true});input.dispatchEvent(new s.window.Event('change'));await tick();
 [...s.document.querySelectorAll('button')].find(b=>b.textContent==='Confronta foto').click();s.logout();s.resolve();await tick();await tick();assert.equal(s.document.querySelectorAll('dialog .item').length,0);
});
