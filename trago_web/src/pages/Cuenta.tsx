import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, setAuth } from '../api';
import type { AuthUser } from '../types';

export default function Cuenta() {
  const navigate = useNavigate();
  const [token] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setAuth(token);
    api
      .get('/api/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('token');
        setAuth(null);
        setError('Sesión inválida');
      });
  }, [token]);

  if (!token) {
    return <Navigate to="/entrar" replace />;
  }

  function logout() {
    localStorage.removeItem('token');
    setAuth(null);
    navigate('/entrar', { replace: true });
  }

  const name = user?.profile?.name || user?.name || '…';
  const band = user?.age?.band || user?.band || '—';
  const points = user?.points ?? 0;

  return (
    <section className="auth">
      <h1>Cuenta</h1>
      <p className="lead">GET /api/auth/me · Bearer token</p>
      {error && <p className="error">{error}</p>}
      {user ? (
        <div className="promo-card">
          <p className="label">Sesión</p>
          <h3>{name}</h3>
          <p>{user.email}</p>
          <p className="meta">
            Banda: {band} · Puntos: {points}
          </p>
          <div className="cta-row" style={{ marginTop: '1rem' }}>
            <Link className="btn ghost" to="/promos">
              Ver promos
            </Link>
            <button type="button" className="btn primary" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : (
        !error && <p className="muted">Cargando perfil…</p>
      )}
    </section>
  );
}
