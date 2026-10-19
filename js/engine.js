/* Motore del Team Builder: funzioni pure, nessun accesso al DOM.
   Punteggio = base (statistiche per ruolo, o stima se mancanti) + sinergie lette dal testo giapponese delle passive.
   Tutti i pesi sono in DEFAULTS e modificabili. Le passive non interpretabili sono elencate in 'unparsed', mai inventate. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IECEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULTS = {
    statWeight: 0.01,          // punti per ogni punto statistica
    powerWeight: 0.1,          // punti per ogni punto di potenza tecnica
    debuffWeight: 0.5,         // peso dei malus sugli avversari (contati una volta)
    conditionalFactor: 0.5,    // peso dei bonus che richiedono eventi di partita (tiri fermati, dribbling riusciti...)
    unlocks: ['初期', 'Lv11', 'Lv41', 'ADVANCED', 'ADVANCED+'], // tutte attive (l'utente gioca con tutto al massimo)
    optionalTeams: {},         // es. {"雷門": true} per contare anche le squadre 'opzionali' degli alias
    uniqueNames: false,        // due versioni dello stesso personaggio POSSONO giocare insieme (confermato dall'utente)
    roleWeights: {
      GK: { catch: 1, block: 0.3 }, DF: { block: 1, technique: 0.3 },
      MF: { technique: 1, kick: 0.5, block: 0.3 }, FW: { kick: 1, technique: 0.5 }
    },
    restarts: 10, seed: 12345, topN: 5, minDiff: 2,
    poolLimit: 60,             // candidati considerati dalla ricerca (i migliori per punteggio singolo + quelli utili al tecnico)
    offRoleEstimateFactor: 0.5, // stima per personaggi senza statistiche messi fuori ruolo
    secondHalfFactor: 0.5,     // effetti solo a inizio secondo tempo
    model: 'damage',           // 'damage' = formula del gioco (stat x potenza mossa); 'legacy' = vecchio punteggio a pesi
    roleDamageWeight: { FW: 1, MF: 1, DF: 1, GK: 1 },   // peso del danno per ruolo dello slot (calibrazione: difesa vs attacco)
    moveElementStab: 1.2,      // bonus elemento mossa = elemento personaggio (formula iecrosshub)
    nativeRoleMult: 1.1,       // ipotesi: moltiplicatore ruolo (iecrosshub: B 1.05, A 1.10, S 1.15) nel ruolo naturale
    offRoleMult: 1.0,          // ipotesi: fuori ruolo = nessun bonus; le mosse restano usabili
    offRoleMovePenalty: 0.5    // ipotesi: mossa non adatta al ruolo giocato (DF/GK devono parare/bloccare; FW/MF tirano o dribblano)
  };

  var ELEM = { '火': 'Fire', '風': 'Wind', '林': 'Forest', '山': 'Mountain' };
  var STATKEY = { 'キック': 'kick', 'テクニック': 'technique', 'ブロック': 'block', 'キャッチ': 'catch' };
  var RATING = { SSS: 6, SS: 5, S: 4, A: 3, B: 2, C: 1 };

  function merge(base, over) {
    var o = {}, k;
    for (k in base) o[k] = base[k];
    if (over) for (k in over) o[k] = over[k];
    return o;
  }

  /* ---------- interpretazione delle passive ---------- */
  var UP = '(?:上昇|低下|減少|増やす|上げる|減らす)';

  function parsePassive(p) {
    var text = (p.effect_ja || '').replace(/[\s　]+/g, ' ');
    var cut = text.search(/終了条件|に終了|（エリア外/);
    if (cut >= 0) text = text.slice(0, cut);
    text = text.replace(/[。\s]+$/, '');
    text = text.replace(/^試合開始時[、， ]?/, '');
    var cond = { type: 'none' };
    var m = text.match(/^(.+?)タグの(?:味方|選手)が(\d+)人以上(?:い|居)る場合[、，]\s*(.*)$/);
    if (m) { cond = { type: 'tag', tag: m[1], n: +m[2] }; text = m[3]; }
    else if ((m = text.match(/^([火風林山])属性(?:の味方|選手)が(\d+)人以上(?:い|居)る場合[、，]\s*(.*)$/))) {
      cond = { type: 'elem', elem: ELEM[m[1]], n: +m[2] }; text = m[3];
    } else if ((m = text.match(/^(.*?(?:たびに?|時|とき))[、，]\s*(.+)$/)) || (m = text.match(/^(.*?たびに?)(.+)$/))) {
      cond = { type: 'event', label: m[1] }; text = m[2];
    }
    var clauses = [], unparsed = [], lastTarget = null;
    text.split(/[、，。]/).forEach(function (part) {
      part = part.trim();
      if (!part) return;
      var mm = part.match(new RegExp('^(.*?)(?:を|が)(\\d+)(%?)' + UP));
      if (!mm || mm[3] === '%' || /最大TP|消費TP|射程|スピード|ファウル|チェイン|クリティカル/.test(mm[1])) {
        if (!/最大TP|消費TP|射程|スピード|ファウル|チェイン|クリティカル|%|ゴール.*時$/.test(part)) unparsed.push(part);
        return;
      }
      var phrase = mm[1], value = +mm[2];
      var down = /低下|減少|減らす/.test(part);
      var kind, stats = [];
      if (/威力/.test(phrase)) kind = 'power';
      else {
        Object.keys(STATKEY).forEach(function (j) { if (phrase.indexOf(j) >= 0) stats.push(STATKEY[j]); });
        if (/パラメータ/.test(phrase)) stats = ['kick', 'technique', 'block', 'catch'];
        if (stats.length) kind = 'stat';
      }
      if (!kind) { unparsed.push(part); return; }
      var tgt = parseTarget(phrase);
      if (tgt.implicit && lastTarget) tgt = lastTarget;
      lastTarget = tgt;
      clauses.push({ kind: kind, stats: stats, value: value, down: down, target: tgt, text: part });
    });
    return { cond: cond, clauses: clauses, unparsed: unparsed, unlock: p.unlock, name: p.name_ja };
  }

  function parseTarget(phrase) {
    var t = { enemy: /敵/.test(phrase), self: false, pos: [], elems: [], tag: null, implicit: false };
    var tg = phrase.match(/^(.*?)タグの味方/);
    if (tg) t.tag = tg[1];
    var rest = tg ? phrase.slice(tg[0].length) : phrase;
    (rest.match(/GK|DF|MF|FW/g) || []).forEach(function (x) { if (t.pos.indexOf(x) < 0) t.pos.push(x); });
    var re = /([火風林山])属性/g, e;
    while ((e = re.exec(rest))) { if (t.elems.indexOf(ELEM[e[1]]) < 0) t.elems.push(ELEM[e[1]]); }
    if (!t.enemy && !t.tag && /自身|自分/.test(phrase)) t.self = true;
    var allies = /味方|選手/.test(phrase) || tg || t.pos.length || /^[火風林山]属性/.test(phrase);
    if (!t.enemy && !t.self && !allies) {
      if (/^(?:威力|[キテブ])/.test(phrase) || /^(?:キック|テクニック|ブロック|キャッチ)/.test(phrase) || /^[^味敵自]*$/.test(phrase)) { t.self = true; t.implicit = true; }
    }
    if (!t.enemy && !t.self && t.pos.length === 0 && !t.tag && t.elems.length === 0) t.all = true;
    return t;
  }

  /* ---------- tag ---------- */
  function makeTagChecker(aliases, cfg) {
    var rules = (aliases && aliases.tags) || {}, ov = (aliases && aliases.character_overrides) || {};
    function has(c, tag, depth) {
      if (depth > 3) return false;
      if ((ov[c.id] || []).indexOf(tag) >= 0) return true;
      var r = rules[tag];
      if (!r) return c.team_ja === tag || c.type_ja === tag || c.series_ja === tag || (c.tags_ja || []).indexOf(tag) >= 0;
      var teams = (r.teams || []).concat(cfg.optionalTeams[tag] ? (r.optional_teams || []) : []);
      if (teams.indexOf(c.team_ja) >= 0) return true;
      if ((r.types || []).indexOf(c.type_ja) >= 0) return true;
      return (r.any_of || []).some(function (t) { return has(c, t, (depth || 0) + 1); });
    }
    return function (c, tag) { return has(c, tag, 0); };
  }

  /* ---------- motore ---------- */
  function Engine(chars, aliases, config) {
    this.cfg = merge(DEFAULTS, config);
    this.chars = chars;
    this.hasTag = makeTagChecker(aliases, this.cfg);
    this.parsed = {};
    this.members = {};
    this.prepareEstimates();
  }

  Engine.prototype.passivesOf = function (c) {
    var cfg = this.cfg;
    if (!this.parsed[c.id]) this.parsed[c.id] = c.passives.map(parsePassive);
    return this.parsed[c.id].filter(function (p) { return cfg.unlocks.indexOf(p.unlock) >= 0; });
  };

  // 'membro' = personaggio che gioca in un certo ruolo (slot). position = ruolo giocato, native = ruolo del personaggio.
  Engine.prototype.member = function (c, role) {
    var k = c.id + '|' + role;
    if (!this.members[k]) {
      var m = Object.create(c);
      m.position = role; m.native = c.position;
      this.members[k] = m;
    }
    return this.members[k];
  };

  Engine.prototype.rawBase = function (c, role) {
    var w = this.cfg.roleWeights[role || c.position], s = c.stats_max || {}, total = 0, main = Object.keys(w)[0];
    if (s[main] === null || s[main] === undefined) return null;
    Object.keys(w).forEach(function (k) { total += w[k] * (s[k] || 0); });
    return total * this.cfg.statWeight;
  };

  Engine.prototype.prepareEstimates = function () {
    var self = this, groups = {};
    this.chars.forEach(function (c) {
      var b = self.rawBase(c, c.position);
      if (b === null) return;
      [c.position + '|' + c.rarity + '|' + (c.rating && c.rating.best), c.position + '|' + (c.rating && c.rating.best), c.position + '|' + c.rarity, c.position].forEach(function (k) {
        (groups[k] = groups[k] || []).push(b);
      });
    });
    this.groups = groups;
  };

  Engine.prototype.baseOf = function (m) {
    var role = m.position, nat = m.native || m.position;
    var b = this.rawBase(m, role);
    if (b !== null) return { value: b, estimated: false };
    var rt = m.rating && m.rating.best, g = this.groups;
    var keys = [nat + '|' + m.rarity + '|' + rt, nat + '|' + rt, nat + '|' + m.rarity, nat];
    for (var i = 0; i < keys.length; i++) {
      var arr = g[keys[i]];
      if (arr && arr.length) {
        var avg = arr.reduce(function (a, x) { return a + x; }, 0) / arr.length;
        var v = avg * (1 - 0.15 * Math.max(0, i - 1)) * (role === nat ? 1 : this.cfg.offRoleEstimateFactor);
        return { value: v, estimated: true };
      }
    }
    return { value: 0, estimated: true };
  };

  function matches(engine, tgt, m, src) {
    if (tgt.enemy) return false;
    if (tgt.self) return m === src;
    if (tgt.pos.length && tgt.pos.indexOf(m.position) < 0) return false;   // ruolo giocato (slot)
    if (tgt.elems.length && tgt.elems.indexOf(m.element) < 0) return false;
    if (tgt.tag && !engine.hasTag(m, tgt.tag)) return false;
    return true;
  }

  // requisito del tecnico su un giocatore: {position|element|tag|type}; 'position' = ruolo consigliato del personaggio (native)
  function reqOk(engine, req, m) {
    if (req.position && (m.native || m.position) !== req.position) return false;
    if (req.element && m.element !== req.element) return false;
    if (req.elements && req.elements.indexOf(m.element) < 0) return false;   // uno qualsiasi degli elementi indicati
    if (req.tag && !engine.hasTag(m, req.tag)) return false;
    if (req.type && m.type_ja !== req.type) return false;
    return true;
  }

  Engine.prototype.formationStatus = function (coach, members) {
    var self = this, det = coach.formation_condition.map(function (cd) {
      var m = members[cd.slot - 1];
      return { slot: cd.slot, req: cd, ok: !!m && reqOk(self, cd, m), who: m ? m.id : null };
    });
    return { ok: det.every(function (d) { return d.ok; }), details: det };
  };

  var ROLECAT = { FW: ['kick'], MF: ['technique', 'kick'], DF: ['block', 'catch'], GK: ['catch'] };
  var SKILLCAT = { shoot: 'kick', dribble: 'technique', block: 'block', catch: 'catch' };
  var POWKIND = { shoot: 'kick', dribble: 'technique', block: 'block', catch: 'catch', keeper: 'catch', all: 'all' };

  // Danno stimato di un membro: floor(stat x potenza/100) per la sua mossa migliore (formula iecrosshub/calculator.js).
  Engine.prototype.damageOf = function (m, sb, pb) {
    var cats = ROLECAT[m.position], s = m.stats_max || {}, best = null, self = this;
    (m.skills || []).forEach(function (k) {
      var c = SKILLCAT[k.category] || k.category, pw = k.power;
      if (!c || pw === null || pw === undefined || s[c] === null || s[c] === undefined) return;
      var stat = Math.floor(Math.max(0, s[c] + (sb[c] || 0)) * ((m.native || m.position) === m.position ? self.cfg.nativeRoleMult : self.cfg.offRoleMult));
      var power = pw + (pb[c] || 0) + (pb.all || 0) + (k.element ? (pb['el:' + k.element] || 0) : 0);
      var d = Math.floor(stat * power * 0.01);
      if (k.element && k.element === m.element) d = Math.floor(d * self.cfg.moveElementStab);
      if (cats.indexOf(c) < 0) d = d * self.cfg.offRoleMovePenalty;
      if (best === null || d > best) best = d;
    });
    return best;
  };

  Engine.prototype.scoreTeam = function (members, opts) {
    var self = this, cfg = this.cfg, coach = opts && opts.coach;
    var out = { total: 0, base: 0, synergy: 0, members: [], effects: [], unmet: [], unparsed: [], estimated: 0, coach: null };
    var SB = members.map(function () { return {}; }), PB = members.map(function () { return {}; });
    out._sb = SB; out._pb = PB;
    members.forEach(function (c) {
      var b = self.baseOf(c);
      out.base += b.value;
      if (b.estimated) out.estimated++;
      out.members.push({ id: c.id, role: c.position, base: b.value, estimated: b.estimated });
    });
    members.forEach(function (src) {
      self.passivesOf(src).forEach(function (p) {
        var cond = p.cond, ok = true, need = null;
        if (cond.type === 'tag') {
          var n = members.filter(function (m) { return self.hasTag(m, cond.tag); }).length;
          if (n < cond.n) { ok = false; need = { tag: cond.tag, have: n, need: cond.n }; }
        } else if (cond.type === 'elem') {
          var ne = members.filter(function (m) { return m.element === cond.elem; }).length;
          if (ne < cond.n) { ok = false; need = { element: cond.elem, have: ne, need: cond.n }; }
        }
        p.unparsed.forEach(function (t) { out.unparsed.push({ source: src.id, passive: p.name, text: t }); });
        p.clauses.forEach(function (cl) {
          var affected, units;
          if (cl.target.enemy) { affected = []; units = 1; }
          else {
            affected = members.filter(function (m) { return matches(self, cl.target, m, src); });
            units = affected.length;
          }
          var per = cl.value * (cl.kind === 'power' ? cfg.powerWeight : cfg.statWeight) * (cl.kind === 'stat' ? cl.stats.length : 1);
          var pts = per * units * (cl.target.enemy ? cfg.debuffWeight : 1) * (cond.type === 'event' ? cfg.conditionalFactor : 1);
          if (!ok) { out.unmet.push({ source: src.id, passive: p.name, need: need, points: pts }); return; }
          if (!cl.target.enemy) {
            var fc = cond.type === 'event' ? cfg.conditionalFactor : 1;
            affected.forEach(function (m) {
              var ix = members.indexOf(m);
              if (cl.kind === 'stat') cl.stats.forEach(function (st) { SB[ix][st] = (SB[ix][st] || 0) + (cl.down ? -1 : 1) * cl.value * fc; });
              else PB[ix].all = (PB[ix].all || 0) + (cl.down ? -1 : 1) * cl.value * fc;
            });
          }
          out.synergy += pts;
          out.effects.push({ source: src.id, passive: p.name, text: cl.text, kind: cl.kind, enemy: cl.target.enemy, affected: affected.map(function (m) { return m.id; }), conditional: cond.type === 'event', points: pts });
        });
      });
    });
    if (coach) this.addCoach(coach, members, out);
    if (cfg.model === 'damage') {
      var tot = 0;
      members.forEach(function (m, i) {
        var d = self.damageOf(m, SB[i], PB[i]);
        if (d === null) { d = self.baseOf(m).value * 10; out.members[i].estimated = true; }
        out.members[i].damage = d;
        tot += d * ((cfg.roleDamageWeight || {})[m.position] === undefined ? 1 : cfg.roleDamageWeight[m.position]);
      });
      out.total = tot;
    } else out.total = out.base + out.synergy;
    delete out._sb; delete out._pb;
    return out;
  };

  Engine.prototype.addCoach = function (coach, members, out) {
    var self = this, cfg = this.cfg, SB = out._sb, PB = out._pb;
    var fs = this.formationStatus(coach, members);
    out.coach = { level: coach.level || null, id: coach.id, name_ja: coach.name_ja, name_west: coach.name_west || null, formation_ja: coach.formation_ja, formationActive: fs.ok, conditions: fs.details, formationPoints: 0, coachPoints: 0, missedFormationPoints: 0 };
    function apply(blk, label, active) {
      blk.effects.forEach(function (ef) {
        var t = ef.target, affected, units;
        if (t.who === 'enemy') { affected = []; units = 1; }
        else {
          affected = members.filter(function (m) {
            if (t.pos && (m.native || m.position) !== t.pos) return false;   // 推奨 = ruolo consigliato del personaggio
            if (t.element && m.element !== t.element) return false;
            if (t.tag && !self.hasTag(m, t.tag)) return false;
            if (t.type && m.type_ja !== t.type) return false;
            return true;
          });
          units = affected.length;
        }
        var per = Math.abs(ef.value) * (ef.kind === 'power' ? cfg.powerWeight : cfg.statWeight);
        var f = ef.timing === 'on_event' ? cfg.conditionalFactor : (ef.timing === 'second_half_start' ? cfg.secondHalfFactor : 1);
        var pts = per * units * (t.who === 'enemy' ? cfg.debuffWeight : 1) * f;
        if (!active) { out.coach.missedFormationPoints += pts; return; }
        if (t.who !== 'enemy') {
          affected.forEach(function (m) {
            var ix = members.indexOf(m), v = Math.abs(ef.value) * f;
            if (ef.kind === 'stat') { if (ef.stat) SB[ix][ef.stat] = (SB[ix][ef.stat] || 0) + v; }
            else if (ef.kind === 'power') { var pk = ef.move_element ? 'el:' + ef.move_element : (POWKIND[ef.skill] || 'all'); PB[ix][pk] = (PB[ix][pk] || 0) + v; }
          });
        }
        out.synergy += pts;
        if (label === 'formazione') out.coach.formationPoints += pts; else out.coach.coachPoints += pts;
        out.effects.push({ source: 'coach:' + coach.id, passive: label + ' (' + coach.name_ja + ')', text: ef.kind + ' ' + (ef.stat || ef.skill) + ' ' + ef.value, kind: ef.kind, enemy: t.who === 'enemy', affected: affected.map(function (m) { return m.id; }), conditional: ef.timing === 'on_event', points: pts, coach: true });
      });
    }
    apply(coach.coach_passive, 'passiva tecnico', true);       // la passiva del tecnico resta sempre
    apply(coach.formation_passive, 'formazione', fs.ok);       // la passiva di formazione solo se TUTTE le condizioni sono soddisfatte
  };

  /* ---------- ricerca ---------- */
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  // roles: array di ruoli per slot (ordine slot: FW, MF, DF, GK). coach: oggetto tecnico o null (5v5).
  Engine.prototype.rolesFromLayout = function (layout) {
    var roles = [];
    ['FW', 'MF', 'DF', 'GK'].forEach(function (p) { for (var i = 0; i < (layout[p] || 0); i++) roles.push(p); });
    return roles;
  };

  Engine.prototype.build = function (pool, roles, coach, override) {
    var saved = this.cfg;
    this.cfg = merge(this.cfg, override);
    try { return this._build(pool, roles, coach); } finally { this.cfg = saved; }
  };

  Engine.prototype._build = function (poolAll, roles, coach) {
    var self = this, cfg = this.cfg, rand = rng(cfg.seed), n = roles.length;
    function ev(team) {
      var ms = [];
      for (var i = 0; i < n; i++) if (team[i]) ms.push(self.member(team[i], roles[i]));
      return self.scoreTeam(ms, { coach: coach }).total;
    }
    var solo = {};
    function soloOf(c, role) {
      var k = c.id + '|' + role;
      if (solo[k] === undefined) solo[k] = self.scoreTeam([self.member(c, role)], null).total;
      return solo[k];
    }
    // pool ridotto
    var ranked = poolAll.slice().sort(function (a, b) { return soloOf(b, b.position) - soloOf(a, a.position); });
    var pool = ranked.slice(0, cfg.poolLimit), inPool = {};
    pool.forEach(function (c) { inPool[c.id] = true; });
    var conds = coach ? coach.formation_condition : [];
    conds.forEach(function (cd) {
      var role = roles[cd.slot - 1] || 'MF', k = 0;
      ranked.filter(function (c) { return reqOk(self, cd, self.member(c, role)); })
        .sort(function (a, b) { return soloOf(b, role) - soloOf(a, role); })
        .slice(0, 6).forEach(function (c) { if (!inPool[c.id]) { inPool[c.id] = true; pool.push(c); } });
    });
    var lockIds = cfg.lockIds || [], locked = {};
    lockIds.forEach(function (id) { locked[id] = true; });
    poolAll.forEach(function (c) { if (locked[c.id] && !inPool[c.id]) { inPool[c.id] = true; pool.push(c); } });
    var found = {}, results = [];

    function initial(noise) {
      var team = new Array(n), used = {}, i;
      function free(c) { return !used[c.id] && (!cfg.uniqueNames || !team.some(function (m) { return m && m.name_ja === c.name_ja; })); }
      function noisy(c, role) { return soloOf(c, role) * (1 + noise * (rand() - 0.5)); }
      conds.forEach(function (cd) {
        var role = roles[cd.slot - 1];
        var cands = pool.filter(function (c) { return free(c) && reqOk(self, cd, self.member(c, role)); });
        cands.sort(function (a, b) { return noisy(b, role) - noisy(a, role); });
        if (cands.length) { team[cd.slot - 1] = cands[0]; used[cands[0].id] = true; }
      });
      for (i = 0; i < n; i++) {
        if (team[i]) continue;
        var cs = pool.filter(free);
        cs.sort(function (a, b) { return noisy(b, roles[i]) - noisy(a, roles[i]); });
        if (cs.length) { team[i] = cs[0]; used[cs[0].id] = true; }
      }
      // giocatori bloccati: devono essere in squadra (sostituiscono gli slot non bloccati col punteggio singolo più basso)
      pool.filter(function (c) { return locked[c.id] && team.indexOf(c) < 0; }).forEach(function (c) {
        var worst = -1, ws = Infinity;
        for (i = 0; i < n; i++) { if (team[i] && locked[team[i].id]) continue; var v = team[i] ? soloOf(team[i], roles[i]) : -1; if (v < ws) { ws = v; worst = i; } }
        if (worst >= 0) team[worst] = c;
      });
      return team;
    }

    function improve(team) {
      var best = ev(team), changed = true, passes = 0, i, j;
      while (changed && passes++ < 12) {
        changed = false;
        for (i = 0; i < n; i++) {
          var cur = team[i], bestC = cur;
          if (cur && locked[cur.id]) continue;
          for (var k = 0; k < pool.length; k++) {
            var c = pool[k];
            if (team.indexOf(c) >= 0) continue;
            if (cfg.uniqueNames && team.some(function (m, idx) { return idx !== i && m && m.name_ja === c.name_ja; })) continue;
            team[i] = c;
            var s = ev(team);
            if (s > best + 1e-9) { best = s; bestC = c; changed = true; }
          }
          team[i] = bestC;
        }
        for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
          if (!team[i] || !team[j] || roles[i] === roles[j]) continue;
          var t = team[i]; team[i] = team[j]; team[j] = t;
          var s2 = ev(team);
          if (s2 > best + 1e-9) { best = s2; changed = true; } else { t = team[i]; team[i] = team[j]; team[j] = t; }
        }
      }
      return team;
    }

    for (var r = 0; r < cfg.restarts; r++) {
      var team = improve(initial(r === 0 ? 0 : 0.8));
      var ids = team.filter(Boolean).map(function (c) { return c.id; });
      var key = ids.join(',');
      if (found[key]) continue;
      found[key] = true;
      var ms = team.map(function (c, i) { return c ? self.member(c, roles[i]) : null; }).filter(Boolean);
      var detail = self.scoreTeam(ms, { coach: coach });
      results.push({ team: team.filter(Boolean), slots: team.map(function (c, i) { return { slot: i + 1, role: roles[i], char: c }; }), ids: ids.slice().sort(), detail: detail, score: detail.total, coach: coach ? coach.id : null });
    }
    results.sort(function (a, b) { return b.score - a.score; });
    var picked = [];
    results.forEach(function (x) {
      if (picked.length >= cfg.topN) return;
      var far = picked.every(function (y) {
        var common = x.ids.filter(function (id) { return y.ids.indexOf(id) >= 0; }).length;
        return Math.max(x.ids.length, y.ids.length) - common >= cfg.minDiff;
      });
      if (far) picked.push(x);
    });
    var missing = {};
    if (poolAll.length < n) missing.slots = n - poolAll.length;
    return { teams: picked, missing: missing, poolSize: poolAll.length };
  };

  // prova tutti i tecnici (meno ripartenze per ciascuno) e restituisce i migliori in assoluto
  Engine.prototype.buildAllCoaches = function (pool, coaches, override) {
    var self = this, all = [];
    coaches.forEach(function (co) {
      var r = self.build(pool, self.rolesFromLayout(co.layout), co, merge({ restarts: 4, topN: 2 }, override));
      r.teams.forEach(function (t) { all.push(t); });
    });
    all.sort(function (a, b) { return b.score - a.score; });
    return { teams: all.slice(0, (override && override.topN) || this.cfg.topN), poolSize: pool.length, missing: {} };
  };

  // Copia del tecnico con la passiva "sempre attiva" al livello indicato (1-10), dalle tabelle per livello (coach_passive.levels).
  function coachAtLevel(co, lvl) {
    var cp = co.coach_passive, lv = Math.max(1, Math.min(10, Math.round(lvl) || 10));
    var out = merge(co, { level: lv });
    if (!cp || !cp.levels || !cp.levels[lv - 1]) return out;
    var row = cp.levels[lv - 1];
    out.coach_passive = merge(cp, { effects: cp.effects.map(function (e) {
      return e.ref && row[e.ref] !== undefined ? merge(e, { value: (e.sign || 1) * row[e.ref] }) : e;
    }) });
    return out;
  }

  return { Engine: Engine, DEFAULTS: DEFAULTS, coachAtLevel: coachAtLevel, parsePassive: parsePassive, parseTarget: parseTarget };
});
