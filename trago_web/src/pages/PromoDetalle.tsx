import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Branch, Promo } from '../types';
import './Promos.css';

export default function PromoDetalle() {
  const { promoId } = useParams();
  const [promo, setPromo] = useState<Promo | null>(null);
  const [ubicaciones, setUbicaciones] = useState<Branch[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const band = localStorage.getItem('trago_band');
  const isTeen = band === 'teen';

  useEffect(() => {
    if (!promoId) return;
    setLoading(true);
    api
      .get(`/api/promociones/${promoId}`)
      .then((res) => {
        setPromo(res.data.promo);
        setUbicaciones(res.data.ubicaciones ?? []);
      })
      .catch(() => setError('No encontramos esa promoción.'))
      .finally(() => setLoading(false));
  }, [promoId]);

  if (loading) {
    return (
      <section className="promos-page">
        <p className="muted">Cargando promo…</p>
      </section>
    );
  }

  if (error || !promo) {
    return (
      <section className="promos-page">
        <p className="error">{error || 'Promoción no encontrada'}</p>
        <Link className="btn ghost" to="/promos">
          Volver a promos
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
          Esta promo es solo para mayores de 18.{' '}
          <Link to="/terminos">Ver términos</Link>
        </aside>
        <Link className="btn ghost" to="/promos">
          Volver a promos
        </Link>
      </section>
    );
  }

  const title = promo.nombre || promo.title || 'Promoción';
  const desc = promo.descripcion || promo.subtitle;
  const img = promo.imagen || promo.imageUrl;
  const end = promo.termina_en || promo.endsAt;

  return (
    <section className="promos-page promo-detail">
      <p className="meta">
        <Link to="/promos">← Promos</Link>
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
        <span className="tag">{promo.chainName || 'Cadena'}</span>
        {(promo.featured || promo.destacada) && (
          <span className="tag accent">Destacada</span>
        )}
        {promo.alcohol && <span className="tag warn">18+</span>}
        {(promo.nocturno || promo.isNocturno) && (
          <span className="tag">Nocturno</span>
        )}
        {(promo.cumpleanos || promo.isBirthday) && (
          <span className="tag">Cumple</span>
        )}
      </div>

      <h1>{title}</h1>
      {desc && <p className="lead">{desc}</p>}

      <div className="detail-facts">
        {typeof promo.puntos === 'number' && (
          <div className="fact">
            <p className="label">Puntos</p>
            <p className="fact-value">{promo.puntos}</p>
          </div>
        )}
        {end && (
          <div className="fact">
            <p className="label">Vigencia</p>
            <p className="fact-value">
              {new Date(end).toLocaleDateString()}
            </p>
          </div>
        )}
        <div className="fact">
          <p className="label">Sucursales</p>
          <p className="fact-value">{ubicaciones.length}</p>
        </div>
      </div>

      {(promo.politicas || promo.terms) && (
        <article className="promo-card detail-block">
          <p className="label">Políticas</p>
          <p>{promo.politicas || promo.terms}</p>
        </article>
      )}

      <article className="detail-block">
        <h2>Dónde aplica</h2>
        {ubicaciones.length === 0 ? (
          <p className="muted">Sin sucursales ligadas aún.</p>
        ) : (
          <ul className="branch-list">
            {ubicaciones.map((u) => (
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
              </li>
            ))}
          </ul>
        )}
      </article>

      <div className="cta-row" style={{ justifyContent: 'center' }}>
        <Link className="btn primary" to="/cerca">
          Ver cerca de mí
        </Link>
        <Link className="btn ghost" to="/favoritos">
          Mis favoritos
        </Link>
      </div>
    </section>
  );
}
