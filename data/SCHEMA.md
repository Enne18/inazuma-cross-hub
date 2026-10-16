# Schema personaggio (data/parts/*.json = array di questi oggetti)

| Campo | Tipo | Note |
|---|---|---|
| id | string | id pagina fonte (univoco, distingue le versioni dello stesso personaggio) |
| source_url | string | pagina da cui sono presi i dati |
| name_ja / name_en | string | nome giapponese / inglese (romaji) |
| version | string/null | etichetta versione (es. イナズマジャパン, 雷門中, 帝国学園) |
| rarity | number | 1-3 |
| element | "Fire"/"Wind"/"Forest"/"Mountain" | vedi meta.json |
| position | "GK"/"DF"/"MF"/"FW" | |
| type_ja, team_ja, series_ja | string | tipo, squadra, opera di provenienza |
| tags_ja | string[] | tag per le sinergie (squadra + eventuali altri tag letti nelle passive) |
| rating | {best, reroll} | giudizio della fonte (SS/S/A/...), non dato di gioco |
| stats_max | {tp,kick,technique,block,catch,speed} | statistiche massime; kick/technique/block/catch possono essere null se la fonte non le pubblica |
| skills[] | {name_ja,name_en,unlock,tp,power,crit,range,chain,category,foul?} | chain: true/false/null; category: shoot/dribble/block/keeper/null |
| passives[] | {name_ja,effect_ja,effect_en,unlock} | unlock: 初期, Lv11, ADVANCED, ADVANCED+, Lv41 |
| verified | "ok"/"parziale"/"mancante" | affidabilità |
| notes | string[] | dubbi, dati dedotti |
| checked_on | date | data di lettura |

Regole: campo non trovato = null (mai inventato). Dati dedotti vanno dichiarati in `notes` e, se incerti, `verified` = "parziale".
Lotti: un file ogni 8 personaggi, nome `chars_<primo>-<ultimo>.json` (numero = idx in roster_index.json), registrato in data/index.json.
