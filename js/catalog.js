/* Catalogo: carica data/index.json + meta.json e mostra i personaggi con filtri base. */
(function () {
  'use strict';
  var state = { meta: null, chars: [], owned: {} };
  var KEY = 'iecross.collection.v1';

  function loadOwned() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      var o = {};
      if (Array.isArray(arr)) arr.forEach(function (id) { o[String(id)] = true; });
      return o;
    } catch (e) { return {}; }
  }
  function saveOwned() {
    try { window.localStorage.setItem(KEY, JSON.stringify(Object.keys(state.owned))); return true; }
    catch (e) { return false; }
  }
  function ownedCount() { return Object.keys(state.owned).length; }
  function updateBadge() { $('owned-badge').textContent = String(ownedCount()); }
  // API per il Team Builder (tappa 7)
  window.IEC = { state: state, ownedChars: function () { return state.chars.filter(function (c) { return state.owned[c.id]; }); } };
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function getJSON(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error(path + ' → HTTP ' + r.status);
      return r.json();
    });
  }

  function load() {
    return Promise.all([getJSON('data/meta.json'), getJSON('data/index.json')]).then(function (res) {
      state.meta = res[0];
      return Promise.all(res[1].parts.map(function (p) { return getJSON('data/' + p); }));
    }).then(function (parts) {
      state.chars = [].concat.apply([], parts).filter(function (c) { return !c.error; });
    });
  }

  function fillSelect(sel, items) {
    items.forEach(function (it) {
      var o = el('option', null, it[1]);
      o.value = it[0];
      sel.appendChild(o);
    });
  }

  function statRow(parent, key, value) {
    var label = state.meta.stat_labels_it[key];
    parent.appendChild(el('span', null, label));
    var bar = el('span', 'bar');
    if (key === 'tp' || key === 'speed' || value === null) { bar.style.visibility = 'hidden'; }
    else { var i = el('i'); i.style.width = Math.min(100, value / 80) + '%'; bar.appendChild(i); }
    parent.appendChild(bar);
    parent.appendChild(el('b', null, value === null ? '—' : String(value)));
  }

  function card(c) {
    var root = el('article', 'card');
    root.style.setProperty('--el', 'var(--' + c.element + ')');

    var h = el('h2', null, c.name_en || c.name_ja);
    root.appendChild(h);
    root.appendChild(el('div', 'ja', c.name_ja + (c.version ? ' · ' + c.version : '')));

    var b = el('div', 'badges');
    b.appendChild(el('span', 'badge el', state.meta.elements[c.element].it));
    b.appendChild(el('span', 'badge', state.meta.positions[c.position].it));
    b.appendChild(el('span', 'badge', '★'.repeat(c.rarity)));
    if (c.rating && c.rating.best) b.appendChild(el('span', 'badge', 'Valutazione ' + c.rating.best));
    if (c.verified !== 'ok') b.appendChild(el('span', 'badge warn', 'Dati ' + ({ parziale: 'parziali', mancante: 'mancanti' }[c.verified] || c.verified)));
    root.appendChild(b);

    var own = el('button', 'btn own');
    own.type = 'button';
    function paintOwn() {
      var on = !!state.owned[c.id];
      own.textContent = on ? '✓ Ce l\'ho' : '+ Ce l\'ho';
      own.classList.toggle('on', on);
      own.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    paintOwn();
    own.addEventListener('click', function () {
      if (state.owned[c.id]) delete state.owned[c.id]; else state.owned[c.id] = true;
      if (!saveOwned()) flash('Impossibile salvare nel browser (archiviazione bloccata): la collezione vale solo finché la pagina resta aperta.');
      paintOwn();
      updateBadge();
      if (root.parentNode && root.parentNode.id === 'c-grid') renderCollection();
    });
    root.appendChild(own);

    var s = el('div', 'stats');
    state.meta.stats.forEach(function (k) { statRow(s, k, c.stats_max ? c.stats_max[k] : null); });
    root.appendChild(s);

    var d1 = el('details');
    d1.appendChild(el('summary', null, 'Tecniche (' + c.skills.length + ')'));
    c.skills.forEach(function (k) {
      var it = el('div', 'item', (k.name_en || k.name_ja) + ' — Potenza ' + k.power);
      it.appendChild(el('small', null, k.name_ja + ' · sblocco ' + k.unlock + ' · TP ' + k.tp +
        (k.crit != null ? ' · critico ' + k.crit + '%' : '') + (k.range != null ? ' · raggio ' + k.range : '') +
        (k.chain ? ' · catena' : '') + (k.category ? ' · ' + k.category : '')));
      d1.appendChild(it);
    });
    root.appendChild(d1);

    var d2 = el('details');
    d2.appendChild(el('summary', null, 'Passive (' + c.passives.length + ')'));
    c.passives.forEach(function (p) {
      var it = el('div', 'item', p.name_ja + ' [' + p.unlock + ']');
      if (p.effect_en) it.appendChild(el('small', null, p.effect_en));
      it.appendChild(el('small', null, p.effect_ja));
      d2.appendChild(it);
    });
    root.appendChild(d2);

    if (c.notes && c.notes.length) root.appendChild(el('div', 'note', 'Note: ' + c.notes.join(' ')));
    return root;
  }

  var SORTS = [
    ['default', 'Ordine originale'], ['name', 'Nome (A-Z)'], ['rarity', 'Rarità (alta prima)'],
    ['kick', 'Calcio (alto prima)'], ['technique', 'Tecnica (alta prima)'], ['block', 'Blocco (alto prima)'],
    ['catch', 'Presa (alta prima)'], ['speed', 'Velocità (alta prima)']
  ];

  function haystack(c) {
    var parts = [c.name_ja, c.name_en || '', c.team_ja || '', c.version || '', (c.tags_ja || []).join(' ')];
    c.skills.forEach(function (k) { parts.push(k.name_ja, k.name_en || ''); });
    c.passives.forEach(function (p) { parts.push(p.name_ja, p.effect_ja || '', p.effect_en || ''); });
    return parts.join(' ').toLowerCase();
  }

  function sortList(list, key) {
    if (key === 'default') return list;
    var out = list.slice();
    if (key === 'name') {
      out.sort(function (a, b) { return (a.name_en || a.name_ja).localeCompare(b.name_en || b.name_ja); });
    } else if (key === 'rarity') {
      out.sort(function (a, b) { return b.rarity - a.rarity; });
    } else {
      out.sort(function (a, b) {
        var x = a.stats_max ? a.stats_max[key] : null, y = b.stats_max ? b.stats_max[key] : null;
        if (x === null && y === null) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        return y - x;
      });
    }
    return out;
  }

  function render() {
    var q = $('q').value.trim().toLowerCase();
    var e = $('f-element').value, p = $('f-position').value, r = $('f-rarity').value;
    var t = $('f-team').value, s = $('f-series').value, only = $('f-complete').checked;
    var list = state.chars.filter(function (c) {
      if (e && c.element !== e) return false;
      if (p && c.position !== p) return false;
      if (r && String(c.rarity) !== r) return false;
      if (t && c.team_ja !== t) return false;
      if (s && c.series_ja !== s) return false;
      if (only && c.verified !== 'ok') return false;
      if (q && c._hay.indexOf(q) === -1) return false;
      return true;
    });
    list = sortList(list, $('f-sort').value);
    var grid = $('grid');
    grid.textContent = '';
    list.forEach(function (c) { grid.appendChild(card(c)); });
    $('count').textContent = list.length + ' di ' + state.chars.length + ' personaggi' +
      (list.length === 0 ? ' — nessun risultato, prova ad azzerare i filtri' : '');
  }

  function flash(msg) { $('c-msg').textContent = msg; }

  function renderCollection() {
    var list = window.IEC.ownedChars();
    var g = $('c-grid');
    g.textContent = '';
    list.forEach(function (c) { g.appendChild(card(c)); });
    $('c-count').textContent = list.length === 0
      ? 'Nessun personaggio selezionato. Vai al Catalogo e premi "Ce l\'ho".'
      : list.length + ' personaggi in collezione';
  }

  function showTab(name) {
    ['catalog', 'collection', 'builder'].forEach(function (t) { $(t).hidden = (t !== name); });
    document.dispatchEvent(new CustomEvent('iec-tab', { detail: name }));
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === name);
    });
    if (name === 'collection') { flash(''); renderCollection(); }
  }

  function setupCollection() {
    Array.prototype.forEach.call(document.querySelectorAll('.tab:not([disabled])'), function (b) {
      b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
    });
    $('c-export').addEventListener('click', function () {
      var data = { app: 'inazuma-cross-hub', version: 1, exported_on: new Date().toISOString().slice(0, 10), owned: Object.keys(state.owned) };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'inazuma-cross-collezione.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      flash('Esportati ' + data.owned.length + ' personaggi.');
    });
    $('c-import').addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var d = JSON.parse(String(rd.result));
          var ids = Array.isArray(d) ? d : d.owned;
          if (!Array.isArray(ids)) throw new Error('formato non riconosciuto');
          var known = {};
          state.chars.forEach(function (c) { known[c.id] = true; });
          var ok = ids.map(String).filter(function (id) { return known[id]; });
          var skipped = ids.length - ok.length;
          var o = {};
          ok.forEach(function (id) { o[id] = true; });
          state.owned = o;
          saveOwned(); updateBadge(); renderCollection();
          flash('Importati ' + ok.length + ' personaggi' + (skipped ? ' (' + skipped + ' id sconosciuti ignorati)' : '') + '. La collezione precedente è stata sostituita.');
        } catch (e) { flash('Importazione fallita: ' + e.message); }
      };
      rd.readAsText(f);
    });
    $('c-clear').addEventListener('click', function () {
      if (ownedCount() === 0) return;
      if (!window.confirm('Rimuovere tutti i ' + ownedCount() + ' personaggi dalla collezione?')) return;
      state.owned = {}; saveOwned(); updateBadge(); renderCollection(); flash('Collezione svuotata.');
    });
  }


  function uniqueSorted(key) {
    var seen = {};
    state.chars.forEach(function (c) { if (c[key]) seen[c[key]] = (seen[c[key]] || 0) + 1; });
    return Object.keys(seen).sort(function (a, b) { return seen[b] - seen[a] || a.localeCompare(b); })
      .map(function (k) { return [k, k + ' (' + seen[k] + ')']; });
  }

  load().then(function () {
    var m = state.meta;
    fillSelect($('f-element'), Object.keys(m.elements).map(function (k) { return [k, m.elements[k].it]; }));
    fillSelect($('f-position'), Object.keys(m.positions).map(function (k) { return [k, m.positions[k].it]; }));
    fillSelect($('f-rarity'), [3, 2, 1].map(function (n) { return [String(n), '★'.repeat(n)]; }));
    state.chars.forEach(function (c) { c._hay = haystack(c); });
    state.owned = loadOwned();
    var known = {};
    state.chars.forEach(function (c) { known[c.id] = true; });
    Object.keys(state.owned).forEach(function (id) { if (!known[id]) delete state.owned[id]; });
    updateBadge();
    setupCollection();
    fillSelect($('f-team'), uniqueSorted('team_ja'));
    fillSelect($('f-series'), uniqueSorted('series_ja'));
    fillSelect($('f-sort'), SORTS);
    var ids = ['q', 'f-element', 'f-position', 'f-rarity', 'f-team', 'f-series', 'f-sort', 'f-complete'];
    ids.forEach(function (id) {
      $(id).addEventListener(id === 'q' ? 'input' : 'change', render);
    });
    $('f-reset').addEventListener('click', function () {
      ids.forEach(function (id) {
        var n = $(id);
        if (n.type === 'checkbox') n.checked = false; else n.value = (id === 'f-sort' ? 'default' : '');
      });
      render();
    });
    render();
    window.IEC.loaded = true;
    document.dispatchEvent(new CustomEvent('iec-ready'));
  }).catch(function (err) {
    var box = $('error');
    box.hidden = false;
    box.textContent = 'Impossibile caricare i dati: ' + err.message +
      '. Se hai aperto il file con doppio clic, avvia un piccolo server locale (python3 -m http.server).';
  });
})();
