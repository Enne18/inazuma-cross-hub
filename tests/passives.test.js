'use strict';
var fs = require('fs'), path = require('path'), assert = require('assert');
var root = path.join(__dirname, '..'), P = require(path.join(root, 'js/passives.js'));
var moves = JSON.parse(fs.readFileSync(path.join(root, 'data/moves.json'), 'utf8')).moves; P.setMoves(moves);
var chars = JSON.parse(fs.readFileSync(path.join(root, 'data/site/chars.json'), 'utf8')).chars;
var texts = new Set(), names = new Set();
chars.forEach(function (c) { ['basic_passives', 'rarity_passives'].forEach(function (k) { (c[k] || []).forEach(function (p) { names.add(p.name_ja); (p.levels || []).forEach(function (l) { texts.add(l.text); }); }); }); });
var bad = {}, nbad = 0;
texts.forEach(function (t) { ['it', 'en'].forEach(function (L) { if (P.tr(t, L) == null) { var k = t.replace(/\d+/g, '#'); bad[k] = 1; nbad++; } }); });
var nb = [];
names.forEach(function (n) { if (P.trName(n, 'it') == null) nb.push(n); });
if (process.argv[2] === 'show') {
  var i = 0; texts.forEach(function (t) { if (i++ % 211 === 0) console.log(t + '\n  IT ' + P.tr(t, 'it') + '\n  EN ' + P.tr(t, 'en')); });
  var j = 0; names.forEach(function (n) { if (j++ % 12 === 0) console.log(n + ' → ' + P.trName(n, 'it') + ' | ' + P.trName(n, 'en')); });
}
console.log('testi', texts.size, 'non tradotti', Object.keys(bad).length); Object.keys(bad).slice(0, 60).forEach(function (k) { console.log(' -', k); });
console.log('nomi', names.size, 'non tradotti', nb.length, nb.slice(0, 20).join(' | '));
// frase di esempio dell'utente
assert.strictEqual(P.tr('試合開始時 味方ＦＷのキックを600上昇 味方ＦＷのテクニックを600上昇', 'it'), "All'inizio della partita: gli attaccanti alleati ottengono +600 Calcio e +600 Tecnica.");
console.log(Object.keys(bad).length === 0 && nb.length === 0 ? 'OK' : 'DA COMPLETARE');
