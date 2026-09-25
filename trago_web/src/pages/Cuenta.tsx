import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, setAuth } from '../api';
import { listFavorites } from '../lib/favorites';
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
  const [token] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState('');
  const [favCount, setFavCount] = useState(0);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (!token) return;
    setAuth(token);
    api
      .get('/api/auth/me')
      .then((res) => {
        const u = res.data.user as AuthUser;
        setUser(u);
        const b = u?.band || u?.age?.band;
        if (b) localStorage.setItem('trago_band', b);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('trago_band');
        setAuth(null);
        setError('Sesión inválida. Vuelve a entrar.');
      });
  }, [token]);

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
    localStorage.removeItem('token');
    localStorage.removeItem('trago_band');
    setAuth(null);
    navigate('/entrar', { replace: true });
  }

  const band = user?.age?.band || user?.band || '—';
  const points = user?.puntos ?? user?.points ?? 0;
  const bandLabel =
    band === 'adult' ? '18+' : band === 'teen' ? '13–17' : String(band);

  return (
    <section className="cuenta-app">
      <p className={`status-pill ${online ? 'on' : 'off'}`}>
        {online ? 'En línea' : 'Sin conexión'}
      </p>

      {error && <p className="error">{error}</p>}
      {!user && !error && <p className="muted">Cargando…</p>}

      {user && (
        <>
          <article className="cuenta-profile">
            <div className="cuenta-avatar" aria-hidden>
              {initials(name)}
            </div>
            <div>
              <h2>{name}</h2>
              <p className="meta">{user.correo || user.email}</p>
              <div className="cuenta-badges">
                <span className="badge">{bandLabel}</span>
                <span className="badge soft">{points} pts</span>
              </div>
            </div>
          </article>

          <nav className="settings-list" aria-label="Ajustes">
            <Link className="settings-row" to="/favoritos">
              <span>Favoritos</span>
              <em>{favCount}</em>
            </Link>
            <Link className="settings-row" to="/promos">
              <span>Promociones</span>
              <em>›</em>
            </Link>
            <Link className="settings-row" to="/cerca">
              <span>Cerca de ti</span>
              <em>›</em>
            </Link>
            <div className="settings-row is-static">
              <span>Notificaciones</span>
              <em className="soon">Próximamente</em>
            </div>
            <Link className="settings-row" to="/aviso-de-privacidad">
              <span>Privacidad</span>
              <em>›</em>
            </Link>
            <Link className="settings-row" to="/terminos">
              <span>Términos</span>
              <em>›</em>
            </Link>
          </nav>

          {band === 'teen' && (
            <aside className="cuenta-note">
              Perfil 13–17: ocultamos alcohol y nocturno.
            </aside>
          )}

          <button type="button" className="btn ghost logout-btn" onClick={logout}>
            Cerrar sesión
          </button>
        </>
      )}
    </section>
  );
}
