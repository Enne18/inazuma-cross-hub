/* Adattatore: dati del sito (data/site/chars.json) + livello del personaggio -> personaggio nel formato del motore.
   - Passive base: livello della passiva = quante tacche hanno 'unlock_lv' <= livello del personaggio (0 = non ancora sbloccata).
   - Passive di rarità (ADVANCED / ADVANCED+): sempre al livello massimo (scelta dell'utente).
   - Statistiche: il sito fornisce solo Lv 1 e Lv 440; i livelli intermedi sono un'INTERPOLAZIONE LINEARE (ipotesi, non dato del sito). TP e velocità sono costanti. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IECData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var MAX = 440, STATS = ['tp', 'kick', 'technique', 'block', 'catch', 'speed'];

  // Testo del sito -> testo con la punteggiatura attesa dal parser (NFKC: ＦＷ->FW, ＴＰ->TP; spazi tra clausole -> "、").
  function normalize(t) {
    t = String(t || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
    t = t.replace(/-(\d+)(%?)(?=(?:低下|減少|減らす))/g, '$1$2'); // il sito scrive "-284減少": il verbo già indica la riduzione
    t = t.replace(/(キック|テクニック|ブロック|キャッチ)(\d+)(?=上昇|低下)/g, '$1を$2'); // "キック1054上昇" (particella mancante nel testo)
    t = t.replace(/(場合|たびに?|時|とき|ごとに) (?=\S)/g, '$1、');
    t = t.replace(/(上昇|低下|減少|増やす|上げる|減らす) (?=[^終])/g, '$1、');
    return t;
  }
  function clampLevel(L) { L = Math.round(+L); return isFinite(L) ? Math.max(1, Math.min(MAX, L)) : MAX; }

  function statsAt(c, L) {
    L = clampLevel(L);
    var a = c.stats_lv1 || c.stats_max, b = c.stats_max, o = {}, f = (L - 1) / (MAX - 1);
    STATS.forEach(function (k) {
      if (b[k] === null || b[k] === undefined) { o[k] = null; return; }
      o[k] = (k === 'tp' || k === 'speed') ? b[k] : Math.round(a[k] + (b[k] - a[k]) * f);
    });
    return o;
  }

  function basicLevel(p, L) {
    var n = 0;
    p.levels.forEach(function (l, i) { if (l.unlock_lv !== null && l.unlock_lv <= L) n = i + 1; });
    return n;
  }

  function passivesAt(c, L) {
    L = clampLevel(L);
    var out = [];
    (c.basic_passives || []).forEach(function (p) {
      var n = basicLevel(p, L);
      if (n > 0) out.push({ id: p.id, name_ja: p.name_ja, unlock: '初期', level: n, max_level: p.levels.length, effect_ja: normalize(p.levels[n - 1].text), raw_ja: p.levels[n - 1].text });
      else out.push({ id: p.id, name_ja: p.name_ja, unlock: 'bloccata', level: 0, max_level: p.levels.length, effect_ja: '', raw_ja: '', next_unlock_lv: p.levels[0].unlock_lv });
    });
    (c.rarity_passives || []).forEach(function (p) {
      var l = p.levels[p.levels.length - 1];
      out.push({ id: p.id, name_ja: p.name_ja, unlock: p.tier, level: p.levels.length, max_level: p.levels.length, effect_ja: normalize(l.text), raw_ja: l.text });
    });
    return out;
  }

  // Copia del personaggio al livello L, nel formato che usano motore e catalogo.
  function forLevel(c, L) {
    L = clampLevel(L);
    var o = {}, k;
    for (k in c) o[k] = c[k];
    o.level = L;
    o.stats_max = statsAt(c, L);
    o.passives = passivesAt(c, L);
    return o;
  }

  return { MAX_LEVEL: MAX, normalize: normalize, statsAt: statsAt, passivesAt: passivesAt, forLevel: forLevel };
});
