/* Pagina "Tecnici": scheda di ogni tecnico (formazione, condizioni, passive, livello). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  var KEY = 'iecross.coachlv.v1', coaches = null, lv = {}, started = false;
  var STAT = { kick: 'Calcio', technique: 'Tecnica', block: 'Blocco', catch: 'Parata' };
  var SKILL = { shoot: 'potenza delle tecniche di tiro', dribble: 'potenza delle tecniche di dribbling', block: 'potenza delle tecniche di blocco', catch: 'potenza delle tecniche di parata', keeper: 'potenza delle tecniche del portiere', all: 'potenza di tutte le tecniche' };
  var ROLE = { FW: 'attaccante', MF: 'centrocampista', DF: 'difensore', GK: 'portiere' };

  function load() { try { lv = JSON.parse(window.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { lv = {}; } }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(lv)); } catch (e) { /* ignora */ } }
  function lvOf(id) { var v = lv[id]; return v === undefined ? 10 : Math.max(0, Math.min(10, +v)); }

  function elIt(e) { var m = window.IEC.state.meta.elements[e]; return m ? m.it : e; }
  function who(t) {
    if (t.who === 'enemy') return 'Avversari';
    var p = [];
    if (t.pos) p.push(ROLE[t.pos] + ' consigliato (ruolo naturale)');
    if (t.element) p.push('di elemento ' + elIt(t.element));
    if (t.tag) p.push('con tag ' + t.tag);
    if (t.type) p.push('tipo ' + t.type);
    return p.length ? 'Alleati: ' + p.join(', ') : 'Tutti gli alleati';
  }
  function effect(e, val) {
    var what = e.kind === 'stat' ? (STAT[e.stat] || e.stat) : (SKILL[e.skill] || 'potenza ' + e.skill);
    var n = val !== undefined ? val : e.value;
    return who(e.target) + ' → ' + what + (n < 0 ? ' ' : ' +') + n + (e.timing === 'on_event' && e.event ? ' (' + e.event + ')' : (e.timing === 'second_half_start' ? ' (inizio secondo tempo)' : ''));
  }
  function cond(c, role) {
    var p = [];
    if (c.position) p.push('ruolo naturale ' + ROLE[c.position]);
    if (c.element) p.push('elemento ' + elIt(c.element));
    if (c.elements) p.push('elemento ' + c.elements.map(elIt).join(' oppure '));
    if (c.tag) p.push('tag ' + c.tag);
    if (c.type) p.push('tipo ' + c.type);
    return 'Slot ' + c.slot + ' (' + ROLE[role] + '): ' + p.join(', ');
  }

  function card(c) {
    var root = el('article', 'card coach');
    var head = el('div', 'coach-head');
    var img = el('img', 'coach-img'); img.src = 'img/coaches/' + c.id + '.png'; img.alt = c.name_west || c.name_ja; img.loading = 'lazy';
    img.addEventListener('error', function () { img.remove(); });
    head.appendChild(img);
    var t = el('div');
    t.appendChild(el('h2', null, c.name_west || c.name_ja));
    t.appendChild(el('div', 'ja', c.name_ja + ' · formazione ' + c.formation_ja));
    var l = c.layout;
    t.appendChild(el('div', 'ja', 'Schieramento ' + (l.DF || 0) + '-' + (l.MF || 0) + '-' + (l.FW || 0) + ' (+ portiere)' + (c.unlock_ja ? ' · ' + c.unlock_ja : '')));
    head.appendChild(t); root.appendChild(head);

    var roles = []; ['FW', 'MF', 'DF', 'GK'].forEach(function (p) { for (var i = 0; i < (l[p] || 0); i++) roles.push(p); });
    root.appendChild(el('h3', null, 'Condizioni per attivare la formazione'));
    var ul = el('ul'); c.formation_condition.forEach(function (x) { ul.appendChild(el('li', null, cond(x, roles[x.slot - 1]))); }); root.appendChild(ul);
    root.appendChild(el('h3', null, 'Passiva di formazione (solo se tutte le condizioni sono soddisfatte)'));
    var u2 = el('ul'); c.formation_passive.effects.forEach(function (e) { u2.appendChild(el('li', null, effect(e))); }); root.appendChild(u2);
    root.appendChild(el('small', 'muted', c.formation_passive.text_ja));

    root.appendChild(el('h3', null, 'Passiva sempre attiva'));
    var row = el('div', 'lvl'), lab = el('label', null, 'Livello del mio tecnico (0 = non ce l\'ho) '), inp = el('input');
    inp.type = 'number'; inp.min = '0'; inp.max = '10'; inp.value = String(lvOf(c.id)); lab.appendChild(inp); row.appendChild(lab);
    var out = el('ul');
    function draw() {
      out.textContent = '';
      var n = Math.max(1, lvOf(c.id) || 10), L = c.coach_passive.levels && c.coach_passive.levels[n - 1];
      c.coach_passive.effects.forEach(function (e) { out.appendChild(el('li', null, effect(e, e.ref && L && L[e.ref] !== undefined ? (e.sign || 1) * L[e.ref] : e.value))); });
      note.textContent = lvOf(c.id) === 0 ? 'Non posseduto: qui sono mostrati i valori al livello 10.' : 'Valori al livello ' + n + '.';
    }
    var note = el('small', 'muted');
    inp.addEventListener('change', function () { var v = Math.max(0, Math.min(10, Math.round(+inp.value) || 0)); inp.value = String(v); lv[c.id] = v; save(); draw(); });
    root.appendChild(row); root.appendChild(out); root.appendChild(note);
    if (c.coach_passive.levels_note) root.appendChild(el('div', 'warn', c.coach_passive.levels_note));
    draw();
    return root;
  }

  function start() {
    if (started) { load(); render(); return; }
    started = true;
    fetch('data/coaches.json').then(function (r) { return r.json(); }).then(function (d) { coaches = d.coaches; load(); render(); })
      .catch(function (e) { $('co-msg').textContent = 'Impossibile caricare i tecnici: ' + e.message; });
  }
  function render() {
    var g = $('co-grid'); g.textContent = '';
    coaches.forEach(function (c) { g.appendChild(card(c)); });
    $('co-msg').textContent = coaches.length + ' tecnici';
  }
  document.addEventListener('iec-tab', function (e) { if (e.detail === 'coaches' && window.IEC && window.IEC.loaded) start(); });
})();
