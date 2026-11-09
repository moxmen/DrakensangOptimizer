import React, { useMemo, useRef, useState } from 'react';
import FormulaEditor, { checkFormula } from './FormulaEditor.jsx';
import { RULE_KINDS, SKIP_PRESETS, GLOBAL_VARS } from '../engine/rules.js';
import { ALL_STATS, ALL_SLOTS } from '../engine/stats.js';
import { STAT_LABELS } from '../data/labels.js';
import './calculator.css';

const KIND_LABEL_KEY = {
  sum: 'kindSum',
  expr: 'kindExpr',
  pct: 'kindPct',
  skills: 'kindSkills',
};
const KIND_HELP = {
  sum: 'kindSumHelp',
  expr: 'kindExprHelp',
  pct: 'kindPctHelp',
  skills: 'kindSkillsHelp',
};

/**
 * Éditeur du calculateur : ajouter / modifier / supprimer des formules et des
 * statistiques, sans écrire de code.
 */
export default function CalculatorPanel({
  t, lang, result, catalog, formulas,
}) {
  const [tab, setTab] = useState('rules');
  const [openRule, setOpenRule] = useState(null);
  const [newStat, setNewStat] = useState({ name: '', label: '', kind: 'pct' });
  const [statError, setStatError] = useState('');
  const fileRef = useRef(null);

  const allStatIds = useMemo(
    () => [...ALL_STATS, ...formulas.statIds.filter((id) => !ALL_STATS.includes(id))],
    [formulas.statIds],
  );

  /** valeurs réelles du build courant, utilisées par le bouton « tester » */
  const sampleValues = useMemo(() => {
    const out = {};
    if (!result) return out;
    for (const [k, v] of Object.entries(result.gs || {})) out[k] = v.Total;
    Object.assign(out, result.percentages || {});
    out.meanDamage = ((result.gs.damagemin?.Total || 0) + (result.gs.damagemax?.Total || 0)) / 2;
    out.MEAN = out.meanDamage;
    return out;
  }, [result]);

  const statInfo = (id) => {
    const custom = formulas.stats.find((s) => s.id === id);
    if (custom) return { kind: custom.kind, label: custom.label || id };
    return { kind: STAT_LABELS[id]?.kind || 'flat', label: t(id) };
  };

  const vars = useMemo(() => [
    ...allStatIds.map((s) => ({ name: s, doc: `${statInfo(s).label} (total courant)` })),
    ...GLOBAL_VARS,
  ], [allStatIds, formulas.stats, lang]);

  const errorCount = formulas.rules.filter((r) => !checkFormula(r.expr).ok || !checkFormula(r.critExpr).ok).length;

  const addStat = () => {
    const res = formulas.addStat(newStat.name, newStat.kind, newStat.label);
    if (!res.ok) { setStatError(res.error); return; }
    setStatError('');
    setNewStat({ name: '', label: '', kind: 'pct' });
  };

  return (
    <div className="calculator">
      <div className="panel">
        <div className="panel__header"><h2>{t('calcTitle')}</h2></div>
        <div className="panel__body">
          <p className="calculator__intro">{t('calcIntro')}</p>

          <div className="calculator__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'rules'}
              className={`calculator__tab${tab === 'rules' ? ' is-active' : ''}`}
              onClick={() => setTab('rules')}
            >
              {t('rulesTab')} <span className="chip">{formulas.rules.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'stats'}
              className={`calculator__tab${tab === 'stats' ? ' is-active' : ''}`}
              onClick={() => setTab('stats')}
            >
              {t('statsTab')} <span className="chip">{allStatIds.length}</span>
            </button>
          </div>

          {errorCount > 0 ? (
            <p className="notice notice--warn">{t('formulaErrors').replace('{n}', errorCount)}</p>
          ) : null}

          {tab === 'rules' ? (
            <>
              <div className="calculator__toolbar">
                <span className="calculator__label">{t('addRule')}</span>
                {RULE_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    className="btn btn--bronze btn--sm"
                    onClick={() => setOpenRule(formulas.addRule(k.id))}
                  >
                    + {k.label}
                  </button>
                ))}
                <span className="calculator__spacer" />
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    const text = formulas.exportRules();
                    const blob = new Blob([text], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'drakenoptimizer-formules.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  {t('exportFile')}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
                  {t('importJson')}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const ok = formulas.importRules(await file.text());
                    if (!ok) setStatError(t('invalidJson'));
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="btn btn--crimson btn--sm"
                  onClick={() => {
                    if (window.confirm(t('resetRulesConfirm'))) formulas.resetRules();
                  }}
                >
                  {t('resetDefault')}
                </button>
              </div>

              <ol className="rules">
                {formulas.rules.map((rule, index) => {
                  const check = checkFormula(rule.expr);
                  const open = openRule === rule.id;
                  const targetLabel = rule.kind === 'sum'
                    ? (rule.targets || []).map((x) => (x === '*' ? t('allStats') : t(x))).join(', ')
                    : rule.target === '*' ? t('allStats') : (rule.target ? t(rule.target) : '—');
                  return (
                    <li key={rule.id} data-rule-id={rule.id} data-rule-kind={rule.kind} className={`rules__item${rule.enabled ? '' : ' is-disabled'}${check.ok ? '' : ' is-invalid'}`}>
                      <div className="rules__head">
                        <span className={`rules__kind rules__kind--${rule.kind}`}>{t(KIND_LABEL_KEY[rule.kind] || 'kindExpr')}</span>
                        <span className="rules__label">{rule.label || rule.id}</span>
                        <span className="rules__target">{targetLabel}</span>
                        <span className="calculator__spacer" />
                        <button
                          type="button"
                          className="icon-btn"
                          title={t('moveUp')}
                          disabled={index === 0}
                          onClick={() => formulas.moveRule(rule.id, -1)}
                        >↑</button>
                        <button
                          type="button"
                          className="icon-btn"
                          title={t('moveDown')}
                          disabled={index === formulas.rules.length - 1}
                          onClick={() => formulas.moveRule(rule.id, 1)}
                        >↓</button>
                        <button
                          type="button"
                          className={`icon-btn${rule.enabled ? ' is-on' : ''}`}
                          title={rule.enabled ? t('disable') : t('enable')}
                          onClick={() => formulas.toggleRule(rule.id)}
                        >{rule.enabled ? '◉' : '○'}</button>
                        <button
                          type="button"
                          className="icon-btn"
                          title={open ? t('close') : t('edit')}
                          onClick={() => setOpenRule(open ? null : rule.id)}
                        >{open ? '▲' : '✎'}</button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          title={t('delete')}
                          onClick={() => formulas.deleteRule(rule.id)}
                        >✕</button>
                      </div>

                      {!check.ok ? <p className="rules__error">{check.error}</p> : null}

                      {open ? (
                        <div className="rules__body">
                          <div className="grid-2">
                            <div className="field">
                              <label>{t('ruleName')}</label>
                              <input
                                className="input"
                                value={rule.label}
                                onChange={(e) => formulas.updateRule(rule.id, { label: e.target.value })}
                              />
                            </div>
                            {rule.kind === 'sum' ? (
                              <div className="field">
                                <label>{t('ruleTargets')}</label>
                                <div className="target-picker">
                                  <div className="target-picker__chips">
                                    {(rule.targets || []).length === 0 ? (
                                      <span className="small muted">{t('noTarget')}</span>
                                    ) : (rule.targets || []).map((x) => (
                                      <button
                                        key={x}
                                        type="button"
                                        className="chip chip--action chip--remove"
                                        title={t('delete')}
                                        onClick={() => formulas.updateRule(rule.id, {
                                          targets: (rule.targets || []).filter((y) => y !== x),
                                        })}
                                      >
                                        {x === '*' ? t('allStats') : t(x)} ✕
                                      </button>
                                    ))}
                                  </div>
                                  <select
                                    className="input"
                                    value=""
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (!v) return;
                                      const next = v === '*'
                                        ? ['*']
                                        : [...(rule.targets || []).filter((y) => y !== '*'), v];
                                      formulas.updateRule(rule.id, { targets: next });
                                      e.target.value = '';
                                    }}
                                  >
                                    <option value="">+ {t('addTarget')}</option>
                                    <option value="*">{t('allStats')}</option>
                                    {allStatIds.map((sid) => <option key={sid} value={sid}>{t(sid)}</option>)}
                                  </select>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {rule.kind === 'pct' ? (
                            <div className="grid-3">
                              <div className="field">
                                <label>{t('pctSource')}</label>
                                <select
                                  className="input"
                                  value={rule.source || ''}
                                  onChange={(e) => formulas.updateRule(rule.id, { source: e.target.value })}
                                >
                                  {allStatIds.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                                </select>
                              </div>
                              <div className="field">
                                <label>{t('pctDenom')}</label>
                                <select
                                  className="input"
                                  value={rule.denom || 'accr'}
                                  onChange={(e) => formulas.updateRule(rule.id, { denom: e.target.value })}
                                >
                                  {['accr', 'blockrateConst', 'blockeddmgConst'].map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="field">
                                <label>{t('pctCap')}</label>
                                <input
                                  className="input"
                                  type="number"
                                  step="0.01"
                                  value={rule.cap}
                                  onChange={(e) => formulas.updateRule(rule.id, { cap: Number(e.target.value) })}
                                />
                              </div>
                            </div>
                          ) : null}

                          <div className="field">
                            <label>{rule.kind === 'sum' ? t('sumExpression') : t('ruleExpression')}</label>
                            <FormulaEditor
                              value={rule.expr}
                              onChange={(v) => formulas.updateRule(rule.id, { expr: v })}
                              t={t}
                              lang={lang}
                              vars={vars}
                              sampleValues={sampleValues}
                            />
                          </div>

                          {rule.kind === 'sum' ? (
                            <div className="rules__presets">
                              <span className="calculator__label">{t('presets')}</span>
                              {SKIP_PRESETS.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="chip chip--action"
                                  onClick={() => formulas.updateRule(rule.id, { expr: p.expr })}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          ) : null}

                          {rule.kind === 'skills' ? (
                            <div className="field">
                              <label>{t('critExpression')}</label>
                              <FormulaEditor
                                value={rule.critExpr}
                                onChange={(v) => formulas.updateRule(rule.id, { critExpr: v })}
                                t={t}
                                lang={lang}
                                vars={vars}
                                sampleValues={sampleValues}
                              />
                            </div>
                          ) : null}

                          <div className="grid-2">
                            <div className="field">
                              <label>{t('applyMode')}</label>
                              <select
                                className="input"
                                value={rule.mode}
                                onChange={(e) => formulas.updateRule(rule.id, { mode: e.target.value })}
                              >
                                <option value="add">{t('modeAdd')}</option>
                                <option value="set">{t('modeSet')}</option>
                                <option value="store">{t('modeStore')}</option>
                              </select>
                            </div>
                            {rule.kind === 'expr' && rule.target === '*' ? (
                              <div className="field">
                                <label>{t('condition')}</label>
                                <input
                                  className="input"
                                  dir="ltr"
                                  value={rule.when || ''}
                                  placeholder={'has(T(stat + "boost"))'}
                                  onChange={(e) => formulas.updateRule(rule.id, { when: e.target.value })}
                                />
                              </div>
                            ) : null}
                          </div>

                          <p className="small muted">{t(KIND_HELP[rule.kind] || 'kindExprHelp')}</p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <>
              <div className="calculator__toolbar">
                <div className="field" style={{ minWidth: 180 }}>
                  <label>{t('statId')}</label>
                  <input
                    className="input"
                    dir="ltr"
                    value={newStat.name}
                    placeholder="piercedamage"
                    onChange={(e) => setNewStat({ ...newStat, name: e.target.value })}
                  />
                </div>
                <div className="field" style={{ minWidth: 180 }}>
                  <label>{t('statLabel')}</label>
                  <input
                    className="input"
                    value={newStat.label}
                    placeholder={t('statLabelPlaceholder')}
                    onChange={(e) => setNewStat({ ...newStat, label: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>{t('statKind')}</label>
                  <select
                    className="input"
                    value={newStat.kind}
                    onChange={(e) => setNewStat({ ...newStat, kind: e.target.value })}
                  >
                    <option value="pct">{t('statKindPct')}</option>
                    <option value="flat">{t('statKindFlat')}</option>
                  </select>
                </div>
                <button type="button" className="btn btn--bronze btn--sm" onClick={addStat}>+ {t('addStat')}</button>
              </div>
              {statError ? <p className="notice notice--warn">{statError}</p> : null}

              <table className="stat-table calculator__stats">
                <thead>
                  <tr>
                    <th>{t('statId')}</th>
                    <th>{t('statLabel')}</th>
                    <th>{t('statKind')}</th>
                    <th>{t('total')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {allStatIds.map((id) => {
                    const info = statInfo(id);
                    const isCustom = formulas.statIds.includes(id);
                    return (
                      <tr key={id}>
                        <td className="mono">{id}</td>
                        <td>
                          {isCustom ? (
                            <input
                              className="input"
                              value={info.label}
                              onChange={(e) => formulas.updateStat(id, { label: e.target.value })}
                            />
                          ) : t(id)}
                        </td>
                        <td>{info.kind === 'pct' ? '%' : info.kind === 'speed' ? '/s' : t('flat')}</td>
                        <td className="mono">
                          {result?.gs?.[id]
                            ? Math.round((result.gs[id].Total || 0) * 100) / 100
                            : '—'}
                        </td>
                        <td>
                          {isCustom ? (
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              title={t('delete')}
                              onClick={() => formulas.deleteStat(id)}
                            >✕</button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="small muted">{t('customStatsHint')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
