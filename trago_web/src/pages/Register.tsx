import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setAuth } from '../api';
import {
  ageFromBirthDate,
  maxBirthDateForAccount,
  MIN_ACCOUNT_AGE,
  MIN_AGE,
} from '../lib/age';
import { useI18n } from '../lib/i18n';
import './Legal.css';

export default function Register() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [confirmAge, setConfirmAge] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!acceptTerms || !acceptPrivacy || !confirmAge) {
      setError(t('acceptTermsNeed'));
      return;
    }

    const years = ageFromBirthDate(new Date(birthDate));
    if (years < MIN_ACCOUNT_AGE) {
      setError(t('minAgeError', { n: MIN_ACCOUNT_AGE }));
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
      if (data.user?.band) {
        localStorage.setItem('trago_band', data.user.band);
      }
      setAuth(data.token);
      navigate('/cuenta', { replace: true });
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
    <section className="auth">
      <h1>{t('registerTitle')}</h1>
      <p className="lead">
        {t('registerLead', { minAccount: MIN_ACCOUNT_AGE, minAge: MIN_AGE })}
      </p>
      <form className="card-form" onSubmit={onSubmit}>
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
            minLength={6}
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
          <label>
            <input
              type="checkbox"
              checked={confirmAge}
              onChange={(e) => setConfirmAge(e.target.checked)}
            />
            <span>{t('confirmAge', { n: MIN_AGE })}</span>
          </label>
        </div>

        <button className="btn primary" disabled={loading}>
          {loading ? t('creating') : t('createAccount')}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <p className="muted">
        {t('hasAccount')} <Link to="/entrar">{t('loginSubmit')}</Link>
      </p>
      <p className="muted">
        <Link to="/idioma">{t('languageLink')}</Link>
      </p>
    </section>
  );
}
