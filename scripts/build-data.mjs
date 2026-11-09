/**
 * build-data.mjs
 * -----------------------------------------------------------------------------
 * Transforme les anciens fichiers db/ (Langs.json + Items.json du dépôt
 * AngularJS) en un dataset prêt pour l'application React, et génère en plus
 * les traductions arabes manquantes.
 *
 *   node scripts/build-data.mjs
 *
 * Sorties :
 *   public/data/i18n.json   → toutes les traductions (eng, fra, deu, esp, ara)
 *   public/data/items.json  → résultats, ensembles, joyaux, compétences, talents…
 *   src/data/check-missing.json → mots anglais sans traduction arabe (contrôle)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { parseRelaxedJson, writeJson, LANGS } from './lib.mjs';
import { WORDS, WORDS2, WORDS3, PHRASES } from './arabic/dict.mjs';
import { translateName, missing } from './arabic/translate.mjs';
import { SKILL_FRAMES, DEFAULT_FRAMES } from './skill-frames.mjs';
import { EXTRA_TALENT_NAMES } from './extra-names.mjs';
import { descriptionAr } from './arabic/descriptions.mjs';
import { SYS_Arabic, UI } from './arabic/sysmess.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = path.join(ROOT, 'legacy/Production');

const itemsRaw = parseRelaxedJson(path.join(LEGACY, 'Items.min.json'));
const langsRaw = parseRelaxedJson(path.join(LEGACY, 'Langs.min.json'));

// ── helpers ──────────────────────────────────────────────────────────────────
const auditUntranslated = new Set();

// ── 1. i18n ─────────────────────────────────────────────────────────────────
const sysmess = {};
for (const row of langsRaw.sysmess) {
  const tr = {};
  for (const l of LANGS) if (row[l] !== undefined) tr[l] = String(row[l]).trim();
  if (row.ara) tr.ara = row.ara;
  tr.ara = tr.ara || SYS_Arabic[row.langid] || translateName(tr.eng || '');
  sysmess[row.langid] = tr;
}
// keys required by the modern UI that the legacy file does not know about
const EXTRA_SYS = {
  ara: { savedBuilds: 'المجموعات المحفوظة', compare: 'مقارنة', importExport: 'استيراد/تصدير', builder: 'البناء', stats: 'الاحصائيات' },
  eng: { savedBuilds: 'Saved builds', compare: 'Comparison', importExport: 'Import / Export', builder: 'Builder', stats: 'Statistics' },
};
for (const [lid, tr] of Object.entries(EXTRA_SYS)) {
  for (const [k, v] of Object.entries(tr)) {
    sysmess[k] = { ...(sysmess[k] || {}), [lid]: v };
  }
}

// names per category, keyed by langid
const names = {};
const TYPES = ['amulets', 'waists', 'weapondecorations', 'rings', 'headarmors', 'shoulders', 'torsos', 'gloves', 'boots', 'mantles', 'weapons', 'offhands', 'sets', 'essences', 'skills', 'talents', 'gems', 'companions'];
for (const cat of TYPES) {
  const entries = langsRaw[cat] || [];
  for (const row of entries) {
    const tr = {};
    for (const l of LANGS) if (row[l] !== undefined) tr[l] = String(row[l]).trim();
    if (row.name && typeof row.name === 'object') Object.assign(tr, row.name);
    if (row.description && typeof row.description === 'object') {
      tr.__description = { ...row.description };
      if (!tr.__description.ara) tr.__description.ara = descriptionAr(tr.__description.eng || row.description.eng || '') || translateName(tr.__description.eng || '');
    }
    if (!tr.ara) tr.ara = translateName(tr.eng || row.langid);
    names[cat] = names[cat] || {};
    names[cat][row.langid] = tr;
  }
}

// Complète les entrées absentes de Langs.json (talents ultimes JcJ notamment)
for (const [langid, bag] of Object.entries(EXTRA_TALENT_NAMES)) {
  names.talents = names.talents || {};
  if (!names.talents[langid]) names.talents[langid] = bag;
}

// UI strings : eng + ara from UI, then FR/DE/ES extras merged from Langs sysmess
// where the key exists, otherwise English fallback at runtime.
const ui = {};
const flat = (o, prefix = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flat(v, prefix ? `${prefix}.${k}` : k) : [[prefix ? `${prefix}.${k}` : k, v]],
  );
const LANGS_UI = ['eng', 'fra', 'deu', 'esp', 'ara'];
const uiFlat = {};
for (const l of LANGS_UI) {
  uiFlat[l] = {};
  const src = { ...(UI.eng || {}) };
  void src;
  for (const [k, v] of flat(UI.eng)) uiFlat[l][k] = v; // base
  for (const [k, v] of flat(UI[l] || {})) uiFlat[l][k] = v;
}
// FR/DE/ES: merge the "new strings" file
const { UI_EXTRA } = await import('./arabic/sysmess.mjs');
for (const l of ['fra', 'deu', 'esp']) {
  for (const [k, v] of flat(UI_EXTRA[l] || {})) uiFlat[l][k] = v;
}
ui.languages = {
  eng: { label: 'English', native: 'English', dir: 'ltr' },
  fra: { label: 'Français', native: 'Français', dir: 'ltr' },
  deu: { label: 'Deutsch', native: 'Deutsch', dir: 'ltr' },
  esp: { label: 'Español', native: 'Español', dir: 'ltr' },
  ara: { label: 'العربية', native: 'العربية', dir: 'rtl' },
};
ui.strings = uiFlat;
ui.sysmess = sysmess;

writeJson(path.join(ROOT, 'public/data/i18n.json'), ui);
writeJson(path.join(ROOT, 'public/data/names.json'), names);

// ── 2. items ────────────────────────────────────────────────────────────────
const dirOf = (slot) => (slot === 'ring1' || slot === 'ring2' ? 'rings' : slot);
const stripMeta = (o, keepUnic = true) => {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (['id', 'langid', 'icon', 'job'].includes(k)) continue;
    if (k === 'unic' && !keepUnic) continue;
    out[k] = v;
  }
  return out;
};

const items = {};
for (const cat of ['amulets', 'waists', 'weapondecorations', 'rings', 'headarmors', 'shoulders', 'torsos', 'gloves', 'boots', 'mantles', 'weapons', 'offhands', 'sets', 'essences', 'skills', 'talents', 'gems', 'companions']) {
  const list = itemsRaw[cat] || [];
  items[cat] = list.map((o, idx) => {
    const entry = {
      key: String(o.id ?? idx),
      langid: o.langid || o.id,
      name: names[cat]?.[o.langid] || {},
      icon: o.icon || o.id,
    };
    if (o.job !== undefined) entry.job = o.job;
    if (o.unic) entry.unic = true;
    if (o.level !== undefined) entry.level = o.level;
    if (o.category) entry.category = o.category;
    if (o.targetedskills) entry.targetedskills = o.targetedskills;
    if (o.slots) entry.slots = o.slots;
    if (o.color !== undefined) entry.color = o.color;
    if (o.setpieces) entry.setpieces = o.setpieces;
    if (o.setbonus) entry.setbonus = o.setbonus;
    if (o.type) entry.type = o.type;
    // Chaque compétence occupe un « cycle » de frames proportionnel à la vitesse
    // de l'arme (l'ancien code utilisait sk.frames / attackSpeed).
    if (cat === 'skills') {
      entry.frames = o.frames ?? o.speedframe ?? SKILL_FRAMES[o.id] ?? DEFAULT_FRAMES;
    }
    const stats = {};
    for (const [k, v] of Object.entries(stripMeta(o))) {
      if (['level', 'category', 'targetedskills', 'slots', 'color', 'setpieces', 'setbonus', 'type', 'name'].includes(k)) continue;
      if (v === '' || v === null || v === undefined) continue;
      stats[k] = v;
    }
    entry.stats = stats;
    return entry;
  });
}

/* ---- catégorie de gemme (l'ancienne base ne la stockait pas) ---- */
const GEM_CATEGORIES = {
  Ruby: 'Ruby', Saphir: 'Saphir', Onyx: 'Onyx', Amethyste: 'Amethyste',
  Cyanite: 'Cyanite', Diamond: 'Diamond',
};
for (const gem of items.gems) {
  const found = Object.keys(GEM_CATEGORIES).find((c) => gem.key.includes(c));
  gem.category = found ? GEM_CATEGORIES[found] : 'Other';
}

/* ---- contexte professionnel de chaque objet (portée par la classe) ---- */
for (const cat of ['amulets', 'waists', 'weapondecorations', 'rings', 'headarmors', 'shoulders', 'torsos', 'gloves', 'boots', 'mantles', 'weapons', 'offhands']) {
  for (const entry of items[cat]) {
    entry.jobs = String(entry.job || '').split(',').map((j) => j.trim()).filter(Boolean);
  }
}

// constants keyed by level
const constants = {};
for (const c of itemsRaw.constants) {
  constants[c.level] = c;
}

/* ---- knowledge / mantle requirement (legacy: KnowledgeLvl >= 30) ---- */
/* ---- frames de compétence : l'ancien Items.json ne les stocke pas car la
   vitesse de chaque compétence est dérivée de `speed` dans le calcul ; on
   conserve la valeur historique utilisée par les paliers (frames=25/attackSpeed). */

const meta = {
  version: 3,
  source: 'DrakensangOptimizer legacy AngularJS (Release 134)',
  maxLevel: 45,
  knowledgeForMantle: 30,
  legacySlots: ['amulets', 'waists', 'weapondecorations', 'ring1', 'ring2', 'headarmors', 'shoulders', 'torsos', 'gloves', 'boots', 'weapons', 'offhands', 'mantles'],
};

writeJson(path.join(ROOT, 'public/data/items.json'), { meta, constants, ...items });

// ── 3. audit ────────────────────────────────────────────────────────────────
const audit = {
  untranslatedWords: [...missing].sort(),

  dictSize: Object.keys(WORDS).length + Object.keys(WORDS2).length + Object.keys(WORDS3).length,
};
writeJson(path.join(ROOT, 'src/data/arabic-audit.json'), audit);
console.log(
  `✔ data built — ${Object.values(items).reduce((a, b) => a + b.length, 0)} entries, ` +
    `${Object.keys(sysmess).length} sysmess keys, ${audit.untranslatedWords.length} unknown tokens`,
);
if (audit.untranslatedWords.length) console.log('  →', audit.untranslatedWords.join(', '));


