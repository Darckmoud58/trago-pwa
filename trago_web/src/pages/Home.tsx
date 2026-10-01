import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  CACHE_KEYS,
  cacheGet,
  cacheSet,
  filterActivePromos,
} from '../lib/offlineCache';
import { useI18n } from '../lib/i18n';
import type { Promo } from '../types';
import './Home.css';

const AGE_KEY = 'trago_age_ack';

export default function Home() {
  const { t, locale } = useI18n();
  const [showAge, setShowAge] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [promosError, setPromosError] = useState(false);
  const token = localStorage.getItem('token');

  const categories = [
    { id: 'todas', label: t('catAll'), to: '/promos' },
    { id: 'comida', label: t('catFood'), to: '/promos?f=comida' },
    { id: 'cumple', label: t('catBday'), to: '/promos?f=cumple' },
    { id: 'cafe', label: t('catCafe'), to: '/promos?f=cafe' },
    { id: 'alcohol', label: t('catAlcohol'), to: '/promos?f=alcohol' },
  ];

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
        <div className="age-sheet" role="dialog" aria-label={t('ageDialog')}>
          <p>
            {t('ageBody')}{' '}
            <Link to="/terminos">{t('ageTerms')}</Link> ·{' '}
            <Link to="/aviso-de-privacidad">{t('agePrivacy')}</Link>.
          </p>
          <button type="button" className="btn primary" onClick={ackAge}>
            {t('understood')}
          </button>
        </div>
      )}

      <section className="home-greet rise">
        <p className="home-hello">
          {t('hello')}
          {token ? '' : ' 👋'}
        </p>
        <h2 className="home-headline">{t('homeHeadline')}</h2>
        <div className="quick-actions" aria-label={t('navAria')}>
          <Link className="quick-chip primary" to="/cerca">
            ⌖ {t('quickNear')}
          </Link>
          <Link className="quick-chip" to="/promos">
            ★ {t('quickPromos')}
          </Link>
          <Link className="quick-chip" to="/favoritos">
            ♥ {t('quickFavorites')}
          </Link>
          {!token && (
            <Link className="quick-chip" to="/entrar">
              {t('quickLogin')}
            </Link>
          )}
        </div>
      </section>

      <section className="home-block">
        <div className="block-head">
          <h3>{t('categories')}</h3>
        </div>
        <div className="cat-scroll" role="list">
          {categories.map((c) => (
            <Link key={c.id} className="cat-chip" to={c.to} role="listitem">
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="home-block">
        <div className="block-head">
          <h3>{t('featured')}</h3>
          <Link className="text-link" to="/promos">
            {t('seeAll')}
          </Link>
        </div>
        {fromCache && <p className="cache-hint">{t('cacheHint')}</p>}
        {promosError && <p className="muted">{t('apiOffline')}</p>}
        {!promosError && promos.length === 0 && (
          <p className="muted">{t('loading')}</p>
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
                <p className="feed-chain">
                  {p.chainName || t('chainFallback')}
                </p>
                <h4>{p.nombre || p.title}</h4>
                <p className="meta">
                  {p.alcohol ? '18+ · ' : ''}
                  {(p.termina_en || p.endsAt) &&
                    `${t('until')} ${new Date(
                      p.termina_en || p.endsAt!
                    ).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX')}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-cta-card">
        <p className="label">{t('gpsLabel')}</p>
        <h3>{t('aroundTitle')}</h3>
        <p className="meta">{t('aroundBody')}</p>
        <Link className="btn primary" to="/cerca">
          {t('openNear')}
        </Link>
      </section>
    </div>
  );
}
