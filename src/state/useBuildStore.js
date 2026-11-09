/**
 * state/useBuildStore.js
 * -----------------------------------------------------------------------------
 * Gestion de l'état : build courant + builds sauvegardés (localStorage).
 * Persistance 100 % locale, comme les profils .txt de l'ancienne version.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  emptyBuild, parseProfile, serializeProfile, emptyEquip, isSlotEmpty, equipFromItem,
} from './build.js';

const BUILDS_KEY = 'dso.builds.v3';
const CURRENT_KEY = 'dso.current.v3';

const loadJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const uid = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function useBuildStore(catalog, catalogReady) {
  const [build, setBuild] = useState(() => {
    const saved = loadJson(CURRENT_KEY, null);
    return saved ? saved : null;
  });
  const [savedBuilds, setSavedBuilds] = useState(() => loadJson(BUILDS_KEY, []));
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // initialise dès que le catalogue est prêt (les slots dépendent de `job`)
  useEffect(() => {
    if (!catalogReady) return;
    if (!build) {
      setBuild(emptyBuild('WAR'));
      return;
    }
    setBuild((prev) => (prev && prev.slots ? prev : parseProfile(prev || {}, catalog)));
  }, [catalogReady, catalog, build]);

  // persistance
  useEffect(() => {
    if (build) localStorage.setItem(CURRENT_KEY, JSON.stringify(build));
  }, [build]);
  useEffect(() => {
    localStorage.setItem(BUILDS_KEY, JSON.stringify(savedBuilds));
  }, [savedBuilds]);

  const notify = useCallback((message, kind = 'ok') => {
    setToast({ message, kind, id: Date.now() });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  /** Met à jour un ou plusieurs paramètres du build. */
  const update = useCallback((patch) => {
    setBuild((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      // changement de classe : reconstruit les slots avec les bonnes icônes vides
      if (patch.job && patch.job !== prev.job) {
        const slots = {};
        for (const slot of Object.keys(prev.slots)) {
          const equip = prev.slots[slot];
          if (isSlotEmpty(equip)) slots[slot] = emptyEquip(slot, patch.job);
          else slots[slot] = equip;
        }
        next.slots = slots;
        next.talents = { ExpTree: [], PvPtree: [] };
      }
      return next;
    });
  }, []);

  const setSlot = useCallback((slot, equip) => {
    setBuild((prev) => {
      const next = { ...prev, slots: { ...prev.slots, [slot]: equip } };
      // arme à deux mains ⇒ main secondaire vidée (comportement historique)
      if (slot === 'weapons' && equip?.TwoHandedWeapon && prev.job !== 'RNG') {
        next.slots.offhands = emptyEquip('offhands', prev.job);
      }
      return next;
    });
  }, []);

  const clearSlot = useCallback((slot) => {
    setBuild((prev) => ({
      ...prev,
      slots: { ...prev.slots, [slot]: emptyEquip(slot, prev.job) },
    }));
  }, []);

  const toggleTalent = useCallback((tree, rowIndex, talentId) => {
    setBuild((prev) => {
      const talents = { ...prev.talents, [tree]: [...(prev.talents[tree] || [])] };
      talents[tree][rowIndex] = talentId || '';
      return { ...prev, talents };
    });
  }, []);

  const resetBuild = useCallback(() => {
    setBuild((prev) => emptyBuild(prev?.job || 'WAR'));
  }, []);

  /** Remplit chaque slot avec le meilleur objet disponible pour la classe. */
  const randomFill = useCallback(() => {
    setBuild((prev) => {
      const job = prev.job;
      const slots = { ...prev.slots };
      const cats = {
        amulets: 'amulets', waists: 'waists', weapondecorations: 'weapondecorations',
        ring1: 'rings', ring2: 'rings', headarmors: 'headarmors', shoulders: 'shoulders',
        torsos: 'torsos', gloves: 'gloves', boots: 'boots', weapons: 'weapons',
        offhands: 'offhands', mantles: 'mantles',
      };
      for (const [slot, cat] of Object.entries(cats)) {
        const list = (catalog[cat] || []).filter((e) => !e.jobs || !e.jobs.length || e.jobs.includes(job));
        if (!list.length) continue;
        const pick = list[Math.floor(Math.random() * list.length)];
        slots[slot] = makeEquip(pick, slot, job);
      }
      return { ...prev, slots };
    });
  }, [catalog]);

  const saveBuild = useCallback((name) => {
    const entry = {
      id: uid(),
      name: name || `Build ${new Date().toLocaleString()}`,
      savedAt: new Date().toISOString(),
      build: JSON.parse(JSON.stringify(build)),
    };
    setSavedBuilds((prev) => [entry, ...prev]);
    notify(`${entry.name} ✓`);
    return entry;
  }, [build, notify]);

  const deleteBuild = useCallback((id) => {
    setSavedBuilds((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const duplicateBuild = useCallback((id) => {
    setSavedBuilds((prev) => {
      const found = prev.find((b) => b.id === id);
      if (!found) return prev;
      return [{ ...found, id: uid(), name: `${found.name} (copy)` }, ...prev];
    });
  }, []);

  const loadBuild = useCallback((entry) => {
    const parsed = entry.build?.slots ? entry.build : parseProfile(entry.build || entry, catalog);
    setBuild(parsed);
  }, [catalog]);

  /** Import depuis un texte JSON (ancien ou nouveau format). */
  const importJson = useCallback((text) => {
    try {
      const parsed = JSON.parse(text);
      setBuild(parseProfile(parsed, catalog));
      return true;
    } catch {
      return false;
    }
  }, [catalog]);

  const exportJson = useCallback(() => JSON.stringify(serializeProfile(build), null, 2), [build]);

  const derived = useMemo(() => ({ job: build?.job }), [build]);

  return {
    build, catalog,
    savedBuilds, update, setSlot, clearSlot, toggleTalent,
    resetBuild, randomFill, saveBuild, deleteBuild, duplicateBuild,
    loadBuild, importJson, exportJson, toast, notify, derived,
  };
}

/** Fabrique un équipement complet depuis une entrée du catalogue. */
function makeEquip(item, slot, job) {
  return equipFromItem(item, slot, job);
}
