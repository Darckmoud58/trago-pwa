import { useLocation } from 'react-router-dom';
import SponsoredSlot from './SponsoredSlot';
import './SideAdRails.css';

/**
 * Columnas Patrocinado a izquierda/derecha del contenido (desktop ≥900px).
 * En móvil se ocultan; el slot home_rail sigue en el flujo.
 */
export default function SideAdRails() {
  const { pathname } = useLocation();
  const hide =
    pathname.startsWith('/entrar') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/cadena') ||
    pathname.startsWith('/legal');

  if (hide) return null;

  return (
    <>
      <aside className="app-ad-col app-ad-col--left" aria-label="Patrocinado">
        <SponsoredSlot
          slot="side_left"
          variant="side"
          className="side-ad-slot"
        />
      </aside>
      <aside className="app-ad-col app-ad-col--right" aria-label="Patrocinado">
        <SponsoredSlot
          slot="side_right"
          variant="side"
          className="side-ad-slot"
        />
      </aside>
    </>
  );
}
