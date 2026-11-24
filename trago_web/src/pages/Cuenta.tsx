import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, clearToken, readToken, setAuth } from '../api';
import { clearAgeBand } from '../lib/ageBand';
import { clearCatalogCache } from '../lib/catalogCache';
import { listFavorites } from '../lib/favorites';
import { useI18n } from '../lib/i18n';
import { replayOnboarding } from '../lib/onboarding';
import { usePushNotifications } from '../lib/usePushNotifications';
import { useUserPrefs } from '../hooks/useUserPrefs';
import {
  PREF_CATEGORIES,
  type PrefCategory,
  type UiDensity,
} from '../lib/userPrefs';
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
  const [token] = useState(() => readToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState('');
  const [favCount, setFavCount] = useState(0);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const push = usePushNotifications(Boolean(token));
  const { prefs, updatePrefs } = useUserPrefs();
  const [prefsNote, setPrefsNote] = useState('');
  const [prefsBusy, setPrefsBusy] = useState(false);

  const catLabels: Record<PrefCategory, string> = {
    comida: t('prefsCatComida'),
    cafe: t('prefsCatCafe'),
    antro: t('prefsCatAntro'),
    destilados: t('prefsCatDestilados'),
    cumple: t('prefsCatCumple'),
  };

  async function savePrefs(patch: Parameters<typeof updatePrefs>[0]) {
    setPrefsBusy(true);
    setPrefsNote('');
    try {
      await updatePrefs(patch);
      setPrefsNote(t('prefsSaved'));
    } finally {
      setPrefsBusy(false);
    }
  }

  function toggleCat(cat: PrefCategory) {
    const has = prefs.categoriasFav.includes(cat);
    const next = has
      ? prefs.categoriasFav.filter((c) => c !== cat)
      : [...prefs.categoriasFav, cat];
    void savePrefs({ categoriasFav: next });
  }

  useEffect(() => {
    if (!token) return;
    setAuth(token);
    api
      .get('/api/auth/me')
      .then((res) => {
        setUser(res.data.user as AuthUser);
        setError('');
      })
      .catch((err: { response?: { status?: number }; code?: string }) => {
        const status = err?.response?.status;
        const offline =
          typeof navigator !== 'undefined' && !navigator.onLine;
        const noResponse = !err?.response;
        const temporary =
          offline ||
          noResponse ||
          err?.code === 'ERR_NETWORK' ||
          err?.code === 'ECONNABORTED' ||
          (typeof status === 'number' && status >= 500);
        if (temporary) {
          // Conservar sesión: no es lo mismo que JWT inválido.
          setError(t('sessionOfflineKeep'));
          return;
        }
        if (status === 401 || status === 403) {
          clearToken();
          setError(t('sessionInvalid'));
          return;
        }
        setError(t('sessionOfflineKeep'));
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
    clearToken();
    clearAgeBand();
    void clearCatalogCache();
    navigate('/entrar', { replace: true });
  }

  const points = user?.puntos ?? user?.points ?? 0;
  const langLabel = locale === 'en' ? 'English' : 'Español';

  return (
    <section className="cuenta-app">
      {error && (
        <p className={online ? 'error' : 'cuenta-offline-note'} role="status">
          {error}
        </p>
      )}
      {!user && !error && <p className="muted">{t('loading')}</p>}
      {!user && error ? (
        <div className="cuenta-offline-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => window.location.reload()}
          >
            {t('retryAction')}
          </button>
        </div>
      ) : null}

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

          <section
            className="cuenta-prefs rise"
            data-reveal
            aria-labelledby="cuenta-prefs-title"
          >
            <p className="ui-kicker">{t('prefsTitle')}</p>
            <h3 id="cuenta-prefs-title">{t('prefsTitle')}</h3>
            <p className="meta">{t('prefsLead')}</p>

            <p className="cuenta-prefs-label">{t('prefsCats')}</p>
            <div className="cuenta-prefs-chips" role="group" aria-label={t('prefsCats')}>
              {PREF_CATEGORIES.map((cat) => {
                const on = prefs.categoriasFav.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`cuenta-pref-chip${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    disabled={prefsBusy}
                    onClick={() => toggleCat(cat)}
                  >
                    {catLabels[cat]}
                  </button>
                );
              })}
            </div>

            <p className="cuenta-prefs-label">{t('prefsDensity')}</p>
            <div className="cuenta-prefs-chips" role="group" aria-label={t('prefsDensity')}>
              {(
                [
                  ['comoda', t('prefsDensityComfy')],
                  ['compacta', t('prefsDensityCompact')],
                ] as [UiDensity, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`cuenta-pref-chip${prefs.densidad === id ? ' is-on' : ''}`}
                  aria-pressed={prefs.densidad === id}
                  disabled={prefsBusy}
                  onClick={() => void savePrefs({ densidad: id })}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="cuenta-prefs-label">{t('prefsZone')}</p>
            <div className="cuenta-prefs-chips" role="group" aria-label={t('prefsZone')}>
              <button
                type="button"
                className={`cuenta-pref-chip${prefs.zona === 'gdl' ? ' is-on' : ''}`}
                aria-pressed={prefs.zona === 'gdl'}
                disabled={prefsBusy}
                onClick={() => void savePrefs({ zona: 'gdl' })}
              >
                GDL
              </button>
            </div>
            {prefsNote ? (
              <p className="cuenta-prefs-note" role="status">
                {prefsNote}
              </p>
            ) : null}
          </section>

          <nav
            className="settings-list stagger"
            aria-label={t('settingsAria')}
            data-reveal
            data-reveal-delay="1"
          >
            <button
              type="button"
              className="settings-row"
              onClick={replayOnboarding}
            >
              <span>{t('tourReplay')}</span>
              <em>›</em>
            </button>
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
            {['empresa', 'chain', 'admin'].includes(
              String(user?.rol?.codigo || '')
            ) && (
              <Link className="settings-row" to="/cadena" viewTransition>
                <span>{t('titleChain')}</span>
                <em>›</em>
              </Link>
            )}
            <Link className="settings-row" to="/entrar-empresa" viewTransition>
              <span>{t('bizLoginNav')}</span>
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
