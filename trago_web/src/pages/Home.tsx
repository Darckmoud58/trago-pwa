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
import { resolveMediaUrl } from '../lib/mediaUrl';
import type { Promo } from '../types';
import './Home.css';

const AGE_KEY = 'trago_age_ack';

export default function Home() {
  const { t, locale } = useI18n();
  const [showAge, setShowAge] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [promosError, setPromosError] = useState(false);
  const [loadingPromos, setLoadingPromos] = useState(true);
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
      setLoadingPromos(true);
      try {
        const res = await api.get('/api/promociones');
        if (cancelled) return;
        const list = filterActivePromos((res.data.promos ?? []) as Promo[]);
        await cacheSet(CACHE_KEYS.promos, list);
        const destacadas = list.filter((p) => p.featured || p.destacada);
        setPromos((destacadas.length ? destacadas : list).slice(0, 8));
        setFromCache(false);
        setPromosError(false);
      } catch {
        const cached = await cacheGet<Promo[]>(CACHE_KEYS.promos);
        if (cancelled) return;
        if (cached?.data?.length) {
          const active = filterActivePromos(cached.data);
          const destacadas = active.filter((p) => p.featured || p.destacada);
          setPromos((destacadas.length ? destacadas : active).slice(0, 8));
          setFromCache(true);
          setPromosError(false);
        } else {
          setPromosError(true);
        }
      } finally {
        if (!cancelled) setLoadingPromos(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

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

      <section className="home-hero rise">
        <p className="ui-kicker">{t('hello')}</p>
        <h1 className="brand-mark home-brand">TraGo</h1>
        <p className="home-headline">{t('homeHeadline')}</p>
        <div className="quick-actions scroll-rail stagger" aria-label={t('navAria')}>
          <Link className="quick-chip primary" to="/cerca" viewTransition>
            {t('quickNear')}
          </Link>
          <Link className="quick-chip" to="/promos" viewTransition>
            {t('quickPromos')}
          </Link>
          <Link className="quick-chip" to="/favoritos" viewTransition>
            {t('quickFavorites')}
          </Link>
          {!token && (
            <Link className="quick-chip" to="/entrar" viewTransition>
              {t('quickLogin')}
            </Link>
          )}
        </div>
      </section>

      <section className="home-block" data-reveal>
        <div className="block-head">
          <h2>{t('categories')}</h2>
        </div>
        <div className="cat-scroll scroll-rail" role="list">
          {categories.map((c) => (
            <Link key={c.id} className="cat-chip" to={c.to} role="listitem">
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="home-block" data-reveal data-reveal-delay="1">
        <div className="block-head">
          <h2>{t('featured')}</h2>
          <Link className="text-link" to="/promos" viewTransition>
            {t('seeAll')}
          </Link>
        </div>
        {fromCache && <p className="cache-hint">{t('cacheHint')}</p>}
        {promosError && <p className="muted">{t('apiOffline')}</p>}
        {loadingPromos && !promosError && promos.length === 0 && (
          <div className="home-skel" aria-hidden>
            <div className="ui-skeleton" />
            <div className="ui-skeleton" />
          </div>
        )}
        {!loadingPromos && !promosError && promos.length === 0 && (
          <p className="muted">
            {t('promosEmptyOfficial')}{' '}
            <Link to="/cerca">{t('openNear')}</Link>
          </p>
        )}
        <div className="feed-rail scroll-rail stagger">
          {promos.map((p) => {
            const img = resolveMediaUrl(p.imagen || p.imageUrl);
            const title = p.nombre || p.title || t('promoFallback');
            return (
              <Link
                key={p._id}
                to={`/promos/${p.slug || p._id}`}
                className="feed-card"
                viewTransition
              >
                <div className="feed-media" aria-hidden>
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{(p.chainName || 'TG').slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="feed-body">
                  <p className="feed-chain">
                    {p.chainName || t('chainFallback')}
                  </p>
                  <h3>{title}</h3>
                  <p className="meta">
                    {p.alcohol ? '18+ · ' : ''}
                    {(p.termina_en || p.endsAt) &&
                      `${t('until')} ${new Date(
                        p.termina_en || p.endsAt!
                      ).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX')}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="home-cta-card rise" data-reveal data-reveal-delay="2">
        <p className="ui-kicker">{t('gpsLabel')}</p>
        <h2>{t('aroundTitle')}</h2>
        <p className="meta">{t('aroundBody')}</p>
        <Link className="btn primary" to="/cerca" viewTransition>
          {t('openNear')}
        </Link>
      </section>
    </div>
  );
}
