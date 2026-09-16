import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Promo } from '../types';

export default function Promos() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/promociones')
      .then((res) => setPromos(res.data.promos ?? []))
      .catch(() => setError('No se pudieron cargar las promos. ¿API en :4000?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <h1>Promos</h1>
      <p className="lead">Catálogo activo desde Express · GET /api/promociones</p>
      {loading && <p className="muted">Cargando…</p>}
      {error && <p className="error">{error}</p>}
      <div className="promo-grid">
        {promos.map((p) => (
          <article key={p._id} className="promo-card">
            <p className="label">
              {p.chainName || 'Cadena'}
              {p.featured ? ' · destacada' : ''}
            </p>
            <h3>{p.title}</h3>
            {p.subtitle && <p>{p.subtitle}</p>}
            <p className="meta">
              {p.kind || 'promo'}
              {p.alcohol ? ' · 18+' : ''}
              {p.isNocturno ? ' · nocturno' : ''}
              {p.isBirthday ? ' · cumple' : ''}
            </p>
            {p.endsAt && (
              <p className="meta">Hasta {new Date(p.endsAt).toLocaleDateString()}</p>
            )}
          </article>
        ))}
      </div>
      {!loading && !error && promos.length === 0 && (
        <p className="muted">
          Sin promociones en Mongo. Corre el seed del server cuando lo tengas.
        </p>
      )}
    </section>
  );
}
