/* Motore del Team Builder e dei Boss: funzioni pure, nessun accesso al DOM.
   Team Builder: punteggio a duelli contro un rivale di riferimento (formula di potenza verificata: statistica x risveglio x zona + equipaggiamento,
   x potenza della mossa x elemento), con sinergie lette dal testo giapponese delle passive e dal tecnico.
   Boss: catena di 5 giocatori con la loro migliore mossa (livello di mossa scelto dall'utente). Pesi in DEFAULTS.
   Le passive non interpretabili sono elencate in 'unparsed', mai inventate. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IECEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULTS = {
    statWeight: 0.01,          // punti per ogni punto statistica (stima delle sinergie)
    powerWeight: 0.1,          // punti per ogni punto di potenza tecnica (stima delle sinergie)
    debuffWeight: 0.5,         // peso dei malus sugli avversari (contati una volta)
    conditionalFactor: 0.5,    // peso dei bonus che richiedono eventi di partita (tiri fermati, dribbling riusciti...)
    unlocks: ['初期', 'Lv11', 'Lv41', 'ADVANCED', 'ADVANCED+'], // tipi di passiva ammessi; quali sono davvero sbloccate lo decidono livello e grado (IECData.passivesAt)
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
    nativeRoleMult: 1.1,       // solo modello 'damage': moltiplicatore ruolo nel ruolo naturale (ipotesi)
    offRoleMult: 1.0,          // solo modello 'damage': fuori ruolo = nessun bonus (ipotesi)
    offRoleMovePenalty: 0.5    // solo modello 'damage': mossa non adatta al ruolo giocato (ipotesi)
  };

  // Guida RR_o (IE Cross Database, v1.4.0): potenza base = stat x risveglio + equipaggiamento del ruolo NATIVO + bonus.
  // le statistiche del sito sono già a Legendary+ (x2: Gazelle Lv440 Tiro 7230 = 3612 x 2), quindi si scala x AWK[grado]/2
  var AWK = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.85, 2];
  // L'equipaggiamento sale a scatti di 5 livelli e ha un limite (oggi Lv350, EQ_CAP): oltre il limite non cresce. Il punto a Lv350 = curva x 0,965, calibrato su 7 schermate del gioco (Lv351-352, senza adesivi).
  var EQ_CAP = 350;
  var EQ_CURVE = { FW: [[1, 0], [50, 618], [100, 1924], [200, 8125], [300, 13314], [350, 15718], [360, 16883], [400, 19783], [440, 23181]],
                   MF: [[1, 0], [50, 615], [100, 1899], [200, 8031], [300, 13158], [350, 15535], [360, 16686], [400, 19551], [440, 22902]],
                   DF: [[1, 0], [50, 593], [100, 1851], [200, 7819], [300, 12812], [350, 15125], [360, 16246], [400, 19035], [440, 22305]],
                   GK: [[1, 0], [50, 580], [100, 1805], [200, 7621], [300, 12488], [350, 14742], [360, 15835], [400, 18555], [440, 21742]] };
  var EQ440 = { FW: { kick: 23181, technique: 17031, block: 11143, catch: 5798 }, MF: { kick: 16760, technique: 22902, block: 11143, catch: 5798 },
                DF: { kick: 6854, technique: 11541, block: 22305, catch: 15552 }, GK: { kick: 11677, technique: 6477, block: 16086, catch: 21742 } };
  var EQ_MAIN = { FW: 'kick', MF: 'technique', DF: 'block', GK: 'catch' };
  function eqAt(role, stat, L, raw) {
    if (!raw) L = Math.max(5, Math.floor(Math.min(L, EQ_CAP) / 5) * 5);   // l'equipaggiamento sale di 5 in 5 (5, 10, ... 350, 355, ... 440) fino al limite; raw = senza scatti né limite (solo per scalare il rivale di riferimento)
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

  // Zone ideali: setZones(zonesById {id:['B2','A9',..]}, slotMap {coachId:{slot:zona}}). Bonus S x1.15, A x1.10, B x1.05 solo su stat x risveglio.
  var ZMUL = { S: 1.15, A: 1.10, B: 1.05 };
  Engine.prototype.setZones = function (byId, slotMap) { this.zonesById = byId || {}; this.zoneSlots = slotMap || {}; };
  Engine.prototype.setZoneOverride = function (arr) { var m = {}; (arr || []).forEach(function (z, i) { m[i + 1] = z; }); this.zoneOverride = arr ? m : null; };
  // Passive di tempra (js/training.js): ogni membro può avere c.training = [{e:'kick', lv:5}, ...] (max 3). Bonus statistica (SB) o potenza tecniche (PB).
  Engine.prototype.setTraining = function (tbl) { this.trainTbl = tbl || null; };
  Engine.prototype.trainingBonus = function (m, sb, pb) {
    var T = this.trainTbl, tr = m.training; if (!T || !tr || !tr.length) return;
    var list = T.pos[m.native || m.position] || [];
    tr.slice(0, 3).forEach(function (t) {
      var e = list.filter(function (x) { return x.e === t.e; })[0], d = e && T.effects[t.e]; if (!e || !d) return;
      var v = e.v[Math.max(1, Math.min(e.v.length, +t.lv || 1)) - 1];
      if (d.stat) sb[d.stat] = (sb[d.stat] || 0) + v; else if (d.pk) pb[d.pk] = (pb[d.pk] || 0) + v;
    });
  };
  // Adesivi (js/stickers.js): c.stickers = [{e:'m18', lv:3}, ...] (id dell'adesivo, livello 1-5; max 1 principale + 4 secondari). Gli effetti con 'pos' valgono solo
  // se il giocatore occupa quel ruolo; quelli 'cond' (a evento) contano col fattore delle condizionali.
  Engine.prototype.setStickers = function (tbl) { this.stickerTbl = tbl || null; this.stickerIdx = null; if (tbl) { var ix = {}; tbl.main.concat(tbl.sub).forEach(function (d) { ix[d.id] = d; }); this.stickerIdx = ix; } };
  Engine.prototype.stickerBonus = function (m, sb, pb) {
    var ix = this.stickerIdx, st = m.stickers, f = this.cfg.conditionalFactor; if (!ix || !st || !st.length) return;
    st.slice(0, 5).forEach(function (t) {
      var d = t && ix[t.e]; if (!d || (d.pos && d.pos !== m.position)) return;
      var v = d.v[Math.max(1, Math.min(d.v.length, +t.lv || 1)) - 1] * (d.cond ? f : 1);
      if (d.stat) sb[d.stat] = (sb[d.stat] || 0) + v; else if (d.pk) pb[d.pk] = (pb[d.pk] || 0) + v;
    });
  };
  Engine.prototype.zoneMult = function (c, coach, slot) {
    var zm = coach ? (this.zoneSlots && this.zoneSlots[coach.id]) : this.zoneOverride, z = zm && zm[slot], list = this.zonesById && this.zonesById[c.id];
    if (!z || !list) return 1;
    for (var i = 0; i < list.length; i++) if (+list[i].slice(1) === z) return ZMUL[list[i].charAt(0)] || 1;
    return 1;
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
    var CF = opts && opts.cf != null ? opts.cf : cfg.conditionalFactor, ALL = !!(opts && opts.allSat);   // allSat: modalità boss, tutte le condizioni contano come soddisfatte
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
        if (ALL) cond = { type: cond.type === 'event' ? 'event' : 'none', label: cond.label };
        // prova di difesa del boss: i compagni precedenti non fermano mai il tiro, quindi le passive 'a ogni blocco fallito' scattano per davvero (peso pieno)
        var failFull = !!(opts && opts.failFull) && cond.type === 'event' && /失敗/.test(cond.label || '');
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
          var pts = per * units * (cl.target.enemy ? cfg.debuffWeight : 1) * (cond.type === 'event' ? CF : 1);
          if (!ok) { out.unmet.push({ source: src.id, passive: p.name, need: need, points: pts }); return; }
          if (!cl.target.enemy) {
            var fc = cond.type === 'event' ? (failFull ? 1 : cfg.conditionalFactor) : 1;
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
            var fc2 = cond.type === 'event' ? (failFull ? 1 : cfg.conditionalFactor) : 1;
            roles.forEach(function (r) { if (!r) return; var o = out._rm[r] || (out._rm[r] = { stat: 0, power: 0 }); o[cl.kind === 'stat' ? 'stat' : 'power'] += cl.value * fc2 * (cfg.debuffWeight || 1); });
          }
          out.synergy += pts;
          out.effects.push({ source: src.id, passive: p.name, text: cl.text, kind: cl.kind, enemy: cl.target.enemy, affected: affected.map(function (m) { return m.id; }), conditional: cond.type === 'event', points: pts });
        });
      });
    });
    if (coach) this.addCoach(coach, members, out);
    members.forEach(function (m, i) { self.trainingBonus(m, SB[i], PB[i]); self.stickerBonus(m, SB[i], PB[i]); });
    if (opts && opts.noScore) { out.total = 0; return out; }
    if (cfg.model === 'duel') {
      var ZM = members.map(function (m, i) { return self.zoneMult(m, coach, opts && opts.slots ? opts.slots[i] : i + 1); });
      var D = this.duelScore(members, SB, PB, out._rm, ZM);
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
  Engine.prototype.duelScore = function (members, SB, PB, RM, ZM) {
    var self = this, cfg = this.cfg, E = cfg.duelExp, W = cfg.duelWeights;
    var B = {}, k, Lsum = 0;
    members.forEach(function (m) { Lsum += m.level || 440; });
    var Lm = Lsum / Math.max(1, members.length), lf = (eqAt('FW', 'kick', Lm, true) + 7200 * (0.1 + 0.9 * Lm / 440)) / (23181 + 7200);
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
        var stat = Math.max(0, Math.floor(s[c] * awk * ((ZM && ZM[i]) || 1)) + eqAt(nat, c, L) + (sb[c] || 0));
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

  /* ---------- prove boss ---------- */
  // Prove di difesa (il boss tira): valgono solo le tecniche col tag "Blocca tiro" (elenco da iecrossdb.com/jugadores, 28/10/2026).
  // Le altre (Ciclone, Scivolata Micidiale, Terremoto, Tackle Fulmineo, ecc.) NON fermano i tiri e sono escluse.
  var SHOT_BLOCK = {};
  ['ゴッドハンド', 'ゴッドハンド2', '爆裂パンチ', '熱血パンチ', 'バーンアウト', '怒りの鉄槌', 'ザ・ウォール', 'ザ・マウンテン', 'スピニングカット', '旋風陣', '真空魔',
   'パワーシールド', 'フルパワーシールド', 'ムゲン・ザ・ハンド', 'キラーブレード', 'ゆがむ空間', 'シュートポケット', 'ロケットこぶし', 'スーパー四股踏み',
   'もちもち黄粉餅（花火）', 'つなみウォール', 'ギガントウォール', '裁きの鉄槌', 'ディープミスト', 'ブラックホール', 'ワームホール', 'アステロイドベルト',
   'グラビテイション', 'ザ・タワー', 'デーモンカット（ハロウィン）'].forEach(function (n) { SHOT_BLOCK[n] = true; });
  var BEATS = { Wind: 'Mountain', Mountain: 'Fire', Fire: 'Forest', Forest: 'Wind' };   // A batte B
  var PERMS5 = (function () { var out = []; (function rec(a, rest) { if (!rest.length) { out.push(a); return; } rest.forEach(function (x, i) { rec(a.concat(x), rest.filter(function (_, j) { return j !== i; })); }); })([], [0, 1, 2, 3, 4]); return out; })();

  // boss = { mode:'attack'|'defense', element:'Wind', field: 0|50 (bonus di potenza ai tiri in vantaggio) }
  // Cinque giocatori in fila: ogni tecnica dopo una dello stesso elemento fa x1,1 (senza decimali). Tutte le passive contano.
  Engine.prototype.bossScore = function (members, boss) {
    var cfg = this.cfg, r = this.scoreTeam(members, { allSat: true, cf: 1, noScore: true, failFull: boss.mode === 'defense' });
    var cats = boss.mode === 'attack' ? ['kick'] : ['block', 'catch'];
    var cand = members.map(function (m, i) {
      var s = m.stats_max || {}, sb = r._sb[i], pb = r._pb[i], awk = AWK[m.rarity_grade == null ? 9 : m.rarity_grade] / 2, nat = m.native || m.position, L = m.level || 440, out = [];
      (m.skills || []).forEach(function (k) {
        var c = SKILLCAT[k.category] || k.category;
        if (cats.indexOf(c) < 0 || k.power == null || s[c] == null) return;
        if (boss.restrict && boss.restrict !== c) return;   // solo per la selezione dei candidati (vedi bossBest)
        var stat = Math.max(0, Math.floor(s[c] * awk) + eqAt(nat, c, L) + (sb[c] || 0)), ke = k.element || m.element;
        var bonus = (pb[c] || 0) + (pb.all || 0) + (pb['el:' + ke] || 0) + (pb[c + '|el:' + ke] || 0) + (pb['mv:' + k.name_ja] || 0);
        var adv = BEATS[ke] === boss.element, dis = BEATS[boss.element] === ke;
        var power = k.power + Math.max(-1000, Math.min(1000, bonus)) + (adv && boss.field ? boss.field : 0);
        var mult = 1 + (ke === m.element ? 0.2 : 0) + (adv ? 0.1 : 0) - (dis ? 0.1 : 0);
        out.push({ cat: c, el: ke, name: k.name_ja, level: k.move_level || 10, extra: !!k.extra, v: Math.floor(stat * Math.max(0, power) * mult * 0.01), power: power, stat: stat, mult: mult });
      });
      out.sort(function (a, b) { return b.v - a.v; });
      return out.slice(0, 3);
    });
    var best = { total: -1 };
    PERMS5.slice(0, members.length === 5 ? 120 : 0).concat(members.length === 5 ? [] : [null]).forEach(function (perm) {
      var order = perm || members.map(function (_, i) { return i; });
      var dp = null;   // [{sum, prev, mv}] per mossa dell'ultimo giocatore
      var trace = [];
      order.forEach(function (mi, pos) {
        // prova di difesa: le parate (portieri) valgono solo nell'ultimo posto; gli altri quattro devono usare tecniche di blocco
        var lim = boss.mode === 'defense' && members.length === 5 && pos < 4;
        var cur = cand[mi].filter(function (mv) { return boss.mode !== 'defense' || SHOT_BLOCK[mv.name] ? (!lim || mv.cat === 'block') : false; }).map(function (mv) {
          var b = -1, from = -1;
          if (pos === 0) b = mv.v;
          else dp.forEach(function (d, di) { var v = d.sum + (d.mv.el === mv.el ? Math.floor(mv.v * 1.1) : mv.v); if (v > b) { b = v; from = di; } });
          return { sum: b, from: from, mv: mv, mi: mi };
        });
        if (!cur.length) cur = [{ sum: pos === 0 ? 0 : Math.max.apply(null, dp.map(function (d) { return d.sum; })), from: pos === 0 ? -1 : 0, mv: { el: null, name: null, v: 0, power: 0, stat: 0, mult: 1 }, mi: mi }];
        trace.push(cur); dp = cur;
      });
      var bi = 0; dp.forEach(function (d, i) { if (d.sum > dp[bi].sum) bi = i; });
      if (dp[bi].sum > best.total) {
        var seq = [], idx = bi;
        for (var p = trace.length - 1; p >= 0; p--) { var e = trace[p][idx]; seq.unshift(e); idx = e.from; }
        best = { total: dp[bi].sum, order: seq.map(function (e, p) {
          var prev = p > 0 ? seq[p - 1].mv.el : null, chained = prev && prev === e.mv.el, v = chained ? Math.floor(e.mv.v * 1.1) : e.mv.v;
          return { id: members[e.mi].id, move: e.mv.name, element: e.mv.el, power: e.mv.power, stat: e.mv.stat, level: e.mv.level, extra: !!e.mv.extra, cat: e.mv.cat, base: e.mv.v, value: v, chained: !!chained };
        }) };
      }
    });
    return best;
  };

  // Migliore squadra da 5 dal pool (esclusi gli id in `skip`): top per valore singolo -> esaustivo sui migliori -> miglioramento con scambi.
  Engine.prototype.bossBest = function (pool, boss, skip) {
    var self = this, used = {}; (skip || []).forEach(function (i) { used[i] = true; });
    var cs = pool.filter(function (c) { return !used[c.id]; });
    if (cs.length < 5) return null;
    function mem(c) { return self.member(c, c.position); }
    function ev(arr) { return self.bossScore(arr.map(mem), boss); }
    var top, bestT = null, bestV = -1;
    function soloTop(restrict, n) {
      var b2 = {}; Object.keys(boss).forEach(function (k) { b2[k] = boss[k]; }); b2.restrict = restrict;
      return cs.map(function (c) { return { c: c, v: self.bossScore([mem(c)], b2).total }; }).filter(function (x) { return x.v > 0; }).sort(function (a, b) { return b.v - a.v; }).slice(0, n).map(function (x) { return x.c; });
    }
    if (boss.mode === 'defense') {   // 4 difensori con tecniche di blocco + (al massimo) 1 portiere in ultima posizione
      top = soloTop('block', 12); soloTop('catch', 3).forEach(function (c) { if (top.indexOf(c) < 0) top.push(c); });
    } else top = soloTop(null, 13);
    if (top.length < 5) { top = cs.slice(0, 13); }
    (function comb(start, cur) {
      if (cur.length === 5) { var r = ev(cur); if (r.total > bestV) { bestV = r.total; bestT = cur.slice(); } return; }
      for (var i = start; i < top.length; i++) { cur.push(top[i]); comb(i + 1, cur); cur.pop(); }
    })(0, []);
    if (!bestT) return null;
    for (var round = 0; round < 4; round++) {
      var improved = false;
      for (var pos = 0; pos < 5; pos++) {
        cs.forEach(function (c) {
          if (bestT.indexOf(c) >= 0) return;
          var t = bestT.slice(); t[pos] = c; var r = ev(t);
          if (r.total > bestV) { bestV = r.total; bestT = t; improved = true; }
        });
      }
      if (!improved) break;
    }
    var fin = ev(bestT);
    return { total: fin.total, order: fin.order, ids: bestT.map(function (c) { return c.id; }) };
  };

  // Prova del club: 3 squadre da 5 con giocatori diversi (la 2ª e la 3ª escono dai rimasti).
  Engine.prototype.bossClub = function (pool, boss) {
    var teams = [], skip = [];
    for (var k = 0; k < 3; k++) { var t = this.bossBest(pool, boss, skip); if (!t) break; teams.push(t); skip = skip.concat(t.ids); }
    return { teams: teams, total: teams.reduce(function (a, t) { return a + t.total; }, 0) };
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
            if (t.pos && ((m.native || m.position) !== t.pos || m.position !== t.pos)) return false;   // 推奨FW = giocatore FW (ruolo della scheda) che sta in uno slot FW; un MF in slot FW NON riceve il bonus (confermato dall'utente 28/10)
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
      var sl = [];
      for (var i = 0; i < n; i++) if (team[i]) { ms.push(self.member(team[i], roles[i])); sl.push(i + 1); }
      return self.scoreTeam(ms, { coach: coach, slots: sl }).total;
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
      var sl2 = []; team.forEach(function (c, i) { if (c) sl2.push(i + 1); });
      var detail = self.scoreTeam(ms, { coach: coach, slots: sl2 });
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

  return { Engine: Engine, setEquipCap: function (n) { EQ_CAP = n; }, DEFAULTS: DEFAULTS, coachAtLevel: coachAtLevel, parsePassive: parsePassive, parseTarget: parseTarget };
});
