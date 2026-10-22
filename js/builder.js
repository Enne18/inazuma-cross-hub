/* Interfaccia del Team Builder: usa window.IEC (catalog.js) e window.IECEngine (engine.js). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var data = null, formations = [], aliases = null, byId = {};
  var POS_IT = { GK: 'Portiere', DF: 'Difensori', MF: 'Centrocampisti', FW: 'Attaccanti' };
  var ORDER = ['FW', 'MF', 'DF', 'GK'];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function getJSON(p) { return fetch(p).then(function (r) { if (!r.ok) throw new Error(p + ' → HTTP ' + r.status); return r.json(); }); }
  function nm(c) { return c.name_en || c.name_ja; }

  var coaches = [], f5 = [];
  function init() {
    if (data) return;
    data = window.IEC.state;
    data.chars.forEach(function (c) { byId[c.id] = c; });
    Promise.all([getJSON('data/coaches.json'), getJSON('data/tag_aliases.json')]).then(function (r) {
      coaches = r[0].coaches; f5 = r[0].five_vs_five_formations.formations; aliases = r[1];
      $('b-mode').addEventListener('change', onMode);
      $('b-run').addEventListener('click', run);
      setupPick();
      setupCoachLv();
      onMode();
    }).catch(function (e) { $('b-msg').textContent = 'Impossibile caricare i dati dei tecnici: ' + e.message; });
  }

  function fill(sel, list, label) {
    sel.textContent = '';
    list.forEach(function (x) { var o = el('option', null, label(x)); o.value = x.id; sel.appendChild(o); });
  }
  function layoutStr(l) { return (l.DF || 0) + '-' + (l.MF || 0) + '-' + (l.FW || 0); }
  function onMode() {
    var m = $('b-mode').value;
    $('b-coach-wrap').hidden = m !== 'coach';
    $('b-f5-wrap').hidden = m !== '5v5';
    if (m === 'coach' && !$('b-coach').options.length) {
      var all = el('option', null, 'Il migliore tra tutti i tecnici'); all.value = 'all';
      fill($('b-coach'), coaches, function (c) { return (c.name_west ? c.name_west + ' (' + c.name_ja + ')' : c.name_ja) + ' · ' + c.formation_ja + ' · ' + layoutStr(c.layout); });
      $('b-coach').insertBefore(all, $('b-coach').firstChild); $('b-coach').value = 'all';
    }
    if (m === '5v5' && !$('b-f5').options.length) fill($('b-f5'), f5, function (f) { return f.name_ja + ' (FW' + f.slots.FW + ' MF' + f.slots.MF + ' DF' + f.slots.DF + ')'; });
  }

  function need(u) {
    if (!u.need) return '';
    if (u.need.tag) return 'servono ' + u.need.need + ' giocatori con tag ' + u.need.tag + ' (ne hai ' + u.need.have + ')';
    return 'servono ' + u.need.need + ' giocatori di elemento ' + data.meta.elements[u.need.element].it + ' (ne hai ' + u.need.have + ')';
  }

  function teamBox(t, rank) {
    var d = t.detail, box = el('article', 'team');
    var h = el('h3', null, '#' + rank + ' · ');
    h.appendChild(el('span', 'score', 'Punteggio ' + d.total.toFixed(1) + '/100'));
    if (d.parts) h.appendChild(el('small', 'muted', ' attacco ' + Math.round(d.parts.attack * 100) + '% · portiere/difesa ' + Math.round(d.parts.defense * 100) + '% · dribbling ' + Math.round(d.parts.dribble * 100) + '% · contrasto ' + Math.round(d.parts.block * 100) + '%'));
    h.appendChild(document.createTextNode(' (somma dei danni della mossa migliore di ogni giocatore, con bonus di sinergie e tecnico)'));
    box.appendChild(h);
    if (d.estimated) box.appendChild(el('div', 'warn', d.estimated + ' giocatori hanno statistiche stimate (dati mancanti nella fonte): il punteggio è meno affidabile.'));

    if (d.coach) {
      var ch = el('div', d.coach.formationActive ? 'okline' : 'warn', 'Tecnico: ' + (d.coach.name_west ? d.coach.name_west + ' / ' : '') + d.coach.name_ja + (d.coach.level ? ' Lv' + d.coach.level : '') + ' (' + d.coach.formation_ja + ') · passiva di formazione ' +
        (d.coach.formationActive ? 'ATTIVA' : 'NON attiva (condizioni non tutte soddisfatte)'));
      box.appendChild(ch);
    }
    var ro = el('div', 'roster');
    t.slots.forEach(function (s) {
      var c = s.char; if (!c) return;
      var p = el('div', 'pl');
      p.style.setProperty('--el', 'var(--' + c.element + ')');
      p.appendChild(window.IECUI.avatar(c, 'sm'));
      var tx = el('div', 'ptx');
      tx.appendChild(el('b', null, s.slot + '. ' + nm(c)));
      tx.appendChild(el('small', null, 'slot ' + s.role + (c.position !== s.role ? ' (nativo ' + c.position + ')' : '') + ' · ' + data.meta.elements[c.element].it + ' · ' + '★'.repeat(c.rarity) + (c.team_ja ? ' · ' + c.team_ja : '') + (d.members && d.members[s.slot - 1] && d.members[s.slot - 1].damage ? ' · tiro/mossa migliore ~' + Math.round(d.members[s.slot - 1].damage).toLocaleString('it-IT') : '')));
      p.appendChild(tx);
      ro.appendChild(p);
    });
    box.appendChild(ro);

    var act = d.effects.slice().sort(function (a, b) { return b.points - a.points; }).slice(0, 8);
    box.appendChild(el('h4', null, 'Sinergie principali attive'));
    var ul = el('ul');
    if (!act.length) ul.appendChild(el('li', null, 'Nessuna sinergia attiva.'));
    act.forEach(function (e) {
      var src = byId[e.source] || { name_ja: e.passive };
      var who = e.enemy ? 'avversari' : e.affected.length + (e.affected.length === 1 ? ' giocatore' : ' giocatori');
      ul.appendChild(el('li', null, (e.coach ? '' : nm(src) + ' · ') + e.passive + ' → ' + who + ' (+' + e.points.toFixed(1) + (e.conditional ? ', condizionale' : '') + ')'));
    });
    box.appendChild(ul);

    var um = d.unmet.slice().sort(function (a, b) { return b.points - a.points; }).slice(0, 4);
    if (um.length) {
      box.appendChild(el('h4', null, 'Sinergie non attive (potenziale)'));
      var u2 = el('ul');
      um.forEach(function (u) { u2.appendChild(el('li', null, nm(byId[u.source]) + ' · ' + u.passive + ': ' + need(u) + ' (+' + u.points.toFixed(1) + ')')); });
      box.appendChild(u2);
    }
    if (d.unparsed.length) box.appendChild(el('div', 'warn', d.unparsed.length + ' effetti di passive non interpretati (non contati).'));
    return box;
  }

  var lock = [], excl = [];
  function label(c) { return nm(c) + (c.version ? ' (' + c.version + ')' : '') + ' · ' + c.element + ' ' + c.position + ' · ★' + c.rarity + ' [' + c.id + ']'; }
  function chips(boxId, arr) {
    var box = $(boxId); box.textContent = '';
    arr.forEach(function (id) {
      var b = el('button', 'chip', label(byId[id]) + ' ✕'); b.type = 'button'; b.title = 'Rimuovi';
      b.addEventListener('click', function () { arr.splice(arr.indexOf(id), 1); chips(boxId, arr); });
      box.appendChild(b);
    });
  }
  function setupPick() {
    var dl = $('b-names');
    if (dl.options.length) return;
    data.chars.forEach(function (c) { var o = el('option'); o.value = label(c); dl.appendChild(o); });
    [['b-lock-in', 'b-lock-chips', lock, excl], ['b-ex-in', 'b-ex-chips', excl, lock]].forEach(function (x) {
      $(x[0]).addEventListener('change', function () {
        var m = this.value.match(/\[(\d+)\]\s*$/);
        if (m && byId[m[1]]) {
          var other = x[3].indexOf(m[1]); if (other >= 0) { x[3].splice(other, 1); chips(x[0] === 'b-lock-in' ? 'b-ex-chips' : 'b-lock-chips', x[3]); }
          if (x[2].indexOf(m[1]) < 0) x[2].push(m[1]);
          chips(x[1], x[2]); this.value = '';
        }
      });
    });
  }

  var KEY_CLV = 'iecross.coachlv.v1', coachLv = {};
  function loadCoachLv() { try { coachLv = JSON.parse(window.localStorage.getItem(KEY_CLV) || '{}') || {}; } catch (e) { coachLv = {}; } }
  function lvOf(id) { var v = coachLv[id]; return v === undefined ? 10 : Math.max(0, Math.min(10, +v)); }
  function setupCoachLv() {
    loadCoachLv();
    var box = $('b-coach-lv'); box.textContent = '';
    coaches.forEach(function (c) {
      var lb = el('label', null, (c.name_west || c.name_ja) + ' '), inp = el('select');
      var o0 = el('option', null, 'Non posseduto'); o0.value = '0'; inp.appendChild(o0);
      for (var n = 1; n <= 10; n++) { var o = el('option', null, 'Lv ' + n); o.value = String(n); inp.appendChild(o); }
      inp.value = String(lvOf(c.id));
      inp.addEventListener('change', function () {
        var v = Math.max(0, Math.min(10, Math.round(+inp.value) || 0)); coachLv[c.id] = v;
        try { window.localStorage.setItem(KEY_CLV, JSON.stringify(coachLv)); } catch (e) { /* ignora */ }
      });
      lb.appendChild(inp); box.appendChild(lb);
    });
  }
  function leveled(c) { return window.IECEngine.coachAtLevel(c, lvOf(c.id) || 10); }

  function run() {
    var out = $('b-out'), msg = $('b-msg');
    out.textContent = '';
    var pool = $('b-pool').value === 'owned' ? window.IEC.ownedChars() : data.chars.slice();
    pool = pool.filter(function (c) { return excl.indexOf(c.id) < 0; });
    lock.forEach(function (id) { if (!pool.some(function (c) { return c.id === id; })) pool.push(byId[id]); });
    if (!pool.length) { msg.textContent = 'La collezione è vuota: segna i personaggi con "Ce l\'ho" nella pagina Personaggi (oppure scegli "Tutti").'; return; }
    msg.textContent = 'Calcolo in corso…';
    setTimeout(function () {
      try {
        var cfg = { optionalTeams: {}, lockIds: lock.slice() };
        if ($('b-rai').checked) cfg.optionalTeams['雷門'] = true;
        if ($('b-jp').checked) cfg.optionalTeams['イナズマジャパン'] = true;
        var eng = new window.IECEngine.Engine(data.chars, aliases, cfg), res, t0 = Date.now(), m = $('b-mode').value;
        if (m === '5v5') {
          var f = f5.filter(function (x) { return x.id === $('b-f5').value; })[0];
          res = eng.build(pool, eng.rolesFromLayout(f.slots), null);
        } else if ($('b-coach').value === 'all') {
          res = eng.buildAllCoaches(pool, coaches.filter(function (c) { return lvOf(c.id) > 0; }).map(leveled));
        } else {
          var co = coaches.filter(function (x) { return x.id === $('b-coach').value; })[0];
          res = eng.build(pool, eng.rolesFromLayout(co.layout), leveled(co));
        }
        var miss = res.missing && res.missing.slots ? ' Attenzione: mancano ' + res.missing.slots + ' personaggi per completare la formazione.' : '';
        msg.textContent = res.teams.length + ' squadre proposte da ' + res.poolSize + ' personaggi (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s).' + miss;
        res.teams.forEach(function (t, i) { out.appendChild(teamBox(t, i + 1)); });
      } catch (e) { msg.textContent = 'Errore nel calcolo: ' + e.message; }
    }, 20);
  }

  function boot() { if (window.IEC && window.IEC.loaded) init(); }
  document.addEventListener('iec-ready', boot);
  document.addEventListener('iec-tab', function (e) { if (e.detail === 'builder') { boot(); if (data && coaches.length) setupCoachLv(); } });
  boot();
})();
