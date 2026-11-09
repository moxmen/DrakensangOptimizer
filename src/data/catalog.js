/**
 * data/catalog.js
 * -----------------------------------------------------------------------------
 * Charge les données générées par scripts/build-data.mjs et expose un
 * catalogue normalisé, indexé par identifiant (`key`).
 */
import { indexBy } from '../engine/stats.js';

const SLOT_TO_CATEGORY = {
  amulets: 'amulets',
  waists: 'waists',
  weapondecorations: 'weapondecorations',
  ring1: 'rings',
  ring2: 'rings',
  headarmors: 'headarmors',
  shoulders: 'shoulders',
  torsos: 'torsos',
  gloves: 'gloves',
  boots: 'boots',
  weapons: 'weapons',
  offhands: 'offhands',
  mantles: 'mantles',
};

export const categoryForSlot = (slot) => SLOT_TO_CATEGORY[slot] || slot;

const normalizeEntry = (entry) => {
  const out = { ...entry, stats: entry.stats || {} };
  if (entry.slots) out.slotList = String(entry.slots).split(',');
  if (entry.setpieces) out.pieceList = String(entry.setpieces).split(',');
  return out;
};

/** Transforme le JSON brut en catalogue utilisable par le moteur. */
export function buildCatalog(rawItems, rawNames) {
  const catalog = { meta: rawItems.meta, constants: rawItems.constants };
  for (const key of Object.keys(SLOT_TO_CATEGORY).map((s) => SLOT_TO_CATEGORY[s])) void key;
  for (const cat of [
    'amulets', 'waists', 'weapondecorations', 'rings', 'headarmors', 'shoulders',
    'torsos', 'gloves', 'boots', 'mantles', 'weapons', 'offhands', 'sets',
    'essences', 'skills', 'talents', 'gems', 'companions',
  ]) {
    const list = (rawItems[cat] || []).map(normalizeEntry);
    catalog[cat] = list;
    catalog[`${cat}ById`] = indexBy(list);
    // noms multilingues séparés (issus de Langs.json + traduction arabe)
    catalog[`${cat}Names`] = rawNames[cat] || {};
  }

  // Le moteur indexe gems/talents/skills/essences/compagnons par leur id
  catalog.gemsList = rawItems.gems || [];
  catalog.gems = catalog.gemsById;
  catalog.talents = catalog.talentsById;
  catalog.skills = catalog.skillsById;
  catalog.sets = catalog.setsById;
  catalog.essences = catalog.essencesById;
  catalog.companions = catalog.companionsById;
  // …et l'interface parcourt les mêmes entités sous forme de listes
  catalog.essencesList = Object.values(catalog.essencesById);
  catalog.companionsList = Object.values(catalog.companionsById);
  catalog.skillsList = Object.values(catalog.skillsById);
  catalog.talentsList = Object.values(catalog.talentsById);
  catalog.setsList = Object.values(catalog.setsById);
  return catalog;
}

/** Nom traduit d'une entrée de catalogue. */
export function localizedName(catalogNames, entry, lang, fallback = '') {
  if (!entry) return fallback;
  const bag = catalogNames?.[entry.langid] || entry.name;
  if (!bag) return entry.key || fallback;
  return bag[lang] || bag.eng || bag.fra || entry.key || fallback;
}

export function localizedDescription(catalogNames, entry, lang) {
  const bag = catalogNames?.[entry?.langid];
  if (!bag || !bag.__description) return '';
  return bag.__description[lang] || bag.__description.eng || '';
}
