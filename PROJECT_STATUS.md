# PROJECT_STATUS — Inazuma Eleven Cross Hub

## Obiettivo finale
Sito gratuito (GitHub Pages) con: catalogo di tutti i personaggi giocabili (elemento, ruolo, statistiche, tecniche, passive), filtri/ricerca, sezione "La mia collezione" (spunti i personaggi che possiedi) e Team Builder che propone le migliori squadre in base alla collezione.

## Decisioni tecniche
- Sito statico: HTML + CSS + JavaScript puro (nessun framework, nessuna build). Zero costi.
- Hosting: GitHub Pages. (Repo pubblico: Pages su repo privato richiede piano a pagamento. I dati sono comunque pubblici.)
- Collezione dell'utente: localStorage del browser (nessun server).
- Team builder: calcolo in JS nel browser, punteggio trasparente e modificabile (elementi, ruoli, statistiche, sinergie di tag).
- Niente immagini del gioco ospitate (copyright); solo testo/dati, con crediti alle fonti.

## Struttura file
```
inazuma-cross-hub/
  PROJECT_STATUS.md
  index.html, css/style.css, js/ (app.js, catalog.js, collection.js, builder.js)
  data/
    roster_index.json   <- elenco 124 voci (id, nome JA, elemento, ruolo, url fonte) [FATTO]
    meta.json           <- elementi, ruoli, tag/squadre, glossario
    parts/chars_001-008.json ... (gruppi da 8 personaggi, stesso schema)
    index.json          <- elenco dei file parts caricati dal sito
```

## Schema dati (un personaggio)
id (id pagina fonte), name_ja, name_en, version, rarity, element, position, type_ja, team_ja, tags_ja[], rating{best,reroll}, stats_max{tp,kick,technique,block,catch,speed}, skills[{name,unlock,tp,power,crit,range,chain,category}], passives[{name_ja,effect_ja,effect_en,unlock}], source_url, verified: "ok" | "parziale" | "mancante", checked_on.
Regola: campo non trovato = null, mai inventato.

## Fonte dati
- appmedia.jp/inazuma-cross: elenco di 124 voci (alcuni personaggi hanno più versioni = pagine separate) e, per ogni scheda, statistiche massime, tecniche, passive (testo giapponese).
- Fatti già verificati su una scheda: le passive sono legate ai TAG (es. "[結束] Kick+: se hai >=3 alleati con tag Raimon/Inazuma Japan, Kick +3510") -> le sinergie del builder si calcolano sui tag.
- Tabella passive di allenamento (per ruolo) disponibile su game8.jp/inazuma-cross/792803.
- La shell non raggiunge il web: si legge solo con WebFetch, una scheda alla volta.

## Piano a tappe (una per risposta)
1. [FATTO] Piano e scelta tecnologica.
2. [FATTO] Schema (data/SCHEMA.md) + meta.json + 3 personaggi di prova (chars_001-003.json).
3. [FATTO] Scheletro del sito (index.html, css/style.css, js/catalog.js) testato in browser: carica i 3 personaggi, filtri elemento/ruolo/rarità e ricerca funzionanti. Deploy su GitHub Pages: istruzioni date, da eseguire da parte dell'utente.
4. Raccolta dati: lotti da 8 schede (circa 16 lotti), uno per risposta, no agenti paralleli.
   - Lotto 0 (idx 1,3,6) in chars_001-003.json [FATTO]
   - Lotto 1 (idx 2,4,5,7,8,9,10,11) in chars_002-011.json [FATTO]  -> 11 personaggi su 124
   - Lotto 2 (idx 12-19) in chars_012-019.json [FATTO] -> 19 personaggi su 124
   - Lotto 3 (idx 20-27) in chars_020-027.json [FATTO] -> 27 personaggi su 124
   - Lotto 4 (idx 28-35) in chars_028-035.json [FATTO] -> 35 personaggi su 124
   - Lotto 5 (idx 36-43) in chars_036-043.json [FATTO] -> 43 personaggi su 124
   - Lotto 6 (idx 44-51) in chars_044-051.json [FATTO] -> 51 personaggi su 124 (6 nuovi senza statistiche)
   - Lotto 7 (idx 52-59) in chars_052-059.json [FATTO] -> 59 personaggi su 124 (5 nuovi senza statistiche)
   - Lotto 8 (idx 60-67) in chars_060-067.json [FATTO] -> 67 personaggi su 124 (7 nuovi senza statistiche)
   - Lotto 9 (idx 68-75) in chars_068-075.json [FATTO] -> 75 personaggi su 124 (5 nuovi senza statistiche)
5. Filtri e ricerca nel catalogo.
6. Collezione personale (localStorage, export/import).
7. Team Builder (formazione, sinergie tag, punteggio).
8. Rifinitura, controllo a campione dei dati, README e istruzioni di aggiornamento.

## Problemi noti
- Il lancio di 8 agenti in parallelo ha esaurito il limite di sessione (reset alle 21:10 Europe/Rome, già passato): nessun dato ancora raccolto.
- Il sito legge i JSON con fetch(): in locale serve `python3 -m http.server` (il doppio clic su index.html non basta).
- Tag: tags_ja contiene solo il team mostrato; le passive usano tag come 雷門 (team 雷門中): serve tabella alias in tappa 7.
- Statistiche identiche tra personaggi diversi (Hidaka/Tsunami/Domon; Kogure/Kazemaru★2; Kidou★2/Ichinose) = modelli di statistiche condivisi per rarità+ruolo, NON errori.
- Il valore Velocità basso (2-6) è normale (coerente su tutti i personaggi).
- Dal lotto 4 alcune schede hanno la tabella 'ステータス情報' (senza 'massime') con valori bassi: 6 personaggi segnati parziale (Fudou, Kurimatsu x2, Megane, Gouenji★2 Raimon, Miyasaka). Da verificare con una seconda fonte prima della tappa 7 (il builder usa le statistiche).
- Dal lotto 5 la fonte spesso NON pubblica Calcio/Tecnica/Blocco/Presa ('-'): stats null (6 personaggi nel lotto 5). Il builder e il catalogo devono gestire stats null; serve una seconda fonte per le statistiche (candidate: gamerch.com/inazuma-cross, game8.jp/inazuma-cross).
- Nuovi team/tag nel lotto 6: 日本代表2026 (★3, serie イナイレクロス), 秋葉名戸, 御影専農, 木戸川清修, 稲妻KFC, 戦国伊賀島: tutti da inserire nella tabella alias tag (tappa 7).
- Lotto 7: Hiroto ★3 ha stats incoerenti nella stessa pagina (7394 vs 5670); alcune letture romaji dei nomi non verificate (Suizenji, Nata, Yuukoku). Nuove squadre: 野生中, 尾刈斗中, 世宇子.
- Lotto 9: nuove squadre 革命の雷門 (★3 Matsukaze/Tsurugi, serie イナイレGO1) e ヤングイナズマ (serie イナイレ2); i ★3 con stats complete sono gli unici con valori massimi alti (Tsurugi Calcio 9332, Matsukaze Tecnica 9304).
- Dati in giapponese: nomi/effetti da tradurre (IT/EN) nello schema.
- WebFetch riassume le pagine: controllare a campione i numeri.
- L'elenco da 124 voci può diventare obsoleto: servirà una procedura di aggiornamento.
- Ciclo elementi confermato (game8): Vento>Montagna>Fuoco>Foresta>Vento; nessun moltiplicatore numerico in fonte.
- Kidou: numero 1829 della passiva DFブロック+ concatenato nella fonte, da ricontrollare.
- Il tag 雷門 di Gouenji è dedotto dalle passive; i tag in generale vanno letti con cura (la pagina mostra solo il team).

## Prossima attività esatta
Tappa 4, lotto 10: idx 76-83 di roster_index.json, una scheda per volta con WebFetch -> data/parts/chars_076-083.json -> registrare in data/index.json.


## Aggiornamento lotto 10
- Lotto 10 (idx 76-83) completato -> parts/chars_076-083.json. Totale 83/124.
- PROSSIMO: Tappa 4, lotto 11: idx 84-91 di roster_index.json -> data/parts/chars_084-091.json

## Aggiornamento lotto 11
- Lotto 11 (idx 84-91) completato -> parts/chars_084-091.json. Totale 91/124.
- PROSSIMO: Tappa 4, lotto 12: idx 92-99 di roster_index.json -> data/parts/chars_092-099.json

## Aggiornamento lotto 12
- Lotto 12 (idx 92-99) completato -> parts/chars_092-099.json. Totale 99/124.
- PROSSIMO: Tappa 4, lotto 13: idx 100-107 di roster_index.json -> data/parts/chars_100-107.json

## Aggiornamento lotto 13
- Lotto 13 (idx 100-107, Gemini Storm) completato -> parts/chars_100-107.json. Totale 107/124.
- PROSSIMO: Tappa 4, lotto 14: idx 108-124 (17 voci, dividere in 108-115 e 116-124) -> data/parts/chars_108-115.json

## Aggiornamento lotto 14
- Lotto 14 (idx 108-115) completato -> parts/chars_108-115.json. Totale 115/124.
- PROSSIMO: Tappa 4, lotto 15 (ultimo): idx 116-124 -> data/parts/chars_116-124.json

## Aggiornamento lotto 15 - TAPPA 4 COMPLETATA
- Lotto 15 (idx 116-124) completato -> parts/chars_116-124.json. Totale 124/124 (roster completo).
- PROSSIMO: Tappa 5 (filtri/ricerca avanzati nel catalogo, scheda dettaglio personaggio).

## Aggiornamento tappa 5
- Tappa 5 completata: filtri squadra/serie, ordinamento (nome, rarità, 5 statistiche; null in fondo), checkbox 'solo dati completi', azzera filtri, ricerca su nome/squadra/tecniche/passive. Testato con Chromium headless (nessun errore JS).
- Scheda di dettaglio separata: rimandata (le card hanno già tecniche/passive espandibili).
- PROSSIMO: Tappa 6 - 'La mia collezione' (localStorage, pulsante 'Ho questo personaggio' sulle card, tab abilitato, esporta/importa JSON).

## Aggiornamento tappa 6
- Tappa 6 completata: pulsante 'Ce l'ho' su ogni card, collezione in localStorage (chiave iecross.collection.v1, solo id), tab 'La mia collezione' con contatore, esporta/importa JSON (id sconosciuti ignorati, import sostituisce), svuota con conferma. API per il builder: window.IEC.ownedChars(). Testato in Chromium headless (persistenza dopo reload, export, import valido/non valido, svuota): nessun errore.
- PROSSIMO: Tappa 7a - tabella alias tag (data/tag_aliases.json: 雷門→雷門中 ecc.) ricavata dai tag usati nelle passive; poi 7b motore di punteggio, 7c interfaccia Team Builder.

## Aggiornamento tappa 7a
- Creati data/tag_aliases.json (13 regole: squadra/tipo/any_of, status exact|assumed, optional_teams non contati di default, character_overrides vuoto) e tools/check_tags.py (verifica che ogni 'XXXタグ' nelle passive abbia una regola).
- Assunzioni NON confermate dalla fonte: 雷門=雷門中 (雷門OB e 革命の雷門 opzionali), 帝国=帝国学園, 'AまたはB'/'AとB' = uno dei due, ストライカー = type_ja, 日本代表2026 opzionale per イナズマジャパン. Personaggi 無所属 senza tag di squadra.
- PROSSIMO: Tappa 7b - motore di punteggio in js/engine.js (formazione, bonus 結束/共鳴 per tag/elemento, funzioni pure testabili con Node).

## Aggiornamento tappa 7b
- Creati js/engine.js (motore puro, UMD), data/formations.json, tests/engine.test.js (10 test, `node tests/engine.test.js`, tutti passati).
- Formazioni (fonte game8 788203, parziale): standard11 = 2 FW + 6 MF + 2 DF + 1 GK; 5v5 = 2 FW + 1 MF + 1 DF + 1 GK; custom. In gioco la formazione dipende dal tecnico (bonus non modellati). Esistono anche i TECNICI (監督) con passive: NON modellati.
- Modello: punteggio = base (stat per ruolo; se mancanti, stima = media dei personaggi con dati stesso ruolo/rarità/rating, marcata 'estimated') + sinergie interpretate dal testo giapponese (395 clausole su 620 passive; 1 frase non interpretata). Pesi in DEFAULTS: statWeight .01, powerWeight .1, debuffWeight .5, conditionalFactor .5. Passive attive di default: 初期, Lv11, Lv41 (ADVANCED/ADVANCED+ spente).
- Ipotesi NON verificate: il conteggio dei tag include il personaggio stesso; '味方' include sé stesso; due versioni dello stesso nome non giocano insieme (uniqueNames); ogni personaggio gioca solo nel suo ruolo naturale; potenza tecnica pesa 1/10 di un punto statistica.
- Ricerca: ricerca locale con 40 ripartenze (seed fisso, deterministica): 11 su 124 in circa 0,8 s.
- PROSSIMO: Tappa 7c - interfaccia Team Builder (tab, scelta formazione, opzioni, risultati con spiegazione sinergie attive/non soddisfatte, avviso dati stimati).

## Aggiornamento tappa 7c
- Tappa 7c completata: scheda 'Team Builder' abilitata (js/builder.js + sezione in index.html). Scelta formazione (standard11, 5v5, personalizzata), pool 'solo collezione'/'tutti', opzioni (ADVANCED+, 雷門OB/革命の雷門 come 雷門, 日本代表2026 come イナズマジャパン), fino a 5 squadre con punteggio, rosa, sinergie attive principali, sinergie non attive (cosa manca), avvisi su dati stimati e effetti non interpretati.
- Testato in Chromium headless: collezione vuota, 51 personaggi, 5v5, formazione personalizzata, tutti i 124; mobile 390px senza scroll orizzontale; nessun errore JS.
- PROSSIMO: Tappa 8 - rifinitura: controlli a campione dei dati contro la fonte (almeno 10 personaggi), recheck dei valori incerti (Kidou ★3 1829, Midorikawa 2926, Kirino Lv11), README con istruzioni di deploy su GitHub Pages (.nojekyll, aggiornamento dati), test automatici in un solo comando.

## Aggiornamento tappa 7c
- Tappa 7c completata: scheda 'Team Builder' attiva (js/builder.js + sezione in index.html + CSS). Scelta formazione (standard11, 5v5, personalizzata con slot modificabili), fonte personaggi (collezione / tutti per provare), opzioni (passive ADVANCED+, alias opzionali 雷門OB/革命の雷門 e 日本代表2026), risultati: 5 squadre con punteggio (base + sinergie), roster, sinergie attive principali, sinergie non attive (cosa manca), avvisi su dati stimati e passive non interpretate.
- Collaudo in Chromium headless: catalogo 124/124, formazioni caricate, collezione vuota -> messaggio, 5v5 su tutto il catalogo -> 2 squadre, 11 su tutto il catalogo -> 5 squadre con 11 giocatori, collezione di 6 -> avviso 'mancano 5 MF', nessun errore JS. Test engine: 10/10.
- Nota tecnica: durante la tappa è emerso un duplicato della sezione/JS del builder; tenuta la versione separata js/builder.js (catalog.js emette gli eventi iec-ready / iec-tab).
- Limiti noti UI: una passiva con due clausole (es. 林FWキック&テクニック+) appare come due righe; testi delle sinergie in giapponese; nessun salvataggio delle opzioni del builder.
- PROSSIMO: Tappa 8 - rifinitura: controlli a campione dei dati vs fonte (almeno 10 personaggi), README con istruzioni di deploy su GitHub Pages e aggiornamento dati, .nojekyll, controllo mobile, eventuale seconda fonte per statistiche mancanti.

## Aggiornamento (richiesta utente: deploy + dati mancanti + tecnici)
- Creati README.md (guida deploy completa GitHub Pages: metodo web e git, aggiornamenti, problemi comuni) e DATI_DA_VERIFICARE.md (checklist per l'utente: tecnici/formazioni, zone, tag, calcolo forza, statistiche mancanti, valori incerti, completezza).
- CHIARIMENTO IMPORTANTE: i TECNICI (監督) e i bonus di formazione NON sono modellati. Il 5v5 e lo standard11 del builder contano solo i giocatori (nessun tecnico, nessun bonus formazione, nessuna zona preferita).
- Piano: nuova TAPPA 7d - Tecnici e formazioni: raccogliere dati (game8/appmedia + conferma utente), data/coaches.json, slot numerati ①-⑪ con ruolo/zona, condizioni '②火'/'⑥山', estensione engine.js e builder.js (selezione tecnico, 5v5 con/senza tecnico se applicabile), test. La tappa 8 (rifinitura) slitta dopo la 7d.
- PROSSIMO: Tappa 7d, passo 1: ricerca dati sui tecnici (elenco, formazioni, passive) e salvataggio in data/coaches.json con 'verified'.

## Aggiornamento tappa 7d, passo 1 (tecnici) — 15/10
- INFO UTENTE (da usare nel motore): giocatori utilizzabili in QUALSIASI slot/ruolo, nessuna riserva (11 titolari); zone preferite ignorate; conteggio tag include il giocatore stesso (probabile); chi ha la passiva riceve il bonus; ogni personaggio ha tag SQUADRA + TIPO + SERIE; ADVANCED/ADVANCED+ sempre attivi (tutte le abilità al massimo); livello max 440; due versioni dello stesso personaggio possono giocare insieme (=> uniqueNames false di default); statistiche mancanti: le fornirà l'utente più avanti.
- Creato data/coaches.json: 14 tecnici (formazione, condizioni slot, passiva di formazione, passiva tecnico a Lv10) + 6 formazioni 5v5 (conteggi dal blog exblog, da confermare). Fonti: AppMedia (80077612 + pagine), Game8 (788266, 789400, 789408), Gamerch 989697. Tutto 'parziale': layout slot in immagine, discordanze tra fonti annotate.
- Creato data/coach_layouts_DA_COMPILARE.md e aggiornato DATI_DA_VERIFICARE.md con le nuove domande.
- Il sito iecrosshub.github.io (Italiano) carica i dati via JS: non leggibile con gli strumenti; github.com blocca robot: non usato.
- Scoperte dal simulatore del sito dell'utente (solo UI): moltiplicatore ruolo B x1.05 / A x1.10 / S x1.15, STAB automatico x1.20, vantaggio di tipo +20% / svantaggio -20% (da verificare, non ancora usati).
- PROSSIMO: 7d passo 2 - engine: (a) ruoli liberi (opzione) e uniqueNames=false, unlock tutti attivi di default, tag = squadra+tipo+serie; (b) tecnico selezionabile: condizioni slot (abbinamento giocatori-slot), passiva di formazione, passiva tecnico, effetti on_event come condizionali; (c) UI scelta tecnico + 5v5; (d) test. Layout ruoli per formazione: default 2/6/2/1 finché l'utente non compila coach_layouts_DA_COMPILARE.md.

## Tappa 7d passo 2 — motore con tecnici, ruoli liberi, 5v5 (15/10)
- Risposte utente registrate: nessuna riserva, ruoli liberi (anche GK in attacco); zone preferite ignorate; conteggio tag include chi ha la passiva (ipotesi); ADVANCED/ADVANCED+ sempre al massimo (tutte le passive attive di default); livello max 440; due versioni dello stesso personaggio possono giocare insieme (uniqueNames=false); passiva tecnico sempre attiva, passiva di formazione tutto-o-niente; nessun tecnico nel 5v5; layout DF-MF-FW dei 14 tecnici in coaches.json.
- `js/engine.js` riscritto: slot FW→MF→DF→GK(⑪), assegnazione libera, passive dei personaggi valutate sul ruolo dello SLOT, requisiti 推奨 del tecnico sul ruolo NATIVO; fuori ruolo: stima × 0.5 per chi non ha statistiche; modalità "tutti i tecnici".
- `js/builder.js` + `index.html`: modalità 11 con tecnico (o "il migliore tra tutti") / 5v5 con formazioni B; mostra stato passiva di formazione e slot.
- Test: 13 passati (tutti i tecnici su 124 personaggi ≈ 6 s in Node; singolo tecnico ≈ 1 s). Chromium headless: nessun errore.
- Non verificato: passive delle formazioni B (5v5) non modellate; significato di 推奨; "味方FW" nelle passive = ruolo di slot (ipotesi).

## Tappa 8 (16/10)
- Controllo a campione su AppMedia: 10 personaggi (染岡, 壁山★3, 綱海, 風丸, 咲山, 壁山★1, 影野, 帝国豪炎寺, ウルビダ, 財前塔子): statistiche massime e testi delle 5 passive combaciano con la fonte (豪炎寺 ADVANCED+: la sintesi della fonte non citava il +35 TP, presente nel nostro dato).
- 1 personaggio senza type_ja (財前塔子 SPフィクサーズ): non verificato, gli altri tag ok.
- Mobile 390px: nessun overflow. Corretto bug: il selettore "Formazione 5v5" restava visibile (aggiunto [hidden]{display:none!important}); tab più compatte.
- Resta aperto: 65 personaggi senza statistiche (le fornirà l'utente), ipotesi in DATI_DA_VERIFICARE.md.

## Tappa 9a (16/10) — nuova fonte dati: inazumaelevencrosshub.com
- L'utente ha eseguito uno script nel browser (il sito non è raggiungibile da qui) → iec_all.json: 511 voci, di cui 124 giocabili (stesso numero del nostro DB) e 387 "boss" senza scheda (ignorati).
- `tools/parse_iec.py` → `data/iec/chars.json` (124 personaggi): stat Lv1 e Lv440 COMPLETE (colma i 65 mancanti), mosse con tabelle per livello, passive con testo per ogni livello (sblocco a livello del personaggio), passive di rarità (ADVANCED/ADVANCED+), tag come id+icona, immagini del sito.
- `data/iec/tags.json`: 36 tag (id→nome giapponese). 33 dedotti dal confronto con il DB AppMedia (maggioranza), 3 dal nome squadra (雷門OB, 世宇子, シン・ゼウス: non verificati).
- Scoperte: (1) le stat Lv440 del sito sono ~41% più alte di quelle AppMedia per i personaggi confrontati (69 valori diversi su 204): il DB vecchio usava valori di livello inferiore → spiega il Team Builder che non sceglieva i più forti. (2) I valori delle passive crescono per livello della passiva (14 livelli per le base, 3 per le rarità); AppMedia riportava il massimo. (3) Il confronto automatico col DB vecchio: 103 abbinati, 14 non abbinati per differenze di nome, 7 ambigui (versioni multiple di Kidou/Fubuki/Hibiki).
- Decisione: la nuova fonte diventa primaria (richiesta dell'utente); il DB AppMedia resta come riferimento incrociato.
- Prossimo: adattatore JS che costruisce i personaggi per il motore dato il livello scelto (passive al livello di sblocco, stat interpolate linearmente tra Lv1 e Lv440 = ipotesi da dichiarare), UI livello per giocatore, test.

## Tappa 9b (16/10) — il sito usa i dati nuovi
- `tools/build_site_data.py` → `data/site/chars.json` (124 personaggi: stat Lv1/Lv440, mosse, passive per livello, tag, immagini). `data/site/id_migration.json`: vecchi id AppMedia → nuovi id (124/124 abbinati; i doppioni Kidou/Fubuki/Hibiki risolti per squadra+serie, non per nome: da verificare a occhio).
- `js/iecdata.js`: personaggio + livello → formato motore. Passive base al livello sbloccato dal livello del personaggio; passive di rarità al massimo; stat intermedie = INTERPOLAZIONE LINEARE (ipotesi); testo normalizzato (NFKC, "-284減少" → 284減少, "キック1054上昇" → "キックを1054上昇"). Tutte le passive a Lv440 interpretate (525 clausole, 0 non interpretate).
- Catalogo e Team Builder leggono i dati nuovi (al livello 440). La collezione salvata con i vecchi id viene migrata automaticamente (provato: 2 id su 3, l'id inesistente scartato).
- Test: 18 passati. Chromium: nessun errore; il Team Builder ora sceglie solo ★3.
- Il DB AppMedia (data/parts) resta come riferimento incrociato, non più letto dal sito. tools/check_tags.py legge ancora i vecchi dati (da riallineare).
- Prossimo: 9c = livello per ogni giocatore nella collezione.

## Tappa 9c (16/10) — livello per ogni giocatore
- Collezione: campo "Livello" (1–440) su ogni scheda + "Max", e "Livello per tutti / Applica a tutti" (vale anche per i nuovi aggiunti). Salvato in localStorage (`iecross.levels.v1`, `iecross.deflevel.v1`); collezioni già salvate partono a 440.
- `IEC.ownedChars()` restituisce i personaggi al livello scelto (stat interpolate, passive del livello sbloccato, ADVANCED/ADVANCED+ al massimo) → il Team Builder le usa.
- Esporta/Importa in formato v2 (id + livelli); l'import legge anche il formato v1.
- Prova in Chromium (30 personaggi): Endou Kick Lv440 3670 → Lv100 852; Team Builder con tutti a Lv50 punteggio 285, a Lv440 punteggio 1853; nessun errore. Corretto un errore di doppio evento 'change' nella sostituzione della scheda.
- Prossimo: immagini + pastiglie.

## Tappa 10 (16/10) — immagini + pastiglie
- `js/ui.js`: avatar = pastiglia sempre presente (colore elemento, iniziale del nome, ruolo, stelle) + immagine sopra (`image_small`/`image_big`, hotlink da https://inazumaelevencrosshub.com, lazy, no-referrer). Se l'immagine non carica viene rimossa e resta la pastiglia. Interruttore "Mostra immagini" (collezione, salvato nel browser).
- Usato in: schede catalogo/collezione e rosa delle squadre nel Team Builder.
- Provato in Chromium simulando sito bloccato (solo pastiglie, nessun errore) e sito che risponde (immagini mostrate). NON verificato: se il sito dei dati accetta richieste di immagini da GitHub Pages (da controllare a occhio sul sito pubblicato).
- Nota: filtro "Solo dati completi" ormai inutile (tutti completi) → da rimuovere nella tappa catalogo.

## Tappa 10 (17/10) — immagini + pastiglie
- Già presenti nell'ultimo zip (js/ui.js, css, catalogo, collezione, squadre): pastiglia (colore elemento, iniziale, ruolo, stelle) sempre presente; sopra, l'immagine collegata dal sito dei dati (`/img/Assets/Character_Small|Big/...`, hotlink, `referrerPolicy: no-referrer`, lazy). Se l'immagine non carica, resta la pastiglia. Interruttore "Mostra le immagini" nella scheda Collezione (salvato nel browser).
- Verifica in Chromium: 124 pastiglie nel catalogo, 22 nelle squadre, interruttore funzionante, nessun errore JS. NON verificabile da qui: se il sito dei dati lascia caricare le immagini da un altro sito (hotlink) → lo vedrà l'utente aprendo il sito pubblicato.
- Incidente: durante questa tappa ho sovrascritto per errore js/ui.js e modificato index.html senza aver controllato che esistessero già; ripristinati dall'ultimo zip (file identici, verificato con cmp). Nessun altro file toccato.
- Da fare: il filtro "Solo dati completi" non serve più (tutti i dati sono completi) → toglierlo nella tappa catalogo.

## Tappa 10b (17/10) — nomi occidentali + diagnosi formazioni
- `data/names_west.json` (tabella dell'utente 17/10, 52 voci) → `name_en` in data/site/chars.json (66 personaggi su 124, tutte le versioni dello stesso personaggio) e `name_west` nei tecnici (7 su 14: Hillman, Ray Dark ×2, Arthur Sweet, David Evans, Percival Travis, Lina Schiller). Ambiguità: 影野 仁 (Jim Wraith / Timmy Saunders) e 木暮 夕弥 (Bobby Shearer / Aiden Froste) assegnati nella tabella a due nomi ciascuno → applicato il primo, secondo da chiarire. Torch→バーン e Gazelle→ガゼル: identificazione mia (nel sito i nomi sono questi). Senza nome occidentale: personaggi non presenti nella tabella (Chaos, Gemini, Zeus, ecc.) e 6 tecnici "non verificati".
- Diagnosi (Kira, tutti i personaggi, Lv440): il motore trova 2515 (base 1185 + sinergie 1330, formazione attiva); la squadra "migliore" dell'utente (con 11° slot ottimizzato) fa 1750 e NON attiva la passiva di formazione di Kira nella mia interpretazione degli slot (condizioni ①Foresta ⑤Vento ⑥Foresta). Aumentare il peso degli effetti a evento/累 (0.5→8) non avvicina i due risultati: la squadra dell'utente resta ~55% del motore. Conclusione: il punteggio del motore non coincide con quello che i giocatori ottimizzano; manca il criterio reale (probabile ruolo del GK/potenza delle tecniche del portiere, meccaniche di partita).
- Prossimo possibile: calibrare i pesi su più squadre "buone" fornite dall'utente (tecnico + 11 giocatori + versione); verificare l'ordine degli slot dei tecnici.

## Tappa 11a (18/10) — formula reale dal repository iecrosshub (js/Core/calculator.js)
- Slot verificati: 1-2(3,5) FW → MF → DF → 11 = GK. Condizioni tecnici coincidono con coaches.json. Kira slot 6 ha 2 icone (Foresta, Vento): da chiarire.
- Danno mossa = floor( floor( floor(stat_con_buff × moltRuolo) × (potenzaMossa + bonusPotenzaPassive) × 0.01 ) × STAB 1.2 ) × vantaggio elemento (±0.2).
  → stat e potenza si MOLTIPLICANO; i bonus potenza passive si SOMMANO alla potenza della mossa (non pesano a parte).
- Modello squadra del repository (solo 5 slot, torri): somma danni, +10% se due mosse consecutive stesso elemento. Nessuna formula partita 11v11 nel repo.
- Prossimo: usare questa formula nel punteggio del motore (stat × potenza mossa migliore).

## Tappa 11b (18/10) — punteggio sulla formula del gioco
- engine.js: `cfg.model='damage'` (default). Per ogni giocatore: danno = floor(stat_con_buff × (potenza mossa + bonus potenza) × 0,01), mossa migliore; mosse di categoria diversa dal ruolo giocato ×0,5 (stima). Totale squadra = somma dei danni. `model:'legacy'` mantiene il vecchio punteggio.
- Bonus potenza dei tecnici divisi per tipo (shoot/dribble/block/catch/all); i bonus potenza delle passive dei personaggi valgono per tutte le mosse (il testo non indica il tipo).
- NON modellato: bonus elemento 1,2 (le mosse non hanno elemento nei dati), vantaggio elemento avversario, catena stesso elemento, debuff nemici (restano nei dettagli ma non nel totale), livello tecnica fisso al massimo.
- Test 18/18. Kira (tutto il roster): formazione attiva, totale ~584k.
- Da fare: confronto con la squadra dell'utente; rimettere i 4 nomi tecnici 10c (mancano in questo zip).

## Tappa 11c (18/10) — calibrazione ruoli + nomi tecnici
- Dal repository: il moltiplicatore di ruolo è per slot (B 1.05, A 1.10, S 1.15), non un taglio 50%. Motore: nativeRoleMult 1.1 (ruolo naturale), offRoleMult 1.0, mossa non adatta al ruolo ×0.5 (DF=blocco, GK=parata, FW=tiro, MF=dribbling o tiro). TUTTE IPOTESI, configurabili in DEFAULTS.
- Nomi tecnici dagli slot/formazioni del repo: Tayama = Harry Savage (Wild), Mashiya = Manny Artic (Otaku), Protagonista = Personaggio principale; + Hekyll Jyde, Igajima Sen'ichi, Seth Nichols, Toyama Shinochirou (da confermare).
- Kira (tutto roster) ~636k; squadra utente ~340-410k (formazione non attiva). Gap non spiegato: servono dati in-game (forza squadra mostrata dal gioco, identità "Rhine").

## Tappa 11d (18/10) — Team Builder: obbligatori ed esclusi
- Builder: campi "Obbligatori" (sempre in squadra) ed "Esclusi" (mai) con ricerca per nome e chip; un personaggio non può stare in entrambi. Non vengono salvati tra le sessioni.
- engine.js: `cfg.lockIds` (i bloccati entrano in pool, non vengono sostituiti dalla ricerca). Test 19/19; prova in browser ok.
- Nota: gli obbligatori sono ammessi anche se non in collezione.

## Tappa 11e (18/10) — ADVANCED / ADVANCED+ per personaggio
- Collezione: per ogni personaggio due menu (no / Lv1-3) per ADVANCED e ADVANCED+ (default Lv3 = massimo); riga "Applica a tutti" per le due passive. Salvati in localStorage `iecross.adv.v1`; inclusi in export/import (campo `adv`).
- iecdata.forLevel(c, L, adv): passiva rarità al livello scelto (0 = bloccata, non conta). Team Builder: tolta la casella "Conta anche ADVANCED" (ora vale quanto impostato per ogni personaggio; in modalità "Tutti" restano al massimo).
- Livello generale: già presente ("Livello per tutti" + "Applica a tutti", vale anche per i nuovi personaggi aggiunti).
- Test 20/20; prova browser ok.

## Tappa 11f (18/10) — Grado del personaggio (Normal … Legendary Player +) al posto dei due menu ADV
- Corretta la 11e: il gioco ha un solo "grado" 0-9 (Normal, Normal+, Growing, Growing+, Advanced, Advanced+, Top, Top+, Legendary, Legendary+). Fonte: repo iecrosshub (collection.js `char-rarity`, Core/parsers.js `getRarityTier`, js/Passive/*).
- Passive di rarità: ADVANCED sblocca tacche ai gradi 4/6/8, ADVANCED+ ai gradi 5/7/9 (stats_always.js, bonds.js). Growing+ (3) = nessuna delle due.
- Collezione: menu "Grado" per personaggio + "Grado per tutti" (default Legendary Player +). Salvato in `iecross.rarity.v1`, incluso in export/import (`rarity`). Test 20/20.
- NON ancora modellato: il repo applica anche un moltiplicatore alle statistiche per grado (awakeningMultipliers 1.00,1.10,1.20,1.30,1.40,1.50,1.60,1.70,1.85,2.00; growthTable.js). Non è chiaro a quale grado corrispondano le statistiche del sito (Lv1 Mark IJ: sito 34 calcio vs repo 24 base → ~x1.4). Da chiarire prima di applicarlo.
- I personaggi 3★ partono da Growing Player (2) nel repo, gli altri da Normal.

## Tappa 11g (18/10) — Harry Savage corretto, leggibilità, ricerca nella collezione
- Dati: passiva tecnico Harry Savage (tayama) 400 → 40 (repo iecrosshub harrySavage.js, Niv.10); Seth Nichols (nikaido) 89 → 85. Il "400" gonfiava le squadre tutto-Vento (punteggio tayama 1.118.352 → 620.082, ora 5 Vento su 11).
- Verificati gli altri 12 tecnici contro il repo (valori Lv10 coincidenti; Kira nel repo ha il Lv10 passiva = 0/placeholder, resta dal dato AppMedia; Zeus nel repo 60/60 = ok).
- Builder: titolo "Danno stimato" (tolti "base + sinergie", in unità vecchie), danno per giocatore, riga tecnico leggibile nel tema scuro (.okline).
- Collezione: barra di ricerca (nome, squadra, tecnica, passiva).

## Tappa 11h (18/10) — Kira (Lina Schiller) confermata dall'utente
- Condizioni formazione: slot 1 Foresta, slot 5 Vento, slot 6 Foresta O Vento (prima solo Foresta). Engine: `req.elements` (lista, basta uno). Test 21/21.
- Passiva Lv10 confermata dall'utente: Foresta/Vento tiro +70, MF consigliato dribbling +60 (come nei nostri dati). Attiva: +40 potenza a Foresta/Vento ogni volta che un tiro alleato viene bloccato (fino al gol).

## Tappa 11i (18/10) — livello dei tecnici
- coaches.json: `coach_passive.levels` (Lv1-10, tabelle dal repo iecrosshub) + `ref`/`sign` su ogni effetto. Kira ricostruita lineare (7/6 per livello) da Lv9=63/54 e Lv10=70/60 forniti dall'utente (il repo ha 0). La passiva di formazione non ha livelli.
- engine.js: `coachAtLevel(co, lvl)`. Builder: pannello "Livello dei miei tecnici" (0 = non ce l'ho, default 10), salvato in `iecross.coachlv.v1`; "il migliore tra tutti" usa solo i tecnici con livello > 0; il livello compare nella riga del tecnico.
- Prova: Manny Artic Lv10 = migliore (714k); a Lv1 passa avanti Seth Nichols (687k). Test 22/22.
- Non incluso nell'export della collezione.

## Tappa 11j (18/10) — nomi occidentali completi + Kira confermata
- names_west.json: elenco completo dell'utente (attachment 0c35c4b1) applicato: 15 nomi corretti, 37 aggiunti; risolti i casi ambigui (木暮夕弥 = Scott Banyan, 影野仁 = Jim Wraith, 少林寺歩 = Timmy Saunders, 源田幸次郎 = Joseph King, 土方雷電 = Thor Stoutberg, ecc.). 民山謡: l'elenco ha due righe (Constant Builder / Joseph Yosemite): tenuto Joseph Yosemite. 西垣守 = Malcolm Night, 鬼瓦源五郎 = Gregory Smith (dal repo).
- 103/124 con nome. Senza nome (nuovi, solo giapponese): Gemini Storm (ゴルレオ コラル ギグ ガニメデ カロン パンドラ グリンゴ イオ リーム レーゼ ディアム), Chaos (グレント バーラ クララ ゴッカ ボンバ ヒート ドロル リオーネ ネッパー), シン・アフロディ.
- Kira: tabella passiva livelli confermata dall'utente.
- Nota: "Heat" della squadra utente = ヒート (Chaos, id 2027), non バーン/Torch (id 2031): da verificare con l'utente.

## Tappa 11k (18/10) — pagina Tecnici + analisi squadre della community
- Nuova scheda "Tecnici" (js/coaches.js): 14 tecnici con immagine (img/coaches/*.png, dal repo iecrosshub, 896 KB), schieramento, condizioni di formazione, passiva di formazione e passiva sempre attiva per livello; il livello è condiviso col Team Builder (`iecross.coachlv.v1`). Nota: il nome giapponese della passiva ("DF&GKブースト") nei dati è un copia/incolla errato per alcuni tecnici: non mostrato.
- Analisi di due squadre forti della community (utente): Lina Schiller (Darren, Gazelle, ヒート, リオーネ, Arion, Bellatrix, Garret, Malcolm, Gabi, Hillman Giovane, Silvia) e Percival Travis (Shawn IJ, Axel IJ, Jude IJ, Austin, Nathan IJ, Thor, Hurley, Mark IJ, Jack IJ, Archer, Darren).
  - Entrambe attivano la formazione del tecnico (Kira: Darren Foresta in slot 1 = portiere in attacco; Travis: slot 1/4/9 tag IJ) e tutte le sinergie di tag (Travis: 49 effetti, 0 non soddisfatte).
  - Il motore le valuta il 62% (Kira) e 70% (Travis) della sua squadra migliore → il modello di punteggio non riproduce la scelta della community. Provato: peso per ruolo (difesa/attacco) non chiude il divario. Aggiunto `roleDamageWeight` (default 1) e le mosse di parata contano anche negli slot DF (GK in difesa, usato dalla community).
- Servono più squadre della community (tecnico + 11 giocatori in ordine) per calibrare con dati, non a intuito.

## Tappa 11l (19/10) — pagina unica Personaggi + elemento delle mosse
- Catalogo e Collezione uniti in "Personaggi": filtri omogenei (etichetta sopra ogni campo; Possesso = Tutti/In possesso/Non in possesso, Elemento, Ruolo, Rarità, Squadra, Serie, Ordina per, Azzera). Tolto "Solo dati completi" (obsoleto). Schede in possesso con livello e grado; pannello "Gestione collezione" (livello/grado per tutti, esporta/importa/svuota, immagini). Tab "La mia collezione" rimossa; i dati salvati restano compatibili.
- Nuovo `data/moves.json` (dal repo iecrosshub): elemento + nome italiano di 102 mosse → 203 mosse su 248 hanno ora l'elemento (le altre sono nuove, non presenti nel repo). Il motore applica ×1,2 se elemento mossa = elemento personaggio e il bonus "tecniche di Vento di tutti gli alleati" di Harry Savage (move_element). tools/build_site_data.py unisce moves.json.
- Altre due squadre Lina Schiller (utente): A 51% / B 77% del migliore del motore (Kira C 58%, Travis D 68%). Tutte attivano la formazione; il divario resta (A: molte 1-2★ e due Hillman). Calibrazione ancora in sospeso.
- Lingue (IT/EN/JA): fattibile a fasi — interfaccia; nomi mosse (IT dal repo per 102/121); passive IT/EN generate dalla struttura già interpretata; descrizioni mosse non presenti nei dati (solo potenza/TP/ricarica).

## Tappa 11m — Selettore lingua (fase 1)
- `js/i18n.js`: lingua it/en/ja (localStorage `iecross.lang.v1`), traduttore DOM con MutationObserver; dizionari `data/i18n/ui.json` (interfaccia, chiave = italiano, pattern {0}) e `content.json` (chiave = giapponese: squadre, tipi, serie, 119 mosse, traduzione letterale).
- Pagina Personaggi tradotta (filtri, scheda, righe tecniche). DA FARE: fase 2 passive (nome+effetto IT/EN dalla struttura parsePassive), fase 3 Team Builder + Tecnici + testi tecnico.
- Trovato sito di confronto (eljuezholden.github.io): punteggio a duelli (3 migliori tiri 40% / portiere 30% / dribbling 15% / recuperi 15%, p=r^1.5/(r^1.5+1)), zone +15/10/5%, statistiche lineari 10%@Lv1→100%@Lv440. Da usare per calibrare il motore.

## Tappa 12 — Punteggio a duelli + formula verificata (guida RR_o v1.4.0, PDF dell'utente)
- Formula verificata nel gioco: potenza = (stat x risveglio + equipaggiamento del ruolo NATIVO + bonus) x (potenza mossa + bonus) x elemento(1.2 stesso elemento) / 100, troncata. Test: Gazelle Lv440 Legendary+ Fire Blizzard = 112.456 (guida 112.436, diff. dovuta a 7230 vs 7224).
- Le statistiche del sito sono già a Legendary+ (x2): si scala x AWK[grado]/2. Equipaggiamento (tabelle per ruolo/livello nella guida) = ~75% della potenza base: implementato in engine.js (EQ_CURVE/EQ440, stima per livelli intermedi e per le stat non principali).
- Punteggio `cfg.model='duel'` (default): 3 migliori tiri (55/30/15) vs portiere rivale, portiere+2 blocchi vs tiro rivale, dribbling, contrasti; p=r^1.5/(r^1.5+1); pesi 40/30/15/15. Rivale = costanti cfg.bench (140k/125k/95k/95k a Lv440, scalate col livello).
- Bonus di potenza ora per categoria/elemento/mossa (parsePassive: pcat/pel/pname); mosse senza elemento nei dati => elemento del personaggio (stima). Debuff nemici riducono il rivale.
- Squadre community: 72-98% del migliore del motore (prima 51-77%).
- DA FARE: zone ideali S/A/B (+15/10/5% solo stat propria) non applicate; adesivi/passive di allenamento non modellati; livello tecniche assunto 10; bench da tarare; ricerca squadre da migliorare (a Lv345 la squadra B batte il "migliore").

## Tappa 13 — Pagina Boss
- `data/bosses.json` (8 prove giornaliere a rotazione, oggi 20/10 = Xavier Foster; 4 boss del club, oggi Gran gigante): dati inseriti dall'utente, uso personale. Potenza "Senza fine": attacco 650.000, difesa 500.000.
- engine: `scoreTeam(…, {allSat, cf, noScore})` (tutte le passive soddisfatte, cumulative una volta), `bossScore` (catena x1,1 tra tecniche dello stesso elemento, vantaggio +0,1, svantaggio -0,1, bonus campo +50 sui tiri in vantaggio, ordine ottimale 120 permutazioni + DP sulle mosse), `bossBest` (esaustivo sui 13 migliori + scambi), `bossClub` (3 squadre disgiunte, greedy).
- `js/boss.js` + tab Boss. Non incluso: giocatori già usati oggi, zone, adesivi, livello tecniche (assunto max).

## Tappa 14 — livello mosse, grafica Boss, cambio boss alle 22 (Roma), "Giovane"
- Collezione: livello di ogni mossa 1-10 per giocatore (default 10), localStorage `iecross.movelv.v1`, incluso in export/import; "Livello mosse per tutti" nel pannello gestione. `IECData.forLevel(c, L, grado, moveLv)` sostituisce `power` con `power_by_level[lv-1]`: vale per Team Builder e Boss.
- Boss: il giorno di gioco cambia alle 22:00 Europe/Rome (verificato con orologio simulato: 21:30 Xavier Foster, 22:15 Mark Evans). Grafica: immagine del boss (personaggio omonimo, se presente), righe con avatar, elemento e potenza.
- i18n: pattern `{0} (Barista)` -> IT "Giovane" (Joseph Yosemite).

## Tappa 15 — card orizzontali, pagina di dettaglio, omonimi, nuovo stile
- Card: immagine cliccabile a sinistra (apre `#char=ID`), a destra nome, squadra, tag, livello (campo testo numerico), grado, due tecniche con menu Lv 1-10 (default 1 per tutte). Statistiche nascoste nelle card; nel dettaglio (`js/detail.js`): statistiche Lv1/tuo/Lv440, tecniche con tabella potenza per livello, passive a tutti i livelli (anche grado), controlli collezione.
- Omonimi: `dup` per (name_ja, name_en); nome mostrato `Nome (squadra)`: Raimon, Inazuma Japan, Royal Academy, Giovane/Young (ヤングイナズマ), Giappone 2026, Raimon OB (sigle in i18n.js SHORT). Nessun file da compilare: i 14 gruppi omonimi si distinguono tutti per squadra.
- Ricerca anche sulle traduzioni (it/en): "giovane" trova Seymour Hillman (Giovane) e Joseph Yosemite (Giovane).
- Shin Aphrodi (シン・アフロディ, id 10072, Shin Zeus) aggiunto a names_west.json e chars.json.
- Stile: header a gradiente blu con ⚡, tab a pillola, card con sfumatura dell'elemento, ombre, dark mode.

## Tappa 16 — layout compatto
- Intestazione su una riga (titolo a sinistra, tab accanto, lingua a destra), filtri staccati dalla barra, contenuto a tutta larghezza (max 1760px), card tutte di uguale altezza (206px) e larghezza (griglia auto-fill 380px+).
- Nomi occidentali Chaos: Grent, Barra, Clara, Gokka, Bomba, Heat, Droll, Lionne, Nepper (chars.json + names_west.json). Gazelle/Torch restano "Gazelle"/"Torch".
- Test: livello mosse -> potenza (24 test). Squadra community E (Kira: Gazelle, Seymour Giovane, Bellatrix, Riccardo, Jude Raimon, Lionne, Garret, Goldie, Gabi, Bobby, Silvia): 89% (grado 9) / 86% (grado 5) del migliore del motore a Lv345; formazione NON attiva (slot 1 = Gazelle, serve Foresta).

## Tappa 17 (21/10)
- Card giocatori: immagine a tutta altezza sul lato sinistro (nessun padding, cover).
- Tecnici: card come i giocatori (immagine a tutta altezza, "Ce l'ho", livello a tendina Lv 1-10, dettagli in sezioni apribili); anche il pannello livelli del Team Builder usa tendine (0 = non posseduto). Tolto il commento su Lina Schiller: progressione lineare confermata.
- Nomi Gemini Storm aggiunti (Galileo, Coral, Gig, Ganymede, Charon, Pandora, Gringo, Io, Rhime, Janus, Diam). Gazelle/Torch restano così (confermato).
- Lingua fase 2: `js/passives.js` traduce le passive dei personaggi (testo e nome) in IT/EN leggendo la struttura della frase; 3440/3440 testi e 246/246 nomi coperti (`tests/passives.test.js`). Giapponese = originale. I nomi occidentali delle tecniche in EN sono quelli italiani (non esistono nomi EN nei dati). Etichette tra parentesi quadre (結束, 破竹, ecc.) tradotte liberamente da me: da verificare.
- Passive dei tecnici (testo) NON ancora tradotte (fase 3): hanno un'altra sintassi.
- Prossimo: fase 3 (Team Builder/Tecnici in EN/JA), ricerca squadre, zone ideali, esclusione giocatori già usati.
- 22/10: nomi Gazelle (2030) e Torch (2031) corretti (nei dati c'erano Bryce Whitingale / Claude Beacons per errore: confermati dall'utente "Gazelle"/"Torch").
- Calibrazione "Potenza totale" (dati utente 22/10): "Abilità complessiva" per giocatore ≈ somma delle 4 statistiche con equipaggiamento (45-49k a Lv349, quasi piatta); squadra A: Σ=522.421, totale 532.390 (+9.969). Sostituendo Gazelle con William Glass (slot 1, Foresta) la formazione di Kira si attiva e il totale diventa 639.254 (Σ=522.933): +106.864 (+20%) dovuti alla formazione. Il motore NON riproduce questo salto (bonus stat 33k→35k). Ipotesi aperta. Guida RR_o riletta: formula già implementata.

## Tappa 18 (22/10)
- Team Builder: la squadra è disegnata sul campo (una riga per ruolo della casella: FW in alto, GK in basso; numero = casella della formazione; nome con la squadra tra parentesi per gli omonimi, es. Axel Blaze (Inazuma Japan) / (Royal Academy)). Dettagli in tooltip.
- Dato utente: squadra con tecnico Seth Nichols Lv9 formazione non attiva: Σ abilità = 531.240, potenza totale 537.866 (+6.626). Con Lina non attiva: +9.969. La potenza totale è un indice del gioco, non il risultato in partita (parole dell'utente): non lo ottimizziamo.
- 22/10 (2): campo con le posizioni vere del gioco: `data/pitch_layouts.json` (13 formazioni su 14, lette dalle schermate dell'utente; manca F-Beginner → righe per ruolo). Le caselle con requisito sono cerchiate (verde ✓ soddisfatto / rosso ! no).
- CORRETTO: Igajima (F-Shuriken) ha i requisiti nelle caselle 1/5/10 (prima 2/6/11 da Gamerch): confermato dalla schermata. Tutti gli altri tecnici coincidono con le schermate (caselle e ruoli).
- 22/10 (3): Team Builder: tecnico con immagine a sinistra (nome, livello, stato formazione) + sinergie sotto; campo a destra. Nomi delle passive tradotti nelle sinergie.

## Tappa 21
- Sync Gist ripristinato (js/sync.js API Sync + syncui.js in "Gestione collezione"); test sync ok.
- Boss difesa: 4 posti con tecniche di blocco, parate (portieri) solo nell'ultimo posto (engine.bossScore/bossBest); test aggiunto (25 test).
- Scheda dettaglio Tecnico (#coach=ID) dall'immagine; nome non più cliccabile nei giocatori (solo immagine).
- Zone ideali (S +15%, A +10%, B +5%): NESSUN dato per giocatore nei nostri file; in attesa di dati dall'utente.
- Zone ideali: data/zones.json (124 personaggi, fornito dall'utente; abbinato per nome JA + ordine id per gli omonimi; controllo: solo i portieri hanno la zona 11). Mostrate nella scheda dettaglio. NON ancora nel motore: manca la mappa slot-formazione -> zona (1-11).
- Zone nel motore (Tappa 22b): data/zone_slots.json (slot formazione -> zona, 12 tecnici; protagonist=hibiki; jigiryu slot 7 dubbio "110" vuoto; kageyama_zeus mancante). Engine.setZones/zoneMult: S x1,15 / A x1,10 / B x1,05 su stat x risveglio (solo duello), usato dal Team Builder. 26 test.
- Tappa 23 (lingue fase 3): Tecnici (scheda, effetti, condizioni, sblocchi, tag), Team Builder (controlli, messaggi, sinergie, tooltip) e Boss tradotti IT/EN/JA. Testi generati in coaches.js localizzati via dizionari (re-render su iec-lang); il resto via pattern in data/i18n/ui.json (+71 voci) e content.json (sblocchi tecnici, tag). Hekyll slot 7 = zona 10. Traduzioni mie, da rivedere.
- Non tradotti: nomi tecniche dei boss (it), testi passivi dei tecnici in JA mostrati solo in JA.
- Tappa 24: 5v5 portato a 9 formazioni (aggiunte B-ブレイクスルー, B-フラットバック, B-キューブ) con zona per slot (utente, 23/10); Engine.setZoneOverride applica le zone ideali anche senza tecnico. Le passive delle formazioni B restano non note.
- Tappa 25: card giocatori più "di carattere" (barra e alone dell'elemento, anello sull'immagine, badge elemento pieno); mosse con nome troncato "…" e menù livello sempre dentro la card; TERZA MOSSA a scelta per ogni giocatore in collezione (menù con tutte le 120 mosse del gioco, default nessuna; livello 1-10; salvata in iecross.extramove.v1 e sincronizzata; usata dal Team Builder tramite IECData.forLevel(..., extra)); card Tecnici essenziali (niente menù a comparsa, dettaglio nella scheda).
- Tappa 26: Boss — riquadro "Boss di oggi" (boss in corso, tempo al cambio delle 22:00 Roma, boss di domani, pulsante) e calcolo automatico all'apertura se hai almeno 5 personaggi; 5v5 — opzione "La migliore tra tutte le formazioni" (default), le squadre mostrano il nome della formazione.
- Tappa 27: vista da cellulare (≤640px): barra sezioni in basso, card giocatore compatte (nome a capo, badge che vanno a capo), controlli a tutta larghezza, nessuno scroll orizzontale (verificato a 390px su tutte le pagine); manifest + icona per "Aggiungi a schermata Home" (senza modalità offline).
- README riscritto in inglese (link del sito, funzioni, sync, accuratezza dati, sviluppo).
- Tappa 28: due pulsanti rotondi fissi in basso a destra (GitHub + Buy me a coffee), sopra la barra in basso su mobile; README aggiornato.
- Tappa 29: pagina Novità (js/news.js + data/changelog.json, pallino sul tab), livello tecnici tolto dal Team Builder (resta solo in Tecnici), anteprima social (og:image img/og.png + meta), modelli di segnalazione in .github/ISSUE_TEMPLATE, tab mobile a 5 colonne.
- Tappa 30: boss — il calcolo usa i livelli di mossa impostati e mostra per ogni giocatore la mossa usata + livello (+ "terza mossa"); boss del club senza rotazione giornaliera (niente "oggi"); pagina Novità con hero, scorciatoie e cronologia (solo funzioni, niente piccoli fix); pulizia commenti/testi vecchi (header engine, unlocks, nota boss), DATI_DA_VERIFICARE.md riscritto, eliminati i fogli *_DA_COMPILARE.md. 29 test.
- Tappa 31: nomi mosse Técnica 13016/19011 tradotti (IT dall'utente, EN provvisorio); changelog fetch no-cache; cache-busting ?v=30 su css/js.
- Tappa 32: prove di difesa escludono Scivolata Micidiale (non blocca i tiri); nome IT unificato.
- Calibrazione: salvati i dati della partita 25/10 in data/calibration/ (da chiarire attribuzione squadre e dati del tecnico Lina Sheerer).
- Calibrazione 25/10: chiarita attribuzione; Lina Schiller = kira (già nei dati); potenza per giocatore non scomponibile senza schermata di dettaglio.
- Calibrazione 26/10: 3 schermate (FW/DF/GK). Equip. del modello ~3,5% troppo alto a Lv351; pesi di 選手総合能力 per ruolo da determinare (servono MF + altri punti).
- Tappa 33: curva equipaggiamento corretta (punti 350/352 x0,965) da 7 schermate; 総合能力 per ruolo ancora non determinato.
- Tappa 34: passive di tempra (js/training.js, 3 slot per personaggio, chiave iecross.training.v1, in engine/builder/boss/export/sync); changelog 1.5.
- Tappa 35: equipaggiamento con limite EQ_CAP=350 (punto 352 rimosso, Engine.setEquipCap per la guida RR_o a 440); 3 passive di tempra sempre insieme (le altre due si riempiono da sole); chiusi Ray Dark / passive 5v5 B / 総合能力.
- Tappa 36: scheda a due livelli (foto+dettagli / mosse e tempra a tutta larghezza), Novità pagina iniziale e prima scheda, nomi tempra 'giapponese (traduzione)', equipaggiamento a scatti di 5 (EQ_CAP 350), versione 1.6 nel footer (serve per verificare quale build è online).
- Tappa 37: numero di versione file ?v=36 (la cache del browser serviva i vecchi js/css con ?v=30).
- 27/10: dati Wandaba (solo zone) e due Halloween (10073, 10074) raccolti in data/staging/nuovi_2026-10-27.md; non inseriti: mancano nomi giapponesi, stelle, stat Lv1, valori Wandaba.
- Tappa 38: aggiunti Wandaba (15° tecnico: dati, zone, layout, immagine) e i due Halloween 10073/10074 (126 personaggi); ritratto di Kira aggiornato; changelog 1.7.
- Tappa 39: adesivi (シール) da iecrossdb.com/sellos: 58 principali + 84 secondari (js/stickers.js), 5 posti per personaggio (1+4) con livello, effetto per ruolo [FW/MF/DF/GK] e per elemento, effetti a evento con fattore condizionale 0.5; engine `setStickers/stickerBonus`; UI nella scheda collezione; export/import `stickers`; changelog 1.8.
- Tappa 40: prove di difesa Boss: whitelist delle mosse con tag «Blocca tiro» (30 nomi JA, elenco utente da iecrossdb.com/jugadores) al posto della sola esclusione di Scivolata Micidiale; escluse anche Ciclone, Ciclone Blu, Terremoto, Tackle Fulmineo, Difesa a Spirale, Palude di Mani, Lama d'Energia, Cinta di Nebbia, Fotone Flash, Torre Gigante.
- Tappa 41: Personaggi più veloce (select di passive/adesivi/terza mossa riempite solo all'apertura: da ~10.800 a ~900 opzioni per 18 schede); rimossi gli interruttori dei tag non confermati (confermato dall'utente); changelog 1.9. Calibrazione Silvia: statistica base motore 20.363 vs gioco 20.440, potenza Mano Divina 123 = gioco; scarto nei bonus a inizio partita (ipotesi: passiva 救援/累 che si somma a ogni blocco fallito).
- Tappa 42: boss difesa: passive con trigger 失敗 (blocco fallito) a peso pieno (idea dell'utente: i compagni precedenti non bloccano mai). Calibrazione squadra Xavier Foster: totale motore 394.605 -> 426.966 (gioco 448.080, -4,7%). Non applicato l'accumulo per ogni compagno (sovrastima Silvia).
- Tappa 43: pulizia DATI_DA_VERIFICARE (zone boss, tag 3+, Tayama/Nikaido/Kira/Kidou confermati; voci obsolete tolte: adesivi, stat mancanti, roster).
- Tappa 44: bonus tecnici 推奨 = ruolo dello slot (confermato dall'utente), non ruolo nativo; Kuon e Mashiya confermati; DATI_DA_VERIFICARE aggiornato.
- Tappa 44 (corretta): 推奨FW = giocatore FW in slot FW (entrambe le condizioni); un MF in slot FW non riceve il bonus del tecnico.
- Tappa 45: nomi inglesi mosse Halloween (Diabolical Cut, Wind God's Dance, Clone Penguin), Wandaba = Wonderbot e nome EN della passiva del tecnico; voce 'nomi occidentali dei tecnici' chiusa (elenco fornito dall'utente il 18/10).
- Tappa 46: calibrazione con totali squadra del gioco (Nikaido, Lv354): formazione attiva = x1,20 sul totale; zone A +8%, S +12% (prima 10/15%), B +4% assunto; engine esporta eqAt. Test passati.
- Tappa 47: dati utente 29/10 (Jude slot 6 54.713, Celia slot 5 47.146, Silvia slot 11 52.290): zone B +4,0% e S +11,4% confermate; formazione attiva solo con 11 slot pieni (engine); zona slot 6 di Nikaido rimossa (ignota).
- Tappa 48: zone Jude IJ corrette (S5 A7 B2, utente) e Raimon scambiato; Nikaido slot 6 = campo 4 ripristinato.
- Tappa 48b: zone ricontrollate sull'elenco originale dell'utente: tutti i 124 set coincidono; solo i Kidou erano abbinati per ordine sbagliato (corretto).
- Tappa 48c: zone Jude: IJ S5 A7 B2, Nazionale 2026 S4 A5 B7 (utente), Raimon S5 A7 B9 (dedotto).
