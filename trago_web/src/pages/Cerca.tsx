import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, readToken } from '../api';
import FavoriteButton from '../components/FavoriteButton';
import PlaceBrandMark from '../components/PlaceBrandMark';
import PromoPrice from '../components/PromoPrice';
import { CACHE_KEYS, cacheGet, cacheSet } from '../lib/offlineCache';
import { useI18n } from '../lib/i18n';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { track, trackGps } from '../lib/metrics';
import {
  googleMapsExactUrl,
  googleMapsSearchUrl,
  hasStreetAddress,
} from '../lib/googleMaps';
import { resolveOfficialPromoUrl } from '../lib/officialUrl';
import type { Branch, Promo } from '../types';
import './Cerca.css';

const NEAR_RADIUS_M = 2000;

function openExactPlace(branch: Branch, nombre: string) {
  const url =
    googleMapsExactUrl({
      lat: branch.lat,
      lng: branch.lng ?? branch.long,
      name: nombre,
      address: branch.address,
      city: [branch.colonia, branch.city].filter(Boolean).join(', '),
    }) ||
    googleMapsSearchUrl({
      name: nombre,
      address: branch.address,
      city: [branch.colonia, branch.city].filter(Boolean).join(', '),
    });
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function readGps(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('no-geo'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30_000,
    });
  });
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [openOffersId, setOpenOffersId] = useState<string | null>(null);
  const bootstrapped = useRef(false);
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
  const loggedIn = Boolean(readToken());

  useEffect(() => {
    if (!openOffersId) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [openOffersId]);

  async function loadNear(lng: number, lat: number, label: string) {
    setLoading(true);
    setError('');
    setNote(label);
    setBranches([]);
    setPromos([]);
    setOpenOffersId(null);
    setFromCache(false);
    void track({ tipo: 'cerca_open', lat, lng, meta: { label } });
    try {
      const { data } = await api.get('/api/sucursales/cerca', {
        params: { lng, lat, maxMeters: NEAR_RADIUS_M },
      });
      const list = (data.branches ?? data.ubicaciones ?? []) as Branch[];
      setBranches(list);
      setFromCache(false);
      if (data.partial && data.searchedRadiusMeters) {
        const km = (data.searchedRadiusMeters / 1000).toFixed(1);
        setNote(t('osmReducedRadius').replace('{km}', km));
      } else {
        setNote(label);
      }
      try {
        const promoRes = await api.get('/api/promociones/cerca', {
          params: { lng, lat, maxMeters: NEAR_RADIUS_M },
        });
        setPromos((promoRes.data.promos ?? []) as Promo[]);
      } catch {
        setPromos([]);
      }
      const savedNote =
        data.partial && data.searchedRadiusMeters
          ? t('osmReducedRadius').replace(
              '{km}',
              (data.searchedRadiusMeters / 1000).toFixed(1)
            )
          : label;
      await cacheSet(CACHE_KEYS.lastNear, {
        branches: list,
        note: savedNote,
        lat,
        lng,
      });
    } catch {
      const cached = await cacheGet<{
        branches: Branch[];
        note: string;
        lat?: number;
        lng?: number;
      }>(CACHE_KEYS.lastNear);
      const cachedLat = cached?.data?.lat;
      const cachedLng = cached?.data?.lng;
      const latDelta = ((cachedLat ?? 999) - lat) * 111_000;
      const lngDelta =
        ((cachedLng ?? 999) - lng) * 111_000 * Math.cos((lat * Math.PI) / 180);
      const sameArea = Math.hypot(latDelta, lngDelta) <= 1000;
      if (sameArea && cached?.data?.branches?.length) {
        setBranches(cached.data.branches);
        setPromos([]);
        setNote(t('offlineLastSearch'));
        setFromCache(true);
        setError('');
      } else {
        setError(t('nearError'));
        setBranches([]);
        setPromos([]);
        setNote('');
        setFromCache(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function locateNear() {
    setLoading(true);
    setError('');
    try {
      const pos = await readGps();
      void trackGps(true, pos.coords.latitude, pos.coords.longitude);
      await loadNear(
        pos.coords.longitude,
        pos.coords.latitude,
        t('usingLocation')
      );
    } catch (err) {
      void trackGps(false);
      setLoading(false);
      setBranches([]);
      setPromos([]);
      setNote('');
      setFromCache(false);
      setError(
        err instanceof Error && err.message === 'no-geo'
          ? t('noGeo')
          : t('locationPermissionError')
      );
    }
  }

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void locateNear();
  }, []);

  if (offersBranch) {
    const placeName = offersBranch.label
      ? `${offersBranch.nombre || offersBranch.name || offersLabel} · ${offersBranch.label}`
      : offersBranch.nombre || offersBranch.name || offersLabel;
    return (
      <section className="cerca-page cerca-offers-page">
        <header className="cerca-offers-page-head rise">
          <button
            type="button"
            className="btn ghost btn-sm"
            onClick={() => setOpenOffersId(null)}
          >
            ‹ {t('back')}
          </button>
          <div>
            <p className="cerca-kicker">{t('seePlaceOffers')}</p>
            <h1>{t('offersOfChain').replace('{chain}', offersLabel)}</h1>
            <p className="cerca-soft">{placeName}</p>
          </div>
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
                const locked = Boolean(promo.requiresAuth);
                const target = locked
                  ? loggedIn
                    ? '/cerca'
                    : '/entrar'
                  : `/promos/${promo.slug || promo._id}`;
                return (
                  <li
                    key={promo._id}
                    className={`cerca-collage-tile${tall ? ' is-tall' : ''}${img ? '' : ' is-plain'}${locked ? ' is-locked' : ''}`}
                  >
                    <Link
                      to={target}
                      state={
                        locked && !loggedIn
                          ? { from: '/cerca', reason: 'alcohol' }
                          : undefined
                      }
                      className="cerca-collage-link"
                      viewTransition={!locked}
                      aria-label={locked ? t('offerLocked') : title}
                      onClick={
                        locked && loggedIn
                          ? (e) => e.preventDefault()
                          : undefined
                      }
                    >
                      {img && !locked ? (
                        <img
                          src={img}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
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
                        <strong>{locked ? t('offerLocked') : title}</strong>
                        {!locked ? <PromoPrice promo={promo} /> : null}
                        <em>
                          {locked
                            ? loggedIn
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
      </section>
    );
  }

  return (
    <section className="cerca-page">
      <header className="cerca-hero rise">
        <div className="cerca-hero-copy">
          <p className="cerca-kicker">{t('gpsLabel')}</p>
          <h1>{note || t('usingLocation')}</h1>
          {fromCache && <p className="cerca-soft">{t('cacheHint')}</p>}
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
        <div className="cerca-skeleton" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="cerca-skeleton-card" />
          ))}
        </div>
      )}

      {error && (
        <div className="cerca-error-block">
          <p className="error">{error}</p>
          <button
            type="button"
            className="btn primary cerca-retry"
            onClick={() => void locateNear()}
          >
            {t('retryLocation')}
          </button>
        </div>
      )}

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
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span style={{ background: brandTone(chain) }}>
                        {initials(chain)}
                      </span>
                    )}
                  </Link>
                  <div className="cerca-offer-body">
                    <p className="cerca-place-chain">{chain}</p>
                    <h3>
                      <Link
                        to={`/promos/${promo.slug || promo._id}`}
                        viewTransition
                      >
                        {title}
                      </Link>
                    </h3>
                    <PromoPrice promo={promo} />
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
            <h2>{t('aroundTitle')}</h2>
            <p className="cerca-count">
              {branches.length} {t('locations').toLowerCase()}
            </p>
          </div>
          <ul className="cerca-place-list stagger">
            {branches.map((b) => {
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
              });
              return (
                <li key={id} className="cerca-place-card">
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
                          onClick={() => setOpenOffersId(id)}
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
                            openExactPlace(b, nombre);
                          }}
                        >
                          {t('seeOnMap')} ↗
                        </a>
                      )}
                    </div>
                  </div>
                </li>
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
