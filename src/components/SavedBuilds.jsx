import React, { useRef, useState } from 'react';
import { localizedName } from '../data/catalog.js';
import './saved.css';

/** Builds sauvegardés (localStorage) + import / export JSON. */
export default function SavedBuilds({
  build, catalog, t, lang, savedBuilds, onSave, onLoad, onDelete, onDuplicate,
  onImport, onExport, onDownload, onCompare, notify,
}) {
  const [name, setName] = useState('');
  const [raw, setRaw] = useState('');
  const fileRef = useRef(null);

  const summary = (b) => {
    const job = b.job || 'WAR';
    const equipped = Object.entries(b.slots || {})
      .filter(([, e]) => e && e.quality !== 'empty' && e.name)
      .map(([slot, e]) => {
        const cat = catalog.weaponsById[e.hashkey] || null;
        void cat;
        return `${t(`slot.${slot}`)}: ${localizedName(null, { name: e.names }, lang, e.name)}`;
      });
    return { job, count: equipped.length, items: equipped };
  };

  return (
    <div className="saved">
      <div className="panel">
        <div className="panel__header"><h2>{t('savedTitle')}</h2></div>
        <div className="panel__body">
          <div className="saved__saveRow">
            <div className="field">
              <label>{t('buildName')}</label>
              <input
                className="input"
                value={name}
                placeholder={`${t('nav.builder')} — ${build.job} Lv ${build.level}`}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn--bronze"
              onClick={() => {
                onSave(name.trim() || `${build.job} · Lv ${build.level}`);
                setName('');
                notify(t('savedOk'));
              }}
            >
              {t('saveCurrent')}
            </button>
          </div>

          <div className="divider" />

          {savedBuilds.length === 0 ? (
            <p className="muted">{t('noSaved')}</p>
          ) : (
            <ul className="saved__list">
              {savedBuilds.map((entry) => {
                const s = summary(entry.build);
                return (
                  <li key={entry.id} className="saved__item">
                    <div className="saved__head">
                      <div>
                        <strong>{entry.name}</strong>
                        <div className="small muted">
                          {t(`class.${s.job}`)} · Lv {entry.build.level} · {s.count} {t('pieces')}
                        </div>
                      </div>
                      <div className="saved__actions">
                        <button type="button" className="btn btn--sm" onClick={() => onLoad(entry)}>{t('loadBuild')}</button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onCompare(entry)}>{t('compare')}</button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDuplicate(entry.id)}>{t('duplicate')}</button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(entry.id)}>{t('delete')}</button>
                      </div>
                    </div>
                    <p className="saved__gear small muted">{s.items.join(' · ') || t('compareEmpty')}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="panel panel--steel">
        <div className="panel__header"><h2>{t('importExport')}</h2></div>
        <div className="panel__body">
          <div className="row" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn--sm"
              onClick={async () => {
                const json = onExport();
                try {
                  await navigator.clipboard.writeText(json);
                  notify(t('exported'));
                } catch {
                  setRaw(json);
                }
              }}
            >
              {t('exportJson')}
            </button>
            <button type="button" className="btn btn--sm" onClick={() => onDownload()}>{t('exportFile')}</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>{t('openFile')}</button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.txt,application/json,text/plain"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const ok = onImport(text);
                notify(ok ? t('loadedOk') : t('invalidJson'), ok ? 'ok' : 'warn');
                e.target.value = '';
              }}
            />
          </div>

          <div className="field">
            <label>{t('importJson')}</label>
            <textarea
              className="input"
              placeholder={t('importPlaceholder')}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
              dir="ltr"
            />
            <span className="small muted">{t('importHint')}</span>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn btn--bronze btn--sm"
              onClick={() => {
                if (!raw.trim()) return;
                const ok = onImport(raw);
                notify(ok ? t('loadedOk') : t('invalidJson'), ok ? 'ok' : 'warn');
              }}
            >
              {t('import')}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRaw(onExport())}>
              {t('current')} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
