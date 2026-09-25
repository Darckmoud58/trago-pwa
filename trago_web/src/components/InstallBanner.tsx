import { useEffect, useState } from 'react';
import './InstallBanner.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'trago_install_dismissed_v3';
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

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBip);

    // Siempre mostrar tip de instalación (Chrome BIP o guía manual / iOS)
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

  const tip = deferred
    ? 'Ábrela como app: acceso rápido y favoritos a la mano.'
    : isIos()
      ? 'En iPhone: Compartir → “Añadir a pantalla de inicio”.'
      : 'En el menú del navegador elige “Instalar TraGo” o “Añadir a la pantalla de inicio”.';

  return (
    <div className="install-sheet" role="dialog" aria-label="Instalar TraGo">
      <div className="install-sheet-card">
        <img
          className="install-logo"
          src="/icon-192.svg"
          width={48}
          height={48}
          alt="TraGo"
        />
        <div className="install-copy">
          <strong>Instalar TraGo</strong>
          <p>{tip}</p>
        </div>
        <div className="install-actions">
          {deferred && (
            <button
              type="button"
              className="btn primary btn-sm"
              onClick={() => void install()}
            >
              Instalar
            </button>
          )}
          <button type="button" className="btn ghost btn-sm" onClick={dismiss}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
