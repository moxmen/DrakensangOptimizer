import React, { useMemo, useState } from 'react';
import { compile, evaluate, FORMULA_FUNCTION_DOCS } from '../engine/formula.js';
import { ALL_SLOTS } from '../engine/stats.js';
import './calculator.css';

/** Vérifie une expression et renvoie { ok, error }. */
export function checkFormula(expr) {
  const source = String(expr || '').trim();
  if (!source) return { ok: true, error: '' };
  try {
    compile(source);
    return { ok: true, error: '' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Champ de formule avec :
 *  - coloration de l'état (valide / erreur explicite),
 *  - insertion des fonctions et des variables par clic,
 *  - test immédiat sur le build courant.
 */
export default function FormulaEditor({
  value, onChange, t, lang, vars = [], sampleValues = {}, placeholder = '', rows = 3, id,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const check = useMemo(() => checkFormula(value), [value]);

  const insert = (text) => {
    onChange(`${value || ''}${value ? ' ' : ''}${text}`);
  };

  const runTest = () => {
    const source = String(value || '').trim();
    if (!source) { setTestResult(null); return; }
    try {
      const numbers = {};
      for (const [k, v] of Object.entries(sampleValues)) numbers[k] = v;
      const fns = {};
      // T("stat") renvoie la valeur réelle du build courant
      fns.T = (name) => (typeof sampleValues[name] === 'number' ? sampleValues[name] : 0);
      const result = evaluate(source, { vars: numbers, fns });
      setTestResult({ ok: true, value: result });
    } catch (err) {
      setTestResult({ ok: false, value: err.message });
    }
  };

  return (
    <div className={`formula-editor${check.ok ? '' : ' is-invalid'}`}>
      <textarea
        id={id}
        className="input formula-editor__input"
        dir="ltr"
        spellCheck={false}
        rows={rows}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="formula-editor__status">
        {check.ok ? (
          <span className="formula-editor__ok">✓ {t('formulaValid')}</span>
        ) : (
          <span className="formula-editor__error">{check.error}</span>
        )}
        <div className="formula-editor__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={runTest}>{t('testFormula')}</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowHelp((v) => !v)}>
            {showHelp ? t('close') : t('functions')}
          </button>
        </div>
      </div>

      {testResult ? (
        <p className={`formula-editor__result${testResult.ok ? '' : ' is-error'}`}>
          {testResult.ok
            ? `${t('result')} : ${typeof testResult.value === 'number'
              ? Math.round(testResult.value * 1000) / 1000
              : String(testResult.value)}`
            : testResult.value}
        </p>
      ) : null}

      {showHelp ? (
        <div className="formula-editor__help">
          <div className="formula-editor__helpCol">
            <h4>{t('functions')}</h4>
            <ul>
              {FORMULA_FUNCTION_DOCS.map((fn) => (
                <li key={fn.name}>
                  <button type="button" onClick={() => insert(`${fn.name}(${fn.args.includes("'") ? "''" : ''})`)}>
                    <code>{fn.name}({fn.args})</code>
                  </button>
                  <span>{fn.doc}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="formula-editor__helpCol">
            <h4>{t('variables')}</h4>
            <div className="formula-editor__chips">
              {vars.map((v) => (
                <button
                  key={v.name || v}
                  type="button"
                  className="chip chip--action"
                  title={v.doc || ''}
                  onClick={() => insert(v.name || v)}
                >
                  {v.name || v}
                </button>
              ))}
            </div>
            <h4 style={{ marginTop: 10 }}>{t('slots')}</h4>
            <div className="formula-editor__chips">
              {ALL_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className="chip chip--action"
                  onClick={() => insert(`'${slot}'`)}
                >
                  {t(`slot.${slot}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
