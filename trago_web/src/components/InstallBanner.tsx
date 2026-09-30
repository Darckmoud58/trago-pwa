import { useEffect, useState } from 'react';
import './InstallBanner.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'trago_install_dismissed_v4';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const t = Number(raw);
    if (Number.isNaN(t)) return true;
    return Date.now() - t < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export default function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);
  const ios = typeof navigator !== 'undefined' && isIos();
  const android = typeof navigator !== 'undefined' && isAndroid();

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBip);

    const timer = window.setTimeout(() => {
      if (!isStandalone() && !wasDismissedRecently()) setVisible(true);
    }, 1200);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible || isStandalone()) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  const title = ios ? 'Añadir a pantalla de inicio' : 'Instalar TraGo';
  const tip = ios
    ? 'Toca Compartir (□↑) y elige “Añadir a pantalla de inicio”.'
    : deferred
      ? 'Instálala como app: acceso rápido y favoritos a la mano.'
      : android
        ? 'Menú ⋮ del navegador → “Instalar app” o “Añadir a la pantalla de inicio”.'
        : 'En el menú del navegador elige “Instalar TraGo”.';

  const showInstallBtn = Boolean(deferred) && !ios;

  return (
    <div className="install-sheet" role="dialog" aria-label={title}>
      <div className="install-sheet-card">
        <img
          className="install-logo"
          src="/icon-192-v2.png"
          width={48}
          height={48}
          alt="TraGo"
        />
        <div className="install-copy">
          <strong>{title}</strong>
          <p>{tip}</p>
          {ios && (
            <ol className="install-steps">
              <li>Compartir</li>
              <li>Añadir a pantalla de inicio</li>
              <li>Añadir</li>
            </ol>
          )}
        </div>
        <div className="install-actions">
          {showInstallBtn && (
            <button
              type="button"
              className="btn primary btn-sm"
              onClick={() => void install()}
            >
              Instalar
            </button>
          )}
          <button type="button" className="btn ghost btn-sm" onClick={dismiss}>
            {ios ? 'Entendido' : 'Ahora no'}
          </button>
        </div>
      </div>
    </div>
  );
}
