/**
 * data/labels.js
 * Libellés (multilingues) et aide au formatage des statistiques.
 * Les traductions proviennent de Langs.json (sysmess) ; ce module ne sert
 * qu'à décrire la nature d'une statistique (%, entier, décimal, etc.).
 */
export const STAT_LABELS = {
  damage: { kind: 'flat', hint: { eng: '', fra: '', deu: '', esp: '', ara: '' } },
  damagepve: { kind: 'pct', hint: { eng: '%', fra: '%', deu: '%', esp: '%', ara: '%' } },
  damagepvp: { kind: 'pct', hint: { eng: '%', fra: '%', deu: '%', esp: '%', ara: '%' } },
  damageboost: { kind: 'pct', hint: { eng: '%', fra: '%', deu: '%', esp: '%', ara: '%' } },
  damagemin: { kind: 'flat' },
  damagemax: { kind: 'flat' },
  damageminboost: { kind: 'pct' },
  damagemaxboost: { kind: 'pct' },
  weapondamageboost: { kind: 'pct' },
  damage2H: { kind: 'pct' },
  critrate: { kind: 'flat' },
  critrateboost: { kind: 'pct' },
  critboost: { kind: 'pct' },
  speed: { kind: 'pct' },
  movspeed: { kind: 'pct' },
  armor: { kind: 'flat' },
  armorboost: { kind: 'pct' },
  itemarmorboost: { kind: 'pct' },
  life: { kind: 'flat' },
  lifeboost: { kind: 'pct' },
  regen: { kind: 'flat' },
  blockrate: { kind: 'flat' },
  blockrateboost: { kind: 'pct' },
  blockeddmg: { kind: 'flat' },
  blockeddmgboost: { kind: 'pct' },
  resist: { kind: 'flat' },
  resistboost: { kind: 'pct' },
  fire: { kind: 'flat' },
  ice: { kind: 'flat' },
  lightning: { kind: 'flat' },
  poison: { kind: 'flat' },
  andermagic: { kind: 'flat' },
  fireboost: { kind: 'pct' },
  iceboost: { kind: 'pct' },
  lightningboost: { kind: 'pct' },
  poisonboost: { kind: 'pct' },
  andermagicboost: { kind: 'pct' },
  damageminbase: { kind: 'flat' },
  damagemaxbase: { kind: 'flat' },
  speedbase: { kind: 'speed' },
  armorbase: { kind: 'flat' },
  blockratebase: { kind: 'flat' },
  blockeddmgbase: { kind: 'flat' },
  critratebase: { kind: 'flat' },
};

const LOCALES = { eng: 'en-US', fra: 'fr-FR', deu: 'de-DE', esp: 'es-ES', ara: 'ar-DZ' };

export const localeFor = (lang) => LOCALES[lang] || 'en-US';

export function formatNumber(value, lang, decimals = 0) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPercent(value, lang, decimals = 1) {
  return `${formatNumber((Number(value) || 0) * 100, lang, decimals)}%`;
}

/** Formate une statistique d'objet selon sa nature (inchangé vs historique). */
export function formatStatValue(key, value, lang) {
  const kind = STAT_LABELS[key]?.kind || 'flat';
  const n = Number(value) || 0;
  switch (kind) {
    case 'pct':
      return formatPercent(n, lang, Math.abs(n) < 0.1 ? 1 : 0);
    case 'speed':
      return formatNumber(n, lang, 3);
    case 'flat':
    default:
      return formatNumber(n, lang, Number.isInteger(n) ? 0 : 1);
  }
}
