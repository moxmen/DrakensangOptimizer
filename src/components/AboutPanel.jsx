import React from 'react';
import './about.css';

/** Page « À propos » : crédits, formules, sources de données. */
export default function AboutPanel({ t, catalog }) {
  const meta = catalog?.meta || {};
  const counts = [
    ['weapons', 'weapon'], ['torsos', 'defense'], ['skills', 'skillsTitle'],
    ['talents', 'talentsTitle'], ['sets', 'setBonuses'], ['gems', 'gems'],
  ];
  return (
    <div className="about">
      <div className="panel">
        <div className="panel__header"><h2>{t('aboutTitle')}</h2></div>
        <div className="panel__body">
          <p className="about__lead">{t('aboutBody')}</p>
          <div className="divider" />
          <div className="about__counts">
            {counts.map(([cat, label]) => (
              <div className="about__count" key={cat}>
                <b>{catalog ? (catalog[cat] || []).length : '—'}</b>
                <span>{t(label)}</span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <h3 className="about__sub">{t('formula')}</h3>
          <p className="about__formula">{t('formulaText')}</p>
          <p className="about__formula">
            speed = (weapon speed × (1 + ench)) × (1 + Σ speed)<br />
            DPS = (1 − crit + crit × (2 + crit boost)) × meanDamage × speed
          </p>
          <div className="divider" />
          <p className="small muted">
            {t('poweredBy')} · {meta.source || 'DrakensangOptimizer'} {meta.version ? `v${meta.version}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
