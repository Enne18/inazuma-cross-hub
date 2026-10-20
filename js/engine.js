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
    model: 'duel',             // 'duel' = duelli contro un rivale di riferimento (come eljuezholden); 'damage' = somma dei danni; 'legacy' = vecchio punteggio a pesi
    bench: { shot: 140000, catch: 125000, dribble: 95000, block: 95000 }, // potenza di duello del rivale di riferimento a Lv440 (ordine di grandezza dei boss: ~100-170k)
    duelExp: 1.5, duelWeights: { attack: 40, defense: 30, dribble: 15, block: 15 },           // 'damage' = formula del gioco (stat x potenza mossa); 'legacy' = vecchio punteggio a pesi
    roleDamageWeight: { FW: 1, MF: 1, DF: 1, GK: 1 },   // peso del danno per ruolo dello slot (calibrazione: difesa vs attacco)
    moveElementStab: 1.2,      // bonus elemento mossa = elemento personaggio (formula iecrosshub)
    nativeRoleMult: 1.1,       // ipotesi: moltiplicatore ruolo (iecrosshub: B 1.05, A 1.10, S 1.15) nel ruolo naturale
    offRoleMult: 1.0,          // ipotesi: fuori ruolo = nessun bonus; le mosse restano usabili
    offRoleMovePenalty: 0.5    // ipotesi: mossa non adatta al ruolo giocato (DF/GK devono parare/bloccare; FW/MF tirano o dribblano)
  };

  // Guida RR_o (IE Cross Database, v1.4.0): potenza base = stat x risveglio + equipaggiamento del ruolo NATIVO + bonus.
  // le statistiche del sito sono già a Legendary+ (x2: Gazelle Lv440 Tiro 7230 = 3612 x 2), quindi si scala x AWK[grado]/2
  var AWK = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.85, 2];
  var EQ_CURVE = { FW: [[1, 0], [50, 618], [100, 1924], [200, 8125], [300, 13314], [360, 16883], [400, 19783], [440, 23181]],
                   MF: [[1, 0], [50, 615], [100, 1899], [200, 8031], [300, 13158], [360, 16686], [400, 19551], [440, 22902]],
                   DF: [[1, 0], [50, 593], [100, 1851], [200, 7819], [300, 12812], [360, 16246], [400, 19035], [440, 22305]],
                   GK: [[1, 0], [50, 580], [100, 1805], [200, 7621], [300, 12488], [360, 15835], [400, 18555], [440, 21742]] };
  var EQ440 = { FW: { kick: 23181, technique: 17031, block: 11143, catch: 5798 }, MF: { kick: 16760, technique: 22902, block: 11143, catch: 5798 },
                DF: { kick: 6854, technique: 11541, block: 22305, catch: 15552 }, GK: { kick: 11677, technique: 6477, block: 16086, catch: 21742 } };
  var EQ_MAIN = { FW: 'kick', MF: 'technique', DF: 'block', GK: 'catch' };
  function eqAt(role, stat, L) {
    var pts = EQ_CURVE[role], v = pts[pts.length - 1][1];
    for (var i = 1; i < pts.length; i++) if (L <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; v = a[1] + (b[1] - a[1]) * (L - a[0]) / (b[0] - a[0]); break; }
    return EQ440[role][stat] * v / EQ_CURVE[role][pts.length - 1][1];   // le altre statistiche: stessa curva della principale (stima)
  }

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
      var cl = { kind: kind, stats: stats, value: value, down: down, target: tgt, text: part };
      if (kind === 'power') {
        var pc = phrase.match(/(シュート|ドリブル|ブロック|キーパー|キャッチ)技/);
        if (pc) cl.pcat = { 'シュート': 'kick', 'ドリブル': 'technique', 'ブロック': 'block', 'キーパー': 'catch', 'キャッチ': 'catch' }[pc[1]];
        var pe = phrase.match(/([火風林山])属性/); if (pe) cl.pel = ELEM[pe[1]];
        if (!pc) {
          var nm = phrase.replace(/^.*?(?:自身|味方|敵)[^の]*の/, '').replace(/^[火風林山]属性/, '').replace(/(?:の)?(?:技)?威力$/, '').replace(/の$/, '');
          if (nm && nm !== '技' && !/^(?:自身|味方|敵)/.test(nm)) cl.pname = nm;
        }
      }
      clauses.push(cl);
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
      var ke = k.element || m.element;
      var power = pw + (pb[c] || 0) + (pb.all || 0) + (pb['el:' + ke] || 0) + (pb[c + '|el:' + ke] || 0) + (pb['mv:' + k.name_ja] || 0);
      var d = Math.floor(stat * power * 0.01);
      if (ke === m.element) d = Math.floor(d * self.cfg.moveElementStab);
      if (cats.indexOf(c) < 0) d = d * self.cfg.offRoleMovePenalty;
      if (best === null || d > best) best = d;
    });
    return best;
  };

  Engine.prototype.scoreTeam = function (members, opts) {
    var self = this, cfg = this.cfg, coach = opts && opts.coach;
    var out = { total: 0, base: 0, synergy: 0, members: [], effects: [], unmet: [], unparsed: [], estimated: 0, coach: null };
    var SB = members.map(function () { return {}; }), PB = members.map(function () { return {}; });
    out._sb = SB; out._pb = PB; out._rm = {};
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
              else {
                var pk = cl.pname ? 'mv:' + cl.pname : (cl.pcat && cl.pel ? cl.pcat + '|el:' + cl.pel : cl.pcat ? cl.pcat : cl.pel ? 'el:' + cl.pel : 'all');
                PB[ix][pk] = (PB[ix][pk] || 0) + (cl.down ? -1 : 1) * cl.value * fc;
              }
            });
          }
          if (cl.target.enemy) {
            var RR = { kick: 'shot', technique: 'dribble', block: 'block', catch: 'catch' }, PR = { FW: 'shot', MF: 'dribble', DF: 'block', GK: 'catch' }, roles = [];
            if (cl.kind === 'stat') cl.stats.forEach(function (st) { roles.push(RR[st]); });
            else if (cl.pcat) roles.push(RR[cl.pcat]);
            else if (cl.target.pos.length) cl.target.pos.forEach(function (x) { roles.push(PR[x]); });
            else roles = ['shot', 'dribble', 'block', 'catch'];
            var fc2 = cond.type === 'event' ? cfg.conditionalFactor : 1;
            roles.forEach(function (r) { if (!r) return; var o = out._rm[r] || (out._rm[r] = { stat: 0, power: 0 }); o[cl.kind === 'stat' ? 'stat' : 'power'] += cl.value * fc2 * (cfg.debuffWeight || 1); });
          }
          out.synergy += pts;
          out.effects.push({ source: src.id, passive: p.name, text: cl.text, kind: cl.kind, enemy: cl.target.enemy, affected: affected.map(function (m) { return m.id; }), conditional: cond.type === 'event', points: pts });
        });
      });
    });
    if (coach) this.addCoach(coach, members, out);
    if (cfg.model === 'duel') {
      var D = this.duelScore(members, SB, PB, out._rm);
      out.total = D.score; out.parts = D.parts; out.duel = D;
      members.forEach(function (m, i) { var d = self.damageOf(m, SB[i], PB[i]); out.members[i].damage = d === null ? 0 : d; });
    } else if (cfg.model === 'damage') {
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

  function winProb(r, e) { var x = Math.pow(Math.max(0, r), e); return x / (x + 1); }
  // Duello = stat (con bonus) x potenza mossa (con bonus) x elemento x 0.01, contro un rivale di riferimento (meta).
  Engine.prototype.duelScore = function (members, SB, PB, RM) {
    var self = this, cfg = this.cfg, E = cfg.duelExp, W = cfg.duelWeights;
    var B = {}, k, Lsum = 0;
    members.forEach(function (m) { Lsum += m.level || 440; });
    var Lm = Lsum / Math.max(1, members.length), lf = (eqAt('FW', 'kick', Lm) + 7200 * (0.1 + 0.9 * Lm / 440)) / (23181 + 7200);
    ['shot', 'catch', 'dribble', 'block'].forEach(function (r) {
      var b = cfg.bench[r], m = RM[r] || { stat: 0, power: 0 };
      B[r] = Math.max(1, cfg.bench[r] * lf - (m.stat || 0) * cfg.bench[r] / 30000 - (m.power || 0) * cfg.bench[r] / 330);
    });
    var best = members.map(function (m, i) {
      var s = m.stats_max || {}, out = {}, sb = SB[i], pb = PB[i];
      var awk = AWK[m.rarity_grade == null ? 9 : m.rarity_grade] / 2, nat = m.native || m.position, L = m.level || 440;
      (m.skills || []).forEach(function (k) {
        var c = SKILLCAT[k.category] || k.category;
        if (!c || k.power == null || s[c] == null) return;
        var stat = Math.max(0, Math.floor(s[c] * awk) + eqAt(nat, c, L) + (sb[c] || 0));
        var ke = k.element || m.element;     // mosse senza elemento nei dati: si assume quello del personaggio (la maggior parte lo condivide)
        var power = k.power + (pb[c] || 0) + (pb.all || 0) + (pb['el:' + ke] || 0) + (pb[c + '|el:' + ke] || 0) + (pb['mv:' + k.name_ja] || 0);
        var d = Math.floor(stat * Math.max(0, power) * 0.01 * (ke === m.element ? cfg.moveElementStab : 1));
        if (!out[c] || d > out[c].d) out[c] = { d: d, range: k.range, name: k.name_ja };
      });
      return out;
    });
    function prop(i) {                       // quanto tira (FW sempre, MF solo con tiro da lontano)
      var m = members[i], t = best[i].kick; if (!t) return 0;
      if (m.position === 'FW') return 1;
      var r = t.range == null ? 0 : t.range;
      if (m.position === 'MF') return r >= 29 ? 0.9 : r >= 23 ? 0.6 : 0.25;
      return r >= 29 ? 0.3 : 0.1;
    }
    var shooters = [], keeper = null, blockers = [], dribblers = [], tacklers = [];
    members.forEach(function (m, i) {
      var b = best[i], pr = prop(i);
      if (b.kick && pr >= 0.5) shooters.push({ id: m.id, p: winProb(b.kick.d / B.catch, E), w: Math.min(1, pr + 0.1) * (m.position === 'FW' ? 1 : 0.6), d: b.kick.d, move: b.kick.name });
      if (m.position === 'GK') keeper = { id: m.id, p: winProb((b.catch ? b.catch.d : ((m.stats_max.catch || 0) * 2 + 21742 + (SB[i].catch || 0)) * 0.4) / B.shot, E) * (b.catch ? 1 : 0.6), d: b.catch ? b.catch.d : 0 };
      if (b.block && (m.position === 'DF' || m.position === 'MF')) {
        var pb2 = winProb(b.block.d / B.dribble, E);
        tacklers.push({ id: m.id, p: pb2, d: b.block.d });
        blockers.push({ id: m.id, p: winProb(b.block.d / B.shot, E) * (m.position === 'DF' ? 1 : 0.7) });
      }
      if (b.technique && (m.position === 'MF' || m.position === 'FW')) dribblers.push({ id: m.id, p: winProb(b.technique.d / B.block, E), d: b.technique.d });
    });
    function desc(a, f) { return a.sort(function (x, y) { return (f ? f(y) : y.p) - (f ? f(x) : x.p); }); }
    desc(shooters, function (x) { return x.p * x.w; });
    var SW = [0.55, 0.3, 0.15], attack = 0;
    shooters.slice(0, 3).forEach(function (x, i) { attack += SW[i] * x.p * x.w; });
    desc(blockers); desc(dribblers); desc(tacklers);
    var saveP = keeper ? keeper.p : 0;
    var leak = (1 - saveP) * blockers.slice(0, 2).reduce(function (a, b) { return a * (1 - 0.3 * b.p); }, 1);
    var defense = 1 - leak;
    function avg(a, n) { var t = 0; for (var i = 0; i < n; i++) t += a[i] ? a[i].p : 0; return t / n; }
    var dribble = avg(dribblers, 3), block = avg(tacklers, 4);
    var wsum = W.attack + W.defense + W.dribble + W.block;
    var score = 100 * (W.attack * attack + W.defense * defense + W.dribble * dribble + W.block * block) / wsum;
    return { score: score, parts: { attack: attack, defense: defense, dribble: dribble, block: block }, bench: B, shooters: shooters.slice(0, 3), keeper: keeper, blockers: blockers.slice(0, 2), dribblers: dribblers.slice(0, 3), tacklers: tacklers.slice(0, 4) };
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
