import React, { useMemo, useState } from 'react';
import { localizedName, localizedDescription } from '../data/catalog.js';
import { formatNumber } from '../data/labels.js';
import ItemIcon from './ItemIcon.jsx';
import './skills.css';

/** Tableau des dégâts par compétence (valeurs issues de engine/stats.js). */
export default function SkillsPanel({ result, build, catalog, t, lang, extended, setExtended }) {
  const [sort, setSort] = useState('level');

  const rows = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.skills)
      .map(([key, dmg]) => {
        const skill = catalog.skillsById[key];
        if (!skill) return null;
        const step = result.speedSteps[key];
        return {
          key,
          skill,
          dmg,
          step,
          name: localizedName(catalog.skillsNames, skill, lang, key),
          description: localizedDescription(catalog.skillsNames, skill, lang),
        };
      })
      .filter(Boolean)
      .filter((row) => {
        const jobs = row.skill.jobs || [];
        if (jobs.length && !jobs.includes(build.job)) return false;
        const level = row.skill.level ?? 1;
        const pvpReq = row.skill.stats.pvpreqlvl || 0;
        return (level <= build.level || level === 999) && pvpReq <= build.pvpLevel;
      })
      .filter((row) => row.dmg.min || row.dmg.max || row.dmg.critmin || row.dmg.critmax)
      .sort((a, b) => (sort === 'dps'
        ? (b.step?.dps || 0) - (a.step?.dps || 0)
        : (a.skill.level ?? 0) - (b.skill.level ?? 0)));
  }, [result, catalog, lang, build.level, build.pvpLevel, build.job, sort]);

  return (
    <div className="panel">
      <div className="panel__header"><h2>{t('skillsTitle')}</h2></div>
      <div className="panel__body">
        <div className="skills-toolbar">
          <label className="check">
            <input type="checkbox" checked={extended} onChange={(e) => setExtended(e.target.checked)} />
            <span className="check__box" />
            <span>{t('speedTiers')}</span>
          </label>
          <div className="segmented">
            <button type="button" className={sort === 'level' ? 'is-active' : ''} onClick={() => setSort('level')}>
              {t('level')}
            </button>
            <button type="button" className={sort === 'dps' ? 'is-active' : ''} onClick={() => setSort('dps')}>
              DPS
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="notice">{t('noResults')}</p>
        ) : (
          <div className="skills-tableWrap">
            <table className="skills-table">
              <thead>
                <tr>
                  <th colSpan={2}>{t('skillName')}</th>
                  <th>{t('normal')}</th>
                  <th>{t('critical')}</th>
                  {extended ? <th>{t('speedTiers')} / DPS</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ key, skill, dmg, step, name, description }) => (
                  <tr key={key} title={description}>
                    <td className="skills-table__icon">
                      <ItemIcon icon={skill.icon} alt="" fallback="✦" />
                    </td>
                    <td className="skills-table__name">
                      <span>{name}</span>
                      <span className="skills-table__level">Lv {skill.level === 999 ? 'PvP' : skill.level}</span>
                    </td>
                    <td className="skills-table__dmg">
                      {formatNumber(dmg.min, lang)}
                      {dmg.min !== dmg.max ? ` – ${formatNumber(dmg.max, lang)}` : ''}
                    </td>
                    <td className="skills-table__dmg skills-table__dmg--crit">
                      {formatNumber(dmg.critmin, lang)}
                      {dmg.critmin !== dmg.critmax ? ` – ${formatNumber(dmg.critmax, lang)}` : ''}
                    </td>
                    {extended ? (
                      <td className="skills-table__speed">
                        {step ? (
                          <>
                            <div className="mono small">{formatNumber(step.min, lang, 3)} – {formatNumber(step.max, lang, 3)}</div>
                            <div className="mono skills-table__dps">{formatNumber(step.dps, lang, 1)}</div>
                          </>
                        ) : '—'}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
