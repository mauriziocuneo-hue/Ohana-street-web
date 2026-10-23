# OHANA — collegamenti tra catalogo e area gestori

Il frontend prepara i messaggi WhatsApp con un riferimento all’area riservata:

`/gestione/?articolo=OHY-021`

Il parametro `articolo` contiene soltanto il codice pubblico OHANA. Sono accettati i formati `OHY-001`, `OH-` seguito da 12 caratteri esadecimali e `OH-N-` seguito da 12 caratteri esadecimali. Il backend conserva il riferimento durante l’accesso e, dopo autenticazione e autorizzazione, mostra il solo articolo richiesto. Il link non contiene token né collegamenti riservati ai fornitori.

La modifica minima a `gestione/index.html` precompila la ricerca dal parametro. Autenticazione, account autorizzati, query e criteri di accesso restano quelli esistenti. Se la chat backend sostituisce il pannello, deve mantenere questo contratto e la protezione dei dati. Verifica con `node tests/gestori-link.test.js` (integrazione con client simulato).

Il pulsante pubblico “Condividi” usa invece `/catalogo-nuovo.html?articolo=CODICE`, così un cliente può condividere la scarpa con un’altra persona. Le richieste WhatsApp singole e multiple usano il percorso gestori.

Il frontend continua a leggere `catalogo-nuovo.json` e il precedente `catalogo.json`: codici e riferimenti fotografici sono conservati. Le scelte sono salvate nel browser con la chiave già esistente `ohana-fav-v1`. Taglie e domande rimangono in memoria fino alla chiusura della pagina; non vengono registrate nel database.
