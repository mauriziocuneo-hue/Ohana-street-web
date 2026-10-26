// Persistent test archive. Only the isolated project receives writes.
export const DEMO_DB_URL='https://csxtcxnmottiljcbnotu.supabase.co';
const API_KEY='sb_publishable_NdZg-ubhBZlL2aeOc38tfg_kVqsJQ3x';
export function createOrderStore(client,fetcher=fetch){
 async function request(body){const {data,error}=await client.auth.getSession();if(error||!data.session)throw Error('Accedi di nuovo con il tuo account gestore.');const r=await fetcher(DEMO_DB_URL+'/functions/v1/demo-orders',{method:'POST',headers:{apikey:API_KEY,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw Error(result.error||'Archivio non disponibile. Riprova.');return result;}
 return {async list(){const all=[];for(let offset=0;;offset+=250){const {rows}=await request({action:'list',offset});all.push(...rows.map(r=>({...r.payload,_revision:r.revision})));if(rows.length<250)return all;}},async save(order){const {row}=await request({action:'save',order,revision:order._revision||0});return {...row.payload,_revision:row.revision};}};
}
