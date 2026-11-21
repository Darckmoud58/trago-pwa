import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useI18n } from '../lib/i18n';
import './Cadena.css';

type PagoView = {
  _id: string;
  plan: string;
  sucursales: number;
  monto: number;
  moneda: string;
  dias: number;
  estatus: string;
  provider: string;
};

/**
 * Checkout sandbox TraGo (sin Mercado Pago).
 * URL: /cadena/pago-sandbox?pago=&token=
 */
export default function PagoSandbox() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pagoId = params.get('pago') || '';
  const token = params.get('token') || '';
  const [pago, setPago] = useState<PagoView | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pagoId || !token) {
      setError(t('paySandboxBadLink'));
      setLoading(false);
      return;
    }
    void api
      .get(`/api/pagos/sandbox/${pagoId}`, { params: { token } })
      .then((res) => {
        setPago(res.data.pago as PagoView);
      })
      .catch(() => setError(t('paySandboxLoadError')))
      .finally(() => setLoading(false));
  }, [pagoId, token, t]);

  async function onApprove() {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api.post(`/api/pagos/sandbox/${pagoId}/aprobar`, {
        token,
      });
      setInfo(res.data.message || t('paySandboxOk'));
      setPago(res.data.pago as PagoView);
      window.setTimeout(() => navigate('/cadena', { replace: true }), 1200);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('paySandboxFail'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cadena-page">
      <p className="meta">
        <Link to="/cadena">← {t('chainTitle')}</Link>
      </p>
      <h1>{t('paySandboxTitle')}</h1>
      <p className="lead">{t('paySandboxLead')}</p>

      {loading && <p className="muted">{t('loading')}</p>}
      {error && <p className="error">{error}</p>}
      {info && <p className="cadena-info">{info}</p>}

      {pago && (
        <article className="cadena-card">
          <p className="label">{t('paySandboxQuote')}</p>
          <h2>
            {pago.plan} · {pago.sucursales}{' '}
            {pago.sucursales === 1 ? t('payBranchOne') : t('payBranchMany')}
          </h2>
          <p className="meta">
            {pago.moneda} ${pago.monto.toLocaleString('es-MX')} · {pago.dias}{' '}
            {t('payDays')} · {pago.estatus}
          </p>
          {pago.estatus === 'pending' ? (
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={() => void onApprove()}
            >
              {busy ? t('paySandboxApproving') : t('paySandboxApprove')}
            </button>
          ) : (
            <Link className="btn primary" to="/cadena">
              {t('chainTitle')}
            </Link>
          )}
        </article>
      )}
    </section>
  );
}
