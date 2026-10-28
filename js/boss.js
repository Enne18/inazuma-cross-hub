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

  // Il giorno di gioco cambia alle 22:00 ora di Roma: a quell'ora si passa al boss successivo della rotazione.
  function gameDay() {
    var t = new Date(Date.now() + 2 * 3600000);
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);   // AAAA-MM-GG
    return Date.UTC(+p.slice(0, 4), +p.slice(5, 7) - 1, +p.slice(8, 10)) / 86400000;
  }
  function todayIndex(blk) {                       // boss attuale: rotazione dalla data di riferimento
    var a = blk.anchor_date, days = gameDay() - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) / 86400000, L = blk.bosses.length;
    return (((blk.anchor_index + days) % L) + L) % L;
  }
  function kind() { return $('bo-kind').value; }
  function fillBosses() {
    var blk = B[kind()], sel = $('bo-boss'), daily = kind() === 'daily', t = daily ? todayIndex(blk) : 0;   // i boss del club non cambiano col giorno
    sel.textContent = '';
    blk.bosses.forEach(function (b, i) {
      var o = el('option', null, b.name + ' · ' + EL[b.element] + (kind() === 'daily' ? ' · ' + (b.mode === 'attack' ? 'attacco' : 'difesa') : '') + (daily && i === t ? ' — oggi' : ''));
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

  // riquadro "oggi": boss in corso, quanto manca al cambio (22:00 ora di Roma), boss di domani
  function untilChange() {
    var t = new Date(Date.now() + 2 * 3600000), p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(t).split(':');
    var left = 86400 - (+p[0] * 3600 + +p[1] * 60 + +p[2]), h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60);
    return h + ' h ' + (m < 10 ? '0' : '') + m + ' min';
  }
  function bossLine(b) { return b.name + ' · ' + EL[b.element] + ' · ' + (b.mode === 'attack' ? 'attacco' : 'difesa'); }
  function renderToday() {
    var box = $('bo-today'), blk = B.daily, t = todayIndex(blk), L = blk.bosses.length;
    box.textContent = '';
    box.appendChild(el('strong', null, 'Boss di oggi'));
    var big = el('div', 'bo-t-main'); big.appendChild(bossAvatar(blk.bosses[t])); box.appendChild(big);
    box.appendChild(el('strong', 'bo-t-name', bossLine(blk.bosses[t])));
    box.appendChild(el('small', 'muted', 'Cambia alle 22:00 (ora di Roma) · tra ' + untilChange()));
    box.appendChild(el('small', 'muted', 'Domani: ' + bossLine(blk.bosses[(t + 1) % L])));
    var go = el('button', 'btn primary', 'Squadra migliore per oggi'); go.type = 'button';
    go.addEventListener('click', function () { $('bo-kind').value = 'daily'; fillBosses(); $('bo-pool').value = 'owned'; run(); });
    box.appendChild(go);
  }

  var usedAll = false;   // pool "Tutti i personaggi": le tecniche sono al livello massimo
  function row(o, i) {
    var c = byId[o.id], li = el('li', 'bo-row');
    li.style.setProperty('--el', 'var(--' + (o.element || c.element) + ')');
    li.appendChild(el('span', 'bo-n', String(i + 1)));
    li.appendChild(window.IECUI.avatar(c, 'md'));
    var tx = el('div', 'bo-tx');
    tx.appendChild(el('strong', null, nm(c)));
    var mv = el('div', 'bo-move');
    if (o.move) {
      mv.appendChild(el('span', 'mv-name', o.move));
      mv.appendChild(el('span', 'mv-lv', 'Lv ' + o.level + (usedAll ? ' (massimo)' : '')));
      if (o.extra) mv.appendChild(el('span', 'mv-x', 'terza mossa'));
      mv.appendChild(el('span', 'mv-el', EL[o.element] || '–'));
    } else mv.appendChild(el('span', 'mv-name', 'nessuna tecnica adatta'));
    tx.appendChild(mv);
    tx.appendChild(el('small', 'muted', 'potenza ' + fmt(o.power) + ' · stat ' + fmt(o.stat) + (o.chained ? ' · catena ×1,1' : '')));
    li.appendChild(tx);
    li.appendChild(el('strong', 'bo-val', fmt(o.value)));
    return li;
  }
  function bossAvatar(b) {                          // immagine del boss: il personaggio omonimo, se c'è
    var base = b.name.replace(/ gigante$/, ''), c = null;
    data.chars.some(function (x) { if ((x.name_en || '').replace(/ \(.*\)$/, '') === base) { c = x; return true; } return false; });
    var card = el('div', 'bo-boss');
    card.style.setProperty('--el', 'var(--' + b.element + ')');
    var f = c ? c : { name_ja: base, element: b.element, position: '', rarity: 0 };
    var av = window.IECUI.avatar(f, 'lg'); card.appendChild(av);
    var tx = el('div', 'bo-tx');
    tx.appendChild(el('strong', null, b.name));
    tx.appendChild(el('div', null, EL[b.element] + (b.tech ? ' · ' + b.tech : '')));
    card.appendChild(tx);
    return card;
  }
  function teamBlock(t, title) {
    var box = el('div', 'team'), h = el('h3', null, title + ' — totale ' + fmt(t.total));
    box.appendChild(h);
    var ol = el('ol', 'bo-list'); t.order.forEach(function (o, i) { ol.appendChild(row(o, i)); }); box.appendChild(ol);
    return box;
  }

  function run() {
    var out = $('bo-out'), msg = $('bo-msg');
    out.textContent = '';
    usedAll = $('bo-pool').value !== 'owned';
    var blk = B[kind()], b = blk.bosses[+$('bo-boss').value];
    var pool = $('bo-pool').value === 'owned' ? window.IEC.ownedChars() : data.chars.slice();
    var need = kind() === 'club' ? 15 : 5;
    if (pool.length < need) { msg.textContent = 'Servono almeno ' + need + ' personaggi (ne hai ' + pool.length + '). Segna i personaggi che possiedi nella pagina Personaggi, oppure scegli "Tutti".'; return; }
    msg.textContent = 'Calcolo in corso…';
    setTimeout(function () {
      try {
        var eng = new window.IECEngine.Engine(data.chars, aliases, {}), t0 = Date.now();
        eng.setTraining(window.IECTraining);
        eng.setStickers(window.IECStickers);
        var boss = { mode: b.mode, element: b.element, field: kind() === 'club' ? blk.field_bonus : 0 };
        var h = el('h3', null, b.name + ' · ' + EL[b.element] + (b.tech ? ' · ' + b.tech : ''));
        h.appendChild(document.createTextNode(kind() === 'daily' ? (b.mode === 'attack' ? ' · prova di attacco (tiri)' : ' · prova di difesa (parate/contrasti)') : ' · tiri contro il boss (campo +' + blk.field_bonus + ' ai tiri in vantaggio)'));
        out.appendChild(bossAvatar(b));
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
        out.appendChild(el('p', 'muted small', usedAll ? 'Stima: con "Tutti i personaggi" le tecniche sono al livello massimo; zone ideali e adesivi non inclusi.' : 'Stima: usa i livelli di personaggio e di tecnica che hai impostato nella tua collezione; zone ideali e adesivi non inclusi.'));
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
      fillBosses(); renderToday();
      setInterval(function () { if (!$('boss').hidden) renderToday(); }, 60000);
      if (window.IEC.ownedChars().length >= 5) run();          // all'apertura mostra già la squadra per il boss di oggi
    }).catch(function (e) { $('bo-msg').textContent = 'Impossibile caricare i dati dei boss: ' + e.message; });
  }
  document.addEventListener('iec-ready', init);
  // la collezione (livelli, passive, adesivi...) è cambiata: al ritorno sulla pagina Boss il risultato viene ricalcolato
  var dirty = false;
  document.addEventListener('iec-collection', function () { dirty = true; });
  document.addEventListener('iec-tab', function (e) {
    if (e.detail !== 'boss') return;
    init();
    if (dirty && ready && window.IEC.ownedChars().length >= 5) { dirty = false; run(); }
  });
  init();
})();
