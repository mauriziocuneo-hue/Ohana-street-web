import {itemsOf,isLive} from './ordini-core.mjs';
// Conservative local parser: explicit labels; no external AI or WhatsApp connection.
export const LABELS={customer:'Cliente',phone:'Telefono',email:'Email',productId:'Prodotto OHANA',color:'Colore',size:'Taglia',address:'Indirizzo di consegna',customerDecision:'Risposta cliente'};
const aliases={nome:'first',cognome:'last','nome e cognome':'customer',cliente:'customer',telefono:'phone',cellulare:'phone',tel:'phone',email:'email','e-mail':'email',indirizzo:'street',via:'street',cap:'postal',comune:'city',citta:'city',provincia:'province',paese:'country',colore:'color',taglia:'size',risposta:'customerDecision',conferma:'customerDecision'};
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function parseMessage(text,products,expectedId){
 if(!text.trim())throw Error('Incolla prima un messaggio.');if(text.length>12000)throw Error('Messaggio troppo lungo: massimo 12.000 caratteri.');
 const fields={},issues=[],blocked=[],values=new Map();
 const put=(key,val)=>{val=val.trim();if(!val||/^(?:\[.*\]|\.{3}|da compilare)$/i.test(val))return;const arr=values.get(key)||[];if(!arr.includes(val))arr.push(val);values.set(key,arr);};
 for(const line of text.split(/\r?\n/)){const m=line.match(/^\s*([^:]{1,40}):\s*(.*?)\s*$/);if(m&&aliases[norm(m[1])])put(aliases[norm(m[1])],m[2]);}
 const get=key=>{const arr=values.get(key)||[];if(arr.length>1){issues.push(`Più valori per ${LABELS[key]||key}: scegli manualmente.`);return '';}return arr[0]||'';};
 const refs=[...new Set((text.match(/\b(?:DEMO|OHANA)-[A-F0-9]{4,}\b/gi)||[]).map(s=>s.toUpperCase()))];
 if(refs.length>1||refs.length===1&&refs[0]!==expectedId.toUpperCase())blocked.push('Il riferimento appartiene a un’altra richiesta o contiene più richieste.');
 if(!refs.length)issues.push('Riferimento ordine assente: conferma tu l’associazione alla richiesta aperta.');
 const codes=[...new Set((text.match(/\b(?:OHY-\d{3}|OH-(?:N-)?[A-F0-9]{12})\b/gi)||[]).map(s=>s.toUpperCase()))];
 if(codes.length===1){if(products.some(p=>p.id===codes[0]))fields.productId=codes[0];else issues.push('Codice OHANA non presente nel catalogo: seleziona il prodotto manualmente.');}else if(codes.length>1)issues.push('Più prodotti nel messaggio: nessun prodotto selezionato automaticamente.');
 const customer=get('customer'),first=get('first'),last=get('last');if(customer&&(first||last)&&customer!==[first,last].filter(Boolean).join(' '))issues.push('Nome cliente in conflitto: verifica manualmente.');else if(customer||first&&last)fields.customer=customer||first+' '+last;
 const phone=get('phone');if(phone){const compact=phone.replace(/[\s().-]/g,'');if(/^\+?\d{8,15}$/.test(compact))fields.phone=compact;else issues.push('Telefono non riconosciuto: correggilo manualmente.');}
 const email=get('email');if(email){if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fields.email=email;else issues.push('Email non valida.');}
 const color=get('color');if(color)fields.color=color;
 let size=get('size');if(!values.has('size')){const sizes=[...new Set([...text.matchAll(/\btaglia\s+(\d{2}(?:[.,][05]|\s*[⅓⅔])?)(?!\d)/gi)].map(m=>m[1]))];if(sizes.length===1)size=sizes[0];else if(sizes.length>1)issues.push('Più taglie nel messaggio: scegli manualmente.');}
 if(size){if(/^\d{2}(?:[.,][05]|\s*[⅓⅔])?$/.test(size))fields.size=size.replace(',','.');else issues.push('Taglia ambigua o non riconosciuta.');}
 const street=get('street'),postal=get('postal'),city=get('city'),province=get('province'),country=get('country');
 if(street&&postal&&city&&province&&/^\d{5}$/.test(postal))fields.address=[street,`${postal} ${city} (${province})`,country].filter(Boolean).join('\n');else if(street||postal||city||province)issues.push('Indirizzo incompleto: servono indirizzo/civico, CAP di 5 cifre, città e provincia.');
 const response=get('customerDecision');const bare=text.trim().match(/^(s[iì]|no)\s+((?:DEMO|OHANA)-[A-F0-9]{4,})[.!]?$/i);const decision=response||bare?.[1];if(decision){if(/^(si|no)$/.test(norm(decision)))fields.customerDecision=norm(decision)==='si'?'sì':'no';else issues.push('Risposta cliente ambigua: nessun sì/no attribuito.');}
 if(/\b(?:pagat[oa]|pagamento|prezzo|costo|margine|fornitore)\b/i.test(text))issues.push('Prezzi, costi, fornitori e dichiarazioni di pagamento non vengono importati.');
 const missing=['customer','phone','productId','color','size','address'].filter(k=>!fields[k]).map(k=>LABELS[k]);
 return {fields,issues,missing,blocked,reference:refs[0]||null};
}
export function dataRequest(o){return `${isLive(o)?'':'[SIMULAZIONE DEMO — NON INVIARE]\n'}Per completare la richiesta ${o.id}, rispondi compilando questo schema ${isLive(o)?'con i dati di consegna':'con soli dati fittizi'}:\nRiferimento: ${o.id}\nRisposta: sì\n${itemsOf(o).map((item,n)=>`Articolo ${n+1}:\nCodice OHANA: ${item.productId}\nColore: ${item.color}\nTaglia: ${item.size}\nQuantità: ${item.quantity}`).join('\n')}\nNome e cognome: [da compilare]\nTelefono: [da compilare]\nEmail: [facoltativa]\nIndirizzo: [via e numero civico]\nCAP: [da compilare]\nCittà: [da compilare]\nProvincia: [da compilare]\nPaese: Italia\nTi invieremo il riepilogo da controllare prima del pagamento.`;}
export function sampleMessage(o){return `Riferimento: ${o.id}\nRisposta: sì\nCodice OHANA: ${o.productId}\nNome e cognome: Cliente Prova\nTelefono: +39 000 000 0000\nEmail: cliente@example.invalid\nColore: ${o.color}\nTaglia: 42\nIndirizzo: Via di Test 10\nCAP: 00000\nCittà: Città Demo\nProvincia: XX\nPaese: Italia`;}
