import { useLocation, useNavigate } from 'react-router-dom';
import logoUrl from '../assets/logo.png';
import './AppHeader.css';

const TITLES: { match: RegExp; title: string; showBack?: boolean }[] = [
  { match: /^\/$/, title: '' },
  { match: /^\/promos\/[^/]+$/, title: 'Detalle', showBack: true },
  { match: /^\/promos/, title: 'Promociones' },
  { match: /^\/cerca/, title: 'Cerca de ti' },
  { match: /^\/favoritos/, title: 'Favoritos' },
  { match: /^\/cuenta/, title: 'Mi cuenta' },
  { match: /^\/entrar/, title: 'Entrar' },
  { match: /^\/registro/, title: 'Registro' },
  { match: /^\/negocios/, title: 'Negocios' },
  { match: /^\/terminos/, title: 'Términos', showBack: true },
  { match: /^\/aviso-de-privacidad/, title: 'Privacidad', showBack: true },
];

type Props = {
  online: boolean;
  subtitle?: string;
};

export default function AppHeader({ online, subtitle }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const conf =
    TITLES.find((t) => t.match.test(pathname)) ?? {
      title: '',
      showBack: false,
    };
  const isHome = pathname === '/';

  return (
    <header className="app-header" role="banner">
      <div className={`app-header-inner${isHome ? ' is-home' : ''}`}>
        {conf.showBack ? (
          <button
            type="button"
            className="app-header-back"
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            ‹
          </button>
        ) : (
          <img
            className="app-header-logo"
            src={logoUrl}
            alt="TraGo"
            width={36}
            height={39}
            decoding="async"
          />
        )}

        <div className="app-header-titles">
          {conf.title ? (
            <h1 className="app-header-title">{conf.title}</h1>
          ) : null}
          {subtitle && <p className="app-header-sub">{subtitle}</p>}
        </div>

        <span
          className={`app-header-conn ${online ? 'is-on' : 'is-off'}`}
          title={online ? 'En línea' : 'Sin conexión'}
          aria-live="polite"
        >
          {online ? '' : 'Offline'}
        </span>
      </div>
    </header>
  );
}
