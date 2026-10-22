/* Traduzione delle passive (testo giapponese del gioco → italiano / inglese).
   Non usa un dizionario di frasi: legge la struttura (quando / condizione / effetti / fine) e la riscrive.
   Se una frase non è riconosciuta tutta, restituisce null e il chiamante mostra l'originale.
   UMD: browser (window.IECPassives) e Node (test). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.IECPassives = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var movesIt = {};      // nome giapponese tecnica → nome italiano
  var ext = null;        // funzione opzionale (ja, lang) → testo tradotto (tag, squadre)
  function setMoves(m) { movesIt = {}; Object.keys(m || {}).forEach(function (k) { var n = (m[k] && m[k].name_it) || ''; movesIt[k] = n.replace(/\s*\(.*\)\s*$/, ''); }); }
  function setExternal(fn) { ext = fn; }

  var ELJ = '火風林山';
  var EL = { it: { '火': 'Fuoco', '風': 'Vento', '林': 'Foresta', '山': 'Montagna' }, en: { '火': 'Fire', '風': 'Wind', '林': 'Forest', '山': 'Mountain' } };
  var TAGS = {
    '雷門': { it: 'Raimon', en: 'Raimon' }, '帝国': { it: 'Royal Academy', en: 'Royal Academy' }, 'イナズマジャパン': { it: 'Inazuma Japan', en: 'Inazuma Japan' },
    'カオス': { it: 'Caos', en: 'Chaos' }, 'ジェミニストーム': { it: 'Gemini Storm', en: 'Gemini Storm' }, 'ヤングイナズマ': { it: 'Young Inazuma', en: 'Young Inazuma' },
    '木戸川清修': { it: 'Kidokawa Seishu', en: 'Kidokawa Seishu' }, '世宇子': { it: 'Zeus', en: 'Zeus' }, 'ストライカー': { it: 'Attaccante', en: 'Striker' },
    '稲妻KFC': { it: 'Inazuma KFC', en: 'Inazuma KFC' }
  };
  function tagName(ja, L) {
    if (ext) { var r = ext(ja, L); if (r && r !== ja) return r; }
    return TAGS[ja] ? TAGS[ja][L] : ja;
  }
  function moveName(ja, L) { return movesIt[ja] || ja; }

  function norm(s) { return String(s).normalize('NFKC').replace(/\s+/g, ' ').trim(); }

  // ---------- soggetti ----------
  var SUBJ_TOKENS = /(自身|味方|敵|FW|MF|DF|GK|選手|[火風林山]属性|と|の|または|を持つ)/g;
  function isSubject(s) {
    if (!s) return false;
    var t = s.replace(/[^\s]+?タグ/g, '');
    return t.replace(SUBJ_TOKENS, '') === '';
  }
  function parseSubject(s) {
    var S = { side: 'ally', pos: [], elems: [], tags: [] };
    if (/^自身/.test(s)) S.side = 'self'; else if (/敵/.test(s)) S.side = 'enemy';
    var m, re = /(FW|MF|DF|GK)/g; while ((m = re.exec(s))) if (S.pos.indexOf(m[1]) < 0) S.pos.push(m[1]);
    re = /([火風林山])属性/g; while ((m = re.exec(s))) if (S.elems.indexOf(m[1]) < 0) S.elems.push(m[1]);
    var tg = /([^\s]*?)タグ/.exec(s.replace(/[火風林山]属性(?:と[火風林山]属性)*の?/g, '').replace(/^(自身|味方|敵|選手|の|FW|MF|DF|GK)+/, ''));
    if (tg) S.tags = tg[1].split(/と|または/).filter(Boolean);
    return S;
  }
  var POSN = {
    it: { FW: ['gli attaccanti', 'attaccante'], MF: ['i centrocampisti', 'centrocampista'], DF: ['i difensori', 'difensore'], GK: ['il portiere', 'portiere'] },
    en: { FW: ['forwards', 'forward'], MF: ['midfielders', 'midfielder'], DF: ['defenders', 'defender'], GK: ['goalkeeper', 'goalkeeper'] }
  };
  function elList(a, L, sep) { return a.map(function (x) { return EL[L][x]; }).join(sep); }
  function subjText(S, L) {
    var it = L === 'it', out;
    var side = S.side, pos = S.pos;
    if (side === 'self') out = it ? 'il giocatore' : 'the player';
    else if (!pos.length) out = side === 'ally' ? (it ? 'gli alleati' : 'allies') : (it ? 'gli avversari' : 'opponents');
    else {
      var names = pos.map(function (p) { return POSN[L][p][0]; });
      if (it) out = names.join(' e ') + (side === 'ally' ? ' alleati' : ' avversari');
      else out = (side === 'ally' ? 'allied ' : 'opposing ') + names.join(' and ');
      if (it && pos.length === 1 && pos[0] === 'GK') out = side === 'ally' ? 'il portiere alleato' : 'il portiere avversario';
      else if (it && pos.indexOf('GK') >= 0) out = out.replace(/ alleati$/, ' alleati').replace(/ avversari$/, ' avversari');
    }
    if (S.elems.length) out += it ? ' di elemento ' + elList(S.elems, L, ' o ') : ' with ' + elList(S.elems, L, ' or ') + ' element';
    if (S.tags.length) out += (it ? ' con tag ' : ' with the ') + S.tags.map(function (t) { return tagName(t, L); }).join(it ? ' o ' : ' or ') + (it ? '' : ' tag');
    return out;
  }
  function isSingular(S) { return S.side === 'self' || (S.pos.length === 1 && S.pos[0] === 'GK'); }

  // ---------- categorie di tecniche / tecniche singole ----------
  var CAT_BASE = { 'シュートブロック技': 'shotblock', 'ドリブルブロック技': 'dribblock', 'シュート技': 'shoot', 'ドリブル技': 'dribble', 'ブロック技': 'block', 'キーパー技': 'keeper', '技': 'all' };
  var CATN = {
    it: { shoot: 'di tiro', dribble: 'di dribbling', block: 'di blocco', keeper: 'di parata', shotblock: 'di blocco del tiro', dribblock: 'di blocco del dribbling', all: '' },
    en: { shoot: 'shot', dribble: 'dribble', block: 'block', keeper: 'keeper', shotblock: 'shot-block', dribblock: 'dribble-block', all: '' }
  };
  var EL_ALT = '[火風林山]属性';
  function parseOneCat(s) {
    var m = /^((?:[火風林山]属性)(?:と[火風林山]属性)*)の(.+)$/.exec(s), elems = [], base = s;
    if (m) { elems = m[1].match(/[火風林山]/g); base = m[2]; }
    else { m = /^([火風林山])属性(.+)$/.exec(s); if (m) { elems = [m[1]]; base = m[2]; } }
    if (CAT_BASE[base]) return { elems: elems, cat: CAT_BASE[base] };
    return { elems: elems, move: base };
  }
  function parseCats(s) {
    if (!s) return null;
    var whole = parseOneCat(s);
    if (whole.cat || /^((?:[火風林山]属性)(?:と[火風林山]属性)*)の/.test(s)) return [whole];
    var parts = s.split('と'), out = [];
    if (parts.length > 1) {
      for (var i = 0; i < parts.length; i++) out.push(parseOneCat(parts[i]));
      if (out.every(function (o) { return o.cat; })) return out;
    }
    return [whole];
  }
  function catText(c, L) {
    var it = L === 'it';
    if (c.move) return (it ? 'potenza di «' : 'power of «') + moveName(c.move, L) + '»' + (c.elems.length ? '' : '');
    var el = c.elems.length ? elList(c.elems, L, it ? ' e ' : ' and ') : '';
    if (it) {
      var base = c.cat === 'all' ? (el ? 'potenza delle tecniche di ' + el : 'potenza di tutte le tecniche') : 'potenza delle tecniche ' + CATN.it[c.cat] + (el ? ' di ' + el : '');
      return base;
    }
    return (el ? el + ' ' : '') + (c.cat === 'all' ? 'move power' : CATN.en[c.cat] + ' move power');
  }

  // ---------- statistiche ----------
  var STATJ = { 'キック': 'kick', 'テクニック': 'technique', 'ブロック': 'block', 'キャッチ': 'catch', 'スピード': 'speed', '最大TP': 'maxtp', '全パラメータ': 'all' };
  var STATN = {
    it: { kick: 'Calcio', technique: 'Tecnica', block: 'Blocco', catch: 'Presa', speed: 'Velocità', maxtp: 'TP massimi', all: 'tutti i parametri' },
    en: { kick: 'Kick', technique: 'Technique', block: 'Block', catch: 'Catch', speed: 'Speed', maxtp: 'Max TP', all: 'all stats' }
  };
  var ATTRN = {
    it: { range: 'portata', crit: 'probabilità di critico', foul: 'probabilità di fallo', chain: 'probabilità di catena di tiro', tpcost: 'costo in TP' },
    en: { range: 'range', crit: 'critical rate', foul: 'foul rate', chain: 'shot chain rate', tpcost: 'TP cost' }
  };
  var STATRE = '(?:キック|テクニック|ブロック|キャッチ|スピード|最大TP|全パラメータ)';
  var ATTRS = { '消費TP': 'tpcost', '射程': 'range', 'クリティカル率': 'crit', 'ファウル率': 'foul', 'シュートチェイン確率': 'chain' };

  // ---------- effetti ----------
  function parseEffects(r, startPrev) {
    var out = [], prev = startPrev || null;
    var m;
    r = r.trim();
    var rx = /([^]*?)(?:を|が)?\s*(-?\d+(?:\.\d+)?)(%?)\s*(上昇|減少)\s*/g;
    var last = 0;
    while ((m = rx.exec(r)) && m.index === last) {
      last = rx.lastIndex;
      var p = m[1].replace(/\s+/g, ''), n = parseFloat(m[2]);
      if (m[4] === '減少') n = -Math.abs(n); else n = Math.abs(n) * (m[2].charAt(0) === '-' ? -1 : 1);
      var e = { n: n, pct: !!m[3], S: null, kind: null };
      var thing = '';
      var am = /(消費TP|射程|クリティカル率|ファウル率|シュートチェイン確率)$/.exec(p);
      var stm = new RegExp('(' + STATRE + '(?:[とと&]' + STATRE + ')*)$').exec(p);
      if (am) { e.kind = 'attr'; e.attr = ATTRS[am[1]]; thing = p.slice(0, am.index).replace(/の$/, ''); }
      else if (/威力$/.test(p)) {
        e.kind = 'power';
        thing = p.replace(/の技威力$/, '').replace(/の威力$/, '').replace(/威力$/, '');
        if (/技威力$/.test(p) && !/の技威力$/.test(p)) thing = p.replace(/威力$/, '');
      } else if (stm) { e.kind = 'stat'; e.stats = stm[1].split(/[と&]/).map(function (x) { return STATJ[x]; }); thing = p.slice(0, stm.index).replace(/の$/, ''); }
      else return null;
      // soggetto / categoria
      var subjStr = '', rest = thing;
      if (e.kind === 'stat') { subjStr = thing; rest = ''; }
      else if (thing) {
        var idx = -1, k = thing.indexOf('の');
        while (k >= 0) {
          var left = thing.slice(0, k), right = thing.slice(k + 1);
          if (isSubject(left) && right) { idx = k; break; }
          k = thing.indexOf('の', k + 1);
        }
        if (idx >= 0) { subjStr = thing.slice(0, idx); rest = thing.slice(idx + 1); }
        else if (isSubject(thing) && e.kind === 'attr') { subjStr = thing; rest = ''; }
        else rest = thing;
      }
      if (subjStr) { if (!isSubject(subjStr)) return null; e.S = parseSubject(subjStr); }
      else e.S = prev ? prev.S : { side: 'ally', pos: [], elems: [], tags: [] };
      if (e.kind === 'power') { e.cats = parseCats(rest); if (!e.cats) return null; }
      if (e.kind === 'attr') {
        if (rest) { e.cats = parseCats(rest); }
        else if (!subjStr && prev && prev.cats && prev.cats[0] && prev.cats[0].move) e.cats = prev.cats;
      }
      out.push(e); prev = e;
    }
    if (last !== r.length || !out.length) return null;
    return out;
  }
  function sgn(n, pct) { return (n < 0 ? '−' : '+') + Math.abs(n) + (pct ? '%' : ''); }
  function effItem(e, L) {
    var it = L === 'it', s = sgn(e.n, e.pct);
    if (L === 'en' && e.n < 0 && (e.kind === 'stat' || e.kind === 'power')) s = String(Math.abs(e.n));
    if (e.kind === 'stat') return { t: e.stats.map(function (x) { return s + ' ' + STATN[L][x]; }).join(it ? ' e ' : ' and ') };
    if (e.kind === 'power') {
      if (e.cats.length === 1 && e.cats[0].move) return { t: s + (it ? ' potenza' : ' power'), mv: e.cats[0].move };
      return { t: e.cats.map(function (c) { return s + ' ' + catText(c, L); }).join(it ? ' e ' : ' and ') };
    }
    var o = { t: s + ' ' + ATTRN[L][e.attr] };
    if (e.cats && e.cats[0].move) o.mv = e.cats[0].move;
    return o;
  }
  function joinItems(items, L) {
    var it = L === 'it', mvs = items.map(function (x) { return x.mv || ''; });
    var same = mvs[0] && mvs.every(function (m) { return m === mvs[0]; });
    var ts = items.map(function (x) { return x.t + (!same && x.mv ? (it ? ' di «' : ' of «') + moveName(x.mv, L) + '»' : ''); });
    var out = ts.length > 1 ? ts.slice(0, -1).join(', ') + (it ? ' e ' : ' and ') + ts[ts.length - 1] : ts[0];
    if (same) out += (it ? ' di «' : ' of «') + moveName(mvs[0], L) + '»';
    return out;
  }
  function effectsText(list, L) {
    var it = L === 'it', groups = [];
    list.forEach(function (e) {
      var key = JSON.stringify(e.S) + (e.n < 0 ? '-' : '+'), g = groups[groups.length - 1];
      if (g && g.key === key) { g.items.push(effItem(e, L)); g.kinds.push(e.kind); } else groups.push({ key: key, S: e.S, neg: e.n < 0, items: [effItem(e, L)], kinds: [e.kind] });
    });
    return groups.map(function (g) {
      var sing = isSingular(g.S), verb, neg = g.neg && g.kinds.every(function (k) { return k !== 'attr'; });
      if (it) verb = neg ? (sing ? 'subisce' : 'subiscono') : (sing ? 'ottiene' : 'ottengono');
      else verb = neg ? (sing ? 'loses' : 'lose') : (sing ? 'gains' : 'gain');
      return subjText(g.S, L) + ' ' + verb + ' ' + joinItems(g.items, L);
    }).join('; ');
  }

  // ---------- eventi e condizioni di fine ----------
  var SKN = {
    it: { dribble: 'tecnica di dribbling', dribblock: 'tecnica di blocco del dribbling', shotblock: 'blocco del tiro', keeper: 'tecnica di parata' },
    en: { dribble: 'dribble move', dribblock: 'dribble-block move', shotblock: 'shot block', keeper: 'keeper move' }
  };
  var SKJ = { 'ドリブルブロック': 'dribblock', 'シュートブロック': 'shotblock', 'ドリブル': 'dribble', 'キーパー': 'keeper' };
  function actorOf(a) {
    var S = { side: /^敵/.test(a) ? 'enemy' : (/^自/.test(a) ? 'self' : 'ally'), pos: [], elems: [], tags: [] };
    var m = /(FW|MF|DF|GK)$/.exec(a); if (m) S.pos = [m[1]];
    return S;
  }
  function actorGen(S, L) {
    var it = L === 'it';
    if (S.side === 'self') return it ? 'del giocatore' : 'of the player';
    var t = subjText(S, L);
    if (S.pos.length === 1) {
      var n = POSN[L][S.pos[0]][1];
      t = it ? (S.side === 'ally' ? 'un ' + n + ' alleato' : 'un ' + n + ' avversario') : (S.side === 'ally' ? 'an allied ' + n : 'an opposing ' + n);
    } else t = it ? (S.side === 'ally' ? 'un alleato' : 'un avversario') : (S.side === 'ally' ? 'an ally' : 'an opponent');
    return it ? 'di ' + t.replace(/^un /, 'un ') : 'of ' + t;
  }
  function actorNom(S, L) {
    var it = L === 'it';
    if (S.side === 'self') return it ? 'il giocatore' : 'the player';
    if (S.pos.length === 1) {
      var n = POSN[L][S.pos[0]][1];
      return it ? 'un ' + n + (S.side === 'ally' ? ' alleato' : ' avversario') : (S.side === 'ally' ? 'an allied ' : 'an opposing ') + n;
    }
    return it ? (S.side === 'ally' ? 'un alleato' : 'un avversario') : (S.side === 'ally' ? 'an ally' : 'an opponent');
  }
  var HALF = { it: { 'enemy': 'si trova nella metà campo avversaria', 'ally': 'si trova nella propria metà campo' }, en: { 'enemy': 'is in the opponent half', 'ally': 'is in its own half' } };

  // restituisce funzione (L, rep) → testo
  function parseEvent(e0) {
    var m;
    var A = /^(自身|味方(?:DF|MF|FW|GK)?|敵(?:DF|MF|FW|GK)?)の(ドリブルブロック|シュートブロック|ドリブル|キーパー)技?が(成功|失敗)(?:する|した)?$/;
    var B = /^(自身|味方(?:DF|MF|FW|GK)?|敵(?:DF|MF|FW|GK)?)が(ドリブルブロック|シュートブロック|ドリブル|キーパー)技?[をに](成功|失敗)(?:する|した|させる|させた)?$/;
    if ((m = A.exec(e0)) || (m = B.exec(e0))) {
      var S = actorOf(m[1]), sk = SKJ[m[2]], ok = m[3] === '成功';
      return function (L) {
        return L === 'it' ? 'la ' + SKN.it[sk] + ' ' + actorGen(S, 'it') + (ok ? ' riesce' : ' fallisce')
          : 'the ' + SKN.en[sk] + ' ' + actorGen(S, 'en') + (ok ? ' succeeds' : ' fails');
      };
    }
    if (/^(自身|自分)がゴールを入れる(?:た)?$/.test(e0)) return function (L) { return L === 'it' ? 'il giocatore segna un gol' : 'the player scores a goal'; };
    if (/^敵からゴールを入れられる$/.test(e0)) return function (L) { return L === 'it' ? 'la squadra subisce un gol' : 'the team concedes a goal'; };
    if (/^味方が(?:敵の)?シュートを止め(?:る|た)$/.test(e0)) return function (L) { return L === 'it' ? 'un alleato ferma un tiro avversario' : 'an ally stops an opponent shot'; };
    if (/^敵に味方のシュートが止められる$/.test(e0)) return function (L) { return L === 'it' ? 'un tiro alleato viene fermato' : 'an allied shot is stopped'; };
    if (/^自身がシュート技を使用(?:する|した)$/.test(e0)) return function (L) { return L === 'it' ? 'il giocatore usa una tecnica di tiro' : 'the player uses a shot move'; };
    if ((m = /^敵が([火風林山])?(?:属性)?シュート技を使用(?:する|した)$/.exec(e0))) { var el = m[1]; return function (L) { return L === 'it' ? 'un avversario usa una tecnica di tiro' + (el ? ' di ' + EL.it[el] : '') : 'an opponent uses a ' + (el ? EL.en[el] + ' ' : '') + 'shot move'; }; }
    if ((m = /^自身が(.+?)を使用(?:する|した)$/.exec(e0))) { var mv = m[1]; return function (L) { return L === 'it' ? 'il giocatore usa «' + moveName(mv, L) + '»' : 'the player uses «' + moveName(mv, L) + '»'; }; }
    if (/^自身がペナルティエリア内でシュート技を打つ$/.test(e0)) return function (L) { return L === 'it' ? "il giocatore tira con una tecnica di tiro dentro l'area di rigore" : 'the player takes a shot move inside the penalty area'; };
    if ((m = /^自身がハーフラインより(敵|味方)エリア側に居る$/.exec(e0))) { var sd = m[1] === '敵' ? 'enemy' : 'ally'; return function (L) { return (L === 'it' ? 'il giocatore ' : 'the player ') + HALF[L][sd]; }; }
    if (/^自身がパスを受け取る(?:った)?$/.test(e0)) return function (L) { return L === 'it' ? 'il giocatore riceve un passaggio' : 'the player receives a pass'; };
    if (/^シュートチェインを発動する$/.test(e0)) return function (L) { return L === 'it' ? 'si attiva una catena di tiro' : 'a shot chain is triggered'; };
    return null;
  }
  function endText(s, L) {
    var it = L === 'it', m;
    var M = [
      [/^味方がゴールを(?:入れた|決めた)時$/, 'un alleato segna', 'an ally scores'],
      [/^(?:自身|自分)がゴールを入れた時$/, 'il giocatore segna', 'the player scores'],
      [/^敵がゴールを入れた時$/, 'un avversario segna', 'an opponent scores'],
      [/^敵\/味方問わずゴールが発生した時$/, 'viene segnato un gol (da chiunque)', 'a goal is scored (by either side)'],
      [/^同点になった時$/, 'il punteggio torna in parità', 'the score is tied'],
      [/^ペナルティエリア外へ移動した時$/, "il giocatore esce dall'area di rigore", 'the player leaves the penalty area'],
      [/^ハーフラインより味方エリア側に居る時$/, 'il giocatore si trova nella propria metà campo', 'the player is in its own half'],
      [/^ハーフラインより敵エリア側に居る時$/, 'il giocatore si trova nella metà campo avversaria', 'the player is in the opponent half']
    ];
    for (var i = 0; i < M.length; i++) if (M[i][0].test(s)) return (it ? 'termina quando ' + M[i][1] : 'ends when ' + M[i][2]);
    return null;
  }

  // ---------- parser principale ----------
  function parse(text) {
    var n = norm(text), r = n, res = { start: false, conds: [], event: null, effects: null, end: null };
    var m = /\s*終了条件[:：]\s*(.+)$/.exec(r);
    if (m) { res.end = m[1].trim(); r = r.slice(0, m.index); if (!endText(res.end, 'it')) return null; }
    r = r.trim();
    if (/^試合開始時\s*/.test(r)) { res.start = true; r = r.replace(/^試合開始時\s*/, ''); }
    if ((m = /^(\d+)点以上の差で負けている時\s*/.exec(r))) { res.conds.push({ type: 'losing', n: +m[1] }); r = r.slice(m[0].length); }
    else if ((m = /^(.+?)(?:の味方|の選手|選手|味方)が\s*(\d+)人以上いる場合\s*/.exec(r)) && isSubject(m[1])) {
      res.conds.push({ type: 'count', n: +m[2], S: parseSubject(m[1]) }); r = r.slice(m[0].length);
    }
    if (!res.start && !res.conds.length || (!res.start && res.conds.length && res.conds[0].type === 'count')) {
      var em = /^(.+?)(たびに|たび|時|とき)\s+(?=\S)/.exec(r);
      if (em) {
        var f = parseEvent(em[1].replace(/(?:成功)?$/, function (x) { return x; }));
        if (!f) f = parseEvent(em[1]);
        if (!f) return null;
        res.event = { f: f, rep: /^たび/.test(em[2]) }; r = r.slice(em[0].length);
      }
    }
    if (!res.start && !res.event && !res.conds.length) return null;
    res.effects = parseEffects(r);
    if (!res.effects) return null;
    return res;
  }
  function render(p, L) {
    var it = L === 'it', head = [];
    if (p.start) head.push(it ? "All'inizio della partita" : 'At the start of the match');
    p.conds.forEach(function (c) {
      if (c.type === 'losing') head.push(it ? 'quando la squadra perde di almeno ' + c.n + (c.n === 1 ? ' gol' : ' gol') : 'while trailing by ' + c.n + ' or more goals');
      else {
        var S = Object.assign({}, c.S); var who;
        var attrs = '';
        if (S.tags.length) attrs += (it ? ' con tag ' : ' with the ') + S.tags.map(function (t) { return tagName(t, L); }).join(it ? ' o ' : ' or ') + (it ? '' : ' tag');
        if (S.elems.length) attrs += it ? ' di elemento ' + elList(S.elems, L, ' o ') : ' with ' + elList(S.elems, L, ' or ') + ' element';
        head.push((it ? 'se ci sono almeno ' + c.n + ' giocatori' : 'if there are at least ' + c.n + ' players') + attrs);
      }
    });
    if (p.event) head.push((p.event.rep ? (it ? 'ogni volta che ' : 'each time ') : (it ? 'quando ' : 'when ')) + p.event.f(L));
    var s = head.join(', ');
    if (s) s = s.charAt(0).toUpperCase() + s.slice(1) + ': ';
    s += effectsText(p.effects, L);
    if (p.end) s += ' (' + endText(p.end, L) + ')';
    return s + '.';
  }
  function tr(text, L) {
    if (L === 'ja') return text;
    var p; try { p = parse(text); } catch (e) { p = null; }
    return p ? render(p, L) : null;
  }

  // ---------- nomi delle passive ----------
  var BR = { '結束': ['Coesione', 'Unity'], '破竹': ['Slancio', 'Momentum'], '阻止': ['Parata', 'Stop'], '連動': ['Sinergia', 'Link'], '共鳴': ['Risonanza', 'Resonance'],
    '逆境': ['Avversità', 'Adversity'], '救援': ['Soccorso', 'Rescue'], '累': ['cumulativa', 'stacking'], '自得点': ['Gol proprio', 'Own goal'], '連鎖': ['Catena', 'Chain'],
    '発動': ['Attivazione', 'Trigger'], '奮起': ['Riscossa', 'Rally'], '好機': ['Occasione', 'Chance'], '改': ['potenziata', 'upgraded'], '失点': ['Gol subito', 'Conceded'], '決定機': ['Occasione decisiva', 'Key chance'], '劣勢': ['Svantaggio', 'Behind'], '攻勢': ['Offensiva', 'Attacking'], '守勢': ['Difensiva', 'Defending'], '受球': ['Passaggio ricevuto', 'Pass received'] };
  var NW = [
    ['シュートチェイン', 'Catena di tiro', 'Shot chain'], ['ファウル率減少', 'Fallo −', 'Foul rate −'], ['ファウル率増', 'Fallo +', 'Foul rate +'],
    ['ドリブルパワー', 'Pot. dribbling', 'Dribble power'], ['シュートパワー', 'Pot. tiro', 'Shot power'], ['ブロックパワー', 'Pot. blocco', 'Block power'],
    ['キーパーパワー', 'Pot. parata', 'Keeper power'], ['パワー', 'Pot.', 'Power'], ['最大TP', 'TP massimi', 'Max TP'], ['テクニック', 'Tecnica', 'Technique'],
    ['ブロック', 'Blocco', 'Block'], ['キック', 'Calcio', 'Kick'], ['キャッチ', 'Presa', 'Catch'], ['スピード', 'Velocità', 'Speed'], ['ドリブル', 'Dribbling', 'Dribble'],
    ['チーム', 'Squadra', 'Team'], ['敵', 'Avv.', 'Opp.'], ['雷門', 'Raimon', 'Raimon'], ['帝国', 'Royal Academy', 'Royal Academy'], ['イナズマジャパン', 'Inazuma Japan', 'Inazuma Japan'],
    ['花火', 'Hanabi', 'Hanabi'], ['林', 'Foresta', 'Forest'], ['風', 'Vento', 'Wind'], ['火', 'Fuoco', 'Fire'], ['山', 'Montagna', 'Mountain'], ['改', '(Plus)', '(Plus)']
  ];
  var NS = { '+': '+', '-': '−', '&': '&', '/': '/', '・': '/', '〈': '(', '〉': ')', '(': '(', ')': ')' };
  function trName(name, L) {
    if (L === 'ja' || !name) return name;
    var s = String(name).normalize('NFKC'), i = L === 'it' ? 1 : 2, out = [], m;
    if ((m = /^【([^】]+)】/.exec(s))) {
      var b = m[1].split(/[\/・]/).map(function (x) { return BR[x] ? BR[x][i - 1] : null; });
      if (b.indexOf(null) >= 0) return null;
      out.push('[' + b.join(', ') + ']'); s = s.slice(m[0].length);
    }
    var raw = '', guard = 0;
    function flush() { if (raw) { out.push(raw); raw = ''; } }
    while (s && guard++ < 200) {
      var ch = s.charAt(0), k, hit = false;
      if (NS[ch] !== undefined) { flush(); out.push(NS[ch]); s = s.slice(1); continue; }
      for (k = 0; k < NW.length; k++) if (s.indexOf(NW[k][0]) === 0) { flush(); out.push(NW[k][i]); s = s.slice(NW[k][0].length); hit = true; break; }
      if (hit) continue;
      var mv = Object.keys(movesIt).filter(function (x) { return s.indexOf(x) === 0; }).sort(function (a, b) { return b.length - a.length; })[0];
      if (mv) { flush(); out.push(movesIt[mv]); s = s.slice(mv.length); continue; }
      if (/^(FW|MF|DF|GK)/.test(s)) { flush(); out.push(s.slice(0, 2)); s = s.slice(2); continue; }
      raw += ch; s = s.slice(1);
    }
    flush();
    return out.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/ ?\/ ?/g, '/').replace(/\/(?=[A-Za-zÀ-ú\[])/g, ' / ').replace(/\s+/g, ' ').trim();
  }
  return { tr: tr, trName: trName, parse: parse, render: render, setMoves: setMoves, setExternal: setExternal, norm: norm };
});
