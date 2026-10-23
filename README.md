# OHANA STREET — Sito pubblico

Repository destinato esclusivamente alla pubblicazione del catalogo pubblico OHANA STREET con GitHub Pages. Il codice sorgente principale è conservato nel repository privato. I collegamenti riservati ai fornitori sono in Supabase con RLS, non nei file di questo repository.


## Richieste cliente e WhatsApp Business (23 ottobre 2026)

L’assistente in `assets/ohana-chat.js` prepara richieste in tre passaggi: taglia/colore, domanda, riepilogo. È condiviso da homepage, catalogo per modelli e schede prodotto. Il contesto della scheda viene passato come oggetto, inclusi codici OHY, OH e OH-N. Il link nel messaggio punta a `gestione/?articolo=ID`, senza parametri QA. Il codice precompila la ricerca e resta nel collegamento durante l’accesso; autenticazione, ruoli e collegamenti fornitori restano protetti. Il pulsante Condividi continua a usare la scheda pubblica. Vedi `docs/frontend-backend-contract.md`.

Le richieste sono bozze in memoria nella pagina. Il sito non invia messaggi, non crea ordini e non registra dati cliente su un database. Il cliente apre WhatsApp e preme Invia nell’app. Il sito non conosce l’esito dell’invio. Non sono previste API AI o WhatsApp a pagamento.

Nell’area gestori, dopo accesso, il riquadro “WhatsApp Business · testi pronti e organizzazione richieste” contiene messaggi di benvenuto/assenza, sette risposte rapide e cinque etichette. I testi sono generici e pubblicabili; non includono fornitori, credenziali o dati cliente. Si copiano e si configurano manualmente nell’app WhatsApp Business sul telefono. Le etichette sono applicate alle chat nell’app, senza sincronizzazione automatica con il sito. Orari, prezzi, disponibilità e tempi di spedizione non vengono inventati dal bot.

Verifica: `node tests/ohana-chat.test.js` e i due test esistenti del catalogo/bot foto; preparazione pubblica con `python3 tools/prepara_pages.py`. Il foglio `assets/ohana-theme.css` resta invariato.

## Nomi dei modelli (23 ottobre 2026)

`nomi-modelli.json` conserva la revisione di 122 schede: 107 nomi identificati, una famiglia 1906 senza suffisso confermato e 14 casi dichiarati “Modello da verificare”. Contiene solo metadati pubblicabili. La revisione riguarda il nome del modello raffigurato, senza certificare autenticità, materiali o disponibilità. Titoli di archivio incoerenti con la fotografia non vengono copiati come nomi certi.

`python3 tools/importa_catalogo_esistente.py` applica i nomi a `catalogo.json` e ricompila `catalogo-nuovo.json`, conservando codici, colori e fotografie. La scheda, la ricerca, il menu, l’area gestori e il contesto WhatsApp leggono gli stessi nomi. I casi incerti e le Predator con allestimenti non confermati restano senza gruppo di varianti. Shox R4/Z, Air Jordan 4/SB e le generazioni Cloudmonster restano distinti. Verifica con `node tests/nomi-modelli.test.js` oltre ai controlli esistenti. Grafica e caratteri restano quelli del tema OHANA.

## Catalogo e scelte cliente (23 ottobre 2026)

Il catalogo conserva tutte le 375 varianti. I modelli identificati sono raggruppati per marca, famiglia verificata e tipologia; il selettore colore apre sempre l’articolo originale con le sue foto e il codice esatto. I nomi ancora incerti restano schede separate. Le ricerche e i filtri selezionano le varianti corrispondenti senza nascondere gli altri colori nella scheda. Il tema `assets/ohana-theme.css`, i caratteri, il logo e la hero sono invariati.

I cuori salvano gli ID nel browser usando la chiave condivisa `ohana-fav-v1`, già usata dalla vetrina precedente. “Solo salvate” filtra il catalogo; “Prepara richiesta” raccoglie le scarpe in un unico messaggio WhatsApp. Ogni articolo mantiene colore e taglia propria, incluse altre taglie e “Non so ancora”. Si può applicare una taglia a tutte, rimuovere singole scelte, rivedere e copiare il testo. Le taglie e le domande sono bozze in memoria; i preferiti restano sul browser, senza account o database cliente. Se il messaggio supera la lunghezza prevista dal collegamento, viene proposto di copiarlo e incollarlo nella chat. Non vengono inviati messaggi automaticamente.

“Come funziona” spiega i tre passaggi. “Condividi” usa la condivisione del dispositivo o copia il collegamento pubblico del colore aperto, con selezione manuale come ripiego. Il link WhatsApp di ciascun articolo porta invece alla relativa ricerca nell’area gestori. Il contratto è documentato in `docs/frontend-backend-contract.md` per il lavoro parallelo sul backend.

La revisione aggiunge 6 identificazioni sostenute da immagini e fonti ufficiali (Nantucket Walk, Coquette e Classic New Heights Lace Up) e 14 fotografie della stessa colorazione recuperate dagli album originali. Tutte le 1140 fotografie precedenti sono conservate: totale 1154. Restano 14 nomi da verificare e 33 gallerie sotto le tre viste: 14 hanno ora due fotografie e 19 una. Album con modelli o colori diversi non sono stati usati per completare artificialmente le gallerie. I casi incompleti sono segnalati nella scheda.

Verifica: `node tests/catalogo-nuovo.test.js`, `node tests/media-bot.test.js`, `node tests/ohana-chat.test.js`, `node tests/nomi-modelli.test.js`, `node tests/scelte-clienti.test.js`, `node tests/gestori-link.test.js`, `python3 scripts/audit_catalogo_nuovo.py` e `python3 tools/prepara_pages.py`. Il test gestori esegue il codice client con un servizio simulato: verifica precompilazione prima/dopo accesso e mancato caricamento dei dati privati per utenti non autorizzati, senza usare credenziali reali o cambiare il database.
