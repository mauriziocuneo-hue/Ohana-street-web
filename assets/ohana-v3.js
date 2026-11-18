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
  let catalog = [], limit = 45;

  const byId = id => catalog.find(item => item.id === id);
  const byBrand = brand => catalog.filter(item => !brand || item.brand === brand);

  function setSelection(brand, family = "") {
    state.brand = brands.includes(brand) ? brand : "";
    state.family = family;
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
      (!q || norm(item.brand+" "+item.model).includes(q)));
    if (state.sort==="family") rows.sort((a,b)=>col.compare(a.model,b.model));
    else if (state.sort==="brand") rows.sort((a,b)=>col.compare(a.brand,b.brand)||col.compare(a.model,b.model));
    return rows;
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
    const visual = dom("div","card-visual v3-card-visual");
    const cover = dom("button","card-cover v3-placeholder");
    cover.type = "button";
    cover.setAttribute("aria-label","Esplora "+item.brand+" "+item.model);
    cover.append(dom("span","v3-mark","OHANA / V3"));
    cover.append(dom("span","v3-art","FOTO\nIN REVISIONE"));
    cover.append(dom("span","photo-count",fmt(item.reportedAlbumCount)+" album censiti"));
    cover.addEventListener("click",()=>showCollection(item));
    visual.append(cover);
    const info = dom("div","card-info");
    info.append(dom("div","card-brand",item.brand+" · Sneakers"));
    info.append(dom("h3","display",item.model));
    info.append(dom("p","card-color","Foto e colorazioni da verificare"));
    info.append(dom("p","card-code","Raccolta V3 · "+fmt(item.reportedAlbumCount)+" album segnalati"));
    const open = dom("button","card-open","Esplora il modello ↗");
    open.type = "button";
    open.addEventListener("click",()=>showCollection(item));
    info.append(open);
    root.append(visual,info);
    return root;
  }

  function render() {
    navigation();
    const rows = filtered();
    const fragment = document.createDocumentFragment();
    for(const item of rows.slice(0,limit)) fragment.append(card(item));
    const grid=get("grid");
    grid.replaceChildren(fragment);
    if(!rows.length) grid.append(dom("p","empty","Nessun modello trovato. Prova a modificare la ricerca."));
    get("results").textContent=fmt(rows.length)+" raccolte · fotografie ancora da verificare";
    const selected=byId(state.family);
    get("selectionTitle").textContent=selected ? selected.model : (state.brand || "Tutte le scarpe");
    get("breadcrumb").textContent=["Scarpe V3",state.brand,selected?.model].filter(Boolean).join(" › ");
    get("more").hidden=rows.length<=limit;
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
        item.reportedAlbumCount>=0&&item.status==="da-catalogare");
      get("trialTotal").textContent=fmt(catalog.length);
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
