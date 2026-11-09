import React, { useMemo, useState } from 'react';
import { isSlotEmpty } from '../state/build.js';
import ItemIcon from './ItemIcon.jsx';
import './gear.css';

/**
 * Rack d'équipement : 13 emplacements disposés autour du portrait du personnage,
 * à la manière de l'éditeur historique. Chaque case affiche l'icône de l'objet et
 * ouvre l'éditeur au clic (clic-droit = vider).
 */
export const LEFT_SLOTS = ['amulets', 'waists', 'weapondecorations', 'ring1', 'essences', 'ring2', 'weapons'];
export const RIGHT_SLOTS = ['headarmors', 'shoulders', 'torsos', 'gloves', 'mantles', 'boots', 'offhands'];

/** Copie explicite du DOMRect (plus sûr que `toJSON`, absent de certains moteurs). */
function rectOf(el, slot) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return null;
  const r = el.getBoundingClientRect();
  return {
    slot, top: r.top, left: r.left, right: r.right, bottom: r.bottom,
    width: r.width, height: r.height,
  };
}

function GearSlot({ slot, icon, name, quality, unic, onOpen, onClear, t, hint, onHover }) {
  return (
    <button
      type="button"
      onMouseEnter={(e) => onHover?.(rectOf(e.currentTarget, slot))}
      onMouseLeave={() => onHover?.(null)}
      onFocus={(e) => onHover?.(rectOf(e.currentTarget, slot))}
      onBlur={() => onHover?.(null)}
      className={`gear-slot${icon ? ' has-item' : ''} quality-${quality || 'empty'}`}
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        onClear();
      }}
      title={`${name || t('noItem')} — ${t('clickToEdit')}`}
      data-slot={slot}
    >
      <span className="gear-slot__frame" aria-hidden="true" />
      {icon
        ? <ItemIcon icon={icon} alt={name || slot} draggable={false} fallback={(name || slot).slice(0, 2)} />
        : <span className="gear-slot__empty" />}
      <span className="gear-slot__label">{hint}</span>
      {unic ? <span className="gear-slot__uniq" aria-label="unique">★</span> : null}
    </button>
  );
}

export default function GearRack({
  build,
  catalog,
  t,
  onOpenEditor,
  onClearSlot,
  onEssenceClick,
  onHover,
  selectedEssence,
}) {
  const [hovered, setHovered] = useState(null);
  const job = build.job;
  const is2H = !!build.slots.weapons?.TwoHandedWeapon;

  const slotInfo = (slot) => {
    if (slot === 'essences') {
      const ess = catalog.essences[selectedEssence];
      return {
        icon: ess && selectedEssence !== 'blank' ? `Essence${ess.icon}` : null,
        name: ess ? ess.name?.eng || selectedEssence : '',
        quality: 'magic',
      };
    }
    const equip = build.slots[slot];
    if (!equip) return { icon: null };
    const empty = isSlotEmpty(equip);
    return {
      icon: empty ? null : equip.icon,
      name: empty ? '' : equip.names?.eng || equip.name,
      quality: equip.quality,
      unic: equip.unic,
    };
  };

  const portrait = useMemo(() => `./images/Portrait${job}.png`, [job]);

  const renderSlot = (slot) => {
    const info = slotInfo(slot);
    const disabled = slot === 'offhands' && is2H && job !== 'RNG';
    return (
      <GearSlot
        key={slot}
        slot={slot}
        icon={info.icon}
        name={info.name}
        quality={info.quality}
        unic={info.unic}
        t={t}
        hint={t(`slot.${slot}`)}
        onHover={slot === 'essences' ? undefined : onHover}
        onOpen={(e) => {
          if (disabled) return;
          if (slot === 'essences') onEssenceClick?.(e);
          else onOpenEditor(slot);
        }}
        onClear={() => onClearSlot(slot)}
      />
    );
  };

  return (
    <div
      className="gear-rack"
      onMouseLeave={() => setHovered(null)}
      data-hovered={hovered || ''}
    >
      <div className="gear-col gear-col--left">{LEFT_SLOTS.map(renderSlot)}</div>

      <div className="gear-portrait">
        <div className="gear-portrait__frame">
          <img src={portrait} alt={job} />
          <div className="gear-portrait__glow" />
        </div>
        <div className="gear-portrait__class">{t(`class.${job}`)}</div>
        <div className="gear-portrait__level">
          {t('chooseLevel')} <b>{build.level}</b>
        </div>
      </div>

      <div className="gear-col gear-col--right">{RIGHT_SLOTS.map(renderSlot)}</div>
    </div>
  );
}
