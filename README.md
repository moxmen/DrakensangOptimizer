# DrakenOptimizer — DSO DPS Calculator & Equipment Optimizer

A modern rebuild of the [DrakensangOptimizer](https://github.com/moxmen/DrakensangOptimizer)
AngularJS tool: a React 18 + Vite app with the **original DPS math untouched**,
five languages (English, French, German, Spanish, **Arabic with full RTL**) and a
skeuomorphic dark-fantasy interface in the style of the official DSO site.

![stack](https://img.shields.io/badge/React-18-1c3a4c) ![stack](https://img.shields.io/badge/Vite-5-9c7532)

---

## Quick start

```bash
npm install
npm run data     # (re)generate public/data/*.json from the legacy database
npm run dev      # http://localhost:5173
npm run build    # → dist/  (deployable as static files)
npm run preview  # serve the production build locally
```

`npm run build` outputs a fully static bundle: copy `dist/` to any web host
(Netlify, Vercel, GitHub Pages, nginx, S3…). `base` is already set to `'./'` in
`vite.config.js`, so it works from a sub-directory too.

## Tests

```bash
node scripts/verify-legacy.mjs   # engine equivalence vs. the original AngularJS code
node scripts/render-test.mjs     # headless (jsdom) render + interaction tests
```

* `verify-legacy.mjs` runs the **original** `Controller.js` inside Node with a
  minimal Angular shim, generates 40 random builds across the four classes
  (random items, enchants, gems, talents, pets, essences, PvE/PvP opponents) and
  compares every figure: **1960/1960 values are bit-identical** to the legacy engine.
* `render-test.mjs` mounts the real app in jsdom and checks 52 assertions:
  language switching, `dir="rtl"`, Arabic strings in every panel, item editor,
  equipping an item (DPS changes), essence picker, saving/exporting builds,
  and that no panel ever prints `NaN`, `undefined`, `null` or a raw `i18n` key.

## Features

| | |
|---|---|
| **Equipment builder** | 13 slots laid out around the character portrait, click to edit, right-click to clear, 2H weapons automatically lock the offhand |
| **Item editor** | pick any item from the database (autocomplete, filtered by class) or build a custom one: base stats, 4 enchants, 5 gem sockets, quality/rarity coloured icon |
| **Real-time statistics** | DPS hero with the full formula breakdown, damage range, attack speed, crit chance/damage, life & regen, armor, block, all five elemental resistances |
| **Skills** | damage (normal + crit) of every skill of your class, sortable by level or DPS, with the attack-speed tiers (min/max speed to gain a frame) |
| **Talents** | experience tree and PvP tree, one talent per row (levels 5–45), effects applied to the DPS and to skill damage |
| **Compare** | build A vs build B side by side, per-line difference and percentage |
| **Saved builds** | stored in `localStorage`, duplicate/delete, plus JSON import/export (file or clipboard) |
| **Opponent** | PvE or PvP target with level, PvP level, physical defense, elemental resistance |
| **Languages** | English, French, German, Spanish, Arabic — the Arabic locale switches the whole document to RTL |

## Project structure

```
src/
  engine/stats.js        ← the DPS math (ported 1:1 from Controller.js)
  state/build.js         ← build model, 13-slot default, profile (de)serialisation
  state/useBuildStore.js ← current build + saved builds (localStorage)
  data/catalog.js        ← turns the generated JSON into an indexed catalogue
  data/labels.js         ← stat labels and number/percent formatting
  i18n/index.js          ← languages, <html lang dir>, useI18n()
  components/            ← one folder-level component + its own CSS per panel
  styles/tokens.css      ← palette, fonts, RTL base
  styles/theme.css       ← skeuomorphic components (panels, buttons, fields…)
  assets/theme/          ← generated textures, filigrees, flags
scripts/
  build-data.mjs         ← legacy db → public/data/*.json
  skill-frames.mjs       ← animation frames per skill (editable table)
  make-assets.py         ← regenerates every texture in src/assets/theme
  verify-legacy.mjs      ← engine equivalence test
  render-test.mjs        ← headless UI test
public/
  data/                  ← items.json, names.json, i18n.json (generated)
  images/                ← 928 item/class/quality icons
```

## How to modify things

**Add or change an item.** Everything comes from `legacy/Production/Items.json`
(the original database, kept in its original schema, under `legacy/`) and `Langs.json` for the names.
Edit those files, then run `npm run data`. Nothing else to touch.

**Change a skill's speed frames.** Open `scripts/skill-frames.mjs` — it is a plain
`{ SkillKey: frames }` table (25 frames = 1 second). The legacy database never
stored durations, so this table is the single source of truth; run `npm run data`
after editing.

**Change colours, fonts or ornaments.** `src/styles/tokens.css` holds every colour
and font variable; `src/styles/theme.css` holds the component skins. The images,
filigrees and flags are produced by `scripts/make-assets.py`
(`python3 scripts/make-assets.py`, requires Pillow).

**Add a language.** Add an entry to `LANGUAGES` in `src/i18n/index.js`, add the
two-letter code to `LANGS` in `scripts/lib.mjs`, provide the UI strings in
`scripts/arabic/sysmess.mjs` (one block per language), a flag in
`scripts/make-assets.py`, and run `npm run data`.

**Change the math.** `src/engine/stats.js` is a direct, line-by-line port; run
`node scripts/verify-legacy.mjs` after any modification — it tells you exactly
which value diverged from the reference implementation.

## Arabic support

Arabic is not a bolt-on: item names, item descriptions, skill descriptions,
skill names, talent names and every UI string are translated in
`public/data/{names,items,i18n}.json`. The dictionary lives in
`scripts/arabic/dict.mjs` (word-level glossary), `descriptions.mjs` (sentence
templates) and `sysmess.mjs` (UI strings). `npm run data` prints the number of
unknown tokens — it currently reports **0** for names, descriptions and UI
strings, and a validation pass asserts there is no Latin text left in the
translated descriptions.

Switching to Arabic sets `<html lang="ar" dir="rtl">`, mirrors the whole layout
(CSS logical properties everywhere), swaps the display font from Cinzel to Amiri
and mirrors the decorative flourishes.

## Credits

Original tool and database by **Rafael Moreno** (moxmen/DrakensangOptimizer).
Drakensang Online is © Bigpoint GmbH. This is a non-commercial fan project; all
game images belong to their respective owners.
