import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api, readToken, saveToken, setAuth } from '../api';
import VigenciaMap, { type VigenciaMapRow } from '../components/VigenciaMap';
import { useI18n } from '../lib/i18n';
import { uploadCreative } from '../lib/uploadCreative';
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

type Lugar = {
  calle: string;
  numero: string;
  colonia: string;
  municipio: string;
  estado: string;
  codigoPostal: string;
  lat: number;
  lng: number;
  etiqueta: string;
};

type AnuncioRow = {
  _id: string;
  titulo?: string;
  copy?: string;
  imagen_url?: string;
  video_url?: string;
  url_destino?: string;
  slot?: string;
  estatus?: string;
  impresiones?: number;
  clics?: number;
};

type SuscripcionRow = {
  _id?: string;
  plan?: string;
  estatus?: string;
  activo?: boolean;
  termina?: string | null;
  slots?: string[];
};

const PAY_SLOTS = [
  ['home_rail', 'chainAdSlotHome'],
  ['explorar_mid', 'chainAdSlotExplore'],
  ['cerca_top', 'chainAdSlotNear'],
  ['side_left', 'chainAdSlotSideLeft'],
  ['side_right', 'chainAdSlotSideRight'],
] as const;

export default function Cadena() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [token] = useState(() => readToken());
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
  const [sucNum, setSucNum] = useState('');
  const [sucCp, setSucCp] = useState('');
  const [sugerencias, setSugerencias] = useState<Lugar[]>([]);
  const [buscandoCalle, setBuscandoCalle] = useState(false);
  const [calleConsultada, setCalleConsultada] = useState('');
  const [lugar, setLugar] = useState<Lugar | null>(null);

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
  const [anuncios, setAnuncios] = useState<AnuncioRow[]>([]);
  const [puedePauta, setPuedePauta] = useState(false);
  const [suscripcion, setSuscripcion] = useState<SuscripcionRow | null>(null);
  const [adTitulo, setAdTitulo] = useState('');
  const [adCopy, setAdCopy] = useState('');
  const [adImagen, setAdImagen] = useState('');
  const [adVideo, setAdVideo] = useState('');
  const [adUrl, setAdUrl] = useState('');
  const [adSlot, setAdSlot] = useState('home_rail');
  const [paySlot, setPaySlot] = useState('cerca_top');
  const [adPosterFile, setAdPosterFile] = useState<File | null>(null);
  const [adVideoFile, setAdVideoFile] = useState<File | null>(null);
  const [adInicia, setAdInicia] = useState('');
  const [adTermina, setAdTermina] = useState('');
  const [adPosterPreview, setAdPosterPreview] = useState('');
  const [adVideoPreview, setAdVideoPreview] = useState('');
  const [creativeKey, setCreativeKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/cadena/me');
      setEmpresa(res.data.empresa || null);
      setPromos(res.data.promociones || []);
      setSucursales(res.data.sucursales || []);
      setAnuncios((res.data.anuncios || []) as AnuncioRow[]);
      setPuedePauta(Boolean(res.data.puedePauta));
      setSuscripcion((res.data.suscripcion || null) as SuscripcionRow | null);
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
        setAnuncios([]);
        setPuedePauta(false);
        setSuscripcion(null);
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

  useEffect(() => {
    const calle = sucCalle.trim();
    if (
      lugar &&
      lugar.calle === calle &&
      lugar.numero === sucNum.trim() &&
      lugar.codigoPostal === sucCp.trim()
    ) {
      return;
    }
    if (calle.length < 3) {
      const clear = setTimeout(() => setSugerencias([]), 0);
      return () => clearTimeout(clear);
    }
    const handle = setTimeout(() => {
      void (async () => {
        setBuscandoCalle(true);
        try {
          const res = await api.get('/api/cadena/direcciones', {
            params: {
              calle,
              numero: sucNum.trim(),
              cp: sucCp.trim(),
            },
          });
          setSugerencias((res.data.lugares || []) as Lugar[]);
          setCalleConsultada(calle);
        } catch {
          setSugerencias([]);
          setCalleConsultada(calle);
        } finally {
          setBuscandoCalle(false);
        }
      })();
    }, 450);
    return () => clearTimeout(handle);
  }, [sucCalle, sucNum, sucCp, lugar]);

  useEffect(() => {
    const pago = searchParams.get('pago');
    if (pago === 'ok') setInfo(t('payReturnOk'));
    else if (pago === 'pending') setInfo(t('payReturnPending'));
    else if (pago === 'cancel') setInfo(t('payReturnCancel'));
    else if (pago === 'fail') setError(t('payReturnFail'));
  }, [searchParams, t]);

  useEffect(() => {
    if (!adPosterFile) {
      setAdPosterPreview('');
      return;
    }
    const url = URL.createObjectURL(adPosterFile);
    setAdPosterPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [adPosterFile]);

  useEffect(() => {
    if (!adVideoFile) {
      setAdVideoPreview('');
      return;
    }
    const url = URL.createObjectURL(adVideoFile);
    setAdVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [adVideoFile]);

  useEffect(() => {
    const owned = suscripcion?.slots || [];
    if (!owned.includes(paySlot)) return;
    const next = PAY_SLOTS.find(([id]) => !owned.includes(id));
    if (next) setPaySlot(next[0]);
  }, [suscripcion, paySlot]);

  const filteredVigencia = useMemo(() => {
    if (mapFilter === 'all') return vigencia;
    return vigencia.filter((r) => r.crowdStatus === mapFilter);
  }, [vigencia, mapFilter]);

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
        saveToken(res.data.token);
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

  function elegirLugar(item: Lugar) {
    const next = {
      ...item,
      calle: item.calle || sucCalle.trim(),
      numero: item.numero || sucNum.trim(),
      codigoPostal: item.codigoPostal || sucCp.trim(),
    };
    setLugar(next);
    setSucCalle(next.calle);
    setSucNum(next.numero);
    setSucCp(next.codigoPostal);
    setSugerencias([]);
  }

  async function onCreateSucursal(e: FormEvent) {
    e.preventDefault();
    const elegido = lugar || (sugerencias.length === 1 ? sugerencias[0] : null);
    if (!elegido) {
      setError(t('chainBranchPick'));
      return;
    }
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await api.post('/api/cadena/sucursales', {
        nombre: sucNombre,
        calle: elegido.calle || sucCalle,
        num_ext: elegido.numero || sucNum,
        colonia: elegido.colonia,
        municipio: elegido.municipio,
        estado: elegido.estado,
        codigo_postal: elegido.codigoPostal || sucCp,
        lat: elegido.lat,
        lng: elegido.lng,
      });
      setInfo(t('chainBranchCreated'));
      setSucNombre('');
      setSucCalle('');
      setSucNum('');
      setSucCp('');
      setLugar(null);
      setSugerencias([]);
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

  async function onSolicitarPauta() {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api.post('/api/cadena/anuncios/suscripcion/solicitar', {
        plan: 'basic',
      });
      setInfo(res.data.message || t('chainAdsRequestOk'));
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('chainAdsError'));
    } finally {
      setBusy(false);
    }
  }

  async function onPagarPasarela(provider?: 'paypal' | 'mercadopago') {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api.post('/api/cadena/pagos/checkout', {
        plan: 'basic',
        sucursales: Math.max(1, sucursales.length),
        slot: paySlot,
        ...(provider ? { provider } : {}),
      });
      const url = String(res.data.checkout_url || '');
      if (url) {
        window.location.assign(url);
        return;
      }
      setInfo(res.data.message || t('payCheckoutOk'));
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('payCheckoutError'));
    } finally {
      setBusy(false);
    }
  }

  async function onCreateAnuncio(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      let imagen = adImagen.trim();
      let video = adVideo.trim();
      if (adPosterFile || adVideoFile) setInfo(t('chainAdUploading'));
      if (adPosterFile) {
        imagen = await uploadCreative(adPosterFile, async (body) => {
          const res = await api.post('/api/cadena/anuncios/medios', body);
          return res.data as { url?: string };
        });
      }
      if (adVideoFile) {
        video = await uploadCreative(adVideoFile, async (body) => {
          const res = await api.post('/api/cadena/anuncios/medios', body);
          return res.data as { url?: string };
        });
      }
      await api.post('/api/cadena/anuncios', {
        titulo: adTitulo,
        copy: adCopy,
        imagen_url: imagen,
        video_url: video,
        url_destino: adUrl,
        slot: adSlot,
        zonas: ['gdl'],
        inicia: adInicia || null,
        termina: adTermina || null,
      });
      setAdTitulo('');
      setAdCopy('');
      setAdImagen('');
      setAdVideo('');
      setAdUrl('');
      setAdSlot('home_rail');
      setAdPosterFile(null);
      setAdVideoFile(null);
      setCreativeKey((key) => key + 1);
      setAdInicia('');
      setAdTermina('');
      setInfo(t('chainAdSave'));
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        axiosErr.response?.data?.message || axiosErr.message || t('chainAdsError')
      );
    } finally {
      setBusy(false);
    }
  }

  async function onActivateAnuncio(id: string) {
    setBusy(true);
    setError('');
    try {
      await api.post(`/api/cadena/anuncios/${id}/activar`);
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('chainAdsError'));
    } finally {
      setBusy(false);
    }
  }

  async function onPauseAnuncio(id: string) {
    setBusy(true);
    setError('');
    try {
      await api.put(`/api/cadena/anuncios/${id}`, { estatus: 'pausado' });
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || t('chainAdsError'));
    } finally {
      setBusy(false);
    }
  }

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
        <article className="cadena-card">
          <h2>{t('bizRegisterTitle')}</h2>
          <p className="muted">{t('bizRegisterLead')}</p>
          <p className="meta">{t('chainNeedRole')}</p>
          <Link className="btn primary" to="/registro-empresa" viewTransition>
            {t('bizRegisterSubmit')}
          </Link>
          <form className="cadena-ad-form" onSubmit={onRegister}>
            <p className="muted">{t('chainRegisterTitle')}</p>
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
            <button className="btn ghost" type="submit" disabled={busy}>
              {t('chainRegisterCta')}
            </button>
          </form>
        </article>
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
            <p className="muted">{t('chainBranchHint')}</p>
            <div className="cadena-address">
              <label>
                {t('chainBranchStreet')}
                <input
                  value={sucCalle}
                  onChange={(e) => {
                    setSucCalle(e.target.value);
                    setLugar(null);
                  }}
                  required
                  autoComplete="off"
                  aria-autocomplete="list"
                />
              </label>
              {buscandoCalle ? <p className="meta">{t('chainBranchSearch')}</p> : null}
              {sugerencias.length > 0 ? (
                <ul className="cadena-suggest" role="listbox">
                  {sugerencias.map((item) => (
                    <li key={`${item.lat}-${item.lng}-${item.etiqueta}`}>
                      <button
                        type="button"
                        onClick={() => elegirLugar(item)}
                      >
                        <strong>
                          {[item.calle, item.numero].filter(Boolean).join(' ') ||
                            item.etiqueta}
                        </strong>
                        <span>
                          {[item.colonia, item.municipio, item.estado, item.codigoPostal]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="cadena-row">
              <label>
                {t('chainBranchNumber')}
                <input
                  value={sucNum}
                  onChange={(e) => {
                    setSucNum(e.target.value);
                    setLugar(null);
                  }}
                  inputMode="text"
                  autoComplete="off"
                />
              </label>
              <label>
                {t('chainBranchPostal')}
                <input
                  value={sucCp}
                  onChange={(e) => {
                    setSucCp(e.target.value.replace(/[^\d]/g, '').slice(0, 5));
                    setLugar(null);
                  }}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="44100"
                />
              </label>
            </div>
            <p className="cadena-place">
              {lugar
                ? [lugar.colonia, lugar.municipio, lugar.estado, lugar.codigoPostal]
                    .filter(Boolean)
                    .join(' · ')
                : sugerencias[0]
                  ? t('chainBranchMatch').replace(
                      '{place}',
                      [sugerencias[0].municipio, sugerencias[0].estado]
                        .filter(Boolean)
                        .join(', ')
                    )
                  : calleConsultada === sucCalle.trim() &&
                      sucCalle.trim().length >= 3 &&
                      !buscandoCalle
                    ? t('chainBranchNone')
                    : t('chainBranchMunicipio')}
            </p>
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
            <p className="muted">{t('chainPromoMediaNote')}</p>
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

          <article className="cadena-card">
            <h2>{t('chainAdsTitle')}</h2>
            <p className="muted">{t('chainAdsLead')}</p>
            <p className="meta">
              {puedePauta
                ? t('chainAdsActive')
                : suscripcion?.estatus === 'pending'
                  ? t('chainAdsPending')
                  : t('chainAdsNeedPlan')}
              {suscripcion?.plan ? ` · ${suscripcion.plan}` : ''}
            </p>
            {(suscripcion?.slots || []).length > 0 && (
              <p className="meta">
                {t('payOwned')}:{' '}
                {(suscripcion?.slots || [])
                  .map((id) => {
                    const row = PAY_SLOTS.find(([slot]) => slot === id);
                    return row ? t(row[1]) : id;
                  })
                  .join(' · ')}
              </p>
            )}
            {PAY_SLOTS.some(([id]) => !(suscripcion?.slots || []).includes(id)) ? (
              <>
                <label>
                  {puedePauta ? t('payAnotherSlot') : t('payCheckoutCta')}
                  <select
                    value={paySlot}
                    onChange={(e) => setPaySlot(e.target.value)}
                  >
                    {PAY_SLOTS.filter(
                      ([id]) => !(suscripcion?.slots || []).includes(id)
                    ).map(([id, label]) => (
                      <option key={id} value={id}>
                        {t(label)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="meta">
                  {puedePauta ? t('payExtraPrice') : t('payFirstPrice')}
                </p>
                <div className="cadena-row">
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={() => void onPagarPasarela()}
                  >
                    {t('payThisSlot')}
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={() => void onPagarPasarela('mercadopago')}
                  >
                    {t('payMpCta')}
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={() => void onPagarPasarela('paypal')}
                  >
                    {t('payPalCta')}
                  </button>
                </div>
                <p className="meta">{t('payGatewayHint')}</p>
                {!puedePauta && (
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={busy || suscripcion?.estatus === 'pending'}
                    onClick={() => void onSolicitarPauta()}
                  >
                    {t('chainAdsRequest')}
                  </button>
                )}
              </>
            ) : (
              <p className="meta">{t('payAllSlots')}</p>
            )}
            <form onSubmit={onCreateAnuncio} className="cadena-ad-form">
                <label>
                  {t('chainAdTitle')}
                  <input
                    value={adTitulo}
                    onChange={(e) => setAdTitulo(e.target.value)}
                    required
                  />
                </label>
                <label>
                  {t('chainAdCopy')}
                  <textarea
                    value={adCopy}
                    onChange={(e) => setAdCopy(e.target.value)}
                    rows={2}
                  />
                </label>
                <p className="muted">{t('chainAdFileHint')}</p>
                <label>
                  {t('chainAdVideo')}
                  <input
                    key={`video-${creativeKey}`}
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={(e) => setAdVideoFile(e.target.files?.[0] || null)}
                  />
                </label>
                {adVideoPreview ? (
                  <video className="cadena-creative" src={adVideoPreview} controls muted />
                ) : null}
                <label>
                  {t('chainAdImage')}
                  <input
                    key={`poster-${creativeKey}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setAdPosterFile(e.target.files?.[0] || null)}
                  />
                </label>
                {adPosterPreview ? (
                  <img className="cadena-creative" src={adPosterPreview} alt="" />
                ) : null}
                <p className="meta">{t('chainAdOrUrl')}</p>
                <label>
                  {t('chainAdImage')}
                  <input
                    value={adImagen}
                    onChange={(e) => setAdImagen(e.target.value)}
                    placeholder="https://"
                  />
                </label>
                <label>
                  {t('chainAdVideo')}
                  <input
                    value={adVideo}
                    onChange={(e) => setAdVideo(e.target.value)}
                    placeholder="https://…mp4"
                  />
                </label>
                <div className="cadena-row">
                  <label>
                    {t('chainAdStart')}
                    <input
                      type="date"
                      value={adInicia}
                      onChange={(e) => setAdInicia(e.target.value)}
                    />
                  </label>
                  <label>
                    {t('chainAdEnd')}
                    <input
                      type="date"
                      value={adTermina}
                      onChange={(e) => setAdTermina(e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  {t('chainAdUrl')}
                  <input
                    value={adUrl}
                    onChange={(e) => setAdUrl(e.target.value)}
                    placeholder="https://"
                  />
                </label>
                <label>
                  {t('chainAdSlot')}
                  <select
                    value={adSlot}
                    onChange={(e) => setAdSlot(e.target.value)}
                  >
                    <option value="home_rail">{t('chainAdSlotHome')}</option>
                    <option value="explorar_mid">{t('chainAdSlotExplore')}</option>
                    <option value="cerca_top">{t('chainAdSlotNear')}</option>
                    <option value="side_left">{t('chainAdSlotSideLeft')}</option>
                    <option value="side_right">{t('chainAdSlotSideRight')}</option>
                  </select>
                  <span className="meta">{t('chainAdSlotHint')}</span>
                </label>
                <button className="btn primary" type="submit" disabled={busy}>
                  {t('chainAdSave')}
                </button>
              </form>
            {anuncios.length === 0 ? (
              <p className="muted">{t('chainAdsEmpty')}</p>
            ) : (
              <ul className="cadena-list">
                {anuncios.map((a) => (
                  <li key={a._id}>
                    <strong>{a.titulo}</strong>
                    <span className="meta">
                      {a.estatus === 'activo'
                        ? t('chainAdLive')
                        : a.estatus === 'pausado'
                          ? t('chainAdPaused')
                          : t('chainAdDraft')}
                      {' · '}
                      {a.slot}
                      {' · '}
                      {t('chainAdStats')
                        .replace('{imp}', String(a.impresiones ?? 0))
                        .replace('{clk}', String(a.clics ?? 0))}
                    </span>
                    <div className="cadena-vigencia-actions">
                      {a.estatus !== 'activo' && puedePauta && (
                        <button
                          type="button"
                          className="btn primary"
                          disabled={busy}
                          onClick={() => void onActivateAnuncio(a._id)}
                        >
                          {t('chainAdActivate')}
                        </button>
                      )}
                      {a.estatus === 'activo' && puedePauta && (
                        <button
                          type="button"
                          className="btn ghost"
                          disabled={busy}
                          onClick={() => void onPauseAnuncio(a._id)}
                        >
                          {t('chainAdPause')}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="meta">{t('adLegalNote')}</p>
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
