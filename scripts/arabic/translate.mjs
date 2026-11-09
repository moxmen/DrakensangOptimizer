/**
 * Moteur de traduction arabe des noms d'objets.
 * Arabic name translation engine (phrases → tokens → gender agreement → idafa).
 *
 * Stratégie :
 *   1. table de correspondance directe (noms de compétences surtout) ;
 *   2. découpage « X of Y » → construction idafa (سيف الدمار) ;
 *   3. sinon : nom-tête en premier, puis les modificateurs inversés, avec
 *      accord en genre (féminin) entre le nom-tête et l'adjectif adjacent.
 */
import { WORDS, WORDS2, WORDS3, PHRASES } from './dict.mjs';

const DICT = { ...WORDS, ...WORDS2, ...WORDS3 };

/** Mots vides à ignorer */
const STOP = new Set(['of', 'the', 'a', 'an', 'to', 'and']);

/** Adjectifs : forme féminine */
const FEM_ADJ = {
  angry: 'غاضبة', furious: 'محمومة', rageful: 'محمومة', bloody: 'دامية', brute: 'وحشية',
  forgotten: 'منسية', fiery: 'نارية', powerful: 'قوية', mighty: 'عظيمة', great: 'عظيمة',
  small: 'صغيرة', minor: 'صغيرة', lesser: 'دونية', larger: 'كبرى', greater: 'كبرى',
  ordinary: 'عادية', flawed: 'مشوبة', splintered: 'مشظاة', polished: 'مصقولة',
  radiant: 'مشعة', sacred: 'مقدسة', flawless: 'نقية', simple: 'بسيطة', legendary: 'أسطورية',
  terrifying: 'مرعبة', eternal: 'أبدية', ancient: 'قديمة', blessed: 'مباركة',
  cursed: 'ملعونة', royal: 'ملكية', noble: 'نبيلة', heavy: 'ثقيلة', light: 'خفيفة',
  sharp: 'حادة', keen: 'حادة', swift: 'سريعة', quick: 'سريعة', diligent: 'مجتهدة',
  resistant: 'مقاومة', punctual: 'دقيقة', dedicated: 'مخلصة', inner: 'داخلية',
  primal: 'بدائية', wild: 'برية', untamed: 'جامحة', mechanical: 'ميكانيكية',
  mechanized: 'مميكنة', automated: 'آلية', steam: 'بخارية', hydraulic: 'هيدروليكية',
  pyrotechnic: 'نارية', optical: 'بصرية', thermal: 'حرارية', elemental: 'عنصرية',
  dimensional: 'بُعدية', prismatic: 'منشورية', gothic: 'قوطية', biting: 'قاطعة',
  sparkling: 'متلألئة', shining: 'لامعة', glowing: 'متوهجة', frozen: 'متجمدة',
  boiling: 'مغلية', boiled: 'مسلوقة', dark: 'مظلمة', black: 'سوداء', crimson: 'قرمزية',
  scarlet: 'قرمزية', red: 'حمراء', blue: 'زرقاء', green: 'خضراء', white: 'بيضاء',
  grey: 'رمادية', violet: 'بنفسجية', purple: 'أرجوانية', golden: 'ذهبية',
  northern: 'شمالية', nimble: 'رشيقة', starry: 'نجمية', steady: 'ثابتة',
  steadfast: 'راسخة', tactical: 'تكتيكية', specialized: 'متخصصة', veteran: 'محنّكة',
  physical: 'جسدية', round: 'دائرية', merciful: 'رحيمة', scatter: 'متناثرة',
  precise: 'دقيقة', mythic: 'أسطورية', epic: 'ملحمية', high: 'عالية', potent: 'فعّالة',
  inviolable: 'منيعة', heroic: 'بطولية', arcane: 'سحرية', mystic: 'غامضة',
  wonderful: 'رائعة', glorious: 'مجيدة', terrible: 'رهيبة', dreadful: 'مريعة',
  silent: 'صامتة', quiet: 'هادئة', blazing: 'متوهجة', burning: 'محرقة',
  frosty: 'مثلجة', icy: 'جليدية', stormy: 'عاصفة', thundering: 'مدوية',
  venomous: 'سامة', tainted: 'ملوثة', chained: 'مقيّدة', bound: 'مربوطة',
  broken: 'مكسورة', shattered: 'محطمة', ruined: 'مدمرة', awakened: 'مستيقظة',
  dormant: 'خامدة', long: 'طويل', short: 'قصير', young: 'صغيرة', old: 'قديمة',
  first: 'أولى', sunhunting: 'صيد الشمس', deep: 'عميقة', end: 'أخيرة',
  malevolent: 'خبيثة', sinister: 'شريرة', blooming: 'مزهرة', wandering: 'هائمة',
  robust: 'متينة', sturdy: 'متينة', smooth: 'ناعمة', refined: 'مكرّرة',
  rough: 'خشنة', tiny: 'ضئيلة', 'bird of prey': 'طائر الفريسة', giant: 'عملاقة', colossal: 'هائلة', wooden: 'خشبية',
  silk: 'حريرية', bone: 'عظمية', granite: 'غرانيتية', glass: 'زجاجية', iron: 'حديدية',
  steel: 'فولاذية', gold: 'ذهبية', silver: 'فضية', bronze: 'برونزية', copper: 'نحاسية',
  platinum: 'بلاتينية', leather: 'جلدية', chitin: 'كيتينية', shadowy: 'ظلالية',
};

const FEM_SUFFIX = /(ة|اء|ى|اة)$/;
const INHERENT_FEM = new Set([
  'أرض', 'شمس', 'نار', 'روح', 'عين', 'يد', 'قوس', 'عصا', 'دار', 'سماء', 'ريح',
  'قلنسوة', 'حياة', 'موت', 'قبضة', 'نجمة', 'جمرة', 'كتفية', 'قفاز', 'حذاء',
]);

/** Le genre se lit sur le DERNIER mot du groupe nominal. */
const isFeminine = (ar) => {
  if (!ar) return false;
  const last = ar.trim().split(' ').pop();
  return FEM_SUFFIX.test(last) || INHERENT_FEM.has(last);
};

/** Variantes féminines des expressions figées. */
const FEM_PHRASES = {
  'عالي الطاقة': 'عالية الطاقة',
  'النجم الشمالي': 'النجمة الشمالية',
  'عصا سحرية': 'عصا سحرية',
  'رمح نصلاني': 'رمح نصلاني',
  'قوس طويل': 'قوس طويل',
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const compact = (s) => s.toLowerCase().replace(/[^a-z\u00C0-\u017F]/g, '');

export const missing = new Set();

/** Traduit un seul mot ; renvoie undefined si inconnu. */
function word(raw) {
  const lower = raw.toLowerCase();
  let ar = DICT[lower];
  if (ar === undefined) ar = DICT[compact(raw)];
  if (ar === undefined) return undefined;
  return ar;
}

const phraseKeys = Object.keys(PHRASES).sort((a, b) => b.length - a.length);

/** Découpe une chaîne en unités (phrases protégées / mots). */
function tokenize(text) {
  let work = ` ${text} `;
  const marks = [];
  for (const k of phraseKeys) {
    const re = new RegExp(`(?<![A-Za-z])${escapeRe(k)}(?![A-Za-z])`, 'gi');
    work = work.replace(re, () => {
      marks.push(PHRASES[k]);
      return ` \u0001${marks.length - 1}\u0001 `;
    });
  }
  const units = [];
  for (const rawToken of work.split(/[\s,;]+/)) {
    const tok = rawToken.replace(/^[.'’-]+|[.'’-]+$/g, '');
    if (!tok) continue;
    const mark = tok.match(/^\u0001(\d+)\u0001$/);
    if (mark) {
      units.push({ ar: marks[+mark[1]], atomic: true, key: null });
      continue;
    }
    if (/^[IVX]{1,4}$/.test(tok)) {
      units.push({ ar: tok, atomic: true, key: null });
      continue;
    }
    const poss = /['’]s$/i.test(tok);
    const base = poss ? tok.replace(/['’]s$/i, '') : tok;
    const lower = base.toLowerCase();
    if (STOP.has(lower)) continue;
    const ar = word(base);
    if (ar === '') continue;
    if (ar === undefined) {
      missing.add(lower);
      units.push({ ar: base, atomic: true, key: lower, latin: true, poss });
      continue;
    }
    units.push({ ar, atomic: false, key: lower, poss, fem: FEM_ADJ[lower] });
  }
  return units;
}

/** Nom-tête en premier, modificateurs ensuite (inversés), avec accord. */
function renderPhrase(units) {
  if (!units.length) return '';
  const head = units[units.length - 1];
  const modifiers = units.slice(0, -1);
  const headAr = head.ar;

  const renderedMods = modifiers.map((u) => {
    if (u.latin) return u.ar;
    if (u.atomic) {
      return isFeminine(headAr) ? FEM_PHRASES[u.ar] || u.ar : u.ar;
    }
    if (u.fem && isFeminine(headAr)) return u.fem;
    return u.ar;
  });
  renderedMods.reverse();
  return [headAr, ...renderedMods].join(' ');
}

const withAl = (ar) => {
  if (!ar) return ar;
  if (ar.includes(' ') || ar.startsWith('ال')) return ar;
  return `ال${ar}`;
};

/** Ajoute l'article défini à tous les mots d'un groupe (aucun n'en a déjà). */
const definiteGroup = (phrase) => {
  const words = phrase.split(' ');
  if (words.some((w) => w.startsWith('ال'))) return phrase;
  return words
    .map((w) => (/^[A-Za-z]/.test(w) ? w : `ال${w}`))
    .join(' ');
};

/**
 * Traduit un nom anglais en arabe.
 * @param {string} eng
 * @returns {string}
 */
export function translateName(eng) {
  if (!eng || typeof eng !== 'string') return eng || '';
  const original = eng.trim();

  // 0. correspondance directe mot-clé (skills, talents)
  const direct = DICT[compact(original)];
  if (direct) return direct;

  // 1. note finale entre parenthèses « (new) »
  let core = original;
  let suffix = '';
  const paren = core.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (paren) {
    core = paren[1];
    suffix = `(${translateName(paren[2])})`;
  }

  // 2. construction idafa pour « X of Y »
  const ofMatch = core.match(/^(.*?)\s+of\s+(.*)$/i);
  if (ofMatch) {
    const left = renderPhrase(tokenize(ofMatch[1]));
    const rightUnits = tokenize(ofMatch[2]);
    const right = renderPhrase(rightUnits);
    const rightFull = rightUnits.length === 1 ? withAl(right) : definiteGroup(right);
    const out = [left, rightFull].filter(Boolean).join(' ').trim();
    return (out || original) + (suffix ? ` ${suffix}` : '');
  }

  // 3. phrase simple
  const out = renderPhrase(tokenize(core));
  return (out || original) + (suffix ? ` ${suffix}` : '');
}
