# Decisioni da conservare — OHANA Street

- Il 24 ottobre 2026 Mauri ha chiesto di disattivare la vecchia vetrina Lookbook, conservandola per un possibile riutilizzo. Non cancellare `archivio/lookbook/index.html` o i dati e le fotografie che usa. Vedi `archivio/lookbook/README.md` per il ripristino.
- Il Lookbook è escluso dalla pubblicazione GitHub Pages e dalla navigazione. `index.html` apre il catalogo attuale in `catalogo-nuovo.html`, conservando parametri articolo, scelte e ancore dei collegamenti.
- I contenuti attivi e le fotografie sono condivisi con il catalogo precedente: disattivare la vecchia interfaccia non autorizza a eliminare `catalogo.json`, gli ID o le immagini.
- Questo flusso cura il frontend. L’area `gestione/` e Supabase sono gestiti nel flusso backend parallelo; preservarne le modifiche nelle pubblicazioni.
- Titoli e descrizioni pubbliche non devono contenere bozze o note come “versione da verificare”. Conservare gli stati `family`/`pending`, le note di revisione e gli abbinamenti nulli; i campi `publicName`/`publicFamily` di `nomi-modelli.json` permettono nomi pubblici chiari senza dichiarare identificazioni inesistenti.
