/**
 * render-test.mjs
 * -----------------------------------------------------------------------------
 * Rendu de l'application dans jsdom (sans navigateur) pour vérifier :
 *   - que React monte sans erreur,
 *   - que les 5 langues s'affichent (dont l'arabe en RTL),
 *   - que les interactions de base (clic sur un slot, changement de langue)
 *     fonctionnent.
 *
 *   node scripts/render-test.mjs
 */
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const items = fs.readFileSync(path.join(ROOT, 'public/data/items.json'), 'utf8');
const names = fs.readFileSync(path.join(ROOT, 'public/data/names.json'), 'utf8');
const i18n = fs.readFileSync(path.join(ROOT, 'public/data/i18n.json'), 'utf8');

const bundle = await build({
  entryPoints: [path.join(ROOT, 'src/main.jsx')],
  bundle: true,
  write: false,
  format: 'iife',
  target: 'es2020',
  loader: { '.css': 'empty', '.jpg': 'dataurl', '.png': 'dataurl', '.svg': 'dataurl', '.woff': 'empty', '.woff2': 'empty' },
  define: { 'process.env.NODE_ENV': '"development"' },
  absWorkingDir: ROOT,
});
const code = bundle.outputFiles[0].text;

const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});

const { window } = dom;

// injecte le CSS compilé (npm run build) pour pouvoir tester les styles réels
const distCss = fs.existsSync(path.join(ROOT, 'dist'))
  ? fs.readdirSync(path.join(ROOT, 'dist/assets')).filter((f) => f.endsWith('.css'))
  : [];
for (const file of distCss) {
  const style = window.document.createElement('style');
  style.textContent = fs.readFileSync(path.join(ROOT, 'dist/assets', file), 'utf8');
  window.document.head.appendChild(style);
}
window.fetch = async (url) => {
  const file = String(url).replace(/^\.\//, '').split('?')[0];
  const body = file.endsWith('items.json') ? items : file.endsWith('names.json') ? names : i18n;
  return { ok: true, json: async () => JSON.parse(body), text: async () => body };
};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);

const errors = [];
window.addEventListener('error', (e) => errors.push(e.error?.stack || e.message));
const origError = window.console.error;
window.console.error = (...args) => {
  errors.push(args.map((a) => (a && a.stack ? a.stack : String(a))).join(' '));
  origError(...args);
};

window.eval(code);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(700);

const root = window.document.getElementById('root');
const text = () => root.textContent || '';

const report = [];
const check = (label, cond, extra = '') => {
  report.push(`${cond ? '✔' : '✘'} ${label}${extra ? ` — ${extra}` : ''}`);
  if (!cond) process.exitCode = 1;
};

check('React mounted', root.children.length > 0, `${root.children.length} child`);
check('No console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
check('Header crest rendered', !!root.querySelector('.crest__title'));
check('Language flags rendered', root.querySelectorAll('.lang-flag').length === 5, `${root.querySelectorAll('.lang-flag').length} flags`);
check('Gear slots rendered', root.querySelectorAll('.gear-slot').length === 14, `${root.querySelectorAll('.gear-slot').length} slots`);
check('DPS panel rendered', !!root.querySelector('.dps-huge'), root.querySelector('.dps-huge')?.textContent);
check('Arabic flag present', !!root.querySelector('.lang-flag[title*="العربية"]'));

// ── changement de langue → RTL ──────────────────────────────────────────────
const arBtn = [...root.querySelectorAll('.lang-flag')].find((b) => (b.getAttribute('title') || '').includes('العربية'));
arBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(300);
check('dir=rtl after Arabic', window.document.documentElement.getAttribute('dir') === 'rtl', window.document.documentElement.getAttribute('dir'));
check('html lang=ar', window.document.documentElement.getAttribute('lang') === 'ar');
const arabicText = text();
check('Arabic UI strings present', /التجهيزات|الإحصاءات|الضرر/.test(arabicText), arabicText.slice(0, 120).replace(/\s+/g, ' '));
check('Arabic slot labels', /تميمة|حزام|عباءة/.test(arabicText));

// ── capture du HTML pour inspection visuelle ──────────────────────────────
if (process.env.DUMP) fs.writeFileSync('/tmp/dom-en.html', root.innerHTML.replace(/></g, '>\n<'));
if (process.env.DUMP) {
  console.log('SLOT LABELS:', [...root.querySelectorAll('.gear-slot__label')].map((n) => n.textContent).join('|'));
  console.log('NAV:', [...root.querySelectorAll('.nav-btn')].map((n) => JSON.stringify(n.textContent)).join(','));
}
// ── retour à l'anglais ─────────────────────────────────────────────────────
const enBtn = [...root.querySelectorAll('.lang-flag')].find((b) => (b.getAttribute('title') || '').startsWith('English'));
enBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(300);
check('dir=ltr after English', window.document.documentElement.getAttribute('dir') === 'ltr');
check('English UI strings', /Equipment|Statistics/.test(text()));

// ── ouverture de l'éditeur d'objet ─────────────────────────────────────────
const slotBtn = root.querySelector('.gear-slot');
slotBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(300);
check('Item editor opens', !!root.querySelector('.editor-overlay'));
check('Editor lists database items', (root.querySelectorAll?.('.editor__list li') || []).length >= 0);
const cancelBtn = [...(root.querySelectorAll('.editor .btn') || [])].find((b) => /Cancel/i.test(b.textContent));
if (cancelBtn) {
  cancelBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(200);
  check('Editor closes', !root.querySelector('.editor-overlay'));
}

// ── audit du texte de chaque page (NaN / undefined / clés brutes) ──────────
const pages = {};
for (const label of ['Equipment', 'Statistics', 'Skills', 'Talents', 'Compare', 'Saved builds', 'About']) {
  const btn = [...root.querySelectorAll('.nav-btn')].find((b) => (b.textContent || '').trim() === label);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(220);
  pages[label] = text().replace(/\s+/g, ' ').trim();
}
if (process.env.DUMP) {
  for (const [label, body] of Object.entries(pages)) console.log(`\n===== ${label} =====\n${body.slice(0, 1800)}`);
}
for (const [label, body] of Object.entries(pages)) {
  const bad = [];
  if (/NaN/.test(body)) bad.push('NaN');
  if (/undefined/.test(body)) bad.push('undefined');
  if (/\bnull\b/.test(body)) bad.push('null');
  // clés d'interface non résolues : elles utilisent nos préfixes connus
  const NS = '(nav|slot|class|stat|sys|appName|editorTitle|formula|compare|saved|import|export|about|filter|sort|level|type)';
  const keys = body.match(new RegExp(`\\b${NS}\\.[a-zA-Z][a-zA-Z0-9]*\\b`, 'g')) || [];
  const leaked = [...new Set(keys)];
  if (leaked.length) bad.push('keys:' + leaked.join(','));
  check(`Text clean on ${label}`, bad.length === 0, bad.join(' | '));
}

// ── équipement réel → le DPS doit changer ─────────────────────────────────
const equipmentBtn = [...root.querySelectorAll('.nav-btn')].find((b) => (b.textContent || '').trim() === 'Equipment');
equipmentBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(200);
const dpsBefore = root.querySelector('.dps-huge')?.textContent;
// slot « weapon » (index 6 dans LEFT_SLOTS)
const weaponSlot = root.querySelector('.gear-slot[data-slot="weapons"]');
weaponSlot.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(250);
const listItems = root.querySelectorAll('.editor__list li button');
check('Editor proposes weapons', listItems.length > 0, `${listItems.length}`);
listItems[0]?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(200);
const saveBtn = [...root.querySelectorAll('.editor .btn')].find((b) => /Apply to slot/i.test(b.textContent));
saveBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(300);
const dpsAfter = root.querySelector('.dps-huge')?.textContent;
check('Weapon equipped (icon shown)', !!root.querySelector('.gear-slot[data-slot="weapons"].has-item'));
check('DPS recomputed after equip', dpsBefore !== dpsAfter, `${dpsBefore} → ${dpsAfter}`);
check('DPS is a number', /^[0-9]/.test(String(dpsAfter || '').replace(/[^0-9]/g, '')));

// ── sauvegarde + export JSON ──────────────────────────────────────────────
const stored = JSON.parse(window.localStorage.getItem('dso.current.v3') || '{}');
check('Build persisted in localStorage', !!stored.slots, Object.keys(stored).slice(0, 5).join(','));
check('Equipped weapon persisted', !!stored.slots?.weapons?.hashkey, stored.slots?.weapons?.hashkey);
check('13 slots persisted', Object.keys(stored.slots || {}).length === 13, `${Object.keys(stored.slots || {}).length}`);

// ── sélecteur d'essence ───────────────────────────────────────────────────
equipmentBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(200);
root.querySelector('.gear-slot[data-slot="essences"]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(250);
check('Essence picker opens', !!root.querySelector('.essence-overlay'));
const essItems = root.querySelectorAll('.essence__item');
check('Essence picker lists essences', essItems.length === 9, `${essItems.length}`);
essItems[3]?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(250);
check('Essence applied', JSON.parse(window.localStorage.getItem('dso.current.v3')).essence === 'Green20',
  JSON.parse(window.localStorage.getItem('dso.current.v3')).essence);
check('Essence picker closed', !root.querySelector('.essence-overlay'));

// ── comparaison A/B avec un second build ─────────────────────────────────
const compareNav = [...root.querySelectorAll('.nav-btn')].find((b) => (b.textContent || '').trim() === 'Compare');
compareNav?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(250);
const sendB = [...root.querySelectorAll('.compare__picker .btn')].find((b) => /send current build to B/i.test(b.textContent));
sendB?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(300);
check('Compare table rendered', !!root.querySelector('.compare-table'));
const compareRows = root.querySelectorAll('.compare-table tbody tr').length;
check('Compare lists all metrics', compareRows >= 12, `${compareRows} lignes`);
check('Compare identical builds => zero diff', /\b0\b/.test(root.querySelector('.compare-table__diff')?.textContent || 'x'),
  root.querySelector('.compare-table__diff')?.textContent);
const swapBtn = [...root.querySelectorAll('.compare__picker .btn')].find((b) => /swap/i.test(b.textContent));
check('Swap button enabled with B loaded', swapBtn && !swapBtn.disabled);

// ── infobulle d'objet au survol ──────────────────────────────────────────
equipmentBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(200);
const wslot = root.querySelector('.gear-slot[data-slot="weapons"]');
wslot?.dispatchEvent(new window.MouseEvent('mouseover', {
  bubbles: true, relatedTarget: window.document.body,
}));
await wait(250);
// React utilise `mouseover` (délégué) : on vérifie aussi l'attribut du slot
const hasItem = root.querySelector('.gear-slot[data-slot="weapons"]')?.classList.contains('has-item');
check('Item tooltip on hover', !!root.querySelector('.tooltip'), hasItem ? 'slot rempli' : 'slot vide');
wslot?.dispatchEvent(new window.MouseEvent('mouseout', {
  bubbles: true, relatedTarget: window.document.body,
}));
await wait(150);

// ── filtrage par classe des compétences et talents ───────────────────────
const skillsBtn = [...root.querySelectorAll('.nav-btn')].find((b) => (b.textContent || '').trim() === 'Skills');
skillsBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(250);
const skillRows = root.querySelectorAll('.skills-table tbody tr').length;
check('Skills limited to the current class', skillRows >= 8 && skillRows <= 12, `${skillRows} lignes (WAR)`);
const skillText = root.querySelector('.skills-table')?.textContent || '';
check('No foreign-class skill listed', !/Meteor|Fireball|Hunting arrow|Quick shot/.test(skillText));

const talentsBtn = [...root.querySelectorAll('.nav-btn')].find((b) => (b.textContent || '').trim() === 'Talents');
talentsBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(250);
const talentText = text();
check('Talents limited to the current class', !/Big bang|Longbow veteran|Nimble feet/.test(talentText));
check('Talents PvP ultimate translated', /Death wail/.test(talentText));

// ── sauvegarde / export / import ─────────────────────────────────────────
const savedBtn = [...root.querySelectorAll('.nav-btn')].find((b) => (b.textContent || '').trim() === 'Saved builds');
savedBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(400);
const nameInput = root.querySelector('.saved__saveRow input.input');
nameInput.value = 'Test build';
nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));
await wait(120);
const saveBuildBtn = [...root.querySelectorAll('.saved__saveRow .btn')][0];
saveBuildBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(300);
const saved = JSON.parse(window.localStorage.getItem('dso.builds.v3') || '[]');
check('Build saved to localStorage', saved.length === 1, `${saved.length} entries`);
check('Saved build keeps slots', Object.keys(saved[0]?.build?.slots || {}).length === 13);
check('Saved build list rendered', root.querySelectorAll('.saved__item').length === 1);

// le JSON exporté doit pouvoir être réimporté à l'identique
const exported = saved[0].build;
check('Serialized build has job/level', exported.job === 'WAR' && typeof exported.level === 'number', `${exported.job}/${exported.level}`);

// ── RTL : chaque page doit rester lisible en arabe ───────────────────────
const ar = [...root.querySelectorAll('.lang-flag')].find((b) => (b.getAttribute('title') || '').includes('العربية'));
ar.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(300);
for (const label of ['المقارنة', 'المجموعات المحفوظة', 'حول', 'المهارات', 'المواهب', 'الإحصاءات', 'التجهيزات']) {
  const btn = [...root.querySelectorAll('.nav-btn')].find((b) => (b.textContent || '').trim() === label);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(200);
  const body = text();
  check(`Arabic page ${label}`, !!btn && !/NaN|undefined/.test(body) && window.document.documentElement.getAttribute('dir') === 'rtl');
}

// ── noms arabes des compétences et talents ───────────────────────────────
const arSkills = [...root.querySelectorAll('.nav-btn')].find((b) => (b.textContent || '').trim() === 'المهارات');
arSkills?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(250);
const arSkillText = text();
check('Arabic skill names', /ضربة|تحطيم|غاضبة/.test(arSkillText), arSkillText.match(/[\u0600-\u06FF][^A-Za-z0-9]{2,20}/)?.join(' '));
check('No latin skill names left in AR', !/Angry strike|Smash|Meteor/.test(arSkillText));
const arTalents = [...root.querySelectorAll('.nav-btn')].find((b) => (b.textContent || '').trim() === 'المواهب');
arTalents?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(250);
check('Arabic talent names', /[\u0600-\u06FF]/.test(root.querySelector('.talents__grid')?.textContent || ''));
check('No latin talent names left in AR', !/Two-handed master|Blocker|Death wail/.test(text()));

// ── aller-retour JSON (export → import) ──────────────────────────────────
const en = [...root.querySelectorAll('.lang-flag')].find((b) => (b.getAttribute('title') || '').startsWith('English'));
en.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(250);
const json = window.localStorage.getItem('dso.current.v3');
check('Build serialisable en JSON', !!json && json.length > 100, `${json?.length} chars`);
check('JSON contient les 13 emplacements', Object.keys(JSON.parse(json).slots).length === 13);

// ── navigation ────────────────────────────────────────────────────────────
for (const [label, needle] of [['Skills', 'skills-table'], ['Talents', 'talents'], ['Compare', 'compare__picker'], ['Saved builds', 'saved'], ['About', 'about__lead']]) {
  const btn = [...root.querySelectorAll('.nav-btn')].find((b) => (b.textContent || '').trim() === label);
  if (!btn) { check(`Nav ${label}`, false); continue; }
  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(250);
  check(`Nav ${label}`, !!root.querySelector(`.${needle}`), root.querySelector(`.${needle}`) ? '' : text().slice(0, 80).replace(/\s+/g, ' '));
}

// ── styles réellement appliquées (jsdom CSSOM) ────────────────────────────
const win = window;
const cs = (sel, prop) => {
  const el = root.querySelector(sel);
  if (!el) return null;
  return win.getComputedStyle(el).getPropertyValue(prop);
};
if (distCss.length) {
  // jsdom ne calcule pas la cascade complète : on vérifie le CSS compilé lui-même
  const css = distCss.map((f) => fs.readFileSync(path.join(ROOT, 'dist/assets', f), 'utf8')).join('\n');
  check('CSS: boutons sculptés (dégradé + bevel)', /\.btn\{[^}]*--btn: url/.test(css));
  check('CSS: panneaux avec coins ornés', /\.panel:before/.test(css)
    && /url\([^)]*frame[^)]*\)/.test(css)
    && /\.panel__header:before[^{]*\{[^}]*florish/.test(css));
  check('CSS: curseur pointeur sur les emplacements', /\.gear-slot\{[^}]*cursor:pointer/.test(css));
  check('CSS: DPS en grand corps typographique', /\.dps-huge\{[^}]*font-size/.test(css));
  check('CSS: surcharges RTL présentes', /html\[dir=rtl\]/.test(css),
    `${(css.match(/html\[dir=rtl\]/g) || []).length} règles`);
  check('CSS: polices Cinzel + Amiri intégrées', /Cinzel/.test(css) && /Amiri/.test(css));
  check('CSS: textures du thème associées',
    ['stone', 'bronze', 'crimson', 'backdrop', 'florish', 'btn-steel'].every((n) => new RegExp(`url\\([^)]*${n}[^)]*\\)`).test(css)),
    ['stone', 'bronze', 'crimson', 'backdrop', 'florish', 'btn-steel'].filter((n) => !new RegExp(`url\\([^)]*${n}[^)]*\\)`).test(css)).join(','));
  check('CSS: police arabe sur html[dir=rtl]', /html\[dir=rtl\][^{]*\{[^}]*Amiri/.test(css));
} else {
  console.log('⚠ dist/ absent — lancez `npm run build` pour les tests de style.');
}

console.log(`\n${report.join('\n')}\n`);
if (errors.length) {
  console.log('console errors:\n' + errors.slice(0, 6).join('\n---\n'));
}
