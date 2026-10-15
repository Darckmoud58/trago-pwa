import { Navigate, useLocation } from 'react-router-dom';
import { hasSession } from '../lib/viewerAccess';

type Props = {
  children: React.ReactNode;
  /** Motivo para copy post-login (favorite, vote, account…). */
  reason?: string;
};

/** Bloquea rutas de cuenta: favoritos, cuenta, cadena, etc. */
export default function RequireAuth({ children, reason }: Props) {
  const location = useLocation();
  if (hasSession()) return <>{children}</>;
  return (
    <Navigate
      to="/entrar"
      replace
      state={{
        from: `${location.pathname}${location.search}`,
        reason: reason || 'account',
      }}
    />
  );
}
