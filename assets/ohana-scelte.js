/* Scelte OHANA: dati locali, modelli e richieste WhatsApp. Nessun ordine o invio automatico. */
(function(root){
  'use strict';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const broadFamilies=new Set(['1906','gel quantum','gel kayano','shox']);
  function modelKey(p){
    const safe=p.variantGroup&&!['pending','family'].includes(p.modelNameStatus)&&!broadFamilies.has(norm(p.family));
    return safe?[norm(p.brand),norm(p.type),p.variantGroup].join('|'):'article|'+p.id;
  }
  function groupProducts(products){
    const groups=new Map();
    for(const p of products){const key=modelKey(p);if(!groups.has(key))groups.set(key,{key,product:p,variants:[]});groups.get(key).variants.push(p);}
    return [...groups.values()];
  }
  function modelVariants(products,p){const key=modelKey(p);return products.filter(x=>modelKey(x)===key);}
  function favoriteIds(value,products){
    try{if(typeof value==='string')value=JSON.parse(value);}catch{return [];}
    if(!Array.isArray(value))return [];
    const allowed=new Set(products.map(p=>p.id));return [...new Set(value.filter(id=>typeof id==='string'&&allowed.has(id)))];
  }
  function productUrl(p,base){const u=new URL('catalogo-nuovo.html',base);u.search='';u.hash='';u.searchParams.set('articolo',p.id);return u.href;}
  function managerUrl(p,base){const u=new URL('gestione/',productUrl(p,base));u.search='';u.hash='';u.searchParams.set('articolo',p.id);return u.href;}
  function shareData(p,base){return {title:[p.brand,p.name||p.family,'OHANA Street'].join(' · '),text:p.color,url:productUrl(p,base)};}
  function sizeValue(draft={}){
    if(draft.size==='unknown')return 'Da definire';
    return String(draft.size==='other'?draft.otherSize||'':draft.size||'').trim().replace(',','.').slice(0,12);
  }
  function validSize(draft){const size=sizeValue(draft);return size==='Da definire'||/^\d{1,2}(?:\.\d)?$/.test(size);}
  function selectionRequest(products,ids,drafts,question,base,phone='393520263951'){
    const byId=new Map(products.map(p=>[p.id,p]));
    const entries=favoriteIds(ids,products).map(id=>({product:byId.get(id),size:sizeValue(drafts[id]),valid:validSize(drafts[id])}));
    const invalid=entries.filter(x=>!x.valid).map(x=>x.product.id);
    const lines=['Aloha OHANA STREET! 👋','Vorrei informazioni sulle scarpe che ho scelto.',''];
    for(const [i,{product:p,size}] of entries.entries())lines.push(`${i+1}. ${p.brand} · ${p.name||p.family}`,`Codice OHANA: ${p.id}`,...(p.code?[`Riferimento modello: ${p.code}`]:[]),`Colore fotografato: ${p.color}`,`Taglia richiesta: ${size||'Da definire'}`,`Scheda gestori: ${managerUrl(p,base)}`,'');
    lines.push('Domanda: '+(String(question||'').trim().slice(0,650)||'Vorrei verificare disponibilità e dettagli di queste scarpe.'),'','Disponibilità, colori e taglie da confermare con OHANA.');
    const message=lines.join('\n'),chat='https://wa.me/'+String(phone).replace(/\D/g,''),full=chat+'?text='+encodeURIComponent(message);
    const copyRequired=full.length>7000;
    return {entries,invalid,message,copyRequired,url:copyRequired?chat:full};
  }
  const api={modelKey,groupProducts,modelVariants,favoriteIds,productUrl,managerUrl,shareData,sizeValue,validSize,selectionRequest};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OhanaScelte=Object.freeze(api);
})(typeof window==='undefined'?null:window);
