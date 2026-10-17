#!/usr/bin/env python3
"""data/iec/chars.json + data/iec/tags.json -> data/site/chars.json (formato letto dal sito).
Uso: python3 tools/build_site_data.py"""
import json, re, os
src = json.load(open('data/iec/chars.json', encoding='utf-8'))['chars']
tags = {t['id']: t for t in json.load(open('data/iec/tags.json', encoding='utf-8'))['tags']}
CAT = {'Shoot': 'shoot', 'Dribble': 'dribble', 'Block': 'block', 'Catch': 'catch'}
num = lambda s: int(re.sub(r'[^\d-]', '', s)) if re.search(r'\d', s or '') else None
out = []
for s in src:
    by = {}
    for t in s['tag_ids']:
        by[tags[t]['kind']] = tags[t]['name_ja']
    skills = []
    for m in s['moves']:
        mm = re.match(r'Lv\.\s*(\d+):\s*(.*)$', m['head'])
        rows = {r[0]: r[1:] for r in m['rows'] if r}
        cat = next((CAT[re.match(r'Icon_MoveSkill_(.*)\.png', i).group(1)] for i in m['icons'] if i.startswith('Icon_MoveSkill_') and re.match(r'Icon_MoveSkill_(.*)\.png', i).group(1) in CAT), None)
        skills.append({'name_ja': mm.group(2).strip() if mm else m['head'], 'unlock_lv': int(mm.group(1)) if mm else None,
                       'unlock': 'Lv' + mm.group(1) if mm else None, 'category': cat,
                       'power': num(rows['Power'][-1]) if 'Power' in rows else None, 'power_by_level': [num(x) for x in rows.get('Power', [])],
                       'tp': num(rows['TP Cost'][-1]) if 'TP Cost' in rows else None, 'cool_down': num(rows['Cool Down'][-1]) if 'Cool Down' in rows else None,
                       'crit': num(rows['Critical %'][-1]) if 'Critical %' in rows else None})
    def pas(lst, rarity):
        r = []
        for p in lst:
            e = {'id': p['id'], 'name_ja': p['name'], 'levels': [{'unlock_lv': l['unlock_lv'], 'text': l['text']} for l in p['levels']]}
            if rarity:
                u = p['levels'][0]['unlock'] or ''
                e['tier'] = 'ADVANCED+' if ('＋' in u or '+' in u) else 'ADVANCED'
            r.append(e)
        return r
    out.append({'id': str(s['site_id']), 'name_ja': s['name_ja'], 'name_en': None, 'version': None, 'rarity': s['rarity'],
                'element': s['element'], 'position': s['position'], 'team_ja': by.get('team'), 'type_ja': by.get('type'), 'series_ja': by.get('series'),
                'tags_ja': [tags[t]['name_ja'] for t in s['tag_ids']], 'rating': None, 'verified': 'ok',
                'stats_lv1': s['stats']['lv1'], 'stats_max': s['stats']['lv440'], 'max_level': 440,
                'skills': skills, 'basic_passives': pas(s['passives'], False), 'rarity_passives': pas(s['rarity_passives'], True),
                'image_big': s['image_big'], 'image_small': s['image_small'], 'notes': []})
os.makedirs('data/site', exist_ok=True)
json.dump({'source': 'inazumaelevencrosshub.com', 'max_level': 440, 'chars': out}, open('data/site/chars.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
bad = [c['name_ja'] for c in out if None in (c['team_ja'], c['type_ja'], c['series_ja'])]
print(len(out), 'personaggi ->', os.path.getsize('data/site/chars.json') // 1024, 'KB; senza tag completi:', bad)
print({a['tier'] for c in out for a in c['rarity_passives']}, [len(c['rarity_passives']) for c in out[:3]])
