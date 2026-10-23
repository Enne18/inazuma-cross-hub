/* Pagina "Tecnici": scheda di ogni tecnico (formazione, condizioni, passive, livello). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  var KEY = 'iecross.coachlv.v1', coaches = null, lv = {}, started = false;
  function load() { try { lv = JSON.parse(window.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { lv = {}; } }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(lv)); } catch (e) { /* ignora */ } }
  function lvOf(id) { var v = lv[id]; return v === undefined ? 10 : Math.max(0, Math.min(10, +v)); }

  // testi generati localizzati (it / en / ja)
  function L() { return window.IECI18N ? window.IECI18N.lang() : 'it'; }
  function pk(o) { var l = L(); return o[l] !== undefined ? o[l] : o.it; }
  var STAT = { kick: { it: 'Calcio', en: 'Kick', ja: 'キック' }, technique: { it: 'Tecnica', en: 'Technique', ja: 'テクニック' }, block: { it: 'Blocco', en: 'Block', ja: 'ブロック' }, catch: { it: 'Parata', en: 'Catch', ja: 'キャッチ' } };
  var SKILL = {
    shoot: { it: 'potenza delle tecniche di tiro', en: 'shoot move power', ja: 'シュート技威力' }, dribble: { it: 'potenza delle tecniche di dribbling', en: 'dribble move power', ja: 'ドリブル技威力' },
    block: { it: 'potenza delle tecniche di blocco', en: 'block move power', ja: 'ブロック技威力' }, catch: { it: 'potenza delle tecniche di parata', en: 'catch move power', ja: 'キャッチ技威力' },
    keeper: { it: 'potenza delle tecniche del portiere', en: 'keeper move power', ja: 'キーパー技威力' }, all: { it: 'potenza di tutte le tecniche', en: 'all move power', ja: '全技威力' }
  };
  var ROLE = { FW: { it: 'attaccante', en: 'forward', ja: 'FW' }, MF: { it: 'centrocampista', en: 'midfielder', ja: 'MF' }, DF: { it: 'difensore', en: 'defender', ja: 'DF' }, GK: { it: 'portiere', en: 'goalkeeper', ja: 'GK' } };
  var EVT = {
    'quando un tiro alleato viene fermato; termina al gol alleato': { en: 'when an allied shot is stopped; ends on an allied goal', ja: '味方のシュートが止められた時；味方のゴールで終了' },
    'quando un tiro alleato viene fermato; termina al gol': { en: 'when an allied shot is stopped; ends on a goal', ja: '味方のシュートが止められた時；ゴールで終了' },
    'ogni parata riuscita di un alleato; termina al gol': { en: 'each successful catch by an ally; ends on a goal', ja: '味方のキャッチ成功ごと；ゴールで終了' },
    'ogni dribbling riuscito di un MF alleato; termina al gol': { en: 'each successful dribble by an allied MF; ends on a goal', ja: '味方MFのドリブル成功ごと；ゴールで終了' },
    'ogni dribbling riuscito di un MF alleato; termina al gol alleato': { en: 'each successful dribble by an allied MF; ends on an allied goal', ja: '味方MFのドリブル成功ごと；味方のゴールで終了' },
    'dopo un dribbling bloccato/tecnica di blocco riuscita; termina al gol': { en: 'after a blocked dribble / successful block move; ends on a goal', ja: 'ドリブルを止めた／ブロック技成功後；ゴールで終了' },
    'idem': { en: 'same as above', ja: '同上' }
  };
  var EL = { Fire: { it: 'Fuoco', en: 'Fire', ja: '火' }, Wind: { it: 'Vento', en: 'Wind', ja: '風' }, Forest: { it: 'Foresta', en: 'Forest', ja: '林' }, Mountain: { it: 'Montagna', en: 'Mountain', ja: '山' } };
  function elIt(e) { return EL[e] ? pk(EL[e]) : e; }
  function tg(x) { return window.IECI18N && x ? window.IECI18N.t(x) : x; }
  function who(t) {
    var l = L();
    if (t.who === 'enemy') return l === 'en' ? 'Opponents' : l === 'ja' ? '相手' : 'Avversari';
    var p = [];
    if (t.pos) p.push(l === 'en' ? 'recommended ' + pk(ROLE[t.pos]) + ' (natural role)' : l === 'ja' ? '推奨' + pk(ROLE[t.pos]) : pk(ROLE[t.pos]) + ' consigliato (ruolo naturale)');
    if (t.element) p.push(l === 'en' ? 'element ' + elIt(t.element) : l === 'ja' ? elIt(t.element) + '属性' : 'di elemento ' + elIt(t.element));
    if (t.tag) p.push((l === 'en' ? 'tag ' : l === 'ja' ? 'タグ ' : 'con tag ') + tg(t.tag));
    if (t.type) p.push((l === 'en' ? 'type ' : l === 'ja' ? 'タイプ ' : 'tipo ') + tg(t.type));
    if (!p.length) return l === 'en' ? 'All allies' : l === 'ja' ? '味方全員' : 'Tutti gli alleati';
    return (l === 'en' ? 'Allies: ' : l === 'ja' ? '味方：' : 'Alleati: ') + p.join(l === 'ja' ? '、' : ', ');
  }
  function effect(e, val) {
    var l = L(), what = e.kind === 'stat' ? (STAT[e.stat] ? pk(STAT[e.stat]) : e.stat) : (SKILL[e.skill] ? pk(SKILL[e.skill]) : e.skill);
    var n = val !== undefined ? val : e.value, extra = '';
    if (e.timing === 'on_event' && e.event) { var ev = EVT[e.event]; extra = ' (' + (l === 'it' || !ev ? e.event : ev[l]) + ')'; }
    else if (e.timing === 'second_half_start') extra = l === 'en' ? ' (start of second half)' : l === 'ja' ? '（後半開始時）' : ' (inizio secondo tempo)';
    return who(e.target) + ' → ' + what + (n < 0 ? ' ' : ' +') + n + extra;
  }
  function cond(c, role) {
    var l = L(), p = [], r = pk(ROLE[role]);
    if (c.position) p.push((l === 'en' ? 'natural role ' : l === 'ja' ? '推奨ポジション ' : 'ruolo naturale ') + pk(ROLE[c.position]));
    if (c.element) p.push((l === 'en' ? 'element ' : l === 'ja' ? '属性 ' : 'elemento ') + elIt(c.element));
    if (c.elements) p.push((l === 'en' ? 'element ' : l === 'ja' ? '属性 ' : 'elemento ') + c.elements.map(elIt).join(l === 'en' ? ' or ' : l === 'ja' ? ' または ' : ' oppure '));
    if (c.tag) p.push((l === 'en' ? 'tag ' : l === 'ja' ? 'タグ ' : 'tag ') + tg(c.tag));
    if (c.type) p.push((l === 'en' ? 'type ' : l === 'ja' ? 'タイプ ' : 'tipo ') + tg(c.type));
    return (l === 'ja' ? 'スロット' : 'Slot ') + c.slot + ' (' + r + '): ' + p.join(l === 'ja' ? '、' : ', ');
  }
  function trP(t) { var P = window.IECPassives, l = L(); if (!P || l === 'ja' || !t) return t; return P.tr(t, l) || t; }

  function card(c, full) {
    var root = el('article', 'card hcard coach-card'); root.style.setProperty('--el', 'var(--accent)');
    var l = c.layout, roles = [];
    ['FW', 'MF', 'DF', 'GK'].forEach(function (p) { for (var i = 0; i < (l[p] || 0); i++) roles.push(p); });

    var a = full ? el('div', 'hc-img') : el('a', 'hc-img'); if (!full) { a.href = '#coach=' + c.id; a.title = 'Apri la scheda completa'; }
    var av = el('div', 'avatar lg coach-av'); av.appendChild(el('span', 'ini', (c.name_west || c.name_ja || '?').charAt(0)));
    var img = el('img'); img.src = 'img/coaches/' + c.id + '.png'; img.alt = ''; img.loading = 'lazy';
    img.addEventListener('error', function () { img.remove(); });
    img.addEventListener('load', function () { av.classList.add('has-img'); });
    av.appendChild(img); a.appendChild(av); root.appendChild(a);

    var main = el('div', 'hc-main'), top = el('div', 'hc-top'), ht = el('div', 'ctitle');
    ht.appendChild(el('h2', null, L() === 'ja' ? c.name_ja : (c.name_west || c.name_ja)));
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
    if (L() === 'ja') d1.appendChild(el('small', 'muted', c.formation_passive.text_ja));
    var d2 = el('details', 'cdet'); d2.appendChild(el('summary', null, 'Passiva sempre attiva'));
    var out = el('ul'); d2.appendChild(out); d2.appendChild(note);
    function draw() {
      var on = lvOf(c.id) > 0, nn = on ? lvOf(c.id) : 10, L = c.coach_passive.levels && c.coach_passive.levels[nn - 1];
      sel.value = String(nn); sel.disabled = !on; lvRow.classList.toggle('off', !on);
      out.textContent = '';
      c.coach_passive.effects.forEach(function (e) { out.appendChild(el('li', null, effect(e, e.ref && L && L[e.ref] !== undefined ? (e.sign || 1) * L[e.ref] : e.value))); });
      note.textContent = on ? 'Valori al livello ' + nn + '.' : 'Non posseduto: qui sono mostrati i valori al livello 10.';  // tradotto dal DOM (pattern)
      paintOwn();
    }
    sel.addEventListener('change', function () { lv[c.id] = Math.max(1, Math.min(10, +sel.value || 10)); save(); draw(); });
    own.addEventListener('click', function () { lv[c.id] = lvOf(c.id) > 0 ? 0 : 10; save(); draw(); });
    if (full) { d1.open = true; d2.open = true; }
    if (full) { main.appendChild(d1); main.appendChild(d2); }
    else main.appendChild(el('small', 'muted cohint', 'Apri la scheda per condizioni e passive'));
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
    if (window.IECI18N) { window.IECI18N.apply($('co-grid')); window.IECI18N.apply($('co-msg')); }
  }
  // pagina di dettaglio del tecnico: #coach=ID (si apre dal clic sull'immagine)
  var curC = null, y0 = 0;
  function showDetail(id) {
    var c = coaches.filter(function (x) { return x.id === id; })[0], root = $('cdetail'); root.textContent = '';
    var back = el('a', 'btn dback', '← Tecnici'); back.href = '#'; back.addEventListener('click', function (e) { e.preventDefault(); history.pushState('', document.title, location.pathname + location.search); route(); });
    root.appendChild(back);
    root.appendChild(c ? card(c, true) : el('p', 'muted', 'Tecnico non trovato.'));
    if (window.IECI18N) window.IECI18N.apply(root);
  }
  function route() {
    var m = /^#coach=(.+)$/.exec(location.hash || ''), ops = window.IEC && window.IEC.ops;
    if (!ops || !window.IEC.loaded) return;
    if (m) {
      if (!curC) y0 = window.scrollY;
      var go = function () { curC = decodeURIComponent(m[1]); load(); showDetail(curC); ops.showTab('cdetail'); window.scrollTo(0, 0); };
      if (coaches) go(); else { started = true; fetch('data/coaches.json').then(function (r) { return r.json(); }).then(function (d) { coaches = d.coaches; go(); }); }
    } else if (curC) { curC = null; ops.showTab('coaches'); start(); window.scrollTo(0, y0); }
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('iec-ready', route);
  document.addEventListener('iec-tab', function (e) { if (e.detail !== 'cdetail' && curC) { curC = null; history.replaceState('', document.title, location.pathname + location.search); } });
  document.addEventListener('iec-lang', function () { if (coaches) { if (curC) showDetail(curC); else render(); } });
  document.addEventListener('iec-tab', function (e) { if (e.detail === 'coaches' && window.IEC && window.IEC.loaded) start(); });
})();
