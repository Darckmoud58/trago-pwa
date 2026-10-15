import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setAuth } from '../api';
import { setAgeBand, type AgeBand } from '../lib/ageBand';
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
      if (data.user?.band === 'teen' || data.user?.band === 'adult') {
        setAgeBand(data.user.band as AgeBand);
      }
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
    <section className="auth auth-shell">
      <div className="auth-brand rise">
        <p className="ui-kicker">TraGo</p>
        <h1 className="brand-mark">TraGo</h1>
        <p className="lead">{t('loginLead')}</p>
      </div>
      <form className="card-form auth-card" onSubmit={onSubmit}>
        <h2 className="auth-form-title">{t('loginTitle')}</h2>
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
        {t('noAccount')}{' '}
        <Link to="/registro" viewTransition>
          {t('registerLink')}
        </Link>
      </p>
      <p className="muted">
        <Link to="/idioma" viewTransition>
          {t('languageLink')}
        </Link>
      </p>
    </section>
  );
}
