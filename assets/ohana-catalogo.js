(function(root){
  'use strict';
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const shopping=typeof module!=='undefined'&&module.exports?require('./ohana-scelte.js'):root.OhanaScelte;
  const colorTerms={nero:/\b(nero|nera|neri|nere|black)\b/,bianco:/\b(bianco|bianca|white)\b/,blu:/\b(blu|blue)\b/,azzurro:/\b(azzurro|azzurra|celeste)\b/,rosa:/\b(rosa|pink)\b/,viola:/\b(viola|purple)\b/,verde:/\b(verde|verdi|green)\b/,arancione:/\b(arancione|orange)\b/,giallo:/\b(giallo|gialla|yellow)\b/,grigio:/\b(grigio|grigia|grey|gray)\b/,argento:/\b(argento|silver)\b/,beige:/\b(beige|crema|cream)\b/};
  Object.assign(colorTerms,{rosso:/\b(rosso|rossa|rossi|rosse|red)\b/,marrone:/\b(marrone|marroni|brown)\b/,crema:/\b(crema|cream)\b/,oro:/\b(oro|gold)\b/,lilla:/\blilla\b/,fucsia:/\b(fucsia|fuchsia)\b/,bordeaux:/\bbordeaux\b/,corallo:/\bcorallo\b/,tortora:/\btortora\b/,sabbia:/\bsabbia\b/});
  const typeGroups={'@sport':['Running','Trail e outdoor'],'@tacchetti':['Scarpe con tacchetti','Calcio · FG','Calcetto · TF']};
  function filterProducts(products,state){
    const words=norm(state.query).split(/\s+/).filter(Boolean);
    const list=products.filter(p=>{
      if((state.brand&&p.brand!==state.brand)||(state.family&&p.family!==state.family)||(state.type&&p.type!==state.type&&!(typeGroups[state.type]||[]).includes(p.type)))return false;
      const text=norm([p.brand,p.family,p.name,p.color,p.code,p.type,...(p.tags||[])].join(' '));
      return words.every(w=>/^\d+$/.test(w)?new RegExp('(?:^|[^a-z0-9])'+w+'(?=$|[^0-9])').test(text):(text+' '+norm(p.id)).includes(w));
    });
    if(state.sort==='brand')list.sort((a,b)=>a.brand.localeCompare(b.brand,'it')||a.family.localeCompare(b.family,'it'));
    if(state.sort==='family')list.sort((a,b)=>a.family.localeCompare(b.family,'it'));
    return list;
  }
  function related(products,p,query=''){
    if(shopping.modelVariants(products,p).length<2)return [];
    const requested=Object.keys(colorTerms).filter(k=>colorTerms[k].test(norm(query)));
    return shopping.modelVariants(products,p).filter(x=>x.id!==p.id&&norm(x.color)!==norm(p.color)&&requested.every(k=>colorTerms[k].test(norm(x.color))));
  }
  function answer(products,p,query){
    if(!p)return {kind:'text',text:'Apri una scarpa per vedere foto e colori.',items:[]};
    const text=norm(query);
    if(/\b(colore|colori|colorazione|colorazioni|variante|varianti)\b/.test(text)||Object.values(colorTerms).some(r=>r.test(text))){
      const items=related(products,p,text);
      return {kind:'variants',items,text:items.length?'Queste sono le altre colorazioni fotografate dello stesso modello e tipo di suola. Tocca una variante per aprirla.':'Non ho altre colorazioni verificate con questa richiesta. Puoi chiederle su WhatsApp.'};
    }
    if(/\b(foto|immagini|fotografie|scatti|suola|dietro|dettagli|vista|viste)\b/.test(text))return {kind:'photos',items:p.photos,text:p.photos.length>1?'Ecco tutte le fotografie verificate di questa variante.':'Per questo articolo è disponibile una sola fotografia verificata. Puoi richiedere altri scatti su WhatsApp.'};
    if(/\b(taglia|taglie|numero|numeri|prezzo|prezzi|costo|costi|costa|costano|disponibilita|disponibile|disponibili|spedizione|spedizioni|consegna)\b/.test(text))return {kind:'request',items:[],text:/\b(taglia|taglie|numero|numeri)\b/.test(text)?'Taglie 36–46 e altre su richiesta. I gestori confermeranno disponibilità e dettagli su WhatsApp.':'Prezzi, disponibilità e spedizioni si confermano con i gestori su WhatsApp. Posso preparare la tua richiesta.'};
    return {kind:'text',items:[],text:'Posso mostrarti altre foto o altri colori. Prova “altre foto”, “altri colori” o “la cerco blu”.'};
  }
  const api={filterProducts,related,answer,...shopping};if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(!root||!root.document)return;
  const $=s=>document.querySelector(s),esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const freshState=()=>({brand:'',family:'',type:'',query:'',sort:'default',savedOnly:false});
  const storageKey='ohana-fav-v1';
  let products=[],state=freshState(),limit=24,current=null,returnFocus=null,selectionFocus=null,requestController=null,saved=new Set(),storageWorks=true,selectionStep=0;
  const drafts=Object.create(null),dialog=$('#productDialog'),selectionDialog=$('#selectionDialog');
  function readSaved(){try{return new Set(shopping.favoriteIds(root.localStorage.getItem(storageKey)||'[]',products));}catch{storageWorks=false;return saved;}}
  function writeSaved(){try{root.localStorage.setItem(storageKey,JSON.stringify([...saved]));}catch{storageWorks=false;}}
  function updateSavedUI(){
    $('#savedCount').textContent=saved.size;$('#savedOnly').setAttribute('aria-pressed',String(state.savedOnly));
    $('#openSelection').textContent=saved.size?`Prepara richiesta (${saved.size}) →`:'Prepara richiesta →';
    $('#savedHint').textContent=storageWorks?'Salva con ♡ per ritrovare le scarpe in questo browser.':'Le scelte restano disponibili finché questa pagina rimane aperta.';
    if(current){$('#saveProduct').textContent=saved.has(current.id)?'♥ Scarpa salvata':'♡ Salva questa scarpa';$('#saveProduct').setAttribute('aria-pressed',String(saved.has(current.id)));$('#saveProduct').dataset.save=current.id;}
  }
  function toggleSaved(id,remove=false){
    if(!products.some(p=>p.id===id))return;
    saved=readSaved();if(remove||saved.has(id))saved.delete(id);else saved.add(id);writeSaved();render();
    $('#savedStatus').textContent=saved.has(id)?'Scarpa salvata. La ritrovi in “Solo salvate” e nella tua richiesta.':'Scarpa rimossa dalle scelte.';
    if(selectionDialog.open)renderSelection();
  }
  function card(group){
    const p=group.product,variants=shopping.modelVariants(products,p),many=variants.length>1,title=many?p.family:(p.name||p.family);
    return `<article class="card"><div class="card-visual"><button type="button" class="card-cover" data-open="${esc(p.id)}" aria-label="${many?'Scegli il colore di':'Apri'} ${esc(p.brand+' '+title)}"><img src="${esc(p.image)}" loading="lazy" decoding="async" alt="${esc(p.brand+' '+title+' · '+p.color)}"><span class="photo-count">${many?variants.length+' varianti':p.photos.length+' foto'}</span></button><button type="button" class="save-button" data-save="${esc(p.id)}" aria-label="${saved.has(p.id)?'Rimuovi dalle scelte':'Salva'} ${esc(p.brand+' '+title+' · '+p.color)}" aria-pressed="${saved.has(p.id)}">${saved.has(p.id)?'♥':'♡'}</button></div><div class="card-info"><div class="card-brand">${esc(p.brand)} · ${esc(p.type)}</div><h3 class="display">${esc(title)}</h3><p class="card-color">${many?'In foto: ':''}${esc(p.color)}</p><p class="card-code">${p.code?'Modello '+esc(p.code)+'<br>':''}${esc(p.id)}</p><button type="button" class="card-open" data-open="${esc(p.id)}">${many?'Scegli il colore':'Esplora la scarpa'} <span aria-hidden="true">↗</span></button></div></article>`;
  }
  // Navigazione scalabile del Catalogo V2: solo dati e struttura, nessuna modifica al tema.
  function navigationIndex(items){
    const brands=new Map();
    for(const p of items){
      if(!brands.has(p.brand))brands.set(p.brand,new Map());
      const models=brands.get(p.brand);
      models.set(p.family,(models.get(p.family)||0)+1);
    }
    return [...brands].sort(([a],[b])=>a.localeCompare(b,'it')).map(([brand,models])=>({
      brand,count:[...models.values()].reduce((a,b)=>a+b,0),
      models:[...models].sort(([a],[b])=>a.localeCompare(b,'it'))
    }));
  }
  function tree(){
    const opened=new Set([...$('#categoryTree').querySelectorAll('details[open]')].map(d=>d.dataset.brandGroup));
    const groups=navigationIndex(products);
    $('#categoryTree').innerHTML=`<button type="button" data-brand="" data-family="" ${!state.brand?'aria-current="true"':''}>Tutti i marchi</button>`+groups.map(({brand,count,models})=>
      `<details data-brand-group="${esc(brand)}" ${state.brand===brand||opened.has(brand)?'open':''}><summary>${esc(brand)} · ${count} ${count===1?'scarpa':'scarpe'}</summary><button class="family-link" type="button" data-brand="${esc(brand)}" data-family="" ${state.brand===brand&&!state.family?'aria-current="true"':''}>Tutti i modelli</button>${models.map(([family,total])=>`<button class="family-link" type="button" data-brand="${esc(brand)}" data-family="${esc(family)}" ${state.brand===brand&&state.family===family?'aria-current="true"':''}>${esc(family)}<span>${total}</span></button>`).join('')}</details>`
    ).join('');
  }
  function render(){
    tree();const list=filterProducts(products,state).filter(p=>!state.savedOnly||saved.has(p.id)),groups=shopping.groupProducts(list);
    $('#grid').innerHTML=groups.length?groups.slice(0,limit).map(card).join(''):`<p class="empty">${state.savedOnly&&!saved.size?'Non hai ancora salvato una scarpa. Tocca ♡ sul colore che ti piace.':'Nessuna scarpa corrisponde ai filtri. Prova “Azzera filtri”.'}</p>`;
    $('#results').textContent=`${groups.length} ${groups.length===1?'scheda':'schede'} · ${list.length} ${list.length===1?'variante':'varianti'}`;
    $('#selectionTitle').textContent=state.savedOnly?'Le tue scarpe':state.family||state.brand||'Tutti i modelli';
    $('#breadcrumb').textContent=['Scarpe',state.savedOnly?'Salvate':'',state.brand,state.family].filter(Boolean).join(' › ');
    $('#more').hidden=groups.length<=limit;updateSavedUI();
  }
  function showPhoto(index){
    const src=current.photos[index];if(!src)return;
    $('#photoError').hidden=true;$('#mainPhoto').hidden=false;$('#mainPhoto').src=src;$('#mainPhoto').alt=`${current.brand} ${current.name||current.family} · ${current.color} · fotografia ${index+1}`;
    $('#photoCounter').textContent=`${index+1} / ${current.photos.length}`;
    $('#thumbnails').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.photo)===index)));
  }
  function openPhotoZoom(){
    const photo=$('#mainPhoto'),zoom=$('#photoZoomDialog');
    if(!current||photo.hidden||!photo.complete||!photo.naturalWidth||zoom.open)return;
    const enlarged=$('#photoZoomImage');
    enlarged.src=photo.currentSrc||photo.src;
    enlarged.alt=photo.alt;
    $('#photoZoomCaption').textContent=photo.alt;
    zoom.showModal();
    $('#closePhotoZoom').focus();
  }
  function photoButtons(photos){return photos.map((src,i)=>`<button type="button" data-photo="${i}" aria-label="Mostra fotografia ${i+1}" aria-pressed="${i===0?'true':'false'}"><img src="${esc(src)}" alt="Vista ${i+1}" loading="lazy"></button>`).join('');}
  function expandAlbum(){
    $('#album').hidden=false;$('#album').innerHTML=photoButtons(current.photos);$('#showAlbum').setAttribute('aria-expanded','true');$('#showAlbum').textContent='Nascondi album completo ↑';
  }
  function syncOverlay(){const open=dialog.open||selectionDialog.open;document.body.style.overflow=open?'hidden':'';document.body.classList.toggle('product-dialog-open',open);}
  let variantsExpanded=false;
  function variantLabel(v){
    // Non attribuire un nome colore quando il catalogo non lo certifica.
    const named=v.colorVerified===true && typeof v.color==='string' && v.color.trim()
      && !/^colorazion[ei] nelle fotografie$/i.test(v.color.trim());
    return named?v.color:v.id;
  }
  function variantPicker(p){
    const variants=shopping.modelVariants(products,p);
    const picker=$('#variantPicker');
    picker.hidden=variants.length<2;
    if(picker.hidden)return;
    if(variants.findIndex(v=>v.id===p.id)>=6)variantsExpanded=true;
    const labelCounts=new Map();
    for(const v of variants){
      const label=variantLabel(v);
      labelCounts.set(label,(labelCounts.get(label)||0)+1);
    }
    // Il menu a tendina rimane sempre disponibile per una selezione rapida.
    $('#colorVariant').innerHTML=variants.map(v=>{
      const label=variantLabel(v);
      return `<option value="${esc(v.id)}" ${v.id===p.id?'selected':''}>${esc(label+(labelCounts.get(label)>1?' · '+v.id:''))}</option>`;
    }).join('');
    // Quando la variante selezionata è oltre le prime sei, resta visibile.
    const shown=variantsExpanded?variants:variants.slice(0,6);
    $('#variantPhotos').innerHTML=shown.map(v=>{
      const label=variantLabel(v);
      return `<button type="button" data-variant="${esc(v.id)}" aria-label="Seleziona variante ${esc(label)}" aria-pressed="${v.id===p.id}"><img src="${esc(v.image)}" alt="Scarpa ${esc(v.brand+' '+v.family)} – ${esc(label)}" loading="lazy" decoding="async"><span>${esc(label)}</span>${saved.has(v.id)?'<span class="variant-saved">♥ Salvata</span>':''}</button>`;
    }).join('');
    const more=$('#showAllVariants');
    more.hidden=variants.length<=6;
    more.setAttribute('aria-expanded',String(variantsExpanded));
    more.textContent=variantsExpanded?'Mostra meno varianti ↑':`Mostra tutte le varianti (${variants.length}) ↓`;
  }
  function openProduct(id,keepVariantView=false){
    const p=products.find(p=>p.id===id);if(!p)return;
    if(!dialog.open)returnFocus=document.activeElement;
    const previousScroll=keepVariantView&&dialog.open?dialog.scrollTop:0;
    if(!keepVariantView)variantsExpanded=false;
    if(selectionDialog.open)selectionDialog.close();current=p;
    $('#dialogEyebrow').textContent=p.id;$('#productBrand').textContent=p.brand+' · '+p.type;$('#productTitle').textContent=p.name||p.family;$('#productColor').textContent=p.color;
    $('#productDescription').textContent=p.description;
    $('#productDetails').innerHTML=`<dt>Codice OHANA</dt><dd>${esc(p.id)}</dd>${p.code?`<dt>Riferimento modello</dt><dd>${esc(p.code)}</dd>`:''}`;
    $('#thumbnails').innerHTML=photoButtons(p.images);$('#thumbnails').hidden=p.images.length===1;$('#album').replaceChildren();$('#album').hidden=true;
    $('#galleryStatus').hidden=!p.galleryIncomplete;$('#galleryStatus').textContent=p.galleryIncomplete?`${p.photos.length===1?'Una fotografia disponibile':p.photos.length+' fotografie disponibili'}.`:'';
    $('#showAlbum').hidden=p.photos.length<=p.images.length;$('#showAlbum').setAttribute('aria-expanded','false');$('#showAlbum').textContent=`Guarda tutte le ${p.photos.length} fotografie ↓`;
    $('#shareStatus').textContent='';$('#shareFallback').hidden=true;showPhoto(0);variantPicker(p);updateSavedUI();
    const url=new URL(location.href);url.searchParams.set('articolo',p.id);history.replaceState({},'',url);
    const msg=`Ciao OHANA Street! Vorrei informazioni su ${p.brand} ${p.name||p.family}, ${p.color} (codice OHANA ${p.id}${p.code?', modello '+p.code:''}).\nTaglia desiderata: __\nScheda gestori: ${shopping.managerUrl(p,location.href)}`;
    $('#whatsapp').href='https://wa.me/393520263951?text='+encodeURIComponent(msg);
    requestController=root.OhanaChat?.mount($('#ohana-product-request'),p);$('#whatsapp').hidden=Boolean(requestController);root.OhanaChat?.close();
    if(!dialog.open)dialog.showModal();syncOverlay();dialog.scrollTop=keepVariantView?previousScroll:0;if(!keepVariantView)$('#closeDialog').focus();
  }
  function sizeOptions(selected='',mass=false){return '<option value="">'+(mass?'Scegli una taglia (facoltativo)':'Scegli la taglia')+'</option>'+Array.from({length:11},(_,i)=>String(i+36)).map(v=>`<option value="${v}" ${selected===v?'selected':''}>${v}</option>`).join('')+(mass?'':`<option value="other" ${selected==='other'?'selected':''}>Altra taglia</option>`)+`<option value="unknown" ${selected==='unknown'?'selected':''}>Non so ancora</option>`;}
  function selectedProducts(){return [...saved].map(id=>products.find(p=>p.id===id)).filter(Boolean);}
  function renderSelection(){
    const list=selectedProducts();$('#selectionCount').textContent=list.length;$('#selectionForm').hidden=!list.length;$('#selectionEmpty').hidden=Boolean(list.length);
    $('#selectionIntro').hidden=!list.length;$('#selectionHeading').textContent=selectionStep?'La tua richiesta':'Le tue scarpe';
    $('#selectionEditor').hidden=selectionStep===1;$('#selectionReview').hidden=selectionStep===0;
    $('#selectionBack').hidden=$('#selectionCopy').hidden=$('#selectionWhatsapp').hidden=selectionStep===0;$('#selectionNext').hidden=selectionStep===1;
    $('#selectionError').hidden=true;$('#selectionStatus').textContent='';
    if(selectionStep)return;
    $('#sameSize').innerHTML=sizeOptions('',true);
    $('#selectionItems').innerHTML=list.map(p=>{const d=drafts[p.id]||{size:'',otherSize:''};return `<article class="selection-item" data-selection-item="${esc(p.id)}"><button type="button" class="selection-photo" data-open="${esc(p.id)}" aria-label="Rivedi ${esc(p.brand+' '+(p.name||p.family)+' '+p.color)}"><img src="${esc(p.image)}" alt="${esc(p.color)}" loading="lazy"></button><div class="selection-item-info"><strong>${esc(p.brand+' · '+(p.name||p.family))}</strong><p>${esc(p.color)}</p><small>${esc(p.id)}${p.code?' · '+esc(p.code):''}</small><button class="selection-remove" type="button" data-remove="${esc(p.id)}" aria-label="Rimuovi ${esc(p.id)} dalle scelte">Rimuovi</button></div><div class="selection-size"><label for="size-${esc(p.id)}">Taglia desiderata</label><select id="size-${esc(p.id)}" data-size="${esc(p.id)}">${sizeOptions(d.size)}</select><label for="other-${esc(p.id)}" data-other-label="${esc(p.id)}" ${d.size==='other'?'':'hidden'}>Quale altra taglia?</label><input id="other-${esc(p.id)}" data-other="${esc(p.id)}" type="text" inputmode="decimal" maxlength="12" placeholder="Es. 47 o 42,5" value="${esc(d.otherSize)}" ${d.size==='other'?'':'hidden'}></div></article>`;}).join('');
  }
  function openSelection(){
    selectionFocus=document.activeElement;selectionStep=0;if(dialog.open)dialog.close();root.OhanaChat?.close();renderSelection();selectionDialog.showModal();syncOverlay();selectionDialog.scrollTop=0;$('#closeSelection').focus();
  }
  function reviewSelection(){
    const request=shopping.selectionRequest(products,[...saved],drafts,$('#selectionQuestion').value,location.href,root.OHANA_CONTACT_NUMBER);
    if(!request.entries.length)return;
    if(request.invalid.length){$('#selectionError').textContent='Scegli la taglia per ogni scarpa, oppure “Non so ancora”.';$('#selectionError').hidden=false;const id=request.invalid[0];const field=drafts[id]?.size==='other'?$('#other-'+id):$('#size-'+id);field.focus();return;}
    selectionStep=1;renderSelection();$('#selectionSummary').value=request.message;$('#selectionWhatsapp').href=request.url;
    $('#selectionCopyHint').textContent=request.copyRequired?'La lista è lunga: copia il riepilogo e incollalo nella chat WhatsApp.':'Controlla il testo. Si aprirà WhatsApp: sarai tu a premere Invia.';
    $('#selectionWhatsapp').textContent=request.copyRequired?'Apri chat WhatsApp ↗':'Apri WhatsApp ↗';selectionDialog.scrollTop=0;$('#selectionSummary').focus();
  }
  document.addEventListener('click',e=>{
    const save=e.target.closest('[data-save]');if(save){const id=save.dataset.save,inDialog=dialog.contains(save);toggleSaved(id);if(inDialog){variantPicker(current);$('#saveProduct').focus();}else $('#grid').querySelector(`[data-save="${id}"]`)?.focus();return;}
    const remove=e.target.closest('[data-remove]');if(remove){toggleSaved(remove.dataset.remove,true);$('#closeSelection').focus();return;}
    const variant=e.target.closest('[data-variant]');if(variant){openProduct(variant.dataset.variant,true);return;}
    const open=e.target.closest('[data-open]');if(open){openProduct(open.dataset.open);return;}
    const photo=e.target.closest('[data-photo]');if(photo&&current){showPhoto(Number(photo.dataset.photo));return;}
    const nav=e.target.closest('[data-brand]');if(nav){state.brand=nav.dataset.brand;state.family=nav.dataset.family||'';state.query='';$('#search').value='';state.type='';$('#type').value='';limit=24;render();if(matchMedia('(max-width:780px)').matches)$('#categoryMenu').open=false;}
  });
  $('#search').addEventListener('input',e=>{state.query=e.target.value;limit=24;render();});
  $('#type').addEventListener('change',e=>{state.type=e.target.value;limit=24;render();});
  $('#sort').addEventListener('change',e=>{state.sort=e.target.value;render();});
  $('#reset').addEventListener('click',()=>{state=freshState();$('#search').value='';$('#type').value='';$('#sort').value='default';limit=24;render();});
  $('#savedOnly').addEventListener('click',()=>{state.savedOnly=!state.savedOnly;limit=24;render();});
  $('#more').addEventListener('click',()=>{limit+=24;render();});
  $('#openSelection').addEventListener('click',openSelection);
  $('#colorVariant').addEventListener('change',e=>openProduct(e.target.value,true));
  $('#showAllVariants').addEventListener('click',()=>{variantsExpanded=!variantsExpanded;variantPicker(current);$('#showAllVariants').focus();});
  $('#closeDialog').addEventListener('click',()=>dialog.close());
  $('#closeSelection').addEventListener('click',()=>selectionDialog.close());
  for(const modal of [dialog,selectionDialog])modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
  dialog.addEventListener('close',()=>{syncOverlay();const url=new URL(location.href);url.searchParams.delete('articolo');history.replaceState({},'',url);if(!selectionDialog.open)(returnFocus?.isConnected?returnFocus:$('#openSelection')).focus();});
  selectionDialog.addEventListener('close',()=>{syncOverlay();const url=new URL(location.href);url.searchParams.delete('richiesta');history.replaceState({},'',url);if(!dialog.open)(selectionFocus?.isConnected?selectionFocus:$('#openSelection')).focus();});
  $('#showAlbum').addEventListener('click',()=>{if($('#album').hidden)expandAlbum();else{$('#album').hidden=true;$('#showAlbum').setAttribute('aria-expanded','false');$('#showAlbum').textContent=`Guarda tutte le ${current.photos.length} fotografie ↓`;}});
  $('#mainPhoto').addEventListener('click',openPhotoZoom);
  $('#mainPhoto').addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();openPhotoZoom();}
  });
  $('#closePhotoZoom').addEventListener('click',()=>$('#photoZoomDialog').close());
  $('#photoZoomDialog').addEventListener('close',()=>{
    $('#photoZoomImage').removeAttribute('src');
    if($('#productDialog').open)$('#mainPhoto').focus();
  });
  $('#photoZoomDialog').addEventListener('click',e=>{
    if(e.target===e.currentTarget)e.currentTarget.close();
  });
  $('#mainPhoto').addEventListener('error',()=>{$('#mainPhoto').hidden=true;$('#photoError').hidden=false;});
  $('#mainPhoto').addEventListener('load',()=>{$('#mainPhoto').hidden=false;$('#photoError').hidden=true;});
  $('#shareProduct').addEventListener('click',async()=>{
    if(!current)return;const data=shopping.shareData(current,location.href);$('#shareFallback').hidden=true;
    if(typeof navigator.share==='function'){try{await navigator.share(data);$('#shareStatus').textContent='Scheda condivisa.';return;}catch(error){if(error.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(data.url);$('#shareStatus').textContent='Collegamento copiato. Puoi inviarlo a chi vuoi.';}
    catch{$('#shareFallback').hidden=false;$('#shareLink').value=data.url;$('#shareLink').focus();$('#shareLink').select();$('#shareStatus').textContent='Collegamento selezionato: usa Copia per condividerlo.';}
  });
  $('#selectionForm').addEventListener('submit',e=>{e.preventDefault();reviewSelection();});
  $('#selectionBack').addEventListener('click',()=>{selectionStep=0;renderSelection();$('#sameSize').focus();});
  $('#selectionBrowse').addEventListener('click',()=>{selectionDialog.close();state=freshState();$('#search').value='';$('#type').value='';$('#sort').value='default';render();$('#catalogo').scrollIntoView({block:'start'});});
  $('#selectionItems').addEventListener('change',e=>{const id=e.target.dataset.size;if(!id)return;drafts[id]??={size:'',otherSize:''};drafts[id].size=e.target.value;const other=$('#other-'+id);other.hidden=e.target.value!=='other';$('#selectionItems').querySelector(`[data-other-label="${id}"]`).hidden=other.hidden;$('#selectionError').hidden=true;if(!other.hidden)other.focus();});
  $('#selectionItems').addEventListener('input',e=>{const id=e.target.dataset.other;if(id){drafts[id]??={size:'other',otherSize:''};drafts[id].otherSize=e.target.value;$('#selectionError').hidden=true;}});
  $('#sameSize').addEventListener('change',e=>{if(!e.target.value)return;for(const id of saved)drafts[id]={size:e.target.value,otherSize:''};renderSelection();$('#selectionStatus').textContent='Taglia applicata a tutte le scarpe salvate.';});
  $('#selectionCopy').addEventListener('click',async()=>{const summary=$('#selectionSummary');try{await navigator.clipboard.writeText(summary.value);$('#selectionStatus').textContent='Richiesta copiata. Puoi incollarla su WhatsApp.';}catch{summary.focus();summary.select();$('#selectionStatus').textContent='Testo selezionato: usa Copia per copiarlo.';}});
  root.addEventListener('storage',e=>{if(e.key===storageKey&&products.length){saved=readSaved();render();if(current&&dialog.open)variantPicker(current);if(selectionDialog.open){selectionStep=0;renderSelection();}}});
  async function load(){try{
    const r=await fetch('catalogo-nuovo.json',{cache:'no-store'});if(!r.ok)throw Error('catalogo');const data=await r.json();if(data.version!==1||!Array.isArray(data.products))throw Error('formato');products=data.products;$('#trialTotal').textContent=products.length;saved=readSaved();
    $('#type').innerHTML='<option value="">Tutte le tipologie</option><option value="@sport">Running e outdoor</option><option value="@tacchetti">Tutti i tacchetti</option>'+[...new Set(products.map(p=>p.type))].sort().map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
    const params=new URLSearchParams(location.search);state.savedOnly=params.get('salvati')==='1';if(matchMedia('(max-width:780px)').matches)$('#categoryMenu').open=false;render();const id=params.get('articolo');if(id)openProduct(id);else if(params.get('richiesta')==='1')openSelection();
  }catch(e){$('#results').textContent='Catalogo temporaneamente non disponibile';$('#grid').innerHTML='<p class="empty">Non riesco a caricare le scarpe. Ricarica la pagina oppure <a href="index.html">torna alla vetrina</a>.</p>';console.error(e);}}
  $('#menuBtn').addEventListener('click',()=>{const closed=$('#mobileNav').classList.toggle('hide');$('#menuBtn').setAttribute('aria-expanded',String(!closed));});
  $('#mobileNav').addEventListener('click',e=>{if(e.target.closest('a')){$('#mobileNav').classList.add('hide');$('#menuBtn').setAttribute('aria-expanded','false');}});
  load();
})(typeof window==='undefined'?null:window);
