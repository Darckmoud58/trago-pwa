import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, readToken } from '../api';
import { useI18n } from '../lib/i18n';
import './Cadena.css';

type Recibo = {
  folio?: string;
  aprobado?: boolean;
  pago?: {
    _id?: string;
    plan?: string;
    slot?: string;
    monto?: number;
    moneda?: string;
    dias?: number;
    estatus?: string;
    provider?: string;
    provider_ref?: string;
    pagado_en?: string;
    kind?: string;
    sucursales?: number;
  };
  suscripcion?: {
    plan?: string;
    estatus?: string;
    termina?: string | null;
  } | null;
};

/**
 * Confirmación + recibo tras Mercado Pago / PayPal / sandbox.
 * URL: /cadena/pago-resultado?status=ok|fail|pending|cancel&pago=
 */
export default function PagoResultado() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const rawPago = params.get('pago') || '';
  const pagoId = /^[a-f0-9]{24}$/i.test(rawPago)
    ? rawPago
    : params.get('external_reference') || '';
  const paymentId = params.get('payment_id') || params.get('collection_id') || '';
  const collectionStatus = (
    params.get('collection_status') ||
    ''
  ).toLowerCase();
  const outcome = (
    ['ok', 'fail', 'pending', 'cancel'].includes(
      (params.get('status') || '').toLowerCase()
    )
      ? params.get('status')
      : ['ok', 'fail', 'pending', 'cancel'].includes(rawPago.toLowerCase())
        ? rawPago
        : collectionStatus === 'approved'
          ? 'ok'
          : collectionStatus || 'fail'
  )?.toLowerCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const [headline, setHeadline] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');

      const looksOk = outcome === 'ok' || collectionStatus === 'approved';
      const looksPending = outcome === 'pending' || collectionStatus === 'pending';
      const looksCancel = outcome === 'cancel';
      const looksFail =
        outcome === 'fail' ||
        collectionStatus === 'rejected' ||
        collectionStatus === 'cancelled';

      try {
        if (paymentId && paymentId !== 'null' && !looksFail && !looksCancel) {
          const res = await api.post('/api/pagos/mercadopago/confirmar', {
            payment_id: paymentId,
            external_reference: pagoId || params.get('external_reference') || '',
          });
          if (cancelled) return;
          setRecibo(res.data.recibo as Recibo);
          setHeadline(res.data.message || t('payReceiptApproved'));
          return;
        }

        if (pagoId && readToken()) {
          const res = await api.get(`/api/cadena/pagos/${pagoId}/recibo`);
          if (cancelled) return;
          setRecibo(res.data as Recibo);
          if ((res.data as Recibo).aprobado) {
            setHeadline(t('payReceiptApproved'));
          } else if (looksPending) {
            setHeadline(t('payReturnPending'));
          } else if (looksCancel) {
            setHeadline(t('payReturnCancel'));
          } else if (looksFail) {
            setHeadline(t('payReturnFail'));
          } else {
            setHeadline(t('payReceiptPending'));
          }
          return;
        }

        if (looksOk) setHeadline(t('payReturnOk'));
        else if (looksPending) setHeadline(t('payReturnPending'));
        else if (looksCancel) setHeadline(t('payReturnCancel'));
        else setHeadline(t('payReturnFail'));
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        if (!cancelled) {
          setError(axiosErr.response?.data?.message || t('payReceiptLoadError'));
          setHeadline(
            looksFail || looksCancel ? t('payReturnFail') : t('payReceiptLoadError')
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [outcome, pagoId, paymentId, collectionStatus, params, t]);

  const approved = Boolean(recibo?.aprobado);
  const pago = recibo?.pago;

  return (
    <section className="cadena-page">
      <p className="meta">
        <Link to="/cadena">← {t('chainTitle')}</Link>
      </p>
      <h1>{t('payReceiptTitle')}</h1>
      <p className="lead">{t('payReceiptLead')}</p>

      {loading && <p className="muted">{t('loading')}</p>}

      {!loading && (
        <article
          className={`cadena-card pay-receipt${approved ? ' is-ok' : ' is-warn'}`}
          data-reveal
        >
          <p className="label">
            {approved ? t('payReceiptStampOk') : t('payReceiptStamp')}
          </p>
          <h2>{headline}</h2>
          {error && <p className="error">{error}</p>}

          {pago && (
            <dl className="pay-receipt-grid">
              <div>
                <dt>{t('payReceiptFolio')}</dt>
                <dd>{recibo?.folio || pago._id}</dd>
              </div>
              <div>
                <dt>{t('payReceiptAmount')}</dt>
                <dd>
                  {pago.moneda || 'MXN'} $
                  {Number(pago.monto || 0).toLocaleString('es-MX')}
                </dd>
              </div>
              <div>
                <dt>{t('payReceiptPlan')}</dt>
                <dd>
                  {pago.plan || '—'}
                  {pago.slot ? ` · ${pago.slot}` : ''}
                </dd>
              </div>
              <div>
                <dt>{t('payReceiptStatus')}</dt>
                <dd>{pago.estatus || '—'}</dd>
              </div>
              <div>
                <dt>{t('payReceiptProvider')}</dt>
                <dd>{pago.provider || '—'}</dd>
              </div>
              <div>
                <dt>{t('payReceiptDate')}</dt>
                <dd>
                  {pago.pagado_en
                    ? new Date(pago.pagado_en).toLocaleString('es-MX')
                    : '—'}
                </dd>
              </div>
              {pago.dias ? (
                <div>
                  <dt>{t('payDays')}</dt>
                  <dd>{pago.dias}</dd>
                </div>
              ) : null}
              {pago.provider_ref ? (
                <div>
                  <dt>{t('payReceiptRef')}</dt>
                  <dd>{pago.provider_ref}</dd>
                </div>
              ) : null}
            </dl>
          )}

          <div className="pay-choices">
            <Link className="btn primary" to="/cadena">
              {t('payReceiptBack')}
            </Link>
          </div>
        </article>
      )}
    </section>
  );
}
