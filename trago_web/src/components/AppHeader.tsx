import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n, type MessageKey } from '../lib/i18n';
import './AppHeader.css';

const TITLE_KEYS: { match: RegExp; titleKey: MessageKey | ''; showBack?: boolean }[] =
  [
    { match: /^\/$/, titleKey: '' },
    { match: /^\/promos\/[^/]+$/, titleKey: 'titleDetail', showBack: true },
    { match: /^\/promos/, titleKey: 'titlePromos' },
    { match: /^\/cerca/, titleKey: 'titleNear' },
    { match: /^\/favoritos/, titleKey: 'titleFavorites' },
    { match: /^\/cuenta/, titleKey: 'titleAccount' },
    { match: /^\/entrar/, titleKey: 'titleLogin' },
    { match: /^\/registro/, titleKey: 'titleRegister' },
    { match: /^\/negocios/, titleKey: 'titleBusinesses' },
    { match: /^\/idioma/, titleKey: 'titleLanguage', showBack: true },
    { match: /^\/terminos/, titleKey: 'titleTerms', showBack: true },
    { match: /^\/aviso-de-privacidad/, titleKey: 'titlePrivacy', showBack: true },
  ];

type Props = {
  online: boolean;
  subtitle?: string;
};

export default function AppHeader({ online, subtitle }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const conf =
    TITLE_KEYS.find((row) => row.match.test(pathname)) ?? {
      titleKey: '' as const,
      showBack: false,
    };
  const title = conf.titleKey ? t(conf.titleKey) : '';
  const isHome = pathname === '/';

  return (
    <header className="app-header" role="banner">
      <div className={`app-header-inner${isHome ? ' is-home' : ''}`}>
        {conf.showBack ? (
          <button
            type="button"
            className="app-header-back"
            onClick={() => navigate(-1)}
            aria-label={t('back')}
          >
            ‹
          </button>
        ) : (
          <span className="app-header-spacer" aria-hidden />
        )}

        <div className="app-header-titles">
          {title ? <h1 className="app-header-title">{title}</h1> : null}
          {subtitle && <p className="app-header-sub">{subtitle}</p>}
        </div>

        <span
          className={`app-header-conn ${online ? 'is-on' : 'is-off'}`}
          title={online ? t('online') : t('offline')}
          aria-live="polite"
        >
          {online ? '' : 'Offline'}
        </span>
      </div>
    </header>
  );
}
