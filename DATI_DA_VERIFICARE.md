# Dati da verificare / ancora aperti

Cosa non si è potuto ricavare con certezza e cambia i risultati. Una risposta breve o una schermata del gioco basta. (Questo elenco sostituisce quello delle prime versioni: le domande già risolte sono state tolte.)

## Aperti
- [ ] **Totale squadra del gioco** (dati utente 29/10, Nikaido, Lv354): totale = (somma delle potenze delle schede + bonus zone ideali) × 1,20 se la formazione è attiva, altrimenti ×1 (esatto: (554.340 + 5.315) × 1,2 = 671.586). La formazione si attiva solo con tutti gli 11 slot pieni (confermato). Il motore non riproduce il totale né la potenza della scheda (dipende da equipaggiamento/passive/adesivi di ciascuno).
- [x] **Tag opzionali** (日本代表2026, 雷門OB, 革命の雷門): confermato dall utente (28/10) che NON contano come イナズマジャパン / 雷門; interruttori rimossi.
- [ ] **Traduzioni EN/JA** del sito e le etichette delle passive (結束 Coesione/Unity, 破竹 Slancio/Momentum, 阻止 Parata/Stop, 連動 Sinergia/Link, 共鳴 Risonanza…): sono traduzioni libere, da rivedere.

## Confermati dall'utente
Zone: ricontrollate tutte le 124 righe dell'elenco dell'utente (29/10): l'unico omonimo abbinato male era Kidou (corretto), gli altri coincidono. Jude: Inazuma Japan S5 A7 B2 e Nazionale 2026 S4 A5 B7 (confermati 29/10); Raimon S5 A7 B9 dedotto per esclusione, Teikoku A2 A5 B7. Nikaido slot 6 = campo 4 (confermato 29/10); lo scarto di Jude era un errore nelle zone del personaggio: Jude Inazuma Japan = S5 A7 B2. Zone ideali (misura 29/10): Tyler A +8,1%, Axel S +12,3%, Celia B +4,0%, Silvia S +11,4%: motore A +8%, S +12%, B +4%. Formazione attiva solo con squadra completa a 11. Zone ideali nelle prove boss: non contano (28/10). Conteggio "3 o più" con tag: include chi ha la passiva (28/10). Tayama: potenza Vento +40 (non 400); Nikaido: Striker +85 (non 89); Kira: lo slot 6 può essere Foresta o Vento (28/10). Kidou: 3 versioni ★3 e quella Teikoku/Royal Academy ★2, statistiche del sito coincidenti con le tue (28/10). Roster: aggiornato dall'utente quando escono nuovi personaggi. Bonus dei tecnici "推奨FW/MF/DF/GK": valgono solo per i giocatori di quel ruolo (scheda) posizionati in uno slot di quel ruolo: un MF in uno slot FW non riceve il bonus FW (28/10). Kuon: passiva tecnico +87 shoot a FW e +87 dribbling a MF con tag イナズマジャパン; passiva formazione +40 shoot ai FW e +40 block ai DF (28/10). Mashiya: +4200 ai MF è Tecnica (28/10). Ruoli liberi in qualsiasi slot; nessuna riserva; nessun tecnico nel 5v5; layout, posizioni e zone di 13 tecnici su 14; formazione attiva solo se tutte le condizioni sono soddisfatte (la passiva sempre attiva del tecnico vale comunque); livello massimo dei personaggi 440; due versioni dello stesso personaggio possono giocare insieme; ogni personaggio ha tag di squadra, di tipo e di serie.

## Nomi delle mosse segnalati dall'utente
- "Técnica 13016" = Avvitamento esplosivo; "Técnica 19011" = Salto temporale (fonte: utente 25/10). I nomi inglesi ("Explosive Screw", "Time Jump") e giapponesi sono miei/da trovare.

## Tecniche di blocco che non fermano i tiri
- Segnalato dall'utente: Scivolata Micidiale (キラースライド) è di blocco ma non blocca i tiri → esclusa dalle prove di difesa. Sostituito il 28/10 da un elenco di mosse ammesse (`SHOT_BLOCK`, js/engine.js).

## Passive tempra
- Valori da iecrossdb.com/entrenamiento (26/10). Non confermato: se la 選手総合能力 le includa e con che peso. Osservazione utente: Tenma (stat identiche) è passato da 46.541 a 48.091 (+1.550) dopo aver impostato Potenza dribbling+〈Vento〉 Lv7, Potenza dribbling+ Lv2, Potenza tiro+ Lv5; lo stato precedente delle passive non è noto.
- Non verificato se le statistiche Tiro+/Tecnica+/... aumentino le stat mostrate o solo in partita; il sito le somma alle stat.


## Chiusi dall'utente (26/10)
- Ray Dark: nessuna mappa zone, nessuna azione. Formazioni 5v5: nessuna passiva propria (i giocatori mantengono le loro). 選手総合能力: non determinabile, non modellata.
- Passive di tempra: sono sempre 3 insieme. Equipaggiamento: scatti di 5 livelli, limite 350 oggi.
- Prima/dopo di Tenma: 46.541 (nessuna passiva) → 48.091 (Potenza dribbling+〈Vento〉 Lv7, Potenza dribbling+ Lv2, Potenza tiro+ Lv5; 110000 monete + 5 oggetti).
## Wandaba e Halloween (27/10)
- Wandaba (inglese: Wonderbot; passiva tecnico "Inazuma Eleven Cross, MF and FW power boost", testi inglesi confermati dall'utente 29/10): nome giapponese della passiva del tecnico e metodo di sblocco non noti; valori ai livelli 2-9 ipotizzati lineari (Lv1 = 6, Lv10 = 60 confermati); tag イナイレクロス assunto uguale agli altri personaggi.
- Nathan Swift / David Samford (Halloween): valori delle passive ai livelli intermedi riscalati da passive simili (stimati); passive ADVANCED+ stimate ai gradi Advanced+/Top+ (solo il valore a Legendary+ è dato dal sito); nomi inglesi delle mosse confermati dall'utente (29/10: Diabolical Cut, Wind God's Dance, Clone Penguin); immagini dal sito dei dati (potrebbero non esserci ancora).

## Adesivi (28/10)
- Nomi italiani/inglesi degli adesivi sono etichette di servizio (non ufficiali); i nomi giapponesi vengono dalla pagina.
- Adesivi: sono modellati (1 principale + 4 secondari per personaggio). Non e modellato l'inventario degli adesivi (ognuno su un solo giocatore): l'utente puo assegnare lo stesso adesivo a piu personaggi.
- Gli adesivi a evento (破竹, 連動, ecc.) usano il fattore condizionale 0.5 (stima). La rarita degli adesivi non e indicata dalla pagina.

- Mosse "Blocca tiro" (28/10): elenco fornito dall utente; mappatura nomi IT->JA fatta da me sui personaggi (Furia Stellare = アステロイドベルト, Gravità Massima = グラビテイション, Muro di Fiamme = バーンアウト, Buco Nero/Tunnel Spaziale = ブラックホール/ワームホール). Le mosse non in elenco sono escluse anche se future: aggiornare SHOT_BLOCK in engine.js con i nuovi personaggi.

## Calibrazione boss difesa Xavier Foster (28/10)
- Squadra Goldie/Garret/Seymour(Il Muro)/Jack/Silvia: motore 394.605, gioco 448.080 (parziali gioco: 59.479 / 113.483 / 134.816 / 249.425 / 448.080). Passive tempra e adesivi sono inclusi nel calcolo (verificato riproducendo il totale in locale). Scarto per giocatore (gioco/motore): Goldie 0,996, Garret 1,023, Seymour 1,305, Jack 1,07 (catena inclusa), Silvia 1,25. Causa non nota; da chiarire livello reale de Il Muro di Seymour (Lv6 darebbe ~21.200) e potenza mostrata in gioco per Silvia/Jack.
- Silvia Woods Lv354 (28/10): stat base gioco catch 20.440 vs motore 20.363 (ok); Mano Divina Lv10 potenza 123 (ok). Il divario nella prova boss sta nei bonus a inizio partita/eventi. Ipotesi: 【救援/累】キーパーパワー＋ (+49 per ogni blocco fallito dei compagni) si accumula; il motore usa un fattore fisso.

- Boss difesa (28/10): con le passive di blocco fallito a peso pieno il motore dà 426.966 contro 448.080 del gioco (-4,7%). Residui: Seymour 16.513 vs 21.333, Jack 107.569 vs 114.609, Silvia 189.653 vs 198.655; Goldie e Garret entro 1,5%. L'accumulo "per ogni blocco fallito" (x4 su Silvia) sovrastimerebbe: la passiva sembra scattare meno volte o con altro peso. Da chiarire.

