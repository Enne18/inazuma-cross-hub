# Inazuma Eleven Cross Hub

An **unofficial, fan-made** companion site for the mobile game *Inazuma Eleven Cross*: browse every character, keep track of the ones you own, and get recommended teams for matches and bosses.

**Live site: <https://enne18.github.io/inazuma-cross-hub/>**

Inazuma Eleven is a trademark of LEVEL-5. This project is not affiliated with or endorsed by LEVEL-5. Game data comes from public fan sites (AppMedia, Game8, Gamerch, the RR_o power guide) plus information provided by players, and **may contain errors** (see [Data accuracy](#data-accuracy)).

It is free, has no account, no ads and no backend: plain HTML, CSS and JavaScript hosted on GitHub Pages.

---

## Opening the site

1. Open <https://enne18.github.io/inazuma-cross-hub/> in any modern browser (Chrome, Edge, Firefox, Safari) on a computer, tablet or phone.
2. That's it: nothing to install and nothing to sign in to. The page loads the game data itself.
3. If the page appears but shows no characters after an update, force a refresh (Ctrl+F5, or Cmd+Shift+R on Mac; on a phone, close the tab and reopen the link).

**On a phone:** the layout switches to a mobile view with a bottom navigation bar. You can also add the site to your home screen (Chrome: menu → *Add to Home screen*; Safari: Share → *Add to Home Screen*) and it opens like an app. There is no offline mode: an internet connection is needed to load the data.

**Language:** use the selector at the top right to switch between Italian, English and Japanese (original). The choice is remembered.

---

## What you will find inside

The site has five sections: **What's new** (the home page), **Characters**, **Team Builder**, **Coaches** and **Bosses**.

### Characters
- A catalogue of **126 characters** with element (Fire, Wind, Forest, Mountain), role (GK / DF / MF / FW), rarity, team, type, series, stats, moves and passives.
- Search by name, team, move or passive (works across Italian, English and Japanese names) and filter by ownership, element, role, rarity, team and series; sort by name, rarity or any stat.
- **Your collection:** press **"Ce l'ho"** (I own it) on a character. For every owned character you can set:
  - its **level** (1–440; stats between level 1 and 440 are a linear estimate, because the data source only provides those two values),
  - its **grade** (Normal Player … Legendary Player +), which decides which ADVANCED / ADVANCED+ passives are unlocked,
  - the **level of each move** (1–10; move power is read per level),
  - the **3 training passives** (パッシブ鍛錬, always set together; the Japanese in-game name is shown with a translation in brackets), chosen from the pool of the character's role (source: iecrossdb.com), each with a level 1–10; stat boosts and move-power boosts are used by the Team Builder and bosses,
  - an optional **third move**: a drop-down with every move in the game (nothing selected by default). The chosen move is used by the Team Builder as if the character knew it.
- Click a character's **image** to open its detail page (full stats, move power by level, all passives by level, and its three **ideal zones** with S / A / B ratings). Clicking the name does nothing, so you can select and copy names.
- *Collection management* panel: set a level or grade for everyone at once, export/import a backup (JSON file), clear the collection, show/hide images (a coloured badge is used when an image is missing).

### Coaches
- All **15 coaches** with portrait, formation (e.g. 4-4-2, 5-3-2), how they are unlocked and a level selector (1–10, or "not owned").
- Click a coach's image to open the **coach page**: formation activation conditions per slot, the formation passive (only active when *all* conditions are met), and the always-active passive with values for the selected level.
- The level you set here is the one used by the Team Builder.

### Team Builder
Proposes the best teams from the characters you own (or from all characters, to experiment).
- **11 vs 11 with a coach:** choose a coach, or **"Best of all coaches"** (considers only coaches you own). The result shows the coach, whether the formation is **active**, which slots meet or miss their requirement (green ✓ / red !), and the pitch with each player at the **real in-game slot position** of that formation, with slot numbers.
- **5 vs 5 (no coach):** choose one of the **9 five-a-side formations** or **"Best of all formations"** (default). Each suggested team shows which formation it uses.
- Optional **required** and **excluded** players, and tag options for characters whose tag status is not confirmed in-game.
- It explains itself: main active synergies, inactive synergies ("potential"), and warnings when some stats are estimated or some passives could not be interpreted.
- The score is a **transparent estimate**, not the game's own number: it uses the verified power formula (stat × awakening × ideal-zone bonus + equipment + passives) × (move power ± bonuses) × element, compared against a reference rival. It does not reproduce every in-game rule (for example the total-power jump when a formation activates), so use it to compare options, not to predict exact match results.

### Ideal zones
Every character has three ideal zones (numbered 1–11 on the pitch) rated **S (+15%)**, **A (+10%)** or **B (+5%)** (multiplier verified in a real match by RR_o's guide; the team total shown by the game grows less: about +12% / +8% / +4% of stat × awakening). When a player stands in one of their zones, the bonus is applied to *stat × awakening* only (not to equipment), both in 11 vs 11 (zones mapped for 14 of the 15 coaches; Ray Dark has none) and in 5 vs 5 (zones mapped for all 9 formations).

### Bosses
- **Boss of the day banner:** shows today's boss, the time left before the change (the game day rolls over at **22:00 Rome time**) and tomorrow's boss, with a button for the best team. If you own at least five characters, the best team for today is calculated as soon as you open the page.
- **Daily trials** (five players in a row): the best five players and their order. Moves of the same element in a row chain for ×1.1, and element advantage adds +0.1. In **defence trials** (the boss attacks) the first four positions must use **block** moves, and **goalkeepers (catch moves) can only take the last position**. Compare the result against the boss power (editable).
- **Club boss:** three disjoint teams of five for the three attempts, with the estimated total.
- Boss calculations assume move levels at maximum and exclude ideal zones.

### Languages
Interface, character names, teams, tags, passives, coach conditions and boss texts are available in **Italian, English and Japanese**. Translations were produced by the maintainer and may be imperfect; where the game text is Japanese-only, the original is shown.

### What's new
A changelog page (in Italian, English and Japanese) lists every release, and a red dot on the tab tells you when there is something you have not seen yet. It also links to **GitHub Issues** to report a mistake or suggest an idea.

### Syncing your collection between devices (optional, free)
Your collection normally lives only in the browser you used. To use it on a second computer or phone:
1. Create a **GitHub personal access token** with the **Gists: read and write** permission (GitHub → Settings → Developer settings → Personal access tokens).
2. On the site, open **Characters → Collection management → Sync between computers**, paste the token and press **Connect**. The token stays in this browser only and is sent only to GitHub.
3. On the device that has your data press **Save to cloud** (your data goes to a *private* Gist in your own GitHub account; the project owner cannot see it).
4. On the other device, paste the same token, press **Connect**, then **Download from cloud**.
5. Optional: tick **Save automatically after every change**. The site warns if the cloud copy is newer than the last one this browser saved, so you do not overwrite changes by mistake.

Synced data: owned characters, levels, grades, move levels, third moves, training passives, coach levels, language and image preference. Never share your token; if it leaks, delete it on GitHub and create a new one.

Without sync you can still use **Export / Import** (JSON file) to back up or move your collection.

---

## Data accuracy

- Character data (stats, moves, passives) comes from fan sites; a few characters have partial or estimated data and are marked on their card ("Partial data / Missing data").
- Formation slot positions, ideal zones, 5v5 formations and coach formation requirements were read from in-game screenshots and tables provided by players.
- **Stickers** (1 main + 4 secondary per character, from iecrossdb.com/sellos) are modelled; triggered ones use the conditional factor. **Not modelled:** the in-game "total player power" number (选手総合能力), and the exact match simulation. Equipment is estimated from in-game screenshots, rises in steps of 5 levels and is capped at Lv350, the current in-game limit. Ray Dark has no zone map, so no zone bonus is applied with that coach. 5v5 formations have no passives of their own: players keep theirs.
- Rule of the project: **no invented data**. Unknown values stay empty, and open questions are listed in `DATI_DA_VERIFICARE.md`.

If you spot a mistake, use the link on the **What's new** page (or open an issue on GitHub) and choose a template: *wrong or missing data*, *idea or request*, or *team from the game* (to help calibrate the scores with the total power shown in-game). A screenshot from the game is the best proof.

## Privacy

No analytics, no cookies, no accounts. Everything you enter is stored in your browser (`localStorage`). If you enable sync, your data is also written to a private Gist in *your* GitHub account using *your* token.

---

## Running it locally

The site loads data with `fetch()`, so it will **not** work by double-clicking `index.html`. Use a small local server:

```
git clone https://github.com/enne18/inazuma-cross-hub.git
cd inazuma-cross-hub
python3 -m http.server 8000
```

then open <http://localhost:8000>.

## Publishing your own copy on GitHub Pages

1. Create a **public** repository (for example `inazuma-cross-hub`) and upload the *contents* of this folder (so `index.html` is in the repository root).
2. Go to **Settings → Pages → Build and deployment → Source: Deploy from a branch**, pick `main` and `/ (root)`, then **Save**.
3. After 1–3 minutes the site is available at `https://YOUR-USER.github.io/inazuma-cross-hub/`.

To update the live site, edit or upload the changed files on GitHub (or `git push`); Pages republishes in a minute or two.

Common problems:
- *404 page:* `index.html` is not in the repository root, or Pages is not enabled yet.
- *"Unable to load data":* the `data/` folder (or a file inside it) was not uploaded.
- *Collection disappeared:* it is stored per browser and per address; use Export/Import or sync.

## Project structure

| Path | Contents |
|---|---|
| `index.html`, `css/style.css`, `manifest.webmanifest`, `icons/` | page, styles (including the mobile layout), home-screen icon and manifest |
| `js/catalog.js`, `js/detail.js` | character catalogue, filters, collection, character detail page |
| `js/coaches.js` | coach cards and coach detail page |
| `js/engine.js`, `js/builder.js` | scoring engine (power formula, synergies, zones, bosses) and Team Builder interface |
| `js/boss.js` | Bosses page |
| `js/training.js` | training passives (パッシブ鍛錬) per role with values per level |
| `js/i18n.js`, `js/passives.js` | language switcher and passive-text translator (IT/EN/JA) |
| `js/news.js`, `data/changelog.json` | What's new page and its release notes |
| `.github/ISSUE_TEMPLATE/` | issue templates (data error, idea, calibration team) |
| `js/sync.js`, `js/syncui.js` | cloud sync through a private GitHub Gist |
| `data/site/chars.json` | the 126 characters used by the site |
| `data/coaches.json`, `data/pitch_layouts.json`, `data/zone_slots.json`, `data/zones.json` | coaches, in-game slot positions, slot→zone maps and per-character ideal zones; 5v5 formations are inside `coaches.json` |
| `data/bosses.json`, `data/moves.json`, `data/tag_aliases.json`, `data/meta.json` | bosses, moves, tag aliases, metadata |
| `data/i18n/` | UI and content translations |
| `tests/` | `node tests/engine.test.js`, `node tests/passives.test.js`, `node tests/sync.test.js` |
| `tools/` | scripts used to build and check the data |
| `PROJECT_STATUS.md`, `DATI_DA_VERIFICARE.md` | project log and open data questions (in Italian) |

## Tests

```
node tests/engine.test.js
node tests/passives.test.js
node tests/sync.test.js
```

## Contributing data

Add or correct entries following `data/SCHEMA.md`. Leave unknown values empty (`null`) instead of guessing, and mention the source (screenshot, page or guide) so it can be verified.

## Support

If the site is useful to you, you can support its development through the two round floating buttons at the bottom right of every page: the GitHub one opens the project page and the coffee one opens <https://buymeacoffee.com/ennedev>. It is entirely optional; the site stays free.
