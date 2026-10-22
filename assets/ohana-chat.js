/* OHANA STREET — assistente guidato in pagina, senza backend né invii automatici.
   Attivare impostando window.OHANA_CONTACT_NUMBER con il recapito WhatsApp confermato. */
(function () {
  'use strict';

  const phone = String(window.OHANA_CONTACT_NUMBER || '').replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(phone)) {
    // Non esporre un pulsante WhatsApp che non può funzionare.
    return;
  }

  function init() {
    if (document.getElementById('ohana-chat-root')) return;
    const root = document.createElement('div');
    root.className = 'ohc-root';
    root.id = 'ohana-chat-root';
    root.innerHTML = [
      '<button id="ohana-chat-toggle" type="button" class="ohc-fab" aria-expanded="false" aria-controls="ohana-chat-panel" aria-label="Apri assistente OHANA">',
      '<span class="ohc-fab-mark" aria-hidden="true">✿</span>Chiedi informazioni</button>',
      '<section id="ohana-chat-panel" class="ohc-panel" role="dialog" aria-label="Assistente OHANA STREET" aria-modal="false" hidden>',
      '<div class="ohc-header"><div><strong>ALOHA! ✿</strong><span>Assistente OHANA STREET</span></div>',
      '<button id="ohana-chat-close" class="ohc-close" type="button" aria-label="Chiudi assistente">×</button></div>',
      '<div class="ohc-body" id="ohana-chat-content" aria-live="polite"></div>',
      '<div class="ohc-actions">',
      '<button id="ohana-chat-back" class="ohc-btn ohc-back" type="button">Indietro</button>',
      '<button id="ohana-chat-next" class="ohc-btn ohc-next" type="button">Continua →</button>',
      '<a id="ohana-chat-send" class="ohc-send" href="#" target="_blank" rel="noopener noreferrer" hidden>Apri WhatsApp ↗</a>',
      '</div></section>'
    ].join('');
    document.body.appendChild(root);

    const fab = root.querySelector('#ohana-chat-toggle');
    const panel = root.querySelector('#ohana-chat-panel');
    const close = root.querySelector('#ohana-chat-close');
    const content = root.querySelector('#ohana-chat-content');
    const back = root.querySelector('#ohana-chat-back');
    const next = root.querySelector('#ohana-chat-next');
    const send = root.querySelector('#ohana-chat-send');
    let step = 0;
    let data = {product: '', size: '', question: ''};

    function node(tag, cls, text) {
      const el = document.createElement(tag);
      if (cls) el.className = cls;
      if (text !== undefined) el.textContent = text;
      return el;
    }
    function productLabel(p) {
      if (!p || typeof p !== 'object') return '';
      return [p.brand, p.model, p.id ? '(' + p.id + ')' : '']
        .filter(Boolean).map(x => String(x)).join(' · ').slice(0, 190);
    }
    function message() {
      const product = data.product.trim() || 'Richiesta generica';
      const size = data.size.trim() || 'Da definire';
      const code = product.match(/\b(?:OHY-\d{3}|OH-[A-F0-9]{12})\b/i);
      const link = code ? location.origin + location.pathname + '?articolo=' + encodeURIComponent(code[0].toUpperCase()) : '';
      return [
        'Ciao OHANA STREET! 👋',
        'Vorrei chiedere informazioni su un articolo del vostro catalogo.',
        '',
        'Prodotto: ' + product,
        'Taglia: ' + size,
        'Richiesta: ' + data.question.trim(),
        ...(link ? ['Scheda: ' + link] : []),
        '',
        'Messaggio preparato dal sito OHANA STREET.'
      ].join('\n');
    }
    function textField(id, label, val, multi, max) {
      const lab = node('label', 'ohc-label', label);
      lab.htmlFor = id;
      const el = node(multi ? 'textarea' : 'input', 'ohc-input' + (multi ? ' ohc-textarea' : ''));
      el.id = id;
      el.maxLength = max;
      el.value = val;
      if (!multi) el.type = 'text';
      return [lab, el];
    }
    function saveField() {
      const field = content.querySelector('.ohc-input');
      if (!field) return;
      const key = ['product', 'size', 'question'][step];
      if (key) data[key] = field.value.trim();
    }
    function showError(text) {
      let error = content.querySelector('.ohc-error');
      if (!error) {
        error = node('p', 'ohc-error');
        content.appendChild(error);
      }
      error.textContent = text;
    }
    function render() {
      content.replaceChildren();
      const progress = node('p', 'ohc-progress', step === 3 ? 'Ultimo passaggio' : 'Passaggio ' + (step + 1) + ' di 3');
      content.appendChild(progress);

      let question, tip, field;
      if (step === 0) {
        question = 'Quale prodotto ti interessa?';
        tip = 'Scrivi il modello, oppure lascia vuoto per una richiesta generale.';
        field = textField('ohana-product', 'Prodotto o codice articolo', data.product, false, 190);
        field[1].placeholder = 'Es. Nike Air Max, oppure codice OH-…';
      } else if (step === 1) {
        question = 'Quale taglia cerchi?';
        tip = 'Puoi anche saltare questo passaggio se non hai una taglia precisa.';
        field = textField('ohana-size', 'Taglia desiderata (facoltativa)', data.size, false, 50);
        field[1].placeholder = 'Es. 42 · altre taglie su richiesta';
      } else if (step === 2) {
        question = 'Cosa vuoi sapere?';
        tip = 'Per esempio puoi chiedere informazioni su misure, colori e disponibilità.';
        field = textField('ohana-question', 'La tua domanda', data.question, true, 650);
        field[1].placeholder = 'Scrivi qui la tua richiesta…';
      } else {
        question = 'Ecco il tuo messaggio!';
        tip = 'Premendo «Apri WhatsApp» si aprirà la conversazione con il messaggio pronto. Per inviarlo dovrai premere Invia su WhatsApp.';
      }
      content.appendChild(node('h3', 'ohc-question', question));
      content.appendChild(node('p', 'ohc-tip', tip));

      if (field) {
        content.appendChild(field[0]);
        content.appendChild(field[1]);
        field[1].focus();
      } else {
        content.appendChild(node('div', 'ohc-summary', message()));
        content.appendChild(node('p', 'ohc-disclaimer', 'Nessuna richiesta viene inviata automaticamente da questo sito.'));
        send.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message());
      }
      back.disabled = step === 0;
      next.hidden = step === 3;
      send.hidden = step !== 3;
      next.textContent = step === 2 ? 'Rivedi messaggio →' : 'Continua →';
    }
    function setOpen(open) {
      panel.hidden = !open;
      fab.setAttribute('aria-expanded', String(open));
      if (open) render();
      else fab.focus();
    }
    function reset(product) {
      data = {product: productLabel(product), size: '', question: ''};
      step = 0;
      setOpen(true);
    }
    fab.addEventListener('click', function () {
      if (!panel.hidden) setOpen(false);
      else reset(null);
    });
    close.addEventListener('click', function () { setOpen(false); });
    back.addEventListener('click', function () {
      if (step > 0) { saveField(); step -= 1; render(); }
    });
    next.addEventListener('click', function () {
      saveField();
      if (step === 2 && !data.question.trim()) {
        showError('Scrivi una domanda prima di continuare.');
        return;
      }
      if (step < 3) { step += 1; render(); }
    });
    content.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.target.tagName === 'INPUT' && !event.isComposing) {
        event.preventDefault();
        next.click();
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) setOpen(false);
    });
    window.OhanaChat = Object.freeze({
      open: function () { reset(null); },
      openWithProduct: function (p) { reset(p); },
      close: function () { if (!panel.hidden) setOpen(false); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once: true});
  } else init();
})();
