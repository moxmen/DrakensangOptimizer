import React from 'react';
import { formatNumber, formatPercent } from '../data/labels.js';
import './stats.css';

const StatRow = ({ label, value, extra, bar }) => (
  <tr>
    <td>{label}</td>
    <td>
      {value}
      {extra ? <span className="muted"> {extra}</span> : null}
      {bar !== undefined ? (
        <div className={`meter ${bar.cls || ''}`} style={{ marginTop: 4 }}>
          <div className="meter__fill" style={{ width: `${Math.min(100, Math.max(0, bar.value * 100))}%` }} />
        </div>
      ) : null}
    </td>
  </tr>
);

/**
 * Feuille de personnage : DPS, puissance, défenses.
 * Les chiffres proviennent exclusivement de engine/stats.js (formules legacy).
 */
export default function StatsPanel({ result, build, t, lang }) {
  if (!result) return null;
  const { gs, percentages, dps } = result;
  const mean = (gs.damagemin.Total + gs.damagemax.Total) / 2;
  const critMultiplier = 2 + gs.critboost.Total;

  return (
    <div className="stats-wrap">
      <div className="panel">
        <div className="panel__header"><h2>{t('statisticsTitle')}</h2></div>
        <div className="panel__body stats-hero">
          <div className="stats-hero__dps">
            <span className="dps-unit">{t('dps')}</span>
            <span className="dps-huge">{formatNumber(dps, lang, 2)}</span>
            <span className="dps-unit">{t('SpeedUnit') === 'SpeedUnit' ? 'dmg/s' : t('SpeedUnit').trim()}</span>
          </div>
          <div className="stats-hero__side">
            <div className="stat-line">
              <span className="label">{t('damageRange')}</span>
              <b>{formatNumber(gs.damagemin.Total, lang)} – {formatNumber(gs.damagemax.Total, lang)}</b>
            </div>
            <div className="stat-line">
              <span className="label">{t('meanDamage')}</span>
              <b>{formatNumber(mean, lang)}</b>
            </div>
            <div className="stat-line">
              <span className="label">{t('attackSpeed')}</span>
              <b>{formatNumber(gs.speed.Total, lang, 3)}/s</b>
            </div>
          </div>
        </div>
        <div className="panel__body stats-breakdown">
          <p className="stats-formula">
            <span className="label">{t('dpsBreakdown')}</span>
            <code>
              (1 − {formatPercent(percentages.critrate, lang, 2)} + {formatPercent(percentages.critrate, lang, 2)}
              {' × '}{formatNumber(critMultiplier, lang, 2)}) × {formatNumber(mean, lang)} × {formatNumber(gs.speed.Total, lang, 3)}
            </code>
          </p>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel panel--steel">
          <div className="panel__header"><h2>{t('offense')}</h2></div>
          <div className="panel__body">
            <table className="stat-table">
              <tbody>
                <StatRow label={t('damage')} value={formatNumber(gs.damage.Total, lang)} />
                <StatRow label={t('damagemin')} value={formatNumber(gs.damagemin.Total, lang)} />
                <StatRow label={t('damagemax')} value={formatNumber(gs.damagemax.Total, lang)} />
                <StatRow label={t('damagepve')} value={formatPercent(gs.damagepve.Total, lang, 1)} />
                <StatRow label={t('damagepvp')} value={formatPercent(gs.damagepvp.Total, lang, 1)} />
                <StatRow label={t('weapondamageboost')} value={formatPercent(gs.weapondamageboost.Total, lang, 1)} />
                <StatRow
                  label={t('critrate')}
                  value={formatPercent(percentages.critrate, lang, 2)}
                  extra={`(${formatNumber(gs.critrate.Total, lang)})`}
                  bar={{ value: percentages.critrate, cls: 'meter--steel' }}
                />
                <StatRow label={t('critboost')} value={formatPercent(critMultiplier - 1, lang, 0)} />
                <StatRow label={t('speed')} value={formatNumber(gs.speed.Total, lang, 3)} />
                <StatRow label={t('movspeed')} value={formatPercent(gs.movspeed.Total, lang, 0)} />
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel panel--steel">
          <div className="panel__header"><h2>{t('defensePanel')}</h2></div>
          <div className="panel__body">
            <table className="stat-table">
              <tbody>
                <StatRow
                  label={t('life')}
                  value={formatNumber(gs.life.Total, lang)}
                  extra={`(${formatNumber(gs.regen.Total, lang, 2)}/s)`}
                />
                <StatRow
                  label={t('armor')}
                  value={formatPercent(percentages.armor, lang, 2)}
                  extra={`(${formatNumber(gs.armor.Total, lang)})`}
                  bar={{ value: percentages.armor }}
                />
                <StatRow
                  label={t('block')}
                  value={formatPercent(percentages.blockrate, lang, 2)}
                  extra={`(${formatNumber(gs.blockrate.Total, lang)})`}
                  bar={{ value: percentages.blockrate, cls: 'meter--verd' }}
                />
                <StatRow
                  label={t('blockReduction')}
                  value={formatPercent(percentages.blockeddmg, lang, 2)}
                  extra={`(${formatNumber(gs.blockeddmg.Total, lang)})`}
                  bar={{ value: percentages.blockeddmg, cls: 'meter--verd' }}
                />
                {['fire', 'ice', 'lightning', 'poison', 'andermagic'].map((el) => (
                  <StatRow
                    key={el}
                    label={t(el)}
                    value={formatPercent(percentages[el], lang, 2)}
                    extra={`(${formatNumber(gs[el].Total, lang)})`}
                    bar={{ value: percentages[el], cls: 'meter--steel' }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__header"><h2>{t('setBonuses')}</h2></div>
        <div className="panel__body">
          {result.setsBonuses.length === 0 ? (
            <p className="muted small">{t('noResults')}</p>
          ) : (
            <ul className="set-list">
              {result.setsBonuses.map((set) => (
                <li key={set.key}>
                  <div className="set-list__title">
                    <span className="quality-unique">{set.name || set.key}</span>
                    <span className="chip">{set.count}/{set.maxcount} {t('pieces')}</span>
                  </div>
                  <ul className="set-list__bonuses">
                    {Object.entries(set)
                      .filter(([k]) => !['count', 'maxcount', 'key', 'name'].includes(k) && !k.startsWith('skill'))
                      .map(([k, v]) => (
                        <li key={k}>
                          <span>{t(k.replace('boost', ''))}</span>
                          <b>{formatPercent(v, lang, 0)}</b>
                        </li>
                      ))}
                    {Object.entries(set)
                      .filter(([k]) => k.startsWith('skill'))
                      .map(([k, v]) => (
                        <li key={k}>
                          <span>{t('skillName')}: {v[0]}</span>
                          <b>{formatPercent(v[1], lang, 0)}</b>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="small muted stats-footnote">
        {t('formula')} — {t('formulaText')}
      </p>
      <p className="small muted stats-footnote">{t('poweredBy')}</p>
      <p className="small muted">Lv {build.level} · {t('knowledge')} {build.knowledge} · PvP {build.pvpLevel}</p>
    </div>
  );
}
