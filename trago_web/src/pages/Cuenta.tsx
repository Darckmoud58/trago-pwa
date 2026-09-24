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

function levelProgress(puntos: number, ptsMin?: number | null, ptsMax?: number | null) {
  const min = ptsMin ?? 0;
  if (ptsMax == null || ptsMax <= min) {
    return { pct: 100, label: `${puntos} pts · nivel máximo del rango` };
  }
  const pct = Math.max(0, Math.min(100, ((puntos - min) / (ptsMax - min)) * 100));
  return {
    pct,
    label: `${puntos} / ${ptsMax} pts para el siguiente tramo`,
  };
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
  const nivel = user?.nivel;
  const progress = levelProgress(points, nivel?.pts_min, nivel?.pts_max);
  const bandLabel =
    band === 'adult' ? '18+' : band === 'teen' ? '13–17' : String(band);

  return (
    <section className="cuenta">
      <header className="cuenta-head">
        <div>
          <p className="label">Tu perfil</p>
          <h1>Cuenta</h1>
          <p className="lead">Puntos, nivel, favoritos offline y accesos rápidos.</p>
        </div>
        <span className={`status-pill ${online ? 'on' : 'off'}`}>
          {online ? 'En línea' : 'Sin conexión'}
        </span>
      </header>

      {error && <p className="error">{error}</p>}

      {!user && !error && <p className="muted">Cargando perfil…</p>}

      {user && (
        <>
          <article className="cuenta-hero promo-card">
            <div className="cuenta-hero-top">
              <div className="cuenta-avatar" aria-hidden>
                {initials(name)}
              </div>
              <div className="cuenta-id">
                <h2>{name}</h2>
                <p className="meta">{user.correo || user.email}</p>
                <div className="cuenta-badges">
                  <span className="badge">{bandLabel}</span>
                  {user.rol?.nombre && (
                    <span className="badge soft">{user.rol.nombre}</span>
                  )}
                  {user.estatus && (
                    <span className="badge soft">{user.estatus}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="cuenta-stats">
              <div className="stat">
                <p className="label">Puntos</p>
                <p className="stat-value">{points}</p>
              </div>
              <div className="stat">
                <p className="label">Nivel</p>
                <p className="stat-value">{nivel?.nombre || '—'}</p>
              </div>
              <div className="stat">
                <p className="label">Favoritos</p>
                <p className="stat-value">{favCount}</p>
              </div>
              <div className="stat">
                <p className="label">Edad</p>
                <p className="stat-value">{user.edad ?? '—'}</p>
              </div>
            </div>

            {nivel && (
              <div className="nivel-block">
                <div className="nivel-row">
                  <strong>{nivel.nombre}</strong>
                  <span className="meta">{progress.label}</span>
                </div>
                <div className="nivel-bar" aria-hidden>
                  <span style={{ width: `${progress.pct}%` }} />
                </div>
                {nivel.beneficio && (
                  <p className="meta nivel-beneficio">{nivel.beneficio}</p>
                )}
              </div>
            )}
          </article>

          <section className="cuenta-section">
            <h3>Accesos rápidos</h3>
            <div className="cuenta-actions">
              <Link className="action-tile" to="/favoritos">
                <span className="action-ico">♥</span>
                <strong>Favoritos</strong>
                <em>{favCount} guardados · offline</em>
              </Link>
              <Link className="action-tile" to="/promos">
                <span className="action-ico">★</span>
                <strong>Promos</strong>
                <em>Catálogo vigente</em>
              </Link>
              <Link className="action-tile" to="/cerca">
                <span className="action-ico">⌖</span>
                <strong>Cerca</strong>
                <em>GPS en la ZMG</em>
              </Link>
              <Link className="action-tile" to="/negocios">
                <span className="action-ico">⌂</span>
                <strong>Negocios</strong>
                <em>Cadenas y locales</em>
              </Link>
            </div>
          </section>

          {band === 'teen' && (
            <aside className="cuenta-note">
              <p className="label">Perfil 13–17</p>
              <p>
                Ocultamos promociones con alcohol y nocturno. Al cumplir 18, tu
                banda cambia automáticamente según la edad registrada.
              </p>
            </aside>
          )}

          <section className="cuenta-section">
            <h3>Legal</h3>
            <div className="cuenta-legal">
              <Link to="/terminos">Términos y condiciones</Link>
              <Link to="/aviso-de-privacidad">Aviso de privacidad</Link>
            </div>
          </section>

          <div className="cta-row cuenta-logout">
            <button type="button" className="btn ghost" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </section>
  );
}
