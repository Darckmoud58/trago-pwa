import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PromoPrice from '../components/PromoPrice';
import { isBirthdayFreebie, useAuthUser } from '../hooks/useAuthUser';
import {
  CACHE_KEYS,
  cacheGet,
  cacheSet,
  filterActivePromos,
} from '../lib/offlineCache';
import { useI18n } from '../lib/i18n';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { trackGps } from '../lib/metrics';
import type { Promo } from '../types';
import './Home.css';

const NEAR_RADIUS_M = 2000;
const BDAY_RADIUS_M = 5000;

function readGps(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('no-geo'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 60_000,
    });
  });
}

function nearestBranchMeta(p: Promo): { label: string; meters?: number } | null {
  const near = [...(p.ubicacionesCercanas || [])].sort(
    (a, b) => (a.distanceMeters ?? 1e9) - (b.distanceMeters ?? 1e9)
  )[0];
  if (!near) return null;
  return {
    label: near.nombre || '',
    meters:
      typeof near.distanceMeters === 'number' ? near.distanceMeters : undefined,
  };
}

function formatDistance(
  meters: number | undefined,
  nearLabel: string,
  kmLabel: string
) {
  if (meters == null || !Number.isFinite(meters)) return '';
  if (meters < 1000) {
    return nearLabel.replace('{m}', String(Math.round(meters)));
  }
  return kmLabel.replace('{km}', (meters / 1000).toFixed(1));
}

function isLandingTitle(promo: Promo) {
  const title = String(promo.nombre || promo.title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
  return /^(promociones|ofertas|promos)(oficiales)?/.test(title) && title.length < 28;
}

export default function Home() {
  const { t } = useI18n();
  const { token, birthdayToday, firstName } = useAuthUser();

  const [nearPromos, setNearPromos] = useState<Promo[]>([]);
  const [catalogPromos, setCatalogPromos] = useState<Promo[]>([]);
  const [nearLoading, setNearLoading] = useState(true);
  const [nearGpsError, setNearGpsError] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const [bdayPromos, setBdayPromos] = useState<Promo[]>([]);
  const [bdayLoading, setBdayLoading] = useState(false);
  const [bdayGpsError, setBdayGpsError] = useState(false);
  const [bdayEmpty, setBdayEmpty] = useState(false);

  const bdayFree = useMemo(
    () => bdayPromos.filter((p) => isBirthdayFreebie(p)),
    [bdayPromos]
  );
  const bdayDeals = useMemo(
    () => bdayPromos.filter((p) => !isBirthdayFreebie(p)),
    [bdayPromos]
  );

  const categories = [
    { id: 'todas', label: t('catAll'), to: '/promos' },
    { id: 'comida', label: t('catFood'), to: '/promos?f=comida' },
    { id: 'cafe', label: t('catCafe'), to: '/promos?f=cafe' },
  ];

  /** Home = certeza local: GPS × ofertas oficiales cerca. */
  useEffect(() => {
    let cancelled = false;

    async function loadNear() {
      setNearLoading(true);
      setNearGpsError(false);
      setFromCache(false);
      try {
        const pos = await readGps();
        if (cancelled) return;
        void trackGps(true, pos.coords.latitude, pos.coords.longitude);
        const { data } = await api.get('/api/promociones/cerca', {
          params: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            maxMeters: NEAR_RADIUS_M,
          },
          timeout: 25_000,
        });
        if (cancelled) return;
        const list = filterActivePromos((data.promos ?? []) as Promo[])
          .filter((p) => !p.requiresAuth && !isLandingTitle(p))
          .sort((a, b) => {
            const da = nearestBranchMeta(a)?.meters ?? 1e9;
            const db = nearestBranchMeta(b)?.meters ?? 1e9;
            return da - db;
          });
        setNearPromos(list.slice(0, 10));
        await cacheSet(CACHE_KEYS.promos, list.slice(0, 20));
        if (list.length === 0) {
          try {
            const res = await api.get('/api/promociones');
            if (cancelled) return;
            const all = filterActivePromos((res.data.promos ?? []) as Promo[]);
            const destacadas = all.filter((p) => p.featured || p.destacada);
            setCatalogPromos((destacadas.length ? destacadas : all).slice(0, 8));
          } catch {
            /* vacío cerca y sin catálogo */
          }
        }
      } catch {
        void trackGps(false);
        if (cancelled) return;
        setNearGpsError(true);
        setNearPromos([]);
        // Fallback honesto: catálogo destacado (sin fingir GPS).
        try {
          const res = await api.get('/api/promociones');
          if (cancelled) return;
          const list = filterActivePromos((res.data.promos ?? []) as Promo[]);
          const destacadas = list.filter((p) => p.featured || p.destacada);
          setCatalogPromos((destacadas.length ? destacadas : list).slice(0, 8));
          await cacheSet(CACHE_KEYS.promos, list);
        } catch {
          const cached = await cacheGet<Promo[]>(CACHE_KEYS.promos);
          if (cancelled) return;
          if (cached?.data?.length) {
            const active = filterActivePromos(cached.data);
            setCatalogPromos(active.slice(0, 8));
            setFromCache(true);
          }
        }
      } finally {
        if (!cancelled) setNearLoading(false);
      }
    }

    void loadNear();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!birthdayToday) {
      setBdayPromos([]);
      setBdayGpsError(false);
      setBdayEmpty(false);
      setBdayLoading(false);
      return;
    }

    async function loadBirthdayNear() {
      setBdayLoading(true);
      setBdayGpsError(false);
      setBdayEmpty(false);
      setBdayPromos([]);
      try {
        const pos = await readGps();
        if (cancelled) return;
        const { data } = await api.get('/api/promociones/cerca', {
          params: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            maxMeters: BDAY_RADIUS_M,
            birthday: '1',
          },
          timeout: 20_000,
        });
        if (cancelled) return;
        const list = filterActivePromos(
          ((data.promos ?? []) as Promo[]).filter(
            (p) => p.cumpleanos || p.isBirthday
          )
        );
        setBdayPromos(list.slice(0, 12));
        setBdayEmpty(list.length === 0);
      } catch (err) {
        if (cancelled) return;
        if ((err as { response?: unknown })?.response) {
          setBdayEmpty(true);
        } else {
          setBdayGpsError(true);
        }
      } finally {
        if (!cancelled) setBdayLoading(false);
      }
    }

    void loadBirthdayNear();
    return () => {
      cancelled = true;
    };
  }, [birthdayToday]);

  function scrollToBirthday() {
    document
      .getElementById('hoy-cumple')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPromoCard(p: Promo, opts?: { featured?: boolean }) {
    const img = resolveMediaUrl(p.imagen || p.imageUrl);
    const title = p.nombre || p.title || t('promoFallback');
    const near = nearestBranchMeta(p);
    const dist = formatDistance(near?.meters, t('bdayMeters'), t('homeNearKm'));
    const featured = Boolean(opts?.featured);
    return (
      <Link
        key={p._id}
        to={`/promos/${p.slug || p._id}`}
        className={`home-deal${featured ? ' is-featured' : ''}${img ? '' : ' is-plain'}`}
        viewTransition
      >
        <div className="home-deal-media" aria-hidden>
          {img ? (
            <img
              src={img}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="home-deal-fallback">
              {(p.chainName || 'TG').slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="home-deal-shade" />
        </div>
        <div className="home-deal-copy">
          <div className="home-deal-top">
            <p className="feed-chain">{p.chainName || t('chainFallback')}</p>
            {dist ? <span className="home-dist-pill">{dist}</span> : null}
          </div>
          {featured ? (
            <p className="home-deal-eyebrow">{t('homeFeaturedNear')}</p>
          ) : null}
          <h3>{title}</h3>
          <PromoPrice promo={p} />
          {near?.label ? <p className="meta">{near.label}</p> : null}
        </div>
      </Link>
    );
  }

  const showNearFeed = !nearGpsError && (nearLoading || nearPromos.length > 0);
  const showCatalogFallback =
    nearGpsError || (!nearLoading && nearPromos.length === 0);
  const featuredNear = nearPromos[0] ?? null;
  const railNear = nearPromos.slice(1);

  return (
    <div className="home-app">
      <section
        className={`home-hero home-hero-stage${birthdayToday ? ' is-bday' : ''}`}
      >
        <div className="home-hero-visual" aria-hidden>
          <span className="home-hero-beam" />
          <span className="home-hero-beam home-hero-beam-2" />
          <span className="home-hero-orb" />
          <span className="home-hero-grain" />
          <span className="home-hero-grid" />
          {birthdayToday ? (
            <span className="home-bday-confetti" aria-hidden>
              {Array.from({ length: 18 }).map((_, i) => (
                <i key={i} style={{ '--i': i } as CSSProperties} />
              ))}
            </span>
          ) : null}
        </div>
        <div className="home-hero-content">
          {birthdayToday ? (
            <>
              <p className="home-hero-kicker">{t('bdayHeroLead')}</p>
              <h1 className="brand-mark home-brand home-bday-title-hero">
                {t('bdayTitle').replace(
                  '{name}',
                  firstName ? `, ${firstName}` : ''
                )}
              </h1>
              <p className="home-headline">{t('bdayWelcome')}</p>
              <p className="home-subhead">{t('bdayBody')}</p>
              <div className="home-hero-cta">
                <button
                  type="button"
                  className="btn primary home-cta-main"
                  onClick={scrollToBirthday}
                >
                  {t('bdaySeeGifts')}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="home-hero-kicker">{t('hello')}</p>
              <h1 className="brand-mark home-brand">
                Tr<span className="home-brand-pin" aria-hidden />
                go
              </h1>
              <p className="home-headline">{t('homeCertainty')}</p>
              <p className="home-subhead">{t('homeCertaintySub')}</p>
              <div className="home-hero-cta">
                <Link
                  className="btn primary home-cta-main"
                  to="/cerca"
                  viewTransition
                >
                  {t('homeOpenAround')}
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {birthdayToday && (
        <section
          id="hoy-cumple"
          className="home-bday home-bday-celebrate"
          data-reveal
          aria-labelledby="home-bday-title"
        >
          <p className="ui-kicker">{t('catBdayToday')}</p>
          <h2 id="home-bday-title">{t('bdaySeeGifts')}</h2>
          <p className="meta">{t('bdayWelcome')}</p>

          {bdayLoading && (
            <p className="muted" role="status">
              {t('bdayLoading')}
            </p>
          )}

          {bdayGpsError && !bdayLoading && (
            <div className="home-bday-note">
              <p>{t('bdayGpsError')}</p>
              <Link className="btn primary" to="/cerca" viewTransition>
                {t('openNear')}
              </Link>
            </div>
          )}

          {bdayEmpty && !bdayLoading && !bdayGpsError && (
            <div className="home-bday-note">
              <p>{t('bdayEmptyNear')}</p>
              <div className="home-bday-actions">
                <Link
                  className="btn primary"
                  to="/promos?f=cumple"
                  viewTransition
                >
                  {t('bdayOpenCatalog')}
                </Link>
                <Link className="btn ghost" to="/cerca" viewTransition>
                  {t('openNear')}
                </Link>
              </div>
            </div>
          )}

          {bdayFree.length > 0 && (
            <div className="home-bday-group">
              <h3>{t('bdayFreeTitle')}</h3>
              <div className="home-deal-rail scroll-rail stagger">
                {bdayFree.map((p) => renderPromoCard(p))}
              </div>
            </div>
          )}

          {bdayDeals.length > 0 && (
            <div className="home-bday-group">
              <h3>{t('bdayDealTitle')}</h3>
              <div className="home-deal-rail scroll-rail stagger">
                {bdayDeals.map((p) => renderPromoCard(p))}
              </div>
            </div>
          )}
        </section>
      )}

      {showNearFeed && (
        <section
          className="home-block home-near-block"
          data-reveal
          aria-labelledby="home-near-title"
        >
          <div className="block-head">
            <div>
              <p className="ui-kicker">{t('gpsLabel')}</p>
              <h2 id="home-near-title">{t('homeNearTitle')}</h2>
              <p className="home-section-lead">{t('homeNearLead')}</p>
            </div>
            <Link className="text-link" to="/cerca" viewTransition>
              {t('openNear')}
            </Link>
          </div>
          {nearLoading && nearPromos.length === 0 && (
            <div className="home-skel" aria-busy>
              <p className="muted">{t('homeGpsLoading')}</p>
              <div className="home-skel-featured ui-skeleton" />
              <div className="home-skel-row">
                <div className="ui-skeleton" />
                <div className="ui-skeleton" />
              </div>
            </div>
          )}
          {featuredNear && (
            <div className="home-featured-slot stagger">
              {renderPromoCard(featuredNear, { featured: true })}
            </div>
          )}
          {railNear.length > 0 && (
            <div className="home-deal-rail scroll-rail stagger">
              {railNear.map((p) => renderPromoCard(p))}
            </div>
          )}
        </section>
      )}

      {showCatalogFallback && (
        <section className="home-block" data-reveal data-reveal-delay="1">
          <div className="block-head">
            <div>
              {nearGpsError ? (
                <>
                  <p className="ui-kicker">{t('gpsLabel')}</p>
                  <h2>{t('featured')}</h2>
                </>
              ) : (
                <h2>{t('homeNearTitle')}</h2>
              )}
            </div>
            <Link className="text-link" to="/promos" viewTransition>
              {t('seeAll')}
            </Link>
          </div>
          {nearGpsError && (
            <p className="home-gps-note">{t('homeGpsDenied')}</p>
          )}
          {!nearGpsError && !nearLoading && nearPromos.length === 0 && (
            <p className="home-gps-note">{t('homeNearEmpty')}</p>
          )}
          {fromCache && <p className="cache-hint">{t('cacheHint')}</p>}
          {catalogPromos.length > 0 ? (
            <div className="home-deal-rail scroll-rail stagger">
              {catalogPromos.map((p) => renderPromoCard(p))}
            </div>
          ) : (
            !nearLoading && (
              <p className="muted">
                {t('promosEmptyOfficial')}{' '}
                <Link to="/cerca">{t('openNear')}</Link>
              </p>
            )
          )}
        </section>
      )}

      <section className="home-block home-cats" data-reveal data-reveal-delay="2">
        <div className="block-head">
          <h2>{t('categories')}</h2>
        </div>
        <div className="cat-scroll scroll-rail" role="list">
          {categories.map((c) => (
            <Link key={c.id} className="cat-chip" to={c.to} role="listitem">
              {c.label}
            </Link>
          ))}
          <Link className="cat-chip cat-chip-accent" to="/cerca" role="listitem">
            {t('quickNear')}
          </Link>
          {token ? (
            <Link className="cat-chip" to="/favoritos" role="listitem">
              {t('quickFavorites')}
            </Link>
          ) : (
            <Link
              className="cat-chip"
              to="/entrar"
              state={{ from: '/', reason: 'account' }}
              role="listitem"
            >
              {t('quickLogin')}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
