import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n, type MessageKey } from '../lib/i18n';
import { useInstallPrompt } from '../lib/installPrompt';
import NotificationsButton from './NotificationsButton';
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
  loggedIn?: boolean;
  subtitle?: string;
};

export default function AppHeader({ online, loggedIn = false, subtitle }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { canInstall, install } = useInstallPrompt();
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

        <div className="app-header-tools">
          {canInstall && (
            <button
              type="button"
              className="btn primary btn-sm app-header-install"
              onClick={() => void install()}
            >
              {t('install')}
            </button>
          )}
          <NotificationsButton loggedIn={loggedIn} />
          <span
            className={`app-header-conn ${online ? 'is-on' : 'is-off'}`}
            title={online ? t('online') : t('offline')}
            aria-live="polite"
          >
            {online ? '' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
