import React from 'react';
import { JOBS } from '../engine/stats.js';
import { localizedName } from '../data/catalog.js';
import './settings.css';

/** Panneau « personnage / adversaire » + sélecteurs de compagnon et d'essence. */
export default function BuildSettings({ build, catalog, t, update, lang }) {
  const set = (patch) => update(patch);

  const pets = Object.values(catalog.companionsById || {});
  const essences = Object.values(catalog.essencesById || {});

  return (
    <div className="settings">
      <div className="panel">
        <div className="panel__header"><h2>{t('nav.builder')}</h2></div>
        <div className="panel__body settings__grid">
          <div className="field">
            <label>{t('chooseClass')}</label>
            <div className="jobs">
              {JOBS.map((job) => (
                <button
                  key={job}
                  type="button"
                  className={`job-btn${build.job === job ? ' is-active' : ''}`}
                  onClick={() => set({ job })}
                  title={t(`class.${job}`)}
                >
                  <img src={`./images/${job}.png`} alt={job} />
                  <span>{t(`class.${job}`)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings__row">
            <div className="field">
              <label>{t('chooseLevel')}</label>
              <input
                className="input"
                type="number"
                min="1"
                max={catalog.meta.maxLevel}
                value={build.level}
                onChange={(e) => set({ level: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>{t('knowledge')}</label>
              <input
                className="input"
                type="number"
                min="0"
                max="45"
                value={build.knowledge}
                onChange={(e) => set({ knowledge: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>{t('pvpLevel')}</label>
              <input
                className="input"
                type="number"
                min="0"
                max="45"
                disabled={build.opponent !== 'pvp'}
                value={build.pvpLevel}
                onChange={(e) => set({ pvpLevel: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="settings__row">
            <div className="field">
              <label>{t('pet')}</label>
              <select className="input" value={build.pet} onChange={(e) => set({ pet: e.target.value })}>
                {pets.map((p) => (
                  <option key={p.key} value={p.key}>{localizedName(catalog.companionsNames, p, lang, p.key)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t('essence')}</label>
              <select className="input" value={build.essence} onChange={(e) => set({ essence: e.target.value })}>
                {essences.map((p) => (
                  <option key={p.key} value={p.key}>{localizedName(catalog.essencesNames, p, lang, p.key)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="panel panel--steel">
        <div className="panel__header"><h2>{t('opponent')}</h2></div>
        <div className="panel__body settings__grid">
          <div className="segmented">
            <button
              type="button"
              className={build.opponent === 'pve' ? 'is-active' : ''}
              onClick={() => set({ opponent: 'pve' })}
            >
              {t('vsMonster')}
            </button>
            <button
              type="button"
              className={build.opponent === 'pvp' ? 'is-active' : ''}
              onClick={() => set({ opponent: 'pvp' })}
            >
              {t('vsPlayer')}
            </button>
          </div>

          <div className="settings__row">
            <div className="field">
              <label>{t('opponentLevel')}</label>
              <input
                className="input"
                type="number"
                min="1"
                max={catalog.meta.maxLevel}
                value={build.opponentLevel}
                onChange={(e) => set({ opponentLevel: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>{t('physResist')} %</label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(build.opponentDefense * 100)}
                onChange={(e) => set({ opponentDefense: Number(e.target.value) / 100 })}
              />
            </div>
            <div className="field">
              <label>{t('elemResist')} %</label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(build.opponentResist * 100)}
                onChange={(e) => set({ opponentResist: Number(e.target.value) / 100 })}
              />
            </div>
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={build.marked}
              onChange={(e) => set({ marked: e.target.checked })}
            />
            <span className="check__box" />
            <span>{t('marked')}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
