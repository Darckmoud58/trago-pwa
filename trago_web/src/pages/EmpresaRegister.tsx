import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, saveToken } from '../api';
import { maxBirthDateForAccount } from '../lib/age';
import { clearCatalogCache } from '../lib/catalogCache';
import { useI18n } from '../lib/i18n';
import './Legal.css';

/**
 * Un solo registro: la cadena ES quien se da de alta
 * (responsable + empresa + rol, sin paso intermedio).
 */
export default function EmpresaRegister() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [empresaDesc, setEmpresaDesc] = useState('');
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
      const { data } = await api.post('/api/cadena/registro-empresa', {
        empresaNombre,
        empresaDescripcion: empresaDesc,
        name,
        email,
        password,
        birthDate,
        acceptTerms,
        acceptPrivacy,
      });
      saveToken(data.token);
      await clearCatalogCache();
      navigate('/cadena', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t('bizRegisterError');
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
        <p className="lead">{t('bizRegisterLead')}</p>
      </div>
      <form className="card-form auth-card" onSubmit={onSubmit}>
        <h2 className="auth-form-title">{t('bizRegisterTitle')}</h2>
        <p className="meta auth-fav-hint">{t('bizRegisterHint')}</p>

        <label>
          {t('bizCompanyName')}
          <input
            value={empresaNombre}
            onChange={(e) => setEmpresaNombre(e.target.value)}
            required
            autoComplete="organization"
          />
        </label>
        <label>
          {t('bizCompanyDesc')}
          <textarea
            value={empresaDesc}
            onChange={(e) => setEmpresaDesc(e.target.value)}
            rows={2}
          />
        </label>
        <label>
          {t('bizContactName')}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
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
          {t('bizBirthDate')}
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
          {loading ? t('creating') : t('bizRegisterSubmit')}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <p className="muted">
        {t('bizAlreadyRegistered')}{' '}
        <Link to="/entrar-empresa" viewTransition>
          {t('bizLoginSubmit')}
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
