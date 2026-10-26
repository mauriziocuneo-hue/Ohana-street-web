# Richieste e ordini — laboratorio isolato

Branch esclusivo: `test/gestione-richieste-pagamenti`. Non unire a main e non avviare il workflow Pages su questo branch. Nessuna migrazione o modifica al database.

## Due accessi allo stesso componente

- `gestione/index.html`: sezione dopo l'autenticazione Supabase e la verifica `ohana_managers` già esistenti. Usa il catalogo e le righe fornitore già lette tramite RLS; nessun nuovo accesso dati. I pulsanti Richiesta demo sulle schede preselezionano il codice OHANA.
- `gestione/richieste-demo.html`: anteprima autonoma con catalogo esistente, fornitori fittizi e nessuna dipendenza da Supabase. Ospitare solo su un'anteprima privata con controllo accesso del servizio di hosting; il sorgente demo non contiene dati riservati e non costituisce un'autenticazione. La policy della pagina blocca connessioni a servizi esterni e invii di form.

Il componente ordini è condiviso. Non sono duplicati cataloghi, anagrafiche fornitori o sistemi di autenticazione. Nessun frontend pubblico è modificato.

## Simulazione completa

1. Nuova richiesta demo: il messaggio fittizio è già precompilato. Cambiare cliente, codice OHANA, modello, colore e taglia. Disponibilità non certificata. Non inserire persone reali.
2. Concordare il totale comprensivo di spedizione. Registrare costo prodotto, costo spedizione e commissioni. Il margine stimato è totale meno questi tre costi, senza calcolo fiscale.
3. Salvare e passare a preventivo. Copiare il testo WhatsApp di prova se desiderato: nessun invio automatico.
4. Generare richiesta PayPal demo: descrizione, numero ordine, EUR e importo sono mostrati; nessun SDK, link PayPal, API o pagamento.
5. Passare ad attesa pagamento, poi registrare il pagamento demo. Modello/colore/taglia/prezzo sono bloccati da attesa pagamento; una modifica richiede annullamento e nuova richiesta.
6. Passare a ordinato, inserire indirizzo fittizio, corriere e tracking, salvare e passare a spedito. Generare l'aggiornamento WhatsApp, infine consegnato.
7. Annullamento consentito prima della consegna. Gli ordini chiusi sono in sola lettura. Cronologia disponibile.

Richieste conservate in `sessionStorage` con chiave del branch e del gestore, su origine separata nell'anteprima. Ricaricare mantiene il test; la chiusura della sessione browser lo elimina. Non c'è sincronizzazione tra dispositivi o gestori, né persistenza server. Il logout rimuove il componente e i listener; nessun URL fornitore viene salvato nell'ordine.

## Verifiche e confezionamento

`node --test tests/ordini-demo.test.mjs`

`node tests/gestori-link.test.js`

Con linkedom 0.18.12 disponibile: `node --test tests/gestione-varianti.test.cjs tests/gestione-foto.test.cjs`.

`python3 tools/build_orders_demo.py /percorso/esterno/dist` genera esclusivamente il laboratorio, escludendo configurazione Supabase, pagine pubbliche e dati fornitore. Il confezionamento Pages di produzione non è stato cambiato: l'eventuale integrazione futura richiederà una revisione esplicita della sua allowlist, della persistenza condivisa e del pagamento reale.


## Incolla e importa WhatsApp

Il parser locale non legge chat e non usa servizi AI esterni. Dopo aver creato o selezionato una richiesta, aprire **Incolla e importa da WhatsApp**, caricare l'esempio oppure incollare un messaggio fittizio. Analizzare, controllare i campi selezionati, confermare l'associazione all'ordine e applicare alla bozza. Solo **Salva richiesta** rende persistenti i valori nella sessione browser.

Il preventivo contiene risposte SÌ/NO con riferimento ordine. In **Messaggi WhatsApp** il tipo **richiesta dati** genera lo schema guidato per nome, telefono, email facoltativa, prodotto, colore, taglia e indirizzo. Non sono pulsanti WhatsApp nativi. Sì/No registra una risposta cliente senza avanzare o annullare l'ordine.

Il riconoscimento affidabile richiede etichette esplicite; in testo libero vengono cercati soltanto codice OHANA e taglia esplicita. Campi assenti, valori multipli, recapiti non validi e indirizzi incompleti sono segnalati. Un riferimento a un altro ordine blocca l'applicazione. Senza riferimento serve confermare manualmente l'associazione. L'importazione non modifica prezzi, costi, commissioni, pagamenti o stato. Un cambio prodotto nel modulo azzera la selezione fornitore, come nella selezione manuale esistente. Eventuali dati commerciali cambiati invalidano il preventivo PayPal demo al salvataggio.

Test aggiuntivi: `node --test tests/importa-whatsapp.test.mjs`.
