import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import FavoriteButton from '../components/FavoriteButton';
import { CACHE_KEYS, cacheGet, cacheSet } from '../lib/offlineCache';
import type { Branch } from '../types';
import './Cerca.css';

const GDL = { lng: -103.3496, lat: 20.6767 };

export default function Cerca() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    void cacheGet<{ branches: Branch[]; note: string }>(CACHE_KEYS.lastNear).then(
      (cached) => {
        if (cached?.data?.branches?.length && branches.length === 0) {
          setBranches(cached.data.branches);
          setNote(cached.data.note || 'Última búsqueda guardada');
          setFromCache(true);
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadNear(lng: number, lat: number, label: string) {
    setLoading(true);
    setError('');
    setNote(label);
    try {
      const { data } = await api.get('/api/sucursales/cerca', {
        params: { lng, lat, maxMeters: 8000 },
      });
      const list = (data.branches ?? data.ubicaciones ?? []) as Branch[];
      setBranches(list);
      setFromCache(false);
      await cacheSet(CACHE_KEYS.lastNear, { branches: list, note: label });
    } catch {
      const cached = await cacheGet<{ branches: Branch[]; note: string }>(
        CACHE_KEYS.lastNear
      );
      if (cached?.data?.branches?.length) {
        setBranches(cached.data.branches);
        setNote('Sin red · última búsqueda guardada');
        setFromCache(true);
        setError('');
      } else {
        setError(
          'No pudimos buscar lugares. Revisa tu conexión o abre Favoritos.'
        );
        setBranches([]);
      }
    } finally {
      setLoading(false);
    }
  }

  function useGps() {
    if (!navigator.geolocation) {
      setError('Tu dispositivo no soporta geolocalización');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        void loadNear(
          pos.coords.longitude,
          pos.coords.latitude,
          'Usando tu ubicación'
        ),
      () =>
        void loadNear(
          GDL.lng,
          GDL.lat,
          'Ubicación denegada · Centro Histórico GDL'
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <section className="cerca-page">
      <div className="cerca-actions">
        <button type="button" className="btn primary cerca-main-btn" onClick={useGps}>
          Usar mi ubicación
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => void loadNear(GDL.lng, GDL.lat, 'Centro Histórico GDL')}
        >
          Demo Centro GDL
        </button>
      </div>

      {(note || fromCache) && (
        <p className="cerca-note meta">
          {note}
          {fromCache ? ' · caché' : ''}
        </p>
      )}
      {loading && <p className="muted">Buscando…</p>}
      {error && <p className="error">{error}</p>}

      <ul className="branch-list cerca-list">
        {branches.map((b) => {
          const id = String(b._id);
          const nombre = b.nombre || b.name || 'Sucursal';
          const km =
            typeof b.distanceMeters === 'number'
              ? (b.distanceMeters / 1000).toFixed(2)
              : null;
          return (
            <li key={id} className="promo-card place-card cerca-card">
              <div className="place-card-top">
                <div>
                  <p className="label">{b.chainName || 'Negocio'}</p>
                  <h3>{nombre}</h3>
                </div>
                <div className="cerca-card-right">
                  {km && <span className="dist-pill">{km} km</span>}
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
              </div>
              {b.address && <p className="meta">{b.address}</p>}
              {(b.colonia || b.city) && (
                <p className="meta">
                  {[b.colonia, b.city].filter(Boolean).join(', ')}
                </p>
              )}
              {b.hours && <p className="meta">{b.hours}</p>}
            </li>
          );
        })}
      </ul>

      {!loading && !error && branches.length === 0 && (
        <div className="empty-state">
          <p>Toca “Usar mi ubicación” para ver qué hay cerca.</p>
          <p className="muted">
            También puedes guardar lugares en{' '}
            <Link to="/favoritos">Favoritos</Link> para verlos offline.
          </p>
        </div>
      )}
    </section>
  );
}
