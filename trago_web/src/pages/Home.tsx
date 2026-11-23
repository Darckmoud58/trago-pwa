import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PromoMediaImg from '../components/PromoMediaImg';
import PromoPrice from '../components/PromoPrice';
import SponsoredSlot from '../components/SponsoredSlot';
import { isBirthdayFreebie, useAuthUser } from '../hooks/useAuthUser';
import { useUserPrefs } from '../hooks/useUserPrefs';
import {
  CACHE_KEYS,
  cacheGet,
  cacheSet,
  filterActivePromos,
  filterGuestSafePromos,
} from '../lib/offlineCache';
import { greetingKey } from '../lib/greeting';
import { useI18n } from '../lib/i18n';
import {
  birthdayUnlockKey,
  readSessionFlag,
  writeSessionFlag,
} from '../lib/birthdayDay';
import {
  isGeolocationError,
  readGpsCached,
  setLastKnownGps,
} from '../lib/lastKnownGps';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { track, trackGps } from '../lib/metrics';
import {
  isOnboardingOpen,
  replayOnboarding,
  SPLASH_CLOSED,
} from '../lib/onboarding';
import { formatCacheAge } from '../lib/userPrefs';
import type { Promo } from '../types';
import OfflineState from '../components/OfflineState';
import './Home.css';

const NEAR_RADIUS_M = 2000;
const NEAR_EXPAND_M = 8000;
const BDAY_RADIUS_M = 8000;
const GPS_TIMEOUT_MS = 10_000;
const CERCA_TIMEOUT_MS = 15_000;

type NearFailKind = 'denied' | 'timeout' | 'api' | null;

type LoadNearOpts = {
  /** Ignora Traguito abierto (p. ej. botón Activar ubicación). */
  force?: boolean;
  lat?: number;
  lng?: number;
  maxMeters?: number;
};

type BdayPhase = 'welcome' | 'seeking' | 'reveal';

function readBdayUnlocked(userId: string | null | undefined) {
  if (!userId) return false;
  return readSessionFlag(birthdayUnlockKey(userId));
}

function writeBdayUnlocked(userId: string | null | undefined) {
  if (!userId) return;
  writeSessionFlag(birthdayUnlockKey(userId));
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

function promoMeters(p: Promo) {
  return nearestBranchMeta(p)?.meters ?? 1e9;
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

type ExploreIconName = 'pin' | 'grid' | 'food' | 'cafe' | 'heart' | 'user';

function ExploreIcon({ name }: { name: ExploreIconName }) {
  if (name === 'pin') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"
        />
      </svg>
    );
  }
  if (name === 'grid') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
        />
      </svg>
    );
  }
  if (name === 'food') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M7 3v7.2c0 1.1-.6 1.8-1.5 2.1V21H4v-8.7C3.1 12 2.5 11.3 2.5 10.2V3H4v6h.8V3H7Zm7.2 0c1.8 0 3.3 1.4 3.3 3.6V13h-1.8v8h-2.1v-8H11.8V6.6C11.8 4.4 13.1 3 14.2 3Zm5.3 0H21v13.5h-1.8v-5.2c-1.1-.2-1.9-1-1.9-2.2V3h1.9Z"
        />
      </svg>
    );
  }
  if (name === 'cafe') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M4 5h12v7.5A3.5 3.5 0 0 1 12.5 16H7.5A3.5 3.5 0 0 1 4 12.5V5Zm12 2h1.8A3.2 3.2 0 0 1 21 10.2 3.2 3.2 0 0 1 17.8 13.4H16V7ZM5 18h12v2H5v-2Z"
        />
      </svg>
    );
  }
  if (name === 'heart') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M12 20.4 10.6 19.1C5.4 14.4 2 11.3 2 7.6A4.5 4.5 0 0 1 6.5 3.1c1.7 0 3.4.9 4.5 2.3A5.7 5.7 0 0 1 15.5 3.1 4.5 4.5 0 0 1 20 7.6c0 3.7-3.4 6.8-8.6 11.5L12 20.4Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M12 12.4a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12.4Zm0 2.1c-3.5 0-8 1.7-8 5.1V21h16v-1.4c0-3.4-4.5-5.1-8-5.1Z"
      />
    </svg>
  );
}

export default function Home() {
  const { t } = useI18n();
  const { token, user, birthdayToday, firstName } = useAuthUser();
  const { prefs } = useUserPrefs();
  const userId = user?.id || user?._id || null;
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [nearPromos, setNearPromos] = useState<Promo[]>([]);
  const [catalogPromos, setCatalogPromos] = useState<Promo[]>([]);
  const [nearLoading, setNearLoading] = useState(true);
  const [nearGpsError, setNearGpsError] = useState(false);
  const [nearFailKind, setNearFailKind] = useState<NearFailKind>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheSavedAt, setCacheSavedAt] = useState<number | null>(null);
  const reloadNearRef = useRef<(opts?: LoadNearOpts) => void>(() => {});

  const [bdayPhase, setBdayPhase] = useState<BdayPhase>('welcome');
  const [bdayPromos, setBdayPromos] = useState<Promo[]>([]);
  const [bdayGpsError, setBdayGpsError] = useState(false);
  const [bdayEmpty, setBdayEmpty] = useState(false);
  const bdayLoadGen = useRef(0);

  const bdaySorted = useMemo(
    () => [...bdayPromos].sort((a, b) => promoMeters(a) - promoMeters(b)),
    [bdayPromos]
  );
  const bdayNearest = bdaySorted[0] ?? null;
  const bdayRest = bdaySorted.slice(1);
  const bdayFree = useMemo(
    () => bdayRest.filter((p) => isBirthdayFreebie(p)),
    [bdayRest]
  );
  const bdayDeals = useMemo(
    () => bdayRest.filter((p) => !isBirthdayFreebie(p)),
    [bdayRest]
  );

  const exploreLinks = useMemo(() => {
    const favSet = new Set(prefs.categoriasFav);
    const base = [
      {
        id: 'cerca',
        icon: 'pin' as const,
        label: t('quickNear'),
        hint: t('exploreHintNear'),
        to: '/cerca',
        accent: true,
        weight: 100,
      },
      {
        id: 'todas',
        icon: 'grid' as const,
        label: t('catAll'),
        hint: t('exploreHintAll'),
        to: '/promos',
        weight: 40,
      },
      {
        id: 'comida',
        icon: 'food' as const,
        label: t('catFood'),
        hint: t('exploreHintFood'),
        to: '/promos?f=comida',
        weight: favSet.has('comida') ? 90 : 30,
      },
      {
        id: 'cafe',
        icon: 'cafe' as const,
        label: t('catCafe'),
        hint: t('exploreHintCafe'),
        to: '/promos?f=cafe',
        weight: favSet.has('cafe') ? 88 : 28,
      },
      ...(favSet.has('antro') || favSet.has('destilados')
        ? [
            {
              id: 'destilados',
              icon: 'grid' as const,
              label: t('prefsCatDestilados'),
              hint: t('exploreHintAll'),
              to: '/promos?f=destilados',
              weight: 85,
            },
          ]
        : []),
      ...(favSet.has('cumple')
        ? [
            {
              id: 'cumple',
              icon: 'heart' as const,
              label: t('prefsCatCumple'),
              hint: t('exploreHintFav'),
              to: '/promos?f=cumple',
              weight: 86,
            },
          ]
        : []),
      token
        ? {
            id: 'fav',
            icon: 'heart' as const,
            label: t('quickFavorites'),
            hint: t('exploreHintFav'),
            to: '/favoritos',
            weight: 70,
          }
        : {
            id: 'login',
            icon: 'user' as const,
            label: t('quickLogin'),
            hint: '',
            to: '/entrar',
            state: { from: '/', reason: 'account' as const },
            weight: 10,
          },
    ];
    return [...base].sort((a, b) => b.weight - a.weight);
  }, [prefs.categoriasFav, t, token]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  /** Home = certeza local: GPS × ofertas oficiales cerca. */
  useEffect(() => {
    let cancelled = false;
    let runId = 0;

    async function applyCachedNear() {
      const nearCached = await cacheGet<{
        promos?: Promo[];
      }>(CACHE_KEYS.lastNear);
      const promoCached = await cacheGet<Promo[]>(CACHE_KEYS.promos);
      if (cancelled) return false;
      const fromNear = filterGuestSafePromos(
        (nearCached?.data?.promos ?? []) as Promo[]
      )
        .filter((p) => !isLandingTitle(p))
        .sort((a, b) => promoMeters(a) - promoMeters(b));
      if (fromNear.length) {
        setNearPromos(fromNear.slice(0, 10));
        setFromCache(true);
        setCacheSavedAt(nearCached?.savedAt ?? null);
        return true;
      }
      if (promoCached?.data?.length) {
        const active = filterGuestSafePromos(promoCached.data);
        setCatalogPromos(active.slice(0, 8));
        setFromCache(true);
        setCacheSavedAt(promoCached.savedAt);
        return true;
      }
      return false;
    }

    async function loadNear(opts: LoadNearOpts = {}) {
      const myRun = ++runId;
      const startedAt = Date.now();
      // Traguito abierto: esperar SPLASH_CLOSED (salvo force del CTA).
      if (!opts.force && isOnboardingOpen()) {
        setNearLoading(true);
        return;
      }
      setNearLoading(true);
      setNearGpsError(false);
      setNearFailKind(null);
      setFromCache(false);
      setCacheSavedAt(null);

      if (!navigator.onLine) {
        await applyCachedNear();
        if (!cancelled && myRun === runId) setNearLoading(false);
        return;
      }

      async function loadCatalogFallback(markGpsError: boolean) {
        setNearPromos([]);
        setNearGpsError(markGpsError);
        try {
          const res = await api.get('/api/promociones', {
            timeout: CERCA_TIMEOUT_MS,
          });
          if (cancelled || myRun !== runId) return;
          const list = filterGuestSafePromos(
            (res.data.promos ?? []) as Promo[]
          );
          const destacadas = list.filter((p) => p.featured || p.destacada);
          setCatalogPromos((destacadas.length ? destacadas : list).slice(0, 8));
          await cacheSet(CACHE_KEYS.promos, list);
          setCacheSavedAt(Date.now());
        } catch {
          /* sin red ni caché */
        }
      }

      async function fetchCerca(lat: number, lng: number, maxMeters: number) {
        const { data } = await api.get('/api/promociones/cerca', {
          params: { lat, lng, maxMeters },
          timeout: CERCA_TIMEOUT_MS,
        });
        return filterActivePromos((data.promos ?? []) as Promo[])
          .filter((p) => !p.requiresAuth && !isLandingTitle(p))
          .sort((a, b) => promoMeters(a) - promoMeters(b));
      }

      try {
        const hasExplicit =
          Number.isFinite(opts.lat) && Number.isFinite(opts.lng);
        const pos = hasExplicit
          ? { lat: opts.lat as number, lng: opts.lng as number, at: Date.now() }
          : await readGpsCached({
              maximumAge: 60_000,
              timeout: GPS_TIMEOUT_MS,
            });
        if (cancelled || myRun !== runId) return;
        if (hasExplicit) setLastKnownGps(pos.lat, pos.lng, pos.at);
        void trackGps(true, pos.lat, pos.lng);

        const firstRadius = opts.maxMeters ?? NEAR_RADIUS_M;
        let list = await fetchCerca(pos.lat, pos.lng, firstRadius);
        // Si el pin real no trae nada a 2 km, ampliar una vez (piloto GDL disperso).
        if (
          list.length === 0 &&
          opts.maxMeters == null &&
          firstRadius < NEAR_EXPAND_M
        ) {
          list = await fetchCerca(pos.lat, pos.lng, NEAR_EXPAND_M);
        }
        if (cancelled || myRun !== runId) return;
        setNearPromos(list.slice(0, 10));
        setNearGpsError(false);
        setNearFailKind(null);
        const safeForDisk = filterGuestSafePromos(list).slice(0, 20);
        await cacheSet(CACHE_KEYS.promos, safeForDisk);
        await cacheSet(CACHE_KEYS.lastNear, { promos: safeForDisk });
        setCacheSavedAt(Date.now());
        void track({
          tipo: 'cerca_open',
          lat: pos.lat,
          lng: pos.lng,
          meta: {
            source: 'home',
            count: list.length,
            ms: Date.now() - startedAt,
            radius: list.length ? firstRadius : NEAR_EXPAND_M,
          },
        });
        if (list.length === 0) {
          await loadCatalogFallback(false);
        }
      } catch (err) {
        void trackGps(false);
        if (cancelled || myRun !== runId) return;
        const geo = isGeolocationError(err);
        const code = (err as { code?: number | string })?.code;
        const timedOut =
          code === 3 ||
          code === 'ECONNABORTED' ||
          code === 'TIMEOUT' ||
          /timeout/i.test(String((err as Error)?.message || ''));
        if (geo && (code === 1 || code === 'gps-denied')) {
          setNearFailKind('denied');
        } else if (timedOut) {
          setNearFailKind('timeout');
        } else if (geo) {
          setNearFailKind('denied');
        } else {
          setNearFailKind('api');
        }
        void track({
          tipo: 'gps_fail',
          meta: {
            source: 'home',
            kind: geo ? 'geo' : 'api',
            code: String(code ?? ''),
            ms: Date.now() - startedAt,
          },
        });
        const hadCache = await applyCachedNear();
        if (hadCache) {
          setNearGpsError(false);
        } else {
          await loadCatalogFallback(true);
        }
      } finally {
        if (!cancelled && myRun === runId) setNearLoading(false);
      }
    }

    reloadNearRef.current = (opts?: LoadNearOpts) => {
      void loadNear(opts);
    };
    void loadNear();
    const onTourClosed = () => {
      void loadNear({ force: true });
    };
    window.addEventListener(SPLASH_CLOSED, onTourClosed);
    return () => {
      cancelled = true;
      window.removeEventListener(SPLASH_CLOSED, onTourClosed);
    };
  }, []);

  async function enableHomeLocation() {
    if (nearLoading) return;
    setNearLoading(true);
    setNearGpsError(false);
    setNearFailKind(null);
    try {
      const pos = await readGpsCached({
        maximumAge: 0,
        cacheMaxAgeMs: 0,
        timeout: GPS_TIMEOUT_MS,
      });
      void trackGps(true, pos.lat, pos.lng);
      reloadNearRef.current({
        force: true,
        lat: pos.lat,
        lng: pos.lng,
      });
    } catch (err) {
      void trackGps(false);
      const code = (err as { code?: number })?.code;
      setNearFailKind(code === 3 ? 'timeout' : 'denied');
      setNearGpsError(true);
      setNearLoading(false);
    }
  }

  const loadBirthdayGifts = useCallback(async () => {
    const gen = ++bdayLoadGen.current;
    setBdayPhase('seeking');
    setBdayGpsError(false);
    setBdayEmpty(false);
    setBdayPromos([]);
    try {
      const pos = await readGpsCached();
      if (gen !== bdayLoadGen.current) return;
      let list: Promo[] = [];
      try {
        const { data } = await api.get('/api/promociones/cerca', {
          params: {
            lat: pos.lat,
            lng: pos.lng,
            maxMeters: BDAY_RADIUS_M,
            birthday: '1',
          },
          timeout: 20_000,
        });
        if (gen !== bdayLoadGen.current) return;
        list = filterActivePromos(
          ((data.promos ?? []) as Promo[]).filter(
            (p) => p.cumpleanos || p.isBirthday
          )
        ).sort((a, b) => promoMeters(a) - promoMeters(b));
      } catch (nearErr) {
        // Cerca falló (timeout OSM, etc.): no es “activa GPS”.
        if (isGeolocationError(nearErr)) throw nearErr;
      }

      if (!list.length) {
        const { data } = await api.get('/api/promociones', {
          params: { birthday: '1' },
          timeout: 15_000,
        });
        if (gen !== bdayLoadGen.current) return;
        list = filterActivePromos(
          ((data.promos ?? []) as Promo[]).filter(
            (p) => p.cumpleanos || p.isBirthday
          )
        );
      }

      setBdayPromos(list.slice(0, 12));
      setBdayEmpty(list.length === 0);
      setBdayGpsError(false);
      writeBdayUnlocked(userId);
      setBdayPhase('reveal');
    } catch (err) {
      if (gen !== bdayLoadGen.current) return;
      if (isGeolocationError(err)) {
        setBdayGpsError(true);
        setBdayEmpty(false);
        setBdayPromos([]);
        setBdayPhase('reveal');
        return;
      }
      // Red / API: no mentir con “activa ubicación”
      setBdayGpsError(false);
      setBdayEmpty(true);
      setBdayPromos([]);
      writeBdayUnlocked(userId);
      setBdayPhase('reveal');
    }
  }, [userId]);

  useEffect(() => {
    if (!birthdayToday) {
      setBdayPhase('welcome');
      setBdayPromos([]);
      setBdayGpsError(false);
      setBdayEmpty(false);
      return;
    }
    if (readBdayUnlocked(userId)) {
      void loadBirthdayGifts();
    } else {
      setBdayPhase('welcome');
    }
  }, [birthdayToday, userId, loadBirthdayGifts]);

  function openBirthdayDay() {
    void loadBirthdayGifts();
    requestAnimationFrame(() => {
      document
        .getElementById('hoy-cumple')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  useEffect(() => {
    if (!birthdayToday) return;
    const onOpen = () => {
      void loadBirthdayGifts();
      requestAnimationFrame(() => {
        document
          .getElementById('hoy-cumple')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    window.addEventListener('trago-bday-open-gifts', onOpen);
    return () => window.removeEventListener('trago-bday-open-gifts', onOpen);
  }, [birthdayToday, loadBirthdayGifts]);

  function renderPromoCard(
    p: Promo,
    opts?: { featured?: boolean; nearest?: boolean }
  ) {
    const img = resolveMediaUrl(p.imagen || p.imageUrl);
    const title = p.nombre || p.title || t('promoFallback');
    const near = nearestBranchMeta(p);
    const dist = formatDistance(near?.meters, t('bdayMeters'), t('homeNearKm'));
    const featured = Boolean(opts?.featured);
    const nearest = Boolean(opts?.nearest);
    return (
      <Link
        key={p._id}
        to={`/promos/${p.slug || p._id}`}
        className={`home-deal${featured || nearest ? ' is-featured' : ''}${nearest ? ' is-bday-nearest' : ''}${img ? '' : ' is-plain'}`}
        viewTransition
      >
        <div className="home-deal-media" aria-hidden>
          <PromoMediaImg
            src={img}
            fallback={
              <span className="home-deal-fallback">
                {(p.chainName || 'TG').slice(0, 2).toUpperCase()}
              </span>
            }
          />
          <div className="home-deal-shade" />
        </div>
        <div className="home-deal-copy">
          <div className="home-deal-top">
            <p className="feed-chain">{p.chainName || t('chainFallback')}</p>
            {dist ? <span className="home-dist-pill">{dist}</span> : null}
          </div>
          {nearest ? (
            <p className="home-deal-eyebrow">{t('bdayNearest')}</p>
          ) : featured ? (
            <p className="home-deal-eyebrow">{t('homeFeaturedNear')}</p>
          ) : null}
          <PromoPrice promo={p} />
          <h3>{title}</h3>
          {near?.label ? <p className="meta">{near.label}</p> : null}
          {!(p.termina_en || p.endsAt) ? (
            <p className="meta">{t('noSourceDate')}</p>
          ) : null}
          {nearest ? (
            <span className="home-bday-reveal-cta">{t('bdayRevealCta')}</span>
          ) : null}
        </div>
      </Link>
    );
  }

  const forYou = nearPromos.slice(0, 3);
  const showNearFeed = !birthdayToday && nearPromos.length > 3;
  const showCatalogFallback =
    !nearLoading &&
    nearPromos.length === 0 &&
    (nearGpsError || catalogPromos.length > 0);
  const railNear = nearPromos.slice(3);
  const showBdayConfetti = birthdayToday && bdayPhase === 'reveal' && !bdayGpsError;
  const bdayHeroCta =
    bdayPhase === 'welcome'
      ? t('bdayOpenDay')
      : bdayPhase === 'seeking'
        ? t('bdaySeeking')
        : t('bdaySeeGifts');
  const greet = t(greetingKey() as 'helloMorning');
  const greetLine = firstName ? `${greet}, ${firstName}` : greet;
  const cacheAgeLabel = formatCacheAge(cacheSavedAt, (k, vars) =>
    t(k as 'cacheAgeJustNow', vars)
  );
  const densityClass =
    prefs.densidad === 'compacta' ? ' is-dense' : ' is-comfy';
  const offlineEmpty =
    !online &&
    !nearLoading &&
    nearPromos.length === 0 &&
    catalogPromos.length === 0;

  return (
    <div
      className={`home-app${birthdayToday ? ' is-bday-day' : ''}${densityClass}${!online ? ' is-offline' : ''}`}
    >
      <section
        className={`home-hero home-hero-stage${birthdayToday ? ' is-bday' : ''}${bdayPhase === 'reveal' ? ' is-bday-revealed' : ''}`}
      >
        <div className="home-hero-visual" aria-hidden>
          <span className="home-hero-beam" />
          <span className="home-hero-beam home-hero-beam-2" />
          <span className="home-hero-orb" />
          <span className="home-hero-grain" />
          <span className="home-hero-grid" />
          {showBdayConfetti ? (
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
              <p className="home-subhead">
                {bdayPhase === 'welcome' ? t('bdayBody') : t('bdayRitualSub')}
              </p>
              <div className="home-hero-cta">
                <button
                  type="button"
                  className="btn primary home-cta-main"
                  onClick={openBirthdayDay}
                  disabled={bdayPhase === 'seeking'}
                  aria-busy={bdayPhase === 'seeking'}
                >
                  {bdayHeroCta}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="home-hero-kicker home-hero-greet">{greetLine}</p>
              <h1 className="brand-mark home-brand">
                Tr
                <span className="home-brand-pin" aria-hidden title="ubicación">
                  <svg viewBox="0 0 24 32" width="1em" height="1.28em" focusable="false">
                    <path
                      fill="currentColor"
                      d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0zm0 16.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"
                    />
                    <circle cx="12" cy="12" r="3.2" fill="#820808" />
                  </svg>
                </span>
                go
              </h1>
              <p className="home-headline">
                {firstName
                  ? t('homeForYouNamed', { name: firstName })
                  : t('homeCertainty')}
              </p>
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

      {!birthdayToday && (
        <section
          className="home-block home-for-you"
          data-reveal
          aria-labelledby="home-for-you-title"
        >
          <div className="block-head">
            <div>
              <p className="ui-kicker">{t('gpsLabel')}</p>
              <h2 id="home-for-you-title">{t('homeForYou')}</h2>
              <p className="home-section-lead">{t('homeForYouLead')}</p>
            </div>
            {fromCache || !online ? (
              <span className="home-cache-badge" title={cacheAgeLabel || undefined}>
                {t('offlineCache')}
                {cacheAgeLabel ? ` · ${cacheAgeLabel}` : ''}
              </span>
            ) : null}
          </div>
          {nearLoading && forYou.length === 0 ? (
            <div className="home-skel" aria-busy>
              <p className="muted">{t('homeGpsLoading')}</p>
              <div className="home-skel-featured ui-skeleton" />
            </div>
          ) : null}
          {nearGpsError && forYou.length === 0 && online ? (
            <div className="home-gps-actions">
              <p className="home-gps-note">
                {nearFailKind === 'timeout'
                  ? t('homeGpsTimeout')
                  : nearFailKind === 'api'
                    ? t('homeNearApiError')
                    : t('homeGpsDenied')}
              </p>
              <button
                type="button"
                className="btn primary"
                disabled={nearLoading}
                onClick={() => void enableHomeLocation()}
              >
                {nearLoading ? t('locSplashBusy') : t('locSplashEnable')}
              </button>
            </div>
          ) : null}
          {offlineEmpty ? <OfflineState cacheAge={cacheAgeLabel} /> : null}
          {forYou.length > 0 ? (
            <div className="home-for-you-grid stagger">
              {forYou.map((p, i) =>
                renderPromoCard(p, { featured: i === 0 })
              )}
            </div>
          ) : null}
          {!nearLoading &&
          !nearGpsError &&
          forYou.length === 0 &&
          !offlineEmpty &&
          online ? (
            <div className="home-gps-actions">
              <p className="home-gps-note">{t('homeNearEmpty')}</p>
              <button
                type="button"
                className="btn primary"
                disabled={nearLoading}
                onClick={() => void enableHomeLocation()}
              >
                {t('locSplashEnable')}
              </button>
            </div>
          ) : null}
        </section>
      )}

      {birthdayToday && (
        <section
          id="hoy-cumple"
          className={`home-bday home-bday-celebrate home-bday-ritual is-${bdayPhase}`}
          data-reveal
          aria-labelledby="home-bday-title"
        >
          <p className="ui-kicker">{t('catBdayToday')}</p>
          <h2 id="home-bday-title">
            {bdayPhase === 'welcome'
              ? t('bdayOpenDay')
              : bdayPhase === 'seeking'
                ? t('bdaySeeking')
                : t('bdaySeeGifts')}
          </h2>
          <p className="meta">
            {bdayPhase === 'welcome'
              ? t('bdayRitualHint')
              : bdayPhase === 'seeking'
                ? t('bdayLoading')
                : t('bdayWelcome')}
          </p>

          {bdayPhase === 'welcome' && (
            <div className="home-bday-note">
              <button
                type="button"
                className="btn primary"
                onClick={openBirthdayDay}
              >
                {t('bdayOpenDay')}
              </button>
            </div>
          )}

          {bdayPhase === 'seeking' && (
            <div className="home-bday-seeking" role="status" aria-live="polite">
              <span className="home-bday-pulse" aria-hidden />
              <p className="muted">{t('bdayLoading')}</p>
            </div>
          )}

          {bdayPhase === 'reveal' && bdayGpsError && (
            <div className="home-bday-note">
              <p>{t('bdayGpsError')}</p>
              <div className="home-bday-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void loadBirthdayGifts()}
                >
                  {t('bdayRetryGps')}
                </button>
                <Link className="btn ghost" to="/cerca" viewTransition>
                  {t('openNear')}
                </Link>
              </div>
            </div>
          )}

          {bdayPhase === 'reveal' && bdayEmpty && !bdayGpsError && (
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

          {bdayPhase === 'reveal' && !bdayGpsError && !bdayEmpty && (
            <p className="home-bday-loyalty-note">{t('bdayLoyaltyNote')}</p>
          )}

          {bdayPhase === 'reveal' && bdayNearest && (
            <div className="home-bday-nearest stagger">
              {renderPromoCard(bdayNearest, { nearest: true })}
            </div>
          )}

          {bdayPhase === 'reveal' &&
            !bdayNearest &&
            bdayPromos.length > 0 && (
              <div className="home-deal-rail scroll-rail stagger">
                {bdayPromos.map((p) => renderPromoCard(p))}
              </div>
            )}

          {bdayPhase === 'reveal' && bdayFree.length > 0 && (
            <div className="home-bday-group">
              <h3>{t('bdayFreeTitle')}</h3>
              <div className="home-deal-rail scroll-rail stagger">
                {bdayFree.map((p) => renderPromoCard(p))}
              </div>
            </div>
          )}

          {bdayPhase === 'reveal' && bdayDeals.length > 0 && (
            <div className="home-bday-group">
              <h3>{t('bdayDealTitle')}</h3>
              <div className="home-deal-rail scroll-rail stagger">
                {bdayDeals.map((p) => renderPromoCard(p))}
              </div>
            </div>
          )}
        </section>
      )}

      <SponsoredSlot slot="home_rail" className="home-sponsored" />

      <section
        className="home-explore"
        data-reveal
        aria-label={t('homeExploreTitle')}
      >
        <div className="home-explore-stage">
          <div className="home-explore-glow" aria-hidden />
          <div className="home-explore-copy">
            <p className="ui-kicker">{t('homeExploreKicker')}</p>
            <h2>{t('homeExploreTitle')}</h2>
            <p className="home-explore-lead">{t('homeExploreLead')}</p>
          </div>
          <ul className="home-explore-rail scroll-rail">
            {exploreLinks.map((item) => (
              <li key={item.id}>
                <Link
                  className={`home-explore-card home-explore-card--${item.icon}${'accent' in item && item.accent ? ' is-accent' : ''}`}
                  to={item.to}
                  state={'state' in item ? item.state : undefined}
                  viewTransition
                >
                  <span className="home-explore-ico" aria-hidden>
                    <ExploreIcon name={item.icon} />
                  </span>
                  <span className="home-explore-card-text">
                    <span className="home-explore-card-label">{item.label}</span>
                    {item.hint ? (
                      <span className="home-explore-card-hint">{item.hint}</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

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
          {/* CTAs de GPS ya están en «Para ti ahora»; aquí solo el rail de catálogo. */}
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

      <div className="tour-help-link" aria-label={t('tourHelpAria')}>
        <button type="button" onClick={replayOnboarding}>
          {t('tourReplay')} ↗
        </button>
      </div>
    </div>
  );
}
