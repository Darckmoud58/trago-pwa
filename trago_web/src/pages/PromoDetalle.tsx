import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import ValidityVote from '../components/ValidityVote';
import { useI18n } from '../lib/i18n';
import type { Branch, Promo } from '../types';
import './Promos.css';

export default function PromoDetalle() {
  const { promoId } = useParams();
  const { t, locale } = useI18n();
  const [promo, setPromo] = useState<Promo | null>(null);
  const [ubicaciones, setUbicaciones] = useState<Branch[]>([]);
  const [vinculoMsg, setVinculoMsg] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const band = localStorage.getItem('trago_band');
  const isTeen = band === 'teen';

  useEffect(() => {
    if (!promoId) return;
    setLoading(true);

    const load = (lat?: number, lng?: number) => {
      const params =
        lat != null && lng != null ? { params: { lat, lng } } : undefined;
      return api
        .get(`/api/promociones/${promoId}`, params)
        .then((res) => {
          setPromo(res.data.promo);
          setUbicaciones(
            res.data.sucursalesParticipantes ?? res.data.ubicaciones ?? []
          );
          setVinculoMsg(res.data.vinculoSucursales?.mensaje || null);
        });
    };

    const finish = () => setLoading(false);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void load(pos.coords.latitude, pos.coords.longitude)
            .catch(() => setError(t('promoMissing')))
            .finally(finish);
        },
        () => {
          void load()
            .catch(() => setError(t('promoMissing')))
            .finally(finish);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      void load()
        .catch(() => setError(t('promoMissing')))
        .finally(finish);
    }
  }, [promoId, t]);

  if (loading) {
    return (
      <section className="promos-page">
        <p className="muted">{t('loadingPromo')}</p>
      </section>
    );
  }

  if (error || !promo) {
    return (
      <section className="promos-page">
        <p className="error">{error || t('promoNotFound')}</p>
        <Link className="btn ghost" to="/promos">
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

  if (blocked) {
    return (
      <section className="promos-page">
        <aside className="promos-note">
          {t('promo18Only')} <Link to="/terminos">{t('seeTerms')}</Link>
        </aside>
        <Link className="btn ghost" to="/promos">
          {t('backToPromos')}
        </Link>
      </section>
    );
  }

  const title = promo.nombre || promo.title || t('promoFallback');
  const desc = promo.descripcion || promo.subtitle;
  const img = promo.imagen || promo.imageUrl;
  const end = promo.termina_en || promo.endsAt;

  return (
    <section className="promos-page promo-detail">
      <p className="meta">
        <Link to="/promos">← {t('quickPromos')}</Link>
      </p>

      {img ? (
        <div
          className="detail-cover"
          style={{ backgroundImage: `url(${img})` }}
          aria-hidden
        />
      ) : (
        <div className="detail-cover detail-cover-fallback" aria-hidden>
          <span>{(promo.chainName || 'TG').slice(0, 2).toUpperCase()}</span>
        </div>
      )}

      <div className="promo-tags" style={{ marginTop: '1rem' }}>
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

      <div className="detail-facts">
        {typeof promo.puntos === 'number' && (
          <div className="fact">
            <p className="label">{t('points')}</p>
            <p className="fact-value">{promo.puntos}</p>
          </div>
        )}
        {end && (
          <div className="fact">
            <p className="label">{t('validity')}</p>
            <p className="fact-value">
              {new Date(end).toLocaleDateString(
                locale === 'en' ? 'en-US' : 'es-MX'
              )}
            </p>
          </div>
        )}
        <div className="fact">
          <p className="label">{t('locations')}</p>
          <p className="fact-value">{ubicaciones.length}</p>
        </div>
      </div>

      {promo.url_fuente && <p className="meta promo-source-link"><a href={promo.url_fuente} target="_blank" rel="noreferrer">{t('officialSource')} ↗</a></p>}

      {(promo.politicas || promo.terms) && (
        <article className="promo-card detail-block">
          <p className="label">{t('policies')}</p>
          <p>{promo.politicas || promo.terms}</p>
        </article>
      )}

      <article className="detail-block">
        <h2>{t('whereApplies')}</h2>
        {vinculoMsg && <p className="meta">{vinculoMsg}</p>}
        {ubicaciones.length === 0 ? (
          <p className="muted">{t('noBranchesLinked')}</p>
        ) : (
          <ul className="branch-list">
            {ubicaciones.map((u) => {
              const branchLat = Number(u.lat);
              const branchLng = Number(u.lng ?? u.long);
              const canVote =
                Number.isFinite(branchLat) && Number.isFinite(branchLng);
              return (
                <li key={u._id} className="promo-card">
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
                    <p className="meta">
                      {t('branchDistance').replace(
                        '{m}',
                        String(Math.round(u.distanceMeters))
                      )}
                    </p>
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

      <div className="cta-row" style={{ justifyContent: 'center' }}>
        <Link className="btn primary" to="/cerca">
          {t('seeNearMe')}
        </Link>
        <Link className="btn ghost" to="/favoritos">
          {t('myFavorites')}
        </Link>
      </div>
    </section>
  );
}
