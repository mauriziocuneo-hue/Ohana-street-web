# Revisione dei testi pubblici — 24 ottobre 2026

Controllate le descrizioni di tutti i **375 articoli**: **223 descrizioni ripulite** e **14 titoli pubblici corretti**. Eliminati note di lavorazione, frasi spezzate, suffissi redazionali e indicazioni di avanzamento dalle schede.

- Le famiglie riconosciute mostrano il nome disponibile, ad esempio **Runner**, **Lowmel Guard** o **Ball Star**, senza aggiungere una versione commerciale non confermata.
- Le nove identificazioni ancora aperte usano titoli descrittivi come **Sneakers**, **Stivaletti**, **Sandali**, **Ciabatte** e **Mocassini**. Non vengono inventati nomi di modelli.
- `nomi-modelli.json` conserva integralmente nomi di revisione, stati `family`/`pending`, motivazioni e abbinamenti nulli. `publicName` e `publicFamily` specificano i testi destinati al cliente; il file di revisione non viene pubblicato in `_site/`.
- Le indicazioni sul numero di fotografie riportano soltanto gli scatti disponibili. Le conferme su taglie e disponibilità restano nel percorso WhatsApp.

`tools/importa_catalogo_esistente.py` applica i nomi pubblici e la pulizia anche nelle importazioni successive. Le descrizioni utili e già corrette vengono conservate; non si aggiungono garanzie su materiali o caratteristiche tecniche.

Restano invariati tutti gli ID, i colori, i riferimenti, le **1.162 fotografie**, le **148 schede** e le **375 varianti**. Gli stati interni rimangono 107 identificazioni, sei riconoscimenti di famiglia e nove identificazioni aperte; i modelli incerti non vengono uniti alle varianti confermate. Il Lookbook archiviato, il tema e l’area gestori sono preservati.

Verifica con i controlli esistenti su nomi, varianti, richieste WhatsApp, preferiti, collegamenti gestori e build pubblica. La regressione sui testi controlla che titoli e descrizioni non reintroducano note redazionali o frasi spezzate.
