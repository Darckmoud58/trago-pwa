import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthUser } from '../hooks/useAuthUser';
import {
  birthdaySplashKey,
  readSessionFlag,
  writeSessionFlag,
} from '../lib/birthdayDay';
import { ICON_ART_192 } from '../lib/iconVersion';
import { useI18n } from '../lib/i18n';
import './BirthdaySurpriseSplash.css';

const PAGELOAD_DONE = 'trago:pageload-done';
const PAGELOAD_FALLBACK_MS = 4200;

/**
 * Splash sorpresa del día de cumple (1 vez por día / sesión).
 * Dirige a Home y dispara el ritual de regalos.
 */
export default function BirthdaySurpriseSplash() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, birthdayToday, firstName, loading } = useAuthUser();
  const userId = user?.id || user?._id || '';
  const [bootReady, setBootReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setBootReady(true);
    };
    if (
      (window as Window & { __tragoPageloadDone?: boolean }).__tragoPageloadDone
    ) {
      markReady();
      return;
    }
    window.addEventListener(PAGELOAD_DONE, markReady);
    const fallback = window.setTimeout(markReady, PAGELOAD_FALLBACK_MS);
    return () => {
      cancelled = true;
      window.removeEventListener(PAGELOAD_DONE, markReady);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!bootReady || loading || !birthdayToday || !userId) return;
    if (readSessionFlag(birthdaySplashKey(userId))) return;
    setOpen(true);
  }, [bootReady, loading, birthdayToday, userId]);

  function finish() {
    if (!userId || leaving) return;
    setLeaving(true);
    writeSessionFlag(birthdaySplashKey(userId));
    window.setTimeout(() => {
      setOpen(false);
      setLeaving(false);
      window.dispatchEvent(new Event('trago-bday-splash-closed'));
      navigate('/', { replace: false });
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('trago-bday-open-gifts'));
      });
    }, 420);
  }

  if (!open) return null;

  const title = t('bdaySplashTitle').replace(
    '{name}',
    firstName ? `, ${firstName}` : ''
  );

  return (
    <div
      className={`bday-splash${leaving ? ' is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bday-splash-title"
    >
      <div className="bday-splash-stage" aria-hidden>
        <span className="bday-splash-glow" />
        <span className="bday-splash-ring" />
        <span className="bday-splash-confetti">
          {Array.from({ length: 24 }).map((_, i) => (
            <i key={i} style={{ '--i': i } as CSSProperties} />
          ))}
        </span>
      </div>
      <div className="bday-splash-panel">
        <img
          className="bday-splash-mark"
          src={ICON_ART_192}
          alt=""
          width={88}
          height={88}
          decoding="async"
        />
        <p className="bday-splash-kicker">{t('bdaySplashKicker')}</p>
        <h1 id="bday-splash-title" className="brand-mark bday-splash-title">
          {title}
        </h1>
        <p className="bday-splash-body">{t('bdaySplashBody')}</p>
        <button
          type="button"
          className="btn primary bday-splash-cta"
          onClick={finish}
        >
          {t('bdaySplashCta')}
        </button>
      </div>
    </div>
  );
}
