# Dati da verificare nel gioco

Elenco di ciò che non è stato possibile ricavare dalle fonti web e che cambia i risultati del Team Builder. Per ogni punto basta una risposta breve (anche una foto della schermata, trascritta). Le voci sono ordinate per importanza.

## 1. Tecnici (監督) e formazioni — il punto più importante
Il Team Builder oggi **non considera i tecnici** né i bonus di formazione.
- [ ] Elenco di **tutti i tecnici** disponibili (nome, rarità, come si ottengono).
- [ ] Per ogni tecnico: la **formazione** (schema dei 11 slot numerati ①-⑪, con ruolo e posizione di ognuno).
- [ ] **Passiva di formazione** e **passiva del tecnico**, con testo e numeri esatti, condizioni (es. "②火", "⑥山": significa "lo slot ② deve avere un giocatore di Fuoco"?), eventuali limiti per ruolo o per giocatore, e se crescono con il livello o le copie.
- [ ] Il **tecnico si usa anche nel 5 contro 5**? Quali formazioni/bonus valgono lì?
- [ ] Il **tecnico è obbligatorio** o si può giocare senza? Cosa cambia senza.
- [ ] Ci sono altre formazioni a 11 senza tecnico, o la formazione è sempre legata al tecnico?

## 2. Posizione in campo
- [ ] **得意エリア** (zona preferita): il bonus ai parametri quando il giocatore è nella sua zona, di quanto e quali zone esistono.
- [ ] Un giocatore può giocare **fuori ruolo** (es. un MF in un slot FW)? Con quale penalità?
- [ ] Numero di giocatori in squadra: titolari 11 e **riserve/panchina**? Le passive valgono per le riserve?

## 3. Tag e passive
- [ ] Come funziona il conteggio "**3 persone o più** con tag X": conta anche il giocatore che ha la passiva?
- [ ] Il giocatore che ha la passiva (味方 = alleati) ottiene il bonus anche lui?
- [ ] **Quali personaggi hanno il tag 雷門** (la schermata del personaggio mostra i tag?). In particolare: 雷門OB, 革命の雷門, i 無所属 (Raimon Souichirou, Kabeyama Saku, Onigawara, Gouenji Yuuka, Otani Tsukushi) e 日本代表2026 per イナズマジャパン.
- [ ] "雷門と帝国タグ" e "雷門または…タグ": basta uno dei due tag o servono entrambi?
- [ ] **ADVANCED / ADVANCED+**: quante copie servono (3 / 6 / 8?) e cosa sbloccano; livello massimo dei personaggi; Lv11 e Lv41 sono livelli del personaggio?
- [ ] Due versioni dello stesso personaggio (es. Hibiki ヤングイナズマ e 老, i vari Kidou) possono giocare **insieme** nella stessa squadra?

## 4. Come si calcola la forza
- [ ] C'è un valore di **"potere squadra"** (総合力) in gioco? Come è composto?
- [ ] Quali parametri contano di più per ruolo (Calcio, Tecnica, Blocco, Presa)? Come si confronta Calcio del tiratore con Presa del portiere?
- [ ] Quanto vale un punto di **potenza tecnica** rispetto a un punto di parametro (es. +50 potenza ≈ quanti punti Calcio)?
- [ ] **Vantaggio di elemento**: moltiplicatori numerici (oggi si sa solo il ciclo Vento > Montagna > Fuoco > Foresta > Vento).

## 5. Statistiche mancanti (65 personaggi su 124)
Servono Calcio / Tecnica / Blocco / Presa (e Velocità) **al livello massimo**. Elenco in `data/parts/` dei personaggi con `kick: null`. Se è più comodo: i valori tipici per **rarità e ruolo** (★1, ★2, ★3 × GK/DF/MF/FW) permettono di sostituire le stime.

## 6. Valori incerti nelle fonti
- [ ] Kidou ★3 (Teikoku): valore passiva ★3 "1829"
- [ ] Midorikawa: valore "2926"
- [ ] Kirino ★3: passiva Lv11 "67" o "1545"?
- [ ] Hiroto: Calcio 7394 o 5670?
- [ ] Ukijima ★1/★2, Kinako/Fei (pagine scambiate nella fonte)
- [ ] Nomi inglesi/romaji non verificati: Suizenji, Nata, Yuukoku, Tamiyama, Sugata, Ukijima, Taylor, Hephaistos e i personaggi con nome inglese `null`.

## 7. Completezza
- [ ] Il roster è di 124 voci al 13/10/2026 (ver1.4). Ci sono personaggi giocabili **mancanti** o aggiunti dopo?

---
## Aggiornamento 15/10 — risposte ricevute e nuove domande
**Risposte ricevute:** giocatori liberi in qualsiasi slot (anche fuori ruolo), nessuna riserva; zone preferite ignorate (bonus trascurabile); il giocatore con la passiva conta nel "3 o più" (probabile, non certo) e riceve il proprio bonus; tutti i personaggi hanno tag squadra + tag tipo di giocatore + tag serie; ADVANCED/ADVANCED+ sempre al massimo; livello massimo 440; due versioni dello stesso personaggio possono giocare insieme.

**Nuove domande (tecnici):**
- [ ] `data/coach_layouts_DA_COMPILARE.md`: layout (numero di FW/MF/DF/GK) di ciascuna delle 14 formazioni.
- [ ] 推奨FW/DF/MF/GK nei bonus del tecnico: è la **posizione consigliata del personaggio** (come nel catalogo) o il **ruolo dello slot** in cui lo metti?
- [ ] Condizioni della passiva di formazione ("②FW, ⑤MF, ⑪GK", "①山 ②火 ③風"): servono i giocatori **con quell'attributo negli slot indicati**? Se sono soddisfatte solo in parte, il bonus si riduce ("indebolisce") e di quanto?
- [ ] Nelle passive dei personaggi "味方FW": conta la posizione **del personaggio** o quella **dello slot** in cui gioca?
- [ ] Il **tecnico è obbligatorio**? Nel 5 contro 5 vale la sua passiva? Passive delle formazioni B?
- [ ] Livello massimo dei tecnici (10?) e valori coach al livello massimo: ho usato Lv10 ma alcune fonti sono incoerenti (Tayama: 400 o 40? Nikaido Striker: 89 o 85? Kuon: MF o DF per il dribbling? Mashiya: Tecnica o Presa per gli MF?).
- [ ] Esistono tecnici nuovi dopo ver1.4? (trovati 14)
- [ ] Tag serie dei personaggi: elenco delle serie (イナイレ1/2/3/GO1…, イナイレクロス) e se compaiono nelle passive/tecnici.

## Aggiornamento 15/10 (sera)
Risolto dall'utente: ruoli liberi, nessun tecnico in 5v5, layout dei 14 tecnici, ADVANCED sempre al massimo, versioni duplicate ammesse.
Ancora aperti: (1) passive delle formazioni B del 5v5; (2) "推奨FW/DF/MF/GK" = ruolo nativo? (3) "味方FW" nelle passive dei personaggi = ruolo dello slot o nativo? (4) i conteggi tag includono chi ha la passiva? (5) nomi tecnici tradotti da Google: confermare "Allius"=Kageyama世宇子 e Terra/Tayama/Toyama; (6) stat mancanti dei 65 personaggi.
