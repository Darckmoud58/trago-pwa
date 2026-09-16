import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Negocio } from '../types';

export default function Negocios() {
  const [items, setItems] = useState<Negocio[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/negocios')
      .then((res) => setItems(res.data.negocios ?? []))
      .catch(() => setError('No se pudieron cargar negocios.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <h1>Negocios</h1>
      <p className="lead">GET /api/negocios</p>
      {loading && <p className="muted">Cargando…</p>}
      {error && <p className="error">{error}</p>}
      <div className="promo-grid">
        {items.map((n) => (
          <article key={n._id} className="promo-card">
            <h3>{n.name}</h3>
            <p className="meta">
              {n.kind || 'cadena'}
              {n.plan ? ` · ${n.plan}` : ''}
            </p>
          </article>
        ))}
      </div>
      {!loading && !error && items.length === 0 && (
        <p className="muted">Sin negocios en la BD aún.</p>
      )}
    </section>
  );
}
