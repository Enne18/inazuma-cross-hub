'use strict';
const assert = require('assert'), { Sync } = require('../js/sync.js').Sync ? require('../js/sync.js') : require('../js/sync.js');
function mem() { const m = {}; return { get length() { return Object.keys(m).length; }, key: i => Object.keys(m)[i], getItem: k => k in m ? m[k] : null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, _m: m }; }
// finto GitHub
const gists = {}; let nid = 1; const calls = [];
function fake(url, o) {
  o = o || {}; calls.push(o.method + ' ' + url);
  const ok = (j) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(j), text: () => Promise.resolve(JSON.stringify(j)) });
  if (!o.headers || o.headers.Authorization !== 'Bearer TK') return Promise.resolve({ ok: false, status: 401 });
  if (o.method === 'GET' && /\/gists\?/.test(url)) return ok(Object.values(gists));
  if (o.method === 'POST') { const id = 'g' + nid++; gists[id] = { id, files: JSON.parse(o.body).files }; assert.strictEqual(JSON.parse(o.body).public, false); return ok(gists[id]); }
  const id = url.split('/gists/')[1];
  if (o.method === 'PATCH') { Object.assign(gists[id].files, JSON.parse(o.body).files); return ok(gists[id]); }
  return ok(gists[id]);
}
(async () => {
  const A = mem(), B = mem();
  A.setItem('iecross.collection.v1', '["1001"]'); A.setItem('iecross.levels.v1', '{"1001":349}'); A.setItem('iecross.sync.token', 'x'); A.setItem('altro', '1');
  const sa = new Sync(A, fake), sb = new Sync(B, fake);
  sa.setToken('TK'); sb.setToken('TK');
  assert.deepStrictEqual(sa.keys().sort(), ['iecross.collection.v1', 'iecross.levels.v1']);   // token e chiavi estranee escluse
  let r = await sa.push(); assert.ok(r.ok, 'prima creazione');
  r = await sb.pull(); assert.ok(r.bundle); sb.apply(r.bundle);
  assert.strictEqual(B.getItem('iecross.levels.v1'), '{"1001":349}'); assert.strictEqual(B.getItem('altro'), null);
  // B modifica e salva; A (non aggiornato) prova a salvare → conflitto
  await new Promise(z => setTimeout(z, 5)); B.setItem('iecross.levels.v1', '{"1001":400}'); r = await sb.push(); assert.ok(r.ok);
  A.setItem('iecross.levels.v1', '{"1001":350}'); r = await sa.push(); assert.ok(r.conflict, 'conflitto rilevato');
  r = await sa.push(true); assert.ok(r.ok, 'con force sovrascrive');
  // token sbagliato
  const sc = new Sync(mem(), fake); sc.setToken('NO'); await assert.rejects(() => sc.push(), /401/);
  // pull su cloud vuoto
  const e = new Sync(mem(), (u, o) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) })); e.setToken('TK'); assert.ok((await e.pull()).empty);
  console.log('sync: ok');
})().catch(x => { console.error(x); process.exit(1); });
