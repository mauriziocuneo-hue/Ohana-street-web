import {mountOrders} from './ordini-demo.mjs';
const host=document.querySelector('#demo');
try{
 const responses=await Promise.all([fetch('../catalogo.json'),fetch('../catalogo-nuovo.json')]);
 if(responses.some(r=>!r.ok))throw Error('Catalogo non disponibile');
 const [catalog,trial]=await Promise.all(responses.map(r=>r.json()));
 const products=[...new Map([...catalog.filter(p=>p.genere==='Scarpe'&&p.vetrina!==false),...trial.products.map(p=>({id:p.id,brand:p.brand,model:(p.name||p.family)+' — '+p.color,image:p.image,color:p.color,colori_disponibili:[p.color]}))].map(p=>[p.id,p])).values()];
 mountOrders(host,{products});
}catch{host.textContent='Impossibile caricare il catalogo demo. Ricarica la pagina.';}
