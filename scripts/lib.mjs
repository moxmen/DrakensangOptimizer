import fs from 'node:fs';

/**
 * Les anciens fichiers db/ (Items.json, Langs.json) sont du JSON "tolérant" :
 * ils contiennent des commentaires // et /* *\/. On les retire avant parsing.
 * The legacy db/ files are "relaxed" JSON (line comments). Strip them, then parse.
 */
export function parseRelaxedJson(path) {
  const raw = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  let out = '';
  let i = 0;
  let inString = false;
  let esc = false;
  while (i < raw.length) {
    const c = raw[i];
    if (inString) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inString = false;
      i += 1;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && raw[i + 1] === '/') {
      while (i < raw.length && raw[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && raw[i + 1] === '*') {
      i += 2;
      while (i + 1 < raw.length && !(raw[i] === '*' && raw[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return JSON.parse(out);
}

export const LANGS = ['eng', 'fra', 'deu', 'esp', 'ara'];

/** Convertit un objet {langid, eng, fra, ...} en dictionnaire multilingue. */
export function translations(entry, extra = []) {
  const out = {};
  const keys = [...LANGS, ...extra];
  for (const k of keys) {
    if (entry[k] !== undefined) out[k] = String(entry[k]).trim();
  }
  return out;
}

export function writeJson(path, data) {
  fs.mkdirSync(path.replace(/\/[^/]+$/, ''), { recursive: true });
  fs.writeFileSync(path, JSON.stringify(data));
}
