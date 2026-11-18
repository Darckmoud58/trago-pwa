import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthUser } from '../hooks/useAuthUser';
import { useI18n } from '../lib/i18n';
import './BirthdayGuideFab.css';

/** Chip vivo: desde cualquier ruta del día de cumple, te lleva a tus regalos. */
export default function BirthdayGuideFab() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { birthdayToday, firstName } = useAuthUser();

  if (!birthdayToday) return null;
  if (pathname === '/' || pathname.startsWith('/entrar') || pathname.startsWith('/registro')) {
    return null;
  }

  return (
    <button
      type="button"
      className="bday-guide-fab"
      onClick={() => {
        navigate('/');
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('trago-bday-open-gifts'));
        });
      }}
    >
      <span className="bday-guide-fab-pulse" aria-hidden />
      <span className="bday-guide-fab-label">
        {t('bdayGuideFab').replace(
          '{name}',
          firstName ? `, ${firstName}` : ''
        )}
      </span>
    </button>
  );
}
