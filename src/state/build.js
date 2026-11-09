/**
 * state/build.js
 * -----------------------------------------------------------------------------
 * Modèle de « build » compatible avec les profils JSON de l'ancien site.
 *
 * Un profil exporté par l'ancienne application ressemble à :
 * {
 *   job, level, knowledge, pvplevel, pet, vs, vslevel, vspvplevel,
 *   vsdefense, vsresist, marked, essence, talents: { ExpTree: [], PvPtree: [] },
 *   amulets: {...}, waists: {...}, ... (13 slots)
 * }
 * `parseProfile` accepte aussi bien l'ancien format que le nouveau.
 */

export const SLOT_ORDER = [
  'amulets', 'waists', 'weapondecorations', 'ring1', 'ring2',
  'headarmors', 'shoulders', 'torsos', 'gloves', 'boots',
  'weapons', 'offhands', 'mantles',
];

/** Colonne d'icône « vide » d'un slot. */
export function emptyIcon(slot, job) {
  if (/waists|mantles/.test(slot)) return `${slot}empty`;
  if (/ring/.test(slot)) return 'ringsempty';
  return `${slot}${job}empty`;
}

/** Modèle par défaut d'un équipement (identique à `defaultSlotsINIT`). */
export function emptyEquip(slot, job) {
  const base = {
    hashkey: '',
    name: '',
    quality: 'empty',
    type: /weapons|offhands/.test(slot) ? '' : slot.replace(/1|2/, 's'),
    finalStats: [],
    enchants: [
      { label: '', value: 0 },
      { label: '', value: 0 },
      { label: '', value: 0 },
      { label: '', value: 0 },
    ],
    gems: [{ key: 'nogem' }, { key: 'nogem' }, { key: 'nogem' }, { key: 'nogem' }, { key: 'nogem' }],
    reqlvl: 1,
    icon: emptyIcon(slot, job),
  };
  if (/amulets|weapondecorations|ring/.test(slot)) base.basestats = [];
  else if (slot === 'weapons') {
    base.TwoHandedWeapon = false;
    base.basestats = [
      { label: 'damageminbase', value: 0 },
      { label: 'damagemaxbase', value: 0 },
      { label: 'speedbase', value: 0 },
    ];
  } else if (slot === 'offhands') {
    base.basestats = [
      { label: 'armorbase', value: 0 },
      { label: 'blockratebase', value: 0 },
      { label: 'blockeddmgbase', value: 0 },
    ];
  } else {
    base.basestats = [{ label: 'armorbase', value: 0 }];
  }
  return base;
}

export function emptySlots(job) {
  const slots = {};
  for (const slot of SLOT_ORDER) slots[slot] = emptyEquip(slot, job);
  return slots;
}

export const DEFAULT_SETTINGS = {
  job: 'WAR',
  level: 45,
  knowledge: 30,
  pvpLevel: 0,
  pet: 'nopet',
  essence: 'blank',
  opponent: 'pve',
  opponentLevel: 45,
  opponentPvpLevel: 0,
  opponentDefense: 0,
  opponentResist: 0,
  marked: true,
  talents: { ExpTree: [], PvPtree: [] },
};

export function emptyBuild(job = 'WAR') {
  return { ...DEFAULT_SETTINGS, job, slots: emptySlots(job), talents: { ExpTree: [], PvPtree: [] } };
}

/** Est-ce que le slot est vide ? */
/**
 * Un emplacement est vide lorsqu'il n'a ni nom ni objet d'origine.
 * Attention : `quality` vaut `''` (et non `'empty'`) dès qu'un objet réel est
 * équipé sans enchantement — comme dans l'ancienne version.
 */
export function isSlotEmpty(equip) {
  if (!equip) return true;
  return !(equip.name || equip.hashkey);
}

/**
 * Convertit un profil (ancien ou nouveau format) vers le modèle interne.
 */
export function parseProfile(profile, catalog) {
  const job = profile.job || 'WAR';
  const build = emptyBuild(job);
  build.level = clamp(profile.level ?? 45, 1, catalog.meta.maxLevel);
  build.knowledge = clamp(profile.knowledge ?? 0, 0, 45);
  build.pvpLevel = clamp(profile.pvplevel ?? profile.pvpLevel ?? 0, 0, 45);
  build.pet = profile.pet && catalog.companions[profile.pet] ? profile.pet : 'nopet';
  build.essence = profile.essence && catalog.essences[profile.essence] ? profile.essence : 'blank';
  build.opponent = profile.vs === 'pvp' || profile.opponent === 'pvp' ? 'pvp' : 'pve';
  build.opponentLevel = clamp(profile.vslevel ?? profile.opponentLevel ?? 45, 1, catalog.meta.maxLevel);
  build.opponentPvpLevel = clamp(profile.vspvplevel ?? profile.opponentPvpLevel ?? 0, 0, 45);
  build.opponentDefense = clamp(profile.vsdefense ?? profile.opponentDefense ?? 0, 0, 1);
  build.opponentResist = clamp(profile.vsresist ?? profile.opponentResist ?? 0, 0, 1);
  build.marked = profile.marked ?? true;
  build.talents = {
    ExpTree: Array.isArray(profile.talents?.ExpTree) ? profile.talents.ExpTree : [],
    PvPtree: Array.isArray(profile.talents?.PvPtree) ? profile.talents.PvPtree : [],
  };

  for (const slot of SLOT_ORDER) {
    const raw = profile[slot] || profile.slots?.[slot];
    if (!raw) continue;
    const equip = { ...emptyEquip(slot, job), ...raw };
    equip.enchants = Array.from({ length: 4 }, (_, i) => raw.enchants?.[i] || { label: '', value: 0 });
    equip.gems = Array.from({ length: 5 }, (_, i) => raw.gems?.[i] || { key: 'nogem' });
    equip.basestats = raw.basestats || emptyEquip(slot, job).basestats;
    build.slots[slot] = equip;
  }
  return build;
}

/** Sérialise un build dans le format historique (rétro-compatible). */
export function serializeProfile(build) {
  const out = {
    job: build.job,
    level: build.level,
    knowledge: build.knowledge,
    pvplevel: build.pvpLevel,
    pet: build.pet,
    vs: build.opponent,
    vslevel: build.opponentLevel,
    vspvplevel: build.opponentPvpLevel,
    vsdefense: build.opponentDefense,
    vsresist: build.opponentResist,
    marked: build.marked,
    essence: build.essence,
    talents: build.talents,
  };
  for (const slot of SLOT_ORDER) out[slot] = build.slots[slot];
  return out;
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

/** Construit un équipement à partir d'une entrée du catalogue. */
export function equipFromItem(item, slot, job, catalog) {
  const equip = emptyEquip(slot, job);
  equip.hashkey = item.key;
  equip.name = item.name?.eng || item.key;
  equip.names = item.name || {};
  equip.unic = !!item.unic;
  equip.icon = item.icon || item.key;
  equip.reqlvl = item.level ?? 1;
  equip.quality = item.unic ? 'unique' : 'empty';

  const baseTemplate = emptyEquip(slot, job).basestats.map((b) => b.label);
  if (item.type) equip.type = item.type;

  // statistiques « base » (armure / dégâts / vitesse)
  for (const label of baseTemplate) {
    if (item.stats[label] !== undefined && item.stats[label] !== '') {
      const entry = equip.basestats.find((b) => b.label === label);
      if (entry) entry.value = Number(item.stats[label]);
    }
  }
  // statistiques « enchantement » (toutes les autres)
  let idx = 0;
  for (const [key, value] of Object.entries(item.stats)) {
    if (baseTemplate.includes(key)) continue;
    if (['value', 'frames', 'nbdot', 'magicshare', 'markable', 'pvpreqlvl', 'slots'].includes(key)) continue;
    if (idx >= 4) break;
    equip.enchants[idx] = { label: key, value };
    idx += 1;
  }
  // cas particulier : arme à deux mains
  if (slot === 'weapons') {
    equip.TwoHandedWeapon = /greatsword|greataxe|hammer|staff|longbow|rifle/.test(equip.type || '');
  }
  void catalog;
  return equip;
}
