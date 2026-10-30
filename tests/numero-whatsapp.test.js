'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const phone='393520263951';
const obsolete='393473099705';
const page=read('catalogo-nuovo.html');
const catalog=read('assets/ohana-catalogo.js');
const selection=read('assets/ohana-scelte.js');
const chat=read('assets/ohana-chat.js');

for(const [name,source] of [
  ['catalogo-nuovo.html',page],
  ['assets/ohana-catalogo.js',catalog],
  ['assets/ohana-scelte.js',selection],
  ['assets/ohana-chat.js',chat]
]){
 assert(!source.includes(obsolete),name+' contiene il numero WhatsApp precedente');
}
assert(page.includes('window.OHANA_CONTACT_NUMBER="'+phone+'"'));
assert(page.includes('https://wa.me/'+phone));
assert(catalog.includes('https://wa.me/'+phone+'?text='));
assert(selection.includes("phone='"+phone+"'"));
assert(chat.includes('root.OHANA_CONTACT_NUMBER'),'La chat deve continuare a usare il numero configurato dalla pagina');
assert(page.includes('assets/ohana-catalogo.js?v=20261030-contact1'));
assert(page.includes('assets/ohana-scelte.js?v=20261030-contact1'));
console.log('PASS: tutti i percorsi di contatto WhatsApp puntano a +39 352 026 3951');
