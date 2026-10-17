// Uso: node tests/engine.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const E = require('../js/engine.js');
const root = path.join(__dirname, '..');
const J = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const D = require('../js/iecdata.js');
const raw = J('data/site/chars.json').chars;
const chars = raw.map(c => D.forLevel(c, 440));
const aliases = J('data/tag_aliases.json');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('parsePassive: 結束 con tag e soglia', () => {
  const p = E.parsePassive({ unlock: 'Lv41', name_ja: 'x', effect_ja: '試合開始時、雷門タグの味方が3人以上いる場合、味方DFのブロックを770上昇' });
  assert.deepStrictEqual([p.cond.type, p.cond.tag, p.cond.n], ['tag', '雷門', 3]);
  const c = p.clauses[0];
  assert.strictEqual(c.kind, 'stat'); assert.deepStrictEqual(c.stats, ['block']); assert.strictEqual(c.value, 770);
  assert.deepStrictEqual(c.target.pos, ['DF']);
});
t('parsePassive: 共鳴 e due clausole', () => {
  const p = E.parsePassive({ unlock: '初期', name_ja: 'x', effect_ja: '試合開始時、林属性の味方が3人以上いる場合、味方林属性DFのブロックを862上昇、味方GKのキャッチを862上昇' });
  assert.strictEqual(p.cond.type, 'elem'); assert.strictEqual(p.cond.elem, 'Forest');
  assert.strictEqual(p.clauses.length, 2);
  assert.deepStrictEqual(p.clauses[0].target.elems, ['Forest']);
});
t('parsePassive: trigger -> event; nemico -> enemy; self implicito', () => {
  const a = E.parsePassive({ unlock: 'Lv41', name_ja: 'x', effect_ja: '自身のドリブル技が成功した時、敵DFのブロックをN低下'.replace('N', '758') + '　終了条件：味方がゴールを入れた時' });
  assert.strictEqual(a.cond.type, 'event'); assert.ok(a.clauses[0].target.enemy); assert.ok(a.clauses[0].down);
  const b = E.parsePassive({ unlock: 'Lv11', name_ja: 'x', effect_ja: '試合開始時、自身のキックを1344上昇' });
  assert.ok(b.clauses[0].target.self); assert.strictEqual(b.cond.type, 'none');
});
t('parsePassive: % e TP ignorati, non finiscono tra i non interpretati', () => {
  const p = E.parsePassive({ unlock: 'Lv41', name_ja: 'x', effect_ja: '自身の最大TPを30上昇' });
  assert.strictEqual(p.clauses.length, 0); assert.strictEqual(p.unparsed.length, 0);
  const q = E.parsePassive({ unlock: 'Lv41', name_ja: 'x', effect_ja: '自身のドリブル技が成功するたび、自身のテクニックをX上昇'.replace('X', '967') });
  assert.strictEqual(q.clauses.length, 1);
});
t('tutte le passive dei 124 personaggi: nessuna eccezione, valori finiti', () => {
  const eng = new E.Engine(chars, aliases);
  let clauses = 0, unparsed = 0, total = 0;
  chars.forEach(c => { total += c.passives.length; eng.passivesOf(c).forEach(p => { clauses += p.clauses.length; unparsed += p.unparsed.length; p.clauses.forEach(cl => assert.ok(Number.isFinite(cl.value))); }); });
  console.log('   passive', total, '| clausole interpretate', clauses, '| frasi non interpretate', unparsed);
  assert.ok(clauses > 300);
});
t('结束: soglia tag rispettata (雷門 con 2 vs 3 membri)', () => {
  const eng = new E.Engine(chars, aliases);
  const rai = chars.filter(c => c.team_ja === '雷門中' && c.passives.some(p => /雷門タグの味方が3人以上/.test(p.effect_ja)));
  assert.ok(rai.length >= 3, 'servono 3 personaggi 雷門 con 結束');
  const three = eng.scoreTeam(rai.slice(0, 3)), two = eng.scoreTeam(rai.slice(0, 2));
  assert.strictEqual(two.unmet.filter(u => u.need && u.need.tag === '雷門').length > 0, true);
  assert.ok(three.effects.length > 0);
});
t('stima: personaggio con statistiche mancanti -> base > 0 e marcato stimato', () => {
  const eng = new E.Engine(chars, aliases);
  const nul = Object.assign({}, chars.find(c => c.position === 'FW'), { id: 'x', stats_max: { tp: 100, kick: null, technique: null, block: null, catch: null, speed: 4 } });
  const b = eng.baseOf(nul); assert.ok(b.estimated && b.value > 0);
});
t('dati sito: 124 personaggi, tutte le statistiche presenti, 1 squadra+1 tipo+1 serie ciascuno', () => {
  assert.strictEqual(chars.length, 124);
  chars.forEach(c => { ['kick', 'technique', 'block', 'catch'].forEach(k => assert.ok(c.stats_max[k] > 0, c.name_ja)); assert.ok(c.team_ja && c.type_ja && c.series_ja, c.name_ja); });
});
t('adattatore: livello 1 = stat Lv1; livello 440 = stat Lv440; intermedi crescenti; tp/velocità costanti', () => {
  const c = raw[0], a = D.forLevel(c, 1), b = D.forLevel(c, 440), m = D.forLevel(c, 220);
  assert.deepStrictEqual(a.stats_max, c.stats_lv1); assert.deepStrictEqual(b.stats_max, c.stats_max);
  assert.ok(a.stats_max.kick <= m.stats_max.kick && m.stats_max.kick <= b.stats_max.kick);
  assert.strictEqual(m.stats_max.tp, c.stats_max.tp); assert.strictEqual(m.stats_max.speed, c.stats_max.speed);
});
t('adattatore: passive base per livello (Lv1 -> bloccate/prime tacche, 440 -> massimo); rarità sempre al massimo', () => {
  const c = raw.find(x => x.name_ja === '円堂 守'), lo = D.forLevel(c, 1), hi = D.forLevel(c, 440), mid = D.forLevel(c, 60);
  const find = (o, id) => o.passives.find(p => p.id === id);
  const id0 = c.basic_passives[0].id;
  assert.strictEqual(find(lo, id0).level, 0); assert.strictEqual(find(lo, id0).effect_ja, '');
  assert.strictEqual(find(hi, id0).level, c.basic_passives[0].levels.length);
  assert.ok(find(mid, id0).level > 0 && find(mid, id0).level < find(hi, id0).level);
  assert.ok(lo.passives.filter(p => p.unlock === 'ADVANCED' || p.unlock === 'ADVANCED+').every(p => p.level === p.max_level));
});
t('adattatore: tutte le passive a Lv 440 interpretate dal motore (nessuna frase non interpretata)', () => {
  let un = 0, cl = 0;
  chars.forEach(c => c.passives.forEach(p => { if (!p.effect_ja) return; const r = E.parsePassive({ unlock: p.unlock, name_ja: p.name_ja, effect_ja: p.effect_ja }); un += r.unparsed.length; cl += r.clauses.length; }));
  console.log('   clausole', cl, '| non interpretate', un);
  assert.strictEqual(un, 0); assert.ok(cl > 450);
});
t('migrazione id: ogni vecchio id punta a un personaggio esistente, senza doppioni', () => {
  const mig = J('data/site/id_migration.json'), ids = new Set(chars.map(c => c.id));
  const v = Object.values(mig); assert.strictEqual(v.length, 124); assert.strictEqual(new Set(v).size, 124); v.forEach(x => assert.ok(ids.has(x)));
});
const CO = J('data/coaches.json'), coaches = CO.coaches, f5 = CO.five_vs_five_formations.formations;
t('layout dei 14 tecnici: 11 slot, GK=1, condizioni entro 1..11', () => {
  const eng = new E.Engine(chars, aliases);
  coaches.forEach(c => {
    const r = eng.rolesFromLayout(c.layout); assert.strictEqual(r.length, 11, c.id); assert.strictEqual(r[10], 'GK');
    c.formation_condition.forEach(cd => assert.ok(cd.slot >= 1 && cd.slot <= 11, c.id));
  });
});
t('tecnico: passiva sempre attiva, formazione tutto-o-niente', () => {
  const eng = new E.Engine(chars, aliases);
  const co = coaches.find(c => c.id === 'protagonist'), roles = eng.rolesFromLayout(co.layout);
  const pool = chars.slice();
  const r = eng.build(pool, roles, co, { restarts: 3 });
  const d = r.teams[0].detail;
  assert.ok(d.coach.formationActive, 'con tutto il roster la formazione deve attivarsi');
  assert.ok(d.coach.coachPoints > 0 && d.coach.formationPoints > 0);
  // squadra che viola le condizioni: formazione spenta, passiva tecnico resta
  const bad = roles.map((r, i) => eng.member(chars.find(c => c.position === 'GK' && c.id !== (r === 'GK' ? '' : '')), r)).slice(0, 11);
  const s = eng.scoreTeam(bad, { coach: co });
  assert.strictEqual(s.coach.formationActive, false); assert.ok(s.coach.coachPoints > 0); assert.strictEqual(s.coach.formationPoints, 0);
});
t('ruoli liberi: un GK in slot FW è ammesso e ha base stimata/penalizzata', () => {
  const eng = new E.Engine(chars, aliases);
  const gk = chars.find(c => c.position === 'GK');
  const m = eng.member(gk, 'FW'); assert.strictEqual(m.position, 'FW'); assert.strictEqual(m.native, 'GK');
  assert.ok(Number.isFinite(eng.baseOf(m).value));
});
t('ricerca 5v5 (senza tecnico): deterministica, slot rispettati', () => {
  const eng = new E.Engine(chars, aliases);
  const f = f5[0], roles = eng.rolesFromLayout(f.slots);
  const a = eng.build(chars, roles, null), b = eng.build(chars, roles, null);
  assert.deepStrictEqual(a.teams.map(x => x.ids), b.teams.map(x => x.ids));
  assert.strictEqual(a.teams[0].slots.length, 5); assert.strictEqual(a.teams[0].detail.coach, null);
  assert.ok(a.teams.length >= 2 && a.teams[0].score >= a.teams[1].score);
});
t('collezione piccola: mancanti segnalati, nessun crash', () => {
  const eng = new E.Engine(chars, aliases);
  const pool = chars.filter(c => c.team_ja === '雷門中').slice(0, 6);
  const co = coaches[0], r = eng.build(pool, eng.rolesFromLayout(co.layout), co);
  assert.ok(r.teams.length >= 1); assert.ok(r.missing.slots >= 1); assert.ok(Number.isFinite(r.teams[0].score));
});
t('tutti i tecnici su tutto il roster: tempo e risultato', () => {
  const eng = new E.Engine(chars, aliases);
  const t0 = Date.now(); const r = eng.buildAllCoaches(chars, coaches); const ms = Date.now() - t0;
  console.log('   tutti i tecnici:', ms, 'ms;', r.teams.map(x => x.coach + ' ' + x.score.toFixed(0)).join(' / '));
  assert.ok(ms < 60000); assert.strictEqual(r.teams[0].slots.length, 11);
});
console.log(n, 'test passati');
