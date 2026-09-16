import { useState } from 'react';
import { api } from '../api';
import type { Branch } from '../types';

/** Centro Histórico GDL — fallback si niegan GPS (mismo criterio TraGo). */
const GDL = { lng: -103.3496, lat: 20.6767 };

export default function Cerca() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadNear(lng: number, lat: number, label: string) {
    setLoading(true);
    setError('');
    setNote(label);
    try {
      const { data } = await api.get('/api/sucursales/cerca', {
        params: { lng, lat, maxMeters: 8000 },
      });
      setBranches(data.branches ?? []);
    } catch {
      setError('No se pudo consultar sucursales. ¿API y Mongo arriba?');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }

  function useGps() {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        loadNear(
          pos.coords.longitude,
          pos.coords.latitude,
          'Usando tu GPS'
        ),
      () =>
        loadNear(
          GDL.lng,
          GDL.lat,
          'GPS denegado · Centro Histórico GDL (referencia, no fingimos que estás ahí)'
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <section>
      <h1>Cerca de ti</h1>
      <p className="lead">GET /api/sucursales/cerca · $geoNear</p>
      <div className="cta-row">
        <button type="button" className="btn primary" onClick={useGps}>
          Usar mi ubicación
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() =>
            loadNear(GDL.lng, GDL.lat, 'Centro Histórico GDL (demo)')
          }
        >
          Demo Centro GDL
        </button>
      </div>
      {note && <p className="muted">{note}</p>}
      {loading && <p className="muted">Buscando…</p>}
      {error && <p className="error">{error}</p>}
      <ul className="branch-list">
        {branches.map((b) => (
          <li key={b._id} className="promo-card">
            <p className="label">{b.chainName || 'Negocio'}</p>
            <h3>{b.name}</h3>
            <p>{b.address}</p>
            {(b.colonia || b.city) && (
              <p className="meta">
                {[b.colonia, b.city].filter(Boolean).join(', ')}
              </p>
            )}
            {typeof b.distanceMeters === 'number' && (
              <p className="meta">
                {(b.distanceMeters / 1000).toFixed(2)} km
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
