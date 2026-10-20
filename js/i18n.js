/* i18n: selettore lingua (it / en / ja). Le pagine scrivono i testi in ITALIANO (interfaccia) e in
   GIAPPONESE (contenuti del gioco); questo modulo li traduce nel DOM. Dizionari: data/i18n/*.json */
(function () {
  'use strict';
  var KEY = 'iecross.lang.v1', LANGS = ['it', 'en', 'ja'];
  var lang = 'it', ui = {}, content = {}, pats = [], ready = false, obs = null, busy = false;
  try { var s = localStorage.getItem(KEY); if (LANGS.indexOf(s) >= 0) lang = s; } catch (e) {}

  function esc(s) { return s.replace(/[.*+?^$()|[\]\\]/g, '\\$&'); }
  function buildPats() {
    pats = [];
    Object.keys(ui).forEach(function (k) {
      if (!/\{\d\}/.test(k)) return;
      var names = [];
      var re = '^' + esc(k).replace(/\{(\d)\}/g, function (_, d) { names.push(+d); return '(.+?)'; }) + '$';
      pats.push({ k: k, re: new RegExp(re), names: names });
    });
    pats.sort(function (a, b) { return b.k.length - a.k.length; });
  }
  function pick(e) { // e: {en, ja, it?}
    if (!e) return null;
    if (lang === 'ja') return e.ja != null ? e.ja : null;
    if (lang === 'en') return e.en != null ? e.en : null;
    return e.it != null ? e.it : null;
  }
  function tr(s) {
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
    if (!core) return s;
    var r = lookup(core);
    return r == null ? s : m[1] + r + m[3];
  }
  function lookup(core) {
    var e = ui[core];
    if (e) { var r = pick(e); return r == null ? core : r; }
    var c = content[core];
    if (c) { var r2 = lang === 'ja' ? core : (lang === 'en' ? c.en : c.it); return r2 == null ? core : r2; }
    for (var i = 0; i < pats.length; i++) {
      var mm = pats[i].re.exec(core);
      if (!mm) continue;
      var tpl = pick(ui[pats[i].k]); if (tpl == null) tpl = pats[i].k;
      return tpl.replace(/\{(\d)\}/g, function (_, d) {
        var idx = pats[i].names.indexOf(+d); var v = idx >= 0 ? mm[idx + 1] : '';
        return lookup(v) != null ? lookup(v) : v;
      });
    }
    return null;
  }
  function skip(n) {
    for (var p = n.nodeType === 3 ? n.parentNode : n; p && p.nodeType === 1; p = p.parentNode) {
      if (p.getAttribute('data-i18n') === 'skip' || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName)) return true;
    }
    return false;
  }
  var ATTRS = ['placeholder', 'title', 'aria-label'];
  function doText(n) {
    if (skip(n)) return;
    if (n.__t !== undefined && n.nodeValue === n.__t) { /* ancora il nostro testo */ } else n.__o = n.nodeValue;
    var r = tr(n.__o);
    n.__t = r; if (n.nodeValue !== r) n.nodeValue = r;
  }
  function doEl(el) {
    if (skip(el)) return;
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var store = el.__a || (el.__a = {}), cur = el.getAttribute(a);
      if (!(store[a] && store[a].t === cur)) store[a] = { o: cur, t: cur };
      var r = tr(store[a].o); store[a].t = r; if (cur !== r) el.setAttribute(a, r);
    });
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doEl(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  function apply(root) {
    if (!ready) return;
    busy = true;
    try { walk(root || document.body); document.title = tr(document.documentElement.__title || (document.documentElement.__title = document.title)); }
    finally { busy = false; if (obs) obs.takeRecords(); }
  }
  function observe() {
    obs = new MutationObserver(function (recs) {
      if (busy) return;
      busy = true;
      try {
        recs.forEach(function (r) {
          if (r.type === 'childList') r.addedNodes.forEach(function (n) { walk(n); });
          else if (r.type === 'characterData') doText(r.target);
          else if (r.type === 'attributes') doEl(r.target);
        });
      } finally { busy = false; obs.takeRecords(); }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function setLang(l) {
    if (LANGS.indexOf(l) < 0) return;
    lang = l; try { localStorage.setItem(KEY, l); } catch (e) {}
    document.documentElement.lang = l;
    var sel = document.getElementById('lang'); if (sel && sel.value !== l) sel.value = l;
    apply(document.body);
    document.dispatchEvent(new CustomEvent('iec-lang', { detail: l }));
  }
  function load() {
    return Promise.all([fetch('data/i18n/ui.json').then(function (r) { return r.json(); }),
                        fetch('data/i18n/content.json').then(function (r) { return r.json(); })])
      .then(function (a) { ui = a[0].ui || {}; content = a[1].content || {}; buildPats(); })
      .catch(function () { /* senza dizionari resta l'italiano */ })
      .then(function () { ready = true; });
  }
  function trLang(s, L) { var old = lang; lang = L; try { return tr(s); } finally { lang = old; } }
  // sigle di squadra per distinguere i personaggi omonimi (es. Seymour Hillman (Giovane))
  var SHORT = {
    '雷門中': { it: 'Raimon', en: 'Raimon' }, 'イナズマジャパン': { it: 'Inazuma Japan', en: 'Inazuma Japan' }, '帝国学園': { it: 'Royal Academy', en: 'Royal Academy' },
    'ヤングイナズマ': { it: 'Giovane', en: 'Young' }, '日本代表2026': { it: 'Giappone 2026', en: 'Japan 2026' }, '雷門OB': { it: 'Raimon OB', en: 'Raimon OB' }
  };
  function teamShort(c, L) {
    var t = c.team_ja || ''; if (L === 'ja') return t;
    return SHORT[t] ? SHORT[t][L] : trLang(t, L);
  }
  function nameIn(c, L) {
    var base = L === 'ja' ? c.name_ja : trLang(c.name_en || c.name_ja, L);
    return c.dup ? base + ' (' + teamShort(c, L) + ')' : base;
  }
  window.IECI18N = {
    lang: function () { return lang; }, set: setLang, t: tr, apply: apply, ready: function () { return ready; },
    trLang: trLang, nameIn: nameIn,
    variants: function (s) { var o = []; LANGS.forEach(function (L) { var v = trLang(s, L); if (v && o.indexOf(v) < 0) o.push(v); }); return o; },
    primaryName: function (c) { return nameIn(c, lang); }
  };
  function start() {
    var sel = document.getElementById('lang');
    if (sel) { sel.value = lang; sel.addEventListener('change', function () { setLang(sel.value); }); }
    document.documentElement.lang = lang;
    load().then(function () { observe(); apply(document.body); if (lang !== 'it') document.dispatchEvent(new CustomEvent('iec-lang', { detail: lang })); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
