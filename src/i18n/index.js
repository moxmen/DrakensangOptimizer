/**
 * i18n/index.js
 * -----------------------------------------------------------------------------
 * Gestion des langues : eng, fra, deu, esp, ara.
 * - toutes les chaînes d'interface viennent de /data/i18n.json (généré)
 * - `dir` bascule automatiquement LTR → RTL pour l'arabe
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

export const LANGUAGES = [
  { code: 'eng', label: 'English', flag: 'eng', dir: 'ltr' },
  { code: 'fra', label: 'Français', flag: 'fra', dir: 'ltr' },
  { code: 'deu', label: 'Deutsch', flag: 'deu', dir: 'ltr' },
  { code: 'esp', label: 'Español', flag: 'esp', dir: 'ltr' },
  { code: 'ara', label: 'العربية', flag: 'ara', dir: 'rtl', arabic: true },
];

export const DEFAULT_LANG = 'eng';
const STORAGE_KEY = 'dso.language';

/** Détecte la langue du navigateur (comme l'ancien `Controller.js`). */
export function detectLanguage(nav = typeof navigator !== 'undefined' ? navigator : null) {
  const raw = String(nav?.language || nav?.languages?.[0] || 'en');
  if (/^ar/i.test(raw)) return 'ara';
  if (/^fr/i.test(raw)) return 'fra';
  if (/^de/i.test(raw)) return 'deu';
  if (/^es/i.test(raw)) return 'esp';
  return DEFAULT_LANG;
}

export function isRtl(code) {
  return LANGUAGES.find((l) => l.code === code)?.dir === 'rtl';
}

/**
 * Accède à une clé : les dictionnaires générés sont *plats* (`'nav.stats'`
 * est une clé littérale). On tente la clé plate, puis un chemin imbriqué
 * pour rester compatible avec un dictionnaire hiérarchique.
 */
export function dig(obj, path) {
  if (!obj) return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

/**
 * Hook principal. Retourne { lang, setLang, t, tSys, dir, ready }.
 * `dictionaries` = contenu de public/data/i18n.json
 */
export function useI18n(dictionaries) {
  const [lang, setLangState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
    }
    return detectLanguage();
  });

  const dir = isRtl(lang) ? 'rtl' : 'ltr';

  // applique <html lang dir>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', lang === 'ara' ? 'ar' : lang);
    root.setAttribute('dir', dir);
    root.dataset.lang = lang;
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  const setLang = useCallback((code) => {
    if (LANGUAGES.some((l) => l.code === code)) setLangState(code);
  }, []);

  const strings = dictionaries?.strings || {};
  const sysmess = dictionaries?.sysmess || {};

  /** Chaîne d'interface moderne (repli anglais puis clé). */
  const t = useCallback(
    (path, vars) => {
      let value = dig(strings[lang], path);
      if (value === undefined) value = dig(strings.eng, path);
      if (value === undefined) {
        // repli sur les libellés historiques de Langs.json (noms de statistiques)
        const legacy = sysmess[path];
        if (legacy && typeof legacy === 'object') {
          value = legacy[lang] || legacy.eng;
        }
      }
      if (value === undefined) return path;
      if (typeof value !== 'string') return value;
      if (!vars) return value;
      return value.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
    },
    [lang, strings, sysmess],
  );

  /** Chaîne historique `sysmess` (clé Langs.json). */
  const tSys = useCallback(
    (key) => {
      const entry = sysmess[key];
      if (!entry) return key;
      return entry[lang] || entry.eng || key;
    },
    [lang, sysmess],
  );

  const flag = useMemo(() => LANGUAGES.find((l) => l.code === lang), [lang]);

  /** Nom d'un objet du catalogue selon la langue courante. */
  const itemName = useCallback(
    (bag) => {
      if (!bag) return '';
      if (typeof bag === 'string') return bag;
      return bag[lang] || bag.eng || bag.fra || '';
    },
    [lang],
  );

  return { lang, setLang, t, tSys, dir, flag, itemName, ready: !!dictionaries };
}
