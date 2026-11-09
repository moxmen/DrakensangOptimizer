import React from 'react';
import { localizedName } from '../data/catalog.js';
import './essence.css';

/**
 * Sélecteur de joaillerie (essence) — l'ancienne version utilisait une liste
 * déroulante dans les réglages ; on propose ici une grille illustrée qui
 * s'ouvre directement depuis l'emplacement « essence » du rack.
 */
export default function EssencePicker({ catalog, lang, t, value, onChange, onClose }) {
  const list = catalog.essencesList || [];
  return (
    <div className="essence-overlay" role="dialog" aria-modal="true" aria-label={t('essence')} onClick={onClose}>
      <div className="essence panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel__header">
          <h2>{t('essence')}</h2>
        </div>
        <div className="panel__body">
          <div className="essence__grid">
            {list.map((ess) => {
              const active = value === ess.key;
              return (
                <button
                  key={ess.key}
                  type="button"
                  className={`essence__item${active ? ' is-active' : ''}`}
                  onClick={() => { onChange(ess.key); onClose(); }}
                >
                  <img src={`./images/Essence${ess.icon}.png`} alt="" />
                  <span className="essence__name">{localizedName(catalog.essencesNames, ess, lang, ess.key)}</span>
                  <span className="essence__stats small muted">
                    {Object.entries(ess.stats || {}).map(([k, v]) => (
                      <em key={k}>{t(k)} +{Math.abs(Number(v)) <= 2 ? `${(Number(v) * 100).toFixed(0)}%` : v}</em>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>{t('close')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
