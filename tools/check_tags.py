"""Verifica che ogni tag citato nelle passive abbia una regola in data/tag_aliases.json
e che ogni squadra/tipo referenziati esistano nel database. Uso: python3 tools/check_tags.py"""
import json, re, sys
root = __file__.rsplit("/tools/", 1)[0] if "/tools/" in __file__ else "."
idx = json.load(open(root + "/data/index.json"))
chars = []
for f in idx["parts"]:
    chars += json.load(open(root + "/data/" + f))
al = json.load(open(root + "/data/tag_aliases.json"))["tags"]
teams = {c["team_ja"] for c in chars}
types = {c["type_ja"] for c in chars if c["type_ja"]}
errors = []
used = {}
coach_used = set()
try:
    for co in json.load(open(root + "/data/coaches.json"))["coaches"]:
        for cd in co["formation_condition"]:
            for k in ("tag", "type"):
                if cd.get(k): coach_used.add(cd[k])
        for blk in (co["formation_passive"], co["coach_passive"]):
            for ef in blk["effects"]:
                for k in ("tag", "type"):
                    if ef["target"].get(k): coach_used.add(ef["target"][k])
except FileNotFoundError:
    pass
for c in chars:
    for p in c["passives"]:
        for m in re.finditer(r"([^\s、。，・/]+?)タグ", p["effect_ja"] or ""):
            used.setdefault(m.group(1), []).append(c["name_ja"])
for t in coach_used:
    if t not in al and t not in teams and t not in types:
        errors.append("tag dei tecnici senza regola: %s" % t)
for t, who in used.items():
    if t not in al:
        errors.append("tag senza regola: %s (es. %s)" % (t, who[0]))
for t, r in al.items():
    for k in r.get("teams", []) + r.get("optional_teams", []):
        if k not in teams: errors.append("%s: squadra inesistente %s" % (t, k))
    for k in r.get("types", []):
        if k not in types: errors.append("%s: tipo inesistente %s" % (t, k))
    for k in r.get("any_of", []):
        if k not in al: errors.append("%s: any_of rimanda a tag inesistente %s" % (t, k))
    in_any = any(t in r2.get("any_of", []) and k2 in used for k2, r2 in al.items())
    if t not in used and not in_any and t not in coach_used: errors.append("regola mai usata nelle passive: %s" % t)
print("tag usati nelle passive:", len(used), "| regole:", len(al))
print("OK" if not errors else "\n".join(errors))
sys.exit(1 if errors else 0)
