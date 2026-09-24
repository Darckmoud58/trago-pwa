import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Promo } from '../types';
import './Promos.css';

type FilterId = 'todas' | 'destacadas' | 'alcohol' | 'nocturno' | 'cumple';

function isAlcoholRestricted(p: Promo) {
  return (
    !!p.alcohol ||
    p.audience === 'adult' ||
    p.audiencia === 'adulto' ||
    !!(p.nocturno || p.isNocturno)
  );
}

function daysLeft(iso?: string) {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Promos() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('todas');
  const band = localStorage.getItem('trago_band');
  const isTeen = band === 'teen';

  useEffect(() => {
    api
      .get('/api/promociones')
      .then((res) => setPromos(res.data.promos ?? []))
      .catch(() =>
        setError(
          'No se pudieron cargar las promos. Revisa tu conexión o vuelve más tarde.'
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const ageSafe = useMemo(() => {
    if (!isTeen) return promos;
    return promos.filter((p) => !isAlcoholRestricted(p));
  }, [promos, isTeen]);

  const hiddenCount = promos.length - ageSafe.length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ageSafe.filter((p) => {
      if (filter === 'destacadas' && !(p.featured || p.destacada)) return false;
      if (filter === 'alcohol' && !p.alcohol) return false;
      if (filter === 'nocturno' && !(p.nocturno || p.isNocturno)) return false;
      if (filter === 'cumple' && !(p.cumpleanos || p.isBirthday)) return false;
      if (!q) return true;
      const hay = [
        p.nombre,
        p.title,
        p.descripcion,
        p.subtitle,
        p.chainName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [ageSafe, filter, query]);

  const filters: { id: FilterId; label: string; hideForTeen?: boolean }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'destacadas', label: 'Destacadas' },
    { id: 'cumple', label: 'Cumpleaños' },
    { id: 'nocturno', label: 'Nocturno', hideForTeen: true },
    { id: 'alcohol', label: '18+', hideForTeen: true },
  ];

  return (
    <section className="promos-page">
      <header className="promos-head">
        <p className="label">Catálogo</p>
        <h1>Promos</h1>
        <p className="lead">
          Ofertas vigentes en la ZMG. Guarda locales en{' '}
          <Link to="/favoritos">favoritos</Link> o búscalos{' '}
          <Link to="/cerca">cerca de ti</Link>.
        </p>
      </header>

      {isTeen && (
        <aside className="promos-note">
          Perfil 13–17: ocultamos alcohol y nocturno
          {hiddenCount > 0 ? ` (${hiddenCount})` : ''}.{' '}
          <Link to="/terminos">Términos</Link>
        </aside>
      )}

      <div className="promos-toolbar">
        <label className="promos-search">
          <span className="sr-only">Buscar</span>
          <input
            type="search"
            placeholder="Buscar por nombre o cadena…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="promos-filters" role="tablist" aria-label="Filtros">
          {filters
            .filter((f) => !(isTeen && f.hideForTeen))
            .map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={`filter-chip ${filter === f.id ? 'is-on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
        </div>
      </div>

      <p className="promos-count meta">
        {loading
          ? 'Cargando…'
          : `${visible.length} promo${visible.length === 1 ? '' : 's'}`}
      </p>

      {error && <p className="error">{error}</p>}

      <div className="promo-grid promos-grid">
        {visible.map((p, i) => {
          const title = p.nombre || p.title || 'Promoción';
          const desc = p.descripcion || p.subtitle;
          const end = p.termina_en || p.endsAt;
          const left = daysLeft(end);
          const img = p.imagen || p.imageUrl;

          return (
            <article
              key={p._id}
              className="promo-card promo-rich rise"
              style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
            >
              {img ? (
                <Link
                  to={`/promos/${p.slug || p._id}`}
                  className="promo-cover"
                  style={{ backgroundImage: `url(${img})` }}
                  aria-label={title}
                />
              ) : (
                <Link
                  to={`/promos/${p.slug || p._id}`}
                  className="promo-cover promo-cover-fallback"
                  aria-label={title}
                >
                  <span>{(p.chainName || 'TG').slice(0, 2).toUpperCase()}</span>
                </Link>
              )}

              <div className="promo-body">
                <div className="promo-tags">
                  <span className="tag">{p.chainName || 'Cadena'}</span>
                  {(p.featured || p.destacada) && (
                    <span className="tag accent">Destacada</span>
                  )}
                  {p.alcohol && <span className="tag warn">18+</span>}
                  {(p.nocturno || p.isNocturno) && (
                    <span className="tag">Nocturno</span>
                  )}
                  {(p.cumpleanos || p.isBirthday) && (
                    <span className="tag">Cumple</span>
                  )}
                </div>

                <h3>
                  <Link
                    to={`/promos/${p.slug || p._id}`}
                    className="promo-title-link"
                  >
                    {title}
                  </Link>
                </h3>
                {desc && <p className="promo-desc">{desc}</p>}

                <div className="promo-meta-row">
                  {typeof p.puntos === 'number' && p.puntos > 0 && (
                    <span className="meta">{p.puntos} pts</span>
                  )}
                  {end && (
                    <span className="meta">
                      Hasta {new Date(end).toLocaleDateString()}
                      {left != null && left >= 0 ? ` · ${left}d` : ''}
                      {left != null && left < 0 ? ' · caducada' : ''}
                    </span>
                  )}
                </div>

                <div className="promo-actions">
                  <Link
                    className="btn primary btn-sm"
                    to={`/promos/${p.slug || p._id}`}
                  >
                    Ver detalle
                  </Link>
                  <Link className="btn ghost btn-sm" to="/cerca">
                    Cerca
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && !error && visible.length === 0 && (
        <div className="empty-state promos-empty">
          <p>No hay promociones con ese filtro.</p>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setFilter('todas');
              setQuery('');
            }}
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </section>
  );
}
