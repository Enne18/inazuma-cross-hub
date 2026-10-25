/* Pagina "Novità": hero, scorciatoie alle funzioni principali e cronologia delle versioni da data/changelog.json (it/en/ja).
   Un pallino sul tab segnala le novità non ancora viste. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); }, KEY = 'iecross.news.seen', data = null;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function L() { return window.IECI18N ? window.IECI18N.lang() : 'it'; }
  function pk(o) { return o[L()] || o.it; }
  function seen() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  function markSeen() { if (!data) return; try { window.localStorage.setItem(KEY, data.releases[0].version); } catch (e) { /* ignora */ } paintDot(); }
  function paintDot() { var t = document.querySelector('.tab[data-tab=news]'); if (t && data) t.classList.toggle('has-new', seen() !== data.releases[0].version); }
  function go(tab) { if (window.IEC && window.IEC.ops) window.IEC.ops.showTab(tab); window.scrollTo(0, 0); }
  var MONTHS = { it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  function dateOf(iso) {
    var p = iso.split('-'), l = L();
    if (l === 'ja') return +p[0] + '年' + +p[1] + '月' + +p[2] + '日';
    return +p[2] + ' ' + MONTHS[l][+p[1] - 1] + ' ' + p[0];
  }
  function render() {
    var root = $('news'); if (!root || !data) return;
    root.textContent = '';
    var last = data.releases[0];
    var hero = el('div', 'news-hero');
    hero.appendChild(el('div', 'nh-ico', '✨'));
    var ht = el('div', 'nh-tx'); ht.appendChild(el('h2', null, 'Novità'));
    ht.appendChild(el('p', null, 'Le ultime funzioni del sito, versione dopo versione.')); hero.appendChild(ht);
    hero.appendChild(el('span', 'nh-ver', 'v' + last.version)); root.appendChild(hero);

    var tiles = el('div', 'news-tiles');
    data.highlights.forEach(function (h) {
      var t = el('button', 'news-tile'); t.type = 'button';
      t.appendChild(el('span', 'nt-ico', h.icon)); t.appendChild(el('strong', null, pk(h.title))); t.appendChild(el('small', null, pk(h.text)));
      t.addEventListener('click', function () { go(h.tab); });
      tiles.appendChild(t);
    });
    root.appendChild(tiles);

    var tl = el('div', 'news-tl');
    data.releases.forEach(function (r, i) {
      var card = el('article', 'news-card' + (i === 0 ? ' latest' : '')), head = el('div', 'news-head');
      head.appendChild(el('span', 'news-ico', r.icon));
      var tx = el('div', 'news-ht'); tx.appendChild(el('strong', null, pk(r.title)));
      tx.appendChild(el('small', null, dateOf(r.date))); head.appendChild(tx);
      head.appendChild(el('span', 'news-ver', 'v' + r.version));
      if (i === 0) head.appendChild(el('span', 'news-new', 'Ultima'));
      card.appendChild(head);
      var ul = el('ul', 'news-items');
      r.items.forEach(function (it) { var li = el('li'); li.appendChild(el('span', 'ni-ico', it.icon)); li.appendChild(el('span', 'ni-tx', pk(it))); ul.appendChild(li); });
      card.appendChild(ul); tl.appendChild(card);
    });
    root.appendChild(tl);

    var fb = el('p', 'news-fb');
    var a = el('a', 'btn', 'Segnala un errore o proponi un\'idea'); a.href = 'https://github.com/enne18/inazuma-cross-hub/issues/new/choose'; a.target = '_blank'; a.rel = 'noopener noreferrer';
    fb.appendChild(a); root.appendChild(fb);
    if (window.IECI18N) window.IECI18N.apply(root);
  }
  function load() {
    return fetch('data/changelog.json').then(function (r) { return r.json(); }).then(function (d) { data = d; paintDot(); render(); }).catch(function () {});
  }
  document.addEventListener('iec-tab', function (e) { if (e.detail === 'news') { if (!data) load().then(markSeen); else { render(); markSeen(); } } });
  document.addEventListener('iec-lang', function () { if (data) render(); });
  document.addEventListener('iec-ready', function () { if (!data) load(); });
  if (window.IEC && window.IEC.loaded && !data) load();
})();
