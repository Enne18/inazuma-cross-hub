/* Pagina di dettaglio di un personaggio (si apre dal clic sull'immagine: #char=ID). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var cur = null, scrollY0 = 0;
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function nm(c) { return window.IECI18N ? window.IECI18N.primaryName(c) : (c.name_en || c.name_ja); }
  var STATS = ['kick', 'technique', 'block', 'catch', 'speed', 'tp'];
  var CAT = { shoot: 'Tiro', dribble: 'Dribbling', block: 'Blocco', catch: 'Parata' };

  function table(head, rows) {
    var t = el('table', 'dt'), th = el('tr');
    head.forEach(function (h) { th.appendChild(el('th', null, h)); }); t.appendChild(th);
    rows.forEach(function (r) { var tr = el('tr'); r.forEach(function (v) { tr.appendChild(el('td', null, v === null || v === undefined ? '—' : String(v))); }); t.appendChild(tr); });
    return t;
  }
  var ZONES = null, zonesReq = false;
  function loadZones() {
    if (zonesReq) return; zonesReq = true;
    fetch('data/zones.json').then(function (r) { return r.json(); }).then(function (d) { ZONES = d.zones; if (cur) render(cur); }).catch(function () {});
  }
  var movesLoaded = false;
  function lang() { return window.IECI18N ? window.IECI18N.lang() : 'it'; }
  function trP(t) { var P = window.IECPassives, L = lang(); if (!P || L === 'ja') return t; return P.tr(t, L) || t; }
  function trN(n) { var P = window.IECPassives, L = lang(); if (!P || L === 'ja') return n; return P.trName(n, L) || n; }
  function loadMoves() {
    if (movesLoaded || !window.IECPassives) return; movesLoaded = true;
    fetch('data/moves.json').then(function (r) { return r.json(); }).then(function (d) { window.IECPassives.setMoves(d.moves); if (cur) render(cur); }).catch(function () {});
  }
  function sec(title) { var s = el('section', 'dsec'); s.appendChild(el('h3', null, title)); return s; }

  function render(id) {
    loadMoves(); loadZones();
    var IEC = window.IEC, ops = IEC.ops, S = IEC.state, base = S.byId[id], root = $('detail');
    root.textContent = '';
    if (!base) { root.appendChild(el('p', 'muted', 'Personaggio non trovato.')); return; }
    var owned = ops.owned(id), c = ops.leveled(id), D = window.IECData;
    root.style.setProperty('--el', 'var(--' + c.element + ')');

    var back = el('a', 'btn dback', '← Personaggi'); back.href = '#'; back.addEventListener('click', function (e) { e.preventDefault(); close(); });
    root.appendChild(back);

    var head = el('div', 'dhead');
    head.appendChild(window.IECUI.avatar(c, 'lg'));
    var ht = el('div', 'dtitle');
    ht.appendChild(el('h2', null, nm(c)));
    ht.appendChild(el('div', 'hc-team', c.team_ja || ''));
    ht.appendChild(el('div', 'muted small', [c.name_ja, c.name_en && c.name_en !== nm(c) ? c.name_en : '', c.version || '', 'ID ' + c.id].filter(Boolean).join(' · ')));
    var b = el('div', 'badges');
    b.appendChild(el('span', 'badge el', S.meta.elements[c.element].it));
    b.appendChild(el('span', 'badge', S.meta.positions[c.position].it));
    b.appendChild(el('span', 'badge', '★'.repeat(c.rarity)));
    (c.tags_ja || []).forEach(function (t) { b.appendChild(el('span', 'badge soft', t)); });
    if (c.rating && c.rating.best) b.appendChild(el('span', 'badge', 'Valutazione ' + c.rating.best));
    ht.appendChild(b);
    var own = el('button', 'btn own' + (owned ? ' on' : ''), owned ? '✓ Ce l\'ho' : '+ Ce l\'ho'); own.type = 'button';
    own.addEventListener('click', function () { ops.toggle(id); });
    ht.appendChild(own);
    head.appendChild(ht);
    root.appendChild(head);

    if (owned) {
      var ctr = el('div', 'dctl');
      var l1 = el('label', null, 'Livello '), i1 = el('input', 'lvtxt'); i1.type = 'text'; i1.inputMode = 'numeric'; i1.value = String(ops.level(id));
      i1.addEventListener('change', function () { ops.setLevel(id, i1.value); }); l1.appendChild(i1); ctr.appendChild(l1);
      var l2 = el('label', null, 'Grado '), s2 = el('select');
      D.RARITY_NAMES.forEach(function (n, i) { var o = el('option', null, n); o.value = String(i); s2.appendChild(o); });
      s2.value = String(ops.rar(id)); s2.addEventListener('change', function () { ops.setRar(id, s2.value); }); l2.appendChild(s2); ctr.appendChild(l2);
      root.appendChild(ctr);
    }

    // statistiche
    var st = sec('Statistiche');
    var cols = ['Lv 1'].concat(owned ? ['Lv ' + c.level + ' (tuo)'] : []).concat(['Lv 440']);
    var rows = STATS.map(function (k) {
      var r = [S.meta.stat_labels_it[k], base.stats_lv1 ? base.stats_lv1[k] : null];
      if (owned) r.push(c.stats_max ? c.stats_max[k] : null);
      r.push(base.stats_max ? base.stats_max[k] : null);
      return r;
    });
    st.appendChild(table([''].concat(cols), rows));
    st.appendChild(el('p', 'muted small', 'I valori del sito sono a Legendary+. Nel calcolo del Team Builder si aggiungono il coefficiente del grado e l\'equipaggiamento del ruolo.'));
    root.appendChild(st);

    // tecniche
    var sk = sec('Tecniche');
    c.skills.forEach(function (k, i) {
      var box = el('div', 'dmove');
      var hd = el('div', 'dmove-h'); hd.appendChild(el('strong', null, k.name_ja));
      if (owned) {
        var ms = el('select', 'mvsel');
        for (var n = 1; n <= 10; n++) { var o = el('option', null, 'Lv ' + n); o.value = String(n); ms.appendChild(o); }
        ms.value = String(ops.mv(id, i)); ms.addEventListener('change', function () { ops.setMv(id, i, ms.value); }); hd.appendChild(ms);
      }
      box.appendChild(hd);
      var chips = el('div', 'badges');
      [k.element ? S.meta.elements[k.element].it : null, CAT[k.category] || k.category, 'sblocco ' + k.unlock, 'TP ' + k.tp, k.cool_down != null ? 'ricarica ' + k.cool_down : null, k.crit != null ? 'critico ' + k.crit + '%' : null, k.range != null ? 'raggio ' + k.range : null, k.chain ? 'catena' : null]
        .filter(Boolean).forEach(function (t) { chips.appendChild(el('span', 'badge soft', t)); });
      box.appendChild(chips);
      if (k.power_by_level) {
        var hr = []; for (var q = 1; q <= k.power_by_level.length; q++) hr.push('Lv ' + q);
        box.appendChild(table(['Potenza'].concat(hr), [['Potenza'].concat(k.power_by_level)]));
      }
      sk.appendChild(box);
    });
    root.appendChild(sk);

    // passive: tutti i livelli
    var ps = sec('Passive');
    function passList(title, list) {
      if (!list || !list.length) return;
      ps.appendChild(el('h4', null, title));
      list.forEach(function (p) {
        var d = el('details'); d.appendChild(el('summary', null, trN(p.name_ja) + (p.tier ? ' [' + p.tier + ']' : '')));
        (p.levels || []).forEach(function (l, i) {
          var row = el('div', 'item', 'Lv ' + (i + 1) + (l.unlock_lv ? ' (sblocco Lv ' + l.unlock_lv + ')' : '') + ': ' + trP(l.text)); row.title = l.text; d.appendChild(row);
        });
        ps.appendChild(d);
      });
    }
    passList('Passive di livello', base.basic_passives);
    passList('Passive di risveglio (grado)', base.rarity_passives);
    root.appendChild(ps);

    if (ZONES && ZONES[id]) {
      var zs = sec('Zone ideali (S +15%, A +10%, B +5%)'), zr = el('div', 'badges');
      ZONES[id].forEach(function (z) { zr.appendChild(el('span', 'badge' + (z.charAt(0) === 'S' ? ' el' : ' soft'), z.charAt(0) + ' · zona ' + z.slice(1))); });
      zs.appendChild(zr); root.appendChild(zs);
    }
    if (c.notes && c.notes.length) { var ns = sec('Note'); ns.appendChild(el('p', null, c.notes.join(' '))); root.appendChild(ns); }
    if (window.IECI18N) window.IECI18N.apply(root);
  }

  function parse() { var m = /^#char=(.+)$/.exec(location.hash || ''); return m ? decodeURIComponent(m[1]) : null; }
  function open(id) {
    if (!window.IEC || !window.IEC.loaded) return;
    if (!cur) scrollY0 = window.scrollY;
    cur = id; render(id); window.IEC.ops.showTab('detail'); window.scrollTo(0, 0);
  }
  function close() {
    if (location.hash) { history.pushState('', document.title, location.pathname + location.search); }
    cur = null; window.IEC.ops.showTab('catalog'); window.IEC.ops.render(); window.scrollTo(0, scrollY0);
  }
  function route() { var id = parse(); if (id) open(id); else if (cur) { cur = null; window.IEC.ops.showTab('catalog'); window.IEC.ops.render(); window.scrollTo(0, scrollY0); } }
  window.addEventListener('hashchange', route);
  document.addEventListener('iec-ready', route);
  document.addEventListener('iec-collection', function () { if (cur) { var y = window.scrollY; render(cur); window.scrollTo(0, y); } });
  document.addEventListener('iec-lang', function () { if (cur) render(cur); });
  document.addEventListener('iec-tab', function (e) { if (e.detail !== 'detail' && cur) { cur = null; history.replaceState('', document.title, location.pathname + location.search); } });
  route();
})();
