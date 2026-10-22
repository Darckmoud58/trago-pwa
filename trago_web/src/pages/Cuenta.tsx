import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, setAuth } from '../api';
import { clearAgeBand } from '../lib/ageBand';
import { clearCatalogCache } from '../lib/catalogCache';
import { listFavorites } from '../lib/favorites';
import { useI18n } from '../lib/i18n';
import { usePushNotifications } from '../lib/usePushNotifications';
import type { AuthUser } from '../types';
import './Cuenta.css';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function Cuenta() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [token] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState('');
  const [favCount, setFavCount] = useState(0);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const push = usePushNotifications(Boolean(token));

  useEffect(() => {
    if (!token) return;
    setAuth(token);
    api
      .get('/api/auth/me')
      .then((res) => {
        setUser(res.data.user as AuthUser);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setAuth(null);
        setError(t('sessionInvalid'));
      });
  }, [token, t]);

  useEffect(() => {
    void listFavorites().then((items) => setFavCount(items.length));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const name = useMemo(() => {
    if (!user) return '…';
    if (user.name) return user.name;
    return (
      [user.nombre, user.ape_paterno, user.ape_materno].filter(Boolean).join(' ') ||
      'Usuario TraGo'
    );
  }, [user]);

  if (!token) {
    return <Navigate to="/entrar" replace />;
  }

  function logout() {
    localStorage.removeItem('token');
    clearAgeBand();
    void clearCatalogCache();
    setAuth(null);
    navigate('/entrar', { replace: true });
  }

  const points = user?.puntos ?? user?.points ?? 0;
  const langLabel = locale === 'en' ? 'English' : 'Español';

  return (
    <section className="cuenta-app">
      {error && <p className="error">{error}</p>}
      {!user && !error && <p className="muted">{t('loading')}</p>}

      {user && (
        <>
          <article className="cuenta-profile rise" data-reveal>
            <div className="cuenta-avatar" aria-hidden>
              {initials(name)}
            </div>
            <div>
              <p className="ui-kicker">
                {online ? t('online') : t('offline')}
              </p>
              <h2>{name}</h2>
              <p className="meta">{user.correo || user.email}</p>
              <div className="cuenta-badges">
                {points > 0 ? (
                  <span className="badge soft">{points} pts</span>
                ) : null}
              </div>
            </div>
          </article>

          <nav
            className="settings-list stagger"
            aria-label={t('settingsAria')}
            data-reveal
            data-reveal-delay="1"
          >
            <Link className="settings-row" to="/idioma" viewTransition>
              <span>{t('settingsLanguage')}</span>
              <em>
                {langLabel} ›
              </em>
            </Link>
            <Link className="settings-row" to="/favoritos" viewTransition>
              <span>{t('settingsFavorites')}</span>
              <em>{favCount}</em>
            </Link>
            <Link className="settings-row" to="/cadena" viewTransition>
              <span>{t('titleChain')}</span>
              <em>›</em>
            </Link>
            <Link className="settings-row" to="/promos" viewTransition>
              <span>{t('settingsPromos')}</span>
              <em>›</em>
            </Link>
            <Link className="settings-row" to="/cerca" viewTransition>
              <span>{t('settingsNear')}</span>
              <em>›</em>
            </Link>
            {push.state === 'unsupported' ? (
              <div className="settings-row is-static">
                <span>{t('settingsNotif')}</span>
                <em className="soon">{t('settingsSoon')}</em>
              </div>
            ) : (
              <div className="settings-push">
                <div className="settings-row is-static">
                  <span>{t('settingsNotif')}</span>
                  <em>
                    {push.state === 'on'
                      ? t('notifOn')
                      : push.state === 'checking'
                        ? t('loading')
                        : t('settingsNotifEnable')}
                  </em>
                </div>
                <div className="settings-push-body">
                  {push.state === 'ios' ? <p>{t('notifIos')}</p> : null}
                  {push.state === 'off' ? (
                    <>
                      <p>{t('notifBody')}</p>
                      <button
                        type="button"
                        className="btn primary"
                        disabled={push.busy}
                        onClick={() => void push.enable(t('notifActivated'))}
                      >
                        {push.busy ? t('settingsNotifBusy') : t('settingsNotifEnable')}
                      </button>
                    </>
                  ) : null}
                  {push.state === 'on' ? (
                    <div className="settings-push-actions">
                      <button
                        type="button"
                        className="btn primary"
                        disabled={push.busy}
                        onClick={() => void push.test(t('notifTestSent'))}
                      >
                        {t('notifTest')}
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={push.busy}
                        onClick={() => void push.disable(t('notifDeactivated'))}
                      >
                        {t('notifDisable')}
                      </button>
                    </div>
                  ) : null}
                  {push.note ? <p className="settings-push-note">{push.note}</p> : null}
                </div>
              </div>
            )}
            <Link
              className="settings-row"
              to="/aviso-de-privacidad"
              viewTransition
            >
              <span>{t('settingsPrivacy')}</span>
              <em>›</em>
            </Link>
            <Link className="settings-row" to="/terminos" viewTransition>
              <span>{t('settingsTerms')}</span>
              <em>›</em>
            </Link>
          </nav>

          <button type="button" className="btn ghost logout-btn" onClick={logout}>
            {t('logout')}
          </button>
        </>
      )}
    </section>
  );
}
