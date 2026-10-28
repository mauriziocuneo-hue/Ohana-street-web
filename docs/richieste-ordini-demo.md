# Richieste e ordini — laboratorio isolato

Branch esclusivo: `test/gestione-richieste-pagamenti`. Non unire a main e non avviare il workflow Pages su questo branch. Nessuna modifica al frontend pubblico o allo schema di produzione.

## Archivio persistente

Progetto Supabase **OHANA STREET DEMO** (`csxtcxnmottiljcbnotu`), regione eu-central-1, organizzazione Ohana Org. Creazione quotata a 0 $/mese il 26 ottobre 2026. L'anteprima privata apre la pagina gestori esistente. Le credenziali OHANA vengono verificate dal progetto Auth già usato dall'area gestori; non vengono creati nuovi account o copiate password. Il progetto di produzione `tqkmrejfbvzchfplgxzl` è usato per Auth e lettura dei dati gestori esistenti, senza modificare schemi, prodotti o fornitori.

Gli ordini sono condivisi fra i gestori autorizzati nel database di test e si ritrovano da browser/dispositivi differenti. **Salva richiesta** conferma soltanto dopo la risposta del database. In caso di errore non si passa a un archivio locale alternativo. Le richieste temporanee precedenti non sono migrate automaticamente. **Aggiorna elenco** carica i cambiamenti dell'altro gestore. Una revisione obsoleta blocca il salvataggio per evitare sovrascritture: aggiornare e riapplicare la modifica. Non c'è aggiornamento realtime.

**Esporta archivio demo** scarica un JSON completo a cura del gestore, con dati cliente e prezzi: conservarlo privatamente. Non è un backup automatico programmato. Nel pannello condiviso gli ordini si annullano e non si eliminano in massa. Il piano gratuito non include backup automatici e può sospendere il progetto dopo inattività.

## Sicurezza e componenti

Un'unica tabella `ohana_demo_orders` conserva payload ordine, revisione, aggiornamento e gestore. Cataloghi, immagini e anagrafiche fornitori già presenti non vengono duplicati nel DB; l'ordine conserva il codice prodotto e i dettagli commerciali concordati. Nessun URL fornitore è incluso nell'ordine.

La tabella ha RLS, policy di diniego esplicito e nessuna concessione ad anon/authenticated. Solo la Edge Function `demo-orders` usa il ruolo server. Verifica ogni token presso l'Auth esistente e controlla `ohana_managers` tramite RLS prima di accedere ai dati di test. `verify_jwt=false` serve ad accettare il token del progetto Auth diverso: il codice effettua l'autenticazione esplicita e restituisce 401/403 prima dell'accesso al database. Le chiavi server restano nell'ambiente Edge e non sono inviate al browser.

L'endpoint consente solo elenco paginato e salvataggio. La funzione SQL usa confronto atomico della revisione. Il server verifica dati, stati, blocco commerciale dopo il preventivo e ordini chiusi; i pagamenti sono esclusivamente simulati.

- `gestione/ordini-demo.mjs`: componente condiviso; archivio persistente dopo login, modalità sessione solo per test locali isolati del componente.
- `gestione/ordini-store.mjs`: adattatore autenticato verso il solo progetto demo.
- `gestione/importa-whatsapp.mjs`: parser locale senza servizi AI esterni o lettura automatica delle chat.
- `backend/ordini-demo/schema.sql`: schema applicato esclusivamente al progetto demo.
- `backend/ordini-demo/handler.mjs`, `index.ts`: endpoint server.
- `backend/ordini-demo/product-ids.json`: lista degli ID ammessi ricavata dai cataloghi del branch; rigenerare se cambiano i codici.

La funzione riusa `gestione/ordini-core.mjs`. Nel pacchetto Edge viene inclusa come `ordini-core.mjs`, adattando il percorso di import del gestore; non ci sono due copie da mantenere nel repository.

## Prova completa — solo dati fittizi

1. Accedere all'anteprima privata e poi con il proprio account gestore OHANA.
2. Aprire Richieste e ordini, creare una richiesta demo.
3. Caricare un messaggio di esempio oppure incollare una risposta fittizia. Analizzare, controllare i campi selezionati, confermare l'associazione all'ordine, applicare e salvare.
4. Concordare il totale comprensivo di spedizione e indicare costo prodotto, spedizione e commissioni. Il margine stimato sottrae questi costi; non è un calcolo fiscale.
5. Passare a preventivo. Il testo WhatsApp include SÌ/NO con riferimento ordine; **richiesta dati** genera lo schema guidato. Non sono pulsanti WhatsApp nativi. Il sì/no non avanza o annulla l'ordine automaticamente.
6. Generare richiesta PayPal demo e passare ad attesa pagamento. Non esiste alcun SDK, URL o pagamento PayPal reale. Registrare il pagamento demo e passare a ordinato.
7. Completare indirizzo fittizio, corriere e tracking; passare a spedito e consegnato. Verificare messaggio e cronologia.
8. Da un altro browser accedere con un gestore e usare Aggiorna elenco: la richiesta deve essere visibile. Provare anche due modifiche della stessa revisione; la seconda deve essere respinta.
9. Esportare l'archivio se desiderato. Gli ordini consegnati/annullati sono in sola lettura.

Il parser cerca etichette esplicite; nel testo libero riconosce soltanto codice OHANA e taglia esplicita. Campi assenti, valori multipli, recapiti non validi e indirizzi incompleti vengono segnalati. Un riferimento a un altro ordine blocca l'applicazione. Non importa prezzi, costi, commissioni, pagamento o stato. Cambiare prodotto azzera il fornitore selezionato; cambiare dati commerciali invalida la richiesta PayPal demo.

## Verifiche

`node --test tests/ordini-demo.test.mjs tests/importa-whatsapp.test.mjs tests/ordini-db.test.mjs`

`node tests/gestori-link.test.js`

Con linkedom 0.18.12: `node --test tests/gestione-varianti.test.cjs tests/gestione-foto.test.cjs`.

`python3 tools/build_orders_demo.py /percorso/esterno/dist` prepara solo l'area gestori, cataloghi e risorse necessari per l'anteprima. Include esclusivamente configurazione Auth pubblica, nessuna chiave server o dato fornitore privato. Il confezionamento Pages di produzione non è cambiato: una futura integrazione richiede revisione esplicita della sua allowlist. Questa versione rimane demo.


## Flusso vendita esteso — 28 ottobre 2026

Ogni ordine può contenere da 1 a 20 righe: prodotto OHANA, modello, colore, taglia, quantità da 1 a 20, costo unitario, fornitore, suo codice facoltativo e foto scelta dalle fotografie già presenti nel catalogo. Il fornitore reale è raggruppato per hostname degli album già protetti; i fornitori demo restano disponibili. Non vengono importati nuovi URL privati nel DB. Le vecchie richieste senza array `items` vengono lette come una riga, senza migrazioni o riscritture in massa.

Il prezzo può essere concordato manualmente come totale finale oppure calcolato con ricarico. Base = somma costi unitari × quantità + spedizione + commissioni. Prezzo = base + ricarico percentuale sulla base − sconto fisso. Gli importi vengono arrotondati ai centesimi; ricarico e margine sul prezzo finale sono mostrati separatamente. Per esempio 60 € prodotto + 10 € spedizione, ricarico 40%, sconto 8 € => totale 90 €, guadagno stimato 20 €. Nel prezzo manuale lo sconto è già incluso nel totale scelto, non viene sottratto di nuovo.

Il metodo può essere PayPal o bonifico, entrambi solo demo. Le istruzioni contengono numero ordine e totale; non viene generato un IBAN utilizzabile o un link PayPal reale. Registrare il pagamento richiede di spuntare la verifica dell'accredito simulato. Modificare paia, taglie, quantità, metodo o totale invalida le istruzioni prima dell'attesa pagamento. Dal passaggio ad attesa pagamento i dati commerciali restano bloccati anche sul server.

Dopo pagamento registrato, la sezione **Messaggi per il fornitore** genera un testo per ciascun fornitore, con destinatario, indirizzo, telefono, codice ordine, articoli, colori, taglie, quantità e nomi dei file foto da allegare. Occorre completare telefono, indirizzo, fornitori e foto. Non include prezzo al cliente, ricarico o margine. **Copia messaggio** copia il testo e **Scarica foto** scarica ogni fotografia scelta: il gestore controlla e allega manualmente tutto alla chat corretta. Non viene inviato alcun messaggio. Il riepilogo cliente elenca tutte le righe, ma l'importazione guidata di dati prodotto continua ad agire soltanto sulla prima riga; righe multiple o ambigue richiedono controllo manuale.

Test: `node --test tests/ordini-flusso.test.mjs`. La lista pubblica di ID ammessi sul server contiene anche i percorsi delle foto del catalogo per validare l'appartenenza della foto al prodotto. Lo schema DB rimane invariato.
