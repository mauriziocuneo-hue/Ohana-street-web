(function(root){
  'use strict';
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const colorTerms={nero:/\b(nero|nera|neri|nere|black)\b/,bianco:/\b(bianco|bianca|white)\b/,blu:/\b(blu|blue)\b/,azzurro:/\b(azzurro|azzurra|celeste)\b/,rosa:/\b(rosa|pink)\b/,viola:/\b(viola|purple)\b/,verde:/\b(verde|verdi|green)\b/,arancione:/\b(arancione|orange)\b/,giallo:/\b(giallo|gialla|yellow)\b/,grigio:/\b(grigio|grigia|grey|gray)\b/,argento:/\b(argento|silver)\b/,beige:/\b(beige|crema|cream)\b/};
  function filterProducts(products,state){
    const words=norm(state.query).split(/\s+/).filter(Boolean);
    const list=products.filter(p=>(!state.brand||p.brand===state.brand)&&(!state.family||p.family===state.family)&&(!state.type||p.type===state.type)&&words.every(w=>norm([p.id,p.brand,p.family,p.color,p.code,p.type].join(' ')).includes(w)));
    if(state.sort==='brand')list.sort((a,b)=>a.brand.localeCompare(b.brand,'it')||a.family.localeCompare(b.family,'it'));
    if(state.sort==='family')list.sort((a,b)=>a.family.localeCompare(b.family,'it'));
    return list;
  }
  function related(products,p,query=''){
    const requested=Object.keys(colorTerms).filter(k=>colorTerms[k].test(norm(query)));
    return products.filter(x=>x.id!==p.id&&x.brand===p.brand&&x.family===p.family&&x.type===p.type&&norm(x.color)!==norm(p.color)&&requested.every(k=>colorTerms[k].test(norm(x.color))));
  }
  function answer(products,p,query){
    if(!p)return {kind:'text',text:'Apri una scarpa per vedere foto e colori.',items:[]};
    const text=norm(query);
    if(/\b(colore|colori|colorazione|colorazioni|variante|varianti)\b/.test(text)||Object.values(colorTerms).some(r=>r.test(text))){
      const items=related(products,p,text);
      return {kind:'variants',items,text:items.length?'Queste sono le altre colorazioni fotografate dello stesso modello e tipo di suola. Tocca una variante per aprirla.':'Non ho altre colorazioni verificate con questa richiesta. Puoi chiederle su WhatsApp.'};
    }
    if(/\b(foto|immagini|fotografie|scatti|suola|dietro|dettagli|vista|viste)\b/.test(text))return {kind:'photos',items:p.photos,text:'Ecco tutte le fotografie verificate di questa variante.'};
    if(/\b(taglia|taglie|numero|numeri)\b/.test(text))return {kind:'text',items:[],text:'Taglie 36–46 e altre su richiesta. Conferma la misura desiderata con OHANA su WhatsApp.'};
    return {kind:'text',items:[],text:'Posso mostrarti altre foto o altri colori. Prova “altre foto”, “altri colori” o “la cerco blu”.'};
  }
  const api={filterProducts,related,answer};if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(!root||!root.document)return;
  const $=s=>document.querySelector(s),esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let products=[],state={brand:'',family:'',type:'',query:'',sort:'default'},limit=24,current=null,returnFocus=null;
  const dialog=$('#productDialog');
  function card(p){return `<article class="card"><button type="button" class="card-cover" data-open="${esc(p.id)}" aria-label="Apri ${esc(p.brand+' '+p.family+' '+p.color)}"><img src="${esc(p.image)}" loading="lazy" decoding="async" alt="${esc(p.brand+' '+p.family+' · '+p.color)}"><span class="photo-count">${p.photos.length} foto</span></button><div class="card-info"><div class="card-brand">${esc(p.brand)} · ${esc(p.type)}</div><h3 class="display">${esc(p.family)}</h3><p class="card-color">${esc(p.color)}</p><p class="card-code">${p.code?'Modello '+esc(p.code)+'<br>':''}${esc(p.id)}</p><button type="button" class="card-open" data-open="${esc(p.id)}">Esplora la scarpa <span aria-hidden="true">↗</span></button></div></article>`;}
  function tree(){
    const brands=[...new Set(products.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'it'));
    $('#categoryTree').innerHTML=`<button type="button" data-brand="" data-family="" ${!state.brand?'aria-current="true"':''}>Tutte le scarpe</button>`+brands.map(b=>{
      const list=products.filter(p=>p.brand===b),families=[...new Set(list.map(p=>p.family))].sort((a,b)=>a.localeCompare(b,'it'));
      return `<details ${!state.brand||state.brand===b?'open':''}><summary>${esc(b)} · ${list.length}</summary><button class="family-link" type="button" data-brand="${esc(b)}" data-family="" ${state.brand===b&&!state.family?'aria-current="true"':''}>Tutti i modelli</button>${families.map(f=>`<button class="family-link" type="button" data-brand="${esc(b)}" data-family="${esc(f)}" ${state.brand===b&&state.family===f?'aria-current="true"':''}>${esc(f)}<span>${list.filter(p=>p.family===f).length}</span></button>`).join('')}</details>`;
    }).join('');
  }
  function render(){
    tree();const list=filterProducts(products,state);
    $('#grid').innerHTML=list.length?list.slice(0,limit).map(card).join(''):'<p class="empty">Nessuna scarpa corrisponde ai filtri. Prova “Azzera filtri”.</p>';
    $('#results').textContent=`${list.length} ${list.length===1?'articolo':'articoli'}`;
    $('#selectionTitle').textContent=state.family||state.brand||'Tutte le scarpe';
    $('#breadcrumb').textContent=['Scarpe',state.brand,state.family].filter(Boolean).join(' › ');
    $('#more').hidden=list.length<=limit;
  }
  function showPhoto(index){
    const src=current.photos[index];if(!src)return;
    $('#photoError').hidden=true;$('#mainPhoto').hidden=false;$('#mainPhoto').src=src;$('#mainPhoto').alt=`${current.brand} ${current.family} · ${current.color} · fotografia ${index+1}`;
    $('#photoCounter').textContent=`${index+1} / ${current.photos.length}`;
    $('#thumbnails').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.photo)===index)));
  }
  function photoButtons(photos){return photos.map((src,i)=>`<button type="button" data-photo="${i}" aria-label="Mostra fotografia ${i+1}" aria-pressed="${i===0?'true':'false'}"><img src="${esc(src)}" alt="Vista ${i+1}" loading="lazy"></button>`).join('');}
  function expandAlbum(){
    $('#album').hidden=false;$('#album').innerHTML=photoButtons(current.photos);$('#showAlbum').setAttribute('aria-expanded','true');$('#showAlbum').textContent='Nascondi album completo ↑';
  }
  function openProduct(id){
    const p=products.find(p=>p.id===id);if(!p)return;
    if(!dialog.open)returnFocus=document.activeElement;current=p;
    $('#dialogEyebrow').textContent=p.id;$('#productBrand').textContent=p.brand+' · '+p.type;$('#productTitle').textContent=p.family;$('#productColor').textContent=p.color;
    $('#productDescription').textContent=p.description;
    $('#productDetails').innerHTML=`<dt>Codice OHANA</dt><dd>${esc(p.id)}</dd>${p.code?`<dt>Riferimento modello</dt><dd>${esc(p.code)}</dd>`:''}`;
    $('#thumbnails').innerHTML=photoButtons(p.photos.slice(0,3));$('#album').replaceChildren();$('#album').hidden=true;
    $('#showAlbum').hidden=p.photos.length<=3;$('#showAlbum').setAttribute('aria-expanded','false');$('#showAlbum').textContent=`Guarda tutte le ${p.photos.length} fotografie ↓`;
    $('#botResponse').replaceChildren();$('#botQuery').value='';showPhoto(0);
    const url=new URL(location.href);url.searchParams.set('articolo',p.id);history.replaceState({},'',url);
    const msg=`Ciao OHANA Street! Vorrei informazioni su ${p.brand} ${p.family}, ${p.color} (codice OHANA ${p.id}${p.code?', modello '+p.code:''}).\nTaglia desiderata: __\nScheda: ${url.href}`;
    $('#whatsapp').href='https://wa.me/393473099705?text='+encodeURIComponent(msg);
    if(!dialog.open){dialog.showModal();document.body.style.overflow='hidden';}dialog.scrollTop=0;$('#closeDialog').focus();
  }
  function ask(query){
    const a=answer(products,current,query),host=$('#botResponse');host.replaceChildren();const p=document.createElement('p');p.textContent=a.text;host.append(p);
    if(a.kind==='photos'){expandAlbum();const b=document.createElement('button');b.type='button';b.textContent='Vai alle fotografie ↑';b.addEventListener('click',()=>$('.gallery').scrollIntoView({block:'start'}));host.append(b);}
    if(a.kind==='variants'&&a.items.length){const grid=document.createElement('div');grid.className='variants';grid.innerHTML=a.items.map(p=>`<button type="button" data-open="${esc(p.id)}" aria-label="Apri variante ${esc(p.color)}"><img src="${esc(p.image)}" alt="${esc(p.color)}" loading="lazy">${esc(p.color)}</button>`).join('');host.append(grid);}
  }
  document.addEventListener('click',e=>{
    const open=e.target.closest('[data-open]');if(open){openProduct(open.dataset.open);return;}
    const photo=e.target.closest('[data-photo]');if(photo&&current){showPhoto(Number(photo.dataset.photo));return;}
    const nav=e.target.closest('[data-brand]');if(nav){state.brand=nav.dataset.brand;state.family=nav.dataset.family||'';state.query='';$('#search').value='';state.type='';$('#type').value='';limit=24;render();if(matchMedia('(max-width:760px)').matches)$('#categoryMenu').open=false;}
  });
  $('#search').addEventListener('input',e=>{state.query=e.target.value;limit=24;render();});
  $('#type').addEventListener('change',e=>{state.type=e.target.value;limit=24;render();});
  $('#sort').addEventListener('change',e=>{state.sort=e.target.value;render();});
  $('#reset').addEventListener('click',()=>{state={brand:'',family:'',type:'',query:'',sort:'default'};$('#search').value='';$('#type').value='';$('#sort').value='default';limit=24;render();});
  $('#more').addEventListener('click',()=>{limit+=24;render();});
  $('#closeDialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{document.body.style.overflow='';const url=new URL(location.href);url.searchParams.delete('articolo');history.replaceState({},'',url);if(returnFocus?.isConnected)returnFocus.focus();});
  $('#showAlbum').addEventListener('click',()=>{if($('#album').hidden)expandAlbum();else{$('#album').hidden=true;$('#showAlbum').setAttribute('aria-expanded','false');$('#showAlbum').textContent=`Guarda tutte le ${current.photos.length} fotografie ↓`;}});
  $('#botPhotos').addEventListener('click',()=>ask('altre foto'));$('#botColors').addEventListener('click',()=>ask('altri colori'));
  $('#botForm').addEventListener('submit',e=>{e.preventDefault();ask($('#botQuery').value);});
  $('#mainPhoto').addEventListener('error',()=>{$('#mainPhoto').hidden=true;$('#photoError').hidden=false;});
  $('#mainPhoto').addEventListener('load',()=>{$('#mainPhoto').hidden=false;$('#photoError').hidden=true;});
  async function load(){try{
    const r=await fetch('catalogo-nuovo.json',{cache:'no-cache'});if(!r.ok)throw Error('catalogo');const data=await r.json();if(data.version!==1||!Array.isArray(data.products))throw Error('formato');products=data.products;$('#trialTotal').textContent=products.length;
    $('#type').innerHTML='<option value="">Tutte le tipologie</option>'+[...new Set(products.map(p=>p.type))].sort().map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
    if(matchMedia('(max-width:760px)').matches)$('#categoryMenu').open=false;render();const id=new URLSearchParams(location.search).get('articolo');if(id)openProduct(id);
  }catch(e){$('#results').textContent='Catalogo temporaneamente non disponibile';$('#grid').innerHTML='<p class="empty">Non riesco a caricare le scarpe. Ricarica la pagina oppure <a href="index.html">torna alla vetrina</a>.</p>';console.error(e);}}
  $('#menuBtn').addEventListener('click',()=>{const closed=$('#mobileNav').classList.toggle('hide');$('#menuBtn').setAttribute('aria-expanded',String(!closed));});
  $('#mobileNav').addEventListener('click',e=>{if(e.target.closest('a')){$('#mobileNav').classList.add('hide');$('#menuBtn').setAttribute('aria-expanded','false');}});
  load();
})(typeof window==='undefined'?null:window);
