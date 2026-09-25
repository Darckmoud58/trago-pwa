import { Link } from 'react-router-dom';
import './OfflineBanner.css';

export default function OfflineBanner() {
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <strong>Sin conexión</strong>
      <span>
        Puedes abrir favoritos y lo último guardado.{' '}
        <Link to="/favoritos">Ir a favoritos</Link>
      </span>
    </div>
  );
}
