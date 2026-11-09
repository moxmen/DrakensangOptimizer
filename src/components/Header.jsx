import React from 'react';
import { LANGUAGES } from '../i18n/index.js';
import { FLAGS } from '../assets/theme/flags/index.js';
import fankitBanner from '../assets/theme/fankit-banner.png';
import './header.css';

/**
 * Bannière + sélecteur de langue (drapeaux) inspirés du site officiel :
 * le bandeau du fan-kit Drakensang Online (dragon, logo, blasons) sert de
 * cartouche, surmonté de la barre utilitaire en acier.
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
                  <img src={FLAGS[l.flag]} alt={l.label} />
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="site-header__meta">{t('simulatorNotice')}</div>
        </div>
      </div>

      <div className="crest">
        <div className="crest__banner" role="img" aria-label="Drakensang Online">
          <img src={fankitBanner} alt="" />
          <div className="crest__caption">
            <span className="crest__titleMain">Draken</span>
            <span className="crest__titleSub">Optimizer</span>
          </div>
        </div>
        <p className="crest__tagline">{t('appName')} — {t('appSubtitle')}</p>
      </div>

      <nav className="main-nav" aria-label={t('appName')}>
        <div className="wrap main-nav__inner">
          {[
            ['builder', t('nav.builder')],
            ['stats', t('nav.stats')],
            ['skills', t('nav.skills')],
            ['talents', t('nav.talents')],
            ['compare', t('nav.compare')],
            ['calculator', t('nav.calculator')],
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
