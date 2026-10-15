import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, setAuth } from '../api';
import { isBirthdayToday } from '../lib/birthday';
import {
  CACHE_KEYS,
  cacheGet,
  cacheSet,
  filterActivePromos,
} from '../lib/offlineCache';
import { useI18n } from '../lib/i18n';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { canSeeAlcoholUi } from '../lib/viewerAccess';
import type { AuthUser, Promo } from '../types';
import './Home.css';

const AGE_KEY = 'trago_age_ack';
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

export default function Home() {
  const { t, locale } = useI18n();
  const [showAge, setShowAge] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [promosError, setPromosError] = useState(false);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const token = localStorage.getItem('token');

  const [user, setUser] = useState<AuthUser | null>(null);
  const [bdayPromos, setBdayPromos] = useState<Promo[]>([]);
  const [bdayLoading, setBdayLoading] = useState(false);
  const [bdayGpsError, setBdayGpsError] = useState(false);
  const [bdayEmpty, setBdayEmpty] = useState(false);

  const birth = user?.birthDate || user?.fecha_nacimiento || null;
  const birthdayToday = Boolean(token && birth && isBirthdayToday(birth));
  const firstName =
    user?.nombre ||
    (user?.name ? String(user.name).split(/\s+/)[0] : '') ||
    '';

  const showAlcoholCat = canSeeAlcoholUi();

  // Categorías = atajos de catálogo. 18+ solo con sesión adulta. Cumple = momento del día.
  const categories = [
    { id: 'todas', label: t('catAll'), to: '/promos' },
    { id: 'comida', label: t('catFood'), to: '/promos?f=comida' },
    { id: 'cafe', label: t('catCafe'), to: '/promos?f=cafe' },
    ...(showAlcoholCat
      ? [{ id: 'alcohol', label: t('catAlcohol'), to: '/promos?f=alcohol' }]
      : []),
  ];

  useEffect(() => {
    if (!localStorage.getItem(AGE_KEY)) setShowAge(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setUser(null);
      return;
    }
    setAuth(token);
    api
      .get('/api/auth/me')
      .then((res) => {
        if (!cancelled) setUser(res.data.user as AuthUser);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

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

  function ackAge() {
    localStorage.setItem(AGE_KEY, '1');
    setShowAge(false);
  }

  function scrollToBirthday() {
    document
      .getElementById('hoy-cumple')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          {birthdayToday ? (
            <button
              type="button"
              className="quick-chip primary"
              onClick={scrollToBirthday}
            >
              {t('quickBday')}
            </button>
          ) : (
            <Link className="quick-chip primary" to="/cerca" viewTransition>
              {t('quickNear')}
            </Link>
          )}
          {birthdayToday && (
            <Link className="quick-chip" to="/cerca" viewTransition>
              {t('quickNear')}
            </Link>
          )}
          <Link className="quick-chip" to="/promos" viewTransition>
            {t('quickPromos')}
          </Link>
          {token ? (
            <Link className="quick-chip" to="/favoritos" viewTransition>
              {t('quickFavorites')}
            </Link>
          ) : (
            <Link
              className="quick-chip"
              to="/entrar"
              state={{ from: '/', reason: 'account' }}
              viewTransition
            >
              {t('quickLogin')}
            </Link>
          )}
        </div>
      </section>

      {birthdayToday && (
        <section
          id="hoy-cumple"
          className="home-bday rise"
          data-reveal
          aria-labelledby="home-bday-title"
        >
          <p className="ui-kicker">{t('catBdayToday')}</p>
          <h2 id="home-bday-title">
            {t('bdayTitle').replace(
              '{name}',
              firstName ? `, ${firstName}` : ''
            )}
          </h2>
          <p className="meta">{t('bdayBody')}</p>

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

          {bdayPromos.length > 0 && (
            <div className="feed-rail scroll-rail stagger">
              {bdayPromos.map((p) => {
                const img = resolveMediaUrl(p.imagen || p.imageUrl);
                const title = p.nombre || p.title || t('promoFallback');
                const near = nearestBranchMeta(p);
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
                        <span>
                          {(p.chainName || 'TG').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="feed-body">
                      <p className="feed-chain">
                        {p.chainName || t('chainFallback')}
                      </p>
                      <h3>{title}</h3>
                      {near && (
                        <p className="meta">
                          {near.label ? `${near.label} · ` : ''}
                          {near.meters != null
                            ? t('bdayMeters').replace(
                                '{m}',
                                String(Math.round(near.meters))
                              )
                            : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

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
