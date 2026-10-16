# Inazuma Eleven Cross Hub

Sito **non ufficiale**, fatto da fan, per consultare i personaggi di *Inazuma Eleven Cross* (elementi, statistiche, tecniche, passive), segnare quelli che possiedi e ottenere squadre consigliate. Inazuma Eleven è un marchio di LEVEL-5. I dati vengono da AppMedia e Game8 e possono contenere errori (vedi `DATI_DA_VERIFICARE.md`).

Nessun framework, nessuna build: solo HTML, CSS e JavaScript. I dati sono file JSON in `data/`.

## Provarlo sul tuo computer

Il sito carica i dati con `fetch()`, quindi **non funziona aprendo `index.html` con doppio clic**. Serve un piccolo server locale:

1. Estrai lo zip in una cartella.
2. Apri il terminale in quella cartella ed esegui: `python3 -m http.server 8000`
3. Apri `http://localhost:8000` nel browser.

## Pubblicarlo su GitHub Pages (gratis)

Prerequisiti: un account GitHub gratuito. **Il repository deve essere pubblico**: Pages sui repository privati richiede un piano a pagamento. Anche il sito sarà raggiungibile da chiunque conosca l'indirizzo (non si può proteggere con password); contiene solo dati di gioco pubblici, ma tienine conto.

### Metodo A: solo dal sito GitHub (nessun programma)

1. Su github.com: **New repository**. Nome, ad esempio, `inazuma-cross-hub`. Scegli **Public**. Non aggiungere README. **Create repository**.
2. Estrai lo zip sul computer. Dentro troverai la cartella `inazuma-cross-hub` con `index.html`, `css`, `js`, `data`…
3. Nella pagina del repository vuoto clicca **uploading an existing file** (oppure **Add file → Upload files**).
4. Trascina nella pagina **il contenuto della cartella** (non lo zip, e non la cartella stessa): `index.html`, `README.md`, `.nojekyll`, `css`, `js`, `data`, `tests`, `tools`, ecc. Con Chrome, Edge e Firefox le sottocartelle si caricano mantenendo la struttura. Se il file `.nojekyll` (nome che inizia col punto) non compare perché il sistema lo nasconde, non è un problema: serve solo a evitare l'elaborazione Jekyll e il sito funziona anche senza.
5. Controlla che `index.html` sia **nella radice** del repository, non dentro un'altra cartella. Scrivi un messaggio (es. "Primo caricamento") e premi **Commit changes**.
6. Vai in **Settings → Pages** (menu a sinistra). In **Build and deployment → Source** scegli **Deploy from a branch**. In **Branch** scegli `main` e la cartella `/ (root)`, poi **Save**.
7. Aspetta 1-3 minuti (nella scheda **Actions** vedi la pubblicazione). L'indirizzo comparirà in Settings → Pages ed è: `https://TUO-UTENTE.github.io/inazuma-cross-hub/`
8. Aprilo. Se vedi la pagina ma senza personaggi, premi Ctrl+F5 (o Cmd+Maiusc+R) per svuotare la cache.

### Metodo B: con git da terminale

```
cd inazuma-cross-hub
git init
git add .
git commit -m "Primo caricamento"
git branch -M main
git remote add origin https://github.com/TUO-UTENTE/inazuma-cross-hub.git
git push -u origin main
```

Poi esegui i passi 6-8 del Metodo A. (GitHub chiede il login: usa un *personal access token* al posto della password, oppure GitHub CLI / GitHub Desktop.)

### Aggiornare il sito

- **Sito GitHub**: apri il file da cambiare (ad es. `data/parts/...json`) → icona matita → modifica → **Commit changes**. Oppure **Add file → Upload files** per sostituire più file. La pagina si ripubblica da sola in 1-2 minuti.
- **Git**: `git add . && git commit -m "Aggiornamento dati" && git push`

### Problemi comuni

- *Pagina 404*: `index.html` non è nella radice, oppure Pages non è ancora attivato o ha finito di pubblicare. Controlla Settings → Pages.
- *"Impossibile caricare i dati"*: manca la cartella `data/` o un file in `data/parts/`; ricontrolla il caricamento.
- *La collezione "sparisce"*: è salvata nel browser (localStorage) e vale per quell'indirizzo e quel dispositivo. Usa **Esporta/Importa** nella scheda "La mia collezione" per fare backup o cambiare dispositivo.

## Struttura

| Percorso | Contenuto |
|---|---|
| `index.html`, `css/style.css` | pagina e stile |
| `js/catalog.js` | catalogo, filtri, collezione |
| `js/engine.js`, `js/builder.js` | motore e interfaccia del Team Builder |
| `data/parts/*.json` | personaggi (124), in gruppi da 8 |
| `data/index.json` | elenco dei file dati da caricare |
| `data/meta.json`, `data/SCHEMA.md` | elementi, ruoli, etichette, schema dei dati |
| `data/tag_aliases.json`, `data/formations.json` | alias dei tag delle passive, formazioni |
| `tests/engine.test.js` | test del motore: `node tests/engine.test.js` |
| `tools/check_tags.py` | controllo dei tag: `python3 tools/check_tags.py` |
| `PROJECT_STATUS.md` | stato del progetto |

## Aggiungere un personaggio

Aggiungi un oggetto (stesso schema di `data/SCHEMA.md`) a un file in `data/parts/` oppure crea un nuovo file e aggiungilo a `data/index.json`. Un dato che non conosci va lasciato `null`, mai inventato.


## Come funziona il Team Builder (aggiornato 16/10)
- **11 contro 11 con tecnico**: scegli un tecnico (formazione fissa DF-MF-FW) o "il migliore tra tutti". La passiva del tecnico vale sempre; quella di formazione solo se TUTTE le condizioni sugli slot sono soddisfatte.
- **5 contro 5**: nessun tecnico; le passive delle formazioni B non sono modellate (dato non disponibile).
- I ruoli sono liberi (anche un portiere in attacco). Tutte le passive (ADVANCED/ADVANCED+ incluse) sono considerate al massimo.
- Il punteggio è una stima trasparente, non la formula del gioco. Alcune ipotesi sono elencate in `DATI_DA_VERIFICARE.md`.
