"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const brands = ["Nike", "Jordan", "Adidas", "New Balance"];
  const order = new Map(brands.map((b, i) => [b, i]));
  const collator = new Intl.Collator("it", { sensitivity: "base", numeric: true });
  const number = new Intl.NumberFormat("it-IT");
  const state = { brand: "", search: "", sort: "brand" };
  let collections = [];

  const cleanText = value => String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it-IT");

  const node = (tag, cls, value) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value !== undefined) el.textContent = String(value);
    return el;
  };

  function setBrand(brand) {
    if (brand && !order.has(brand)) return;
    state.brand = brand;
    document.querySelectorAll("#brandBar button[data-brand]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.brand === brand));
    });
    render();
  }

  function visibleCollections() {
    const q = cleanText(state.search.trim());
    const filtered = collections.filter(item =>
      (!state.brand || item.brand === state.brand) &&
      (!q || cleanText(item.brand + " " + item.model).includes(q))
    );
    filtered.sort((a, b) => {
      if (state.sort === "albums") {
        return (b.reportedAlbumCount - a.reportedAlbumCount) ||
          collator.compare(a.model, b.model);
      }
      if (state.sort === "name") return collator.compare(a.model, b.model);
      return (order.get(a.brand) - order.get(b.brand)) ||
        collator.compare(a.model, b.model);
    });
    return filtered;
  }

  function openCollection(item) {
    $("modelDialogBrand").textContent = item.brand + " / RACCOLTA V3";
    $("modelDialogTitle").textContent = item.model;
    $("modelDialogCount").textContent = number.format(item.reportedAlbumCount) +
      " album indicati nell'elenco di partenza · nessuna scheda fotografica ancora approvata";
    const message = "Ciao OHANA Street, vorrei informazioni sul modello " +
      item.brand + " " + item.model + " (catalogo V3). " +
      "Potete verificare le fotografie, le colorazioni e le taglie disponibili?";
    $("modelWhatsapp").href = "https://wa.me/393520263951?text=" + encodeURIComponent(message);
    $("modelDialog").showModal();
  }

  function makeCard(item, idx) {
    const article = node("article", "model-card");
    article.dataset.brand = item.brand;
    article.setAttribute("aria-label", item.brand + " " + item.model);
    const top = node("div", "card-top");
    top.append(node("span", "brand", item.brand));
    top.append(node("span", "number", String(idx + 1).padStart(2, "0")));
    article.append(top);
    const title = node("h4", "", item.model);
    article.append(title);
    const foot = node("div", "card-bottom");
    const count = node("div", "albums-count", number.format(item.reportedAlbumCount) + " album");
    count.append(node("small", "", "indicati nella fonte"));
    foot.append(count);
    const button = node("button", "card-open", "Esplora ↗");
    button.type = "button";
    button.setAttribute("aria-label", "Esplora " + item.brand + " " + item.model);
    button.addEventListener("click", () => openCollection(item));
    foot.append(button);
    article.append(foot);
    return article;
  }

  function render() {
    const matches = visibleCollections();
    const heading = state.brand || "Tutte le raccolte";
    $("collectionHeading").textContent = heading;
    $("resultsStatus").textContent = number.format(matches.length) + " raccolte su " +
      number.format(collections.length);
    $("emptyState").hidden = matches.length !== 0;
    const grid = $("modelGrid");
    const fragment = document.createDocumentFragment();
    matches.forEach((item, i) => fragment.append(makeCard(item, i)));
    grid.replaceChildren(fragment);
  }

  async function init() {
    $("brandBar").addEventListener("click", event => {
      const button = event.target.closest("button[data-brand]");
      if (button) setBrand(button.dataset.brand);
    });
    $("modelSearch").addEventListener("input", event => {
      state.search = event.target.value.slice(0, 100);
      render();
    });
    $("modelSort").addEventListener("change", event => {
      state.sort = event.target.value;
      render();
    });
    $("resetFilters").addEventListener("click", () => {
      $("modelSearch").value = "";
      $("modelSort").value = "brand";
      state.search = "";
      state.sort = "brand";
      setBrand("");
    });
    $("closeModelDialog").addEventListener("click", () => $("modelDialog").close());
    $("modelDialog").addEventListener("click", event => {
      if (event.target === $("modelDialog")) $("modelDialog").close();
    });
    try {
      const res = await fetch("data/catalogo-v3.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Impossibile leggere il catalogo");
      const data = await res.json();
      if (data.schemaVersion !== 3 || !Array.isArray(data.collections) || !Array.isArray(data.products)) {
        throw new Error("Formato catalogo V3 non valido");
      }
      // La preview NON presenta come disponibili prodotti privi di revisione fotografica.
      collections = data.collections.filter(item =>
        item && typeof item.model === "string" && typeof item.brand === "string" &&
        order.has(item.brand) && Number.isInteger(item.reportedAlbumCount) &&
        item.reportedAlbumCount >= 0 && item.status === "da-catalogare"
      );
      $("totalCollections").textContent = number.format(collections.length);
      $("totalAlbums").textContent = number.format(
        collections.reduce((sum, item) => sum + item.reportedAlbumCount, 0)
      );
      render();
    } catch (error) {
      $("resultsStatus").textContent = "Catalogo momentaneamente non disponibile";
      const message = node("p", "load-error",
        "Non riesco a caricare le raccolte. Riprova aggiornando la pagina.");
      $("modelGrid").replaceChildren(message);
      console.error("OHANA V3: impossibile caricare il catalogo");
    }
  }
  init();
})();
