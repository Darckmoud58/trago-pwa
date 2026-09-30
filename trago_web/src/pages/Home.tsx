import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  CACHE_KEYS,
  cacheGet,
  cacheSet,
  filterActivePromos,
} from '../lib/offlineCache';
import type { Promo } from '../types';
import './Home.css';

const AGE_KEY = 'trago_age_ack';

const CATEGORIES = [
  { id: 'todas', label: 'Todas', to: '/promos' },
  { id: 'comida', label: 'Comida', to: '/promos?f=comida' },
  { id: 'cumple', label: 'Cumple', to: '/promos?f=cumple' },
  { id: 'cafe', label: 'Café', to: '/promos?f=cafe' },
  { id: 'alcohol', label: '18+', to: '/promos?f=alcohol' },
];

export default function Home() {
  const [showAge, setShowAge] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [promosError, setPromosError] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!localStorage.getItem(AGE_KEY)) setShowAge(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await api.get('/api/promociones');
        if (cancelled) return;
        const list = filterActivePromos((res.data.promos ?? []) as Promo[]);
        await cacheSet(CACHE_KEYS.promos, list);
        const destacadas = list.filter((p) => p.featured || p.destacada);
        setPromos((destacadas.length ? destacadas : list).slice(0, 6));
        setFromCache(false);
        setPromosError(false);
      } catch {
        const cached = await cacheGet<Promo[]>(CACHE_KEYS.promos);
        if (cancelled) return;
        if (cached?.data?.length) {
          const active = filterActivePromos(cached.data);
          const destacadas = active.filter((p) => p.featured || p.destacada);
          setPromos((destacadas.length ? destacadas : active).slice(0, 6));
          setFromCache(true);
          setPromosError(false);
        } else {
          setPromosError(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function ackAge() {
    localStorage.setItem(AGE_KEY, '1');
    setShowAge(false);
  }

  return (
    <div className="home-app">
      {showAge && (
        <div className="age-sheet" role="dialog" aria-label="Aviso de edad">
          <p>
            Hay promos con <strong>alcohol solo 18+</strong>. Al continuar
            aceptas los <Link to="/terminos">términos</Link> y el{' '}
            <Link to="/aviso-de-privacidad">aviso de privacidad</Link>.
          </p>
          <button type="button" className="btn primary" onClick={ackAge}>
            Entendido
          </button>
        </div>
      )}

      <section className="home-greet rise">
        <p className="home-hello">Hola{token ? '' : ' 👋'}</p>
        <h2 className="home-headline">¿Qué se te antoja hoy?</h2>
        <div className="quick-actions" aria-label="Acciones rápidas">
          <Link className="quick-chip primary" to="/cerca">
            ⌖ Cerca de mí
          </Link>
          <Link className="quick-chip" to="/promos">
            ★ Promos
          </Link>
          <Link className="quick-chip" to="/favoritos">
            ♥ Favoritos
          </Link>
          {!token && (
            <Link className="quick-chip" to="/entrar">
              Entrar
            </Link>
          )}
        </div>
      </section>

      <section className="home-block">
        <div className="block-head">
          <h3>Categorías</h3>
        </div>
        <div className="cat-scroll" role="list">
          {CATEGORIES.map((c) => (
            <Link key={c.id} className="cat-chip" to={c.to} role="listitem">
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="home-block">
        <div className="block-head">
          <h3>Destacadas</h3>
          <Link className="text-link" to="/promos">
            Ver todas
          </Link>
        </div>
        {fromCache && (
          <p className="cache-hint">Mostrando última consulta guardada</p>
        )}
        {promosError && (
          <p className="muted">
            Sin conexión a la API. Revisa favoritos o vuelve más tarde.
          </p>
        )}
        {!promosError && promos.length === 0 && (
          <p className="muted">Cargando…</p>
        )}
        <div className="feed-list">
          {promos.map((p, i) => (
            <Link
              key={p._id}
              to={`/promos/${p.slug || p._id}`}
              className="feed-card rise"
              style={{ animationDelay: `${Math.min(i, 6) * 0.04}s` }}
            >
              <div
                className="feed-thumb"
                style={
                  p.imagen || p.imageUrl
                    ? {
                        backgroundImage: `url(${p.imagen || p.imageUrl})`,
                      }
                    : undefined
                }
                aria-hidden
              >
                {!(p.imagen || p.imageUrl) &&
                  (p.chainName || 'TG').slice(0, 2).toUpperCase()}
              </div>
              <div className="feed-body">
                <p className="feed-chain">{p.chainName || 'Cadena'}</p>
                <h4>{p.nombre || p.title}</h4>
                <p className="meta">
                  {p.alcohol ? '18+ · ' : ''}
                  {(p.termina_en || p.endsAt) &&
                    `hasta ${new Date(
                      p.termina_en || p.endsAt!
                    ).toLocaleDateString()}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-cta-card">
        <p className="label">GPS</p>
        <h3>Qué hay a tu alrededor</h3>
        <p className="meta">
          Sucursales reales en GDL y Zapopan. Guárdalas para verlas offline.
        </p>
        <Link className="btn primary" to="/cerca">
          Abrir cerca
        </Link>
      </section>
    </div>
  );
}
