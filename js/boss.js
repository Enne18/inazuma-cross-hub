/* Pagina Boss: prove giornaliere (5 giocatori) e boss del club (3 squadre). Usa Engine.bossBest / bossClub. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var B = null, data = null, aliases = null, byId = {};
  var EL = { Fire: 'Fuoco', Wind: 'Vento', Forest: 'Foresta', Mountain: 'Montagna' };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fmt(n) { return Math.round(n).toLocaleString('it-IT'); }
  function getJSON(p) { return fetch(p).then(function (r) { if (!r.ok) throw new Error(p + ' → HTTP ' + r.status); return r.json(); }); }
  function nm(c) { return window.IECI18N ? window.IECI18N.primaryName(c) : (c.name_en || c.name_ja); }

  function todayIndex(blk) {                       // boss di oggi: rotazione giornaliera dalla data di riferimento
    var a = new Date(blk.anchor_date + 'T00:00:00'), n = new Date(), d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    var days = Math.round((d0 - a) / 86400000), L = blk.bosses.length;
    return (((blk.anchor_index + days) % L) + L) % L;
  }
  function kind() { return $('bo-kind').value; }
  function fillBosses() {
    var blk = B[kind()], sel = $('bo-boss'), t = todayIndex(blk);
    sel.textContent = '';
    blk.bosses.forEach(function (b, i) {
      var o = el('option', null, b.name + ' · ' + EL[b.element] + (kind() === 'daily' ? ' · ' + (b.mode === 'attack' ? 'attacco' : 'difesa') : '') + (i === t ? ' — oggi' : ''));
      o.value = String(i); sel.appendChild(o);
    });
    sel.value = String(t);
    $('bo-target-wrap').hidden = kind() !== 'daily';
    onBoss();
  }
  function onBoss() {
    if (kind() !== 'daily') return;
    var b = B.daily.bosses[+$('bo-boss').value];
    $('bo-target').value = String(B.daily.target[b.mode]);
  }

  function row(o, i) {
    var c = byId[o.id], li = el('li');
    li.appendChild(el('strong', null, (i + 1) + '. ' + nm(c)));
    li.appendChild(document.createTextNode(' — ' + (o.move || 'nessuna tecnica adatta') + ' (' + (EL[o.element] || '–') + ') → '));
    li.appendChild(el('strong', null, fmt(o.value)));
    var sm = el('small', 'muted', ' potenza ' + fmt(o.power) + ' · stat ' + fmt(o.stat) + (o.chained ? ' · catena ×1,1' : ''));
    li.appendChild(sm);
    return li;
  }
  function teamBlock(t, title) {
    var box = el('div', 'team'), h = el('h3', null, title + ' — totale ' + fmt(t.total));
    box.appendChild(h);
    var ol = el('ol'); t.order.forEach(function (o, i) { ol.appendChild(row(o, i)); }); box.appendChild(ol);
    return box;
  }

  function run() {
    var out = $('bo-out'), msg = $('bo-msg');
    out.textContent = '';
    var blk = B[kind()], b = blk.bosses[+$('bo-boss').value];
    var pool = $('bo-pool').value === 'owned' ? window.IEC.ownedChars() : data.chars.slice();
    var need = kind() === 'club' ? 15 : 5;
    if (pool.length < need) { msg.textContent = 'Servono almeno ' + need + ' personaggi (ne hai ' + pool.length + '). Segna i personaggi che possiedi nella pagina Personaggi, oppure scegli "Tutti".'; return; }
    msg.textContent = 'Calcolo in corso…';
    setTimeout(function () {
      try {
        var eng = new window.IECEngine.Engine(data.chars, aliases, {}), t0 = Date.now();
        var boss = { mode: b.mode, element: b.element, field: kind() === 'club' ? blk.field_bonus : 0 };
        var h = el('h3', null, b.name + ' · ' + EL[b.element] + (b.tech ? ' · ' + b.tech : '') + (kind() === 'daily' ? ' · prova di ' + (b.mode === 'attack' ? 'attacco (tiri)' : 'difesa (parate/contrasti)') : ' · tiri contro il boss (campo +' + blk.field_bonus + ' ai tiri in vantaggio)'));
        out.appendChild(h);
        if (kind() === 'daily') {
          var r = eng.bossBest(pool, boss), target = +$('bo-target').value || blk.target[b.mode], diff = r.total - target;
          out.appendChild(el('p', diff >= 0 ? 'okline' : 'muted', (diff >= 0 ? '✔ Battuto: ' : '✘ Non basta: ') + fmt(r.total) + ' contro ' + fmt(target) + ' (' + (diff >= 0 ? '+' : '−') + fmt(Math.abs(diff)) + ')'));
          out.appendChild(teamBlock(r, 'Squadra consigliata, in ordine di schieramento'));
        } else {
          var c = eng.bossClub(pool, boss);
          out.appendChild(el('p', null, 'Stima della somma dei 3 tentativi: ' + fmt(c.total)));
          c.teams.forEach(function (t, i) { out.appendChild(teamBlock(t, 'Tentativo ' + (i + 1))); });
        }
        out.appendChild(el('p', 'muted small', 'Stima: livelli delle tecniche assunti al massimo, zone ideali e adesivi non inclusi.'));
        msg.textContent = 'Fatto (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s).';
      } catch (e) { msg.textContent = 'Errore nel calcolo: ' + e.message; }
    }, 20);
  }

  var ready = false;
  function init() {
    if (ready || !(window.IEC && window.IEC.loaded)) return;
    data = window.IEC.state; data.chars.forEach(function (c) { byId[c.id] = c; });
    Promise.all([getJSON('data/bosses.json'), getJSON('data/tag_aliases.json')]).then(function (r) {
      B = r[0]; aliases = r[1]; ready = true;
      $('bo-kind').addEventListener('change', fillBosses);
      $('bo-boss').addEventListener('change', onBoss);
      $('bo-run').addEventListener('click', run);
      fillBosses();
    }).catch(function (e) { $('bo-msg').textContent = 'Impossibile caricare i dati dei boss: ' + e.message; });
  }
  document.addEventListener('iec-ready', init);
  document.addEventListener('iec-tab', function (e) { if (e.detail === 'boss') init(); });
  init();
})();
