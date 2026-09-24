import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listFavorites,
  removeFavorite,
  type FavoritePlace,
} from '../lib/favorites';

export default function Favoritos() {
  const [items, setItems] = useState<FavoritePlace[]>([]);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  async function refresh() {
    setItems(await listFavorites());
  }

  useEffect(() => {
    void refresh();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  async function onRemove(id: string) {
    await removeFavorite(id);
    await refresh();
  }

  return (
    <section>
      <h1>Mis favoritos</h1>
      <p className="lead">
        Guardados en este dispositivo. Funcionan{' '}
        <strong>sin internet</strong>.
      </p>
      <p className={`status-pill ${online ? 'on' : 'off'}`}>
        {online ? 'En línea' : 'Sin conexión · viendo caché local'}
      </p>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>Aún no tienes favoritos.</p>
          <p className="muted">
            En <Link to="/cerca">Cerca</Link> o{' '}
            <Link to="/negocios">Negocios</Link> toca el corazón para guardar
            un lugar.
          </p>
        </div>
      ) : (
        <ul className="branch-list">
          {items.map((f) => (
            <li key={f.id} className="promo-card fav-card">
              <div className="fav-card-body">
                <p className="label">
                  {f.type === 'empresa' ? 'Negocio' : 'Sucursal'}
                </p>
                <h3>{f.nombre}</h3>
                {f.subtitulo && <p>{f.subtitulo}</p>}
                {f.direccion && <p className="meta">{f.direccion}</p>}
                {(f.colonia || f.municipio) && (
                  <p className="meta">
                    {[f.colonia, f.municipio].filter(Boolean).join(', ')}
                  </p>
                )}
                {f.horario && <p className="meta">{f.horario}</p>}
              </div>
              <button
                type="button"
                className="btn ghost fav-remove"
                onClick={() => void onRemove(f.id)}
                aria-label={`Quitar ${f.nombre} de favoritos`}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
