import React, { useEffect, useMemo, useRef, useState } from 'react';
import { categoryForSlot, localizedName } from '../data/catalog.js';
import { emptyEquip } from '../state/build.js';
import { STAT_LABELS } from '../data/labels.js';
import ItemIcon from './ItemIcon.jsx';
import './editor.css';

const OFFENSIVE = ['damage', 'damagepve', 'damagepvp', 'damagemin', 'damagemax', 'weapondamageboost', 'speed', 'critrate', 'critboost'];
const DEFENSIVE = ['armor', 'itemarmorboost', 'life', 'regen', 'blockrate', 'blockeddmg', 'movspeed', 'resist', 'fire', 'ice', 'lightning', 'poison', 'andermagic'];

const QUALITIES = ['', 'enhanced', 'magic', 'extra', 'legend'];

/** Rareté déduite du nombre d'enchantements remplis (0 → ''). */
const qualityFor = (enchants) => {
  const count = (enchants || []).filter((e) => e.label && Number(e.value)).length;
  return QUALITIES[Math.min(count, 4)];
};

const SLOT_TO_GEM = {
  amulets: 'Amulets', waists: 'Waists', weapondecorations: 'WeaponDecorations',
  ring1: 'Ring1', ring2: 'Ring2', headarmors: 'HeadArmors', shoulders: 'Shoulders',
  torsos: 'Torsos', gloves: 'Gloves', boots: 'Boots', weapons: 'Weapons',
  offhands: 'Offhands', mantles: 'Mantles', essences: 'Essences',
};

const ARMOR_TEMPLATE = ['armorbase'];
const WEAPON_TEMPLATE = ['damageminbase', 'damagemaxbase', 'speedbase'];
const SHIELD_TEMPLATE = ['armorbase', 'blockratebase', 'blockeddmgbase'];
const ATTACK_TEMPLATE = ['armorbase', 'critratebase'];

const templatesFor = (slot, job) => {
  if (slot === 'weapons') return WEAPON_TEMPLATE;
  if (slot === 'offhands') return job === 'WAR' ? SHIELD_TEMPLATE : SHIELD_TEMPLATE;
  if (/amulets|weapondecorations|ring/.test(slot)) return [];
  return ARMOR_TEMPLATE;
};

/** Icône « 45 » utilisée par l'éditeur historique. */
function editorIcon(item, slot, job) {
  if (item.unic) return item.icon;
  if (!item.type) return item.icon;
  const enchCount = (item.enchants || []).filter((e) => e.label && Number(e.value)).length;
  const quality = QUALITIES[enchCount] || '';
  let suffix = '';
  if (/^(amulets|weapondecorations|headarmors|shoulders|torsos|gloves|boots)/.test(slot) || item.type === 'shield') suffix = job;
  return `${item.type}45${suffix}${quality}`;
}

/**
 * Éditeur d'objet : sélection dans la base (autocomplétion) ou objet
 * entièrement personnalisé (stats de base, enchantements, gemmes).
 */
export default function ItemEditor({
  slot, build, catalog, t, lang, onSave, onCancel, customStats = [],
}) {
  // les statistiques créées dans l'écran « Calculateur » sont saisissables ici
  const off = [...OFFENSIVE, ...customStats.filter((c) => c.kind !== 'flat').map((c) => c.id)];
  const def = [...DEFENSIVE, ...customStats.filter((c) => c.kind === 'flat').map((c) => c.id)];
  const job = build.job;
  const category = categoryForSlot(slot);
  const database = catalog[category] || [];
  const template = templatesFor(slot, job);

  const [item, setItem] = useState(() => {
    const base = JSON.parse(JSON.stringify(build.slots[slot] || emptyEquip(slot, job)));
    if (!base.basestats?.length && template.length) {
      base.basestats = template.map((label) => ({ label, value: 0 }));
    }
    return base;
  });
  const [query, setQuery] = useState('');
  const [showList, setShowList] = useState(false);
  const [gemOpen, setGemOpen] = useState(null);
  const [error, setError] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return database
      .filter((entry) => {
        const jobs = entry.jobs || [];
        const jobOk = !jobs.length || jobs.includes(job);
        if (!jobOk) return false;
        if (!q) return true;
        const names = entry.name || {};
        return Object.values(names).some((v) => typeof v === 'string' && v.toLowerCase().includes(q));
      })
      .slice(0, 40);
  }, [database, query, job]);

  const set = (patch) => setItem((prev) => ({ ...prev, ...patch }));

  const setBase = (label, value) => {
    setItem((prev) => {
      const basestats = [...(prev.basestats || [])];
      const idx = basestats.findIndex((b) => b.label === label);
      if (idx >= 0) basestats[idx] = { label, value: Number(value) || 0 };
      else basestats.push({ label, value: Number(value) || 0 });
      return { ...prev, basestats };
    });
  };

  const setEnchant = (idx, patch) => {
    setItem((prev) => {
      const enchants = [...(prev.enchants || [])];
      enchants[idx] = { ...enchants[idx], ...patch };
      return { ...prev, enchants };
    });
  };

  const setGem = (idx, key) => {
    setItem((prev) => {
      const gems = [...(prev.gems || [])];
      gems[idx] = { key };
      return { ...prev, gems };
    });
  };

  /** Remplit l'éditeur depuis un objet du catalogue (comme `onItemSelect`). */
  const pickItem = (entry) => {
    const enchants = [
      { label: '', value: 0 }, { label: '', value: 0 }, { label: '', value: 0 }, { label: '', value: 0 },
    ];
    const basestats = (item.basestats || []).map((b) => ({ ...b, value: 0 }));
    if (!basestats.length && template.length) template.forEach((label) => basestats.push({ label, value: 0 }));

    let idx = 0;
    const stats = entry.stats || {};
    let twoHanded = item.TwoHandedWeapon;
    for (const [key, value] of Object.entries(stats)) {
      if (key.endsWith('base')) {
        const found = basestats.find((b) => b.label === key);
        if (found) found.value = Number(value) || 0;
        else basestats.push({ label: key, value: Number(value) || 0 });
      } else if (!/^(icon|value|frames|nbdot|magicshare|markable|pvpreqlvl|level|type|slots)$/.test(key) && idx < 4) {
        enchants[idx] = { label: key, value };
        idx += 1;
      }
    }
    if (slot === 'weapons' && entry.type) {
      twoHanded = /greatsword|greataxe|hammer|staff|longbow|rifle/.test(entry.type);
    }
    const next = {
      ...item,
      hashkey: entry.key,
      name: entry.name?.eng || entry.key,
      names: entry.name,
      unic: !!entry.unic,
      icon: entry.icon,
      type: entry.type || item.type,
      reqlvl: entry.level ?? item.reqlvl,
      basestats,
      enchants,
      TwoHandedWeapon: twoHanded,
    };
    next.icon = editorIcon(next, slot, job);
    next.quality = entry.unic ? 'unique' : qualityFor(enchants);
    setItem(next);
    setQuery(entry.name?.eng || entry.key);
    setShowList(false);
    setError('');
  };

  const recomputeQuality = () => {
    setItem((prev) => {
      const next = { ...prev };
      next.icon = editorIcon(next, slot, job);
      next.quality = next.unic ? 'unique' : qualityFor(next.enchants);
      return next;
    });
  };

  const handleSave = () => {
    if (!item.name || (!item.type && /weapons|offhands/.test(slot))) {
      setError(t('NameTypeRequired') === 'NameTypeRequired' ? 'Name and type are required.' : t('NameTypeRequired'));
      return;
    }
    const next = { ...item };
    next.icon = editorIcon(next, slot, job);
    next.quality = next.unic ? 'unique' : qualityFor(next.enchants);
    onSave(slot, next);
  };

  const resetAll = () => {
    const fresh = emptyEquip(slot, job);
    setItem(fresh);
    setQuery('');
  };

  const weaponsTypes = job === 'RNG'
    ? [['shortbow', 'longbow']]
    : job === 'SW' ? [['wand', 'staff']]
      : job === 'DWF' ? [['pistol', 'rifle']]
        : [['axe', 'mace', 'sword'], ['greataxe', 'hammer', 'greatsword']];
  const offhandTypes = job === 'RNG' ? ['shield', 'quiver'] : job === 'SW' ? ['orb', 'book'] : job === 'DWF' ? ['shield', 'wrench'] : ['shield'];

  const gemList = useMemo(() => {
    // L'ancien code filtrait via `[gem.slots] | filter:editor.slot`
    // `slots` liste les emplacements compatibles en PascalCase (Weapons, Ring1…)
    const slotName = SLOT_TO_GEM[slot] || slot;
    return (catalog.gemsList || []).filter((g) => {
      const list = g.slotList || String(g.slots || '').split(',').map((x) => x.trim());
      return list.includes(slotName);
    });
  }, [catalog.gemsList, slot]);

  const gemsByCategory = useMemo(() => {
    const groups = {};
    for (const g of gemList) {
      const cat = g.category || 'Other';
      groups[cat] = groups[cat] || [];
      groups[cat].push(g);
    }
    return groups;
  }, [gemList]);

  return (
    <div className="editor-overlay" role="dialog" aria-modal="true" aria-label={t('editorTitle')}>
      <div className="editor panel">
        <div className="panel__header">
          <h2>{t('editorTitle')} — {t(`slot.${slot}`)}</h2>
        </div>
        <div className="panel__body">
          <div className="editor__top">
            <div className="editor__preview">
              <div className={`editor__icon quality-${item.quality || 'empty'}`}>
                <ItemIcon icon={item.icon} alt={item.name || 'item'} fallback="◈" />
              </div>
              <div className="editor__meta">
                <div className={`editor__name quality-${item.quality || 'empty'}`}>
                  {item.name || t('noItem')}
                </div>
                <div className="small muted">
                  {item.type ? t(item.type) : ''} {item.unic ? '· ★' : ''}
                </div>
              </div>
            </div>

            <div className="field editor__search">
              <label htmlFor="itemName">{t('itemName')}</label>
              <input
                id="itemName"
                ref={searchRef}
                className="input"
                value={query}
                placeholder={t('pickFromDatabase')}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowList(true);
                  set({ name: e.target.value });
                }}
                onFocus={() => setShowList(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
              else if (e.key === 'Escape') onCancel();
                }}
              />
              {showList && options.length > 0 ? (
                <ul className="editor__list">
                  {options.map((entry) => (
                    <li key={entry.key}>
                      <button type="button" onClick={() => pickItem(entry)}>
                        <ItemIcon icon={entry.icon} alt="" fallback="◈" />
                        <span>{localizedName(catalog[`${category}Names`], entry, lang, entry.key)}</span>
                        <span className={`small ${entry.unic ? 'quality-unique' : 'muted'}`}>
                          {entry.unic ? '★' : ''} {entry.level ? `Lv ${entry.level}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/weapons|offhands/.test(slot) ? (
              <div className="field">
                <label>{t('itemType')}</label>
                <select
                  className="input"
                  value={item.type || ''}
                  onChange={(e) => {
                    const type = e.target.value;
                    set({
                      type,
                      TwoHandedWeapon: /greatsword|greataxe|hammer|staff|longbow|rifle/.test(type),
                    });
                  }}
                >
                  <option value="">—</option>
                  {[].concat(...weaponsTypes).map((tp) => (
                    <option key={tp} value={tp}>{t(tp)}</option>
                  ))}
                  {slot === 'offhands' ? offhandTypes.map((tp) => (
                    <option key={tp} value={tp}>{t(tp)}</option>
                  )) : null}
                </select>
              </div>
            ) : null}
          </div>

          <div className="divider" />

          {template.length ? (
            <section className="editor__section">
              <h3 className="editor__sectionTitle">{t('baseStats')}</h3>
              <div className="grid-3">
                {template.map((label) => (
                  <div className="field" key={label}>
                    <label>{t(label)}</label>
                    <input
                      className="input"
                      type="number"
                      step={label === 'speedbase' ? '0.01' : '1'}
                      value={item.basestats?.find((b) => b.label === label)?.value ?? 0}
                      onChange={(e) => setBase(label, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="editor__section">
            <h3 className="editor__sectionTitle">{t('enchants')}</h3>
            <div className="editor__enchants">
              {(item.enchants || []).map((ench, idx) => (
                <div className="editor__enchant" key={idx}>
                  <select
                    className="input"
                    value={ench.label || ''}
                    onChange={(e) => { setEnchant(idx, { label: e.target.value }); setTimeout(recomputeQuality, 0); }}
                  >
                    <option value="">{t('emptyEnchant')}</option>
                    <optgroup label={t('sys64') === 'sys64' ? 'Offensive' : t('sys64')}>
                      {off.map((s) => <option key={s} value={s}>{STAT_LABELS[s] ? t(s) : (customStats.find((c) => c.id === s)?.label || s)}</option>)}
                    </optgroup>
                    <optgroup label={t('sys65') === 'sys65' ? 'Defensive' : t('sys65')}>
                      {def.map((s) => <option key={s} value={s}>{STAT_LABELS[s] ? t(s) : (customStats.find((c) => c.id === s)?.label || s)}</option>)}
                    </optgroup>
                  </select>
                  <input
                    className="input editor__enchantValue"
                    type="number"
                    step="0.01"
                    value={ench.value ?? 0}
                    onChange={(e) => { setEnchant(idx, { value: Number(e.target.value) }); setTimeout(recomputeQuality, 0); }}
                  />
                  <span className="editor__hint small muted">
                    {STAT_LABELS[ench.label]?.hint?.[lang] || (Math.abs(Number(ench.value)) <= 2 ? '%' : '')}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {slot !== 'mantles' ? (
            <section className="editor__section">
              <h3 className="editor__sectionTitle">{t('gemSlots')}</h3>
              <div className="editor__gems">
                {(item.gems || []).map((gem, idx) => {
                  const info = gem.key !== 'nogem' ? catalog.gemsById[gem.key] : null;
                  return (
                    <div className="editor__gem" key={idx}>
                      <button
                        type="button"
                        className="editor__gemBtn"
                        onClick={() => setGemOpen(gemOpen === idx ? null : idx)}
                        title={t('socket')}
                      >
                        {info ? <ItemIcon icon={info.icon} alt="" fallback="◈" /> : <span className="editor__socket">◈</span>}
                        <span>{info ? localizedName(catalog.gemsNames, info, lang, gem.key) : t('nogem')}</span>
                      </button>
                      {gemOpen === idx ? (
                        <div className="editor__gemList">
                          <button type="button" className="editor__gemItem" onClick={() => { setGem(idx, 'nogem'); setGemOpen(null); }}>
                            {t('nogem')}
                          </button>
                          {Object.entries(gemsByCategory).map(([cat, list]) => (
                            <div key={cat} className="editor__gemGroup">
                              <h4>{cat}</h4>
                              {list.map((g) => (
                                <button
                                  key={g.key}
                                  type="button"
                                  className="editor__gemItem"
                                  onClick={() => { setGem(idx, g.key); setGemOpen(null); }}
                                >
                                  <ItemIcon icon={g.icon} alt="" fallback="◈" />
                                  <span>{localizedName(catalog.gemsNames, g, lang, g.key)}</span>
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="editor__footer">
            <div className="field editor__reqlvl">
              <label>{t('requiredLevel')}</label>
              <input
                className="input"
                type="number"
                min="1"
                value={item.reqlvl ?? 1}
                onChange={(e) => set({ reqlvl: Number(e.target.value) })}
              />
            </div>
            {error ? <p className="notice notice--warn">{error}</p> : null}
            <div className="row">
              <button type="button" className="btn btn--bronze" onClick={handleSave}>{t('saveItem')}</button>
              <button type="button" className="btn btn--ghost" onClick={onCancel}>{t('cancel')}</button>
              <button type="button" className="btn btn--ghost" onClick={resetAll}>{t('reset')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
