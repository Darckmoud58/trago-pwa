import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, readToken } from '../api';
import FavoriteButton from '../components/FavoriteButton';
import OfflineState from '../components/OfflineState';
import PlaceBrandMark from '../components/PlaceBrandMark';
import PromoMediaImg from '../components/PromoMediaImg';
import PromoPrice from '../components/PromoPrice';
import NearMap from '../components/NearMap';
import ValidityVote from '../components/ValidityVote';
import SponsoredSlot, { useSlotAds } from '../components/SponsoredSlot';
import { useUserPrefs } from '../hooks/useUserPrefs';
import { useAuthUser } from '../hooks/useAuthUser';
import { CACHE_KEYS, cacheGet, cacheSet } from '../lib/offlineCache';
import { useI18n } from '../lib/i18n';
import { readGpsCached } from '../lib/lastKnownGps';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { track, trackGps } from '../lib/metrics';
import {
  googleMapsExactUrl,
  googleMapsSearchUrl,
  hasStreetAddress,
} from '../lib/googleMaps';
import { resolveOfficialPromoUrl } from '../lib/officialUrl';
import { formatCacheAge } from '../lib/userPrefs';
import {
  isOnboardingOpen,
  SPLASH_CLOSED,
} from '../lib/onboarding';
import { resolveZone } from '../lib/zones';
import type { Branch, Promo } from '../types';
import './Cerca.css';

const NEAR_RADIUS_M = 2000;

function openExactPlace(
  branch: Branch,
  nombre: string,
  origin?: { lat: number; lng: number } | null
) {
  const url =
    googleMapsExactUrl({
      lat: branch.lat,
      lng: branch.lng ?? branch.long,
      name: nombre,
      address: branch.address,
      city: [branch.colonia, branch.city].filter(Boolean).join(', '),
      originLat: origin?.lat,
      originLng: origin?.lng,
      distanceMeters: branch.distanceMeters,
    }) ||
    googleMapsSearchUrl({
      name: nombre,
      address: branch.address,
      city: [branch.colonia, branch.city].filter(Boolean).join(', '),
    });
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/** Tono cálido de marca (rojo/tinto) a partir del nombre — sin salirse de TraGo. */
function foldName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/** Portada del sitio (“Promociones OXXO”), no una oferta concreta. */
function isLandingPromoTitle(promo: Promo, chainKeys: string[] = []) {
  const title = foldName(promo.nombre || promo.title || '');
  if (!title) return true;
  if (/^(promociones|ofertas|promos)(oficiales)?$/.test(title)) return true;
  const brands = chainKeys.length
    ? chainKeys
    : [foldName(promo.chainName || '')].filter((k) => k.length >= 3);
  return brands.some(
    (key) =>
      title === `promociones${key}` ||
      title === `ofertas${key}` ||
      title === `promos${key}` ||
      title === `promocionesde${key}` ||
      title === `ofertasde${key}`
  );
}

function chainKeysForBranch(branch: Branch) {
  return [branch.officialBrand, branch.chainName]
    .filter((name): name is string => Boolean(name))
    .map(foldName)
    .filter((name) => name.length >= 3);
}

/** Ofertas de esa cadena (incl. 18+ con candado). No inventa participación. */
function promosForPlace(branch: Branch, promos: Promo[]) {
  const keys = chainKeysForBranch(branch);
  if (!keys.length) return [];
  return promos.filter((promo) => {
    if (isLandingPromoTitle(promo, keys)) return false;
    const chain = foldName(promo.chainName || '');
    if (!chain) return false;
    return keys.some(
      (key) => chain === key || chain.includes(key) || key.includes(chain)
    );
  });
}

function placeHasOffers(branch: Branch, promos: Promo[]) {
  return promosForPlace(branch, promos).length > 0;
}

function isMongoId(id: string) {
  return /^[a-f\d]{24}$/i.test(id);
}

/** El voto solo cabe si esta sucursal está ligada de verdad a la oferta. */
function linkedBranchId(branch: Branch, promo: Promo) {
  const id = String(branch._id || '');
  if (!isMongoId(id)) return '';
  const hit = (promo.ubicacionesCercanas || []).find(
    (place) => String(place._id) === id && place.participacionConfirmada !== false
  );
  return hit ? String(hit._id) : '';
}

function brandTone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 33 + name.charCodeAt(i)) >>> 0;
  const hue = 348 + (h % 22);
  const sat = 42 + (h % 18);
  const lit = 22 + (h % 10);
  return `hsl(${hue} ${sat}% ${lit}%)`;
}

export default function Cerca() {
  const { t } = useI18n();
  const { prefs } = useUserPrefs();
  const { birthdayToday, token } = useAuthUser();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [cacheSavedAt, setCacheSavedAt] = useState<number | null>(null);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [openOffersId, setOpenOffersId] = useState<string | null>(null);
  const [userOrigin, setUserOrigin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [originKind, setOriginKind] = useState<'gps' | 'zone' | 'cache' | null>(
    null
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [absorbingId, setAbsorbingId] = useState<string | null>(null);
  const bootstrapped = useRef(false);
  const absorbTimer = useRef<number | null>(null);
  const catalogPromos = promos.filter(
    (promo) => !isLandingPromoTitle(promo) && !promo.requiresAuth
  );
  const offersBranch =
    branches.find((branch) => String(branch._id) === openOffersId) ?? null;
  const offersList = offersBranch ? promosForPlace(offersBranch, promos) : [];
  const offersOpen = offersList.filter((p) => !p.requiresAuth);
  const offersLocked = offersList.filter((p) => p.requiresAuth);
  const offersLabel =
    offersBranch?.officialBrand ||
    offersBranch?.chainName ||
    offersBranch?.nombre ||
    offersBranch?.name ||
    '';
  const loggedIn = Boolean(token);
  const cercaAds = useSlotAds('cerca_top');

  useEffect(() => {
    if (!openOffersId) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [openOffersId]);

  useEffect(
    () => () => {
      if (absorbTimer.current) window.clearTimeout(absorbTimer.current);
    },
    []
  );

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

  async function applyLastNearCache(opts?: {
    lat?: number;
    lng?: number;
    requireSameArea?: boolean;
  }) {
    const cached = await cacheGet<{
      branches: Branch[];
      promos?: Promo[];
      note: string;
      lat?: number;
      lng?: number;
    }>(CACHE_KEYS.lastNear);
    if (!cached?.data?.branches?.length) return false;
    if (opts?.requireSameArea && opts.lat != null && opts.lng != null) {
      const cachedLat = cached.data.lat;
      const cachedLng = cached.data.lng;
      const latDelta = ((cachedLat ?? 999) - opts.lat) * 111_000;
      const lngDelta =
        ((cachedLng ?? 999) - opts.lng) *
        111_000 *
        Math.cos((opts.lat * Math.PI) / 180);
      if (Math.hypot(latDelta, lngDelta) > 1000) return false;
    }
    setBranches(cached.data.branches);
    setPromos(cached.data.promos ?? []);
    setNote(
      (cached.data.promos?.length ?? 0) > 0
        ? t('offlineLastSearchWithPromos')
        : t('offlineLastSearch')
    );
    setFromCache(true);
    setCacheSavedAt(cached.savedAt);
    setError('');
    if (cached.data.lat != null && cached.data.lng != null) {
      setUserOrigin({ lat: cached.data.lat, lng: cached.data.lng });
      setOriginKind('cache');
    }
    return true;
  }

  async function loadNear(lng: number, lat: number, label: string) {
    setLoading(true);
    setError('');
    setNote(label);
    setBranches([]);
    setPromos([]);
    setOpenOffersId(null);
    setFromCache(false);
    setCacheSavedAt(null);
    setUserOrigin({ lat, lng });
    void track({ tipo: 'cerca_open', lat, lng, meta: { label } });

    if (!navigator.onLine) {
      const ok = await applyLastNearCache({ lat, lng, requireSameArea: false });
      if (!ok) setError(t('nearError'));
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/api/sucursales/cerca', {
        params: { lng, lat, maxMeters: NEAR_RADIUS_M },
      });
      const list = (data.branches ?? data.ubicaciones ?? []) as Branch[];
      setBranches(list);
      setFromCache(false);
      setCacheSavedAt(Date.now());
      if (data.partial && data.searchedRadiusMeters) {
        const km = (data.searchedRadiusMeters / 1000).toFixed(1);
        setNote(t('osmReducedRadius').replace('{km}', km));
      } else {
        setNote(label);
      }
      let nearPromos: Promo[] = [];
      try {
        const promoRes = await api.get('/api/promociones/cerca', {
          params: { lng, lat, maxMeters: NEAR_RADIUS_M },
        });
        nearPromos = (promoRes.data.promos ?? []) as Promo[];
      } catch {
        nearPromos = [];
      }
      setPromos(nearPromos);
      const savedNote =
        data.partial && data.searchedRadiusMeters
          ? t('osmReducedRadius').replace(
              '{km}',
              (data.searchedRadiusMeters / 1000).toFixed(1)
            )
          : label;
      await cacheSet(CACHE_KEYS.lastNear, {
        branches: list,
        promos: nearPromos,
        note: savedNote,
        lat,
        lng,
      });
    } catch {
      const ok = await applyLastNearCache({
        lat,
        lng,
        requireSameArea: true,
      });
      if (!ok) {
        setError(t('nearError'));
        setBranches([]);
        setPromos([]);
        setNote('');
        setFromCache(false);
        setCacheSavedAt(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function locateNear() {
    setLoading(true);
    setError('');
    try {
      const pos = await readGpsCached({ maximumAge: 30_000 });
      void trackGps(true, pos.lat, pos.lng);
      setOriginKind('gps');
      await loadNear(pos.lng, pos.lat, t('usingLocation'));
    } catch (err) {
      void trackGps(false);
      const ok = await applyLastNearCache({ requireSameArea: false });
      setLoading(false);
      if (ok) return;
      setBranches([]);
      setPromos([]);
      setNote('');
      setFromCache(false);
      setCacheSavedAt(null);
      setUserOrigin(null);
      setOriginKind(null);
      setError(
        err instanceof Error && err.message === 'no-geo'
          ? t('noGeo')
          : t('locationPermissionError')
      );
    }
  }

  /** Demo explícita: no escribe lastKnownGps ni finge GPS real. */
  async function applyManualZone() {
    const zone = resolveZone(prefs.zona);
    const zoneName = t(zone.labelKey);
    const label = t('manualZoneNote').replace('{zone}', zoneName);
    setOriginKind('zone');
    void track({
      tipo: 'cerca_open',
      lat: zone.lat,
      lng: zone.lng,
      meta: { label, source: 'manual_zone', zone: zone.id },
    });
    await loadNear(zone.lng, zone.lat, label);
  }

  useEffect(() => {
    const start = () => {
      if (bootstrapped.current) return;
      bootstrapped.current = true;
      void locateNear();
    };
    const onTourClosed = () => {
      start();
    };
    // Pedir GPS al entrar (como antes). Solo esperar si Traguito está abierto.
    if (!isOnboardingOpen()) start();
    window.addEventListener(SPLASH_CLOSED, onTourClosed);
    return () => window.removeEventListener(SPLASH_CLOSED, onTourClosed);
  }, []);

  const cacheAgeLabel = formatCacheAge(cacheSavedAt, (k, vars) =>
    t(k as 'cacheAgeJustNow', vars)
  );

  const spots = useMemo(
    () =>
      branches.flatMap((b) => {
        const lat = b.lat;
        const lng = b.lng ?? b.long;
        if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          return [];
        }
        const promoCount = promosForPlace(b, promos).length;
        const bits: string[] = [];
        if (typeof b.distanceMeters === 'number') {
          bits.push(
            b.distanceMeters < 1000
              ? `${Math.round(b.distanceMeters)} m`
              : `${(b.distanceMeters / 1000).toFixed(2)} km`
          );
        }
        return [{
          id: String(b._id),
          name: b.nombre || b.name || t('branchFallback'),
          chain: b.chainName || '',
          detail: bits.join(' · '),
          lat,
          lng,
          hasOffer: promoCount > 0,
          promoCount,
          branch: b,
        }];
      }),
    [branches, promos, t]
  );
  const offerSpots = spots.filter((spot) => spot.hasOffer);
  const selectedSpot = spots.find((spot) => spot.id === selectedPlaceId) || null;

  function focusPlace(id: string, scroll: boolean) {
    if (absorbTimer.current) window.clearTimeout(absorbTimer.current);
    setAbsorbingId(null);
    setSelectedPlaceId(id);
    if (!scroll) return;
    window.setTimeout(() => {
      document.getElementById(`cerca-place-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 180);
  }

  function openPlacePromos(id: string) {
    const spot = spots.find((place) => place.id === id);
    if (!spot?.hasOffer) return;
    setSelectedPlaceId(id);
    setAbsorbingId(id);
    document.querySelector('.cerca-stage-frame')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    if (absorbTimer.current) window.clearTimeout(absorbTimer.current);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    absorbTimer.current = window.setTimeout(() => {
      setOpenOffersId(id);
      setAbsorbingId(null);
    }, reduce ? 0 : 820);
  }

  if (offersBranch) {
    const placeName = offersBranch.label
      ? `${offersBranch.nombre || offersBranch.name || offersLabel} · ${offersBranch.label}`
      : offersBranch.nombre || offersBranch.name || offersLabel;
    const tone = brandTone(offersLabel);
    const meters =
      typeof offersBranch.distanceMeters === 'number'
        ? offersBranch.distanceMeters < 1000
          ? `${Math.round(offersBranch.distanceMeters)} m`
          : `${(offersBranch.distanceMeters / 1000).toFixed(1)} km`
        : '';
    const votePromo = offersList.find((promo) => linkedBranchId(offersBranch, promo));
    const voteId = votePromo ? linkedBranchId(offersBranch, votePromo) : '';
    const branchLat = offersBranch.lat;
    const branchLng = offersBranch.lng ?? offersBranch.long;
    return (
      <section className="cerca-page cerca-offers-page cerca-offers-enter">
        <header className="cerca-company-hero" style={{ background: tone }}>
          <button
            type="button"
            className="cerca-company-back"
            onClick={() => setOpenOffersId(null)}
          >
            ‹ {t('back')}
          </button>
          <PlaceBrandMark
            label={offersLabel}
            initials={initials(offersLabel)}
            tone={tone}
            logoUrl={offersBranch.logoUrl}
            officialBrand={offersBranch.officialBrand}
            chainName={offersBranch.chainName}
            nombre={offersBranch.nombre}
            name={offersBranch.name}
            website={offersBranch.website}
          />
          <p className="cerca-kicker">{offersLabel}</p>
          <h1>{placeName}</h1>
          <p className="cerca-company-meta">
            {[meters, t('offersOfChain').replace('{chain}', offersLabel)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </header>
        {offersList.length === 0 ? (
          <p className="cerca-place-offers-empty">{t('placeOffersEmpty')}</p>
        ) : (
          <>
            {!loggedIn && offersLocked.length > 0 && offersOpen.length === 0 ? (
              <div className="cerca-place-offers-empty cerca-offers-login">
                <p>{t('placeOffersLogin')}</p>
                <Link
                  to="/entrar"
                  state={{ from: '/cerca', reason: 'alcohol' }}
                  className="btn primary"
                >
                  {t('placeOffersLoginCta')}
                </Link>
              </div>
            ) : null}
            <ul className="cerca-offers-collage stagger">
              {offersList.map((promo, index) => {
                const title = promo.nombre || promo.title || t('promoFallback');
                const img = resolveMediaUrl(promo.imagen || promo.imageUrl);
                const tall = index % 5 === 0 || index % 5 === 3;
                const birthday = Boolean(promo.cumpleanos || promo.isBirthday);
                const birthdayLocked = birthday && !birthdayToday;
                const alcoholLocked = Boolean(promo.requiresAuth);
                const locked = alcoholLocked || birthdayLocked;
                const target = locked
                  ? loggedIn
                    ? '/cerca'
                    : '/entrar'
                  : `/promos/${promo.slug || promo._id}`;
                const lockReason = birthday ? 'birthday' : 'alcohol';
                const lockLabel = birthday
                  ? loggedIn
                    ? t('offerBirthdayWait')
                    : t('offerBirthdayLogin')
                  : t('offerLocked');
                return (
                  <li
                    key={promo._id}
                    className={`cerca-collage-tile${tall ? ' is-tall' : ''}${img ? '' : ' is-plain'}${locked ? ' is-locked' : ''}`}
                  >
                    <Link
                      to={target}
                      state={
                        locked && !loggedIn
                          ? { from: '/cerca', reason: lockReason }
                          : undefined
                      }
                      className="cerca-collage-link"
                      viewTransition={!locked}
                      aria-label={locked ? lockLabel : title}
                      onClick={
                        locked && loggedIn
                          ? (e) => e.preventDefault()
                          : undefined
                      }
                    >
                      {img && !locked ? (
                        <PromoMediaImg
                          src={img}
                          fallback={
                            <span className="cerca-collage-fallback">
                              {(promo.chainName || 'TG').slice(0, 2).toUpperCase()}
                            </span>
                          }
                        />
                      ) : (
                        <span
                          className="cerca-collage-fallback"
                          style={{ background: brandTone(offersLabel) }}
                        >
                          {initials(offersLabel)}
                        </span>
                      )}
                      <span className="cerca-collage-caption">
                        <strong>{locked ? lockLabel : title}</strong>
                        {!locked ? <PromoPrice promo={promo} /> : null}
                        <em>
                          {locked
                            ? birthday
                              ? loggedIn
                                ? t('offerBirthdayWait')
                                : t('placeOffersLoginCta')
                              : loggedIn
                                ? t('placeOffersEmpty')
                                : t('placeOffersLoginCta')
                            : t('seeOfferDetails')}
                        </em>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <footer className="cerca-company-foot">
          {voteId &&
          votePromo &&
          Number.isFinite(branchLat) &&
          Number.isFinite(branchLng) ? (
            <ValidityVote
              promoId={votePromo._id}
              ubicacionId={voteId}
              branchLat={Number(branchLat)}
              branchLng={Number(branchLng)}
              reportsVigente={0}
              reportsCaduco={0}
              crowdStatus="vigente"
              officialActive
            />
          ) : (
            offersList.length > 0 && (
              <p className="cerca-dock-note">{t('cercaVoteNeedsLink')}</p>
            )
          )}
          <p className="cerca-dock-note">{t('cercaCodeNote')}</p>
          <button
            type="button"
            className="text-link"
            onClick={() => openExactPlace(offersBranch, placeName, userOrigin)}
          >
            {t('seeOnMap')} ↗
          </button>
        </footer>
      </section>
    );
  }

  return (
    <section
      className={`cerca-page${prefs.densidad === 'compacta' ? ' is-dense' : ''}${!online ? ' is-offline' : ''}`}
    >
      <header className="cerca-hero rise">
        <div className="cerca-hero-copy">
          <p className="cerca-kicker">{t('gpsLabel')}</p>
          <h1>{note || t('usingLocation')}</h1>
          {fromCache && (
            <p className="cerca-soft">
              {t('cacheHint')}
              {cacheAgeLabel ? ` · ${cacheAgeLabel}` : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn ghost btn-sm cerca-refresh"
          onClick={() => void locateNear()}
          disabled={loading}
        >
          {loading ? t('searching') : t('retryLocation')}
        </button>
      </header>

      {loading && (
        <div
          className="cerca-loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="cerca-loading-stage">
            <div className="cerca-loading-radar" aria-hidden>
              <span className="cerca-loading-ring" />
              <span className="cerca-loading-ring cerca-loading-ring-2" />
              <span className="cerca-loading-pin">
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <path
                    fill="currentColor"
                    d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"
                  />
                </svg>
              </span>
            </div>
            <div className="cerca-loading-copy">
              <p className="cerca-loading-kicker">{t('gpsLabel')}</p>
              <p className="cerca-loading-title">{t('cercaLoadingTitle')}</p>
              <p className="cerca-loading-lead">{t('cercaLoadingLead')}</p>
            </div>
          </div>

          <div className="cerca-loading-rail" aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`offer-${i}`} className="cerca-skel-offer">
                <span className="cerca-skel-bone cerca-skel-offer-media" />
                <span className="cerca-skel-bone cerca-skel-line lg" />
                <span className="cerca-skel-bone cerca-skel-line sm" />
              </div>
            ))}
          </div>

          <div className="cerca-loading-list" aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`place-${i}`}
                className="cerca-skel-place"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                <span className="cerca-skel-bone cerca-skel-mark" />
                <div className="cerca-skel-place-body">
                  <span className="cerca-skel-bone cerca-skel-line xs" />
                  <span className="cerca-skel-bone cerca-skel-line lg" />
                  <span className="cerca-skel-bone cerca-skel-line md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && !fromCache && (
        <div className="cerca-error-block">
          {!online ? (
            <OfflineState cacheAge={cacheAgeLabel} showNear={false} />
          ) : (
            <>
              <p className="cerca-gps-help">{t('cercaGpsHelp')}</p>
              <p className="error">{error}</p>
              <div className="cerca-error-actions">
                <button
                  type="button"
                  className="btn primary cerca-retry"
                  onClick={() => void locateNear()}
                >
                  {t('retryLocation')}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void applyManualZone()}
                >
                  {t('useManualZone').replace(
                    '{zone}',
                    t(resolveZone(prefs.zona).labelKey)
                  )}
                </button>
                <Link className="btn ghost" to="/promos" viewTransition>
                  {t('goCatalog')}
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {!loading && cercaAds[0] ? (
        <SponsoredSlot
          slot="cerca_top"
          fixedAd={cercaAds[0]}
          className="cerca-sponsored"
        />
      ) : null}

      {!loading && catalogPromos.length > 0 && (
        <section className="cerca-offers" data-reveal>
          <div className="cerca-section-head">
            <h2>{t('nearbyPromosTitle')}</h2>
            <Link className="text-link" to="/promos" viewTransition>
              {t('viewAllPromos')}
            </Link>
          </div>
          <ul className="cerca-offer-rail scroll-rail stagger">
            {catalogPromos.slice(0, 12).map((promo) => {
              const img = resolveMediaUrl(promo.imagen || promo.imageUrl);
              const officialHref = resolveOfficialPromoUrl(promo.url_fuente);
              const title = promo.nombre || promo.title || t('promoFallback');
              const chain = promo.chainName || t('chainFallback');
              return (
                <li key={promo._id} className="cerca-offer-card">
                  <Link
                    to={`/promos/${promo.slug || promo._id}`}
                    className="cerca-offer-media"
                    aria-label={title}
                    viewTransition
                  >
                    <PromoMediaImg
                      src={img}
                      fallback={
                        <span style={{ background: brandTone(chain) }}>
                          {initials(chain)}
                        </span>
                      }
                    />
                  </Link>
                  <div className="cerca-offer-body">
                    <p className="cerca-place-chain">{chain}</p>
                    <PromoPrice promo={promo} />
                    <h3>
                      <Link
                        to={`/promos/${promo.slug || promo._id}`}
                        viewTransition
                      >
                        {title}
                      </Link>
                    </h3>
                    <div className="cerca-offer-actions">
                      <Link
                        className="btn primary btn-sm"
                        to={`/promos/${promo.slug || promo._id}`}
                        viewTransition
                      >
                        {t('seeOfferDetails')}
                      </Link>
                      {officialHref && (
                        <a
                          className="text-link"
                          href={officialHref}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('officialSource')} ↗
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!loading && branches.length > 0 && (
        <section className="cerca-places" data-reveal data-reveal-delay="1">
          <div className="cerca-section-head">
            <div>
              <h2>{t('aroundTitle')}</h2>
              <p className="cerca-stage-hint">{t('cercaStageHint')}</p>
            </div>
            <p className="cerca-count">
              {branches.length} {t('locations').toLowerCase()}
              {offerSpots.length > 0 && (
                <span className="cerca-offer-count">
                  {t('cercaOfferCount').replace('{n}', String(offerSpots.length))}
                </span>
              )}
            </p>
          </div>
          <div className={`cerca-stage-frame${offerSpots.length ? ' has-rail' : ''}${absorbingId ? ' is-absorbing' : ''}`}>
            <NearMap
              places={spots}
              you={originKind === 'gps' ? userOrigin : null}
              selectedId={selectedPlaceId}
              dive={Boolean(absorbingId)}
              onSelect={(id) => focusPlace(id, false)}
            />
            {absorbingId && selectedSpot && (
              <div className="cerca-absorb" aria-hidden>
                <strong>{selectedSpot.chain}</strong>
                <span>{selectedSpot.name}</span>
              </div>
            )}
            {selectedSpot && !absorbingId && (
              <article className="cerca-float" key={selectedSpot.id}>
                <p className="cerca-float-chain">{selectedSpot.chain}</p>
                <h3>{selectedSpot.name}</h3>
                {selectedSpot.detail && <p className="meta">{selectedSpot.detail}</p>}
                {selectedSpot.branch.address && (
                  <p className="meta">{selectedSpot.branch.address}</p>
                )}
                {(selectedSpot.branch.colonia || selectedSpot.branch.city) && (
                  <p className="meta">
                    {[selectedSpot.branch.colonia, selectedSpot.branch.city]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {selectedSpot.branch.hours && (
                  <p className="meta">{selectedSpot.branch.hours}</p>
                )}
                <div className="cerca-float-actions">
                  {selectedSpot.hasOffer && (
                    <button
                      type="button"
                      className="cerca-badge cerca-offers-btn"
                      onClick={() => openPlacePromos(selectedSpot.id)}
                    >
                      {t('seePlaceOffers')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      openExactPlace(selectedSpot.branch, selectedSpot.name, userOrigin)
                    }
                  >
                    {t('seeOnMap')} ↗
                  </button>
                </div>
              </article>
            )}
            {offerSpots.length > 0 && (
              <div className="cerca-spot-rail">
                {offerSpots.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    className={`cerca-spot${selectedPlaceId === spot.id ? ' is-on' : ''}`}
                    onClick={() => focusPlace(spot.id, false)}
                  >
                    <strong>{spot.name}</strong>
                    <span>{spot.detail}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <ul className="cerca-place-list stagger">
            {branches.map((b, index) => {
              const id = String(b._id);
              const nombre = b.nombre || b.name || t('branchFallback');
              const chain = b.chainName || t('businessFallback');
              const km =
                typeof b.distanceMeters === 'number'
                  ? (b.distanceMeters / 1000).toFixed(2)
                  : null;
              const shown = b.label ? `${nombre} · ${b.label}` : nombre;
              const mapsUrl = googleMapsExactUrl({
                lat: b.lat,
                lng: b.lng ?? b.long,
                name: nombre,
                address: b.address,
                city: [b.colonia, b.city].filter(Boolean).join(', '),
                originLat: userOrigin?.lat,
                originLng: userOrigin?.lng,
                distanceMeters: b.distanceMeters,
              });
              const nextAd = cercaAds[Math.floor((index + 1) / 6)];
              const showNextAd = (index + 1) % 6 === 0 && Boolean(nextAd);
              return (
                <Fragment key={id}>
                <li
                  id={`cerca-place-${id}`}
                  className={`cerca-place-card${
                    placeHasOffers(b, promos) ? ' has-offer' : ''
                  }${selectedPlaceId === id ? ' is-on-map' : ''}`}
                  onClick={() => focusPlace(id, false)}
                >
                  <PlaceBrandMark
                    label={chain || nombre}
                    initials={initials(chain || nombre)}
                    tone={brandTone(chain || nombre)}
                    logoUrl={b.logoUrl}
                    officialBrand={b.officialBrand}
                    chainName={b.chainName}
                    nombre={nombre}
                    name={b.name}
                    website={b.website}
                  />
                  <div className="cerca-place-body">
                    <div className="cerca-place-top">
                      <div className="cerca-place-titles">
                        <p className="cerca-place-chain">{chain}</p>
                        <h3>{shown}</h3>
                      </div>
                      <div className="cerca-place-tools">
                        {km && <span className="dist-pill">{km} km</span>}
                        <FavoriteButton
                          place={{
                            id,
                            type: 'ubicacion',
                            nombre: shown,
                            subtitulo: b.chainName,
                            direccion: b.address,
                            colonia: b.colonia,
                            municipio: b.city,
                            horario: b.hours,
                            distanciaKm:
                              typeof b.distanceMeters === 'number'
                                ? b.distanceMeters / 1000
                                : undefined,
                          }}
                        />
                      </div>
                    </div>
                    {b.address && <p className="cerca-place-meta">{b.address}</p>}
                    {(b.colonia || b.city) && (
                      <p className="cerca-place-meta">
                        {[b.colonia, b.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {b.hours && <p className="cerca-place-meta">{b.hours}</p>}
                    <div className="cerca-place-foot">
                      {placeHasOffers(b, promos) ? (
                        <button
                          type="button"
                          className="cerca-badge cerca-offers-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPlacePromos(id);
                          }}
                        >
                          {t('seePlaceOffers')}
                        </button>
                      ) : null}
                      {(b.lat != null ||
                        b.lng != null ||
                        b.long != null ||
                        hasStreetAddress(b.address)) && (
                        <a
                          className="text-link"
                          href={mapsUrl || '#mapa'}
                          target={mapsUrl ? '_blank' : undefined}
                          rel={mapsUrl ? 'noreferrer' : undefined}
                          onClick={(e) => {
                            e.preventDefault();
                            openExactPlace(b, nombre, userOrigin);
                          }}
                        >
                          {t('seeOnMap')} ↗
                        </a>
                      )}
                    </div>
                  </div>
                </li>
                {showNextAd && nextAd ? (
                  <li className="cerca-place-ad">
                    <SponsoredSlot
                      slot="cerca_top"
                      fixedAd={nextAd}
                      className="cerca-sponsored"
                    />
                  </li>
                ) : null}
                </Fragment>
              );
            })}
          </ul>
          <p className="cerca-attribution">
            ©{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap
            </a>
          </p>
        </section>
      )}

      {!loading && !error && branches.length === 0 && (
        <div className="empty-state cerca-empty">
          <p>{t('nearEmpty')}</p>
          <p className="muted">
            {t('nearEmptyHint')}{' '}
            {readToken() ? (
              <Link to="/favoritos">{t('navFavorites')}</Link>
            ) : (
              <Link to="/entrar" state={{ from: '/cerca', reason: 'favorite' }}>
                {t('quickLogin')}
              </Link>
            )}
            .
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={() => void locateNear()}
          >
            {t('retryLocation')}
          </button>
        </div>
      )}

    </section>
  );
}
