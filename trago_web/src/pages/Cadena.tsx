import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, setAuth } from '../api';
import VigenciaMap, { type VigenciaMapRow } from '../components/VigenciaMap';
import { useI18n } from '../lib/i18n';
import './Cadena.css';

type Empresa = {
  _id: string;
  nombre?: string;
  name?: string;
  slug?: string;
  verificada?: boolean;
  verified?: boolean;
  plan?: string;
  descripcion?: string;
};

type PromoRow = {
  _id: string;
  nombre?: string;
  title?: string;
  estatus?: string;
  sucursalesAsignadas?: number;
  publicada?: boolean;
  alcohol?: boolean;
};

type SucursalRow = {
  _id: string;
  nombre?: string;
  name?: string;
  calle?: string;
  address?: string;
  lat?: number;
  long?: number;
};

export default function Cadena() {
  const { t } = useI18n();
  const [token] = useState(() => localStorage.getItem('token'));
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [sucursales, setSucursales] = useState<SucursalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const [regNombre, setRegNombre] = useState('');
  const [regDesc, setRegDesc] = useState('');

  const [sucNombre, setSucNombre] = useState('');
  const [sucCalle, setSucCalle] = useState('');
  const [sucLat, setSucLat] = useState('20.6767');
  const [sucLng, setSucLng] = useState('-103.347');

  const [promoNombre, setPromoNombre] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoAlcohol, setPromoAlcohol] = useState(false);
  const [promoUbis, setPromoUbis] = useState<string[]>([]);
  const [vigencia, setVigencia] = useState<VigenciaMapRow[]>([]);
  const [mapFilter, setMapFilter] = useState<'all' | string>('all');
  const [selectedVigencia, setSelectedVigencia] = useState<string | null>(null);
  const [metricas, setMetricas] = useState<{
    days: number;
    sessions: {
      gpsOk: number;
      promoOpen: number;
      sucursalVista: number;
      northStar: number;
    };
    funnel: { gpsToPromo: number; gpsToBranch: number; promoToBranch: number };
    definition?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/cadena/me');
      setEmpresa(res.data.empresa || null);
      setPromos(res.data.promociones || []);
      setSucursales(res.data.sucursales || []);
      if (res.data.empresa) {
        try {
          const vig = await api.get('/api/cadena/vigencia');
          setVigencia((vig.data.rows || []) as VigenciaMapRow[]);
        } catch {
          setVigencia([]);
        }
        try {
          const met = await api.get('/api/metricas/cadena', {
            params: { days: 7 },
          });
          setMetricas(met.data);
        } catch {
          setMetricas(null);
        }
      } else {
        setVigencia([]);
        setMetricas(null);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 403) {
        setError(t('chainNeedRole'));
      } else {
        setError(axiosErr.response?.data?.message || t('chainLoadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!token) return;
    setAuth(token);
    void load();
  }, [token, load]);

  if (!token) {
    return <Navigate to="/entrar" replace />;
  }

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api.post('/api/cadena/registro', {
        nombre: regNombre,
        descripcion: regDesc,
      });
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        setAuth(res.data.token);
      }
      setInfo(res.data.message || t('chainRegistered'));
      setRegNombre('');
      setRegDesc('');
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('chainRegisterError'));
    } finally {
      setBusy(false);
    }
  }

  async function onCreateSucursal(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await api.post('/api/cadena/sucursales', {
        nombre: sucNombre,
        calle: sucCalle,
        lat: Number(sucLat),
        lng: Number(sucLng),
      });
      setInfo(t('chainBranchCreated'));
      setSucNombre('');
      setSucCalle('');
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('chainBranchError'));
    } finally {
      setBusy(false);
    }
  }

  async function onCreatePromo(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api.post('/api/cadena/promociones', {
        nombre: promoNombre,
        descripcion: promoDesc,
        alcohol: promoAlcohol,
        ubicacionIds: promoUbis,
      });
      setInfo(res.data.message || t('chainPromoCreated'));
      setPromoNombre('');
      setPromoDesc('');
      setPromoAlcohol(false);
      setPromoUbis([]);
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('chainPromoError'));
    } finally {
      setBusy(false);
    }
  }

  function toggleUbi(id: string) {
    setPromoUbis((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function reafirmar(promoId: string, ubicacionId: string) {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api.post('/api/cadena/vigencia/reafirmar', {
        promoId,
        ubicacionId,
      });
      setInfo(res.data.message || t('chainReaffirmOk'));
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('chainReaffirmError'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleParticipacion(
    promoId: string,
    ubicacionId: string,
    activaOficial: boolean
  ) {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api.post('/api/cadena/vigencia/participacion', {
        promoId,
        ubicacionId,
        activaOficial,
      });
      setInfo(res.data.message || t('chainParticipationOk'));
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('chainParticipationError'));
    } finally {
      setBusy(false);
    }
  }

  const verified = Boolean(empresa?.verificada || empresa?.verified);

  const filteredVigencia = useMemo(() => {
    if (mapFilter === 'all') return vigencia;
    return vigencia.filter((r) => r.crowdStatus === mapFilter);
  }, [vigencia, mapFilter]);

  function crowdLabel(status: string) {
    if (status === 'en_duda' || status === 'en-duda') return t('crowdDoubt');
    if (status === 'caduco') return t('crowdExpired');
    if (status === 'fuera') return t('crowdOut');
    return t('crowdLive');
  }

  function vigenciaKey(row: VigenciaMapRow) {
    return `${row.promoId}-${row.ubicacionId}`;
  }

  return (
    <section className="cadena-page">
      <p className="meta">
        <Link to="/cuenta">← {t('titleAccount')}</Link>
      </p>
      <h1>{t('chainTitle')}</h1>
      <p className="lead">{t('chainLead')}</p>

      {loading && <p className="muted">{t('loading')}</p>}
      {error && <p className="error">{error}</p>}
      {info && <p className="cadena-info">{info}</p>}

      {!loading && !empresa && (
        <form className="cadena-card" onSubmit={onRegister}>
          <h2>{t('chainRegisterTitle')}</h2>
          <label>
            {t('chainName')}
            <input
              value={regNombre}
              onChange={(e) => setRegNombre(e.target.value)}
              required
            />
          </label>
          <label>
            {t('chainDesc')}
            <textarea
              value={regDesc}
              onChange={(e) => setRegDesc(e.target.value)}
              rows={3}
            />
          </label>
          <button className="btn primary" type="submit" disabled={busy}>
            {t('chainRegisterCta')}
          </button>
        </form>
      )}

      {empresa && (
        <>
          <article className="cadena-card">
            <p className="label">{t('chainYourBusiness')}</p>
            <h2>{empresa.nombre || empresa.name}</h2>
            <p className="meta">
              {verified ? t('chainVerified') : t('chainPendingVerify')}
              {empresa.plan ? ` · ${empresa.plan}` : ''}
            </p>
            {empresa.descripcion && <p>{empresa.descripcion}</p>}
          </article>

          <form className="cadena-card" onSubmit={onCreateSucursal}>
            <h2>{t('chainAddBranch')}</h2>
            <label>
              {t('chainBranchName')}
              <input
                value={sucNombre}
                onChange={(e) => setSucNombre(e.target.value)}
                required
              />
            </label>
            <label>
              {t('chainBranchStreet')}
              <input
                value={sucCalle}
                onChange={(e) => setSucCalle(e.target.value)}
                required
              />
            </label>
            <div className="cadena-row">
              <label>
                Lat
                <input
                  value={sucLat}
                  onChange={(e) => setSucLat(e.target.value)}
                  required
                />
              </label>
              <label>
                Lng
                <input
                  value={sucLng}
                  onChange={(e) => setSucLng(e.target.value)}
                  required
                />
              </label>
            </div>
            <button className="btn primary" type="submit" disabled={busy}>
              {t('chainSaveBranch')}
            </button>
          </form>

          <form className="cadena-card" onSubmit={onCreatePromo}>
            <h2>{t('chainAddPromo')}</h2>
            <label>
              {t('chainPromoName')}
              <input
                value={promoNombre}
                onChange={(e) => setPromoNombre(e.target.value)}
                required
              />
            </label>
            <label>
              {t('chainPromoDesc')}
              <textarea
                value={promoDesc}
                onChange={(e) => setPromoDesc(e.target.value)}
                rows={3}
              />
            </label>
            <label className="cadena-check">
              <input
                type="checkbox"
                checked={promoAlcohol}
                onChange={(e) => setPromoAlcohol(e.target.checked)}
              />
              {t('chainPromoAlcohol')}
            </label>
            <fieldset className="cadena-branches">
              <legend>{t('chainPickBranches')}</legend>
              {sucursales.length === 0 ? (
                <p className="muted">{t('chainNoBranchesYet')}</p>
              ) : (
                sucursales.map((s) => (
                  <label key={s._id} className="cadena-check">
                    <input
                      type="checkbox"
                      checked={promoUbis.includes(s._id)}
                      onChange={() => toggleUbi(s._id)}
                    />
                    {s.nombre || s.name || s.calle}
                  </label>
                ))
              )}
            </fieldset>
            <p className="muted">{t('chainPublishHint')}</p>
            <button className="btn primary" type="submit" disabled={busy}>
              {t('chainSavePromo')}
            </button>
          </form>

          <article className="cadena-card">
            <h2>{t('chainBranchesList')}</h2>
            {sucursales.length === 0 ? (
              <p className="muted">{t('chainNoBranchesYet')}</p>
            ) : (
              <ul className="cadena-list">
                {sucursales.map((s) => (
                  <li key={s._id}>
                    <strong>{s.nombre || s.name}</strong>
                    <span className="meta">{s.address || s.calle}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="cadena-card">
            <h2>{t('chainPromosList')}</h2>
            {promos.length === 0 ? (
              <p className="muted">{t('chainNoPromosYet')}</p>
            ) : (
              <ul className="cadena-list">
                {promos.map((p) => (
                  <li key={p._id}>
                    <strong>{p.nombre || p.title}</strong>
                    <span className="meta">
                      {p.publicada
                        ? t('chainPublished')
                        : p.estatus === 'inactivo'
                          ? t('chainDraft')
                          : t('chainNotPublic')}
                      {' · '}
                      {(p.sucursalesAsignadas ?? 0) > 0
                        ? t('chainBranchCount').replace(
                            '{n}',
                            String(p.sucursalesAsignadas)
                          )
                        : t('chainNoBranchesAssigned')}
                      {p.alcohol ? ' · 18+' : ''}
                    </span>
                    {p.publicada && (
                      <Link className="text-link" to={`/promos/${p._id}`}>
                        {t('seeOfferDetails')}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>

          {metricas && (
            <article className="cadena-card">
              <h2>{t('metricsTitle')}</h2>
              <p className="muted">{t('metricsLead')}</p>
              <div className="cadena-metrics">
                <div>
                  <p className="label">{t('metricsNorthStar')}</p>
                  <p className="cadena-metric-value">
                    {metricas.sessions.northStar}
                  </p>
                </div>
                <div>
                  <p className="label">GPS</p>
                  <p className="cadena-metric-value">
                    {metricas.sessions.gpsOk}
                  </p>
                </div>
                <div>
                  <p className="label">{t('metricsPromoOpen')}</p>
                  <p className="cadena-metric-value">
                    {metricas.sessions.promoOpen}
                  </p>
                </div>
                <div>
                  <p className="label">{t('metricsBranchView')}</p>
                  <p className="cadena-metric-value">
                    {metricas.sessions.sucursalVista}
                  </p>
                </div>
              </div>
              <p className="meta">
                {t('metricsFunnel')
                  .replace('{a}', String(metricas.funnel.gpsToPromo))
                  .replace('{b}', String(metricas.funnel.gpsToBranch))}
                {' · '}
                {t('metricsDays').replace('{n}', String(metricas.days))}
              </p>
            </article>
          )}

          <article className="cadena-card">
            <h2>{t('chainVigenciaTitle')}</h2>
            <p className="muted">{t('chainVigenciaLead')}</p>
            {vigencia.length === 0 ? (
              <p className="muted">{t('chainVigenciaEmpty')}</p>
            ) : (
              <>
                <div className="cadena-status-chips" role="toolbar" aria-label={t('mapFilterAria')}>
                  {(
                    [
                      ['all', t('mapFilterAll')],
                      ['en_duda', t('statusEnDuda')],
                      ['caduco', t('statusCaduco')],
                      ['vigente', t('statusVigente')],
                      ['fuera', t('statusFuera')],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={mapFilter === id ? 'is-active' : ''}
                      onClick={() => setMapFilter(id)}
                    >
                      {label}
                      {id !== 'all'
                        ? ` (${vigencia.filter((r) => r.crowdStatus === id).length})`
                        : ` (${vigencia.length})`}
                    </button>
                  ))}
                </div>

                <VigenciaMap
                  rows={filteredVigencia}
                  selectedKey={selectedVigencia}
                  onSelect={(row) => setSelectedVigencia(vigenciaKey(row))}
                />

                <ul className="cadena-list">
                  {filteredVigencia.map((row) => {
                    const key = vigenciaKey(row);
                    return (
                      <li
                        key={key}
                        className={
                          selectedVigencia === key ? 'is-map-selected' : undefined
                        }
                        onClick={() => setSelectedVigencia(key)}
                      >
                        <strong>
                          {row.promoNombre} · {row.sucursalNombre}
                        </strong>
                        <span className="meta">
                          {crowdLabel(row.crowdStatus)}
                          {' · '}
                          {t('voteCounts')
                            .replace('{yes}', String(row.reportsVigente))
                            .replace('{no}', String(row.reportsCaduco))}
                          {!row.activaOficial ? ` · ${t('chainPaused')}` : ''}
                          {row.reafirmadoEn
                            ? ` · ${t('chainReaffirmed')}`
                            : ''}
                        </span>
                        <div className="cadena-vigencia-actions">
                          <button
                            type="button"
                            className="btn primary"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              void reafirmar(row.promoId, row.ubicacionId);
                            }}
                          >
                            {t('chainReaffirm')}
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleParticipacion(
                                row.promoId,
                                row.ubicacionId,
                                !row.activaOficial
                              );
                            }}
                          >
                            {row.activaOficial
                              ? t('chainPauseBranch')
                              : t('chainResumeBranch')}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </article>
        </>
      )}
    </section>
  );
}
