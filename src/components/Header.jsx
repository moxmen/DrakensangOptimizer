import React from 'react';
import { LANGUAGES } from '../i18n/index.js';
import './header.css';

/**
 * Bannière + sélecteur de langue (drapeaux) inspirés du site officiel :
 * plaque de titre en bronze, logo dans un cartouche, barre supérieure en acier.
 */
export default function Header({ t, lang, setLang, onNav, activeNav, showNotice }) {
  return (
    <header className="site-header">
      <div className="site-header__top">
        <div className="wrap site-header__topInner">
          <div className="lang-picker">
            <span className="lang-picker__label">{t('language')}</span>
            <div className="lang-picker__flags" role="group" aria-label={t('selectLanguage')}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className={`lang-flag${lang === l.code ? ' is-active' : ''}`}
                  onClick={() => setLang(l.code)}
                  title={`${l.label}${l.dir === 'rtl' ? ' (RTL)' : ''}`}
                  aria-pressed={lang === l.code}
                >
                  <img src={`./assets/theme/flags/${l.flag}.png`} alt={l.label} />
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="site-header__meta">{t('simulatorNotice')}</div>
        </div>
      </div>

      <div className="crest">
        <div className="crest__frame">
          <h1 className="crest__title">
            <span className="crest__titleMain">Draken</span>
            <span className="crest__titleSub">Optimizer</span>
          </h1>
          <p className="crest__tagline">{t('appSubtitle')}</p>
        </div>
      </div>

      <nav className="main-nav" aria-label={t('appName')}>
        <div className="wrap main-nav__inner">
          {[
            ['builder', t('nav.builder')],
            ['stats', t('nav.stats')],
            ['skills', t('nav.skills')],
            ['talents', t('nav.talents')],
            ['compare', t('nav.compare')],
            ['saved', t('nav.saved')],
            ['about', t('nav.about')],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`nav-btn${activeNav === key ? ' is-active' : ''}`}
              onClick={() => onNav(key)}
              aria-current={activeNav === key ? 'page' : undefined}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
      {showNotice ? <div className="wrap"><p className="header-notice">{showNotice}</p></div> : null}
    </header>
  );
}
