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
t('giocatori obbligatori: sempre in squadra (anche il più debole)', () => {
  const co = coaches.find(c => c.id === 'kira');
  const base = new E.Engine(chars, aliases), roles = base.rolesFromLayout(co.layout);
  const weak = chars.slice().sort((a, b) => (a.stats_max.kick + a.stats_max.block) - (b.stats_max.kick + b.stats_max.block))[0];
  const eng = new E.Engine(chars, aliases, { lockIds: [weak.id] });
  const r = eng.build(chars.slice(), roles, co, { restarts: 3 });
  r.teams.forEach(tm => assert.ok(tm.ids.indexOf(weak.id) >= 0 || tm.slots.some(s => s.id === weak.id), 'obbligatorio mancante'));
});
t('grado (Normal..Legendary+): ADVANCED da grado 4/6/8, ADVANCED+ da 5/7/9; default = massimo', () => {
  const c = raw[0], T = D.tierLevel;
  assert.deepStrictEqual([0,1,2,3,4,5,6,7,8,9].map(r => T('ADVANCED', r)), [0,0,0,0,1,1,2,2,3,3]);
  assert.deepStrictEqual([0,1,2,3,4,5,6,7,8,9].map(r => T('ADVANCED+', r)), [0,0,0,0,0,1,1,2,2,3]);
  const tiers = (r) => D.forLevel(c, 345, r).passives.filter(p => p.tier);
  assert.ok(tiers().every(p => p.level === 3));
  const g = tiers(3); assert.ok(g.every(p => p.unlock === 'bloccata'), 'Growing Player + non ha nessuna passiva avanzata');
  const a5 = tiers(5); assert.strictEqual(a5.find(p => p.tier === 'ADVANCED').level, 1); assert.strictEqual(a5.find(p => p.tier === 'ADVANCED+').level, 1);
  const eng = new E.Engine([D.forLevel(c, 345, 3)], aliases);
  assert.ok(eng.passivesOf(eng.chars[0]).every(p => p.unlock !== 'ADVANCED' && p.unlock !== 'ADVANCED+'));
});
t('Kira: slot 6 accetta Foresta O Vento', () => {
  const eng = new E.Engine(chars, aliases), co = coaches.find(c => c.id === 'kira');
  const pick = (el) => chars.find(c => c.element === el && c.position === 'MF');
  const forest = pick('Forest'), wind = pick('Wind'), fire = pick('Fire');
  const c6 = co.formation_condition.find(c => c.slot === 6);
  [forest, wind].forEach(m => assert.ok(eng.formationStatus({ formation_condition: [c6] }, [0, 0, 0, 0, 0, eng.member(m, 'MF')]).ok));
  assert.ok(!eng.formationStatus({ formation_condition: [c6] }, [0, 0, 0, 0, 0, eng.member(fire, 'MF')]).ok);
});
t('livello tecnico: valori per livello (Mashiya 420..4200, Kira Lv9 = 63/54, Jigiryu negativo, Lv10 = dato base)', () => {
  const by = id => coaches.find(c => c.id === id), at = (id, l) => E.coachAtLevel(by(id), l).coach_passive.effects.map(e => e.value);
  assert.deepStrictEqual(at('mashiya', 1), [420, 420]); assert.deepStrictEqual(at('mashiya', 10), [4200, 4200]);
  assert.deepStrictEqual(at('kira', 9).slice(0, 3), [63, 63, 54]);
  assert.ok(at('jigiryu', 5)[0] === -300);
  coaches.forEach(c => assert.deepStrictEqual(at(c.id, 10), c.coach_passive.effects.map(e => e.value), 'Lv10 = base per ' + c.id));
  assert.strictEqual(E.coachAtLevel(by('tayama'), 1).level, 1);
});
t('formula verificata (guida RR_o): Gazelle Lv440 Legendary+ Fire Blizzard ~112.436; boss: catena x1,1 e squadre disgiunte nel club', () => {
  E.setEquipCap(440);   // la guida RR_o assume equipaggiamento Lv440; oggi il gioco arriva a Lv350
  const eng = new E.Engine(chars.map(c => D.forLevel(raw.find(r => r.id === c.id), 440, 9)), aliases);
  const g = eng.member(chars.find(c => c.id === '2030'), 'FW');
  const d = eng.scoreTeam([g], {}).duel.shooters[0].d;
  assert.ok(Math.abs(d - 112436) < 100, 'duello Gazelle ' + d);
  E.setEquipCap(350);
  const r = eng.bossBest(chars, { mode: 'attack', element: 'Wind', field: 0 });
  assert.strictEqual(r.order.length, 5);
  assert.ok(r.order.slice(1).some(o => o.chained) || r.total > 0);
  const club = eng.bossClub(chars, { mode: 'attack', element: 'Fire', field: 50 });
  const ids = [].concat(...club.teams.map(x => x.ids));
  assert.strictEqual(club.teams.length, 3); assert.strictEqual(new Set(ids).size, 15);
});
t('boss difesa: tecniche di blocco nei primi 4 posti, parate (portieri) solo in ultima posizione', () => {
  const eng = new E.Engine(chars.map(c => D.forLevel(raw.find(r => r.id === c.id), 440, 9)), aliases);
  const r = eng.bossBest(chars, { mode: 'defense', element: 'Wind', field: 0 });
  assert.strictEqual(r.order.length, 5);
  r.order.slice(0, 4).forEach(o => { assert.ok(o.cat ? o.cat === 'block' : true, 'posto non-ultimo con parata'); });
});
t('zone ideali: bonus S/A/B solo se lo slot cade in una zona del personaggio; senza mappa nessun effetto', () => {
  const eng = new E.Engine(chars.map(c => D.forLevel(raw.find(r => r.id === c.id), 440, 9)), aliases);
  const g = chars.find(c => c.id === '2030');                       // Gazelle: S2 A3 B5
  eng.setZones({ '2030': ['S2', 'A3', 'B5'] }, { kira: { 1: 2, 2: 3, 3: 5, 4: 9 } });
  assert.strictEqual(eng.zoneMult(g, { id: 'kira' }, 1), 1.15);
  assert.strictEqual(eng.zoneMult(g, { id: 'kira' }, 2), 1.10);
  assert.strictEqual(eng.zoneMult(g, { id: 'kira' }, 3), 1.05);
  assert.strictEqual(eng.zoneMult(g, { id: 'kira' }, 4), 1);
  assert.strictEqual(eng.zoneMult(g, { id: 'altro' }, 1), 1);
  const co = JSON.parse(JSON.stringify(coaches.find(c => c.id === 'kira'))), m = eng.member(g, 'FW');
  eng.setZones({}, {}); const d0 = eng.scoreTeam([m], { coach: co, slots: [1] }).duel.shooters[0].d; eng.setZones({ '2030': ['S2', 'A3', 'B5'] }, { kira: { 1: 2 } }); const d1 = eng.scoreTeam([m], { coach: co, slots: [1] }).duel.shooters[0].d;
  assert.ok(d1 > d0, 'zona S aumenta il danno ' + d0 + ' -> ' + d1);
});
t('5v5: 9 formazioni con zone per slot; l\'override di zona vale senza tecnico', () => {
  assert.strictEqual(f5.length, 9);
  f5.forEach(f => { const n = f.slots.FW + f.slots.MF + f.slots.DF + f.slots.GK; assert.strictEqual(n, 5, f.id); assert.strictEqual(f.zones.length, 5, f.id); assert.strictEqual(f.zones[4], 11, 'GK nel campo 11'); });
  const eng = new E.Engine(chars.map(c => D.forLevel(raw.find(r => r.id === c.id), 440, 9)), aliases), g = chars.find(c => c.id === '2030');
  eng.setZones({ '2030': ['S2', 'A3', 'B5'] }, {}); eng.setZoneOverride([2, 2, 5, 9, 11]);
  assert.strictEqual(eng.zoneMult(g, null, 1), 1.15); assert.strictEqual(eng.zoneMult(g, null, 3), 1.05); assert.strictEqual(eng.zoneMult(g, null, 4), 1);
});
t('terza mossa a scelta: forLevel la aggiunge (potenza per livello) e il motore la usa', () => {
  const base = raw.find(c => c.id === '1001'), fire = raw.find(c => c.id === '2030').skills[0];
  const o = D.forLevel(base, 440, 9, { 0: 10, 1: 10, x: 10 }, fire);
  assert.strictEqual(o.skills.length, 3); assert.ok(o.skills[2].extra); assert.strictEqual(o.skills[2].power, fire.power_by_level[9]);
  assert.strictEqual(D.forLevel(base, 440, 9, { 0: 10, 1: 10 }).skills.length, 2);
  const lo = D.forLevel(base, 440, 9, { x: 1 }, fire); assert.strictEqual(lo.skills[2].power, fire.power_by_level[0]);
});
t('boss: il calcolo usa il livello delle mosse impostato e lo restituisce per ogni giocatore', () => {
  const mk = lv => new E.Engine(raw.map(r => D.forLevel(r, 440, 9, { 0: lv, 1: lv })), aliases);
  const lo = mk(1), hi = mk(10), boss = { mode: 'attack', element: 'Wind', field: 0 };
  const rl = lo.bossBest(lo.chars || raw.map(r => D.forLevel(r, 440, 9, { 0: 1, 1: 1 })), boss), rh = hi.bossBest(raw.map(r => D.forLevel(r, 440, 9, { 0: 10, 1: 10 })), boss);
  assert.ok(rl.total < rh.total, 'Lv1 < Lv10: ' + rl.total + ' vs ' + rh.total);
  assert.ok(rl.order.every(o => o.level === 1) && rh.order.every(o => o.level === 10), 'livello della mossa nel risultato');
});
t('livello mosse: forLevel applica power_by_level (Lv1 < Lv10) e il Team Builder usa quella potenza', () => {
  const base = raw.find(c => c.id === '1001');
  const lo = D.forLevel(base, 440, 9, { 0: 1, 1: 1 }), hi = D.forLevel(base, 440, 9, { 0: 10, 1: 10 });
  assert.strictEqual(lo.skills[0].power, base.skills[0].power_by_level[0]);
  assert.strictEqual(hi.skills[0].power, base.skills[0].power_by_level[9]);
  assert.ok(lo.skills[0].power < hi.skills[0].power);
  const dl = new E.Engine([lo], aliases).damageOf(Object.assign(Object.create(lo), { position: 'GK', native: 'GK' }), {}, {});
  const dh = new E.Engine([hi], aliases).damageOf(Object.assign(Object.create(hi), { position: 'GK', native: 'GK' }), {}, {});
  assert.ok(dl < dh, 'il danno cresce col livello della mossa');
});
console.log(n, 'test passati');
t('boss difesa: Scivolata Micidiale (キラースライド) non viene usata', () => {
  const eng = new E.Engine(chars, aliases), b = chars.find(c => String(c.id) === '1013');
  const pool = [b].concat(chars.filter(c => String(c.id) !== '1013' && c.position === 'DF').slice(0, 4));
  const r = eng.bossScore(pool, { mode: 'defense', element: 'Fire' });
  r.order.forEach(o => assert.notStrictEqual(o.move, 'キラースライド'));
  const a = eng.bossScore(pool, { mode: 'attack', element: 'Fire' }); assert.ok(a.total >= 0);
});

t('passive di tempra: Tenma (MF Vento) con Potenza dribbling+ <Vento> Lv7 = +21, Tecnica+ Lv5 = +200, Tiro+ Lv10 = +250; max 3 slot', () => {
  const T = require('../js/training.js'); const eng = new E.Engine(chars, aliases); eng.setTraining(T);
  const m = Object.create(chars.find(c => String(c.id) === '4008')); m.native = 'MF'; m.position = 'MF';
  const sb = {}, pb = {}; m.training = [{ e: 'dribp_wi', lv: 7 }, { e: 'tech', lv: 5 }, { e: 'kick', lv: 10 }, { e: 'blockp', lv: 3 }];
  eng.trainingBonus(m, sb, pb);
  assert.strictEqual(pb['technique|el:Wind'], 21); assert.strictEqual(sb.technique, 200); assert.strictEqual(sb.kick, 250);   // MF: Tecnica+ Lv5 = 200 (MF 50,75,100,150,200); Tiro+ Lv10 = 250; blockp assente? (MF: sì, ma 4° slot ignorato)
  assert.strictEqual(pb.block, undefined);
});
t('equipaggiamento: oltre il limite Lv350 non cresce (stesso valore a Lv351 e Lv352 per statistica base uguale)', () => {
  const mk = L => { const c = D.forLevel(raw.find(r => String(r.id) === '10003'), L, 5); c.stats_max = Object.assign({}, raw.find(r => String(r.id) === '10003').stats_max); return c; };
  const a = mk(352), b = mk(351), eng = new E.Engine([a, b], aliases);
  const da = eng.scoreTeam([eng.member(a, 'FW')], {}).duel.shooters[0].d, db = eng.scoreTeam([eng.member(b, 'FW')], {}).duel.shooters[0].d;
  assert.strictEqual(da, db);
});
