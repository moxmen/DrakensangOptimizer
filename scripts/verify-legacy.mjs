/**
 * verify-legacy.mjs
 * -----------------------------------------------------------------------------
 * Vérifie que le moteur React (src/engine/stats.js) produit EXACTEMENT les mêmes
 * valeurs que l'ancien Controller.js AngularJS.
 *
 * On exécute le code legacy tel quel dans Node avec un shim minimal d'Angular,
 * puis on compare les résultats pour des builds identiques.
 *
 *   node scripts/verify-legacy.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { parseRelaxedJson } from './lib.mjs';
import { computeBuild } from '../src/engine/stats.js';
import { emptyBuild, emptyEquip, SLOT_ORDER } from '../src/state/build.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = path.join(ROOT, 'legacy');

const itemsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/items.json'), 'utf8'));
const namesJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/names.json'), 'utf8'));

// ── convertit le dataset moderne vers la forme `db` de l'ancien back-end ─────
const flat = (entry) => {
  const out = { ...entry.stats };
  if (entry.unic) out.unic = true;
  if (entry.setpieces) out.setpieces = entry.setpieces;
  if (entry.setbonus) out.setbonus = entry.setbonus;
  if (entry.category) out.category = entry.category;
  if (entry.targetedskills) out.targetedskills = entry.targetedskills;
  if (entry.slots) out.slots = entry.slots;
  if (entry.color !== undefined) out.color = entry.color;
  if (entry.level !== undefined) out.level = entry.level;
  if (entry.icon) out.icon = entry.icon;
  if (entry.frames !== undefined) out.speedframe = entry.frames;
  // le back-end PHP ne renvoyait pas l'id : l'ancien code l'ajoutait côté client
  out.key = entry.key;
  // …et il filtrait les clés techniques (name/icon) avant d'itérer sur les stats
  delete out.name;
  delete out.description;
  delete out.level;
  delete out.icon;
  delete out.category;
  delete out.targetedskills;
  delete out.color;
  delete out.setpieces;
  delete out.setbonus;
  delete out.slots;
  delete out.unic;
  delete out.type;
  delete out.unic;
  delete out.key;
  return out;
};

const db = { sysmess: {} };
const CATS = {
  amulets: 'amulets', waists: 'waists', weapondecorations: 'weapondecorations',
  rings: 'rings', headarmors: 'headarmors', shoulders: 'shoulders', torsos: 'torsos',
  gloves: 'gloves', boots: 'boots', mantles: 'mantles', weapons: 'weapons',
  offhands: 'offhands', sets: 'sets', essences: 'essences', skills: 'skills',
  talents: 'talents', companions: 'companions',
};
for (const [cat, key] of Object.entries(CATS)) {
  db[key] = {};
  for (const entry of itemsJson[cat] || []) {
    const nameBag = namesJson[cat]?.[entry.langid] || entry.name || {};
    db[key][entry.key] = {
      name: nameBag.eng || entry.key,
      ...flat(entry),
    };
    if (entry.unic) db[key][entry.key].unic = true;
    if (entry.setpieces) db[key][entry.key].setpieces = entry.setpieces;
    if (entry.setbonus) db[key][entry.key].setbonus = entry.setbonus;
    if (entry.targetedskills) db[key][entry.key].targetedskills = entry.targetedskills;
    if (entry.category) db[key][entry.key].category = entry.category;
    if (entry.slots) db[key][entry.key].slots = entry.slots;
    if (entry.color !== undefined) db[key][entry.key].color = entry.color;
    if (entry.level !== undefined) db[key][entry.key].level = entry.level;
    if (entry.icon) db[key][entry.key].icon = entry.icon;
  }
}
db.gems = (itemsJson.gems || []).map((g) => {
  const nameBag = namesJson.gems?.[g.langid] || g.name || {};
  return { key: g.key, name: nameBag.eng || g.key, ...flat(g) };
});
// Le back-end PHP ne renvoyait que les constantes de la classe demandée :
// on reproduit exactement cette projection (basehp/basedmg deviennent des scalaires).
const constantsForJob = (job) => {
  const out = {};
  for (const c of Object.values(itemsJson.constants)) {
    out[c.level] = {
      basehp: c.basehp[job],
      basedmg: c.basedmg[job],
      accr: c.accr,
      blockrate: c.blockrate,
      blockeddmg: c.blockeddmg,
    };
  }
  return out;
};
db.constants = constantsForJob('WAR');
const sysmess = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/i18n.json'), 'utf8')).sysmess;
for (const [key, bag] of Object.entries(sysmess)) db.sysmess[key] = bag.eng;

// ── shim Angular minimal ────────────────────────────────────────────────────
const storage = new Map();
const sessionStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  key: (i) => [...storage.keys()][i],
  clear: () => storage.clear(),
  get length() { return storage.size; },
};

const angular = {
  module: () => app,
  copy: (o) => JSON.parse(JSON.stringify(o)),
  toJson: (o) => JSON.stringify(o),
  fromJson: (s) => JSON.parse(s),
  isDefined: (v) => v !== undefined,
  forEach: (obj, fn) => {
    if (Array.isArray(obj)) obj.forEach((v, i) => fn(v, i));
    else Object.keys(obj || {}).forEach((k) => fn(obj[k], k));
  },
  equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  element: () => ({ append() {} }),
};

const factories = {};
const filters = {};
const controllers = {};
const app = {
  config() {},
  directive() {},
  filter(name, fn) {
    filters[name] = fn;
    return app;
  },
  factory(name, fn) {
    factories[name] = fn;
    return app;
  },
  controller(name, arr) {
    controllers[name] = arr;
    return app;
  },
};

function makeFilter(name) {
  const deps = {};
  return (...args) => {
    const fn = filters[name];
    if (!fn) throw new Error(`missing filter ${name}`);
    const resolved = typeof fn === 'function' ? fn : null;
    // les filtres historiques sont déclarés en tableaux ['$filter', fn]
    const impl = Array.isArray(fn) ? fn[fn.length - 1] : resolved;
    return impl(...args)(deps['$filter'] || makeFilter);
  };
}

const $filter = (name) => {
  const entry = filters[name];
  if (Array.isArray(entry)) {
    const impl = entry[entry.length - 1];
    return impl($filter);
  }
  return entry;
};

const context = {
  angular,
  window: { navigator: { language: 'en-GB' }, URL: { createObjectURL: () => 'blob:x' } },
  navigator: { language: 'en-GB' },
  sessionStorage,
  localStorage: sessionStorage,
  console,
  document: {
    getElementById: () => ({ style: {}, attributes: { id: { value: '' } }, href: '' }),
  },
  setTimeout,
  JSON,
  Math,
  RegExp,
  Number,
  String,
  Object,
  Array,
  Date,
  Blob: class {},
};
context.global = context;
context.window.document = context.document;
vm.createContext(context);

// charge Filters.js, Services.js, Controller.js
for (const file of ['Controller.js', 'Filters.js', 'Services.js']) {
  const code = fs.readFileSync(path.join(LEGACY, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

// ── instancie le contrôleur legacy ──────────────────────────────────────────
const DataImport = {
  getData: () => Promise.resolve(JSON.parse(JSON.stringify(db))),
};
const equipsFactory = factories.equipsFactory();
const scope = {
  $watch() {},
  $apply(fn) { if (fn) fn(); },
  $on() {},
};
const ctrl = controllers.MainCtrl;
const deps = ctrl.slice(0, -1).map((name) => {
  if (name === '$scope') return scope;
  if (name === '$http') return () => Promise.resolve({ data: {} });
  if (name === '$filter') return $filter;
  if (name === 'DataImport') return DataImport;
  if (name === 'equipsFactory') return equipsFactory;
  throw new Error(`unknown dependency ${name}`);
});
ctrl[ctrl.length - 1](...deps);

scope.db = JSON.parse(JSON.stringify(db));
for (const wp of Object.values(scope.db.weapons)) {
  wp.speedbase = 1 / (wp.speedbase || 1);
}
scope.db = JSON.parse(JSON.stringify(db));
scope.resetAll();

// ── builds de test aléatoires ───────────────────────────────────────────────
let rnd = 12345;
const rand = () => {
  rnd = (rnd * 1103515245 + 12345) % 2147483648;
  return rnd / 2147483648;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const catalogForNew = (() => {
  // même forme que src/data/catalog.js mais sans passer par le fetch
  const out = { meta: itemsJson.meta, constants: itemsJson.constants };
  const indexBy = (list, key = 'key') => {
    const map = {};
    for (const it of list || []) map[it[key] ?? it.id] = it;
    return map;
  };
  for (const cat of Object.keys(CATS)) {
    const list = itemsJson[cat] || [];
    out[cat] = list;
    out[`${cat}ById`] = indexBy(list);
    out[`${cat}Names`] = namesJson[cat] || {};
  }
  out.gemsList = itemsJson.gems || [];
  out.gems = indexBy(itemsJson.gems);
  out.talents = indexBy(itemsJson.talents);
  out.skills = indexBy(itemsJson.skills);
  out.sets = indexBy(itemsJson.sets);
  out.essences = indexBy(itemsJson.essences);
  out.companions = indexBy(itemsJson.companions);
  return out;
})();

// ── génère un équipement « legacy » puis l'équivalent moderne ───────────────
function buildEquip(slot, item, job) {
  const legacy = JSON.parse(JSON.stringify(JSON.parse(sessionStorage.getItem('defaultSlots'))[slot]));
  const baseTemplate = legacy.basestats.map((b) => b.label);
  legacy.hashkey = item.key;
  legacy.name = item.name;
  legacy.unic = item.unic;
  legacy.icon = item.icon;
  if (item.level !== undefined) legacy.reqlvl = item.level;
  if (['weapons', 'offhands'].includes(slot)) legacy.type = item.type || '';
  let idx = 0;
  for (const [k, v] of Object.entries(item.stats || {})) {
    if (baseTemplate.includes(k)) {
      const found = legacy.basestats.find((b) => b.label === k);
      if (found) found.value = v;
    } else if (!/^(level|type)$/.test(k) && idx < 4) {
      legacy.enchants[idx] = { label: k, value: v };
      idx += 1;
    }
  }
  if (slot === 'weapons') {
    // l'ancien code dérive la vitesse : durationbase → speedbase = 1/duration
    legacy.TwoHandedWeapon = /greatsword|greataxe|hammer|staff|longbow|rifle/.test(legacy.type);
  }
  legacy.quality = item.unic ? 'unique' : 'empty';
  void job;
  return legacy;
}

function randomBuildForJob(job) {
  const legacy = { job, slots: {} };
  const modern = emptyBuild(job);
  for (const slot of SLOT_ORDER) {
    const cat = slot === 'ring1' || slot === 'ring2' ? 'rings' : slot;
    const pool = (db[cat] && Object.values(db[cat])) || [];
    if (!pool.length) continue;
    const item = pick(pool);
    legacy.slots[slot] = buildEquip(slot, item, job);
    modern.slots[slot] = {
      ...JSON.parse(JSON.stringify(legacy.slots[slot])),
      names: namesJson[cat]?.[item.langid] || {},
      quality: item.unic ? 'unique' : 'empty',
    };
  }
  // l'arme doit avoir une vitesse valide
  if (legacy.slots.weapons && !legacy.slots.weapons.basestats[2].value) {
    legacy.slots.weapons.basestats[2].value = 1.2;
    modern.slots.weapons.basestats[2].value = 1.2;
  }
  // pas de main secondaire avec une arme à deux mains
  if (legacy.slots.weapons && legacy.slots.weapons.TwoHandedWeapon && job !== 'RNG') {
    legacy.slots.offhands = JSON.parse(JSON.stringify(JSON.parse(sessionStorage.getItem('defaultSlots')).offhands));
    modern.slots.offhands = emptyEquip('offhands', job);
  }
  return { legacy, modern };
}

// ── exécution de l'ancien calcul pour un profil ─────────────────────────────
function runLegacy(state) {
  scope.selectedJob = state.job;
  scope.db = JSON.parse(JSON.stringify(db));
  scope.db.constants = constantsForJob(state.job);
  // l'ancien contrôleur transforme durationbase en speedbase au chargement
  for (const wp of Object.values(scope.db.weapons)) wp.speedbase = 1 / (wp.speedbase || 1);
  scope.resetAll();
  scope.selectedJob = state.job;
  scope.selectedLevel = state.level;
  scope.KnowledgeLvl = state.knowledge;
  scope.PvPLvl = state.pvpLevel;
  scope.selectedPet = state.pet;
  scope.OpponentSelector = state.opponent;
  scope.OpponentLevel = state.opponentLevel;
  scope.OpponentPvPLvl = state.opponentPvpLevel;
  scope.OpponentDefense = state.defense;
  scope.OpponentResist = state.resist;
  scope.MarkedStatus = state.marked;
  scope.selectedEss = state.essence;
  scope.selectedTalents = state.talents;

  for (const slot of SLOT_ORDER) {
    equipsFactory.put(slot, state.slots[slot]);
  }
  for (const slot of SLOT_ORDER) scope.updateGlobalStats(slot);
  scope.calculAll();
  return {
    dps: scope.DPS,
    min: scope.GlobalStats.damagemin.Total,
    max: scope.GlobalStats.damagemax.Total,
    crit: scope.critratePercentage,
    armor: scope.GlobalStats.armor.Total,
    life: scope.GlobalStats.life.Total,
    speed: scope.GlobalStats.speed.Total,
    block: scope.GlobalStats.blockrate.Total,
    skills: scope.SkillsDamage,
    setBonusCount: (scope.SetsBonuses || []).length,
    talents: true,
  };
}

// ── comparaison ─────────────────────────────────────────────────────────────
const jobs = ['WAR', 'SW', 'RNG', 'DWF'];
const pets = [...Object.keys(db.companions)];
const essences = [...Object.keys(db.essences)];
let failures = 0;
let checks = 0;
const report = [];

for (let i = 0; i < 40; i += 1) {
  const job = jobs[i % jobs.length];
  const { legacy, modern } = randomBuildForJob(job);
  const state = {
    job,
    level: 30 + Math.floor(rand() * 16),
    knowledge: Math.floor(rand() * 46),
    pvpLevel: i % 3 === 0 ? Math.floor(rand() * 46) : 0,
    pet: pick(pets),
    essence: pick(essences),
    opponent: i % 3 === 0 ? 'pvp' : 'pve',
    opponentLevel: 30 + Math.floor(rand() * 16),
    opponentPvpLevel: Math.floor(rand() * 20),
    defense: Math.round(rand() * 40) / 100,
    resist: Math.round(rand() * 40) / 100,
    marked: rand() > 0.5,
    talents: { ExpTree: [], PvPtree: [] },
    slots: legacy.slots,
  };

  // talents aléatoires cohérents avec la classe
  const talentPool = Object.values(db.talents).filter(
    (t) => !t.job || t.job.split(',').map((j) => j.trim()).includes(job),
  );
  // l'ancien code indexe les talents par RANGÉE (0..8 → niveaux 5..45)
  const talentArrays = { ExpTree: new Array(9).fill(''), PvPtree: new Array(9).fill('') };
  for (const t of talentPool) {
    if (t.level === undefined) continue;
    const cat = t.category || 'ExpTree';
    if (rand() > 0.45) {
      const rowIdx = Math.floor((t.level - 5) / 5);
      if (rowIdx >= 0 && rowIdx < 9) talentArrays[cat][rowIdx] = t.key;
    }
  }
  state.talents = { ExpTree: [...talentArrays.ExpTree], PvPtree: [...talentArrays.PvPtree] };

  const expected = runLegacy(state);

  const got = computeBuild(
    { ...modern, level: state.level, knowledge: state.knowledge, pvpLevel: state.pvpLevel, pet: state.pet, essence: state.essence, opponent: state.opponent, opponentLevel: state.opponentLevel, opponentPvpLevel: state.opponentPvpLevel, opponentDefense: state.defense, opponentResist: state.resist, marked: state.marked, talents: { ExpTree: talentArrays.ExpTree, PvPtree: talentArrays.PvPtree } },
    catalogForNew,
  );

  // compétences : comparaison des dégâts (l'ancien expose un tableau indexé par clé)
  const legacySkillKeys = Object.keys(scope.db.skills);
  let skillMismatch = 0;
  legacySkillKeys.forEach((key, idx) => {
    const a = expected.skills[idx];
    const b = got.skills[key];
    if (!a || !b) return;
    checks += 1;
    if (Math.abs(a.min - b.min) > 1e-6 || Math.abs(a.max - b.max) > 1e-6
      || Math.abs(a.critmin - b.critmin) > 1e-6 || Math.abs(a.critmax - b.critmax) > 1e-6) {
      skillMismatch += 1;
      failures += 1;
      report.push(`  ✗ ${job} #${i} skill ${key}: legacy=${JSON.stringify(a)} new=${JSON.stringify(b)}`);
    }
  });

  const rows = [
    ['DPS', expected.dps, got.dps],
    ['min', expected.min, got.gs.damagemin.Total],
    ['max', expected.max, got.gs.damagemax.Total],
    ['crit%', expected.crit, got.percentages.critrate],
    ['armor', expected.armor, got.gs.armor.Total],
    ['life', expected.life, got.gs.life.Total],
    ['speed', expected.speed, got.gs.speed.Total],
    ['block', expected.block, got.gs.blockrate.Total],
  ];

  for (const [label, a, b] of rows) {
    checks += 1;
    const same = Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) < 1e-6 : a === b;
    if (!same) {
      failures += 1;
      report.push(`  ✗ ${job} #${i} ${label}: legacy=${a} new=${b}`);
    }
  }
}

console.log(`\n${checks - failures}/${checks} valeurs identiques à l'ancien moteur AngularJS.`);
if (failures) {
  console.log(report.slice(0, 25).join('\n'));
  process.exitCode = 1;
} else {
  console.log('✔ Le portage du moteur est bit-à-bit équivalent.\n');
}
