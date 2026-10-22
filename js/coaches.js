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
    var root = el('article', 'card hcard coach-card'); root.style.setProperty('--el', 'var(--accent)');
    var l = c.layout, roles = [];
    ['FW', 'MF', 'DF', 'GK'].forEach(function (p) { for (var i = 0; i < (l[p] || 0); i++) roles.push(p); });

    var a = el('div', 'hc-img');
    var av = el('div', 'avatar lg coach-av'); av.appendChild(el('span', 'ini', (c.name_west || c.name_ja || '?').charAt(0)));
    var img = el('img'); img.src = 'img/coaches/' + c.id + '.png'; img.alt = ''; img.loading = 'lazy';
    img.addEventListener('error', function () { img.remove(); });
    img.addEventListener('load', function () { av.classList.add('has-img'); });
    av.appendChild(img); a.appendChild(av); root.appendChild(a);

    var main = el('div', 'hc-main'), top = el('div', 'hc-top'), ht = el('div', 'ctitle');
    ht.appendChild(el('h2', null, c.name_west || c.name_ja));
    ht.appendChild(el('div', 'hc-team', c.name_ja + ' · ' + c.formation_ja));
    top.appendChild(ht);
    var own = el('button', 'btn own'); own.type = 'button';
    function paintOwn() { var on = lvOf(c.id) > 0; own.textContent = on ? "✓ Ce l'ho" : "+ Ce l'ho"; own.classList.toggle('on', on); own.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    top.appendChild(own); main.appendChild(top);

    var b = el('div', 'badges');
    b.appendChild(el('span', 'badge el', 'Tecnico'));
    b.appendChild(el('span', 'badge', (l.DF || 0) + '-' + (l.MF || 0) + '-' + (l.FW || 0)));
    if (c.unlock_ja) b.appendChild(el('span', 'badge soft', c.unlock_ja));
    main.appendChild(b);

    var lvRow = el('div', 'hc-lvl'), lab = el('label', null, 'Livello '), sel = el('select', 'mvsel');
    sel.setAttribute('aria-label', 'Livello del tecnico');
    for (var n = 1; n <= 10; n++) { var o = el('option', null, 'Lv ' + n); o.value = String(n); sel.appendChild(o); }
    lab.appendChild(sel); lvRow.appendChild(lab); main.appendChild(lvRow);
    var note = el('small', 'muted');

    var d1 = el('details', 'cdet'); d1.appendChild(el('summary', null, 'Formazione e condizioni'));
    d1.appendChild(el('h3', null, 'Condizioni per attivare la formazione'));
    var ul = el('ul'); c.formation_condition.forEach(function (x) { ul.appendChild(el('li', null, cond(x, roles[x.slot - 1]))); }); d1.appendChild(ul);
    d1.appendChild(el('h3', null, 'Passiva di formazione (solo se tutte le condizioni sono soddisfatte)'));
    var u2 = el('ul'); c.formation_passive.effects.forEach(function (e) { u2.appendChild(el('li', null, effect(e))); }); d1.appendChild(u2);
    d1.appendChild(el('small', 'muted', c.formation_passive.text_ja));
    var d2 = el('details', 'cdet'); d2.appendChild(el('summary', null, 'Passiva sempre attiva'));
    var out = el('ul'); d2.appendChild(out); d2.appendChild(note);
    function draw() {
      var on = lvOf(c.id) > 0, nn = on ? lvOf(c.id) : 10, L = c.coach_passive.levels && c.coach_passive.levels[nn - 1];
      sel.value = String(nn); sel.disabled = !on; lvRow.classList.toggle('off', !on);
      out.textContent = '';
      c.coach_passive.effects.forEach(function (e) { out.appendChild(el('li', null, effect(e, e.ref && L && L[e.ref] !== undefined ? (e.sign || 1) * L[e.ref] : e.value))); });
      note.textContent = on ? 'Valori al livello ' + nn + '.' : 'Non posseduto: qui sono mostrati i valori al livello 10.';
      paintOwn();
    }
    sel.addEventListener('change', function () { lv[c.id] = Math.max(1, Math.min(10, +sel.value || 10)); save(); draw(); });
    own.addEventListener('click', function () { lv[c.id] = lvOf(c.id) > 0 ? 0 : 10; save(); draw(); });
    main.appendChild(d1); main.appendChild(d2);
    root.appendChild(main);
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
