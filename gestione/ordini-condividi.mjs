// Local files only: no WhatsApp API, recipient lookup or automatic sending.
export function photoURL(path){if(!/^assets\/products\/[\w.-]+\.(webp|jpe?g|png)$/i.test(path||''))throw Error('Foto ordine non valida.');return '../'+path;}
export async function photoPNG(path){
 const r=await fetch(photoURL(path),{credentials:'same-origin'});if(!r.ok)throw Error('Foto non disponibile. Usa Scarica foto oppure riprova.');
 const blob=await r.blob();if(!blob.type.startsWith('image/')||blob.size>15*1024*1024)throw Error('Formato o dimensione della foto non supportati.');
 const url=URL.createObjectURL(blob),img=new Image();
 try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Impossibile leggere la foto.'));img.src=url;});if(!img.naturalWidth||img.naturalWidth*img.naturalHeight>25000000)throw Error('Foto troppo grande.');const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Impossibile preparare la foto.')),'image/png'));}finally{URL.revokeObjectURL(url);}
}
export async function prepareOrderPhotos(group,orderId,load=photoPNG){
 if(!group.items?.length||group.items.length>20)throw Error('Numero di foto non valido.');
 const files=[];let bytes=0;
 for(const [n,item]of group.items.entries()){photoURL(item.photo);const blob=await load(item.photo);bytes+=blob.size;if(bytes>40*1024*1024)throw Error('Foto troppo pesanti per la condivisione: usa copia o scarica le singole foto.');const code=String(item.productId).replace(/[^\w-]/g,'');files.push(new File([blob],`${orderId.replace(/[^\w-]/g,'')}-${n+1}-${code}.png`,{type:'image/png'}));}
 return {text:group.text,files};
}
export function canShareOrder(data,nav=navigator){try{return typeof nav.share==='function'&&typeof nav.canShare==='function'&&nav.canShare(data);}catch{return false;}}
export function shareOrder(data,nav=navigator){if(!canShareOrder(data,nav))throw Error('Questo browser non supporta la condivisione delle foto. Usa Copia testo e Copia foto o Scarica foto.');return nav.share(data);}
export function copyPhoto(path,nav=navigator,Item=globalThis.ClipboardItem,load=photoPNG){if(!nav.clipboard?.write||!Item)throw Error('Copia foto non supportata: usa Scarica foto e allegala nella chat.');photoURL(path);const pending=load(path);pending.catch(()=>{});return nav.clipboard.write([new Item({'image/png':pending})]);}
