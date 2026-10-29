// Persistent test archive. Only the isolated project receives writes.
export const DEMO_DB_URL='https://csxtcxnmottiljcbnotu.supabase.co';
const API_KEY='sb_publishable_NdZg-ubhBZlL2aeOc38tfg_kVqsJQ3x';
export function createOrderStore(client,fetcher=fetch,{mode='demo'}={}){
 const live=mode==='live',base=live?'https://tqkmrejfbvzchfplgxzl.supabase.co':DEMO_DB_URL,apiKey=live?'sb_publishable_PNYqcGwzw7oSLfbojDblZw_6VkpC8zI':API_KEY;
 async function request(body){const {data,error}=await client.auth.getSession();if(error||!data.session)throw Error('Accedi di nuovo con il tuo account gestore.');const r=await fetcher(base+'/functions/v1/'+(live?'orders':'demo-orders'),{method:'POST',headers:{apikey:apiKey,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw Error(result.error||'Archivio non disponibile. Riprova.');return result;}
 return {async setArchived(order,archived){const {row}=await request({action:'archive',id:order.id,archived,revision:order._revision||0});return {...row.payload,_revision:row.revision};},async list(){const all=[];for(let offset=0;;offset+=250){const {rows}=await request({action:'list',offset});all.push(...rows.map(r=>({...r.payload,_revision:r.revision})));if(rows.length<250)return all;}},async save(order){const {row}=await request({action:'save',order,revision:order._revision||0});return {...row.payload,_revision:row.revision};}};
}
