import { useEffect, useState } from 'react';
import './InstallBanner.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'trago_install_dismissed';

export default function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  if (!visible || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="install-banner" role="dialog" aria-label="Instalar TraGo">
      <div className="install-copy">
        <strong>Instala TraGo</strong>
        <p>Acceso rápido y favoritos a la mano, como app.</p>
      </div>
      <div className="install-actions">
        <button type="button" className="btn primary btn-sm" onClick={() => void install()}>
          Instalar
        </button>
        <button type="button" className="btn ghost btn-sm" onClick={dismiss}>
          Ahora no
        </button>
      </div>
    </div>
  );
}
