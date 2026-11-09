import React from 'react';
import { formatStatValue } from '../data/labels.js';
import { localizedName } from '../data/catalog.js';
import ItemIcon from './ItemIcon.jsx';

/**
 * Infobulle d'objet : nom coloré selon la rareté, type, stats de base,
 * enchantements, gemmes et niveau requis (même contenu que l'ancien tooltip).
 */
export default function ItemTooltip({ equip, rect, catalog, t, tSys, lang }) {
  const style = {};
  if (rect) {
    const width = 300;
    const margin = 10;
    const maxLeft = window.innerWidth - width - margin;
    let left = rect.right + margin;
    if (left > maxLeft) left = Math.max(margin, rect.left - width - margin);
    let top = rect.top + rect.height / 2 - 80;
    top = Math.max(margin, Math.min(top, window.innerHeight - 260));
    style.left = left;
    style.top = top;
    style.width = width;
  }

  const name = localizedName(null, { name: equip.names }, lang, equip.name);
  const typeKey = equip.TwoHandedWeapon ? 'Type_2H' : 'Type_1H';
  const typeLabel = equip.type ? t(equip.type) : '';
  const qualityWord = equip.unic ? tSys('Preview') : '';

  return (
    <div className="tooltip" style={style} role="tooltip">
      <div className={`tooltip__title quality-${equip.quality || 'empty'}`}>{name}</div>
      <div className="tooltip__type">
        {/weapons/.test(equip.type || '') || equip.TwoHandedWeapon
          ? `${t(typeKey)} · ${typeLabel}`
          : typeLabel || qualityWord}
      </div>
      {(equip.basestats || []).filter((b) => Number(b.value)).map((b) => (
        <div className="tooltip__row" key={b.label}>
          <span>{t(b.label)}</span>
          <span>{formatStatValue(b.label, b.value, lang)}</span>
        </div>
      ))}
      {(equip.enchants || []).filter((e) => e.label && Number(e.value)).map((e, i) => (
        <div className="tooltip__row" key={`${e.label}-${i}`}>
          <span>{t(e.label.replace('boost', ''))}</span>
          <span>+{formatStatValue(e.label, e.value, lang)}</span>
        </div>
      ))}
      {(equip.gems || []).filter((g) => g.key && g.key !== 'nogem').map((g, i) => {
        const gem = catalog.gemsById[g.key];
        if (!gem) return null;
        return (
          <div className="tooltip__gems" key={`${g.key}-${i}`}>
            <ItemIcon
              icon={gem.icon}
              alt=""
              fallback="◈"
              style={{ width: 18, height: 18, verticalAlign: '-4px', marginInlineEnd: 6 }}
            />
            {localizedName(catalog.gemsNames, gem, lang, g.key)}
          </div>
        );
      })}
      <div className="tooltip__row" style={{ marginTop: 8, color: 'var(--text-muted)' }}>
        <span>{t('requiredLevel')}</span>
        <span>{equip.reqlvl}</span>
      </div>
    </div>
  );
}
