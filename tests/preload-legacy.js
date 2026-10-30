'use strict';
const file=require.resolve('../catalogo-nuovo.json');
const data=require(file);
if(data.products.length!==5588||!data.products.slice(375).every(p=>p.legacy===false)){
 throw Error('Checkpoint V2 non valido');
}
require.cache[file].exports={...data,products:data.products.slice(0,375)};
