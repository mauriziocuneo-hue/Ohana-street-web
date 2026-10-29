# Ordini operativi OHANA

Produzione: area `/gestione/`, progetto Supabase OHANA STREET, tabella `ohana_orders`, funzione `orders`. La demo privata e `ohana_demo_orders` rimangono separati, senza importazione dei test.

Il gestore inserisce le coordinate/istruzioni autorizzate per bonifico o PayPal. La registrazione dell’accredito è manuale e attribuita al gestore con data. Nessuna API di pagamento, verifica bancaria automatica, invio WhatsApp automatico o rimborso automatico. Vendere soltanto prodotti consentiti e autorizzati.

Dopo la registrazione del pagamento il preventivo non si riapre. Annullare un ordine non esegue un rimborso. Prima dell’ordine al fornitore completare nome, telefono, indirizzo, articoli e fornitore; le foto si condividono o allegano manualmente. Le esportazioni contengono dati personali: conservarle solo nei dispositivi dei gestori. Usare Esporta archivio periodicamente; il piano gratuito non offre un backup automatico gestito di questi ordini.

L’endpoint verifica sessione Auth e appartenenza a `ohana_managers`; il client non scrive direttamente alla tabella. RLS e privilegi negano l’accesso diretto anon/authenticated. Concorrenza gestita tramite revisione atomica.

Codice condiviso con la demo: `gestione/ordini-*.mjs`, `gestione/importa-whatsapp.mjs`, `backend/ordini-demo/handler.mjs` con `mode:live`. Per distribuire `orders`, includere index.ts e product-ids.json di questa cartella, handler.mjs condiviso con import locale ./ordini-core.mjs, e gestione/ordini-core.mjs. Aggiornare gli ID/foto server da entrambi i cataloghi quando vengono aggiunti nuovi prodotti.

Il branch test/gestione-richieste-pagamenti e l’anteprima privata restano il luogo di sperimentazione. Non pubblicare mai fixture QA, dati di clienti, service-role key o copie del database. Rollback interfaccia: revert della PR di rilascio, senza eliminare tabella o ordini.
