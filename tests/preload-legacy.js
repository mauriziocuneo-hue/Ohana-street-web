'use strict';
const file=require.resolve('../catalogo-nuovo.json');
const data=require(file);
const ids=new Set(require('../catalogo.json').filter(p=>p.genere==='Scarpe'&&p.vetrina!==false).map(p=>p.id));
const old=data.products.filter(p=>ids.has(p.id));
if(old.length!==375 || data.products.length-old.length!==5213)throw Error('Catalogo storico o V2 incompleto');
require.cache[file].exports={...data,products:old};
