import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import ValidityVote from '../components/ValidityVote';
import { getAgeBand } from '../lib/ageBand';
import { useI18n } from '../lib/i18n';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { trackPromoOpen, trackSucursalVista } from '../lib/metrics';
import { resolveOfficialPromoUrl } from '../lib/officialUrl';
import type { Branch, Promo } from '../types';
import './Promos.css';
import './PromoDetalle.css';

export default function PromoDetalle() {
  const { promoId } = useParams();
  const { t, locale } = useI18n();
  const [promo, setPromo] = useState<Promo | null>(null);
  const [ubicaciones, setUbicaciones] = useState<Branch[]>([]);
  const [vinculoMsg, setVinculoMsg] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ageBlocked, setAgeBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const isTeen = getAgeBand() === 'teen';

  useEffect(() => {
    if (!promoId) return;
    setLoading(true);
    setAgeBlocked(false);
    setError('');

    const onFail = (err: unknown) => {
      const status = (err as { response?: { status?: number; data?: { code?: string } } })
        ?.response?.status;
      const code = (err as { response?: { data?: { code?: string } } })?.response
        ?.data?.code;
      if (status === 403 && code === 'AGE_RESTRICTED') {
        setAgeBlocked(true);
        setPromo(null);
        return;
      }
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

  if (ageBlocked || (isTeen && !promo && !error)) {
    return (
      <section className="promo-detail">
        <aside className="promos-note">
          {t('promo18Only')} <Link to="/terminos">{t('seeTerms')}</Link>
        </aside>
        <Link className="btn ghost" to="/promos" viewTransition>
          {t('backToPromos')}
        </Link>
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

  const blocked =
    isTeen &&
    (promo.alcohol ||
      promo.audience === 'adult' ||
      promo.audiencia === 'adulto' ||
      promo.nocturno ||
      promo.isNocturno);

  if (blocked || ageBlocked) {
    return (
      <section className="promo-detail">
        <aside className="promos-note">
          {t('promo18Only')} <Link to="/terminos">{t('seeTerms')}</Link>
        </aside>
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
  const nearest = ubicaciones
    .map((u) =>
      typeof u.distanceMeters === 'number' ? u.distanceMeters : null
    )
    .filter((m): m is number => m != null)
    .sort((a, b) => a - b)[0];
  const showFacts = Boolean(end || nearest != null);

  return (
    <section className="promo-detail">
      <div className="detail-stage rise">
        {img ? (
          <div className="detail-cover" aria-hidden>
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
      </div>

      <header className="detail-head rise">
        <div className="detail-tags">
          <span className="tag">{promo.chainName || t('chainFallback')}</span>
          {(promo.featured || promo.destacada) && (
            <span className="tag accent">{t('featuredTag')}</span>
          )}
          {promo.alcohol && <span className="tag warn">18+</span>}
          {(promo.nocturno || promo.isNocturno) && (
            <span className="tag">{t('nightTag')}</span>
          )}
          {(promo.cumpleanos || promo.isBirthday) && (
            <span className="tag">{t('bdayTag')}</span>
          )}
        </div>
        <h1>{title}</h1>
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
      </div>

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
        <Link className="btn ghost" to="/favoritos" viewTransition>
          {t('myFavorites')}
        </Link>
        <Link className="btn ghost" to="/promos" viewTransition>
          {t('backToPromos')}
        </Link>
      </div>
    </section>
  );
}
