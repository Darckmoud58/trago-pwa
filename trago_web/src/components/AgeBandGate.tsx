import { useEffect, useState } from 'react';
import { getAgeBand, setAgeBand, type AgeBand } from '../lib/ageBand';
import { useI18n } from '../lib/i18n';
import './AgeBandGate.css';

/** Declaración de edad para invitados (el servidor respeta X-Trago-Band). */
export default function AgeBandGate() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!getAgeBand());
  }, []);

  function choose(band: AgeBand) {
    setAgeBand(band);
    setOpen(false);
    // Recargar catálogo ya filtrado en servidor con la nueva banda.
    window.location.reload();
  }

  if (!open) return null;

  return (
    <div className="age-gate" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className="age-gate-panel">
        <h2 id="age-gate-title">{t('ageGateTitle')}</h2>
        <p>{t('ageGateBody')}</p>
        <div className="age-gate-actions">
          <button type="button" className="btn primary" onClick={() => choose('adult')}>
            {t('ageGateAdult')}
          </button>
          <button type="button" className="btn ghost" onClick={() => choose('teen')}>
            {t('ageGateTeen')}
          </button>
        </div>
        <p className="meta">{t('ageGateNote')}</p>
      </div>
    </div>
  );
}
