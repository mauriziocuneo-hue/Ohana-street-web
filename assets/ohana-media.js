/* Assistente fotografico di test: usa esclusivamente fotografie approvate locali. */
(function (root) {
  'use strict';
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const aliases = {
    'air jordan 4 retro': 'air jordan 4', 'air jordan 4 retro bred': 'air jordan 4',
    'air jordan 5 retro': 'air jordan 5', 'samba og': 'samba'
  };
  const families = new Set([
    'air jordan 1', 'air jordan 1 low', 'air jordan 3', 'air jordan 4', 'air jordan 4 sb',
    'air jordan 5', 'air jordan 6', 'air jordan 11', 'air jordan 12',
    'air max 90', 'air max 95', 'air max plus', 'zoom vomero 5', 'p 6000', 'dunk low',
    'air force 1 shadow', 'cortez', 'shox', 'samba', 'gazelle', 'gazelle indoor',
    'gazelle bold', 'superstar', 'campus', 'handball spezial', 'sl 72',
    'adizero adios pro 4', 'adizero evo sl', '530', '9060', '1906', '2002r', '327',
    '204l', '740', '2000', 'gel 1130', 'gel kayano', 'gel quantum', 'gel nyc',
    'gel nimbus 10 1', '3xl', 'runner', 'triple s', 'x adidas triple s', 'track', 'track 2',
    'defender', 'cargo', 'xt 6', 'xt 6 gtx', 'xt 4', 'xt 4 og', 'xt 4 mule mm6',
    'xt quest', 'xt quest x oamc', 'xa pro 3d', 'super star', 'ball star',
    'ball star wishes', 'stardan', 'running sole', 'slide', 'lv trainer', 'lv runner',
    'rhyton', 'mexico 66', 'cloudmonster', 'cloudmonster 2'
  ]);
  function family(product) {
    const brand = norm(product.brand);
    // Explicit reviewed grouping takes precedence, including an intentional null.
    if (Object.prototype.hasOwnProperty.call(product, 'famiglia_varianti')) {
      return product.modelloVerificato === true && typeof product.famiglia_varianti === 'string' && norm(product.famiglia_varianti)
        ? brand + ':' + norm(product.famiglia_varianti) : null;
    }
    let name = norm(String(product.model || '').split(/\s+[—–]\s+/)[0]);
    for (const prefix of [brand, brand === 'jordan' ? 'jordan' : '', brand === 'on running' ? 'on' : '']) {
      if (prefix && name.startsWith(prefix + ' ')) name = name.slice(prefix.length + 1);
    }
    name = aliases[name] || name;
    return families.has(name) ? brand + ':' + name : null;
  }
  function colors(product) {
    const listed = product.colori_disponibili;
    if (Array.isArray(listed) && listed.length) return listed.join(', ');
    const parts = String(product.model || '').split(/\s+[—–]\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : 'Colore nelle fotografie';
  }
  const colorWords = {
    nero: /\b(?:nero|nera|neri|nere|black)\b/, bianco: /\b(?:bianco|bianca|bianchi|bianche|white)\b/,
    rosso: /\b(?:rosso|rossa|rossi|rosse|red)\b/, blu: /\b(?:blu|blue)\b/,
    verde: /\b(?:verde|verdi|green)\b/, rosa: /\b(?:rosa|pink)\b/,
    grigio: /\b(?:grigio|grigia|grigi|grigie|grey|gray)\b/,
    beige: /\bbeige\b/, crema: /\b(?:crema|cream)\b/, giallo: /\b(?:giallo|gialla|gialli|yellow)\b/,
    argento: /\b(?:argento|silver)\b/, marrone: /\b(?:marrone|marroni|brown)\b/,
    arancione: /\b(?:arancione|arancioni|orange)\b/, viola: /\b(?:viola|purple)\b/
  };
  const safePath = path => typeof path === 'string' && /^assets\/products\/[A-Za-z0-9_.-]+\.(?:webp|jpe?g|png)$/i.test(path);
  function answer(query, product, catalog, extra) {
    const text = norm(query);
    if (!product) return {text: 'Apri una scheda prodotto per cercare foto e colori.', items: []};
    const requestedColors = Object.keys(colorWords).filter(key => colorWords[key].test(text));
    if (/\b(?:colori|colore|colorazioni|colorazione|varianti|variante)\b/.test(text) || requestedColors.length) {
      const key = family(product);
      let items = key ? catalog.filter(p => p.vetrina === true && p.genere === 'Scarpe' && p.id !== product.id && family(p) === key && safePath(p.image)) : [];
      if (requestedColors.length) items = items.filter(p => requestedColors.every(color => colorWords[color].test(norm(colors(p)))));
      const unique = new Set();
      items = items.filter(p => { const key = norm(colors(p)); if (unique.has(key)) return false; unique.add(key); return true; });
      return {kind: 'variants', items, text: items.length
        ? 'Ecco le altre colorazioni fotografate della stessa famiglia di modello. Apri una variante per vedere la sua scheda. Colori e taglie sono da confermare con OHANA.'
        : 'Non ho altre colorazioni verificate' + (requestedColors.length ? ' con questo colore' : '') + ' per questa scarpa. Puoi richiederle con il pulsante WhatsApp della scheda.'};
    }
    if (/\b(?:foto|fotografie|fotografia|immagini|immagine|scatti|scatto|suola|dietro|dettagli|dettaglio|laterale|viste|vista)\b/.test(text)) {
      const images = [...(product.images || [product.image]).map(src => ({src, label: 'Fotografia della scheda'})), ...(extra || [])];
      const seen = new Set();
      const items = images.filter(img => safePath(img.src) && !seen.has(img.src) && seen.add(img.src));
      return {kind: 'photos', items, text: items.length > 1
        ? 'Queste sono le fotografie verificate di questo articolo. Tocca una foto per ingrandirla.'
        : 'Per questo articolo ho una sola fotografia verificata. Gli altri scatti non sono ancora disponibili: puoi richiederli con il pulsante WhatsApp della scheda.'};
    }
    if (/\b(?:taglia|taglie|misura|misure|numero|numeri)\b/.test(text)) return {text: 'Taglie 36–46; altre taglie su richiesta. La taglia desiderata va confermata con OHANA tramite il pulsante WhatsApp della scheda.', items: []};
    return {text: 'Posso mostrarti altre foto o cercare altri colori della scarpa aperta. Prova “altre foto”, “altri colori” oppure “la cerco nera”.', items: []};
  }
  const api = {family, colors, answer};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root || !root.document) return;
  let extrasPromise;
  function extras() {
    if (!extrasPromise) extrasPromise = fetch('foto-extra.json', {cache: 'no-cache'}).then(r => {if (!r.ok) throw Error('media'); return r.json();}).then(data => data.products || {}).catch(() => ({}));
    return extrasPromise;
  }
  function node(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function mount(product, catalog, openProduct) {
    const host = document.getElementById('ohana-media-bot');
    if (!host) return;
    host.replaceChildren();
    const toggle = node('button', 'ohm-toggle', '✿ Foto e colori');
    toggle.type = 'button'; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'ohm-panel');
    const panel = node('section', 'ohm-panel'); panel.id = 'ohm-panel'; panel.hidden = true; panel.setAttribute('aria-label', 'Assistente foto e colori');
    panel.append(node('strong', 'ohm-title', 'ALOHA! Quale dettaglio vuoi vedere?'));
    panel.append(node('p', 'ohm-context', product.brand + ' · ' + product.model + ' · ' + product.id));
    const log = node('div', 'ohm-log'); log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); panel.append(log);
    const quick = node('div', 'ohm-quick');
    for (const label of ['Altre foto', 'Altri colori']) { const b = node('button', '', label); b.type = 'button'; b.addEventListener('click', () => ask(label)); quick.append(b); }
    panel.append(quick);
    const form = node('form', 'ohm-form');
    const label = node('label', 'ohm-input-label', 'Chiedi foto o colori'); label.htmlFor = 'ohm-question';
    const input = node('input'); input.id = 'ohm-question'; input.type = 'text'; input.maxLength = 180; input.placeholder = 'Es. la cerco nera'; input.autocomplete = 'off';
    const submit = node('button', '', 'Chiedi'); submit.type = 'submit';
    form.append(label, input, submit); panel.append(form, node('p', 'ohm-note', 'Fotografie reali dall’archivio OHANA.'));
    host.append(toggle, panel);
    let turn = 0;
    async function ask(query) {
      const current = ++turn;
      const question = node('p', 'ohm-user', query); const response = node('div', 'ohm-response');
      log.replaceChildren(question, response); response.append(node('p', '', 'Cerco nell’archivio fotografico…'));
      const media = await extras();
      if (current !== turn || !host.contains(panel)) return;
      const result = answer(query, product, catalog, media[product.id]);
      response.replaceChildren(node('p', '', result.text));
      if (result.items.length) {
        const grid = node('div', 'ohm-grid');
        for (const [index, item] of result.items.entries()) {
          const card = node('button', 'ohm-card'); card.type = 'button';
          const img = node('img'); img.loading = 'lazy'; img.decoding = 'async'; img.alt = result.kind === 'variants' ? colors(item) : item.label + ' ' + (index + 1); img.src = result.kind === 'variants' ? item.image : item.src;
          card.append(img, node('span', '', result.kind === 'variants' ? colors(item) : item.label));
          card.setAttribute('aria-label', result.kind === 'variants' ? 'Apri variante ' + colors(item) : 'Ingrandisci fotografia ' + (index + 1));
          card.addEventListener('click', () => {
            if (result.kind === 'variants') { openProduct(item.id); return; }
            const existing = response.querySelector('.ohm-preview');
            if (existing) existing.remove();
            const preview = node('figure', 'ohm-preview');
            const large = node('img'); large.src = item.src; large.alt = product.model + ' — ' + item.label;
            preview.append(large, node('figcaption', '', item.label)); response.prepend(preview);
            preview.scrollIntoView({block: 'nearest', behavior: 'smooth'});
          });
          img.addEventListener('error', () => {card.replaceChildren(node('span', '', 'Fotografia temporaneamente non disponibile'));card.disabled = true;});
          grid.append(card);
        }
        response.append(grid);
      }
    }
    toggle.addEventListener('click', () => {panel.hidden = !panel.hidden;toggle.setAttribute('aria-expanded', String(!panel.hidden));if (!panel.hidden && !log.childNodes.length) log.append(node('p', '', 'Sto guardando questa scarpa insieme a te. Scegli “Altre foto” o “Altri colori”, oppure scrivi la tua richiesta.'));});
    form.addEventListener('submit', event => {event.preventDefault();const query = input.value.trim();if(query) {ask(query);input.value = '';}});
    if (new URLSearchParams(location.search).get('bot') === '1') toggle.click();
  }
  root.OhanaMedia = Object.freeze({...api, mount});
})(typeof window === 'undefined' ? null : window);

