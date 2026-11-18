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

  function trustedPhoto(url, id, n) {
    if(typeof url!=="string" || typeof id!=="string")return false;
    const root="https://tqkmrejfbvzchfplgxzl.supabase.co";
    if(/^OH3P-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)){
      const uuid=id.slice(5);
      return url===root+"/functions/v1/ohana-v3-photo?id="+uuid+"&n="+n;
    }
    const pid=id.replace(/^OH3-/,"");
    return /^OH3-[a-f0-9-]{36}$/.test(id) &&
      url===root+"/storage/v1/object/public/ohana-v3-products/"+pid+"/"+n+".jpg";
  }
  function showProduct(p) {
    get("dialogEyebrow").textContent=p.brand+
      (p.verifiedProduct?" · V3 / ARTICOLO VERIFICATO":" · V3 / ANTEPRIMA FOTOGRAFICA");
    get("productBrand").textContent=p.brand;
    get("productTitle").textContent=p.model;
    get("productColor").textContent="Colore: "+p.color;
    get("productDescription").textContent=p.description;
    const details=get("productDetails");details.replaceChildren();
    for(const [k,v] of [["Codice OHANA",p.id],["Raccolta",p.family],
      ["Taglie","36–46 · altre taglie su richiesta"]]){
      details.append(dom("dt","",k),dom("dd","",v));
    }
    selectedPhotoUrls=p.images.filter((url,i)=>trustedPhoto(url,p.id,i+1));
    selectedPhotoIndex=0;
    const img=get("mainPhoto");
    img.hidden=false;img.src=selectedPhotoUrls[0];img.alt=p.brand+" "+p.model+" · foto 1";
    img.onerror=()=>{img.hidden=true;get("photoError").hidden=false;get("photoError").textContent="Fotografia temporaneamente non disponibile";};
    img.onload=()=>{img.hidden=false;get("photoError").hidden=true;};
    get("photoCounter").textContent="1 / "+selectedPhotoUrls.length;
    get("photoError").hidden=true;
    const thumbs=get("thumbnails");thumbs.replaceChildren();
    selectedPhotoUrls.forEach((url,i)=>{
      const button=dom("button");button.type="button";
      button.setAttribute("aria-label","Fotografia "+(i+1));
      button.setAttribute("aria-pressed",String(i===0));
      const preview=dom("img");preview.src=url;preview.alt="Vista "+(i+1);
      preview.loading="eager";button.append(preview);
      button.addEventListener("click",()=>{
        selectedPhotoIndex=i;img.src=url;img.alt=p.brand+" "+p.model+" · foto "+(i+1);
        get("photoCounter").textContent=(i+1)+" / "+selectedPhotoUrls.length;
        [...thumbs.children].forEach((x,j)=>x.setAttribute("aria-pressed",String(i===j)));
      });
      thumbs.append(button);
    });
    get("album").replaceChildren();get("album").hidden=true;
    get("showAlbum").hidden=true;
    get("variantPicker").hidden=true;
    get("galleryStatus").hidden=Boolean(p.verifiedProduct);
    if(!p.verifiedProduct)get("galleryStatus").textContent="Anteprima: modello e colorazione da verificare tramite WhatsApp.";
    get("saveProduct").hidden=true;
    get("shareProduct").hidden=true;
    get("shareFallback").hidden=true;
    get("ohana-product-request").replaceChildren();
    const text="Ciao OHANA Street, vorrei informazioni su "+p.brand+" "+p.model+
      ", "+p.color+", codice "+p.id+". Quali taglie sono disponibili?";
    get("whatsapp").href="https://wa.me/393520263951?text="+encodeURIComponent(text);
    get("whatsapp").textContent="Chiedi informazioni su WhatsApp ↗";
    if(!get("productDialog").open)get("productDialog").showModal();
  }
  function productCard(p) {
    const root=dom("article","card");
    const visual=dom("div","card-visual");
    const cover=dom("button","card-cover");cover.type="button";
    cover.setAttribute("aria-label","Apri "+p.brand+" "+p.model);
    const image=dom("img");image.src=p.image;
    image.alt=p.brand+" "+p.model+" "+p.color;
    image.loading="lazy";image.decoding="async";
    cover.append(image,dom("span","photo-count","3 foto"));
    cover.addEventListener("click",()=>showProduct(p));visual.append(cover);
    const info=dom("div","card-info");
    info.append(dom("div","card-brand",p.brand+" · Sneakers"));
    info.append(dom("h3","display",p.model));
    info.append(dom("p","card-color",p.color));
    info.append(dom("p","card-code",p.verifiedProduct?p.id:"Anteprima fotografica · identificazione da confermare"));
    const button=dom("button","card-open",p.verifiedProduct?"Esplora la scarpa ↗":"Guarda le foto ↗");button.type="button";
    button.addEventListener("click",()=>showProduct(p));info.append(button);
    root.append(visual,info);return root;
  }

  function showCollection(item) {
    get("dialogEyebrow").textContent = item.brand + " · MODELLO V3";
    get("productBrand").textContent = item.brand;
    get("productTitle").textContent = item.model;
    get("productColor").textContent = "Colorazioni: da verificare nelle fotografie";
    get("productDescription").textContent = "Questa famiglia è stata identificata nell'elenco di partenza della V3. " +
      "Le fotografie dei singoli prodotti saranno pubblicate solo dopo la verifica del modello e della colorazione.";
    const list = get("productDetails");
    list.replaceChildren();
    for(const [k,v] of [
      ["Raccolta","OHANA Street V3"],
      ["Album indicati",fmt(item.reportedAlbumCount)+" (non ancora verificati singolarmente)"],
      ["Taglie","36–46 · altre taglie su richiesta"]
    ]) { list.append(dom("dt","",k),dom("dd","",v)); }
    get("galleryStatus").hidden = false;
    get("galleryStatus").textContent = "Fotografie in revisione · nessun articolo verificato ancora pubblicato";
    get("mainPhoto").hidden = true;
    get("mainPhoto").removeAttribute("src");
    get("photoCounter").textContent = "";
    get("photoError").hidden = false;
    get("photoError").textContent = "Fotografie in revisione";
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
    const representative=publicProducts.find(p=>p.brand===item.brand&&p.family===item.model);
    const visual = dom("div","card-visual v3-card-visual");
    const cover = dom("button","card-cover v3-placeholder");
    cover.type = "button";
    cover.setAttribute("aria-label","Esplora "+item.brand+" "+item.model);
    if(representative){
      cover.classList.remove("v3-placeholder");
      const photo=dom("img");photo.src=representative.image;
      photo.alt=item.brand+" "+item.model+" · fotografia dimostrativa";
      photo.loading="lazy";photo.decoding="async";cover.append(photo);
    }else{
      cover.append(dom("span","v3-mark","OHANA / V3"));
      cover.append(dom("span","v3-art","FOTO\nIN REVISIONE"));
    }
    cover.append(dom("span","photo-count",fmt(item.previewProducts||0)+" anteprime"));
    cover.addEventListener("click",()=>setSelection(item.brand,item.id));
    visual.append(cover);
    const info = dom("div","card-info");
    info.append(dom("div","card-brand",item.brand+" · Sneakers"));
    info.append(dom("h3","display",item.model));
    info.append(dom("p","card-color",representative?"Foto inserite · colorazioni da verificare":"Foto e colorazioni in acquisizione"));
    info.append(dom("p","card-code","Raccolta V3 · "+fmt(item.reportedAlbumCount)+" album segnalati"));
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
    const showingFamilies=!state.family&&!q;
    for(const item of rows){
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
    get("results").textContent=fmt(cards.length)+" raccolte/schede · "+
      fmt(publicProducts.filter(p=>!p.verifiedProduct).length)+" anteprime fotografiche";
    const selected=byId(state.family);
    get("selectionTitle").textContent=selected?selected.model:(state.brand||"Tutti i modelli");
    get("breadcrumb").textContent=["Scarpe V3",state.brand,selected?.model].filter(Boolean).join(" › ");
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
    // Nessun articolo validato: preferiti e richiesta multipla non disponibili nell'anteprima.
    get("savedOnly").disabled=true;
    get("openSelection").disabled=true;
    get("savedOnly").textContent="♡ Preferiti in preparazione";
    get("openSelection").textContent="Richiesta multipla in preparazione";
    get("savedHint").textContent="I preferiti saranno disponibili quando le fotografie saranno verificate.";
    get("savedStatus").textContent="";
    get("type").disabled=true;
    const type = get("type");
    type.replaceChildren(dom("option","","Da classificare"));
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
        p&&(p.status==="published"&&p.verifiedProduct===true ||
            p.status==="preview"&&p.verifiedProduct===false)&&
        typeof p.id==="string"&&Array.isArray(p.images)&&p.images.length===3 &&
        p.images.every((url,i)=>trustedPhoto(url,p.id,i+1)) &&
        catalog.some(c=>c.brand===p.brand&&c.model===p.family));
      get("trialTotal").textContent=fmt(publicProducts.length||catalog.length);
      render();
    }catch(error){
      get("results").textContent="Catalogo V3 momentaneamente non disponibile";
      get("grid").replaceChildren(dom("p","empty","Errore nel caricamento dei modelli. Ricarica la pagina."));
      console.error("OHANA V3: errore caricamento raccolte");
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
