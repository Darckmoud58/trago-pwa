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

  const inicio = pathname === '/';
  const explorar = pathname.startsWith('/promos');
  if (hide || (!inicio && !explorar)) return null;

  const left = inicio ? 'inicio_side_left' : 'explorar_side_left';
  const right = inicio ? 'inicio_side_right' : 'explorar_side_right';

  return (
    <>
      <aside className="app-ad-col app-ad-col--left" aria-label="Patrocinado">
        <SponsoredSlot
          slot={left}
          variant="side"
          className="side-ad-slot"
        />
      </aside>
      <aside className="app-ad-col app-ad-col--right" aria-label="Patrocinado">
        <SponsoredSlot
          slot={right}
          variant="side"
          className="side-ad-slot"
        />
      </aside>
    </>
  );
}
