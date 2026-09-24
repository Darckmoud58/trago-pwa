import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import FavoriteButton from '../components/FavoriteButton';
import type { Branch } from '../types';

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
      setBranches(data.branches ?? data.ubicaciones ?? []);
    } catch {
      setError(
        'No pudimos buscar lugares. Revisa tu conexión o guarda favoritos para verlos sin red.'
      );
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }

  function useGps() {
    if (!navigator.geolocation) {
      setError('Tu dispositivo no soporta geolocalización');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        loadNear(pos.coords.longitude, pos.coords.latitude, 'Usando tu ubicación'),
      () =>
        loadNear(
          GDL.lng,
          GDL.lat,
          'Ubicación denegada · mostrando Centro Histórico GDL'
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <section>
      <h1>Cerca de ti</h1>
      <p className="lead">
        Encuentra sucursales en la ZMG. Guarda las que te gusten: quedan en{' '}
        <Link to="/favoritos">Mis favoritos</Link> sin internet.
      </p>
      <div className="cta-row">
        <button type="button" className="btn primary" onClick={useGps}>
          Usar mi ubicación
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => loadNear(GDL.lng, GDL.lat, 'Centro Histórico GDL')}
        >
          Explorar Centro GDL
        </button>
      </div>
      {note && <p className="muted">{note}</p>}
      {loading && <p className="muted">Buscando cerca de ti…</p>}
      {error && <p className="error">{error}</p>}
      <ul className="branch-list">
        {branches.map((b) => {
          const id = String(b._id);
          const nombre = b.nombre || b.name || 'Sucursal';
          return (
            <li key={id} className="promo-card place-card">
              <div className="place-card-top">
                <p className="label">{b.chainName || 'Negocio'}</p>
                <FavoriteButton
                  place={{
                    id,
                    type: 'ubicacion',
                    nombre,
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
              <h3>{nombre}</h3>
              {b.address && <p>{b.address}</p>}
              {(b.colonia || b.city) && (
                <p className="meta">
                  {[b.colonia, b.city].filter(Boolean).join(', ')}
                </p>
              )}
              {typeof b.distanceMeters === 'number' && (
                <p className="meta">{(b.distanceMeters / 1000).toFixed(2)} km</p>
              )}
            </li>
          );
        })}
      </ul>
      {!loading && !error && branches.length === 0 && note && (
        <p className="muted">No hay sucursales en ese radio. Prueba otro punto.</p>
      )}
    </section>
  );
}
