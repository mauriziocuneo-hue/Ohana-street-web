// Run with linkedom@0.18.12 available in NODE_PATH.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const tick=()=>new Promise(r=>setImmediate(r));
test('variants: candidates, pagination, safe links, sources and logout',async()=>{
 const {document}=parseHTML('<html><body><section id="workspace"><div class="actions"><button id="logout">Esci</button></div><div id="results"><button data-variants="OH-TEST">Varianti</button></div></section></body></html>');
 const proto=Object.getPrototypeOf(document.createElement('dialog'));
 proto.showModal=function(){this.open=true};proto.close=function(){this.open=false};
 let signedOut;
 const client={auth:{onAuthStateChange(fn){signedOut=fn}},from(table){
  const q={filters:{},start:0,select(){return q},eq(k,v){q.filters[k]=v;return q},neq(){return q},order(){return q},range(start){q.start=start;return q},maybeSingle(){return Promise.resolve({data:{album_key:'anchor'}})},single(){return Promise.resolve({data:{album_key:'anchor',model_key:'test:model',model_name:'Test Model'}})},then(resolve){
   if(table==='ohana_variant_sources')return resolve({data:[{brand:'Test',supplier:'example.invalid',url:'https://example.invalid/catalog'}]});
   const count=q.filters.status==='confirmed'?25:1,n=q.start?1:Math.min(24,count);
   resolve({data:Array.from({length:n},(_,i)=>({album_key:String(q.start+i),model_name:'Test Model',color:'Blu',status:q.filters.status,supplier:'example.invalid',album_url:i===0?'javascript:alert(1)':'https://example.invalid/album'})),count});
  }};return q;
 }};
 const source=fs.readFileSync('gestione/index.html','utf8').match(/\/\/ BEGIN OHANA PRIVATE VARIANTS\n([\s\S]*?)\/\/ END OHANA PRIVATE VARIANTS/)[1];
 vm.runInContext(source+'\nmountVariants(client);',vm.createContext({document,URL,console,client}));
 document.querySelector('[data-variants]').click();await tick();await tick();
 assert.equal(document.querySelectorAll('dialog .item').length,24);assert.equal(document.querySelectorAll('a[href^="javascript:"]').length,0);
 const button=text=>[...document.querySelectorAll('button')].find(x=>x.textContent===text);
 button('Mostra altri').click();await tick();assert.equal(document.querySelectorAll('dialog .item').length,25);
 button('Da verificare').click();await tick();assert.equal(document.querySelectorAll('dialog .item').length,1);assert.match(document.querySelector('dialog').textContent,/riconoscimento preliminare/);
 button('Chiudi').click();button('Sorgenti archivio').click();await tick();assert.match(document.querySelector('dialog').textContent,/Sorgenti scarpe · 1/);
 signedOut('SIGNED_OUT');assert.equal(document.querySelector('dialog').open,false);assert.equal(document.querySelectorAll('dialog a').length,0);
});
