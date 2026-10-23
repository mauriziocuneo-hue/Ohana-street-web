'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const products=require('../catalogo-nuovo.json').products;
const html=fs.readFileSync(require('node:path').join(__dirname,'../gestione/index.html'),'utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^\s*import[^\n]*\n/,'').replace(/initialize\(\);\s*$/,'await initialize();');
async function run(article,session=false,authorized=true){
 const nodes=new Map();
 function element(id){if(!nodes.has(id)){const classes=new Set();nodes.set(id,{value:'',hidden:false,textContent:'',innerHTML:'',handlers:{},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},addEventListener:(name,fn)=>{element(id).handlers[name]=fn;},replaceChildren:()=>{element(id).innerHTML='';}});}return nodes.get(id);}
 let privateReads=0;
 const user={id:'test-manager'};
 const client={auth:{getSession:async()=>({data:{session:session?{user}:null}}),signInWithPassword:async()=>({data:{user}}),signOut:async()=>({})},from(table){if(table==='ohana_managers')return {select:()=>({eq:()=>({maybeSingle:async()=>({data:authorized?{user_id:user.id}:null})})})};if(table==='ohana_supplier_links'){privateReads++;return {select:()=>({order:async()=>({data:products.map(p=>({product_id:p.id,album_url:'https://example.invalid/album',catalog_url:'https://example.invalid/catalog'}))})})};}throw Error('Unexpected table');}};
 const context={document:{querySelector:element},window:{OHANA_CONFIG:{supabaseUrl:'https://example.invalid',supabaseAnonKey:'public-test-key'}},location:{search:'?articolo='+encodeURIComponent(article)},URL,URLSearchParams,Map,createClient:()=>client,fetch:async path=>({ok:true,json:async()=>path.includes('nuovo')?{version:1,products}:[]})};
 await vm.runInNewContext('(async()=>{'+script+'})()',context);
 return {element,privateReads:()=>privateReads};
}
(async()=>{
 const id='OHY-021';
 const loggedOut=await run(id);
 assert.equal(loggedOut.element('#search').value,id);assert.equal(loggedOut.privateReads(),0,'Il link non deve leggere dati privati prima dell’accesso');
 await loggedOut.element('#loginForm').handlers.submit({preventDefault(){}});
 assert.equal(loggedOut.element('#search').value,id,'Il prodotto richiesto deve restare selezionato dopo il login');
 assert.equal(loggedOut.element('#count').textContent,'1 schede con collegamento riservato');assert(loggedOut.element('#results').innerHTML.includes(id));
 const signedIn=await run('OH-N-F14BD7189F9B',true);assert.equal(signedIn.element('#count').textContent,'1 schede con collegamento riservato','La sessione esistente arriva direttamente al prodotto OH-N');
 const denied=await run(id,true,false);assert.equal(denied.privateReads(),0,'Un account non autorizzato non deve leggere collegamenti privati');
 const invalid=await run('<script>alert(1)</script>');assert.equal(invalid.element('#search').value,'');assert.equal(invalid.privateReads(),0);
 console.log('PASS: collegamento gestori, login, sessione esistente, codici OH-N e autorizzazione preservata (client simulato, nessuna modifica al database).');
})().catch(error=>{console.error(error);process.exitCode=1;});
