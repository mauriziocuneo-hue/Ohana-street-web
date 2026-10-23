/* OHANA — richieste guidate gratuite, senza backend né invii automatici. */
(function(root){
  'use strict';
  const clean=(value,max=650)=>String(value??'').trim().slice(0,max);
  const topics={disponibilita:'Vorrei verificare la disponibilità di questa scarpa.',taglie:'Vorrei informazioni sulla taglia e sulla vestibilità.',colori:'Vorrei informazioni su altre colorazioni.',informazioni:'Vorrei maggiori informazioni su questa scarpa.'};
  function productInfo(product){
    const p=product||{},model=p.name||p.family||p.model||'';
    return {id:clean(p.id,40),label:clean([p.brand,model].filter(Boolean).join(' · '),190),color:clean(p.color||(Array.isArray(p.colori_disponibili)?p.colori_disponibili.join(', '):''),80),code:clean(p.code||p.codice_modello,40)};
  }
  function sizeValue(data){return data.size==='unknown'?'Da definire':clean(data.size==='other'?data.otherSize:data.size,12).replace(',','.');}
  function validate(data,step){
    if(step===0){
      if(!data.size)return 'Scegli una taglia, oppure “Non so ancora”.';
      if(data.size!=='unknown'&&!/^\d{1,2}(?:\.\d)?$/.test(sizeValue(data)))return 'Indica la taglia desiderata, per esempio 47 oppure 42,5.';
    }
    if(step===1&&!clean(data.question))return 'Scegli un argomento oppure scrivi la tua domanda.';
    return '';
  }
  function requestData(product,data,baseUrl){
    const p=productInfo(product),typed=clean(data.product,190);
    const id=p.id||typed.match(/\b(?:OHY-\d{3}|OH-(?:N-)?[A-F0-9]{12})\b/i)?.[0]?.toUpperCase()||'';
    const url=new URL('catalogo-nuovo.html',baseUrl);url.search='';url.hash='';if(id)url.searchParams.set('articolo',id);
    return {product:p.label||typed||'Richiesta generale',id,code:p.code,size:sizeValue(data)||'Da definire',color:clean(data.color,80)||'Da definire',question:clean(data.question),url:id?url.href:''};
  }
  function message(product,data,baseUrl){
    const r=requestData(product,data,baseUrl);
    return ['Aloha OHANA STREET! 👋','Vorrei informazioni sul vostro catalogo.','',`Prodotto: ${r.product}`,...(r.id?[`Codice OHANA: ${r.id}`]:[]),...(r.code?[`Riferimento modello: ${r.code}`]:[]),`Taglia richiesta: ${r.size}`,`Colore richiesto: ${r.color}`,`Domanda: ${r.question}`,...(r.url?['',`Scheda: ${r.url}`]:[]),'','Disponibilità, colori e taglie da confermare con OHANA.'].join('\n');
  }
  const api={productInfo,sizeValue,validate,requestData,message,topics};if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(!root?.document)return;
  const phone=String(root.OHANA_CONTACT_NUMBER||'').replace(/\D/g,'');if(!/^[1-9]\d{7,14}$/.test(phone))return;
  let sequence=0;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  function mount(host,product=null){
    if(!host)return null;
    const context=productInfo(product),prefix='ohc-request-'+(++sequence);let step=0,data={product:'',size:'',otherSize:'',color:context.color,question:''};
    host.replaceChildren();host.classList.add('ohc-request');
    const heading=el('h3','ohc-question','Chiedi a OHANA'),progress=el('p','ohc-progress'),body=el('div','ohc-fields');heading.id=prefix+'-heading';host.setAttribute('aria-labelledby',heading.id);
    const form=el('form'),error=el('p','ohc-error');error.setAttribute('role','alert');error.hidden=true;
    const actions=el('div','ohc-actions'),back=el('button','ohc-btn ohc-back','Indietro'),next=el('button','ohc-btn ohc-next','Continua →'),send=el('a','ohc-send','Apri WhatsApp ↗'),copy=el('button','ohc-btn ohc-copy','Copia richiesta');
    back.type=copy.type='button';next.type='submit';send.target='_blank';send.rel='noopener noreferrer';send.hidden=copy.hidden=true;
    const status=el('p','ohc-tip');status.setAttribute('role','status');actions.append(back,next,copy,send);form.append(body,error,actions,status);host.append(heading,progress,form);
    function field(label,key,tag='input'){
      const wrap=el('div','ohc-field'),lab=el('label','ohc-label',label),input=el(tag,'ohc-input');input.id=prefix+'-'+key;lab.htmlFor=input.id;input.name=key;
      if(tag==='input')input.type='text';input.maxLength=key==='question'?650:key==='product'?190:key==='color'?80:12;input.value=data[key]||'';
      input.addEventListener('input',()=>{data[key]=input.value;error.hidden=true;});wrap.append(lab,input);body.append(wrap);return {wrap,input};
    }
    function render(focus=false){
      body.replaceChildren();error.hidden=true;status.textContent='';progress.textContent=step===2?'3 di 3 · Riepilogo':`${step+1} di 3 · ${step===0?'Taglia e colore':'La tua domanda'}`;
      back.disabled=step===0;next.hidden=step===2;send.hidden=copy.hidden=step!==2;next.textContent=step===1?'Rivedi richiesta →':'Continua →';
      if(context.label)body.append(el('p','ohc-context',context.label+(context.id?' · '+context.id:'')));
      if(step===0){
        if(!context.label){const p=field('Prodotto o codice (facoltativo)','product');p.input.placeholder='Es. Jordan 4 oppure codice OH-…';}
        const select=field('Taglia desiderata','size','select').input;
        for(const [value,label] of [['','Scegli la taglia'],...Array.from({length:11},(_,i)=>[String(i+36),String(i+36)]),['other','Altra taglia'],['unknown','Non so ancora']]){const option=el('option','',label);option.value=value;select.append(option);}select.value=data.size;
        const other=field('Quale altra taglia?','otherSize');other.input.placeholder='Es. 47 o 42,5';other.input.inputMode='decimal';other.wrap.hidden=data.size!=='other';
        select.addEventListener('change',()=>{data.size=select.value;other.wrap.hidden=data.size!=='other';error.hidden=true;if(data.size==='other')other.input.focus();});
        const color=field('Colore desiderato','color');color.input.placeholder='Quello in foto, nero, blu…';body.append(el('p','ohc-tip','Taglie 36–46 · altre su richiesta. Taglia e colore verranno verificati dai gestori.'));
      }else if(step===1){
        body.append(el('p','ohc-tip','Scegli un argomento e aggiungi i dettagli che ci aiutano a risponderti.'));const quick=el('div','ohc-topics');
        for(const [key,label] of [['disponibilita','Disponibilità'],['taglie','Taglia e vestibilità'],['colori','Altri colori'],['informazioni','Informazioni']]){const b=el('button','ohc-topic',label);b.type='button';b.addEventListener('click',()=>{data.question=topics[key];const input=body.querySelector('textarea');input.value=data.question;input.focus();error.hidden=true;});quick.append(b);}body.append(quick);
        const q=field('La tua domanda','question','textarea');q.input.placeholder='Es. Vorrei sapere se potete procurare il 42 in nero.';q.input.rows=4;
      }else{
        body.append(el('p','ohc-tip','Controlla i dettagli. WhatsApp aprirà questo testo: sarai tu a premere Invia.'));const summary=el('textarea','ohc-summary');summary.readOnly=true;summary.rows=10;summary.setAttribute('aria-label','Riepilogo della richiesta');summary.value=message(product,data,location.href);body.append(summary);send.href='https://wa.me/'+phone+'?text='+encodeURIComponent(summary.value);
      }
      if(focus)(body.querySelector('input,select,textarea')||heading).focus();
    }
    form.addEventListener('submit',event=>{event.preventDefault();if(step===2)return;const problem=validate(data,step);if(problem){error.textContent=problem;error.hidden=false;body.querySelector(step===1?'textarea':data.size==='other'?'input[name="otherSize"]':'select')?.focus();return;}step++;render(true);});
    back.addEventListener('click',()=>{if(step>0){step--;render(true);}});
    copy.addEventListener('click',async()=>{const summary=body.querySelector('textarea');try{await navigator.clipboard.writeText(summary.value);status.textContent='Richiesta copiata. Puoi incollarla nella chat WhatsApp.';}catch{summary.focus();summary.select();status.textContent='Testo selezionato: usa Copia per copiarlo.';}});
    render();return {focus:()=>body.querySelector('input,select,textarea')?.focus(),question:query=>{data.question=clean(query);step=data.size?1:0;render(true);host.scrollIntoView({block:'nearest'});}};
  }
  function init(){
    if(document.getElementById('ohana-chat-root'))return;
    const rootNode=el('div','ohc-root');rootNode.id='ohana-chat-root';const fab=el('button','ohc-fab','✿ Chiedi informazioni');fab.id='ohana-chat-toggle';fab.type='button';fab.setAttribute('aria-label','Apri assistente OHANA');fab.setAttribute('aria-expanded','false');fab.setAttribute('aria-controls','ohana-chat-panel');
    const panel=el('section','ohc-panel');panel.id='ohana-chat-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Assistente OHANA STREET');const header=el('div','ohc-header'),title=el('strong','','ALOHA! ✿'),close=el('button','ohc-close','×');close.type='button';close.setAttribute('aria-label','Chiudi assistente');header.append(title,close);const content=el('div','ohc-body');panel.append(header,content);rootNode.append(fab,panel);document.body.append(rootNode);let controller=mount(content);
    function shut(restore=false){panel.hidden=true;fab.setAttribute('aria-expanded','false');if(restore)fab.focus();}
    function open(product){if(product)controller=mount(content,product);panel.hidden=false;fab.setAttribute('aria-expanded','true');controller.focus();}
    fab.addEventListener('click',()=>panel.hidden?open():shut(true));close.addEventListener('click',()=>shut(true));document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopImmediatePropagation();shut(true);}});
    root.OhanaChat=Object.freeze({...api,mount,open:()=>open(),openWithProduct:open,close:()=>shut()});document.dispatchEvent(new Event('ohana-chat-ready'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window==='undefined'?null:window);
