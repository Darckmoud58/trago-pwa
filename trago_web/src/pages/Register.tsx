import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, setAuth } from '../api';
import { maxBirthDateForAccount, MIN_ACCOUNT_AGE, MIN_AGE } from '../lib/age';
import { clearCatalogCache } from '../lib/catalogCache';
import { consumePendingFavorite } from '../lib/favorites';
import { useI18n } from '../lib/i18n';
import './Legal.css';

type AuthLocationState = {
  from?: string;
  reason?: string;
};

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const authState = (location.state || {}) as AuthLocationState;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!acceptTerms || !acceptPrivacy) {
      setError(t('acceptTermsNeed'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', {
        name,
        email,
        password,
        birthDate,
      });
      localStorage.setItem('token', data.token);
      setAuth(data.token);
      await clearCatalogCache();
      const pendingTo = await consumePendingFavorite();
      const dest = pendingTo || authState.from || '/cuenta';
      navigate(dest, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t('registerError');
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
        <p className="lead">
          {t('registerLead', { minAccount: MIN_ACCOUNT_AGE, minAge: MIN_AGE })}
        </p>
      </div>
      <form className="card-form auth-card" onSubmit={onSubmit}>
        <h2 className="auth-form-title">{t('registerTitle')}</h2>
        {authState.reason === 'favorite' && (
          <p className="meta auth-fav-hint">{t('favLoginHint')}</p>
        )}
        <label>
          {t('name')}
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
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
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
        </label>
        <label>
          {t('birthDate')}
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            max={maxBirthDateForAccount()}
          />
        </label>

        <div className="legal-checks">
          <label>
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span>
              {t('acceptTerms')}{' '}
              <Link to="/terminos" target="_blank" rel="noreferrer">
                {t('termsLink')}
              </Link>
              .
            </span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={acceptPrivacy}
              onChange={(e) => setAcceptPrivacy(e.target.checked)}
            />
            <span>
              {t('acceptPrivacy')}{' '}
              <Link to="/aviso-de-privacidad" target="_blank" rel="noreferrer">
                {t('privacyLink')}
              </Link>{' '}
              (LFPDPPP).
            </span>
          </label>
        </div>

        <button className="btn primary" disabled={loading}>
          {loading ? t('creating') : t('createAccount')}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <p className="muted">
        {t('hasAccount')}{' '}
        <Link to="/entrar" state={authState} viewTransition>
          {t('loginSubmit')}
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
