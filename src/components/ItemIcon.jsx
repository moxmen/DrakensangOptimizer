import React, { useState } from 'react';

/**
 * Icône d'objet tolérante : si le PNG n'existe pas dans `public/images`
 * (quelques entrées de l'ancienne base n'ont jamais eu d'illustration), on
 * affiche un cartouche avec les initiales au lieu d'une image cassée.
 */
export default function ItemIcon({ icon, alt = '', fallback = '?', className, style, draggable }) {
  const [failed, setFailed] = useState(false);
  if (!icon || failed) {
    return (
      <span className={`item-icon-fallback ${className || ''}`} style={style} aria-label={alt} title={alt} role="img">
        {fallback}
      </span>
    );
  }
  return (
    <img
      src={`./images/${icon}.png`}
      alt={alt}
      className={className}
      style={style}
      draggable={draggable}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
