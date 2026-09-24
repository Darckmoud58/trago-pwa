import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import FavoriteButton from '../components/FavoriteButton';
import type { Negocio } from '../types';
import './Promos.css';

export default function Negocios() {
  const [items, setItems] = useState<Negocio[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .get('/api/negocios')
      .then((res) => setItems(res.data.negocios ?? res.data.empresas ?? []))
      .catch(() =>
        setError(
          'No se pudieron cargar los negocios. Si estás sin red, revisa tus favoritos.'
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) => {
      const hay = [n.nombre, n.name, n.description, n.descripcion, n.kind]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  return (
    <section className="promos-page">
      <header className="promos-head">
        <p className="label">Directorio</p>
        <h1>Negocios</h1>
        <p className="lead">
          Cadenas y locales en TraGo. Guárdalos en{' '}
          <Link to="/favoritos">favoritos</Link> para verlos offline.
        </p>
      </header>

      <div className="promos-toolbar">
        <label className="promos-search">
          <span className="sr-only">Buscar negocio</span>
          <input
            type="search"
            placeholder="Buscar negocio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <p className="promos-count meta">
        {loading
          ? 'Cargando…'
          : `${visible.length} negocio${visible.length === 1 ? '' : 's'}`}
      </p>

      {error && <p className="error">{error}</p>}

      <div className="promo-grid">
        {visible.map((n) => {
          const id = String(n._id);
          const nombre = n.nombre || n.name || 'Negocio';
          const desc = n.description || n.descripcion;
          return (
            <article key={id} className="promo-card place-card">
              <div className="place-card-top">
                <p className="label">{n.kind || n.plan || 'Cadena'}</p>
                <FavoriteButton
                  place={{
                    id,
                    type: 'empresa',
                    nombre,
                    subtitulo: desc,
                  }}
                />
              </div>
              <h3>{nombre}</h3>
              {desc && <p className="meta">{desc}</p>}
            </article>
          );
        })}
      </div>

      {!loading && !error && visible.length === 0 && (
        <div className="empty-state promos-empty">
          <p>No hay negocios con esa búsqueda.</p>
        </div>
      )}
    </section>
  );
}
