# OHANA STREET — Sito pubblico

Repository destinato esclusivamente alla pubblicazione del catalogo pubblico OHANA STREET con GitHub Pages. Il codice sorgente principale è conservato nel repository privato. I collegamenti riservati ai fornitori sono in Supabase con RLS, non nei file di questo repository.


## Richieste cliente e WhatsApp Business (23 ottobre 2026)

L’assistente in `assets/ohana-chat.js` prepara richieste in tre passaggi: taglia/colore, domanda, riepilogo. È condiviso da homepage, catalogo per modelli e schede prodotto. Il contesto della scheda viene passato come oggetto, inclusi codici OHY, OH e OH-N. Il link nel messaggio punta sempre al catalogo completo con il solo parametro `articolo`, senza parametri QA.

Le richieste sono bozze in memoria nella pagina. Il sito non invia messaggi, non crea ordini e non registra dati cliente su un database. Il cliente apre WhatsApp e preme Invia nell’app. Il sito non conosce l’esito dell’invio. Non sono previste API AI o WhatsApp a pagamento.

Nell’area gestori, dopo accesso, il riquadro “WhatsApp Business · testi pronti e organizzazione richieste” contiene messaggi di benvenuto/assenza, sette risposte rapide e cinque etichette. I testi sono generici e pubblicabili; non includono fornitori, credenziali o dati cliente. Si copiano e si configurano manualmente nell’app WhatsApp Business sul telefono. Le etichette sono applicate alle chat nell’app, senza sincronizzazione automatica con il sito. Orari, prezzi, disponibilità e tempi di spedizione non vengono inventati dal bot.

Verifica: `node tests/ohana-chat.test.js` e i due test esistenti del catalogo/bot foto; preparazione pubblica con `python3 tools/prepara_pages.py`. Il foglio `assets/ohana-theme.css` resta invariato.
