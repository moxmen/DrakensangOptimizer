/**
 * engine/rules.js
 * -----------------------------------------------------------------------------
 * Le calcul complet décrit comme DONNÉES (règles + formules) au lieu de code.
 *
 * Chaque nombre du résultat final est produit par une règle :
 *   - `sum`   : Total = PET + SETS + TLT + Σ (base + ench + gems) des emplacements,
 *               en respectant les exclusions déclaratives (`skip`) ;
 *   - `expr`  : Total = valeur d'une formule (les variables désignent des totaux) ;
 *   - `pct`   : pourcentage = min(valeur / (valeur + dénominateur), plafond) ;
 *   - `skills`: dégâts des compétences (formule appliquée à chaque compétence).
 *
 * Les règles sont stockées dans le navigateur (localStorage) : l'utilisateur
 * peut ajouter une statistique, changer une formule ou supprimer une règle
 * depuis l'écran « Calculateur », sans toucher au code.
 *
 * `LEGACY_RULES` reproduit EXACTEMENT l'ancien Controller.js — c'est la base
 * de départ et la référence du test `scripts/verify-legacy.mjs`.
 */
import { ALL_STATS, ALL_SLOTS } from './stats.js';

/** Toutes les statistiques, y compris celles ajoutées par l'utilisateur. */
export const BASE_STAT_LIST = ALL_STATS;

/** Opérateurs disponibles dans l'éditeur. */
export const RULE_KINDS = [
  { id: 'sum', label: 'Somme des emplacements' },
  { id: 'expr', label: 'Formule libre' },
  { id: 'pct', label: 'Pourcentage' },
];

/** Prédicats proposés dans l'éditeur d'exclusions. */
export const SKIP_PRESETS = [
  { id: 'none', label: 'Toujours compter', expr: '' },
  { id: 'default', label: 'Base + enchantements + gemmes', expr: 'base + ench + gems' },
  { id: 'enchantsOnly', label: 'Enchantements seulement', expr: 'ench' },
  { id: 'gemsOnly', label: 'Gemmes seulement', expr: 'gems' },
  { id: 'noWeapon', label: 'Rien depuis l\'arme',
    expr: "slot == 'weapons' ? 0 : base + ench + gems" },
  { id: 'noOffhand', label: 'Rien depuis la main secondaire',
    expr: "slot == 'offhands' ? 0 : base + ench + gems" },
];

/** Variables de boucle disponibles dans les conditions d'exclusion. */
export const SKIP_VARS = ['stat', 'slot'];

/**
 * Règles d'origine (portage fidèle de Controller.js).
 * Les expressions utilisent les variables `T`, `PCT`, `PET`, `TLT`… et les
 * variables globales `knowledge`, `pvpLevel`, `opponentPvpLevel`, `is2H`…
 */
export function legacyRules() {
  return [
    // ── 1. comment chaque emplacement alimente le total ──────────────────────
    // Règle générique : base + enchantements + gemmes.
    // Une règle ciblant une statistique précise REMPLACE cette règle générique.
    {
      id: 'sum-default',
      kind: 'sum',
      targets: ['*'],
      label: 'Somme des emplacements (base + ench + gemmes)',
      expr: 'base + ench + gems',
      enabled: true,
      builtin: true,
    },
    {
      id: 'sum-speed',
      kind: 'sum',
      targets: ['speed'],
      label: 'Vitesse : seules les gemmes de l\'arme comptent (le reste est appliqué à la vitesse d\'attaque)',
      expr: "slot == 'weapons' ? gems : base + ench + gems",
      enabled: true,
      builtin: true,
    },
    {
      id: 'sum-weapon-damage',
      kind: 'sum',
      targets: ['weapondamageboost'],
      label: 'Bonus de dégâts de l\'arme : ignoré sur l\'arme elle-même',
      expr: "slot == 'weapons' ? 0 : base + ench + gems",
      enabled: true,
      builtin: true,
    },
    {
      id: 'sum-base-damage',
      kind: 'sum',
      targets: ['damage', 'damagemin', 'damagemax'],
      label: 'Dégâts : ignorés sur l\'arme (comptés dans les dégâts de l\'arme)',
      expr: "slot == 'weapons' ? 0 : base + ench + gems",
      enabled: true,
      builtin: true,
    },
    {
      id: 'sum-block',
      kind: 'sum',
      targets: ['blockrate', 'blockeddmg', 'blockrateboost', 'blockeddmgboost'],
      label: 'Blocage : ignoré sur la main secondaire',
      expr: "slot == 'offhands' ? 0 : base + ench + gems",
      enabled: true,
      builtin: true,
    },
    {
      id: 'sum-armor',
      kind: 'sum',
      targets: ['armor', 'itemarmorboost'],
      label: 'Armure : calculée objet par objet, jamais additionnée ici',
      expr: '0',
      enabled: true,
      builtin: true,
    },
    // ── 2. arme à deux mains ─────────────────────────────────────────────────
    {
      id: 'twohanded',
      kind: 'expr',
      target: 'weapondamageboost',
      label: 'Bonus des armes à deux mains',
      expr: 'is2H ? damage2H : 0',
      enabled: true,
      builtin: true,
    },
    // ── 3. joaillerie (essence) ──────────────────────────────────────────────
    {
      id: 'essence',
      kind: 'expr',
      target: 'damage',
      label: 'Joaillerie : dégâts directs',
      expr: 'essenceDamage >= 5 ? essenceDamage : 0',
      enabled: true,
      builtin: true,
    },
    {
      id: 'essence-low',
      kind: 'expr',
      target: 'damageboost',
      label: 'Joaillerie : petite joaillerie (JcE seulement)',
      expr: 'essenceDamage < 5 and opponent != "pvp" ? essenceDamage : 0',
      enabled: true,
      builtin: true,
    },
    // ── 4. statistiques « de base » fournies par la classe ───────────────────
    {
      id: 'base-life',
      kind: 'expr',
      target: 'life',
      label: 'Points de vie de base (niveau)',
      expr: 'basehp',
      enabled: true,
      builtin: true,
    },
    {
      id: 'resist-elements',
      kind: 'expr',
      target: 'fire',
      label: 'Résistance élémentaire : feu',
      expr: 'resist',
      enabled: true,
      builtin: true,
    },
    {
      id: 'resist-elements-ice',
      kind: 'expr',
      target: 'ice',
      label: 'Résistance élémentaire : glace',
      expr: 'resist',
      enabled: true,
      builtin: true,
    },
    {
      id: 'resist-elements-lightning',
      kind: 'expr',
      target: 'lightning',
      label: 'Résistance élémentaire : foudre',
      expr: 'resist',
      enabled: true,
      builtin: true,
    },
    {
      id: 'resist-elements-poison',
      kind: 'expr',
      target: 'poison',
      label: 'Résistance élémentaire : poison',
      expr: 'resist',
      enabled: true,
      builtin: true,
    },
    {
      id: 'resist-elements-andermagic',
      kind: 'expr',
      target: 'andermagic',
      label: 'Résistance élémentaire : magie noire',
      expr: 'resist',
      enabled: true,
      builtin: true,
    },
    {
      id: 'resist-elements-boost',
      kind: 'expr',
      target: 'fireboost',
      label: 'Bonus de résistance élémentaire',
      expr: 'resistboost',
      enabled: true,
      builtin: true,
    },
    {
      id: 'resist-boost-ice',
      kind: 'expr',
      target: 'iceboost',
      label: 'Bonus de résistance : glace',
      expr: 'resistboost',
      enabled: true,
      builtin: true,
    },
    {
      id: 'resist-boost-lightning',
      kind: 'expr',
      target: 'lightningboost',
      label: 'Bonus de résistance : foudre',
      expr: 'resistboost',
      enabled: true,
      builtin: true,
    },
    {
      id: 'resist-boost-poison',
      kind: 'expr',
      target: 'poisonboost',
      label: 'Bonus de résistance : poison',
      expr: 'resistboost',
      enabled: true,
      builtin: true,
    },
    {
      id: 'resist-boost-andermagic',
      kind: 'expr',
      target: 'andermagicboost',
      label: 'Bonus de résistance : magie noire',
      expr: 'resistboost',
      enabled: true,
      builtin: true,
    },
    {
      id: 'base-damage',
      kind: 'expr',
      target: 'damagemin',
      label: 'Dégâts de base de la classe (min)',
      expr: 'basedmg + damage',
      enabled: true,
      builtin: true,
    },
    {
      id: 'base-damage-max',
      kind: 'expr',
      target: 'damagemax',
      label: 'Dégâts de base de la classe (max)',
      expr: 'basedmg + damage',
      enabled: true,
      builtin: true,
    },
    // ── 5. arme : vitesse et dégâts ──────────────────────────────────────────
    {
      id: 'speed',
      kind: 'expr',
      target: 'speed',
      mode: 'set',
      label: 'Vitesse d\'attaque',
      expr: '(B("speed","weapons") > 0 ? B("speed","weapons") : 1) * (1 + E("speed","weapons")) * (1 + T("speed"))',
      enabled: true,
      builtin: true,
    },
    {
      id: 'weapon-min',
      kind: 'expr',
      target: 'damagemin',
      mode: 'store',
      label: 'Dégâts de l\'arme (min)',
      expr: '(B("damagemin","weapons") + E("damagemin","weapons") + G("damagemin","weapons") + E("damage","weapons") + G("damage","weapons")) * (1 + E("weapondamageboost","weapons"))',
      enabled: true,
      builtin: true,
    },
    {
      id: 'weapon-min-scale',
      kind: 'expr',
      target: 'damagemin',
      label: 'Dégâts de l\'arme (min) × bonus d\'arme',
      expr: 'WEAPON_MIN * (1 + T("weapondamageboost"))',
      enabled: true,
      builtin: true,
    },
    {
      id: 'weapon-max',
      kind: 'expr',
      target: 'damagemax',
      mode: 'store',
      label: 'Dégâts de l\'arme (max)',
      expr: '(B("damagemax","weapons") + E("damagemax","weapons") + G("damagemax","weapons") + E("damage","weapons") + G("damage","weapons")) * (1 + E("weapondamageboost","weapons"))',
      enabled: true,
      builtin: true,
    },
    {
      id: 'weapon-max-scale',
      kind: 'expr',
      target: 'damagemax',
      label: 'Dégâts de l\'arme (max) × bonus d\'arme',
      expr: 'WEAPON_MAX * (1 + T("weapondamageboost"))',
      enabled: true,
      builtin: true,
    },
    // ── 6. bouclier ──────────────────────────────────────────────────────────
    {
      id: 'blockrate',
      kind: 'expr',
      target: 'blockrate',
      label: 'Blocage apporté par le bouclier',
      expr: '(B("blockrate","offhands") + E("blockrate","offhands")) * (1 + E("blockrateboost","offhands"))',
      enabled: true,
      builtin: true,
    },
    {
      id: 'blockeddmg',
      kind: 'expr',
      target: 'blockeddmg',
      label: 'Réduction de blocage du bouclier',
      expr: '(B("blockeddmg","offhands") + E("blockeddmg","offhands")) * (1 + E("blockeddmgboost","offhands"))',
      enabled: true,
      builtin: true,
    },
    // ── 7. armure objet par objet ────────────────────────────────────────────
    {
      id: 'armor',
      kind: 'expr',
      target: 'armor',
      label: 'Armure (bonus par objet)',
      expr: 'SUM_SLOTS("armor")',
      enabled: true,
      builtin: true,
    },
    // ── 8. bonus de niveau, de JcJ, multiplicateur de dégâts ─────────────────
    {
      id: 'life-scaling',
      exclusive: true,
      kind: 'expr',
      target: 'life',
      label: 'Points de vie × (bonus de vie + connaissance)',
      expr: 'T("life") * (T("lifeboost") + knowledge / 100)',
      enabled: true,
      builtin: true,
    },
    {
      id: 'armor-scaling',
      exclusive: true,
      kind: 'expr',
      target: 'armor',
      label: 'Armure × (bonus + écart de niveau JcJ)',
      expr: 'T("armor") * (T("armorboost") + pvpBonus)',
      enabled: true,
      builtin: true,
    },
    {
      id: 'fire-scaling',
      exclusive: true,
      kind: 'expr',
      target: 'fire',
      label: 'Feu × (bonus + écart JcJ)',
      expr: 'T("fire") * (T("fireboost") + pvpBonus)',
      enabled: true,
      builtin: true,
    },
    {
      id: 'ice-scaling',
      exclusive: true,
      kind: 'expr',
      target: 'ice',
      label: 'Glace × (bonus + écart JcJ)',
      expr: 'T("ice") * (T("iceboost") + pvpBonus)',
      enabled: true,
      builtin: true,
    },
    {
      id: 'lightning-scaling',
      exclusive: true,
      kind: 'expr',
      target: 'lightning',
      label: 'Foudre × (bonus + écart JcJ)',
      expr: 'T("lightning") * (T("lightningboost") + pvpBonus)',
      enabled: true,
      builtin: true,
    },
    {
      id: 'poison-scaling',
      exclusive: true,
      kind: 'expr',
      target: 'poison',
      label: 'Poison × (bonus + écart JcJ)',
      expr: 'T("poison") * (T("poisonboost") + pvpBonus)',
      enabled: true,
      builtin: true,
    },
    {
      id: 'andermagic-scaling',
      exclusive: true,
      kind: 'expr',
      target: 'andermagic',
      label: 'Magie noire × (bonus + écart JcJ)',
      expr: 'T("andermagic") * (T("andermagicboost") + pvpBonus)',
      enabled: true,
      builtin: true,
    },
    {
      id: 'generic-boost',
      kind: 'expr',
      target: '*',
      label: 'Bonus générique (toute stat « …boost »)',
      expr: 'T(stat) * T(stat + "boost")',
      enabled: true,
      builtin: true,
      when: 'has(T(stat + "boost")) and not matches(stat, "boost$|resist|damage")',
    },
    {
      id: 'regen',
      kind: 'expr',
      target: 'regen',
      label: 'Régénération (1 % des points de vie/s)',
      expr: 'T("life") / 100',
      enabled: true,
      builtin: true,
    },
    {
      id: 'damage-multiplier',
      kind: 'expr',
      target: 'damagemin',
      mode: 'set',
      label: 'Multiplicateur de dégâts : min',
      expr: 'floor(T("damagemin") * (1 + T("damageminboost") + damageMultiplier))',
      enabled: true,
      builtin: true,
    },
    {
      id: 'damage-multiplier-max',
      kind: 'expr',
      target: 'damagemax',
      mode: 'set',
      label: 'Multiplicateur de dégâts : max',
      expr: 'floor(T("damagemax") * (1 + T("damagemaxboost") + damageMultiplier))',
      enabled: true,
      builtin: true,
    },
    // ── 9. pourcentages ──────────────────────────────────────────────────────
    { id: 'pct-critrate', kind: 'pct', target: 'critrate', source: 'critrate', denom: 'accr', cap: 0.8, label: 'Taux de critique', enabled: true, builtin: true },
    { id: 'pct-armor', kind: 'pct', target: 'armor', source: 'armor', denom: 'accr', cap: 0.8, label: 'Résistance physique', enabled: true, builtin: true },
    { id: 'pct-fire', kind: 'pct', target: 'fire', source: 'fire', denom: 'accr', cap: 0.8, label: 'Résistance au feu', enabled: true, builtin: true },
    { id: 'pct-ice', kind: 'pct', target: 'ice', source: 'ice', denom: 'accr', cap: 0.8, label: 'Résistance à la glace', enabled: true, builtin: true },
    { id: 'pct-lightning', kind: 'pct', target: 'lightning', source: 'lightning', denom: 'accr', cap: 0.8, label: 'Résistance à la foudre', enabled: true, builtin: true },
    { id: 'pct-poison', kind: 'pct', target: 'poison', source: 'poison', denom: 'accr', cap: 0.8, label: 'Résistance au poison', enabled: true, builtin: true },
    { id: 'pct-andermagic', kind: 'pct', target: 'andermagic', source: 'andermagic', denom: 'accr', cap: 0.8, label: 'Résistance à la magie noire', enabled: true, builtin: true },
    { id: 'pct-blockrate', kind: 'pct', target: 'blockrate', source: 'blockrate', denom: 'blockrateConst', cap: 0.8, label: 'Taux de blocage', enabled: true, builtin: true },
    { id: 'pct-blockeddmg', kind: 'pct', target: 'blockeddmg', source: 'blockeddmg', denom: 'blockeddmgConst', cap: 0.8, label: 'Réduction de blocage', enabled: true, builtin: true },
    // ── 10. DPS et compétences ───────────────────────────────────────────────
    {
      id: 'dps',
      kind: 'expr',
      target: 'dps',
      label: 'DPS',
      expr: '(1 - PCT("critrate") + PCT("critrate") * (2 + T("critboost"))) * MEAN * T("speed")',
      enabled: true,
      builtin: true,
      output: true,
    },
    {
      id: 'skills',
      kind: 'skills',
      label: 'Dégâts des compétences',
      expr: 'normal',
      critExpr: '(2 + T("critboost"))',
      enabled: true,
      builtin: true,
    },
  ];
}

/** Variables globales documentées, affichées dans l'éditeur. */
export const GLOBAL_VARS = [
  { name: 'knowledge', doc: 'Niveau de connaissance' },
  { name: 'level', doc: 'Niveau du personnage' },
  { name: 'pvpLevel', doc: 'Niveau JcJ du personnage' },
  { name: 'opponentPvpLevel', doc: 'Niveau JcJ adverse' },
  { name: 'opponentLevel', doc: 'Niveau adverse' },
  { name: 'opponent', doc: '"pve" ou "pvp"' },
  { name: 'pvpBonus', doc: '(niveau JcJ − niveau adverse) / 100, 0 en JcE' },
  { name: 'damageMultiplier', doc: 'damage<mode> + damageboost + connaissance + écart JcJ' },
  { name: 'is2H', doc: 'vrai si une arme à deux mains est équipée' },
  { name: 'meanDamage', doc: '(dégâts min + dégâts max) / 2' },
  { name: 'MEAN', doc: 'Alias de meanDamage' },
  { name: 'acr', doc: 'Constante d\'accuracy de l\'adversaire' },
  { name: 'accr', doc: 'Alias de acr' },
  { name: 'blockrateConst', doc: 'Constante de blocage de l\'adversaire' },
  { name: 'basehp', doc: 'Points de vie de base de la classe' },
  { name: 'basedmg', doc: 'Dégâts de base de la classe' },
  { name: 'essenceDamage', doc: 'Dégâts apportés par la joaillerie' },
  { name: 'stat', doc: '(règles génériques) statistique en cours' },
  { name: 'slot', doc: '(conditions d\'exclusion) emplacement en cours' },
];

/** Champs demandés par le formulaire de règle, selon son type. */
export const RULE_FIELDS = {
  sum: ['targets', 'label', 'expr'],
  expr: ['target', 'label', 'expr'],
  pct: ['target', 'label', 'source', 'denom', 'cap'],
  skip: ['label', 'expr'],
  skills: ['label', 'expr', 'critExpr'],
};

/** Normalise une règle importée (tolère les champs manquants). */
export function normalizeRule(rule, index = 0) {
  const kind = RULE_KINDS.some((k) => k.id === rule.kind) || ['skip', 'skills'].includes(rule.kind)
    ? rule.kind
    : 'expr';
  return {
    id: rule.id || `rule-${Date.now()}-${index}`,
    kind,
    target: rule.target || '',
    label: rule.label || '',
    source: rule.source || rule.target || '',
    denom: rule.denom || 'accr',
    cap: rule.cap === undefined ? 0.8 : Number(rule.cap),
    expr: rule.expr || '',
    critExpr: rule.critExpr || '',
    when: rule.when || '',
    mode: ['set', 'store'].includes(rule.mode) ? rule.mode : 'add',
    exclusive: !!rule.exclusive,
    targets: Array.isArray(rule.targets) ? rule.targets : (rule.targets ? [rule.targets] : []),
    enabled: rule.enabled !== false,
    builtin: !!rule.builtin,
    output: !!rule.output,
  };
}

export const RULES_STORAGE_KEY = 'dso.formulas.v1';
export const STATS_STORAGE_KEY = 'dso.stats.v1';
