import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeHandler} from '../backend/ordini-demo/handler.mjs';
import {createOrderStore} from '../gestione/ordini-store.mjs';
import {seed,buyerSurname,orderLabel,orderLists} from '../gestione/ordini-core.mjs';
const products=[{id:'OHY-001',model:'Scarpa di collaudo'}],actor='11111111-1111-4111-8111-111111111111';
const sample=()=>({...seed(products[0],'live'),id:'OHANA-AABBCCDD',customer:'Mario De Luca',state:'consegnato'});
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status});
function setup({member=true,valid=true,conflict=false,mode='live'}={}){
 let row={payload:sample(),revision:1};const writes=[];
 const handler=makeHandler({dbUrl:'https://db.invalid',serviceKey:'server-only',products,mode,fetcher:async(url,opts)=>{
  if(url.endsWith('/auth/v1/user'))return reply({id:actor},valid?200:401);
  if(url.includes('ohana_managers'))return reply(member?[{user_id:actor}]:[]);
  if(url.includes('/rpc/')){const b=JSON.parse(opts.body);if(conflict||b.p_revision!==row.revision)return reply({code:'40001'},400);writes.push(b);row={payload:b.p_payload,revision:row.revision+1};return reply([row]);}
  return reply([row]);
 }});
 const send=(body,auth='Bearer fake.jwt')=>handler(new Request('https://test.invalid',{method:'POST',headers:{Authorization:auth},body:JSON.stringify(body)}));
 return {send,writes,get row(){return row;}};
}
test('elenco: numero e cognome, cognomi composti e correzione esplicita',()=>{
 const o=sample();assert.equal(buyerSurname(o),'De Luca');assert.equal(orderLabel(o),'OHANA-AABBCCDD · De Luca');assert.equal(buyerSurname({...o,customer:'Maria Luisa Rossi',customerSurname:'Rossi'}),'Rossi');
 assert.equal(buyerSurname({customer:'Cher'}),'Cher');
});
test('elenco: ordini precedenti restano attivi, archivio separato, ricerca in entrambi',()=>{
 const a=sample(),b={...a,id:'OHANA-11223344',archived:true,customer:'Giulia Rossi'};
 assert.deepEqual(orderLists([a,b]).active,[a]);assert.deepEqual(orderLists([a,b]).archived,[b]);assert.equal(orderLists([a,b],'ROSSI').archived.length,1);assert.equal(orderLists([a,b],'Rossi').active.length,0);assert.equal(orderLists([a,b],'AABB').active.length,1);
});
test('archivia e ripristina un ordine consegnato senza alterare dati commerciali o cronologia',async()=>{
 const x=setup(),before=structuredClone(x.row.payload);
 let r=await x.send({action:'archive',id:before.id,revision:1,archived:true,order:{price:1,state:'richiesta'}});assert.equal(r.status,200);
 const archived=(await r.json()).row;assert.equal(archived.payload.archived,true);assert.equal(archived.payload.archivedBy,actor);assert.ok(archived.payload.archivedAt);assert.equal(archived.revision,2);
 for(const k of Object.keys(before))assert.deepEqual(archived.payload[k],before[k]);
 assert.equal((await x.send({action:'save',order:{...archived.payload,customer:'Modificato'},revision:2})).status,409);
 r=await x.send({action:'archive',id:before.id,revision:2,archived:false});assert.equal(r.status,200);assert.equal(x.row.payload.archived,false);assert.equal(x.row.payload.archivedAt,null);assert.equal(x.row.payload.state,'consegnato');assert.equal(x.row.revision,3);
 assert.equal((await x.send({action:'save',order:x.row.payload,revision:3})).status,409);
});
test('archivio: autenticazione e appartenenza gestore restano obbligatorie',async()=>{
 for(const options of [{valid:false},{member:false}]){const x=setup(options);assert.ok([401,403].includes((await x.send({action:'archive',id:sample().id,revision:1,archived:true})).status));assert.equal(x.writes.length,0);}
 const x=setup();assert.equal((await x.send({action:'archive',id:sample().id,revision:1,archived:true},'')).status,401);assert.equal(x.writes.length,0);
});
test('archivio: rifiuta revisione obsoleta, conflitti atomici, ID e ambiente errati',async()=>{
 const body={action:'archive',id:sample().id,revision:1,archived:true};
 for(const change of [{revision:0},{archived:'true'},{id:'../bad'}])assert.equal((await setup().send({...body,...change})).status,400);
 assert.equal((await setup().send({...body,revision:2})).status,409);
 assert.equal((await setup({conflict:true}).send(body)).status,409);
 assert.equal((await setup({mode:'demo'}).send(body)).status,400);
});
test('store: archiviazione usa il DB operativo con revisione e restituisce lo stato persistito',async()=>{
 const seen=[],store=createOrderStore({auth:{getSession:async()=>({data:{session:{access_token:'fake.jwt'}}})}},async(url,opts)=>{seen.push({url,body:JSON.parse(opts.body)});return reply({row:{payload:{...sample(),archived:true},revision:2}});},{mode:'live'});
 const result=await store.setArchived({...sample(),_revision:1},true);assert.equal(result._revision,2);assert.equal(result.archived,true);assert.equal(seen[0].url,'https://tqkmrejfbvzchfplgxzl.supabase.co/functions/v1/orders');assert.deepEqual(seen[0].body,{action:'archive',id:sample().id,archived:true,revision:1});
});
