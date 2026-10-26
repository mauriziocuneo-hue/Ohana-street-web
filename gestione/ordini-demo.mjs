import {parseMessage,LABELS,dataRequest,sampleMessage} from './importa-whatsapp.mjs';
import {STATES,euro,cents,margin,validate,paymentRequest,advance,recordPayment,whatsapp,seed,modelName} from './ordini-core.mjs';
export function mountOrders(host,{products,suppliers=[],scope='private-preview'}={}){
 const key='ohana:test:gestione-richieste-pagamenti:v1:'+scope;
 let orders=[],selected=null,kind='preventivo';
 const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 host.className='orders-demo';
 const title=make('h2','Richieste e ordini'),banner=make('div','DEMO · Solo dati fittizi. Nessun pagamento, invio WhatsApp o ordine al fornitore. I test sono salvati solo in questa sessione del browser e non sono condivisi tra i gestori.','demo-banner');
 const status=make('p','','order-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const layout=make('div',undefined,'order-layout'),aside=make('aside',undefined,'order-card'),editor=make('div',undefined,'order-card'),list=make('div',undefined,'order-list'),find=make('input');find.type='search';find.placeholder='Cerca ordine o cliente demo';find.setAttribute('aria-label','Cerca ordine o cliente demo');
 const notify=text=>{status.textContent=text;};
 const button=(text,fn,cls='secondary')=>{const b=make('button',text,cls);b.type='button';b.addEventListener('click',async()=>{try{await fn();}catch(e){notify(e.message);}});return b;};
 function persist(){try{sessionStorage.setItem(key,JSON.stringify(orders));}catch{notify('Memoria browser non disponibile: i test resteranno aperti solo fino alla chiusura della pagina.');}}
 try{const saved=JSON.parse(sessionStorage.getItem(key)||'[]');if(Array.isArray(saved)){for(const o of saved){validate(o,products);if(!/^DEMO-[0-9a-f-]+$/i.test(o.id)||!Array.isArray(o.history))throw Error('Archivio demo non valido');}orders=saved;}}catch{orders=[];}
 function create(){const o=seed(products[0]);o.id='DEMO-'+Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();orders.unshift(o);selected=o.id;persist();render();notify('Richiesta demo creata. Modifica i dati e salva.');}
 aside.append(make('h3','Le richieste'),button('＋ Nuova richiesta demo',create),find,list,button('Azzera dati demo',()=>{if(!confirm('Eliminare tutte le richieste demo di questa sessione?'))return;orders=[];selected=null;persist();render();notify('Dati demo eliminati.');},'danger'));
 layout.append(aside,editor);host.replaceChildren(title,banner,layout,status);find.addEventListener('input',renderList);
 function renderList(){list.replaceChildren();for(const o of orders.filter(o=>(o.id+' '+o.customer+' '+o.productId).toLowerCase().includes(find.value.toLowerCase()))){const b=button(`${o.id} · ${o.customer}\n${o.productId} · ${o.state}`,()=>{selected=o.id;render();});b.setAttribute('aria-current',String(selected===o.id));list.append(b);}if(!list.childElementCount)list.append(make('p','Nessuna richiesta. Crea un ordine demo per iniziare.'));}
 function render(){
 renderList();editor.replaceChildren();const o=orders.find(x=>x.id===selected);if(!o){editor.append(make('h3','Dal messaggio alla consegna'),make('p','Crea una richiesta demo: scegli una scarpa OHANA, prepara il preventivo, simula PayPal e aggiorna spedizione e consegna.'));return;}
 const closed=['consegnato','annullato'].includes(o.state),commercialLocked=STATES.indexOf(o.state)>=2;
 editor.append(make('h3',o.id),make('span',o.state.toUpperCase(),'badge'));
 const form=make('form'),fields=make('div',undefined,'order-fields'),inputs={};
 function field(name,label,value,{type='text',full=false,options=null,readonly=false}={}){const wrap=make('div',undefined,full?'full':'');const id='order-'+name,lab=make('label',label);lab.htmlFor=id;const n=make(options?'select':type==='textarea'?'textarea':'input');n.id=id;if(n.tagName==='INPUT')n.type=type;if(options)for(const [v,t]of options){const opt=make('option',t);opt.value=v;n.append(opt);}n.value=value??'';n.disabled=closed||readonly;if(['price','cost','shippingCost','fees'].includes(name))n.inputMode='decimal';n.maxLength=2000;wrap.append(lab,n);fields.append(wrap);inputs[name]=n;return n;}
 field('customer','Cliente (nome fittizio)',o.customer);field('phone','Riferimento WhatsApp fittizio',o.phone);
 field('email','Email cliente · facoltativa',o.email);field('customerDecision','Risposta cliente · non cambia lo stato ordine',o.customerDecision||'non indicata',{options:[['non indicata','Non indicata'],['sì','Sì, vuole procedere'],['no','No, rinuncia']]});
 field('source','Messaggio WhatsApp ricevuto · incolla una richiesta fittizia',o.source,{type:'textarea',full:true});
 field('productId','Prodotto OHANA',o.productId,{options:products.map(p=>[p.id,p.id+' · '+p.brand+' '+p.model]),full:true,readonly:commercialLocked});
 field('model','Modello selezionato',o.model,{readonly:commercialLocked});field('color','Colore selezionato',o.color,{readonly:commercialLocked});const colorList=make('datalist');colorList.id='order-known-colors';for(const color of [...new Set(products.filter(p=>modelName(p)===o.model).flatMap(p=>p.colori_disponibili||[p.color]).filter(Boolean))]){const opt=make('option');opt.value=color;colorList.append(opt);}inputs.color.setAttribute('list',colorList.id);fields.append(colorList);field('size','Taglia richiesta · disponibilità da verificare',o.size,{readonly:commercialLocked});
 function supplierOptions(id){return [['','Da selezionare'],['Fornitore DEMO A','Fornitore DEMO A'],['Fornitore DEMO B','Fornitore DEMO B'],...suppliers.filter(r=>r.product_id===id).map((r,i)=>['esistente-'+r.product_id+'-'+i,'Fornitore associato a '+r.product_id])];}
 field('supplier','Fornitore',o.supplier,{options:supplierOptions(o.productId)});
 for(const [k,label]of [['price','Prezzo concordato totale € · spedizione inclusa'],['cost','Costo prodotto fornitore €'],['shippingCost','Costo spedizione €'],['fees','Commissioni / altri costi €']])field(k,label,(o[k]/100).toFixed(2),{readonly:k==='price'&&commercialLocked});
 field('address','Destinatario e indirizzo fittizi',o.address,{full:true,type:'textarea'});field('carrier','Corriere',o.carrier);field('tracking','Codice tracking · nessun link automatico',o.tracking);
 const preview=make('div',undefined,'product-preview');function productPreview(){preview.replaceChildren();const p=products.find(p=>p.id===inputs.productId.value);if(!p)return;if(/^assets\/products\/[\w.-]+\.(webp|png|jpe?g)$/i.test(p.image||'')){const img=make('img');img.src='../'+p.image;img.alt=p.model;preview.append(img);}preview.append(make('span',p.id+' · '+p.model));for(const row of suppliers.filter(r=>r.product_id===p.id)){try{const url=new URL(row.album_url);if(url.protocol!=='https:')continue;const a=make('a','Album fornitore');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';preview.append(a);}catch{}}}
 inputs.productId.addEventListener('change',()=>{const p=products.find(p=>p.id===inputs.productId.value);inputs.model.value=modelName(p);inputs.color.value=p.colori_disponibili?.[0]||p.color||'Da confermare';inputs.supplier.replaceChildren();for(const [v,t]of supplierOptions(p.id)){const option=make('option',t);option.value=v;inputs.supplier.append(option);}productPreview();});productPreview();
 const totals=make('div',undefined,'money-summary');function totalsPreview(){try{const current={...o};for(const k of ['price','cost','shippingCost','fees'])current[k]=cents(inputs[k].value);totals.replaceChildren();for(const [label,value]of [['Totale cliente',current.price],['Costi totali',current.cost+current.shippingCost+current.fees],['Margine stimato',margin(current)]]){const n=make('div',label);n.append(make('strong',euro(value)));totals.append(n);}}catch{totals.textContent='Controlla gli importi.';}}
 for(const k of ['price','cost','shippingCost','fees'])inputs[k].addEventListener('input',totalsPreview);totalsPreview();
 function save(){if(closed)throw Error('Ordine chiuso: i dati sono in sola lettura.');const draft={...o};for(const k in inputs)if(!inputs[k].disabled)draft[k]=['price','cost','shippingCost','fees'].includes(k)?cents(inputs[k].value):inputs[k].value.trim();validate(draft,products);if(['productId','model','color','size','price'].some(k=>draft[k]!==o[k]))draft.payment=null;Object.assign(o,draft);persist();return o;}
 form.addEventListener('submit',e=>{e.preventDefault();try{save();render();notify('Richiesta salvata nella sessione del browser.');}catch(err){notify(err.message);}});
 const saveBtn=make('button','Salva richiesta');saveBtn.type='submit';saveBtn.disabled=closed;form.append(fields,preview,totals,make('p','Prezzi e margini sono solo nel pannello gestori. Il margine stimato sottrae costo prodotto, spedizione e commissioni; non è un calcolo fiscale.','muted'),saveBtn);editor.append(form);

 if(!closed){
 const importer=make('details');importer.open=true;importer.append(make('summary','Incolla e importa da WhatsApp · DEMO'));
 importer.append(make('p','1. Incolla la risposta fittizia. 2. Analizza e controlla i campi. 3. Applica alla bozza, poi Salva richiesta. I campi selezionati sostituiscono quelli nel modulo; gli altri restano invariati. Nessuna lettura automatica delle chat.','muted'));
 const raw=make('textarea');raw.maxLength=12000;raw.rows=7;raw.setAttribute('aria-label','Messaggio da importare');
 const review=make('div');review.setAttribute('aria-live','polite');
 raw.addEventListener('input',()=>review.replaceChildren());
 const sample=button('Carica messaggio di esempio',()=>{raw.value=sampleMessage(o);review.replaceChildren();});
 const analyze=button('Analizza messaggio',()=>{
 const result=parseMessage(raw.value,products,o.id),original=raw.value;review.replaceChildren(make('h4','Controlla prima di applicare'));
 for(const problem of [...result.blocked,...result.issues])review.append(make('p',problem,'notice'));
 review.append(make('p',result.missing.length?'Non trovati nel messaggio: '+result.missing.join(', ')+'. Completa o verifica nel modulo.':'Dati principali riconosciuti: controlla comunque ogni campo.','muted'));
 const chosen=[];
 for(const [key,value] of Object.entries(result.fields)){
 const row=make('label',undefined,'import-choice'),check=make('input');check.type='checkbox';check.checked=true;check.disabled=!!inputs[key]?.disabled;row.append(check,make('span',`${LABELS[key]}: ${value}${check.disabled?' · bloccato nello stato attuale':''}`));review.append(row);chosen.push({key,value,check});
 }
 const confirmLabel=make('label',undefined,'import-choice'),confirm=make('input');confirm.type='checkbox';confirmLabel.append(confirm,make('span','Ho verificato i dati e la loro associazione a '+o.id));review.append(confirmLabel);
 const apply=button('Applica i campi selezionati alla bozza',()=>{
 if(raw.value!==original)throw Error('Il messaggio è cambiato: analizzalo di nuovo.');if(!confirm.checked)throw Error('Conferma di aver verificato dati e richiesta.');
 const accepted=chosen.filter(x=>x.check.checked&&!x.check.disabled);if(!accepted.length)throw Error('Seleziona almeno un campo riconosciuto.');
 const product=accepted.find(x=>x.key==='productId');if(product&&inputs.productId.value!==product.value){inputs.productId.value=product.value;inputs.productId.dispatchEvent(new Event('change'));}
 for(const {key,value}of accepted)inputs[key].value=value;
 inputs.source.value=original;review.replaceChildren(make('p','Campi applicati al modulo. Controlla e premi Salva richiesta: nulla è stato ancora salvato.'));
 notify('Bozza compilata. Prezzi, costi e pagamento invariati; nessuno stato aggiornato.');form.scrollIntoView({behavior:'smooth'});
 });apply.disabled=!!result.blocked.length||!chosen.some(x=>!x.check.disabled);review.append(apply);
 });
 importer.append(raw,make('div',undefined,'order-actions'),review);importer.querySelector('.order-actions').append(sample,analyze);editor.insertBefore(importer,form);
 }
 const actions=make('div',undefined,'order-actions');function step(fn,text){save();fn();o.history.push({state:o.state,at:new Date().toISOString()});persist();render();notify(text);}
 if(!closed){const next=STATES[STATES.indexOf(o.state)+1];if(next==='pagamento registrato')actions.append(button('Registra pagamento demo',()=>step(()=>recordPayment(o),'Pagamento fittizio registrato: nessun movimento di denaro.')));else actions.append(button('Passa a '+next,()=>step(()=>advance(o,next),'Stato aggiornato: '+next)));actions.append(button('Annulla richiesta',()=>step(()=>advance(o,'annullato'),'Richiesta annullata.'),'danger'));}
 editor.append(actions);
 const payment=make('section',undefined,'payment-preview');payment.append(make('h3','PayPal · simulazione locale'),make('p','Questa anteprima non contatta PayPal e non genera link di pagamento. Nessuna transazione reale.','muted'));
 if(o.payment)payment.append(make('p',`${o.payment.id}\n${o.payment.description}\n${euro(o.payment.amount)} · ${o.payment.currency} · ${o.payment.status}`));
 if(o.state==='preventivo')payment.append(button(o.payment?'Rigenera richiesta demo':'Genera richiesta PayPal demo',()=>{save();o.payment=paymentRequest(o);persist();render();notify('Richiesta PayPal demo creata. Ora puoi passare ad attesa pagamento.');}));editor.append(payment);
 const messages=make('details');messages.open=true;messages.append(make('summary','Messaggi WhatsApp pronti da copiare'));
 const choices=make('select');choices.setAttribute('aria-label','Tipo messaggio');for(const v of ['preventivo','richiesta dati','pagamento','aggiornamento']){const opt=make('option',v);opt.value=v;choices.append(opt);}choices.value=kind;
 const text=make('textarea');text.rows=7;text.readOnly=true;text.setAttribute('aria-label','Messaggio WhatsApp demo');text.value=kind==='richiesta dati'?dataRequest(o):whatsapp(o,kind);choices.addEventListener('change',()=>{kind=choices.value;text.value=kind==='richiesta dati'?dataRequest(o):whatsapp(o,kind);});
 const copy=button('Copia messaggio demo',async()=>{try{await navigator.clipboard.writeText(text.value);notify('Testo demo copiato. Nessun messaggio inviato.');}catch{text.focus();text.select();notify('Seleziona e copia il testo manualmente.');}});
 messages.append(make('p','Testi dai dati salvati. Costo fornitore, margine e indirizzo non sono inclusi. Nessuna chat viene aperta o inviata.','muted'),choices,text,copy);editor.append(messages);
 const history=make('details');history.append(make('summary','Cronologia stati'));const ul=make('ol',undefined,'history');for(const e of o.history)ul.append(make('li',new Date(e.at).toLocaleString('it-IT')+' · '+e.state));history.append(ul);editor.append(history);
 }
 if(orders.length)selected=orders[0].id;render();
 const listener=e=>{const id=e.target.closest?.('[data-order-product]')?.dataset.orderProduct;if(id&&products.some(p=>p.id===id)){create();const o=orders[0],p=products.find(p=>p.id===id);o.productId=id;o.model=modelName(p);o.color=p.colori_disponibili?.[0]||p.color||'Da confermare';persist();render();host.closest('details')?.setAttribute('open','');host.scrollIntoView({behavior:'smooth'});}};document.addEventListener('click',listener);
 return ()=>{document.removeEventListener('click',listener);orders=[];host.replaceChildren();};
}
