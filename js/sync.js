/* Sincronizzazione della collezione tra computer con un Gist PRIVATO dell'utente su GitHub (nessun server nostro).
   Il token (permesso "Gist") resta solo in questo browser. Dati sincronizzati: tutte le chiavi "iecross.*" tranne quelle della sincronizzazione stessa.
   Conflitti: ogni salvataggio scrive un'ora (updated); se il cloud è più recente dell'ultimo scaricato/salvato da questo browser, push() segnala conflitto.
   UMD: window.IECSync.Sync (browser) e require() (test). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.IECSync = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var FILE = 'iecross-hub.json', API = 'https://api.github.com';
  var K_TOKEN = 'iecross.sync.token', K_GIST = 'iecross.sync.gist', K_LAST = 'iecross.sync.last', K_AUTO = 'iecross.sync.auto';

  function Sync(storage, fetchFn) { this.st = storage; this.f = fetchFn; }
  var P = Sync.prototype;
  P.get = function (k) { try { return this.st.getItem(k); } catch (e) { return null; } };
  P.set = function (k, v) { try { if (v === null || v === undefined) this.st.removeItem(k); else this.st.setItem(k, v); } catch (e) { /* archiviazione bloccata */ } };
  P.hasToken = function () { return !!this.get(K_TOKEN); };
  P.setToken = function (t) { this.set(K_TOKEN, String(t).trim()); this.set(K_GIST, null); this.set(K_LAST, null); };
  P.forget = function () { var me = this; [K_TOKEN, K_GIST, K_LAST, K_AUTO].forEach(function (k) { me.set(k, null); }); };
  P.auto = function () { return this.get(K_AUTO) === '1'; };
  P.setAuto = function (v) { this.set(K_AUTO, v ? '1' : null); };
  P.last = function () { return this.get(K_LAST); };
  // chiavi dei dati: iecross.* senza quelle di sincronizzazione
  P.keys = function () {
    var out = [], n = this.st.length;
    for (var i = 0; i < n; i++) { var k = this.st.key(i); if (k && k.indexOf('iecross.') === 0 && k.indexOf('iecross.sync.') !== 0) out.push(k); }
    return out;
  };
  P.api = function (path, opt) {
    opt = opt || {};
    var h = { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + this.get(K_TOKEN), 'X-GitHub-Api-Version': '2022-11-28' };
    if (opt.body) h['Content-Type'] = 'application/json';
    return this.f(API + path, { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined }).then(function (r) {
      if (r.status === 401) throw new Error('Token non valido o scaduto (401).');
      if (r.status === 403 || r.status === 404) throw new Error('Il token non ha il permesso sui Gist (' + r.status + '): serve «Gists: Read and write».');
      if (!r.ok) throw new Error('Errore GitHub ' + r.status);
      return r.json();
    });
  };
  // id del Gist: salvato, oppure cercato per nome file; con create=true lo crea se manca
  P.gistId = function (create, bundle) {
    var me = this, id = this.get(K_GIST);
    if (id) return Promise.resolve(id);
    return this.api('/gists?per_page=100').then(function (list) {
      var g = (list || []).filter(function (x) { return x.files && x.files[FILE]; })[0];
      if (g) { me.set(K_GIST, g.id); return g.id; }
      if (!create) return null;
      var files = {}; files[FILE] = { content: JSON.stringify(bundle) };
      return me.api('/gists', { method: 'POST', body: { description: 'Inazuma Eleven Cross Hub - collezione (non modificare a mano)', public: false, files: files } }).then(function (c) { me.set(K_GIST, c.id); return c.id; });
    });
  };
  P.bundle = function () {
    var data = {}, me = this; this.keys().forEach(function (k) { data[k] = me.get(k); });
    return { app: 'iecross-hub', version: 1, updated: new Date().toISOString(), data: data };
  };
  function parse(g) {
    var f = g && g.files && g.files[FILE]; if (!f) return null;
    var b = JSON.parse(f.content); return b && b.app === 'iecross-hub' && b.data ? b : null;
  }
  P.readCloud = function (id) {
    var me = this;
    return this.api('/gists/' + id).then(function (g) {
      var f = g.files && g.files[FILE];
      if (f && f.truncated && f.raw_url) return me.f(f.raw_url, { method: 'GET', headers: { 'Authorization': 'Bearer ' + me.get(K_TOKEN) } }).then(function (r) { return r.text(); }).then(function (t) { return JSON.parse(t); });
      return parse(g);
    });
  };
  // push(force): salva sul cloud. Ritorna {ok,count,updated} oppure {conflict,cloudUpdated}
  P.push = function (force) {
    var me = this, b = this.bundle();
    return this.gistId(false).then(function (id) {
      if (!id) return me.gistId(true, b).then(function () { me.set(K_LAST, b.updated); return { ok: true, count: Object.keys(b.data).length, updated: b.updated }; });
      return me.readCloud(id).then(function (cloud) {
        if (!force && cloud && cloud.updated && cloud.updated > (me.last() || '')) return { conflict: true, cloudUpdated: cloud.updated };
        var fresh = me.bundle(), files = {}; files[FILE] = { content: JSON.stringify(fresh) };
        return me.api('/gists/' + id, { method: 'PATCH', body: { files: files } }).then(function () { me.set(K_LAST, fresh.updated); return { ok: true, count: Object.keys(fresh.data).length, updated: fresh.updated }; });
      });
    });
  };
  // pull(): legge dal cloud senza applicare. {empty:true} oppure {bundle}
  P.pull = function () {
    var me = this;
    return this.gistId(false).then(function (id) {
      if (!id) return { empty: true };
      return me.readCloud(id).then(function (b) { return b ? { bundle: b } : { empty: true }; });
    });
  };
  // apply(bundle): sostituisce i dati locali con quelli del cloud
  P.apply = function (b) {
    var me = this; this.keys().forEach(function (k) { me.set(k, null); });
    Object.keys(b.data).forEach(function (k) { if (k.indexOf('iecross.') === 0 && k.indexOf('iecross.sync.') !== 0) me.set(k, b.data[k]); });
    this.set(K_LAST, b.updated);
  };
  return { Sync: Sync };
});
