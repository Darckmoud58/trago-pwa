import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useI18n } from '../lib/i18n';
import './ValidityVote.css';

const PRESENCE_MAX_M = 400;

type Crowd = 'vigente' | 'en_duda' | 'caduco' | 'fuera';

type Props = {
  promoId: string;
  ubicacionId: string;
  branchLat: number;
  branchLng: number;
  reportsVigente: number;
  reportsCaduco: number;
  crowdStatus: Crowd | string;
  officialActive?: boolean;
};

function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export default function ValidityVote({
  promoId,
  ubicacionId,
  branchLat,
  branchLng,
  reportsVigente,
  reportsCaduco,
  crowdStatus: initialCrowd,
}: Props) {
  const { t } = useI18n();
  const token = localStorage.getItem('token');
  const [vote, setVote] = useState<boolean | null>(null);
  const [yes, setYes] = useState(reportsVigente);
  const [no, setNo] = useState(reportsCaduco);
  const [crowd, setCrowd] = useState(initialCrowd || 'vigente');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get('/api/reportes', {
        params: { promoId, ubicacionId },
      })
      .then((res) => {
        if (typeof res.data.vote === 'boolean') setVote(res.data.vote);
      })
      .catch(() => {});
  }, [token, promoId, ubicacionId]);

  function requestGeo() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError(t('noGeo'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setGeo(null);
        setGeoError(t('voteGpsNeeded'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );
  }

  const meters =
    geo && Number.isFinite(branchLat) && Number.isFinite(branchLng)
      ? haversineM(geo, { lat: branchLat, lng: branchLng })
      : null;
  const near = meters != null && meters <= PRESENCE_MAX_M;

  async function report(stillValid: boolean) {
    if (!token || busy) return;
    if (!geo) {
      requestGeo();
      setError(t('voteGpsNeeded'));
      return;
    }
    if (!near) {
      setError(
        t('voteTooFar').replace(
          '{m}',
          String(meters != null ? Math.round(meters) : '—')
        )
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/api/reportes', {
        promoId,
        ubicacionId,
        stillValid,
        lat: geo.lat,
        lng: geo.lng,
      });
      setYes(res.data.reportsVigente ?? yes);
      setNo(res.data.reportsCaduco ?? no);
      setVote(res.data.mine);
      if (res.data.crowdStatus) setCrowd(res.data.crowdStatus);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message || t('voteFailed');
      setError(String(msg));
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    crowd === 'en_duda' || crowd === 'en-duda'
      ? t('crowdDoubt')
      : crowd === 'caduco'
        ? t('crowdExpired')
        : crowd === 'fuera'
          ? t('crowdOut')
          : t('crowdLive');

  return (
    <div className="validity-vote">
      <p className="validity-status">{statusLabel}</p>
      <p className="validity-counts">
        {t('voteCounts')
          .replace('{yes}', String(yes))
          .replace('{no}', String(no))}
      </p>
      <p className="validity-geo">
        {geo
          ? near
            ? t('voteNear').replace('{m}', String(Math.round(meters!)))
            : t('voteFarHint').replace(
                '{m}',
                String(meters != null ? Math.round(meters) : '—')
              )
          : t('voteGpsOff')}
      </p>
      {!token ? (
        <Link className="validity-login" to="/entrar">
          {t('voteNeedLogin')}
        </Link>
      ) : (
        <div className="validity-actions">
          {!geo && (
            <button
              type="button"
              className="btn ghost validity-gps-btn"
              onClick={requestGeo}
            >
              {t('useMyLocation')}
            </button>
          )}
          <button
            type="button"
            className={`btn ${vote === true ? 'primary' : 'ghost'}`}
            disabled={busy}
            onClick={() => void report(true)}
          >
            {t('voteYes')}
          </button>
          <button
            type="button"
            className={`btn ${vote === false ? 'primary' : 'ghost'}`}
            disabled={busy}
            onClick={() => void report(false)}
          >
            {t('voteNo')}
          </button>
        </div>
      )}
      {(error || geoError) && (
        <p className="validity-error">{error || geoError}</p>
      )}
      {(crowd === 'en_duda' ||
        crowd === 'en-duda' ||
        crowd === 'caduco') && (
        <p className="validity-geo">{t('voteModerationNote')}</p>
      )}
    </div>
  );
}
