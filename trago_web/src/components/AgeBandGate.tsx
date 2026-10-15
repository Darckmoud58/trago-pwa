import { useEffect, useState } from 'react';
import { api } from '../api';
import { setAgeBand, type AgeBand } from '../lib/ageBand';
import { useI18n } from '../lib/i18n';
import './AgeBandGate.css';

const PAGELOAD_DONE = 'trago:pageload-done';
/** Tope: si el overlay no avisa, no bloqueamos el gate para siempre. */
const PAGELOAD_FALLBACK_MS = 4500;

/**
 * Declaración de edad → cookie httpOnly firmada en el servidor.
 * No se muestra encima del PageLoadOverlay.
 */
export default function AgeBandGate() {
  const { t } = useI18n();
  const [bootReady, setBootReady] = useState(false);
  const [needsGate, setNeedsGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
    let cancelled = false;
    api
      .get('/api/age/status', { timeout: 12_000 })
      .then((res) => {
        if (cancelled) return;
        setNeedsGate(res.data?.band === 'anon');
      })
      .catch(() => {
        if (!cancelled) setNeedsGate(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function choose(adult: boolean) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(
        '/api/age/declare',
        { adult: Boolean(adult) },
        { timeout: 15_000 }
      );
      if (data?.band !== 'adult' && data?.band !== 'teen') {
        setError(t('ageGateError'));
        return;
      }
      setAgeBand(data.band as AgeBand);
      setNeedsGate(false);
      // Sin reload: cookie httpOnly ya quedó en la respuesta.
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (status === 404 || status === 502
          ? t('ageGateErrorApi')
          : t('ageGateError'));
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (!bootReady || !needsGate) return null;

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
            {busy ? t('ageGateSaving') : t('ageGateAdult')}
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
        {error ? (
          <p className="error age-gate-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="meta">{t('ageGateNote')}</p>
      </div>
    </div>
  );
}
