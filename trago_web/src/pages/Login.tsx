import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setAuth } from '../api';
import { useI18n } from '../lib/i18n';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useI18n();
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
      localStorage.setItem('token', data.token);
      if (data.user?.band) localStorage.setItem('trago_band', data.user.band);
      setAuth(data.token);
      navigate('/cuenta', { replace: true });
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
    <section className="auth">
      <h1>{t('loginTitle')}</h1>
      <p className="lead">
        {t('loginLead')} <code>demo@trago.app</code> / <code>TraGo123!</code>
      </p>
      <form className="card-form" onSubmit={onSubmit}>
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
          {loading ? t('loggingIn') : t('loginSubmit')}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <p className="muted">
        {t('noAccount')} <Link to="/registro">{t('registerLink')}</Link>
      </p>
      <p className="muted">
        <Link to="/idioma">{t('languageLink')}</Link>
      </p>
    </section>
  );
}
