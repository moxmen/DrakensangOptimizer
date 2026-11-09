import React, { useMemo } from 'react';
import { localizedName, localizedDescription } from '../data/catalog.js';
import './talents.css';

const LEVELS = [5, 10, 15, 20, 25, 30, 35, 40, 45];

/**
 * Arbres de talents (Expérience + Notoriété).
 * Sémantique identique à l'ancienne version : `selectedTalents[arbre][indexLigne]`.
 */
export default function TalentsPanel({ build, catalog, t, lang, onToggleTalent }) {
  const talents = Object.values(catalog.talentsById || {});

  const trees = useMemo(
    () => [
      { key: 'ExpTree', label: t('expTree'), maxLevel: build.level, enabled: true },
      // L'ancienne version n'ouvrait l'arbre PvP qu'en mode JcJ et selon le niveau JcJ
      { key: 'PvPtree', label: t('pvpTree'), maxLevel: build.pvpLevel, enabled: build.pvpLevel > 0 },
    ],
    [t, build.level, build.pvpLevel],
  );

  return (
    <div className="panel">
      <div className="panel__header"><h2>{t('talentsTitle')}</h2></div>
      <div className="panel__body talents">
        {trees.map((tree) => {
          const selected = build.talents[tree.key] || [];
          return (
            <section key={tree.key} className={`talents__tree${tree.enabled ? '' : ' is-disabled'}`}>
              <header className="talents__treeHead">
                <h3>{tree.label}</h3>
                <span className="chip">{selected.filter(Boolean).length} / {LEVELS.filter((l) => l <= tree.maxLevel).length}</span>
              </header>
              {!tree.enabled ? <p className="small muted">{t('pvpTree')} — {t('vsPlayer')}</p> : null}
              <div className="talents__grid">
                {LEVELS.map((lvl, rowIndex) => {
                  const rowTalents = talents.filter(
                    (tl) => tl.category === tree.key && tl.level === lvl
                      && (!tl.jobs.length || tl.jobs.includes(build.job)),
                  );
                  const available = lvl <= tree.maxLevel && tree.enabled;
                  return (
                    <div className={`talents__row${available ? '' : ' is-locked'}`} key={lvl}>
                      <span className="talents__lvl">Lv {lvl}</span>
                      <div className="talents__slots">
                        {rowTalents.length === 0 ? <span className="talents__empty">—</span> : rowTalents.map((tl) => {
                          const active = selected[rowIndex] === tl.key;
                          const name = localizedName(catalog.talentsNames, tl, lang, tl.key);
                          return (
                            <button
                              key={tl.key}
                              type="button"
                              className={`talent${active ? ' is-active' : ''}`}
                              disabled={!available}
                              onClick={() => onToggleTalent(tree.key, rowIndex, active ? '' : tl.key)}
                              title={`${name}${localizedDescription(catalog.talentsNames, tl, lang) ? ` — ${localizedDescription(catalog.talentsNames, tl, lang)}` : ''}`}
                            >
                              <img src={`./images/${tl.icon}.png`} alt="" />
                              <span>{name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
