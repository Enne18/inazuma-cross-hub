/* Pagina "Novità": elenco delle versioni da data/changelog.json (it/en/ja). Un pallino sul tab segnala le novità non ancora viste. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); }, KEY = 'iecross.news.seen', data = null;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function L() { return window.IECI18N ? window.IECI18N.lang() : 'it'; }
  function pk(o) { return o[L()] || o.it; }
  function seen() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  function markSeen() { if (!data) return; try { window.localStorage.setItem(KEY, data.releases[0].version); } catch (e) { /* ignora */ } paintDot(); }
  function paintDot() { var t = document.querySelector('.tab[data-tab=news]'); if (t && data) t.classList.toggle('has-new', seen() !== data.releases[0].version); }
  function render() {
    var root = $('news'); if (!root || !data) return;
    root.textContent = '';
    var h = el('h2', null, 'Novità'); root.appendChild(h);
    data.releases.forEach(function (r, i) {
      var card = el('article', 'card news-card'), head = el('div', 'news-head');
      head.appendChild(el('span', 'news-ver', 'v' + r.version));
      head.appendChild(el('strong', null, pk(r.title)));
      head.appendChild(el('small', 'muted', r.date));
      if (i === 0) head.appendChild(el('span', 'badge el', 'Ultima'));
      card.appendChild(head);
      var ul = el('ul'); r.items.forEach(function (it) { ul.appendChild(el('li', null, pk(it))); }); card.appendChild(ul);
      root.appendChild(card);
    });
    var fb = el('p', 'muted small');
    var a = el('a', null, 'Segnala un errore o proponi un\'idea'); a.href = 'https://github.com/enne18/inazuma-cross-hub/issues/new/choose'; a.target = '_blank'; a.rel = 'noopener noreferrer';
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
