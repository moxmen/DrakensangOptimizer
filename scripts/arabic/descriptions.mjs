/**
 * Traduction arabe des descriptions de compétences / talents.
 * Les descriptions anglaises suivent des patrons réguliers : on les
 * reconnaît pour produire un arabe naturel.
 */
import { WORDS, WORDS2, WORDS3 } from './dict.mjs';

const DICT = { ...WORDS, ...WORDS2, ...WORDS3 };

const NAMES = {
  physical: 'جسدي', fire: 'ناري', ice: 'جليدي', lightning: 'كهربائي',
  poison: 'سام', andermagic: 'سحري', magic: 'سحري',
};

const SKILLS = {
  smash: 'تحطيم', fireball: 'كرة النار', 'magic missile': 'القذيفة السحرية',
  meteor: 'النيزك', destruction: 'الدمار', 'chain of lightning': 'سلسلة البرق',
  'thunder strike': 'ضربة الرعد', 'lightning strike': 'ضربة البرق',
  'ice missile': 'قذيفة الجليد', 'frost nova': 'انفجار الصقيع',
  'angry strike': 'الضربة الغاضبة', 'rageful swing': 'الضربة المحمومة',
  'bloody wild swing': 'الضربة البرية الدامية', 'mighty wild swing': 'الضربة البرية العظيمة',
  'rage jump': 'قفزة الغضب', 'ground breaker': 'شاقّ الأرض', 'iron brow': 'الجبهة الحديدية',
  'stun charge': 'اندفاعة التصعيق', 'dragons fury': 'غضب التنين',
  'hunting arrow': 'سهم الصيد', 'precision shot': 'الطلقة الدقيقة',
  'death swing': 'الضربة القاتلة', 'hunting trap': 'فخ الصيد',
  'scatter shot': 'الطلقة المتناثرة', 'deadly blow': 'الضربة المميتة',
  falcon: 'الصقر', 'blade dance': 'رقصة النصال', 'thicket thorns': 'أشواك الغابة',
  'forest revenge': 'انتقام الغابة', 'simple shot': 'الطلقة البسيطة',
  'combat turret': 'البرج القتالي', 'cover fire': 'نيران التغطية', grenade: 'القنبلة اليدوية',
  'chain of lightning and thunder strike': 'سلسلة البرق وضربة الرعد',
  'blessing of elements': 'بركة العناصر', 'warpath': 'درب الحرب', rocket: 'الصاروخ',
  'flame thrower': 'قاذف اللهب', 'scrap bomb': 'قنبلة الخردة', overcharge: 'الشحن الزائد',
  'machine shield': 'درع الآلة', 'death wail': 'عويل الموت', supernova: 'المستعر',
  singularity: 'التفرد', spirit: 'الروح',
  'bird of prey': 'طائر الفريسة', falcon: 'الصقر', 'quick shot': 'الطلقة السريعة',
  'heavy shot': 'الطلقة الثقيلة', bomb: 'القنبلة', 'c14 micro-rocket': 'صاروخ C14 الصغير',
  'chain lightning': 'البرق المتسلسل', 'ice/magic missiles': 'قذائف الجليد والسحر',
  'ice magic missiles': 'قذائف الجليد والسحر', 'magic missiles': 'القذائف السحرية',
  turrets: 'الأبراج', 'bomb and c14 micro-rocket': 'القنبلة وصاروخ C14 الصغير',
};

const WEAPONS = {
  longbows: 'الأقواس الطويلة', shortbows: 'الأقواس القصيرة', bows: 'الأقواس',
  'two-handed weapons': 'الأسلحة ذات اليدين', "shield's block rate": 'معدل صد الدرع',
  'shields': 'الدروع', 'staves': 'العصي', 'wands': 'العصي السحرية',
  swords: 'السيوف', axes: 'الفؤوس', guns: 'البنادق',
  'two-handed weapons': 'الأسلحة ذات اليدين',
  'two handed weapons': 'الأسلحة ذات اليدين',
  'magic missile': 'القذيفة السحرية',
  "shield's block rate": 'معدل صد الدرع',
  shield: 'الدرع',
};

/** cherche une clé de dictionnaire en normalisant apostrophes / tirets */
const weaponAr = (name) => {
  const key = name.toLowerCase().replace(/[’]/g, "'").trim();
  return (
    WEAPONS[key] ||
    WEAPONS[key.replace(/-/g, ' ')] ||
    WEAPONS[key.replace(/['’]s\b/g, '')] ||
    null
  );
};

const pct = (v) => `${v}%`;

/** Traduit un nom de compétence anglais utilisé dans une description. */
function skillAr(name) {
  const key = name
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/['’]s$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return SKILLS[key] || name;
}

/**
 * @param {string} eng description anglaise
 * @returns {string} description arabe
 */
export function descriptionAr(eng) {
  if (!eng) return '';
  const text = eng.trim();

  let m;

  // 200% of weapon damage as physical damage.
  m = text.match(/^(\d+)% of weapon damage as (physical|fire|ice|lightning|poison|andermagic|magic) damage\.?$/i);
  if (m) return `${pct(m[1])} من ضرر السلاح كضرر ${NAMES[m[2].toLowerCase()]}.`;

  // 75% of basic damage as fire damage, during 4 secs.
  m = text.match(/^(\d+)% of basic damage as (physical|fire|ice|lightning|poison|andermagic|magic) damage(?:,\s*during\s*(\d+)\s*secs)?\.?$/i);
  if (m) {
    const base = `${pct(m[1])} من الضرر الأساسي كضرر ${NAMES[m[2].toLowerCase()]}`;
    return m[3] ? `${base}، خلال ${m[3]} ثوان.` : `${base}.`;
  }

  // During 5 secs, bleeding damage inflicts 40% of basic damage as physical damage.
  m = text.match(/^During (\d+) secs?,? (.+?) inflicts? (\d+)% of basic damage as (\w+) damage\.?$/i);
  if (m) return `خلال ${m[1]} ثوان، يُحدث ${translateEffect(m[2])} ${pct(m[3])} من الضرر الأساسي كضرر ${NAMES[m[4].toLowerCase()]}.`;

  // Two-handed weapons inflicts 40% more damage. (avant la règle générique)
  m = text.match(/^(.+?) inflicts? (\d+)% more damage\.?$/i);
  if (m && weaponAr(m[1])) return `${weaponAr(m[1])} تُلحق ${pct(m[2])} ضررًا إضافيًا.`;

  // X inflicts additional 20% more damage.
  m = text.match(/^(.+?) inflicts? additional (\d+)% more damage\.?$/i);
  if (m) return `${skillAr(m[1])} يُلحق ${pct(m[2])} ضررًا إضافيًا.`;

  // X inflicts each second 33% of basic damage as fire damage during 3 secs.
  m = text.match(/^(.+?) inflicts? each second (\d+)% of basic damage as (\w+) damage during (\d+) secs\.?$/i);
  if (m) return `${skillAr(m[1])} يُلحق كل ثانية ${pct(m[2])} من الضرر الأساسي كضرر ${NAMES[m[3].toLowerCase()]} لمدة ${m[4]} ثوان.`;

  // X inflicts 40% more damage.
  m = text.match(/^(.+?) inflicts? (\d+)% more damage\.?$/i);
  if (m) return `${skillAr(m[1])} يُلحق ${pct(m[2])} ضررًا إضافيًا.`;

  // X deal 25% additional damage.
  m = text.match(/^(.+?) deals? (\d+)% additional damage\.?$/i);
  if (m) return `${weaponAr(m[1]) || skillAr(m[1])} تُحدث ${pct(m[2])} ضررًا إضافيًا.`;

  // X's block rate increases by 40%.
  m = text.match(/^(.+?) (?:block rate )?increases by (\d+)%\.?$/i);
  if (m) return `${weaponAr(m[1]) || skillAr(m[1])} تزداد بنسبة ${pct(m[2])}.`;

  // X now electrostatically charge ennemies, inflicting 33% more damage.
  m = text.match(/^(.+?) now (.+?), inflicting (\d+)% more damage\.?$/i);
  if (m) return `${skillAr(m[1])} أصبح ${translateEffect(m[2])}، ويُحدث ${pct(m[3])} ضررًا إضافيًا.`;

  // Meteor inflicts 50% fire damage, then again during 3 secs (total=200%).
  m = text.match(/^(.+?) inflicts? (\d+)% (\w+) damage, then again during (\d+) secs \(total=(\d+)%\)\.?$/i);
  if (m) return `${skillAr(m[1])} يُلحق ${pct(m[2])} ضرر ${NAMES[m[3].toLowerCase()]}، ثم مرة أخرى خلال ${m[4]} ثوان (الإجمالي=${pct(m[5])}).`;

  // 80% of basic damage as ice damage.
  m = text.match(/^(\d+)% of basic damage as (\w+) damage\.?$/i);
  if (m) return `${pct(m[1])} من الضرر الأساسي كضرر ${NAMES[m[2].toLowerCase()]}.`;

  // Increases Bomb damage by 50%.
  m = text.match(/^Increases? (?:the )?(.+?) damage by (\d+)%\.?$/i);
  if (m) return `يزيد ضرر ${skillAr(m[1])} بنسبة ${pct(m[2])}.`;

  // Increases your armor value by 10%.
  m = text.match(/^Increases? your (.+?) by (\d+)%\.?$/i);
  if (m) return `يزيد ${statAr(m[1])} بنسبة ${pct(m[2])}.`;

  // Increases the damage caused by your turrets by 20%.
  m = text.match(/^Increases? the damage caused by your (.+?) by (\d+)%\.?$/i);
  if (m) return `يزيد الضرر الذي تُسببه ${pluralAr(m[1])} بنسبة ${pct(m[2])}.`;

  // Increases the damage caused by Quick Shot and Heavy Shot by 20%.
  m = text.match(/^Increases? the damage caused by (.+?) by (\d+)%\.?$/i);
  if (m) return `يزيد الضرر الذي تُسببه ${listAr(m[1])} بنسبة ${pct(m[2])}.`;

  // The damage inflicted upon other players is increased by 15%.
  m = text.match(/^The damage inflicted upon other players is increased by (\d+)%\.?$/i);
  if (m) return `يزيد الضرر الواقع على اللاعبين الآخرين بنسبة ${pct(m[1])}.`;

  // The damage inflicted by other players is reduced by 15%.
  m = text.match(/^The damage inflicted by other players is reduced by (\d+)%\.?$/i);
  if (m) return `ينخفض الضرر الواقع من اللاعبين الآخرين بنسبة ${pct(m[1])}.`;

  // The damage inflicted upon other players by your X and Y skills is increased by 33%.
  m = text.match(/^The damage inflicted upon other players by your (.+?)(?: skills)?,? is increased by (\d+)%\.?$/i);
  if (m) return `يزيد الضرر الواقع على اللاعبين الآخرين بمهارات ${listAr(m[1])} بنسبة ${pct(m[2])}.`;

  // Attack speed is increased by 15% inside PvP arenas.
  m = text.match(/^(Attack|Movement) speed is increased by (\d+)% inside PvP arenas\.?$/i);
  if (m) return `تزداد ${m[1].toLowerCase() === 'attack' ? 'سرعة الهجوم' : 'سرعة التنقل'} بنسبة ${pct(m[2])} داخل حلبات PvP.`;

  // fallback: word-level translation with punctuation preserved
  return fallback(text);
}

const STATS = {
  'armor value': 'قيمة الدرع', armor: 'الدرع', 'life points': 'نقاط الحياة',
  life: 'الحياة', 'attack speed': 'سرعة الهجوم', 'movement speed': 'سرعة التنقل',
  'block rate': 'معدل الصد', 'critical hit rate': 'معدل الضربة الحاسمة',
  'critical damage': 'ضرر الضربة الحاسمة', 'travel speed': 'سرعة التنقل',
  'movement': 'سرعة التنقل', 'mana': 'الطاقة السحرية',
};
const statAr = (s) => STATS[s.toLowerCase()] || s;

const PLURALS = {
  turrets: 'الأبراج', bombs: 'القنابل', traps: 'الفخاخ', pets: 'الرفاق',
};
const pluralAr = (s) => PLURALS[s.toLowerCase()] || s;

/** «Quick Shot and Heavy Shot» → «الطلقة السريعة والطلقة الثقيلة» */
const listAr = (s) =>
  s
    .split(/\s*(?:,|\band\b)\s*/i)
    .filter(Boolean)
    .map((part) => skillAr(part.replace(/\bskills?\b/gi, '').trim()))
    .join(' و');

function translateEffect(effect) {
  const map = {
    'bleeding damage': 'ضرر النزيف',
    'electrostatically charge ennemies': 'يشحن الأعداء كهربائيًا',
  };
  return map[effect.toLowerCase()] || effect;
}

/** Traduction approximative mot à mot (dernier recours). */
function fallback(text) {
  return text
    .split(/(\s+)/)
    .map((tok) => {
      if (!tok.trim()) return tok;
      const clean = tok.replace(/[.,%()]/g, '');
      const w = DICT[clean.toLowerCase()];
      return w ? tok.replace(clean, w) : tok;
    })
    .join('');
}
