import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, saveToken } from '../api';
import { clearCatalogCache } from '../lib/catalogCache';
import { useI18n } from '../lib/i18n';

type AuthLocationState = {
  from?: string;
  reason?: string;
};

/**
 * Entrada dedicada para cadenas / marcas (panel, pauta, suscripción).
 * No es la cuenta de cazador de promos.
 */
export default function EmpresaLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const authState = (location.state || {}) as AuthLocationState;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      saveToken(data.token);
      await clearCatalogCache();
      const dest =
        authState.from && String(authState.from).startsWith('/cadena')
          ? authState.from
          : '/cadena';
      navigate(dest, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t('loginError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth auth-shell">
      <div className="auth-brand rise">
        <p className="ui-kicker">{t('bizLoginKicker')}</p>
        <h1 className="brand-mark">TraGo</h1>
        <p className="lead">{t('bizLoginLead')}</p>
      </div>
      <form className="card-form auth-card" onSubmit={onSubmit}>
        <h2 className="auth-form-title">{t('bizLoginTitle')}</h2>
        <p className="meta auth-fav-hint">{t('bizLoginHint')}</p>
        <label>
          {t('email')}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          {t('password')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button className="btn primary" disabled={loading}>
          {loading ? t('loggingIn') : t('bizLoginSubmit')}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <p className="muted">
        {t('bizNoAccount')}{' '}
        <Link to="/registro-empresa" viewTransition>
          {t('bizRegisterLink')}
        </Link>
      </p>
      <p className="muted">
        <Link to="/entrar" viewTransition>
          {t('bizUserLoginLink')}
        </Link>
      </p>
    </section>
  );
}
