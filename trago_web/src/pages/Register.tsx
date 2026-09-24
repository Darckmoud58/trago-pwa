import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setAuth } from '../api';
import {
  ageFromBirthDate,
  maxBirthDateForAccount,
  MIN_ACCOUNT_AGE,
  MIN_AGE,
} from '../lib/age';
import './Legal.css';

export default function Register() {
  const navigate = useNavigate();
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
      setError('Debes aceptar términos, aviso de privacidad y confirmar tu edad.');
      return;
    }

    const years = ageFromBirthDate(new Date(birthDate));
    if (years < MIN_ACCOUNT_AGE) {
      setError(`Debes tener al menos ${MIN_ACCOUNT_AGE} años para crear una cuenta.`);
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
          ?.message || 'Error al registrar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth">
      <h1>Registro</h1>
      <p className="lead">
        Mínimo {MIN_ACCOUNT_AGE} años. Promos con alcohol y nocturno solo para{' '}
        {MIN_AGE}+.
      </p>
      <form className="card-form" onSubmit={onSubmit}>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Contraseña
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
          Fecha de nacimiento
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
              Acepto los{' '}
              <Link to="/terminos" target="_blank" rel="noreferrer">
                Términos y condiciones
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
              Acepto el{' '}
              <Link to="/aviso-de-privacidad" target="_blank" rel="noreferrer">
                Aviso de privacidad
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
            <span>
              Confirmo que mi fecha de nacimiento es real. Sé que el contenido
              con alcohol es solo para mayores de {MIN_AGE} años.
            </span>
          </label>
        </div>

        <button className="btn primary" disabled={loading}>
          {loading ? 'Creando…' : 'Crear cuenta'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <p className="muted">
        ¿Ya tienes cuenta? <Link to="/entrar">Entrar</Link>
      </p>
    </section>
  );
}
