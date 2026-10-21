/* Catalogo: carica data/site/chars.json + meta.json (fonte: inazumaelevencrosshub.com) e mostra i personaggi con filtri base.
   state.base = dati grezzi; state.chars = personaggi al livello massimo (440) nel formato del motore (js/iecdata.js). */
(function () {
  'use strict';
  var state = { meta: null, base: [], chars: [], byId: {}, owned: {}, levels: {}, defaultLevel: 440, rar: {}, mv: {}, migration: {} };
  var KEY = 'iecross.collection.v1', KEY_LV = 'iecross.levels.v1', KEY_DEF = 'iecross.deflevel.v1', KEY_RAR = 'iecross.rarity.v1', KEY_MV = 'iecross.movelv.v1';
  var MAXLV = 440;
  function clampLv(v) { v = Math.round(+v); return isFinite(v) ? Math.max(1, Math.min(MAXLV, v)) : MAXLV; }
  function loadLevels() {
    try {
      var o = JSON.parse(window.localStorage.getItem(KEY_LV) || '{}'), r = {};
      Object.keys(o || {}).forEach(function (id) { r[id] = clampLv(o[id]); });
      var d = window.localStorage.getItem(KEY_DEF);
      state.defaultLevel = d ? clampLv(d) : MAXLV;
      return r;
    } catch (e) { return {}; }
  }
  function saveLevels() {
    try { window.localStorage.setItem(KEY_LV, JSON.stringify(state.levels)); window.localStorage.setItem(KEY_DEF, String(state.defaultLevel)); } catch (e) { /* archiviazione bloccata */ }
  }
  function levelOf(id) { return state.levels[id] || MAXLV; }
  // grado del personaggio (0 Normal ... 9 Legendary+): decide quali passive ADVANCED / ADVANCED+ ha sbloccato (default 9 = tutte)
  function clampRar(v) { v = Math.round(+v); return isFinite(v) ? Math.max(0, Math.min(9, v)) : 9; }
  function rarOf(id) { var r = state.rar[id]; return r === undefined ? 9 : clampRar(r); }
  function loadRar() { try { var o = JSON.parse(window.localStorage.getItem(KEY_RAR) || '{}'); Object.keys(o).forEach(function (id) { state.rar[id] = clampRar(o[id]); }); } catch (e) { /* ignora */ } }
  function saveRar() { try { window.localStorage.setItem(KEY_RAR, JSON.stringify(state.rar)); } catch (e) { /* archiviazione bloccata */ } }
  function setRar(id, r) { state.rar[id] = clampRar(r); saveRar(); }
  // livello delle mosse (1-10) per personaggio e mossa: state.mv[id] = {indice: livello}; default 10
  function clampMv(v) { v = Math.round(+v); return isNaN(v) ? 1 : Math.max(1, Math.min(10, v)); }
  function mvOf(id, i) { var o = state.mv[id]; return o && o[i] !== undefined ? clampMv(o[i]) : 1; }
  function loadMv() { try { var o = JSON.parse(window.localStorage.getItem(KEY_MV) || '{}'); Object.keys(o).forEach(function (id) { state.mv[id] = o[id]; }); } catch (e) { /* ignora */ } }
  function saveMv() { try { window.localStorage.setItem(KEY_MV, JSON.stringify(state.mv)); } catch (e) { /* archiviazione bloccata */ } }
  function setMv(id, i, v) { (state.mv[id] = state.mv[id] || {})[i] = clampMv(v); saveMv(); }
  function flv(id, L) { var m = {}; for (var i = 0; i < 4; i++) m[i] = mvOf(id, i); return window.IECData.forLevel(state.byId[id], L === undefined ? levelOf(id) : L, rarOf(id), m); }

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
  window.IEC = {
    state: state,
    ops: {
      owned: function (id) { return !!state.owned[id]; }, toggle: function (id) { toggleOwn(id); document.dispatchEvent(new CustomEvent('iec-collection', { detail: id })); },
      level: function (id) { return levelOf(id); }, setLevel: function (id, v) { setLvOf(id, v); document.dispatchEvent(new CustomEvent('iec-collection', { detail: id })); },
      rar: function (id) { return rarOf(id); }, setRar: function (id, v) { setRar(id, v); document.dispatchEvent(new CustomEvent('iec-collection', { detail: id })); },
      mv: function (id, i) { return mvOf(id, i); }, setMv: function (id, i, v) { setMv(id, i, v); document.dispatchEvent(new CustomEvent('iec-collection', { detail: id })); },
      leveled: function (id) { return state.owned[id] ? flv(id) : window.IECData.forLevel(state.byId[id], window.IECData.MAX_LEVEL); },
      showTab: function (n) { showTab(n); }, render: function () { render(); }
    },
    levelOf: function (id) { return levelOf(id); },
    // personaggi posseduti, ciascuno al livello scelto dall'utente (stat interpolate, passive per livello)
    ownedChars: function () {
      return state.base.filter(function (b) { return state.owned[b.id]; }).map(function (b) { return flv(b.id); });
    }
  };
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
    return Promise.all([getJSON('data/meta.json'), getJSON('data/site/chars.json'), getJSON('data/site/id_migration.json').catch(function () { return {}; })]).then(function (res) {
      state.meta = res[0];
      state.base = res[1].chars;
      var cnt = {}; state.base.forEach(function (b) { var k = b.name_ja + '|' + (b.name_en || ''); cnt[k] = (cnt[k] || 0) + 1; });
      state.base.forEach(function (b) { b.dup = cnt[b.name_ja + '|' + (b.name_en || '')] > 1; });   // omonimi: si distinguono per squadra
      state.migration = res[2];
      state.chars = state.base.map(function (c) { return window.IECData.forLevel(c, window.IECData.MAX_LEVEL); });
      state.base.forEach(function (b) { state.byId[b.id] = b; });
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

  var charIdx = null;
  function baseChar(id) { if (!charIdx) { charIdx = {}; state.chars.forEach(function (x) { charIdx[x.id] = x; }); } return charIdx[id]; }
  // scheda di un personaggio: se lo possiedi mostra livello e grado, altrimenti la scheda al livello massimo
  function cardFor(id) {
    if (state.owned[id]) return card(flv(id), true);
    return card(baseChar(id));
  }
  function refreshCard(root, id) {
    if ($('f-own').value) { render(); return; }          // con il filtro "in possesso" attivo la lista cambia
    if (root.parentNode) root.parentNode.replaceChild(cardFor(id), root);
    paintCount();
  }

  // sostituisce la scheda con una nuova (dopo una modifica); evita il doppio 'change' durante la sostituzione
  function replaceWith(root, id) {
    if (!root.parentNode || root._replaced) return;
    root._replaced = true;
    root.parentNode.replaceChild(card(flv(id), true), root);
    document.dispatchEvent(new CustomEvent('iec-collection', { detail: id }));
  }
  function toggleOwn(id) {
    if (state.owned[id]) { delete state.owned[id]; delete state.levels[id]; } else { state.owned[id] = true; state.levels[id] = state.defaultLevel; }
    saveLevels();
    if (!saveOwned()) flash('Impossibile salvare nel browser (archiviazione bloccata): la collezione vale solo finché la pagina resta aperta.');
    updateBadge();
  }
  function setLvOf(id, v) { state.levels[id] = clampLv(v); saveLevels(); }

  // scheda orizzontale: immagine cliccabile (apre il dettaglio) a sinistra, a destra nome, squadra, tag, livello e le due tecniche
  function card(c, inCollection) {
    var I18 = window.IECI18N, root = el('article', 'card hcard' + (inCollection ? ' owned-card' : ''));
    root.style.setProperty('--el', 'var(--' + c.element + ')');

    var a = el('a', 'hc-img'); a.href = '#char=' + c.id; a.title = 'Apri la scheda completa'; a.setAttribute('aria-label', 'Apri la scheda di ' + c.name_ja);
    a.appendChild(window.IECUI.avatar(c, 'lg'));
    root.appendChild(a);

    var main = el('div', 'hc-main'), top = el('div', 'hc-top'), ht = el('div', 'ctitle');
    var h = el('h2'); var ha = el('a'); ha.href = '#char=' + c.id; ha.textContent = I18 ? I18.primaryName(c) : (c.name_en || c.name_ja); h.appendChild(ha);
    ht.appendChild(h);
    ht.appendChild(el('div', 'hc-team', c.team_ja || ''));
    top.appendChild(ht);

    var own = el('button', 'btn own'); own.type = 'button';
    var on = !!state.owned[c.id];
    own.textContent = on ? '✓ Ce l\'ho' : '+ Ce l\'ho'; own.classList.toggle('on', on); own.setAttribute('aria-pressed', on ? 'true' : 'false');
    own.addEventListener('click', function () {
      toggleOwn(c.id);
      document.dispatchEvent(new CustomEvent('iec-collection', { detail: c.id }));
      if ($('f-own').value) { render(); return; }          // con il filtro "in possesso" attivo la lista cambia
      if (root.parentNode) root.parentNode.replaceChild(cardFor(c.id), root);
      paintCount();
    });
    top.appendChild(own);
    main.appendChild(top);

    var b = el('div', 'badges');
    b.appendChild(el('span', 'badge el', state.meta.elements[c.element].it));
    b.appendChild(el('span', 'badge', state.meta.positions[c.position].it));
    b.appendChild(el('span', 'badge', '★'.repeat(c.rarity)));
    if (c.type_ja) b.appendChild(el('span', 'badge', c.type_ja));
    if (c.series_ja) b.appendChild(el('span', 'badge soft', c.series_ja));
    if (c.verified !== 'ok') b.appendChild(el('span', 'badge warn', 'Dati ' + ({ parziale: 'parziali', mancante: 'mancanti' }[c.verified] || c.verified)));
    main.appendChild(b);

    if (inCollection) {
      var lv = el('div', 'hc-lvl'), lab = el('label', null, 'Livello '), inp = el('input', 'lvtxt');
      inp.type = 'text'; inp.inputMode = 'numeric'; inp.pattern = '[0-9]*'; inp.value = String(levelOf(c.id)); inp.setAttribute('aria-label', 'Livello');
      inp.addEventListener('change', function () { setLvOf(c.id, inp.value); replaceWith(root, c.id); });
      lab.appendChild(inp); lv.appendChild(lab);
      var lbr = el('label', null, 'Grado '), sr = el('select');
      window.IECData.RARITY_NAMES.forEach(function (n, i) { var o = el('option', null, n); o.value = String(i); sr.appendChild(o); });
      sr.value = String(rarOf(c.id)); sr.setAttribute('aria-label', 'Grado');
      sr.addEventListener('change', function () { setRar(c.id, sr.value); replaceWith(root, c.id); });
      lbr.appendChild(sr); lv.appendChild(lbr);
      main.appendChild(lv);
    }

    var mv = el('div', 'hc-moves');
    c.skills.forEach(function (k, ki) {
      var it = el('div', 'hc-move');
      it.appendChild(el('span', 'mname', k.name_ja));
      if (inCollection) {
        var ms = el('select', 'mvsel'); ms.setAttribute('aria-label', 'Livello mossa');
        for (var n = 1; n <= 10; n++) { var o = el('option', null, 'Lv ' + n); o.value = String(n); ms.appendChild(o); }
        ms.value = String(mvOf(c.id, ki));
        ms.addEventListener('change', function () { setMv(c.id, ki, ms.value); replaceWith(root, c.id); });
        it.appendChild(ms);
      }
      mv.appendChild(it);
    });
    main.appendChild(mv);
    root.appendChild(main);
    return root;
  }

  var SORTS = [
    ['default', 'Ordine originale'], ['name', 'Nome (A-Z)'], ['rarity', 'Rarità (alta prima)'],
    ['kick', 'Calcio (alto prima)'], ['technique', 'Tecnica (alta prima)'], ['block', 'Blocco (alto prima)'],
    ['catch', 'Presa (alta prima)'], ['speed', 'Velocità (alta prima)']
  ];

  function haystack(c) {
    var I = window.IECI18N, parts = [c.name_ja, c.name_en || '', c.name_alt || '', c.team_ja || '', c.version || '', (c.tags_ja || []).join(' ')];
    if (I && I.ready()) {                                   // anche le traduzioni (it/en): nomi, squadra, tag, mosse
      parts.push(I.variants(c.name_en || c.name_ja).join(' '), I.nameIn(c, 'it'), I.nameIn(c, 'en'), I.variants(c.team_ja || '').join(' '));
      (c.tags_ja || []).forEach(function (t) { parts.push(I.variants(t).join(' ')); });
      c.skills.forEach(function (k) { parts.push(I.variants(k.name_ja).join(' ')); });
    }
    c.skills.forEach(function (k) { parts.push(k.name_ja, k.name_en || ''); });
    c.passives.forEach(function (p) { parts.push(p.name_ja, p.effect_ja || '', p.effect_en || ''); });
    return parts.join(' ').toLowerCase();
  }

  function hayOf(c) {
    if (c._hayR) return c._hay;
    c._hay = haystack(c);
    if (window.IECI18N && window.IECI18N.ready()) c._hayR = true;     // finché le traduzioni non sono pronte non si memorizza
    return c._hay;
  }

  function sortList(list, key) {
    if (key === 'default') return list;
    var out = list.slice();
    if (key === 'name') {
      var I = window.IECI18N; out.sort(function (a, b) { return (I ? I.primaryName(a) : a.name_en || a.name_ja).localeCompare(I ? I.primaryName(b) : b.name_en || b.name_ja); });
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

  var shown = 0;
  function paintCount() {
    $('count').textContent = shown + ' di ' + state.chars.length + ' personaggi · ' + ownedCount() + ' in possesso' +
      (shown === 0 ? ' — nessun risultato, prova ad azzerare i filtri' : '');
  }
  function render() {
    var q = $('q').value.trim().toLowerCase();
    var e = $('f-element').value, p = $('f-position').value, r = $('f-rarity').value;
    var t = $('f-team').value, s = $('f-series').value, own = $('f-own').value;
    var list = state.chars.filter(function (c) {
      if (e && c.element !== e) return false;
      if (p && c.position !== p) return false;
      if (r && String(c.rarity) !== r) return false;
      if (t && c.team_ja !== t) return false;
      if (s && c.series_ja !== s) return false;
      if (own === 'yes' && !state.owned[c.id]) return false;
      if (own === 'no' && state.owned[c.id]) return false;
      if (q && hayOf(c).indexOf(q) === -1) return false;
      return true;
    });
    list = sortList(list, $('f-sort').value);
    var grid = $('grid');
    grid.textContent = '';
    list.forEach(function (c) { grid.appendChild(cardFor(c.id)); });
    shown = list.length; paintCount();
  }

  function flash(msg) { $('c-msg').textContent = msg; }

  function showTab(name) {
    ['catalog', 'builder', 'coaches', 'boss', 'detail'].forEach(function (t) { $(t).hidden = (t !== name); });
    document.dispatchEvent(new CustomEvent('iec-tab', { detail: name }));
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === (name === 'detail' ? 'catalog' : name));
    });
  }

  function setupCollection() {
    Array.prototype.forEach.call(document.querySelectorAll('.tab:not([disabled])'), function (b) {
      b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
    });
    $('c-export').addEventListener('click', function () {
      var data = { app: 'inazuma-cross-hub', version: 2, exported_on: new Date().toISOString().slice(0, 10), owned: Object.keys(state.owned), levels: state.levels, default_level: state.defaultLevel, rarity: state.rar, move_levels: state.mv };
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
          var lv = {};
          ok.forEach(function (id) { lv[id] = (d && d.levels && d.levels[id]) ? clampLv(d.levels[id]) : MAXLV; });
          state.levels = lv;
          state.rar = {};
          ok.forEach(function (id) { if (d && d.rarity && d.rarity[id] !== undefined) state.rar[id] = clampRar(d.rarity[id]); });
          saveRar();
          state.mv = {}; ok.forEach(function (id) { if (d && d.move_levels && d.move_levels[id]) state.mv[id] = d.move_levels[id]; }); saveMv();
          if (d && d.default_level) state.defaultLevel = clampLv(d.default_level);
          saveLevels(); saveOwned(); updateBadge(); render();
          flash('Importati ' + ok.length + ' personaggi' + (skipped ? ' (' + skipped + ' id sconosciuti ignorati)' : '') + '. La collezione precedente è stata sostituita.');
        } catch (e) { flash('Importazione fallita: ' + e.message); }
      };
      rd.readAsText(f);
    });
    var im = $('opt-images');
    im.checked = window.IECUI.imagesOn();
    im.addEventListener('change', function () { window.IECUI.setImages(im.checked); render(); flash(im.checked ? 'Immagini attivate.' : 'Immagini spente: restano le pastiglie.'); });
    var all = $('c-lvl-all');
    all.value = String(state.defaultLevel);
    all.addEventListener('change', function () { state.defaultLevel = clampLv(all.value); all.value = String(state.defaultLevel); saveLevels(); });
    $('c-lvl-apply').addEventListener('click', function () {
      var v = clampLv(all.value); all.value = String(v); state.defaultLevel = v;
      Object.keys(state.owned).forEach(function (id) { state.levels[id] = v; });
      saveLevels(); render();
      flash('Livello ' + v + ' impostato per tutti i ' + ownedCount() + ' personaggi (e per i prossimi che aggiungi).');
    });
    var rs = $('c-rar-all');
    window.IECData.RARITY_NAMES.forEach(function (n, i) { var o = el('option', null, n); o.value = String(i); rs.appendChild(o); });
    rs.value = '9';
    $('c-rar-apply').addEventListener('click', function () {
      var r = clampRar(rs.value);
      Object.keys(state.owned).forEach(function (id) { state.rar[id] = r; });
      saveRar(); render();
      flash('Grado "' + window.IECData.RARITY_NAMES[r] + '" impostato per tutti i ' + ownedCount() + ' personaggi.');
    });
    $('c-mv-apply').addEventListener('click', function () {
      var v = clampMv($('c-mv-all').value);
      Object.keys(state.owned).forEach(function (id) { state.mv[id] = {}; for (var i = 0; i < 4; i++) state.mv[id][i] = v; });
      saveMv(); render();
      flash('Livello mosse ' + v + ' impostato per tutti i ' + ownedCount() + ' personaggi.');
    });
    $('c-clear').addEventListener('click', function () {
      if (ownedCount() === 0) return;
      if (!window.confirm('Rimuovere tutti i ' + ownedCount() + ' personaggi dalla collezione?')) return;
      state.owned = {}; state.levels = {}; state.rar = {}; state.mv = {}; saveMv(); saveRar(); saveOwned(); saveLevels(); updateBadge(); render(); flash('Collezione svuotata.');
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
    state.owned = loadOwned();
    var known = {};
    state.chars.forEach(function (c) { known[c.id] = true; });
    var moved = false;   // collezioni salvate con i vecchi id (AppMedia) -> nuovi id del sito
    Object.keys(state.owned).forEach(function (id) {
      if (known[id]) return;
      if (state.migration[id] && known[state.migration[id]]) { state.owned[state.migration[id]] = true; moved = true; }
      delete state.owned[id];
    });
    if (moved) saveOwned();
    state.levels = loadLevels();
    loadRar(); loadMv();
    Object.keys(state.owned).forEach(function (id) { if (!state.levels[id]) state.levels[id] = MAXLV; });
    saveLevels();
    updateBadge();
    setupCollection();
    fillSelect($('f-team'), uniqueSorted('team_ja'));
    fillSelect($('f-series'), uniqueSorted('series_ja'));
    fillSelect($('f-sort'), SORTS);
    var ids = ['q', 'f-own', 'f-element', 'f-position', 'f-rarity', 'f-team', 'f-series', 'f-sort'];
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
    document.addEventListener('iec-lang', function () { render(); });
    window.IEC.loaded = true;
    document.dispatchEvent(new CustomEvent('iec-ready'));
  }).catch(function (err) {
    var box = $('error');
    box.hidden = false;
    box.textContent = 'Impossibile caricare i dati: ' + err.message +
      '. Se hai aperto il file con doppio clic, avvia un piccolo server locale (python3 -m http.server).';
  });
})();
