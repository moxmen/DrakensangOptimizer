/**
 * engine/stats.js
 * -----------------------------------------------------------------------------
 * Portage TypeScript/JS EXACT du moteur de calcul d'origine (Controller.js).
 * Toutes les formules, arrondis, cas particuliers et ordres d'opération sont
 * conservés à l'identique pour garantir des résultats identiques au site historique.
 *
 * Legacy reference (Controller.js) :
 *   DPS = (1 - critrate% + critrate% * (2 + critboost)) * MeanDMG * speed
 */

/** Les 13 emplacements, dans l'ordre historique (index de colonne des stats). */
export const ALL_SLOTS = [
  'amulets',
  'waists',
  'weapondecorations',
  'ring1',
  'ring2',
  'headarmors',
  'shoulders',
  'torsos',
  'gloves',
  'boots',
  'weapons',
  'offhands',
  'mantles',
];

/** Toutes les statistiques gérées, dans l'ordre historique. */
export const ALL_STATS = [
  'damage', 'damageboost', 'damagepve', 'damagepvp', 'damagemin', 'damagemax',
  'damageminboost', 'damagemaxboost', 'weapondamageboost', 'damage2H',
  'critrate', 'critrateboost', 'critboost', 'speed', 'movspeed',
  'armor', 'armorboost', 'itemarmorboost', 'life', 'lifeboost', 'regen',
  'blockrate', 'blockrateboost', 'blockeddmg', 'blockeddmgboost',
  'resist', 'resistboost', 'fire', 'ice', 'lightning', 'poison', 'andermagic',
  'fireboost', 'iceboost', 'lightningboost', 'poisonboost', 'andermagicboost',
];

export const JOBS = ['WAR', 'SW', 'RNG', 'DWF'];

/** Libellé de base → statistique ("damageminbase" → "damagemin"). */
export const baseStatToStat = (label) => label.replace('base', '');

/** Crée un conteneur de statistiques vierge (Total + une entrée par slot). */
export function emptyGlobalStats() {
  const gs = {};
  for (const stat of ALL_STATS) {
    gs[stat] = { Total: 0, fromPet: 0, fromSets: 0, fromTalents: 0 };
    for (const slot of ALL_SLOTS) {
      gs[stat][slot] = { fromBase: 0, fromEnch: 0, fromGems: 0 };
    }
  }
  return gs;
}

/** Valeur d'une propriété d'équipement qui correspond à une statistique. */
const num = (v) => (typeof v === 'number' ? v : parseFloat(v) || 0);

/** Un objet du catalogue indexé par id (pour les gemmes / sets). */
export function indexBy(list, key = 'key') {
  const out = {};
  for (const item of list || []) out[item[key] ?? item.id] = item;
  return out;
}

/** Remplit `gs` avec les valeurs d'un équipement pour un slot donné. */
export function accumulateSlot(gs, slot, equip, gemIndex) {
  for (const stat of ALL_STATS) {
    gs[stat][slot] = { fromBase: 0, fromEnch: 0, fromGems: 0 };
  }
  if (!equip) return gs;

  for (const b of equip.basestats || []) {
    const stat = baseStatToStat(String(b.label));
    if (gs[stat] && gs[stat][slot]) gs[stat][slot].fromBase += num(b.value);
  }
  for (const e of equip.enchants || []) {
    if (e && e.label && gs[e.label] && gs[e.label][slot]) {
      gs[e.label][slot].fromEnch += num(e.value);
    }
  }
  for (const g of equip.gems || []) {
    if (!g || !g.key || g.key === 'nogem') continue;
    const gem = gemIndex[g.key];
    if (!gem) continue;
    for (const [k, v] of Object.entries(gem.stats || {})) {
      if (gs[k] && gs[k][slot]) gs[k][slot].fromGems += num(v);
    }
  }
  return gs;
}

/**
 * Bonus d'ensemble — reproduit `calculSets()` (Controller.js).
 * @returns {{ setsBonuses: Array, setSkills: Array }}
 */
export function computeSets(gs, equipped, catalog) {
  const setSkills = [];
  const setsBonuses = [];
  for (const stat of ALL_STATS) gs[stat].fromSets = 0;

  // 1. objets uniques portés (les seuls à porter des sets)
  const eqpList = [];
  for (const slot of ALL_SLOTS) {
    const eqp = equipped[slot];
    if (eqp && eqp.unic && eqp.hashkey && !eqpList.includes(eqp.hashkey)) {
      eqpList.push(eqp.hashkey);
    }
  }
  if (eqpList.length < 2) return { setsBonuses, setSkills };

  const working = [...eqpList];
  for (const [setKey, set] of Object.entries(catalog.sets)) {
    if (!set.setpieces) continue;
    const piecesRe = new RegExp(String(set.setpieces).replace(/,/g, '|'));
    const lastBonus = set.setbonus[set.setbonus.length - 1];
    const nbmax = lastBonus.nbpieces;
    let count = 0;
    const available = [...working];
    for (let i = 0; i < available.length; i += 1) {
      if (piecesRe.test(available[i])) {
        working.splice(working.indexOf(available[i]), 1);
        count += 1;
        if (count === nbmax) break;
      }
    }
    if (count >= set.setbonus[0].nbpieces) {
      const bn = {};
      for (const bonus of set.setbonus) {
        if (bonus.nbpieces > count) break;
        for (const [prop, value] of Object.entries(bonus)) {
          if (prop === 'skill') {
            const existing = setSkills.find((s) => s.key === bonus.skill);
            const dmg = num(bonus.damageboost);
            if (existing) existing.bonus += dmg;
            else setSkills.push({ key: bonus.skill, bonus: dmg });
            bn[`skill${bonus.nbpieces}`] = [bonus.skill, dmg];
            break;
          }
          if (prop !== 'nbpieces' && gs[prop]) {
            bn[prop] = (bn[prop] || 0) + num(value);
            gs[prop].fromSets += num(value);
          }
        }
      }
      bn.key = setKey;
      bn.count = count;
      bn.maxcount = nbmax;
      setsBonuses.push(bn);
    }
  }
  return { setsBonuses, setSkills };
}

/** Réinitialise les bonus d'ensemble (utile pour un recalcul propre). */
export function resetSets(gs) {
  for (const stat of ALL_STATS) gs[stat].fromSets = 0;
}

/**
 * Bonus de talents — reproduit `calculTalents()`.
 */
export function computeTalents(gs, selectedTalents, catalog, isTwoHanded) {
  const talentedSkills = [];
  for (const stat of ALL_STATS) gs[stat].fromTalents = 0;

  for (const [category, picks] of Object.entries(selectedTalents || {})) {
    for (const talentId of picks || []) {
      if (!talentId) continue;
      const talent = catalog.talents[talentId];
      if (!talent) continue;
      const targeted = talent.targetedskills ? String(talent.targetedskills).split(',') : [];
      const test2H = (talentId === 'TwoHandedMaster' || talentId === 'LongbowAce') && isTwoHanded;
      const test1H = talentId === 'ShortbowAce' && !isTwoHanded;
      const statName = Object.keys(talent.stats || {}).find(
        (k) => !/name|description|category|level|icon|targetedskills|nbdot/.test(k),
      );
      if (!statName) continue;
      const value = num(talent.stats[statName]);

      if (!targeted.length) {
        // talents génériques
        if (test2H || test1H || !/TwoHandedMaster|LongbowAce|ShortbowAce/.test(talentId)) {
          if (gs[statName]) gs[statName].fromTalents += value;
        }
      } else {
        // talents ciblant une compétence
        for (const skillKey of targeted) {
          const existing = talentedSkills.find((s) => s.key === skillKey);
          const nbdot = num(talent.stats.nbdot);
          if (existing) {
            existing.nbdot += nbdot;
            existing.bonus += value;
          } else {
            talentedSkills.push({ key: skillKey, bonus: value, nbdot });
          }
        }
      }
      void category;
    }
  }
  return talentedSkills;
}

/**
 * Calcul complet — reproduit fidèlement `calculAll()` + `calculSkills()`.
 *
 * @param {object} params
 * @param {object} params.gs            statistiques globales (mutées)
 * @param {object} params.equipped      équipements par slot
 * @param {object} params.catalog       { gems, sets, talents, skills, companions, essences, constants }
 * @param {object} params.settings      { job, level, knowledge, pvpLevel, pet, essence, opponent, opponentLevel, opponentPvpLevel, defense, resist, marked, talents }
 */
export function calculateAll({ gs, equipped, catalog, settings }) {
  const {
    job, level, knowledge, pvpLevel, pet, essence, opponent,
    opponentLevel, opponentPvpLevel, defense, resist, marked,
  } = settings;
  const talentedSkills = settings.talentedSkills || [];

  const is2H = !!(equipped.weapons && equipped.weapons.TwoHandedWeapon);

  // ── 1. sets ────────────────────────────────────────────────────────────────
  const { setsBonuses, setSkills } = computeSets(gs, equipped, catalog);

  // ── 2. pets ────────────────────────────────────────────────────────────────
  for (const stat of ALL_STATS) gs[stat].fromPet = 0;
  const petObj = catalog.companions[pet];
  if (petObj) {
    for (const [k, v] of Object.entries(petObj.stats || {})) {
      if (gs[k]) gs[k].fromPet = num(v);
    }
  }

  // ── 3. totaux par slot ─────────────────────────────────────────────────────
  for (const stat of ALL_STATS) {
    const s = gs[stat];
    s.Total = s.fromPet + s.fromSets + s.fromTalents;
    for (const slot of ALL_SLOTS) {
      const skip =
        (slot === 'weapons' && /weapondamageboost|damage(|min|max)$/.test(stat)) ||
        (slot === 'offhands' && /^block/.test(stat)) ||
        /^(armor|itemarmorboost)$/.test(stat);
      if (skip) continue;
      if (slot === 'weapons' && stat === 'speed') s.Total += s[slot].fromGems;
      else s.Total += s[slot].fromBase + s[slot].fromEnch + s[slot].fromGems;
    }
  }

  // ── 4. cas particuliers ────────────────────────────────────────────────────
  if (is2H) gs.weapondamageboost.Total += gs.damage2H.Total;

  const essObj = catalog.essences[essence];
  const essDmg = essObj ? num(essObj.stats.damage) : 0;
  if (essDmg < 5) {
    gs.damageboost.Total += opponent !== 'pvp' ? essDmg : 0;
  } else {
    gs.damage.Total += essDmg;
  }

  const constSelf = catalog.constants[level] || catalog.constants[45];
  const constOpp = catalog.constants[opponentLevel] || catalog.constants[45];

  gs.life.Total += num(constSelf.basehp[job]);
  for (const elt of ['fire', 'ice', 'lightning', 'poison', 'andermagic']) {
    gs[elt].Total += gs.resist.Total;
    gs[`${elt}boost`].Total += gs.resistboost.Total;
  }

  const baseDmg = num(constSelf.basedmg[job]);
  gs.damagemin.Total += baseDmg + gs.damage.Total;
  gs.damagemax.Total += baseDmg + gs.damage.Total;

  // ── 5. arme ────────────────────────────────────────────────────────────────
  gs.speed.Total =
    (gs.speed.weapons.fromBase ? gs.speed.weapons.fromBase : 1) *
    (1 + gs.speed.weapons.fromEnch) *
    (1 + gs.speed.Total);

  const wMin =
    (gs.damagemin.weapons.fromBase +
      gs.damagemin.weapons.fromEnch +
      gs.damagemin.weapons.fromGems +
      gs.damage.weapons.fromEnch +
      gs.damage.weapons.fromGems) *
    (1 + gs.weapondamageboost.weapons.fromEnch);
  const wMax =
    (gs.damagemax.weapons.fromBase +
      gs.damagemax.weapons.fromEnch +
      gs.damagemax.weapons.fromGems +
      gs.damage.weapons.fromEnch +
      gs.damage.weapons.fromGems) *
    (1 + gs.weapondamageboost.weapons.fromEnch);

  gs.damagemin.Total += wMin * (1 + gs.weapondamageboost.Total);
  gs.damagemax.Total += wMax * (1 + gs.weapondamageboost.Total);

  // ── 6. bouclier ────────────────────────────────────────────────────────────
  gs.blockrate.Total +=
    (gs.blockrate.offhands.fromBase + gs.blockrate.offhands.fromEnch) *
    (1 + gs.blockrateboost.offhands.fromEnch);
  gs.blockeddmg.Total +=
    (gs.blockeddmg.offhands.fromBase + gs.blockeddmg.offhands.fromEnch) *
    (1 + gs.blockeddmgboost.offhands.fromEnch);

  // ── 7. bonus d'armure par objet ────────────────────────────────────────────
  for (const slot of ALL_SLOTS) {
    const iabSlot = gs.itemarmorboost[slot].fromEnch + gs.itemarmorboost[slot].fromGems;
    gs.armor.Total +=
      (gs.armor[slot].fromBase + gs.armor[slot].fromEnch + gs.armor[slot].fromGems) *
      (1 + iabSlot);
  }

  // ── 8. bonus de niveau / PvP ───────────────────────────────────────────────
  const bonusKnowledge = num(knowledge) / 100;
  const bonusPvpLevel = opponent === 'pvp' ? (num(pvpLevel) - num(opponentPvpLevel)) / 100 : 0;
  const bonusPvpArena = 0; // désactivé dans l'original

  for (const stat of ALL_STATS) {
    const t = gs[`${stat}boost`];
    const s = gs[stat];
    if (stat === 'life') {
      s.Total += s.Total * (t.Total + bonusKnowledge);
    } else if (/^(armor|fire|ice|poison|lightning|andermagic)$/.test(stat)) {
      s.Total += s.Total * (t.Total + bonusPvpLevel - bonusPvpArena);
    } else if (!/boost$|resist|damage/.test(stat) && t) {
      s.Total += s.Total * t.Total;
    }
  }
  gs.regen.Total += gs.life.Total / 100;

  let multiplier = gs[`damage${opponent}`].Total + gs.damageboost.Total;
  multiplier += bonusKnowledge + bonusPvpLevel + bonusPvpArena;
  gs.damagemin.Total = Math.floor(gs.damagemin.Total * (1 + gs.damageminboost.Total + multiplier));
  gs.damagemax.Total = Math.floor(gs.damagemax.Total * (1 + gs.damagemaxboost.Total + multiplier));

  // ── 9. pourcentages dérivés ────────────────────────────────────────────────
  const accr = num(constOpp.accr);
  const pct = (value, denom) => Math.min(value / (value + denom), 0.8);

  const percentages = {
    critrate: pct(gs.critrate.Total, accr),
    armor: pct(gs.armor.Total, accr),
    fire: pct(gs.fire.Total, accr),
    ice: pct(gs.ice.Total, accr),
    lightning: pct(gs.lightning.Total, accr),
    poison: pct(gs.poison.Total, accr),
    andermagic: pct(gs.andermagic.Total, accr),
    blockrate: pct(gs.blockrate.Total, num(constOpp.blockrate)),
    blockeddmg: pct(gs.blockeddmg.Total, num(constOpp.blockeddmg)),
  };

  // ── 10. DPS ────────────────────────────────────────────────────────────────
  const meanDmg = (gs.damagemin.Total + gs.damagemax.Total) / 2;
  const dps =
    (1 - percentages.critrate + percentages.critrate * (2 + gs.critboost.Total)) *
    meanDmg *
    gs.speed.Total;

  // ── 11. compétences ────────────────────────────────────────────────────────
  const { skills, speedSteps } = calculateSkills({
    gs,
    catalog,
    percentages,
    talentedSkills,
    setSkills,
    marked,
    defense,
    resist,
  });

  return { percentages, dps, skills, speedSteps, setsBonuses, setSkills };
}

/**
 * Dégâts de chaque compétence — reproduit `calculSkills()`.
 */
export function calculateSkills({ gs, catalog, percentages, talentedSkills, setSkills, marked, defense, resist }) {
  const skills = {};
  const speedSteps = {};

  for (const [key, sk] of Object.entries(catalog.skills)) {
    let obj = { min: 0, max: 0, critmin: 0, critmax: 0 };
    const dmgmin = gs.damagemin.Total;
    const dmgmax = gs.damagemax.Total;
    const bonusMarking = marked && sk.stats.markable ? 2 : 1;
    const critBoost = 2 + gs.critboost.Total;
    const tltSkill = (talentedSkills || []).find((o) => o.key === key);
    const setSkill = (setSkills || []).find((o) => o.key === key);
    const baseDot = sk.stats.nbdot ? num(sk.stats.nbdot) : 1;
    const talentDot = tltSkill ? (tltSkill.nbdot || 0) : 0;
    const nbdot =
      baseDot +
      (tltSkill ? talentDot - (!sk.stats.nbdot && talentDot ? 1 : 0) : 0);
    let skdmg = num(sk.stats.value);
    let bonusTalent = 0;

    if (tltSkill) {
      if (tltSkill.bonus && !num(sk.stats.value)) skdmg += tltSkill.bonus;
      else bonusTalent += tltSkill.bonus;
    }
    if (setSkill) {
      if (setSkill.bonus && !num(sk.stats.value)) skdmg += setSkill.bonus;
      else bonusTalent += setSkill.bonus;
    }

    const normMin = Math.floor(dmgmin * skdmg * nbdot * (1 + bonusTalent)) * bonusMarking;
    const normMax = Math.floor(dmgmax * skdmg * nbdot * (1 + bonusTalent)) * bonusMarking;
    const magicShare = num(sk.stats.magicshare);

    const normMinPhys = Math.floor(normMin * (1 - magicShare) * (1 - defense));
    const normMaxPhys = Math.floor(normMax * (1 - magicShare) * (1 - defense));
    const normMinMagic = Math.floor(normMin * magicShare * (1 - resist));
    const normMaxMagic = Math.floor(normMax * magicShare * (1 - resist));
    const critMinPhys = Math.floor(normMin * critBoost * (1 - magicShare) * (1 - defense));
    const critMaxPhys = Math.floor(normMax * critBoost * (1 - magicShare) * (1 - defense));
    const critMinMagic = Math.floor(normMin * critBoost * magicShare * (1 - resist));
    const critMaxMagic = Math.floor(normMax * critBoost * magicShare * (1 - resist));

    obj.min = Number(normMinPhys + normMinMagic);
    obj.max = Number(normMaxPhys + normMaxMagic);
    obj.critmax = Number(critMaxPhys + critMaxMagic);

    // pire cas pour critmin : seule la plus petite part reçoit le bonus
    if (magicShare > 0 && magicShare < 0.5) obj.critmin = Number(normMinPhys + critMinMagic);
    else if (magicShare >= 0.5 && magicShare < 1) obj.critmin = Number(critMinPhys + normMinMagic);
    else obj.critmin = Number(critMinPhys + critMinMagic);

    skills[key] = obj;

    const meanDmg = (obj.min + obj.max) / 2;
    const trueSpeed = 25 / Math.ceil(0.5 + num(sk.stats.frames) / gs.speed.Total);
    const step = { min: 0, max: 0, dps: 0 };
    step.min = Math.round((num(sk.stats.frames) / (25 / trueSpeed - 0.5)) * 1000) / 1000;
    step.max = Math.round((num(sk.stats.frames) / (25 / trueSpeed - 1.5)) * 1000) / 1000;
    step.dps =
      (1 - percentages.critrate + percentages.critrate * (2 + gs.critboost.Total)) *
      meanDmg *
      step.min;
    speedSteps[key] = step;
    obj = obj; // no-op pour lisibilité
  }

  return { skills, speedSteps };
}

/**
 * Point d'entrée haut niveau : calcule tout depuis l'état de l'application.
 * L'état est de la forme décrite dans `src/state/build.js`.
 */
export function computeBuild(build, catalog) {
  const gs = emptyGlobalStats();
  for (const slot of ALL_SLOTS) {
    const equip = build.slots[slot];
    if (equip) accumulateSlot(gs, slot, equip, catalog.gems);
  }
  const is2H = !!(build.slots.weapons && build.slots.weapons.TwoHandedWeapon);

  const talentedSkills = computeTalents(gs, build.talents, catalog, is2H);

  const result = calculateAll({
    gs,
    equipped: build.slots,
    catalog,
    settings: {
      job: build.job,
      level: build.level,
      knowledge: build.knowledge,
      pvpLevel: build.pvpLevel,
      pet: build.pet,
      essence: build.essence,
      opponent: build.opponent,
      opponentLevel: build.opponentLevel,
      opponentPvpLevel: build.opponentPvpLevel,
      defense: build.opponentDefense,
      resist: build.opponentResist,
      marked: build.marked,
      talents: build.talents,
      talentedSkills,
    },
  });

  return {
    ...result,
    gs,
    is2H,
    talentedSkills,
  };
}
