import { useI18n, type Locale } from '../lib/i18n';
import './Cuenta.css';
import './Idioma.css';

const OPTIONS: { id: Locale; labelKey: 'languageEs' | 'languageEn'; flag: string }[] =
  [
    { id: 'es', labelKey: 'languageEs', flag: 'ES' },
    { id: 'en', labelKey: 'languageEn', flag: 'EN' },
  ];

export default function Idioma() {
  const { locale, setLocale, t } = useI18n();

  return (
    <section className="idioma-page">
      <header className="idioma-hero">
        <h2>{t('languageTitle')}</h2>
        <p>{t('languageLead')}</p>
      </header>

      <div className="settings-list" role="radiogroup" aria-label={t('languageTitle')}>
        {OPTIONS.map((opt) => {
          const selected = locale === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`settings-row idioma-option${selected ? ' is-selected' : ''}`}
              onClick={() => setLocale(opt.id)}
            >
              <span className="idioma-option-main">
                <span className="idioma-flag" aria-hidden>
                  {opt.flag}
                </span>
                <span>{t(opt.labelKey)}</span>
              </span>
              <em>{selected ? t('languageCurrent') : ''}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}
