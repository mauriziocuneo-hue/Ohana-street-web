/* OHANA V3: solo sorgenti e raccolte diverse. Layout = catalogo-nuovo.html originale. */
(() => {
  "use strict";
  const get = id => document.getElementById(id);
  const brands = ["Nike", "Jordan", "Adidas", "New Balance"];
  const state = {brand:"",family:"",query:"",sort:"default"};
  const col = new Intl.Collator("it", {numeric:true,sensitivity:"base"});
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const fmt = n => new Intl.NumberFormat("it-IT").format(n);
  const dom = (tag,cls,text) => {
    const el = document.createElement(tag);
    if(cls) el.className = cls;
    if(text !== undefined) el.textContent = text;
    return el;
  };
  let catalog = [], publicProducts = [], limit = 45;
  let selectedPhotoUrls = [], selectedPhotoIndex = 0;
  let currentProduct = null, onlyFavorites = false, selectionStep = 0;
  const favoriteKey = "ohana-v3-favorites-v1";
  let favorites = new Set(), savedStorageAvailable = true;
  const sizeDrafts = new Map();
  const allowedSizes = ["unknown", ...Array.from({length:11},(_,i)=>String(36+i)), "other"];
  const contactNumber = "393520263951";
  const productById = id => publicProducts.find(p => p.id===id);
  function readFavorites() {
    try {
      const input=JSON.parse(localStorage.getItem(favoriteKey)||"[]");
      if(!Array.isArray(input))return new Set();
      return new Set(input.filter(id=>typeof id==="string"&&productById(id)).slice(0,20));
    }catch{return new Set();}
  }
  function saveFavorites() {
    try {localStorage.setItem(favoriteKey,JSON.stringify([...favorites]));}
    catch {savedStorageAvailable=false;}
  }
  function updateFavoritesUI() {
    get("savedCount").textContent=String(favorites.size);
    get("savedOnly").setAttribute("aria-pressed",String(onlyFavorites));
    get("openSelection").disabled=!favorites.size;
    get("openSelection").textContent=favorites.size?"Prepara richiesta ("+favorites.size+") →":"Prepara richiesta →";
    get("savedHint").textContent=savedStorageAvailable?
      "Salva con ♡ le scarpe che ti interessano. Le ritroverai in questo browser.":
      "Le tue scelte restano disponibili finché mantieni aperta questa pagina.";
    if(currentProduct) {
      const active=favorites.has(currentProduct.id);
      get("saveProduct").textContent=active?"♥ Scarpa salvata":"♡ Salva questa scarpa";
      get("saveProduct").setAttribute("aria-pressed",String(active));
    }
  }
  function toggleFavorite(id,remove=false){
    if(!productById(id))return;
    if(remove || favorites.has(id))favorites.delete(id);
    else if(favorites.size<20)favorites.add(id);
    else {get("savedStatus").textContent="Puoi salvare fino a 20 scarpe per richiesta.";return;}
    saveFavorites();updateFavoritesUI();render();
    get("savedStatus").textContent=favorites.has(id)?"Scarpa aggiunta alle tue scelte.":"Scarpa rimossa dalle tue scelte.";
    if(get("selectionDialog").open)renderSelection();
  }
  function sizeSelect(p){
    const wrapper=dom("label","","Taglia desiderata");
    const select=dom("select");
    select.dataset.id=p.id;
    const entries=[["","Scegli una taglia"],...Array.from({length:11},(_,i)=>[String(36+i),String(36+i)]),
      ["other","Altra taglia"],["unknown","Non so ancora"]];
    for(const [value,label] of entries) {
      const option=dom("option","",label);option.value=value;select.append(option);
    }
    select.value=sizeDrafts.get(p.id)?.size||"";
    select.addEventListener("change",()=>{
      const d=sizeDrafts.get(p.id)||{size:"",other:""};
      d.size=select.value;sizeDrafts.set(p.id,d);
      other.hidden=select.value!=="other";
    });
    const other=dom("input");other.type="text";other.placeholder="Es. 47 o 42,5";
    other.maxLength=12;other.inputMode="decimal";other.setAttribute("aria-label","Altra taglia desiderata");
    other.value=sizeDrafts.get(p.id)?.other||"";
    other.hidden=select.value!=="other";
    other.addEventListener("input",()=>{
      const d=sizeDrafts.get(p.id)||{size:"",other:""};
      d.other=other.value.slice(0,12);sizeDrafts.set(p.id,d);
    });
    wrapper.append(select,other);
    return wrapper;
  }
  function renderSelection() {
    const items=[...favorites].map(productById).filter(Boolean);
    get("selectionCount").textContent=String(items.length);
    get("selectionForm").hidden=!items.length;get("selectionEmpty").hidden=Boolean(items.length);
    get("selectionIntro").hidden=!items.length;
    get("selectionHeading").textContent=selectionStep?"Riepilogo richiesta":"Le tue scarpe";
    get("selectionEditor").hidden=selectionStep===1;
    get("selectionReview").hidden=selectionStep===0;
    get("selectionBack").hidden=get("selectionCopy").hidden=
      get("selectionWhatsapp").hidden=selectionStep===0;
    get("selectionNext").hidden=selectionStep===1;
    get("selectionError").hidden=true;
    if(selectionStep)return;
    const list=get("selectionItems");list.replaceChildren();
    for(const p of items) {
      const article=dom("article","selection-item");
      const cover=dom("button","selection-photo");cover.type="button";
      const photo=dom("img");photo.src=p.image;photo.alt=p.brand+" "+p.model;
      photo.loading="lazy";cover.append(photo);
      cover.addEventListener("click",()=>{
        get("selectionDialog").close();showProduct(p);
      });
      const info=dom("div","selection-item-info");
      info.append(dom("strong","",p.brand+" · "+p.model),dom("p","",p.verifiedProduct?p.color:"Colori su richiesta"),
        dom("small","",p.id));
      const remove=dom("button","selection-remove","Rimuovi");
      remove.type="button";remove.addEventListener("click",()=>toggleFavorite(p.id,true));
      info.append(remove);
      const sizes=dom("div","selection-size");sizes.append(sizeSelect(p));
      article.append(cover,info,sizes);list.append(article);
    }
    const size=get("sameSize");size.replaceChildren();
    for(const [value,label] of [["","Imposta la stessa taglia"],...Array.from({length:11},(_,i)=>[String(36+i),String(36+i)]),["unknown","Non so ancora"]]) {
      const option=dom("option","",label);option.value=value;size.append(option);
    }
  }
  function showSelection() {
    if(!favorites.size)return;
    selectionStep=0;
    if(get("productDialog").open)get("productDialog").close();
    renderSelection();get("selectionDialog").showModal();
  }
  function reviewSelection(event) {
    event.preventDefault();
    const items=[...favorites].map(productById).filter(Boolean);
    if(!items.length)return;
    const lines=["Ciao OHANA Street, vorrei informazioni sulle seguenti scarpe:"];
    for(const p of items) {
      const d=sizeDrafts.get(p.id)||{};
      const size=d.size==="unknown"?"da definire":
                 d.size==="other" ? (d.other||"").trim() : (d.size||"");
      if(!size || (d.size==="other"&&!/^[0-9A-Za-zÀ-ÿ., -]{1,12}$/.test(size))){
        get("selectionError").textContent="Scegli una taglia per ogni scarpa, oppure Non so ancora.";
        get("selectionError").hidden=false;
        return;
      }
      lines.push("- "+p.brand+" "+p.model+" | codice "+p.id+" | taglia "+size);
    }
    const note=get("selectionQuestion").value.trim().slice(0,650);
    if(note)lines.push("Note: "+note);
    lines.push("Potete confermare colori e disponibilità? Grazie.");
    const message=lines.join("\n");
    selectionStep=1;renderSelection();
    get("selectionSummary").value=message;
    const link="https://wa.me/"+contactNumber+"?text="+encodeURIComponent(message);
    get("selectionWhatsapp").href=message.length<=1700?link:"https://wa.me/"+contactNumber;
    get("selectionCopyHint").textContent=message.length>1700?
      "Il messaggio è lungo: copialo e incollalo nella chat WhatsApp.":
      "Controlla il testo. Su WhatsApp deciderai tu se inviarlo.";
  }


  const byId = id => catalog.find(item => item.id === id);
  const byBrand = brand => catalog.filter(item => !brand || item.brand === brand);

  function setSelection(brand, family = "") {
    state.brand = brands.includes(brand) ? brand : "";
    state.family = family;
    limit = 45;
    get("more").hidden = true;
    render();
  }

  function navigation() {
    const tree = get("categoryTree");
    const opened = new Set([...tree.querySelectorAll("details[open]")].map(item=>item.dataset.brandGroup));
    tree.replaceChildren();
    const all = dom("button", "", "Tutti i marchi");
    all.type = "button";
    all.setAttribute("aria-current",String(!state.brand));
    all.addEventListener("click",()=>setSelection(""));
    tree.append(all);
    for(const brand of brands) {
      const items = byBrand(brand);
      const group = dom("details");
      group.dataset.brandGroup = brand;
      group.open = brand === state.brand || opened.has(brand);
      group.append(dom("summary","",brand + " · " + items.length + " modelli"));
      const whole = dom("button","family-link","Tutti i modelli");
      whole.type = "button";
      whole.setAttribute("aria-current",String(brand===state.brand && !state.family));
      whole.addEventListener("click",()=>setSelection(brand));
      group.append(whole);
      for(const item of items) {
        const button = dom("button","family-link",item.model);
        button.type = "button";
        button.setAttribute("aria-current",String(state.brand===brand && state.family===item.id));
        button.append(dom("span","",fmt(item.reportedAlbumCount)));
        button.addEventListener("click",()=>setSelection(brand,item.id));
        group.append(button);
      }
      tree.append(group);
    }
  }

  function filtered() {
    const q = norm(state.query.trim());
    const rows = catalog.filter(item =>
      (!state.brand || item.brand===state.brand) &&
      (!state.family || item.id===state.family) &&
      (!q || norm(item.brand+" "+item.model).includes(q) || publicProducts.some(p=>p.brand===item.brand && p.family===item.model && norm(p.model+" "+p.color).includes(q))));
    if (state.sort==="family") rows.sort((a,b)=>col.compare(a.model,b.model));
    else if (state.sort==="brand") rows.sort((a,b)=>col.compare(a.brand,b.brand)||col.compare(a.model,b.model));
    return rows;
  }

  function trustedPhoto(url, id, n, revision=1) {
    if(typeof url!=="string" || typeof id!=="string" ||
       !Number.isInteger(revision) || revision<1 || revision>99)return false;
    const root="https://tqkmrejfbvzchfplgxzl.supabase.co";
    if(/^OH3P-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)){
      const uuid=id.slice(5);
      const suffix=revision>1?"-r"+revision:"";
      const version=revision>1?"&rev="+revision:"";
      return url===root+"/functions/v1/ohana-v3-photo?id="+uuid+"&n="+n+version ||
             url==="assets/v3/"+uuid+suffix+"-"+n+".webp";
    }
    const pid=id.replace(/^OH3-/,"");
    return /^OH3-[a-f0-9-]{36}$/.test(id) &&
      url===root+"/storage/v1/object/public/ohana-v3-products/"+pid+"/"+n+".jpg";
  }
  // Copertine validate visivamente: identificativi pubblici OHANA, mai URL fornitore.
  // Anteprime controllate: l'album seguente mostra solo soletta/interno, senza scarpa.
  // Rimane nel database riservato per revisione, ma non viene mostrato ai visitatori.
  const excludedPoorPreviews = new Set(["OH3P-2f8f27b2-bae6-4c7a-b949-8606860d338c"]);
  const preferredCategoryCovers = new Map([
    ["Nike|Dunk SB Low 85", "OH3P-62f122d0-a026-4f7d-99b4-afb938f9fa19"]
  ]);
  function getPreferredCover(item) {
    const id=preferredCategoryCovers.get(item.brand+"|"+item.model);
    return (id&&publicProducts.find(p=>p.id===id&&p.brand===item.brand&&p.family===item.model)) ||
      publicProducts.find(p=>p.brand===item.brand&&p.family===item.model);
  }
  function proxyPhoto(p,index,small=false) {
    if(!p||p.verifiedProduct!==false||!/^OH3P-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(p.id))return null;
    if(!Number.isInteger(index)||index<0||index>=p.images.length)return null;
    const rev=p.photoRevision??1;
    const base="https://tqkmrejfbvzchfplgxzl.supabase.co/functions/v1/ohana-v3-photo?id="+
      p.id.slice(5)+"&n="+(index+1)+(rev>1?"&rev="+rev:"");
    return base+(small?"&size=small":"");
  }
  function coverSources(p) {
    const urls=[];
    if(!p||!Array.isArray(p.images))return urls;
    p.images.forEach((url,index)=>{
      if(!trustedPhoto(url,p.id,index+1,p.photoRevision??1))return;
      const isLocal=url.startsWith("assets/v3/");
      urls.push(isLocal?url:url+"&size=small");
      if(isLocal){
        const fallback=proxyPhoto(p,index,true);
        if(fallback)urls.push(fallback);
      }
    });
    return urls;
  }
  function addCoverImage(container,p,description){
    const sources=coverSources(p);
    const image=dom("img");
    image.alt=description;image.loading="lazy";image.decoding="async";
    let next=0;
    const showUnavailable=()=>{
      image.remove();
      container.classList.add("v3-placeholder");
      container.append(dom("span","v3-mark","OHANA / V3"));
      container.append(dom("span","v3-art","FOTO\nNON DISPONIBILE"));
    };
    image.addEventListener("error",()=>{
      next++;
      if(next<sources.length)image.src=sources[next];
      else showUnavailable();
    });
    if(sources.length){container.append(image);image.src=sources[0];}
    else showUnavailable();
  }
  function showProduct(p) {
    currentProduct=p;
    updateFavoritesUI();
    get("dialogEyebrow").textContent=p.brand+" · SCARPE";
    get("productBrand").textContent=p.brand;
    get("productTitle").textContent=p.model;
    get("productColor").textContent=p.verifiedProduct?"Colore: "+p.color:"Colore e disponibilità su richiesta";
    get("productDescription").textContent="Per dettagli su colori, taglie e disponibilità, contattaci su WhatsApp.";
    const details=get("productDetails");details.replaceChildren();
    for(const [k,v] of [["Codice OHANA",p.id],["Raccolta",p.family],
      ["Taglie","36–46 · altre taglie su richiesta"]]){
      details.append(dom("dt","",k),dom("dd","",v));
    }
    selectedPhotoUrls=p.images.filter((url,i)=>trustedPhoto(url,p.id,i+1,p.photoRevision??1));
    selectedPhotoIndex=0;
    const img=get("mainPhoto");
    img.hidden=false;img.src=selectedPhotoUrls[0];img.alt=p.brand+" "+p.model+" · foto 1";
    img.onerror=()=>{
      const alternative=proxyPhoto(p,selectedPhotoIndex,false);
      if(alternative&&selectedPhotoUrls[selectedPhotoIndex]!==alternative){
        selectedPhotoUrls[selectedPhotoIndex]=alternative;
        img.src=alternative;
        return;
      }
      img.hidden=true;
      get("photoError").hidden=false;
      get("photoError").textContent="Fotografia temporaneamente non disponibile";
    };
    img.onload=()=>{img.hidden=false;get("photoError").hidden=true;};
    get("photoCounter").textContent="1 / "+selectedPhotoUrls.length;
    get("photoError").hidden=true;
    const thumbs=get("thumbnails");thumbs.replaceChildren();
    selectedPhotoUrls.forEach((url,i)=>{
      const button=dom("button");button.type="button";
      button.setAttribute("aria-label","Fotografia "+(i+1));
      button.setAttribute("aria-pressed",String(i===0));
      const preview=dom("img");preview.src=url;preview.alt="Vista "+(i+1);
      preview.loading="eager";
      preview.addEventListener("error",()=>{
        const alternative=proxyPhoto(p,i,false);
        if(alternative&&!preview.dataset.fallbackUsed){
          preview.dataset.fallbackUsed="1";
          preview.src=alternative;
        }else{
          preview.hidden=true;
          button.setAttribute("aria-label","Fotografia "+(i+1)+" non disponibile");
        }
      });
      button.append(preview);
      button.addEventListener("click",()=>{
        selectedPhotoIndex=i;img.src=selectedPhotoUrls[i];img.alt=p.brand+" "+p.model+" · foto "+(i+1);
        get("photoCounter").textContent=(i+1)+" / "+selectedPhotoUrls.length;
        [...thumbs.children].forEach((x,j)=>x.setAttribute("aria-pressed",String(i===j)));
      });
      thumbs.append(button);
    });
    get("album").replaceChildren();get("album").hidden=true;
    get("showAlbum").hidden=true;
    get("variantPicker").hidden=true;
    get("galleryStatus").hidden=true;
    get("saveProduct").hidden=false;
    get("shareProduct").hidden=false;
    get("shareFallback").hidden=true;
    get("shareStatus").textContent="";
    get("ohana-product-request").replaceChildren();
    const text="Ciao OHANA Street, vorrei informazioni su "+p.brand+" "+p.model+
      ", codice "+p.id+". Vorrei informazioni su colori, taglie e disponibilità.";
    get("whatsapp").href="https://wa.me/393520263951?text="+encodeURIComponent(text);
    get("whatsapp").textContent="Chiedi informazioni su WhatsApp ↗";
    if(!get("productDialog").open)get("productDialog").showModal();
  }
  function productCard(p) {
    const root=dom("article","card");
    const visual=dom("div","card-visual");
    const cover=dom("button","card-cover");cover.type="button";
    cover.setAttribute("aria-label","Apri "+p.brand+" "+p.model);
    addCoverImage(cover,p,p.brand+" "+p.model+" "+p.color);
    cover.append(dom("span","photo-count",p.images.length+" foto"));
    cover.addEventListener("click",()=>showProduct(p));visual.append(cover);
    const heart=dom("button","save-button",favorites.has(p.id)?"♥":"♡");
    heart.type="button";
    heart.setAttribute("aria-label",favorites.has(p.id)?"Rimuovi dalle scelte":"Salva questa scarpa");
    heart.setAttribute("aria-pressed",String(favorites.has(p.id)));
    heart.addEventListener("click",()=>toggleFavorite(p.id));
    visual.append(heart);
    const info=dom("div","card-info");
    info.append(dom("div","card-brand",p.brand+" · Sneakers"));
    info.append(dom("h3","display",p.model));
    info.append(dom("p","card-color",p.verifiedProduct?p.color:"Colori e taglie su richiesta"));
    info.append(dom("p","card-code","Foto disponibili · informazioni su WhatsApp"));
    const button=dom("button","card-open",p.verifiedProduct?"Esplora la scarpa ↗":"Guarda le foto ↗");button.type="button";
    button.addEventListener("click",()=>showProduct(p));info.append(button);
    root.append(visual,info);return root;
  }

  function showCollection(item) {
    get("dialogEyebrow").textContent = item.brand + " · SCARPE";
    get("productBrand").textContent = item.brand;
    get("productTitle").textContent = item.model;
    get("productColor").textContent = "Colori e taglie su richiesta";
    get("productDescription").textContent = "Esplora le fotografie disponibili oppure contattaci su WhatsApp per conoscere varianti, taglie e disponibilità.";
    const list = get("productDetails");
    list.replaceChildren();
    for(const [k,v] of [
      ["Raccolta","OHANA Street"],
      ["Fotografie",fmt(item.reportedAlbumCount)+" modelli fotografici"],
      ["Taglie","36–46 · altre taglie su richiesta"]
    ]) { list.append(dom("dt","",k),dom("dd","",v)); }
    get("galleryStatus").hidden = false;
    get("galleryStatus").textContent = "Puoi chiedere informazioni su colori, taglie e disponibilità.";
    get("mainPhoto").hidden = true;
    get("mainPhoto").removeAttribute("src");
    get("photoCounter").textContent = "";
    get("photoError").hidden = false;
    get("photoError").textContent = "Scegli un articolo per vedere le fotografie.";
    get("thumbnails").replaceChildren();
    get("album").replaceChildren();
    get("album").hidden = true;
    get("showAlbum").hidden = true;
    get("variantPicker").hidden = true;
    get("saveProduct").hidden = true;
    get("shareProduct").hidden = true;
    get("shareStatus").textContent = "";
    get("shareFallback").hidden = true;
    get("ohana-product-request").replaceChildren();
    const message = "Ciao OHANA Street, vorrei informazioni su " + item.brand + " " + item.model +
      " (catalogo V3). Potete verificare colori, fotografie e taglie disponibili?";
    const wa = get("whatsapp");
    wa.href = "https://wa.me/393520263951?text=" + encodeURIComponent(message);
    wa.textContent = "Chiedi informazioni su WhatsApp ↗";
    const dialog = get("productDialog");
    if(!dialog.open) dialog.showModal();
  }

  function card(item) {
    const root = dom("article","card");
    const representative=getPreferredCover(item);
    const visual = dom("div","card-visual v3-card-visual");
    const cover = dom("button","card-cover v3-placeholder");
    cover.type = "button";
    cover.setAttribute("aria-label","Esplora "+item.brand+" "+item.model);
    if(representative){
      cover.classList.remove("v3-placeholder");
      addCoverImage(cover,representative,item.brand+" "+item.model+" · fotografia dimostrativa");
    }else{
      cover.append(dom("span","v3-mark","OHANA STREET"));
      cover.append(dom("span","v3-art","SCOPRI\nIL MODELLO"));
    }
    const visiblePreviews=publicProducts.filter(p=>p.brand===item.brand&&p.family===item.model).length;
    cover.append(dom("span","photo-count",fmt(visiblePreviews)+" articoli"));
    cover.addEventListener("click",()=>setSelection(item.brand,item.id));
    visual.append(cover);
    const info = dom("div","card-info");
    info.append(dom("div","card-brand",item.brand+" · Sneakers"));
    info.append(dom("h3","display",item.model));
    info.append(dom("p","card-color","Colori e taglie su richiesta"));
    info.append(dom("p","card-code",fmt(visiblePreviews)+" articoli da esplorare"));
    const open = dom("button","card-open","Esplora il modello ↗");
    open.type = "button";
    open.addEventListener("click",()=>setSelection(item.brand,item.id));
    info.append(open);
    root.append(visual,info);
    return root;
  }

  function render() {
    navigation();
    const rows=filtered(),q=norm(state.query.trim());
    const cards=[];
    if(onlyFavorites) {
      const picks=[...favorites].map(productById).filter(Boolean).filter(p=>
        (!state.brand||p.brand===state.brand)&&
        (!state.family||catalog.some(c=>c.id===state.family&&c.brand===p.brand&&c.model===p.family))&&
        (!q||norm(p.brand+" "+p.model+" "+p.color).includes(q)));
      picks.forEach(p=>cards.push(productCard(p)));
    }
    const showingFamilies=!state.family&&!q;
    for(const item of (onlyFavorites?[]:rows)){
      if(showingFamilies){
        cards.push(card(item));continue;
      }
      const approved=publicProducts.filter(p=>
        p.brand===item.brand&&p.family===item.model&&
        (!q||norm(item.brand+" "+item.model).includes(q)||
          norm(p.model+" "+p.color).includes(q)));
      if(approved.length)approved.forEach(p=>cards.push(productCard(p)));
      else if(!q||norm(item.brand+" "+item.model).includes(q))cards.push(card(item));
    }
    const grid=get("grid");
    const fragment=document.createDocumentFragment();
    cards.slice(0,limit).forEach(el=>fragment.append(el));
    grid.replaceChildren(fragment);
    if(!cards.length)grid.append(dom("p","empty","Nessun modello trovato. Modifica la ricerca."));
    get("results").textContent=fmt(cards.length)+" risultati · "+fmt(publicProducts.length)+" articoli fotografici";
    updateFavoritesUI();
    const selected=byId(state.family);
    get("selectionTitle").textContent=onlyFavorites?"Le tue scarpe":(selected?selected.model:(state.brand||"Tutti i modelli"));
    get("breadcrumb").textContent=["Scarpe",state.brand,selected?.model].filter(Boolean).join(" › ");
    get("more").hidden=cards.length<=limit;
  }

  async function init() {
    get("menuBtn").addEventListener("click",()=>{
      const isHidden=get("mobileNav").classList.toggle("hide");
      get("menuBtn").setAttribute("aria-expanded",String(!isHidden));
    });
    get("mobileNav").addEventListener("click",e=>{
      if(e.target.closest("a")){
        get("mobileNav").classList.add("hide");
        get("menuBtn").setAttribute("aria-expanded","false");
      }
    });
    get("search").addEventListener("input",e=>{state.query=e.target.value.slice(0,100);render();});
    get("sort").addEventListener("change",e=>{state.sort=e.target.value;render();});
    get("reset").addEventListener("click",()=>{
      get("search").value="";
      get("sort").value="default";
      state.query="";state.sort="default";setSelection("");
    });
    get("categoryMenu").addEventListener("click",()=>{});
    get("closeDialog").addEventListener("click",()=>get("productDialog").close());
    get("mainPhoto").addEventListener("click",()=>{
      if(!selectedPhotoUrls.length||get("mainPhoto").hidden)return;
      const zoom=get("photoZoomDialog"),photo=get("photoZoomImage");
      photo.src=selectedPhotoUrls[selectedPhotoIndex];photo.alt=get("mainPhoto").alt;
      get("photoZoomCaption").textContent=photo.alt;
      if(!zoom.open)zoom.showModal();
    });
    get("mainPhoto").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();get("mainPhoto").click();}});
    get("closePhotoZoom").addEventListener("click",()=>get("photoZoomDialog").close());

    get("productDialog").addEventListener("click",e=>{
      if(e.target===get("productDialog"))get("productDialog").close();
    });
    get("more").addEventListener("click",()=>{limit+=45;render();});
    get("savedOnly").addEventListener("click",()=>{
      onlyFavorites=!onlyFavorites;limit=45;render();
    });
    get("openSelection").addEventListener("click",showSelection);
    get("saveProduct").addEventListener("click",()=>{
      if(currentProduct)toggleFavorite(currentProduct.id);
    });
    get("shareProduct").addEventListener("click",async()=>{
      if(!currentProduct)return;
      const url=new URL(location.href);
      url.searchParams.set("p",currentProduct.id);
      url.hash="";
      const value=url.href;
      try {
        if(navigator.share){
          await navigator.share({title:currentProduct.brand+" "+currentProduct.model,url:value});
          get("shareStatus").textContent="Scheda condivisa.";
        }else if(navigator.clipboard?.writeText){
          await navigator.clipboard.writeText(value);
          get("shareStatus").textContent="Collegamento alla scarpa copiato.";
        }else throw new Error("Clipboard unavailable");
      }catch{
        get("shareFallback").hidden=false;
        get("shareLink").value=value;
        get("shareStatus").textContent="Puoi copiare il collegamento qui sotto.";
      }
    });
    get("closeSelection").addEventListener("click",()=>get("selectionDialog").close());
    get("selectionBrowse").addEventListener("click",()=>get("selectionDialog").close());
    get("selectionForm").addEventListener("submit",reviewSelection);
    get("selectionBack").addEventListener("click",()=>{
      selectionStep=0;renderSelection();
    });
    get("selectionCopy").addEventListener("click",async()=>{
      try{
        await navigator.clipboard.writeText(get("selectionSummary").value);
        get("selectionStatus").textContent="Messaggio copiato.";
      }catch{
        get("selectionSummary").focus();get("selectionSummary").select();
        get("selectionStatus").textContent="Seleziona e copia il testo del messaggio.";
      }
    });
    get("sameSize").addEventListener("change",()=>{
      const value=get("sameSize").value;
      if(!value)return;
      for(const id of favorites){
        const d=sizeDrafts.get(id)||{size:"",other:""};
        d.size=value;sizeDrafts.set(id,d);
      }
      renderSelection();
    });

    // Nessun dato personale trasmesso finché il cliente non sceglie di aprire WhatsApp.
    get("savedOnly").disabled=false;
    get("openSelection").disabled=true;
    get("savedStatus").textContent="";
    const type=get("type");
    type.disabled=true;
    type.replaceChildren(dom("option","","Tutte le sneakers"));
    if(matchMedia("(max-width:780px)").matches)get("categoryMenu").open=false;
    try{
      const response=await fetch("data/catalogo-v3.json",{cache:"no-store"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const data=await response.json();
      if(data.schemaVersion!==3 || !Array.isArray(data.collections)||!Array.isArray(data.products))throw new Error("Schema V3 non valido");
      // Non usare URL dei fornitori o i prodotti della V2. Solo famiglie del file V3 isolato.
      catalog=data.collections.filter(item=>
        item&&typeof item.id==="string"&&typeof item.model==="string"&&
        brands.includes(item.brand)&&Number.isInteger(item.reportedAlbumCount)&&
        item.reportedAlbumCount>=0&&["da-catalogare","photo-preview","published"].includes(item.status));
      publicProducts=[...(data.products||[]),...(data.photoPreviews||[])].filter(p=>
        p&&!excludedPoorPreviews.has(p.id)&&
        (p.status==="published"&&p.verifiedProduct===true ||
         p.status==="preview"&&p.verifiedProduct===false)&&
        typeof p.id==="string"&&Array.isArray(p.images)&&p.images.length>=1&&p.images.length<=3 &&
        p.images.every((url,i)=>trustedPhoto(url,p.id,i+1,p.photoRevision??1)) &&
        catalog.some(c=>c.brand===p.brand&&c.model===p.family));
      get("trialTotal").textContent=fmt(publicProducts.length||catalog.length);
      favorites=readFavorites();
      saveFavorites();
      updateFavoritesUI();
      render();
      const sharedId=new URL(location.href).searchParams.get("p");
      const shared=sharedId?productById(sharedId):null;
      if(shared)showProduct(shared);
    }catch(error){
      get("results").textContent="Catalogo V3 momentaneamente non disponibile";
      get("grid").replaceChildren(dom("p","empty","Non riusciamo a caricare il catalogo. Riprova ad aggiornare la pagina."));
      console.error("OHANA V3: errore caricamento raccolte");
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
