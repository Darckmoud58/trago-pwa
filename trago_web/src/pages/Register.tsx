import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setAuth } from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
      <p className="lead">Mínimo 13 años. Alcohol y nocturno requieren 18+.</p>
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
          />
        </label>
        <label>
          Fecha de nacimiento
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </label>
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
