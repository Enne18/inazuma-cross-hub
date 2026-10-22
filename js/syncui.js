/* Interfaccia della sincronizzazione (dentro "Gestione collezione"). */
(function () {
  'use strict';
  if (!window.IECSync) return;
  var $ = function (id) { return document.getElementById(id); };
  var S = new window.IECSync.Sync(window.localStorage, function (u, o) { return window.fetch(u, o); });
  var timer = null;
  function fmt(t) { return t ? new Date(t).toLocaleString() : '—'; }
  function say(m, bad) { var e = $('sy-msg'); if (!e) return; e.textContent = m; e.className = 'small ' + (bad ? 'error' : 'muted'); }
  function paint() {
    if (!$('sy-box')) return;
    var has = S.hasToken();
    $('sy-token-row').hidden = has; $('sy-actions').hidden = !has;
    $('sy-auto').checked = S.auto();
    $('sy-last').textContent = 'Ultima sincronizzazione: ' + fmt(S.last());
  }
  function fail(e) { say('Errore: ' + (e && e.message ? e.message : e), true); }
  function push(force) {
    say('Salvataggio sul cloud…');
    return S.push(force).then(function (r) {
      if (r.conflict) {
        if (window.confirm('Sul cloud ci sono modifiche più recenti (' + fmt(r.cloudUpdated) + ') fatte da un altro computer. Sovrascriverle con i dati di questo computer?')) return push(true);
        say('Salvataggio annullato. Usa "Scarica dal cloud" per prendere i dati del cloud.', true); return;
      }
      say('Salvato sul cloud (' + r.count + ' elementi, ' + fmt(r.updated) + ').'); paint();
    }).catch(fail);
  }
  function pull() {
    say('Lettura dal cloud…');
    return S.pull().then(function (r) {
      if (r.empty) { say('Sul cloud non c\'è ancora nulla: usa "Salva sul cloud" da questo computer.'); return; }
      var n = Object.keys(r.bundle.data).length;
      if (!window.confirm('Sostituire i dati di questo computer con quelli del cloud (' + n + ' elementi, salvati il ' + fmt(r.bundle.updated) + ')?')) { say('Operazione annullata.'); return; }
      S.apply(r.bundle); say('Dati scaricati: ricarico la pagina…'); window.setTimeout(function () { window.location.reload(); }, 600);
    }).catch(fail);
  }
  function schedule() {
    if (!S.hasToken() || !S.auto()) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      S.push(false).then(function (r) { if (r.conflict) say('Salvataggio automatico sospeso: il cloud ha modifiche più recenti. Scegli "Scarica" o "Salva" a mano.', true); else { say('Salvato automaticamente (' + fmt(r.updated) + ').'); paint(); } }).catch(fail);
    }, 4000);
  }
  function boot() {
    var m = $('manage'); if (!m || $('sy-box')) return;
    var box = document.createElement('div'); box.id = 'sy-box'; box.className = 'sy-box';
    box.innerHTML = '<h4>Sincronizza tra computer (GitHub, gratuito)</h4>' +
      '<p class="muted small">I dati vanno in un Gist <b>privato</b> del tuo account GitHub. Serve un token con il solo permesso «Gist» (Settings → Developer settings → Fine-grained tokens o Tokens classic). Il token resta solo in questo browser: non usarlo su computer condivisi.</p>' +
      '<div id="sy-token-row" class="toolbar"><input id="sy-token" type="password" autocomplete="off" placeholder="Incolla qui il token GitHub" aria-label="Token GitHub"><button id="sy-save-token" type="button" class="btn">Collega</button></div>' +
      '<div id="sy-actions" class="toolbar" hidden><button id="sy-push" type="button" class="btn">Salva sul cloud</button><button id="sy-pull" type="button" class="btn">Scarica dal cloud</button>' +
      '<label class="chk"><input id="sy-auto" type="checkbox"> Salva automaticamente dopo ogni modifica</label><button id="sy-forget" type="button" class="btn danger">Scollega questo computer</button></div>' +
      '<p id="sy-last" class="muted small"></p><p id="sy-msg" class="muted small" aria-live="polite"></p>';
    m.appendChild(box);
    $('sy-save-token').addEventListener('click', function () {
      var v = $('sy-token').value.trim(); if (!v) return;
      S.setToken(v); $('sy-token').value = ''; paint(); say('Token salvato. Controllo il cloud…');
      S.gistId(false).then(function (id) { say(id ? 'Trovata una collezione sul cloud: usa "Scarica dal cloud" per averla qui, oppure "Salva sul cloud" per sostituirla.' : 'Collegato. Sul cloud non c\'è ancora nulla: usa "Salva sul cloud".'); }).catch(function (e) { S.forget(); paint(); fail(e); });
    });
    $('sy-push').addEventListener('click', function () { push(false); });
    $('sy-pull').addEventListener('click', pull);
    $('sy-auto').addEventListener('change', function () { S.setAuto(this.checked); schedule(); });
    $('sy-forget').addEventListener('click', function () { if (window.confirm('Scollegare questo computer? I dati sul cloud restano; i dati locali non vengono toccati.')) { S.forget(); paint(); say('Scollegato.'); } });
    paint();
  }
  document.addEventListener('iec-collection', schedule);
  document.addEventListener('iec-ready', boot);
  if (window.IEC && window.IEC.loaded) boot();
})();
