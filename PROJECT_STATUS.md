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
