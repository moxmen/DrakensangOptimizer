import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import BuildSettings from './components/BuildSettings.jsx';
import GearRack from './components/GearRack.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import SkillsPanel from './components/SkillsPanel.jsx';
import TalentsPanel from './components/TalentsPanel.jsx';
import ComparePanel from './components/ComparePanel.jsx';
import SavedBuilds from './components/SavedBuilds.jsx';
import ItemEditor from './components/ItemEditor.jsx';
import ItemTooltip from './components/ItemTooltip.jsx';
import EssencePicker from './components/EssencePicker.jsx';
import AboutPanel from './components/AboutPanel.jsx';
import { useI18n } from './i18n/index.js';
import { buildCatalog } from './data/catalog.js';
import { computeBuild } from './engine/stats.js';
import { useBuildStore } from './state/useBuildStore.js';
import { isSlotEmpty } from './state/build.js';
import './styles/tokens.css';
import './styles/theme.css';
import './styles/app.css';

export default function App() {
  const [data, setData] = useState({ items: null, names: null, i18n: null, error: null });
  const [nav, setNav] = useState('builder');
  const [editorSlot, setEditorSlot] = useState(null);
  const [extended, setExtended] = useState(false);
  const [compareB, setCompareB] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [essenceOpen, setEssenceOpen] = useState(false);

  // ── chargement des données générées ───────────────────────────────────────
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch('./data/items.json').then((r) => r.json()),
      fetch('./data/names.json').then((r) => r.json()),
      fetch('./data/i18n.json').then((r) => r.json()),
    ])
      .then(([items, names, i18n]) => {
        if (alive) setData({ items, names, i18n, error: null });
      })
      .catch((err) => alive && setData((d) => ({ ...d, error: String(err) })));
    return () => { alive = false; };
  }, []);

  const catalog = useMemo(
    () => (data.items && data.names ? buildCatalog(data.items, data.names) : null),
    [data.items, data.names],
  );

  const i18n = useI18n(data.i18n);
  const { t, tSys, lang, setLang, dir } = i18n;

  const store = useBuildStore(catalog, !!catalog);
  const { build, update, setSlot, clearSlot, toggleTalent, resetBuild, randomFill, savedBuilds, saveBuild, deleteBuild, duplicateBuild, loadBuild, importJson, exportJson, notify, toast } = store;

  const result = useMemo(
    () => (build && catalog ? computeBuild(build, catalog) : null),
    [build, catalog],
  );

  // ── actions d'équipement ─────────────────────────────────────────────────
  const handleSaveItem = useCallback((slot, equip) => {
    setSlot(slot, equip);
    setEditorSlot(null);
  }, [setSlot]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DrakenOptimizer_${build.job}_Lv${build.level}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportJson, build]);

  // ── états de chargement / erreur ─────────────────────────────────────────
  if (data.error) {
    return (
      <div className="app-shell">
        <div className="wrap" style={{ paddingTop: 80 }}>
          <div className="panel">
            <div className="panel__header"><h2>Data error</h2></div>
            <div className="panel__body">
              <p className="notice notice--warn">{data.error}</p>
              <p className="small muted">
                Run <code>node scripts/build-data.mjs</code> to regenerate <code>public/data</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!catalog || !build) {
    return (
      <div className="app-shell loading-shell">
        <div className="loading">
          <div className="loading__ember" />
          <p>DrakenOptimizer…</p>
        </div>
      </div>
    );
  }

  const tooltipEquip = tooltip ? build.slots[tooltip.slot] : null;

  return (
    <div className="app-shell" data-dir={dir}>
      <Header
        t={t}
        lang={lang}
        setLang={setLang}
        onNav={setNav}
        activeNav={nav}
        showNotice={dir === 'rtl' ? t('rtlActive') : null}
      />

      <main className="wrap app-main">
        {nav === 'builder' && (
          <div className="builder-layout">
            <div className="builder-left">
              <BuildSettings
                build={build}
                catalog={catalog}
                t={t}
                lang={lang}
                update={update}
              />
              <div className="panel">
                <div className="panel__header"><h2>{t('gear')}</h2></div>
                <div className="panel__body">
                  <GearRack
                    build={build}
                    catalog={catalog}
                    t={t}
                    selectedEssence={build.essence}
                    onOpenEditor={(slot) => setEditorSlot(slot)}
                    onClearSlot={clearSlot}
                    onEssenceClick={() => setEssenceOpen(true)}
                    onHover={(rect) => setTooltip(rect ? { slot: rect.slot, rect } : null)}
                  />
                  {build.slots.weapons?.TwoHandedWeapon && build.job !== 'RNG' ? (
                    <p className="notice notice--warn gear-warn">{t('warning2H')}</p>
                  ) : null}
                  <div className="gear-hint small muted">
                    {t('clickToEdit')} · {t('rightClickToClear')}
                  </div>
                  <div className="row builder-actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => { resetBuild(); notify(t('resetOk')); }}>{t('resetAll')}</button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => { randomFill(); notify(t('randomBuild')); }}>{t('randomBuild')}</button>
                    <button type="button" className="btn btn--bronze btn--sm" onClick={() => saveBuild(`${build.job} · Lv ${build.level}`)}>{t('saveCurrent')}</button>
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(exportJson());
                          notify(t('copied'));
                        } catch {
                          notify(t('exported'));
                        }
                      }}
                    >
                      {t('exportJson')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="builder-right">
              <StatsPanel result={result} build={build} t={t} lang={lang} />
            </div>
          </div>
        )}

        {nav === 'stats' && <StatsPanel result={result} build={build} t={t} lang={lang} />}

        {nav === 'skills' && (
          <SkillsPanel
            result={result}
            build={build}
            catalog={catalog}
            t={t}
            lang={lang}
            extended={extended}
            setExtended={setExtended}
          />
        )}

        {nav === 'talents' && (
          <TalentsPanel
            build={build}
            catalog={catalog}
            t={t}
            lang={lang}
            onToggleTalent={toggleTalent}
          />
        )}

        {nav === 'compare' && (
          <ComparePanel
            build={build}
            catalog={catalog}
            t={t}
            lang={lang}
            compareB={compareB}
            setCompareB={setCompareB}
            savedBuilds={savedBuilds}
            onUseCurrentAsB={() => setCompareB(JSON.parse(JSON.stringify(build)))}
            onLoadBuild={(next) => store.loadBuild({ build: next })}
          />
        )}

        {nav === 'about' && <AboutPanel t={t} catalog={catalog} />}

        {nav === 'saved' && (
          <SavedBuilds
            build={build}
            catalog={catalog}
            t={t}
            lang={lang}
            savedBuilds={savedBuilds}
            onSave={saveBuild}
            onLoad={(entry) => { loadBuild(entry); setNav('builder'); notify(t('loadedOk')); }}
            onDelete={deleteBuild}
            onDuplicate={duplicateBuild}
            onImport={importJson}
            onExport={exportJson}
            onDownload={handleDownload}
            onCompare={(entry) => { setCompareB(entry.build); setNav('compare'); }}
            notify={notify}
          />
        )}
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="divider" />
          <p className="small">
            {t('appName')} · fan project · {t('poweredBy')}
          </p>
          <p className="small muted">
            Legacy engine: {catalog.meta?.source || 'DrakensangOptimizer'} · {t('formulaText')}
          </p>
        </div>
      </footer>

      {editorSlot ? (
        <ItemEditor
          slot={editorSlot}
          build={build}
          catalog={{ ...catalog, gemsList: catalog.gemsList }}
          t={t}
          lang={lang}
          onSave={handleSaveItem}
          onCancel={() => setEditorSlot(null)}
        />
      ) : null}

      {essenceOpen ? (
        <EssencePicker
          catalog={catalog}
          lang={lang}
          t={t}
          value={build.essence}
          onChange={(key) => update({ essence: key })}
          onClose={() => setEssenceOpen(false)}
        />
      ) : null}

      {tooltip && tooltipEquip && !isSlotEmpty(tooltipEquip) ? (
        <ItemTooltip equip={tooltipEquip} rect={tooltip.rect} catalog={catalog} t={t} tSys={tSys} lang={lang} />
      ) : null}

      {toast ? <div className={`toast ${toast.kind === 'warn' ? 'toast--warn' : ''}`}>{toast.message}</div> : null}
    </div>
  );
}
