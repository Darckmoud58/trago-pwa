import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, readToken } from '../api';
import FavoriteButton from '../components/FavoriteButton';
import PromoPrice from '../components/PromoPrice';
import ValidityVote from '../components/ValidityVote';
import { useI18n } from '../lib/i18n';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { trackPromoOpen, trackSucursalVista } from '../lib/metrics';
import { googleMapsExactUrl, googleMapsSearchUrl } from '../lib/googleMaps';
import { resolveOfficialPromoUrl } from '../lib/officialUrl';
import type { Branch, Promo } from '../types';
import './Promos.css';
import './PromoDetalle.css';

function fold(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

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

export default function PromoDetalle() {
  const { promoId } = useParams();
  const { t, locale } = useI18n();
  const [promo, setPromo] = useState<Promo | null>(null);
  const [ubicaciones, setUbicaciones] = useState<Branch[]>([]);
  const [vinculoMsg, setVinculoMsg] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [locBusy, setLocBusy] = useState(false);
  const [locNote, setLocNote] = useState('');

  useEffect(() => {
    if (!promoId) return;
    setLoading(true);
    setError('');

    const onFail = () => {
      setError(t('promoMissing'));
    };

    const load = (lat?: number, lng?: number) => {
      const params =
        lat != null && lng != null ? { params: { lat, lng } } : undefined;
      return api
        .get(`/api/promociones/${promoId}`, params)
        .then((res) => {
          const p = res.data.promo as Promo;
          const ubis = (res.data.sucursalesParticipantes ??
            res.data.ubicaciones ??
            []) as Branch[];
          setPromo(p);
          setUbicaciones(ubis);
          setVinculoMsg(res.data.vinculoSucursales?.mensaje || null);
          if (p?._id) {
            void trackPromoOpen(p._id, p.chainId ? String(p.chainId) : undefined);
            for (const u of ubis) {
              if (u._id) {
                void trackSucursalVista(
                  p._id,
                  u._id,
                  p.chainId ? String(p.chainId) : undefined
                );
              }
            }
          }
        });
    };

    const finish = () => setLoading(false);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void load(pos.coords.latitude, pos.coords.longitude)
            .catch(onFail)
            .finally(finish);
        },
        () => {
          void load().catch(onFail).finally(finish);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      void load().catch(onFail).finally(finish);
    }
  }, [promoId, t]);

  if (loading) {
    return (
      <section className="promo-detail">
        <div className="detail-loading" aria-hidden>
          <div className="ui-skeleton" />
          <div className="ui-skeleton sm" />
          <div className="ui-skeleton sm" />
        </div>
        <p className="sr-only">{t('loadingPromo')}</p>
      </section>
    );
  }

  if (error || !promo) {
    return (
      <section className="promo-detail">
        <p className="error">{error || t('promoNotFound')}</p>
        <Link className="btn ghost" to="/promos" viewTransition>
          {t('backToPromos')}
        </Link>
      </section>
    );
  }

  const title = promo.nombre || promo.title || t('promoFallback');
  const desc = promo.descripcion || promo.subtitle;
  const img = resolveMediaUrl(promo.imagen || promo.imageUrl);
  const officialHref = resolveOfficialPromoUrl(promo.url_fuente);
  const end = promo.termina_en || promo.endsAt;
  const nearestBranch = [...ubicaciones]
    .filter((u) => u._id)
    .sort((a, b) => {
      const da =
        typeof a.distanceMeters === 'number' ? a.distanceMeters : Infinity;
      const db =
        typeof b.distanceMeters === 'number' ? b.distanceMeters : Infinity;
      return da - db;
    })[0];
  const nearest =
    nearestBranch && typeof nearestBranch.distanceMeters === 'number'
      ? nearestBranch.distanceMeters
      : undefined;
  const showFacts = Boolean(end || nearest != null);

  const chainName = promo.chainName || t('chainFallback');
  const favPlace = nearestBranch
    ? {
        id: String(nearestBranch._id),
        type: 'ubicacion' as const,
        nombre: nearestBranch.nombre || nearestBranch.name || chainName,
        subtitulo: nearestBranch.chainName || chainName,
        direccion: nearestBranch.address,
        colonia: nearestBranch.colonia,
        municipio: nearestBranch.city,
        horario: nearestBranch.hours,
        distanciaKm:
          typeof nearestBranch.distanceMeters === 'number'
            ? nearestBranch.distanceMeters / 1000
            : undefined,
        imagen: img || undefined,
      }
    : promo.chainId
      ? {
          id: String(promo.chainId),
          type: 'empresa' as const,
          nombre: chainName,
          subtitulo: title,
          imagen: img || undefined,
        }
      : null;

  return (
    <section className="promo-detail">
      <div className="detail-stage rise">
        {img ? (
          <div className="detail-cover">
            <img
              src={img}
              alt=""
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="detail-cover detail-cover-fallback" aria-hidden>
            <span>{(promo.chainName || 'TG').slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        {favPlace && (
          <FavoriteButton
            variant="overlay"
            className="detail-fav"
            place={favPlace}
          />
        )}
      </div>

      <header className="detail-head rise">
        <div className="detail-tags">
          <span className="tag">{promo.chainName || t('chainFallback')}</span>
          {(promo.featured || promo.destacada) && (
            <span className="tag accent">{t('featuredTag')}</span>
          )}
          {(promo.nocturno || promo.isNocturno) && (
            <span className="tag">{t('nightTag')}</span>
          )}
          {(promo.cumpleanos || promo.isBirthday) && (
            <span className="tag">{t('bdayTag')}</span>
          )}
        </div>
        <h1>{title}</h1>
        <PromoPrice promo={promo} className="promo-price-lg" />
        {desc && <p className="lead">{desc}</p>}
      </header>

      {/* Solo hechos útiles: vigencia / distancia. No puntos de lealtad aquí. */}
      {showFacts && (
        <div className="detail-facts rise" data-reveal>
          {end && (
            <div className="detail-fact">
              <p className="label">{t('validity')}</p>
              <p className="detail-fact-value">
                {new Date(end).toLocaleDateString(
                  locale === 'en' ? 'en-US' : 'es-MX'
                )}
              </p>
            </div>
          )}
          {nearest != null && (
            <div className="detail-fact">
              <p className="label">{t('navNear')}</p>
              <p className="detail-fact-value">
                {nearest < 1000
                  ? `${Math.round(nearest)} m`
                  : `${(nearest / 1000).toFixed(1)} km`}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="detail-actions" data-reveal data-reveal-delay="1">
        {officialHref && (
          <a
            className="btn primary"
            href={officialHref}
            target="_blank"
            rel="noreferrer"
          >
            {t('officialSource')} ↗
          </a>
        )}
        <Link className="btn ghost" to="/cerca" viewTransition>
          {t('seeNearMe')}
        </Link>
        <button
          type="button"
          className="btn ghost"
          disabled={locBusy}
          title={t('seeLocationHint')}
          onClick={() => {
            void (async () => {
              setLocBusy(true);
              setLocNote('');
              try {
                const brand = (promo.chainName || '').trim();
                const pos = await readGps();
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const res = await api.get('/api/sucursales/cerca', {
                  params: { lat, lng, maxMeters: 2000 },
                });
                const rows = (res.data.branches || res.data.ubicaciones || []) as Branch[];
                const needle = fold(brand);
                const hit = rows
                  .filter((branch) => {
                    if (!needle) return false;
                    const blob = fold(
                      `${branch.chainName || ''} ${branch.nombre || ''} ${branch.name || ''} ${branch.officialBrand || ''}`
                    );
                    return blob.includes(needle);
                  })
                  .sort(
                    (a, b) =>
                      (a.distanceMeters ?? 1e12) - (b.distanceMeters ?? 1e12)
                  )[0];
                const placeLat = hit?.lat;
                const placeLng = hit?.lng ?? hit?.long;
                if (placeLat == null || placeLng == null) {
                  setLocNote(t('locationNone'));
                  return;
                }
                const placeName = String(hit.nombre || hit.name || brand || '');
                const url =
                  googleMapsExactUrl({
                    lat: placeLat,
                    lng: placeLng,
                    name: placeName,
                  }) ||
                  googleMapsSearchUrl({ name: placeName });
                if (!url) {
                  setLocNote(t('locationNone'));
                  return;
                }
                window.open(url, '_blank', 'noopener,noreferrer');
              } catch {
                setLocNote(t('locationFailed'));
              } finally {
                setLocBusy(false);
              }
            })();
          }}
        >
          {locBusy ? t('loading') : t('seeLocation')}
        </button>
      </div>
      {locNote && <p className="meta">{locNote}</p>}

      {(promo.politicas || promo.terms) && (
        <details
          className="detail-panel detail-policies rise"
          data-reveal
          data-reveal-delay="2"
        >
          <summary className="label">{t('policies')}</summary>
          <p>{promo.politicas || promo.terms}</p>
        </details>
      )}

      <article className="detail-section" data-reveal data-reveal-delay="2">
        <h2>{t('whereApplies')}</h2>
        {vinculoMsg && <p className="meta">{vinculoMsg}</p>}
        {ubicaciones.length === 0 ? (
          <p className="muted">{t('noBranchesLinked')}</p>
        ) : (
          <ul className="detail-branch-list">
            {ubicaciones.map((u, i) => {
              const branchLat = Number(u.lat);
              const branchLng = Number(u.lng ?? u.long);
              const canVote =
                Number.isFinite(branchLat) && Number.isFinite(branchLng);
              return (
                <li
                  key={u._id}
                  className="detail-branch rise"
                  style={{ animationDelay: `${Math.min(i, 8) * 0.03}s` }}
                >
                  <p className="label">{u.chainName || promo.chainName}</p>
                  <h3>{u.nombre || u.name}</h3>
                  {u.address && <p className="meta">{u.address}</p>}
                  {(u.colonia || u.city) && (
                    <p className="meta">
                      {[u.colonia, u.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {u.hours && <p className="meta">{u.hours}</p>}
                  {typeof u.distanceMeters === 'number' && (
                    <span className="detail-dist">
                      {t('branchDistance').replace(
                        '{m}',
                        String(Math.round(u.distanceMeters))
                      )}
                    </span>
                  )}
                  {canVote && u.officialActive !== false ? (
                    <ValidityVote
                      promoId={promo._id}
                      ubicacionId={u._id}
                      branchLat={branchLat}
                      branchLng={branchLng}
                      reportsVigente={u.reportsVigente ?? 0}
                      reportsCaduco={u.reportsCaduco ?? 0}
                      crowdStatus={u.crowdStatus || 'vigente'}
                      officialActive={u.officialActive}
                    />
                  ) : (
                    <p className="meta">{t('branchPromoDisclaimer')}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </article>

      <div className="detail-actions">
        {readToken() ? (
          <Link className="btn ghost" to="/favoritos" viewTransition>
            {t('myFavorites')}
          </Link>
        ) : (
          <Link
            className="btn ghost"
            to="/entrar"
            state={{
              from: `/promos/${promo.slug || promo._id}`,
              reason: 'favorite',
            }}
            viewTransition
          >
            {t('quickLogin')}
          </Link>
        )}
        <Link className="btn ghost" to="/promos" viewTransition>
          {t('backToPromos')}
        </Link>
      </div>
    </section>
  );
}
