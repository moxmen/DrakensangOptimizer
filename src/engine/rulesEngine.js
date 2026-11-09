/**
 * engine/rulesEngine.js
 * -----------------------------------------------------------------------------
 * Exécute les règles (`engine/rules.js`) pour produire le même résultat que
 * l'ancien `calculateAll()` — mais avec des formules éditables.
 *
 * Ordre d'exécution (identique à Controller.js) :
 *   1. ensembles → 2. compagnon → 3. sommes par emplacement → 4. jointures
 *   (arme à deux mains, joaillerie, résistances, base de classe)
 *   5. arme (vitesse, min, max) → 6. bouclier → 7. armure par objet
 *   8. bonus de niveau / JcJ → 9. multiplicateur de dégâts → 10. pourcentages
 *   → 11. DPS → 12. compétences.
 *
 * Les formules peuvent lire les totaux « en cours ». Une valeur lue par `T()`
 * est le total *avant* la règle qui l'écrit, ce qui permet d'écrire
 * `T("life") * 1.05` pour ajouter 5 % sans boucle infinie.
 */
import { evaluateNode, compile, MATH_FNS, DEFAULT_FNS } from './formula.js';
import {
  ALL_SLOTS, accumulateSlot, computeSets, computeTalents, emptyGlobalStats,
} from './stats.js';
import { legacyRules, normalizeRule } from './rules.js';

const num = (v) => (typeof v === 'number' ? v : parseFloat(v) || 0);
const truthy = (v) => (typeof v === 'boolean' ? v : !!v);

/** Toutes les statistiques présentes dans les règles + celles fournies. */
export function collectStats(rules, extraStats = []) {
  const set = new Set(extraStats);
  for (const r of rules) {
    if (r.target && r.target !== '*' && !r.target.startsWith('pct:')) set.add(r.target);
  }
  return [...set];
}

/**
 * Calcule tout depuis un build.
 *
 * @param {object} build   état (voir src/state/build.js)
 * @param {object} catalog catalogue indexé
 * @param {object} [options]
 * @param {Array}  [options.rules]  règles (par défaut : LEGACY)
 * @param {Array}  [options.stats]  liste de statistiques supplémentaires
 * @returns {object} même forme que `computeBuild` (gs, percentages, dps, skills…)
 */
export function computeBuildWithRules(build, catalog, options = {}) {
  const rules = (options.rules && options.rules.length ? options.rules : legacyRules())
    .map((r, i) => normalizeRule(r, i));
  const extraStats = options.stats || [];
  const statList = new Set([...collectStats(rules, extraStats), ...extraStats]);

  // ── 0. conteneurs ──────────────────────────────────────────────────────────
  const gs = emptyGlobalStats();
  // statistiques ajoutées par l'utilisateur
  for (const stat of statList) {
    if (gs[stat]) continue;
    gs[stat] = { Total: 0, fromPet: 0, fromSets: 0, fromTalents: 0 };
    for (const slot of ALL_SLOTS) gs[stat][slot] = { fromBase: 0, fromEnch: 0, fromGems: 0 };
  }

  for (const slot of ALL_SLOTS) {
    const equip = build.slots[slot];
    if (equip) accumulateSlot(gs, slot, equip, catalog.gems);
  }
  const is2H = !!(build.slots.weapons && build.slots.weapons.TwoHandedWeapon);
  const talentedSkills = computeTalents(gs, build.talents, catalog, is2H);
  const { setsBonuses, setSkills } = computeSets(gs, build.slots, catalog);

  // ── 1. compagnon ───────────────────────────────────────────────────────────
  for (const stat of Object.keys(gs)) gs[stat].fromPet = 0;
  const petObj = catalog.companions[build.pet];
  if (petObj) {
    for (const [k, v] of Object.entries(petObj.stats || {})) {
      if (gs[k]) gs[k].fromPet = num(v);
    }
  }

  // ── 2. sommes par emplacement (règles de type `sum`) ──────────────────────
  const sumRules = rules.filter((r) => r.kind === 'sum' && r.enabled);
  const ruleFor = (stat) => sumRules.find((r) => (r.targets || []).includes(stat))
    || sumRules.find((r) => (r.targets || []).includes('*'))
    || null;

  const errors = [];
  const warn = (msg) => { if (!errors.includes(msg)) errors.push(msg); };
  const sumErrors = [];
  const sumOf = (expr, cell, stat, slot) => {
    try {
      const v = evaluateNode(compile(expr), {
        vars: {
          base: num(cell.fromBase),
          ench: num(cell.fromEnch),
          gems: num(cell.fromGems),
          stat,
          slot,
        },
      });
      return Number.isFinite(v) ? num(v) : 0;
    } catch (err) {
      const msg = `Somme « ${stat}/${slot} » : ${err.message}`;
      if (!sumErrors.includes(msg)) sumErrors.push(msg);
      return num(cell.fromBase) + num(cell.fromEnch) + num(cell.fromGems);
    }
  };

  for (const stat of Object.keys(gs)) {
    const s = gs[stat];
    s.Total = s.fromPet + s.fromSets + s.fromTalents;
    const rule = ruleFor(stat);
    for (const slot of ALL_SLOTS) {
      if (!s[slot]) s[slot] = { fromBase: 0, fromEnch: 0, fromGems: 0 };
      const expr = rule ? rule.expr : 'base + ench + gems';
      s.Total += sumOf(expr, s[slot], stat, slot);
    }
  }

  for (const m of sumErrors) warn(m);

  // ── 4. contexte d'évaluation ───────────────────────────────────────────────
  const constSelf = catalog.constants[build.level] || catalog.constants[45];
  const constOpp = catalog.constants[build.opponentLevel] || catalog.constants[45];
  const essObj = catalog.essences[build.essence];
  const essenceDamage = essObj ? num(essObj.stats.damage) : 0;
  const opponent = build.opponent;

  const T = (name) => (gs[name] ? gs[name].Total : 0);
  const cell = (name, slot) => (gs[name] && gs[name][slot]) || { fromBase: 0, fromEnch: 0, fromGems: 0 };
  const B = (name, slot) => num(cell(name, slot).fromBase);
  const E = (name, slot) => num(cell(name, slot).fromEnch);
  const G = (name, slot) => num(cell(name, slot).fromGems);
  const S = (name, slot) => B(name, slot) + E(name, slot) + G(name, slot);
  const PET = (name) => (gs[name] ? gs[name].fromPet : 0);
  const SETS = (name) => (gs[name] ? gs[name].fromSets : 0);
  const TLT = (name) => (gs[name] ? gs[name].fromTalents : 0);

  const percentages = {};
  const PCT = (name) => num(percentages[name]);

  /** somme « objet par objet » utilisée par la règle d'armure */
  const SUM_SLOTS = (name, factor = 'itemarmorboost') => {
    let total = 0;
    for (const slot of ALL_SLOTS) {
      const boost = E(factor, slot) + G(factor, slot);
      total += S(name, slot) * (1 + boost);
    }
    return total;
  };

  const fns = {
    T, B, E, G, S, PET, SETS, TLT, PCT, SUM_SLOTS,
    has: (v) => v !== undefined && v !== null,
    slot: (n) => n,
  };

  const globals = {
    knowledge: num(build.knowledge),
    level: num(build.level),
    pvpLevel: num(build.pvpLevel),
    opponentPvpLevel: num(build.opponentPvpLevel),
    opponentLevel: num(build.opponentLevel),
    opponent,
    pvpBonus: opponent === 'pvp'
      ? (num(build.pvpLevel) - num(build.opponentPvpLevel)) / 100
      : 0,
    is2H,
    essenceDamage,
    basehp: num(constSelf.basehp[build.job]),
    basedmg: num(constSelf.basedmg[build.job]),
    accr: num(constOpp.accr),
    acr: num(constOpp.accr),
    blockrateConst: num(constOpp.blockrate),
    blockeddmgConst: num(constOpp.blockeddmg),
    oppDefense: num(build.opponentDefense),
    oppResist: num(build.opponentResist),
    marked: !!build.marked,
  };

  const evalIn = (expr, extraVars = {}) => {
    const ctx = {
      ...DEFAULT_FNS,
      ...fns,
      ...build_context(globals),
      ...extraVars,
    };
    return evaluateNode(compile(expr), {
      // toute statistique est lisible directement par son nom (= son total courant)
      vars: { ...computeGlobals(), ...statTotals(), ...extraVars },
      fns: ctx,
    });
  };

  /** variables « simples » (sans parenthèses) recalculées à chaque appel */
  function computeGlobals() {
    const g = { ...globals };
    const damageMode = T(`damage${opponent}`);
    g.damageMultiplier = damageMode + T('damageboost') + num(build.knowledge) / 100 + g.pvpBonus;
    g.meanDamage = (T('damagemin') + T('damagemax')) / 2;
    g.MEAN = g.meanDamage;
    // WEAPON_MIN / WEAPON_MAX conservent la valeur calculée par la règle
    // « dégâts de l'arme » : elles ne sont jamais remises à zéro.
    g.weaponMin = g.WEAPON_MIN = num(globals.weaponMin);
    g.weaponMax = g.WEAPON_MAX = num(globals.weaponMax);
    return g;
  }
  function build_context() { return {}; }
  /** totaux courants exposés comme variables simples */
  function statTotals() {
    const out = {};
    for (const stat of Object.keys(gs)) out[stat] = num(gs[stat].Total);
    return out;
  }

  // ── 5. règles dans l'ordre ─────────────────────────────────────────────────
  const outputs = {};
  const skillsRule = rules.find((r) => r.kind === 'skills');

  /** applique une règle `expr` : ajoute (ou remplace) le total de la cible */
  const applyExpr = (rule, target, expr, extraVars = {}) => {
    let value;
    try {
      value = evalIn(expr, extraVars);
    } catch (err) {
      warn(`Formule « ${rule.label || rule.id} » : ${err.message}`);
      return 0;
    }
    if (!Number.isFinite(value)) value = 0;
    if (rule.mode === 'store') return value;          // mémorise sans ajouter
    if (rule.mode === 'set') { gs[target].Total = value; return value; }
    gs[target].Total += value;
    return value;
  };

  const ordered = rules.filter((r) => r.enabled && (r.kind === 'expr' || r.kind === 'pct'));

  // une statistique ne reçoit qu'une seule règle « exclusive » : la règle
  // générique ne doit pas s'ajouter par-dessus une règle dédiée
  const covered = new Set();
  for (const r of ordered) if (r.exclusive && r.target) covered.add(r.target);

  for (const rule of ordered) {
    // règle générique : s'applique à chaque statistique
    if (rule.kind === 'expr' && rule.target === '*') {
      for (const stat of Object.keys(gs)) {
        if (covered.has(stat)) continue;
        if (rule.when) {
          let applies = false;
          try {
            applies = truthy(evalIn(rule.when, { stat }));
          } catch (err) {
            warn(`Condition « ${rule.label} » : ${err.message}`);
          }
          if (!applies) continue;
        }
        applyExpr({ ...rule, mode: 'add' }, stat, rule.expr, { stat });
      }
      continue;
    }

    if (rule.kind === 'expr') {
      if (!gs[rule.target]) continue;
      // les variables WEAPON_MIN / WEAPON_MAX sont renseignées par les règles
      // du même nom, dans l'ordre de la liste
      const value = applyExpr(rule, rule.target, rule.expr);
      if (rule.id === 'weapon-min') globals.weaponMin = globals.WEAPON_MIN = value;
      if (rule.id === 'weapon-max') globals.weaponMax = globals.WEAPON_MAX = value;
      continue;
    }

    if (rule.kind === 'pct') {
      const denom = num(globals[rule.denom] !== undefined ? globals[rule.denom] : globals.accr);
      const value = num((gs[rule.source] || {}).Total);
      percentages[rule.target] = denom === 0 ? 0 : Math.min(value / (value + denom), num(rule.cap) || 0.8);
    }
  }

  // `meanDamage` et le multiplicateur dépendent de l'état final des totaux
  globals.meanDamage = globals.MEAN = (T('damagemin') + T('damagemax')) / 2;
  globals.damageMultiplier = T(`damage${opponent}`) + T('damageboost')
    + num(build.knowledge) / 100 + globals.pvpBonus;

  // ── 6. règles de sortie (DPS) évaluées en dernier ──────────────────────────
  for (const rule of rules) {
    if (rule.output && rule.kind === 'expr' && rule.enabled) {
      const value = applyExpr(rule, rule.target, rule.expr);
      outputs[rule.target] = value;
    }
  }
  const dps = outputs.dps !== undefined ? outputs.dps : computeDpsFallback(gs, percentages);

  // ── 7. compétences ─────────────────────────────────────────────────────────
  const skills = computeSkillsWithRule({
    gs, catalog, percentages, talentedSkills, setSkills,
    marked: build.marked, defense: build.opponentDefense, resist: build.opponentResist,
    rule: skillsRule,
    T, PCT,
    vars: {
      level: num(build.level),
      knowledge: num(build.knowledge),
      pvpLevel: num(build.pvpLevel),
      opponentLevel: num(build.opponentLevel),
      is2H,
      ...globals,
    },
  });

  return {
    gs,
    percentages,
    dps,
    skills: skills.skills,
    speedSteps: skills.speedSteps,
    setsBonuses,
    setSkills,
    is2H,
    talentedSkills,
    errors,
    rulesUsed: rules.length,
  };
}

function computeDpsFallback(gs, percentages) {
  const crit = num(percentages.critrate);
  const mean = (num(gs.damagemin.Total) + num(gs.damagemax.Total)) / 2;
  return (1 - crit + crit * (2 + num(gs.critboost.Total))) * mean * num(gs.speed.Total);
}

/**
 * Dégâts par compétence — identique à `calculateSkills()` ; la formule reste
 * éditable (règle `skills`), avec `normal` et `critExpr` séparés.
 */
export function computeSkillsWithRule({
  gs, catalog, percentages, talentedSkills, setSkills, marked, defense, resist, rule, T, PCT, vars = {},
}) {
  const skills = {};
  const speedSteps = {};
  const critExpr = (rule && rule.critExpr) || '(2 + T("critboost"))';
  const critBoostGlobal = evaluateCrit(critExpr, T, vars);
  const critrate = num((percentages || {}).critrate);

  for (const [key, sk] of Object.entries(catalog.skills)) {
    const dmgmin = gs.damagemin.Total;
    const dmgmax = gs.damagemax.Total;
    const bonusMarking = marked && sk.stats.markable ? 2 : 1;
    const critBoost = critBoostGlobal;
    const tltSkill = (talentedSkills || []).find((o) => o.key === key);
    const setSkill = (setSkills || []).find((o) => o.key === key);
    const baseDot = sk.stats.nbdot ? num(sk.stats.nbdot) : 1;
    const talentDot = tltSkill ? (tltSkill.nbdot || 0) : 0;
    const nbdot = baseDot + (tltSkill ? talentDot - (!sk.stats.nbdot && talentDot ? 1 : 0) : 0);
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

    const normMinPhys = Math.floor(normMin * (1 - magicShare) * (1 - num(defense)));
    const normMaxPhys = Math.floor(normMax * (1 - magicShare) * (1 - num(defense)));
    const normMinMagic = Math.floor(normMin * magicShare * (1 - num(resist)));
    const normMaxMagic = Math.floor(normMax * magicShare * (1 - num(resist)));
    const critMinPhys = Math.floor(normMin * critBoost * (1 - magicShare) * (1 - num(defense)));
    const critMaxPhys = Math.floor(normMax * critBoost * (1 - magicShare) * (1 - num(defense)));
    const critMinMagic = Math.floor(normMin * critBoost * magicShare * (1 - num(resist)));
    const critMaxMagic = Math.floor(normMax * critBoost * magicShare * (1 - num(resist)));

    const obj = {
      min: normMinPhys + normMinMagic,
      max: normMaxPhys + normMaxMagic,
      critmax: critMaxPhys + critMaxMagic,
      critmin: 0,
    };
    if (magicShare > 0 && magicShare < 0.5) obj.critmin = normMinPhys + critMinMagic;
    else if (magicShare >= 0.5 && magicShare < 1) obj.critmin = critMinPhys + normMinMagic;
    else obj.critmin = critMinPhys + critMinMagic;

    skills[key] = obj;

    // paliers de vitesse
    const frames = num(sk.stats.frames) || 25;
    const speed = num(gs.speed.Total) || 1;
    const trueSpeed = 25 / Math.ceil(0.5 + frames / speed);
    const step = { min: 0, max: 0, dps: 0 };
    step.min = Math.round((frames / (25 / trueSpeed - 0.5)) * 1000) / 1000;
    step.max = Math.round((frames / (25 / trueSpeed - 1.5)) * 1000) / 1000;
    step.dps = (1 - critrate + critrate * (2 + num(gs.critboost.Total)))
      * ((obj.min + obj.max) / 2) * step.min;
    speedSteps[key] = step;
  }
  return { skills, speedSteps };
}

function evaluateCrit(expr, T, extraVars = {}) {
  try {
    return num(evaluateNode(compile(expr), {
      fns: { ...DEFAULT_FNS, T, PCT: () => 0 },
      vars: extraVars,
    }));
  } catch {
    return 2 + num(T('critboost'));
  }
}
