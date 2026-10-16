#!/usr/bin/env python3
"""Converte iec_all.json (scraping fatto dal browser dell'utente su inazumaelevencrosshub.com) in data/iec/chars.json.
Uso: python3 tools/parse_iec.py <iec_all.json>"""
import json, re, sys, os
src = sys.argv[1]
d = json.load(open(src, encoding='utf-8'))
L, C = d['list'], {c['path']: c for c in d['chars']}
EL = {'火': 'Fire', '風': 'Wind', '林': 'Forest', '山': 'Mountain'}
RAR = {'☆': 1, '☆☆': 2, '☆☆☆': 3}
STAT = {'TP': 'tp', 'Kick': 'kick', 'Technic': 'technique', 'Block': 'block', 'Catch': 'catch', 'Speed': 'speed'}
fn = lambda s: os.path.basename(s or '')
out = []
for path, li in L.items():
    p = li['p']
    if p.get('data-boss') != 'false':
        continue
    c = C[path]
    if c.get('error') or not c.get('name'):
        print('ATTENZIONE: scheda vuota', path, li['text']); continue
    tagids = [int(x) for x in p['data-tags'].split(',') if x]
    tagicons = [re.match(r'Icon_Tag_(.*)\.png', fn(i)).group(1) for i in c['imgs'] if '/CharacterTag/' in i]
    stats = {}
    for pane, key in (('stats-lvl1', 'lv1'), ('stats-lvl440', 'lv440')):
        stats[key] = {STAT[re.match(r'Icon_Status_(.*)\.png', fn(a)).group(1)]: int(v.replace(',', '')) for a, v in c['stats'][pane]}
    moves, passives, rarity = [], [], []
    for card in c['cards']:
        if card['sec'].startswith('Hissatsu'):
            moves.append({'head': card['head'], 'icons': [fn(i) for i in card['imgs']], 'rows': card['rows']})
        else:
            m = re.match(r'(.*?)\s*(Rarity ID|ID):\s*(\d+)$', card['head'])
            name, pid = (m.group(1), int(m.group(3))) if m else (card['head'], None)
            lv = []
            for pn in card['panes']:
                b = pn['b']
                u = re.search(r'Character Lv\. (\d+)', b)
                lv.append({'unlock_lv': int(u.group(1)) if u else None, 'unlock': None if u else b.replace('Unlocks at:', '').strip(), 'text': pn['x']})
            (rarity if card['sec'].startswith('Rarity') else passives).append({'id': pid, 'name': name, 'levels': lv})
    out.append({
        'site_id': int(path.rsplit('/', 1)[1]), 'name_ja': c['name'], 'name_key': re.sub(r'\s+', '', c['name']),
        'element': EL[p['data-elemento']], 'position': p['data-posicion'], 'rarity': RAR[p['data-rareza']],
        'tag_ids': tagids, 'tag_icons': tagicons,
        'image_big': next((i for i in c['imgs'] if 'Character_Big' in i), None), 'image_small': next((i for i in li['imgs'] if 'Character_Small' in i), None),
        'stats': stats, 'moves': moves, 'passives': passives, 'rarity_passives': rarity})
out.sort(key=lambda x: x['site_id'])
json.dump({'source': 'inazumaelevencrosshub.com (scraping dal browser dell\'utente, 16/10)', 'chars': out}, open('data/iec/chars.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'personaggi giocabili ->', 'data/iec/chars.json', os.path.getsize('data/iec/chars.json') // 1024, 'KB')
