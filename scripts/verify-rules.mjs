/**
 * verify-rules.mjs
 * -----------------------------------------------------------------------------
 * Vérifie que le moteur « à règles » (formules éditables, src/engine/rulesEngine.js)
 * produit EXACTEMENT les mêmes valeurs que le moteur codé en dur
 * (src/engine/stats.js) pour 30 builds aléatoires.
 *
 *   node scripts/verify-rules.mjs
 *
 * C'est le garde-fou de l'éditeur de formules : tant que ce test passe,
 * l'utilisateur peut modifier n'importe quelle formule sans casser la référence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { computeBuildWithRules } from '../src/engine/rulesEngine.js';
import { computeBuild } from '../src/engine/stats.js';
import { buildCatalog } from '../src/data/catalog.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/items.json'), 'utf8'));
const names = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/names.json'), 'utf8'));
const catalog = buildCatalog(items, names);

let seed = 7;
const rnd = () => { seed = (seed*1103515245+12345)%2147483648; return seed/2147483648; };
const pick = a => a[Math.floor(rnd()*a.length)];

const ARMOR_SLOTS = ['headarmors','shoulders','torsos','gloves','boots','mantles','waists'];
const OTHER = ['amulets','weapondecorations','ring1','ring2'];
const jobs=['WAR','SW','RNG','DWF'];
const E_POOL = ['damage','damageboost','critrate','critboost','speed','life','armor','resist','fire',
  'blockrate','weapondamageboost','damageminboost','damagemaxboost','itemarmorboost','lifeboost','critrateboost'];

function makeEquip(slot, job) {
  const cat = (slot==='ring1'||slot==='ring2') ? 'rings' : slot;
  const pool = catalog[cat].filter(e=>!e.jobs.length||e.jobs.includes(job));
  const it = pick(pool.length?pool:catalog[cat]);
  const e = { name: it.name?.eng||it.key, names: it.name, hashkey: it.key, icon: it.icon,
    unic: !!it.unic, quality:'', reqlvl: it.level||1, type: it.type||slot,
    TwoHandedWeapon: /greatsword|greataxe|hammer|staff|longbow|rifle/.test(it.type||''),
    basestats: [], enchants:[{label:'',value:0},{label:'',value:0},{label:'',value:0},{label:'',value:0}],
    gems:[{key:'nogem'},{key:'nogem'},{key:'nogem'},{key:'nogem'},{key:'nogem'}] };
  if (slot === 'weapons') {
    e.basestats = [
      {label:'damageminbase', value: Math.floor(20+rnd()*80)},
      {label:'damagemaxbase', value: Math.floor(60+rnd()*120)},
      {label:'speedbase', value: Math.round((0.8+rnd()*0.8)*100)/100},
    ];
  } else if (slot === 'offhands') {
    e.basestats = [
      {label:'armorbase', value: Math.floor(10+rnd()*60)},
      {label:'blockratebase', value: Math.floor(20+rnd()*200)},
      {label:'blockeddmgbase', value: Math.floor(10+rnd()*90)},
    ];
  } else if (ARMOR_SLOTS.includes(slot)) {
    e.basestats = [{label:'armorbase', value: Math.floor(10+rnd()*80)}];
  }
  for (let k=0;k<4;k++) if (rnd()>0.45) e.enchants[k] = { label: pick(E_POOL), value: Math.round(rnd()*400)/1000 };
  const gemKeys = Object.keys(catalog.gems).filter(g=>g!=='nogem');
  for (let k=0;k<5;k++) if (rnd()>0.65) e.gems[k] = { key: pick(gemKeys) };
  return e;
}

let diffs=0, checks=0, shown=0;
for (let i=0;i<30;i++){
  const job=jobs[i%4];
  const build={ job, level:30+Math.floor(rnd()*16), knowledge:Math.floor(rnd()*46),
    pvpLevel: i%3?0:Math.floor(rnd()*46), pet:pick(Object.keys(catalog.companions)),
    essence:pick(Object.keys(catalog.essences)), opponent: i%3?'pve':'pvp',
    opponentLevel:30+Math.floor(rnd()*16), opponentPvpLevel:Math.floor(rnd()*20),
    opponentDefense:Math.round(rnd()*40)/100, opponentResist:Math.round(rnd()*40)/100,
    marked: rnd()>0.5, talents:{ExpTree:[],PvPtree:[]}, slots:{} };
  for (const slot of [...ARMOR_SLOTS, ...OTHER, 'weapons', 'offhands']) build.slots[slot] = makeEquip(slot, job);
  if (build.slots.weapons.TwoHandedWeapon && job!=='RNG') build.slots.offhands = null;

  const ref = computeBuild(build, catalog);
  const got = computeBuildWithRules(build, catalog);
  if (got.errors.length && shown++ < 3) console.log('  errors:', got.errors.slice(0,2));

  const cmp = (label, a, b) => {
    checks++;
    if (!(Math.abs(a-b) <= 1e-9)) { diffs++; if (diffs<=10) console.log(`✗ ${job} #${i} ${label}: ref=${a} rules=${b}`); }
  };
  cmp('dps', ref.dps, got.dps);
  for (const k of Object.keys(ref.gs)) cmp(`gs.${k}`, ref.gs[k].Total, got.gs[k].Total);
  for (const k of Object.keys(ref.percentages)) cmp(`pct.${k}`, ref.percentages[k], got.percentages[k]);
  for (const [k,v] of Object.entries(ref.skills)) {
    cmp(`skill ${k} min`, v.min, got.skills[k]?.min ?? NaN);
    cmp(`skill ${k} max`, v.max, got.skills[k]?.max ?? NaN);
    cmp(`skill ${k} critmin`, v.critmin, got.skills[k]?.critmin ?? NaN);
    cmp(`skill ${k} critmax`, v.critmax, got.skills[k]?.critmax ?? NaN);
  }
}
console.log(`\n${checks - diffs}/${checks} valeurs identiques (moteur codé ↔ moteur à règles) sur 30 builds.`);
if (diffs) {
  console.log(`✘ ${diffs} divergence(s) : les formules par défaut ne reproduisent plus le moteur de référence.`);
  process.exitCode = 1;
} else {
  console.log('✔ Le moteur à règles reproduit exactement le moteur codé en dur.\n');
}
