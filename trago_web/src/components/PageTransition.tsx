import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

type Props = {
  children: React.ReactNode;
};

/**
 * Remonta el contenido al cambiar de ruta para disparar `.page-motion`.
 * Respeta prefers-reduced-motion (sin clase animada).
 */
export default function PageTransition({ children }: Props) {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const animate = !reduce.current;
  // POP (atrás) más sutil: misma animación, clave distinta fuerza remount
  const key = `${pathname}:${navType}`;

  return (
    <div
      key={key}
      className={animate ? 'page-motion' : undefined}
      data-nav={navType.toLowerCase()}
    >
      {children}
    </div>
  );
}
