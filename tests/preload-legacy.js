'use strict';
// Precarica la selezione storica per i test che convalidano il catalogo legacy.
// Il JSON su disco rimane quello integrale (375 legacy + 5213 V2).
const file=require.resolve('../catalogo-nuovo.json');
const json=require(file);
const all=json.products;
if(all.length!==5588 || all.filter(p=>p.legacy===false).length!==5213){
 throw Error('Checkpoint V2 inatteso: impossibile eseguire regressioni legacy');
}
require.cache[file].exports={...json,products:all.filter(p=>p.legacy)};
