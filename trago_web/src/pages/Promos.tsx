import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import {
  CACHE_KEYS,
  cacheGet,
  cacheSet,
  filterActivePromos,
} from '../lib/offlineCache';
import type { Promo } from '../types';
import './Promos.css';

type FilterId =
  | 'todas'
  | 'destacadas'
  | 'alcohol'
  | 'nocturno'
  | 'cumple'
  | 'comida'
  | 'cafe';

const FILTER_IDS: FilterId[] = [
  'todas',
  'destacadas',
  'cumple',
  'comida',
  'cafe',
  'nocturno',
  'alcohol',
];

function parseFilter(raw: string | null): FilterId {
  if (raw && (FILTER_IDS as string[]).includes(raw)) return raw as FilterId;
  return 'todas';
}

function kindOf(p: Promo) {
  return (p.kind || '').toLowerCase();
}

function matchesKind(p: Promo, needles: string[]) {
  const k = kindOf(p);
  const hay = [k, p.nombre, p.title, p.descripcion, p.subtitle, p.chainName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return needles.some((n) => k.includes(n) || hay.includes(n));
}

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
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function Promos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>(() =>
    parseFilter(searchParams.get('f'))
  );
  const band = localStorage.getItem('trago_band');
  const isTeen = band === 'teen';

  useEffect(() => {
    setFilter(parseFilter(searchParams.get('f')));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/api/promociones');
        if (cancelled) return;
        const list = filterActivePromos((res.data.promos ?? []) as Promo[]);
        await cacheSet(CACHE_KEYS.promos, list);
        setPromos(list);
        setFromCache(false);
        setError('');
      } catch {
        const cached = await cacheGet<Promo[]>(CACHE_KEYS.promos);
        if (cancelled) return;
        if (cached?.data?.length) {
          setPromos(filterActivePromos(cached.data));
          setFromCache(true);
          setError('');
        } else {
          setError(
            'No se pudieron cargar las promos. Revisa tu conexión o vuelve más tarde.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function applyFilter(next: FilterId) {
    setFilter(next);
    if (next === 'todas') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ f: next }, { replace: true });
    }
  }

  const ageSafe = useMemo(() => {
    if (!isTeen) return promos;
    return promos.filter((p) => !isAlcoholRestricted(p));
  }, [promos, isTeen]);

  const hiddenCount = promos.length - ageSafe.length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ageSafe.filter((p) => {
      if (filter === 'destacadas' && !(p.featured || p.destacada)) return false;
      if (filter === 'alcohol' && !p.alcohol && p.audience !== 'adult')
        return false;
      if (filter === 'nocturno' && !(p.nocturno || p.isNocturno)) return false;
      if (filter === 'cumple' && !(p.cumpleanos || p.isBirthday)) return false;
      if (
        filter === 'comida' &&
        !matchesKind(p, [
          'comida',
          '2x1',
          'combo',
          'pasta',
          'birria',
          'arrachera',
        ])
      )
        return false;
      if (
        filter === 'cafe' &&
        !matchesKind(p, ['cafe', 'café', 'starbucks', 'bebida'])
      )
        return false;
      if (!q) return true;
      const hay = [p.nombre, p.title, p.descripcion, p.subtitle, p.chainName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [ageSafe, filter, query]);

  const filters: { id: FilterId; label: string; hideForTeen?: boolean }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'destacadas', label: 'Destacadas' },
    { id: 'comida', label: 'Comida' },
    { id: 'cafe', label: 'Café' },
    { id: 'cumple', label: 'Cumpleaños' },
    { id: 'nocturno', label: 'Nocturno', hideForTeen: true },
    { id: 'alcohol', label: '18+', hideForTeen: true },
  ];

  return (
    <section className="promos-page">
      {isTeen && (
        <aside className="promos-note">
          Perfil 13–17: ocultamos alcohol y nocturno
          {hiddenCount > 0 ? ` (${hiddenCount})` : ''}.
        </aside>
      )}

      <div className="promos-toolbar">
        <label className="promos-search">
          <span className="sr-only">Buscar</span>
          <input
            type="search"
            placeholder="Buscar nombre o cadena…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
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
                onClick={() => applyFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
        </div>
      </div>

      <p className="promos-count meta">
        {loading
          ? 'Cargando…'
          : `${visible.length} promo${visible.length === 1 ? '' : 's'}${
              fromCache ? ' · caché local' : ''
            }`}
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
              style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
            >
              <Link
                to={`/promos/${p.slug || p._id}`}
                className={`promo-cover${img ? '' : ' promo-cover-fallback'}`}
                style={img ? { backgroundImage: `url(${img})` } : undefined}
                aria-label={title}
              >
                {!img && (
                  <span>{(p.chainName || 'TG').slice(0, 2).toUpperCase()}</span>
                )}
              </Link>

              <div className="promo-body">
                <div className="promo-tags">
                  <span className="tag">{p.chainName || 'Cadena'}</span>
                  {(p.featured || p.destacada) && (
                    <span className="tag accent">Destacada</span>
                  )}
                  {p.alcohol && <span className="tag warn">18+</span>}
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
                  {end && (
                    <span className="meta">
                      Hasta {new Date(end).toLocaleDateString()}
                      {left != null && left >= 0 ? ` · ${left}d` : ''}
                      {left != null && left < 0 ? ' · caducada' : ''}
                    </span>
                  )}
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
              applyFilter('todas');
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
