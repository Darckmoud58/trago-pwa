import { NavLink, useLocation } from 'react-router-dom';
import './BottomNav.css';

type Props = {
  hasSession: boolean;
};

const items = [
  {
    to: '/',
    label: 'Inicio',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden width="22" height="22">
        <path
          fill="currentColor"
          d="M12 3.2 3.5 10.2V21h6.2v-6.3h4.6V21h6.2V10.2L12 3.2Z"
        />
      </svg>
    ),
  },
  {
    to: '/promos',
    label: 'Explorar',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden width="22" height="22">
        <path
          fill="currentColor"
          d="M4 5.5h16v3.2H4V5.5Zm0 5h16v3.2H4v-3.2Zm0 5h10.5V19H4v-3.5Z"
        />
      </svg>
    ),
  },
  {
    to: '/cerca',
    label: 'Cerca',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden width="22" height="22">
        <path
          fill="currentColor"
          d="M12 2.8a6.4 6.4 0 0 0-6.4 6.4c0 4.4 6.4 11.4 6.4 11.4s6.4-7 6.4-11.4A6.4 6.4 0 0 0 12 2.8Zm0 8.7a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6Z"
        />
      </svg>
    ),
  },
  {
    to: '/favoritos',
    label: 'Favoritos',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden width="22" height="22">
        <path
          fill="currentColor"
          d="M12 20.4 10.6 19.1C5.4 14.4 2 11.3 2 7.6A4.5 4.5 0 0 1 6.5 3.1c1.7 0 3.4.9 4.5 2.3A5.7 5.7 0 0 1 15.5 3.1 4.5 4.5 0 0 1 20 7.6c0 3.7-3.4 6.8-8.6 11.5L12 20.4Z"
        />
      </svg>
    ),
  },
  {
    to: '/cuenta',
    label: 'Cuenta',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden width="22" height="22">
        <path
          fill="currentColor"
          d="M12 12.4a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12.4Zm0 2.1c-3.5 0-8 1.7-8 5.1V21h16v-1.4c0-3.4-4.5-5.1-8-5.1Z"
        />
      </svg>
    ),
  },
] as const;

export default function BottomNav({ hasSession }: Props) {
  const { pathname } = useLocation();

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav-inner">
        {items.map((item) => {
          const to =
            item.to === '/cuenta' && !hasSession ? '/entrar' : item.to;
          const forceActive =
            item.to === '/cuenta' &&
            (pathname.startsWith('/cuenta') ||
              pathname.startsWith('/entrar') ||
              pathname.startsWith('/registro'));

          return (
            <NavLink
              key={item.to}
              to={to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `bottom-nav-item${isActive || forceActive ? ' is-active' : ''}`
              }
            >
              <span className="bottom-nav-ico">{item.icon}</span>
              <span className="bottom-nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
