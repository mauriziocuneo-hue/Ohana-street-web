import {validate,advance,recordPayment,paymentRequest,STATES} from '../../gestione/ordini-core.mjs';
const AUTH_URL='https://tqkmrejfbvzchfplgxzl.supabase.co';
const AUTH_KEY='sb_publishable_PNYqcGwzw7oSLfbojDblZw_6VkpC8zI';
export function makeHandler({dbUrl,serviceKey,products,fetcher=fetch}){
 const origins=new Set(['https://ohana-ordini-demo.juggleio.chatgpt.site','http://terminal.local:4173','https://www.ohana-street.kozow.com']);
 return async req=>{
 const origin=req.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origin&&origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 headers['Access-Control-Allow-Headers']='authorization,apikey,content-type';headers['Access-Control-Allow-Methods']='POST,OPTIONS';
 const out=(status,data)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!origins.has(origin))return out(403,{error:'Origin non autorizzata'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return out(405,{error:'Metodo non consentito'});
 const auth=req.headers.get('authorization')||'';if(!/^Bearer [\w.-]+$/.test(auth)||auth.length>12000)return out(401,{error:'Accesso gestore richiesto'});
 try{
  // Always verify with the existing Auth server, then its manager RLS table.
  const userResponse=await fetcher(AUTH_URL+'/auth/v1/user',{headers:{apikey:AUTH_KEY,Authorization:auth}});
  if(!userResponse.ok)return out(401,{error:'Sessione non valida o scaduta'});
  const user=await userResponse.json();if(!/^[0-9a-f-]{36}$/i.test(user.id||''))return out(401,{error:'Sessione non valida'});
  const managerResponse=await fetcher(AUTH_URL+'/rest/v1/ohana_managers?select=user_id&user_id=eq.'+encodeURIComponent(user.id),{headers:{apikey:AUTH_KEY,Authorization:auth}});
  if(!managerResponse.ok)return out(403,{error:'Accesso gestore non autorizzato'});
  const managers=await managerResponse.json();if(!managers.some(m=>m.user_id===user.id))return out(403,{error:'Accesso gestore non autorizzato'});
  const raw=await req.text();if(raw.length>60000)return out(413,{error:'Richiesta troppo grande'});
  let body;try{body=JSON.parse(raw);}catch{return out(400,{error:'Richiesta non valida'});}
  const dbHeaders={apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'};
  if(body.action==='list'){
   const offset=Number(body.offset||0);if(!Number.isInteger(offset)||offset<0)return out(400,{error:'Pagina non valida'});
   const r=await fetcher(dbUrl+'/rest/v1/ohana_demo_orders?select=id,payload,revision,updated_at&order=id.asc&limit=250&offset='+offset,{headers:dbHeaders});
   if(!r.ok)return out(503,{error:'Archivio temporaneamente non disponibile'});return out(200,{rows:await r.json()});
  }
  if(body.action!=='save')return out(400,{error:'Operazione non consentita'});
  const order=body.order;try{validate(order,products);}catch{return out(400,{error:'Dati ordine non validi'});}
  if(!/^DEMO-[A-F0-9]{8,32}$/.test(order.id)||!Number.isInteger(body.revision)||body.revision<0)return out(400,{error:'Riferimento ordine non valido'});
  const allowed=['id','customer','phone','email','source','productId','model','color','size','price','cost','shippingCost','fees','supplier','address','carrier','tracking','state','payment','history','customerDecision'];
  const clean=Object.fromEntries(allowed.filter(k=>Object.hasOwn(order,k)).map(k=>[k,order[k]]));
  if(allowed.some(k=>typeof clean[k]==='string'&&clean[k].length>(k==='source'?12000:2000))||!Array.isArray(clean.history)||clean.history.length>100)return out(400,{error:'Dati ordine troppo lunghi'});
  if(clean.payment&&(!String(clean.payment.id).startsWith('DEMO-PAY-')||clean.payment.currency!=='EUR'||!['simulata','registrato demo'].includes(clean.payment.status)))return out(400,{error:'Sono consentiti soltanto pagamenti demo'});
  // Validate workflow on the server too; the UI alone is not authoritative.
  if(body.revision===0){if(clean.state!=='richiesta'||clean.payment)return out(400,{error:'Una nuova richiesta deve iniziare senza pagamento.'});clean.history=[{state:'richiesta',at:new Date().toISOString()}];}
  else{
   const previousResponse=await fetcher(dbUrl+'/rest/v1/ohana_demo_orders?select=payload,revision&id=eq.'+encodeURIComponent(clean.id),{headers:dbHeaders});
   if(!previousResponse.ok)return out(503,{error:'Impossibile verificare la revisione.'});
   const previous=(await previousResponse.json())[0];if(!previous||previous.revision!==body.revision)return out(409,{error:'Ordine modificato. Aggiorna l’elenco prima di riprovare.'});
   const old=previous.payload;if(['annullato','consegnato'].includes(old.state))return out(409,{error:'Ordine chiuso: modifica non consentita.'});
   if(STATES.indexOf(old.state)>=2&&['productId','model','color','size','price'].some(k=>clean[k]!==old[k]))return out(400,{error:'Dati commerciali bloccati dopo il preventivo.'});
   try{
    if(clean.state!==old.state){const draft={...clean,state:old.state,payment:old.payment?structuredClone(old.payment):null};if(clean.state==='pagamento registrato')recordPayment(draft);else advance(draft,clean.state);clean.payment=draft.payment;clean.history=[...old.history,{state:clean.state,at:new Date().toISOString()}];}
    else{clean.history=old.history;if(old.state==='preventivo')clean.payment=clean.payment?paymentRequest(clean):null;else clean.payment=old.payment;}
   }catch{return out(400,{error:'Passaggio di stato non valido o dati mancanti.'});}
  }
  const r=await fetcher(dbUrl+'/rest/v1/rpc/ohana_demo_save',{method:'POST',headers:dbHeaders,body:JSON.stringify({p_id:clean.id,p_payload:clean,p_revision:body.revision,p_actor:user.id})});
  if(!r.ok){const err=await r.json();if(err.code==='40001')return out(409,{error:'Ordine modificato da un altro gestore. Aggiorna l’elenco prima di riprovare.'});return out(503,{error:'Salvataggio non riuscito. Riprova.'});}
  const saved=await r.json();return out(200,{row:saved[0]});
 }catch{return out(503,{error:'Servizio temporaneamente non disponibile. Nessuna conferma di salvataggio.'});}
 };
}
