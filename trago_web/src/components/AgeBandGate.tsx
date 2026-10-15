import { useEffect, useState } from 'react';
import { api } from '../api';
import { useI18n } from '../lib/i18n';
import './AgeBandGate.css';

/**
 * Declaración de edad → cookie httpOnly firmada en el servidor.
 * El cliente ya no decide con X-Trago-Band / localStorage.
 */
export default function AgeBandGate() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/age/status')
      .then((res) => {
        if (cancelled) return;
        setOpen(res.data?.band === 'anon');
      })
      .catch(() => {
        if (!cancelled) setOpen(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function choose(adult: boolean) {
    setBusy(true);
    try {
      await api.post('/api/age/declare', { adult });
      setOpen(false);
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="age-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="age-gate-panel">
        <h2 id="age-gate-title">{t('ageGateTitle')}</h2>
        <p>{t('ageGateBody')}</p>
        <div className="age-gate-actions">
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => void choose(true)}
          >
            {t('ageGateAdult')}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={() => void choose(false)}
          >
            {t('ageGateTeen')}
          </button>
        </div>
        <p className="meta">{t('ageGateNote')}</p>
      </div>
    </div>
  );
}
