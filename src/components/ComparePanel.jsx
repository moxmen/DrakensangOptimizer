import React, { useMemo } from 'react';
import { computeBuild } from '../engine/stats.js';
import { serializeProfile } from '../state/build.js';
import { formatNumber, formatPercent } from '../data/labels.js';
import './compare.css';

const METRICS = [
  { key: 'dps', labelKey: 'dps', get: (r) => r.dps, fmt: 'num2', better: 'high' },
  { key: 'min', labelKey: 'damagemin', get: (r) => r.gs.damagemin.Total, fmt: 'num', better: 'high' },
  { key: 'max', labelKey: 'damagemax', get: (r) => r.gs.damagemax.Total, fmt: 'num', better: 'high' },
  { key: 'crit', labelKey: 'critChance', get: (r) => r.percentages.critrate, fmt: 'pct', better: 'high' },
  { key: 'critdmg', labelKey: 'critDamage', get: (r) => 2 + r.gs.critboost.Total, fmt: 'pct0', better: 'high' },
  { key: 'speed', labelKey: 'attackSpeed', get: (r) => r.gs.speed.Total, fmt: 'num3', better: 'high' },
  { key: 'life', labelKey: 'life', get: (r) => r.gs.life.Total, fmt: 'num', better: 'high' },
  { key: 'armor', labelKey: 'armor', get: (r) => r.percentages.armor, fmt: 'pct', better: 'high' },
  { key: 'block', labelKey: 'block', get: (r) => r.percentages.blockrate, fmt: 'pct', better: 'high' },
  { key: 'fire', labelKey: 'fire', get: (r) => r.percentages.fire, fmt: 'pct', better: 'high' },
  { key: 'ice', labelKey: 'ice', get: (r) => r.percentages.ice, fmt: 'pct', better: 'high' },
  { key: 'lightning', labelKey: 'lightning', get: (r) => r.percentages.lightning, fmt: 'pct', better: 'high' },
  { key: 'poison', labelKey: 'poison', get: (r) => r.percentages.poison, fmt: 'pct', better: 'high' },
  { key: 'andermagic', labelKey: 'andermagic', get: (r) => r.percentages.andermagic, fmt: 'pct', better: 'high' },
];

function fmt(kind, value, lang) {
  switch (kind) {
    case 'pct': return formatPercent(value, lang, 2);
    case 'pct0': return formatPercent(value, lang, 0);
    case 'num2': return formatNumber(value, lang, 2);
    case 'num3': return formatNumber(value, lang, 3);
    default: return formatNumber(value, lang);
  }
}

/**
 * Comparaison de deux builds côte à côte.
 * A = build courant, B = build enregistré (ou importé).
 */
export default function ComparePanel({
  build, catalog, t, lang, compareB, setCompareB, savedBuilds, onUseCurrentAsB, onLoadBuild,
}) {
  const resultA = useMemo(() => computeBuild(build, catalog), [build, catalog]);
  const resultB = useMemo(() => (compareB ? computeBuild(compareB, catalog) : null), [compareB, catalog]);

  return (
    <div className="panel">
      <div className="panel__header"><h2>{t('compareTitle')}</h2></div>
      <div className="panel__body">
        <div className="compare__picker">
          <div className="field">
            <label>{t('buildB')}</label>
            <select
              className="input"
              value={compareB?._id || ''}
              onChange={(e) => {
                const found = savedBuilds.find((b) => b.id === e.target.value);
                setCompareB(found ? found.build : null);
              }}
            >
              <option value="">{t('compareEmpty')}</option>
              {savedBuilds.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn--sm" onClick={onUseCurrentAsB}>
            {t('loadIntoB')}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!compareB}
            onClick={() => {
              const current = JSON.parse(JSON.stringify(build));
              if (compareB) {
                const other = JSON.parse(JSON.stringify(compareB));
                setCompareB(current);
                onLoadBuild?.(other);
              }
            }}
          >
            {t('swap')}
          </button>
        </div>

        {!resultB ? (
          <p className="notice">{t('compareHint')}</p>
        ) : (
          <table className="compare-table">
            <thead>
              <tr>
                <th>{t('statisticsTitle')}</th>
                <th>{t('buildA')}</th>
                <th>{t('buildB')}</th>
                <th>{t('difference')}</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => {
                const a = m.get(resultA);
                const b = m.get(resultB);
                const diff = a - b;
                const pct = b ? (diff / b) * 100 : 0;
                const better = diff > 0 ? 'a' : diff < 0 ? 'b' : 'eq';
                return (
                  <tr key={m.key}>
                    <td>{t(m.labelKey)}</td>
                    <td className={better === 'a' ? 'is-better' : ''}>{fmt(m.fmt, a, lang)}</td>
                    <td className={better === 'b' ? 'is-better' : ''}>{fmt(m.fmt, b, lang)}</td>
                    <td className={`compare-table__diff ${diff > 0 ? 'is-up' : diff < 0 ? 'is-down' : ''}`}>
                      {diff > 0 ? '+' : ''}{fmt(m.fmt, diff, lang)}
                      <span className="small muted"> ({pct > 0 ? '+' : ''}{formatNumber(pct, lang, 1)}%)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
