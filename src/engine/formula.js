/**
 * engine/formula.js
 * -----------------------------------------------------------------------------
 * Petit langage d'expressions pour les formules du calculateur.
 *
 * Pourquoi un analyseur maison plutôt que `eval` / `new Function` ?
 *   - les formules sont saisies par l'utilisateur dans l'interface ;
 *   - elles doivent être évaluables sans accès au scope JS (sécurité) ;
 *   - la CSP de certains hébergeurs interdit `unsafe-eval`.
 *
 * Grammaire supportée
 * -------------------
 *   expression := ternaire
 *   ternaire   := ou ('?' expression ':' expression)?
 *   ou         := et ('or' et)*
 *   et         := non ('and' non)*
 *   non        := 'not' non | comparaison
 *   comparaison:= somme (('=='|'!='|'<='|'>='|'<'|'>') somme)?
 *   somme      := produit (('+'|'-') produit)*
 *   produit    := unaire (('*'|'/'|'%') unaire)*
 *   unaire     := ('-'|'+') unaire | puissance
 *   puissance  := primaire ('^' unaire)?
 *   primaire   := nombre | texte | identifiant | appel | '(' expression ')'
 *
 * Les identifiants acceptent les points (`pct.critrate`). Les appels de fonction
 * prennent une liste d'arguments séparés par des virgules.
 */

const NUM = /[0-9]/;
const ID_START = /[A-Za-z_]/;
const ID_PART = /[A-Za-z0-9_.]/;

const KEYWORDS = new Set(['and', 'or', 'not', 'true', 'false']);

/** Découpe une expression en jetons. */
export function tokenize(src) {
  const tokens = [];
  let i = 0;
  const text = String(src ?? '');
  while (i < text.length) {
    const ch = text[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i += 1; continue; }

    if (NUM.test(ch) || (ch === '.' && NUM.test(text[i + 1] || ''))) {
      let j = i;
      while (j < text.length && /[0-9.]/.test(text[j])) j += 1;
      const raw = text.slice(i, j);
      const value = Number(raw);
      if (Number.isNaN(value)) throw new SyntaxError(`Nombre invalide : « ${raw} »`);
      tokens.push({ type: 'number', value });
      i = j;
      continue;
    }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      let out = '';
      while (j < text.length && text[j] !== quote) {
        if (text[j] === '\\' && j + 1 < text.length) { out += text[j + 1]; j += 2; continue; }
        out += text[j];
        j += 1;
      }
      if (j >= text.length) throw new SyntaxError('Texte non terminé (guillemet manquant)');
      tokens.push({ type: 'string', value: out });
      i = j + 1;
      continue;
    }

    if (ID_START.test(ch)) {
      let j = i;
      while (j < text.length && ID_PART.test(text[j])) j += 1;
      const word = text.slice(i, j);
      tokens.push(KEYWORDS.has(word) ? { type: 'op', value: word } : { type: 'ident', value: word });
      i = j;
      continue;
    }

    const two = text.slice(i, i + 2);
    if (['==', '!=', '<=', '>='].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if ('+-*/%^<>?:(),'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }
    throw new SyntaxError(`Caractère inattendu : « ${ch} »`);
  }
  tokens.push({ type: 'eof' });
  return tokens;
}

/** Analyse une expression et renvoie son arbre syntaxique (AST). */
export function parse(src) {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (value) => {
    const t = next();
    if (t.type !== 'op' || t.value !== value) {
      throw new SyntaxError(`« ${value} » attendu, trouvé « ${t.value ?? 'fin'} »`);
    }
    return t;
  };
  const isOp = (value) => peek().type === 'op' && peek().value === value;
  const eatOp = (value) => (isOp(value) ? next() : null);

  function parseExpr() { return parseTernary(); }

  function parseTernary() {
    const cond = parseOr();
    if (eatOp('?')) {
      const a = parseExpr();
      expect(':');
      const b = parseExpr();
      return { type: 'cond', test: cond, then: a, else: b };
    }
    return cond;
  }

  function parseOr() {
    let left = parseAnd();
    while (isOp('or')) { next(); left = { type: 'or', left, right: parseAnd() }; }
    return left;
  }

  function parseAnd() {
    let left = parseNot();
    while (isOp('and')) { next(); left = { type: 'and', left, right: parseNot() }; }
    return left;
  }

  function parseNot() {
    if (isOp('not')) { next(); return { type: 'not', arg: parseNot() }; }
    return parseCmp();
  }

  function parseCmp() {
    const left = parseAdd();
    const op = peek();
    if (op.type === 'op' && ['==', '!=', '<=', '>=', '<', '>'].includes(op.value)) {
      next();
      return { type: 'cmp', op: op.value, left, right: parseAdd() };
    }
    return left;
  }

  function parseAdd() {
    let left = parseMul();
    while (isOp('+') || isOp('-')) {
      const op = next().value;
      left = { type: 'bin', op, left, right: parseMul() };
    }
    return left;
  }

  function parseMul() {
    let left = parseUnary();
    while (isOp('*') || isOp('/') || isOp('%')) {
      const op = next().value;
      left = { type: 'bin', op, left, right: parseUnary() };
    }
    return left;
  }

  function parseUnary() {
    if (isOp('-')) { next(); return { type: 'neg', arg: parseUnary() }; }
    if (isOp('+')) { next(); return parseUnary(); }
    return parsePow();
  }

  function parsePow() {
    const base = parsePrimary();
    if (eatOp('^')) return { type: 'pow', base, exp: parseUnary() };
    return base;
  }

  function parsePrimary() {
    const t = peek();
    if (t.type === 'number') { next(); return { type: 'number', value: t.value }; }
    if (t.type === 'string') { next(); return { type: 'string', value: t.value }; }
    if (t.type === 'op' && t.value === '(') {
      next();
      const inner = parseExpr();
      expect(')');
      return inner;
    }
    if (t.type === 'ident') {
      next();
      if (isOp('(')) {
        next();
        const args = [];
        if (!isOp(')')) {
          args.push(parseExpr());
          while (eatOp(',')) args.push(parseExpr());
        }
        expect(')');
        return { type: 'call', name: t.value, args };
      }
      return { type: 'ident', name: t.value };
    }
    if (t.type === 'op' && (t.value === 'true' || t.value === 'false')) {
      next();
      return { type: 'bool', value: t.value === 'true' };
    }
    throw new SyntaxError(`Expression incomplète (${t.value ?? 'fin'})`);
  }

  const ast = parseExpr();
  if (peek().type !== 'eof') throw new SyntaxError(`Élément en trop : « ${peek().value} »`);
  return ast;
}

// ── cache des arbres syntaxiques ───────────────────────────────────────────
const astCache = new Map();

export function compile(src) {
  const key = String(src ?? '');
  if (astCache.has(key)) return astCache.get(key);
  const ast = parse(key);
  astCache.set(key, ast);
  return ast;
}

export function clearFormulaCache() {
  astCache.clear();
}

const truthy = (v) => (typeof v === 'boolean' ? v : typeof v === 'number' ? v !== 0 : !!v);
const num = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Évalue un AST.
 * @param {object} node  arbre issu de `parse`/`compile`
 * @param {{vars?:object, fns?:object}} scope  variables de boucle + fonctions
 */
export function evaluateNode(node, scope = {}) {
  const vars = scope.vars || {};
  const fns = scope.fns ? { ...DEFAULT_FNS, ...scope.fns } : DEFAULT_FNS;

  switch (node.type) {
    case 'number': return node.value;
    case 'string': return node.value;
    case 'bool': return node.value;
    case 'ident': {
      if (Object.prototype.hasOwnProperty.call(vars, node.name)) return vars[node.name];
      if (Object.prototype.hasOwnProperty.call(fns, node.name)) return fns[node.name];
      throw new ReferenceError(`Variable inconnue : « ${node.name} »`);
    }
    case 'call': {
      const fn = fns[node.name];
      if (typeof fn !== 'function') throw new ReferenceError(`Fonction inconnue : « ${node.name}() »`);
      const args = node.args.map((a) => evaluateNode(a, scope));
      return fn(...args);
    }
    case 'neg': return -num(evaluateNode(node.arg, scope));
    case 'not': return !truthy(evaluateNode(node.arg, scope));
    case 'and': return truthy(evaluateNode(node.left, scope)) && truthy(evaluateNode(node.right, scope));
    case 'or': return truthy(evaluateNode(node.left, scope)) || truthy(evaluateNode(node.right, scope));
    case 'cond': return truthy(evaluateNode(node.test, scope))
      ? evaluateNode(node.then, scope)
      : evaluateNode(node.else, scope);
    case 'pow': return num(evaluateNode(node.base, scope)) ** num(evaluateNode(node.exp, scope));
    case 'cmp': {
      const a = evaluateNode(node.left, scope);
      const b = evaluateNode(node.right, scope);
      const bothNumeric = typeof a !== 'string' && typeof b !== 'string';
      const x = bothNumeric ? num(a) : a;
      const y = bothNumeric ? num(b) : b;
      switch (node.op) {
        case '==': return x === y;
        case '!=': return x !== y;
        case '<': return x < y;
        case '>': return x > y;
        case '<=': return x <= y;
        case '>=': return x >= y;
        default: throw new SyntaxError(`Comparateur inconnu : ${node.op}`);
      }
    }
    case 'bin': {
      const rawA = evaluateNode(node.left, scope);
      const rawB = evaluateNode(node.right, scope);
      // `+` concatène dès qu'un opérande est du texte (ex. stat + "boost")
      if (node.op === '+' && (typeof rawA === 'string' || typeof rawB === 'string')) {
        return String(rawA) + String(rawB);
      }
      const a = num(rawA);
      const b = num(rawB);
      switch (node.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? 0 : a / b;
        case '%': return b === 0 ? 0 : a % b;
        default: throw new SyntaxError(`Opérateur inconnu : ${node.op}`);
      }
    }
    default:
      throw new SyntaxError(`Nœud inconnu : ${node.type}`);
  }
}

/** Évalue une expression texte. */
export function evaluate(src, scope = {}) {
  return evaluateNode(compile(src), scope);
}

/** Fonctions mathématiques disponibles dans les formules. */
export const MATH_FNS = {
  min: (...args) => Math.min(...args.map(num)),
  max: (...args) => Math.max(...args.map(num)),
  floor: (v) => Math.floor(num(v)),
  ceil: (v) => Math.ceil(num(v)),
  round: (v) => Math.round(num(v)),
  abs: (v) => Math.abs(num(v)),
  sqrt: (v) => Math.sqrt(num(v)),
  pow: (a, b) => num(a) ** num(b),
  clamp: (v, lo, hi) => Math.min(Math.max(num(v), num(lo)), num(hi)),
  sign: (v) => Math.sign(num(v)),
  startsWith: (s, p) => String(s).startsWith(String(p)),
  endsWith: (s, p) => String(s).endsWith(String(p)),
  contains: (s, p) => String(s).includes(String(p)),
  matches: (s, re) => new RegExp(String(re)).test(String(s)),
  number: (v) => num(v),
};

/** Fonctions disponibles par défaut dans toute formule. */
export const DEFAULT_FNS = {
  ...MATH_FNS,
  if: (cond, a, b) => (truthy(cond) ? a : b),
  and: (a, b) => truthy(a) && truthy(b),
  or: (a, b) => truthy(a) || truthy(b),
  not: (a) => !truthy(a),
};

/** Liste utilisée par l'aide de saisie de l'interface. */
export const FORMULA_FUNCTION_DOCS = [
  { name: 'T', args: "'stat'", doc: 'Total courant d\'une statistique' },
  { name: 'B', args: "'stat', 'slot'", doc: 'Valeur de base apportée par un emplacement' },
  { name: 'E', args: "'stat', 'slot'", doc: 'Valeur des enchantements d\'un emplacement' },
  { name: 'G', args: "'stat', 'slot'", doc: 'Valeur des gemmes d\'un emplacement' },
  { name: 'S', args: "'stat', 'slot'", doc: 'Somme base + enchantements + gemmes' },
  { name: 'PET', args: "'stat'", doc: 'Apport du compagnon' },
  { name: 'SETS', args: "'stat'", doc: 'Apport des ensembles' },
  { name: 'TLT', args: "'stat'", doc: 'Apport des talents' },
  { name: 'PCT', args: "'nom'", doc: 'Pourcentage calculé (critrate, armor…)' },
  { name: 'min / max', args: 'a, b', doc: 'Plus petite / plus grande valeur' },
  { name: 'floor / ceil / round', args: 'v', doc: 'Arrondis' },
  { name: 'clamp', args: 'v, min, max', doc: 'Borne une valeur' },
  { name: 'pow', args: 'a, b', doc: 'Puissance' },
  { name: 'if', args: 'condition, alors, sinon', doc: 'Choix conditionnel' },
  { name: 'startsWith', args: 'texte, début', doc: 'Test de préfixe' },
];
