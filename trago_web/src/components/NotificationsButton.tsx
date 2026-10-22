import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { usePushNotifications } from '../lib/usePushNotifications';
import './NotificationsButton.css';

type Props = { loggedIn: boolean };

export default function NotificationsButton({ loggedIn }: Props) {
  const { t } = useI18n();
  const { state, busy, note, enable, disable, test } =
    usePushNotifications(loggedIn);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (state === 'checking' || state === 'unsupported') return null;

  return (
    <div className="notif-anchor" ref={ref}>
      <button
        type="button"
        className={`notif-bell${state === 'on' ? ' is-on' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={t('settingsNotif')}
        aria-expanded={open}
        title={t('settingsNotif')}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M12 22a2.4 2.4 0 0 0 2.35-1.9h-4.7A2.4 2.4 0 0 0 12 22Zm7-6.2V11a7 7 0 0 0-5.2-6.76V3.5a1.8 1.8 0 1 0-3.6 0v.74A7 7 0 0 0 5 11v4.8L3.3 17.5a1 1 0 0 0 .7 1.7h16a1 1 0 0 0 .7-1.7L19 15.8Z"
          />
        </svg>
        {state === 'on' ? <span className="notif-dot" /> : null}
      </button>

      {open ? (
        <div className="notif-popover" role="dialog" aria-label={t('settingsNotif')}>
          {state === 'ios' ? <p>{t('notifIos')}</p> : null}
          {state === 'login' ? (
            <>
              <p>{t('notifNeedLogin')}</p>
              <Link className="btn primary" to="/entrar" onClick={() => setOpen(false)}>
                {t('quickLogin')}
              </Link>
            </>
          ) : null}
          {state === 'off' ? (
            <>
              <p>{t('notifBody')}</p>
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => void enable(t('notifActivated'))}
              >
                {busy ? t('settingsNotifBusy') : t('settingsNotifEnable')}
              </button>
            </>
          ) : null}
          {state === 'on' ? (
            <>
              <p>{t('notifOn')}</p>
              <div className="notif-actions">
                <button
                  type="button"
                  className="btn primary"
                  disabled={busy}
                  onClick={() => void test(t('notifTestSent'))}
                >
                  {t('notifTest')}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => void disable(t('notifDeactivated'))}
                >
                  {t('notifDisable')}
                </button>
              </div>
            </>
          ) : null}
          {note ? (
            <p className="notif-note" role="status">
              {note}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
