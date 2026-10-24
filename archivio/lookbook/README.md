# Lookbook precedente — disattivato e conservato

Decisione di Mauri del **24 ottobre 2026**: usare il catalogo per modelli come ingresso del sito e conservare la vecchia vetrina per un possibile riutilizzo futuro.

`index.html` in questa cartella è la copia integrale, senza modifiche, della homepage Lookbook al commit `8b25a40485b5223dd32614ed59f7a3ce9ce6d934`. Le risorse mantengono i percorsi relativi della homepage originale.

## Stato

- Disattivato: questa cartella non viene copiata in `_site/` e non è raggiungibile dalla navigazione pubblica.
- Conservato nel repository con il versionamento GitHub.
- Dati, fotografie e componenti condivisi restano nelle rispettive posizioni (`catalogo.json`, `foto-extra.json`, `assets/`). Nessun articolo viene eliminato.
- La homepage pubblica `index.html` apre il catalogo attivo `catalogo-nuovo.html`, mantenendo query e ancore; i vecchi collegamenti alle scarpe rimangono utilizzabili.

## Riattivazione futura

Su richiesta di Mauri, copiare questo `index.html` nella radice del progetto al posto dell’ingresso attuale. I percorsi alle risorse tornano così a essere quelli originali. Per ripubblicarlo con un altro nome occorre prima adeguare i collegamenti relativi.

Prima di pubblicare, verificare la compatibilità con le versioni correnti dei componenti condivisi e i collegamenti a schede, preferiti, WhatsApp e area gestori. Eseguire `python3 tools/prepara_pages.py` e le verifiche del progetto. Non includere automaticamente tutta la cartella archivio nella pubblicazione.
