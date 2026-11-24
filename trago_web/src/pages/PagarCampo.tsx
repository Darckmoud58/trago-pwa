import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useI18n } from '../lib/i18n';
import './Cadena.css';

const SLOT_LABEL: Record<string, 'chainAdSlotHome' | 'chainAdSlotExplore' | 'chainAdSlotNear' | 'chainAdSlotSideLeft' | 'chainAdSlotSideRight'> = {
  home_rail: 'chainAdSlotHome',
  explorar_mid: 'chainAdSlotExplore',
  cerca_top: 'chainAdSlotNear',
  side_left: 'chainAdSlotSideLeft',
  side_right: 'chainAdSlotSideRight',
};

type Quote = {
  slot?: string;
  monto?: number;
  moneda?: string;
  dias?: number;
  sucursales?: number;
  kind?: string;
};

export default function PagarCampo() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const slot = params.get('slot') || '';
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'mercadopago' | 'paypal' | ''>('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    setQuote(null);
    void api
      .get('/api/cadena/pagos/cotizar', { params: { plan: 'basic', slot } })
      .then((res) => {
        if (!cancelled) setQuote(res.data as Quote);
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        if (!cancelled) {
          setError(err.response?.data?.message || t('payCheckoutError'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slot, t]);

  async function pay(provider: 'mercadopago' | 'paypal') {
    setBusy(provider);
    setError('');
    try {
      const res = await api.post('/api/cadena/pagos/checkout', {
        plan: 'basic',
        slot,
        provider,
      });
      const url = String(res.data.checkout_url || '');
      if (url) {
        window.location.assign(url);
        return;
      }
      setError(t('payCheckoutError'));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('payCheckoutError'));
    } finally {
      setBusy('');
    }
  }

  const slotName = SLOT_LABEL[slot] ? t(SLOT_LABEL[slot]) : slot;

  return (
    <section className="cadena-page">
      <p className="meta">
        <Link to="/cadena">← {t('chainTitle')}</Link>
      </p>
      <h1>{t('payGateTitle')}</h1>
      <p className="lead">{t('payGateLead')}</p>

      {error && <p className="error">{error}</p>}

      {quote && (
        <article className="cadena-card">
          <p className="label">{t('payGateChoose')}</p>
          <h2>{slotName}</h2>
          <p className="meta">
            {quote.moneda || 'MXN'} $
            {Number(quote.monto || 0).toLocaleString('es-MX')}
            {quote.dias ? ` · ${quote.dias} ${t('payDays')}` : ''}
          </p>
          <div className="pay-choices">
            <button
              type="button"
              className="btn primary"
              disabled={Boolean(busy)}
              onClick={() => void pay('mercadopago')}
            >
              {busy === 'mercadopago' ? t('loading') : t('payMpCta')}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={Boolean(busy)}
              onClick={() => void pay('paypal')}
            >
              {busy === 'paypal' ? t('loading') : t('payPalCta')}
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
