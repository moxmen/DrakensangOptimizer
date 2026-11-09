/**
 * state/useRules.js
 * -----------------------------------------------------------------------------
 * Formules et statistiques personnalisées, persistées dans le navigateur.
 *
 * - `rules` : liste ordonnée de règles (somme / formule / pourcentage / skills)
 * - `stats` : statistiques créées par l'utilisateur, en plus des 37 d'origine
 *
 * Tout est modifiable depuis l'écran « Calculateur » : aucune ligne de code
 * n'est nécessaire pour changer une formule ou ajouter une statistique.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  legacyRules, normalizeRule, RULES_STORAGE_KEY, STATS_STORAGE_KEY,
} from '../engine/rules.js';
import { clearFormulaCache } from '../engine/formula.js';

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export function useRules() {
  const [rules, setRules] = useState(() => {
    const stored = readJson(RULES_STORAGE_KEY, null);
    if (!Array.isArray(stored) || !stored.length) return legacyRules();
    return stored.map((r, i) => normalizeRule(r, i));
  });
  const [stats, setStats] = useState(() => readJson(STATS_STORAGE_KEY, []));
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef(null);

  // persistance différée (évite d'écrire à chaque frappe)
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
        localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
      } catch { /* quota dépassé : on ignore */ }
    }, 250);
    return () => clearTimeout(saveTimer.current);
  }, [rules, stats]);

  const touch = useCallback(() => {
    clearFormulaCache();
    setDirty(true);
  }, []);

  const updateRule = useCallback((id, patch) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    touch();
  }, [touch]);

  const toggleRule = useCallback((id) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    touch();
  }, [touch]);

  const moveRule = useCallback((id, direction) => {
    setRules((prev) => {
      const index = prev.findIndex((r) => r.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    touch();
  }, [touch]);

  const addRule = useCallback((kind) => {
    const draft = normalizeRule({
      id: uid('rule'),
      kind,
      target: 'damage',
      label: kind === 'sum' ? 'Nouvelle somme' : kind === 'pct' ? 'Nouveau pourcentage' : 'Nouvelle formule',
      expr: kind === 'expr' ? 'T("damage") * 0.1' : 'base + ench + gems',
      critExpr: '(2 + T("critboost"))',
    });
    setRules((prev) => [...prev, draft]);
    touch();
    return draft.id;
  }, [touch]);

  const deleteRule = useCallback((id) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    touch();
  }, [touch]);

  const resetRules = useCallback(() => {
    setRules(legacyRules());
    touch();
  }, [touch]);

  const importRules = useCallback((text) => {
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed.rules;
      if (!Array.isArray(list) || !list.length) return false;
      setRules(list.map((r, i) => normalizeRule(r, i)));
      if (Array.isArray(parsed.stats)) setStats(parsed.stats);
      touch();
      return true;
    } catch {
      return false;
    }
  }, [touch]);

  const exportRules = useCallback(
    () => JSON.stringify({ version: 1, rules, stats }, null, 2),
    [rules, stats],
  );

  // ── statistiques personnalisées ────────────────────────────────────────────
  const addStat = useCallback((name, kind = 'pct', label = '') => {
    const id = String(name || '').trim();
    if (!id || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(id)) {
      return { ok: false, error: 'Identifiant invalide (lettres et chiffres uniquement, sans espace).' };
    }
    if (stats.some((s) => s.id === id)) return { ok: false, error: 'Cette statistique existe déjà.' };
    setStats((prev) => [...prev, { id, kind, label: label || id }]);
    touch();
    return { ok: true };
  }, [stats, touch]);

  const updateStat = useCallback((id, patch) => {
    setStats((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    touch();
  }, [touch]);

  const deleteStat = useCallback((id) => {
    setStats((prev) => prev.filter((s) => s.id !== id));
    touch();
  }, [touch]);

  const statIds = useMemo(() => stats.map((s) => s.id), [stats]);

  return {
    rules, stats, statIds,
    dirty, setDirty,
    updateRule, toggleRule, moveRule, addRule, deleteRule, resetRules,
    importRules, exportRules,
    addStat, updateStat, deleteStat,
  };
}
