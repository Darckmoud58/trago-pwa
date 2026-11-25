import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api, readToken, setAuth } from '../api';
import AdPlacementPreview from '../components/AdPlacementPreview';
import { resolveMediaUrl } from '../lib/mediaUrl';
import VigenciaMap, { type VigenciaMapRow } from '../components/VigenciaMap';
import { useI18n, type MessageKey } from '../lib/i18n';
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
  ventana?: string;
  posicion?: string;
  estatus?: string;
  inicia?: string | null;
  termina?: string | null;
  impresiones?: number;
  clics?: number;
};

const MAX_AD_DRAFTS = 10;

type SuscripcionRow = {
  _id?: string;
  plan?: string;
  estatus?: string;
  activo?: boolean;
  termina?: string | null;
  slots?: string[];
  ventanas?: string[];
  posiciones?: string[];
};

const WINDOWS = [
  ['inicio', 'chainAdSlotHome'],
  ['explorar', 'chainAdSlotExplore'],
] as const;

const POSITIONS = {
  inicio: [
    ['aleatoria', 'adPosRandom'],
    ['home_rail', 'adPosHomeCard'],
    ['inicio_side_left', 'adPosSideLeft'],
    ['inicio_side_right', 'adPosSideRight'],
  ],
  explorar: [
    ['aleatoria', 'adPosRandom'],
    ['explorar_mid', 'adPosExploreTop'],
    ['explorar_side_left', 'adPosSideLeft'],
    ['explorar_side_right', 'adPosSideRight'],
  ],
} as const;

function placementName(
  ad: { ventana?: string; posicion?: string; slot?: string },
  t: (key: MessageKey) => string
) {
  const isExplore = ad.ventana === 'explorar' ||
    (!ad.ventana && ad.slot?.startsWith('explorar_'));
  const ventana = isExplore ? 'explorar' : 'inicio';
  const posicion =
    ad.posicion || (ad.slot && ad.slot !== 'aleatoria' ? ad.slot : 'aleatoria');
  const row = (POSITIONS[ventana] || POSITIONS.inicio).find(([id]) => id === posicion);
  const windowLabel = t(ventana === 'explorar' ? 'chainAdSlotExplore' : 'chainAdSlotHome');
  return `${windowLabel} · ${row ? t(row[1]) : t('adPosRandom')}`;
}

function vigenciaKey(row: VigenciaMapRow) {
  return `${row.promoId}-${row.ubicacionId}`;
}

function adStatus(ad: AnuncioRow, puedePauta: boolean, now: number): MessageKey {
  if (
    ad.estatus === 'vencido' ||
    (ad.estatus === 'activo' && ad.termina && Date.parse(ad.termina) < now)
  ) {
    return 'chainAdExpired';
  }
  if (ad.estatus === 'pausado') return 'chainAdPaused';
  if (ad.estatus !== 'activo') return 'chainAdDraft';
  if (!puedePauta) return 'chainAdInactivePlan';
  if (ad.inicia && Date.parse(ad.inicia) > now) return 'chainAdScheduled';
  return 'chainAdLive';
}

export default function Cadena() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token] = useState(() => readToken());
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [sucursales, setSucursales] = useState<SucursalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

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
  const [adsError, setAdsError] = useState('');
  const [adsInfo, setAdsInfo] = useState('');
  const [publishedAdId, setPublishedAdId] = useState<string | null>(null);
  const adsAlertRef = useRef<HTMLDivElement | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const draftTitleRef = useRef<HTMLInputElement>(null);
  const [adTitulo, setAdTitulo] = useState('');
  const [adCopy, setAdCopy] = useState('');
  const [adImagen, setAdImagen] = useState('');
  const [adVideo, setAdVideo] = useState('');
  const [adUrl, setAdUrl] = useState('');
  const [adVentana, setAdVentana] = useState<'inicio' | 'explorar'>('inicio');
  const [adPosicion, setAdPosicion] = useState('aleatoria');
  const [paySlot, setPaySlot] = useState('inicio');
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
    if (!pago) return;
    // Enlaces viejos de la pasarela → pantalla con recibo
    if (['ok', 'pending', 'cancel', 'fail'].includes(pago)) {
      navigate(`/cadena/pago-resultado?status=${encodeURIComponent(pago)}`, {
        replace: true,
      });
    }
  }, [searchParams, navigate]);

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
    const owned = suscripcion?.ventanas || [];
    if (!owned.includes(paySlot)) return;
    const next = WINDOWS.find(([id]) => !owned.includes(id));
    if (next) setPaySlot(next[0]);
  }, [suscripcion, paySlot]);

  useEffect(() => {
    const options = POSITIONS[adVentana];
    if (options.some(([id]) => id === adPosicion)) return;
    setAdPosicion('aleatoria');
  }, [adVentana, adPosicion]);

  const filteredVigencia = useMemo(() => {
    if (mapFilter === 'all') return vigencia;
    return vigencia.filter((r) => r.crowdStatus === mapFilter);
  }, [vigencia, mapFilter]);

  const now = Date.now();
  const adRows = anuncios.map((ad) => ({ ad, status: adStatus(ad, puedePauta, now) }));
  const adGroups = [
    {
      heading: 'chainAdsLiveTitle',
      empty: 'chainAdsLiveEmpty',
      rows: adRows.filter(({ status }) => status === 'chainAdLive'),
    },
    {
      heading: 'chainAdsOtherTitle',
      empty: 'chainAdsOtherEmpty',
      rows: adRows.filter(({ status }) => status !== 'chainAdLive'),
    },
  ] as const;

  const draftCount = useMemo(
    () => anuncios.filter((a) => a.estatus === 'borrador').length,
    [anuncios]
  );

  if (!token) {
    return <Navigate to="/entrar" replace />;
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

  function canPublishPlacement() {
    const vents = suscripcion?.ventanas || [];
    if (!puedePauta || !vents.includes(adVentana)) return false;
    if (adPosicion === 'aleatoria') return true;
    return (suscripcion?.posiciones || []).includes(adPosicion);
  }

  function flashAdsAlert(kind: 'error' | 'info', message: string) {
    if (kind === 'error') {
      setAdsError(message);
      setAdsInfo('');
      setError(message);
    } else {
      setAdsInfo(message);
      setAdsError('');
      setInfo(message);
    }
    requestAnimationFrame(() => {
      adsAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function resetAdForm() {
    setEditingDraftId(null);
    setAdTitulo('');
    setAdCopy('');
    setAdImagen('');
    setAdVideo('');
    setAdUrl('');
    setAdPosicion('aleatoria');
    setAdPosterFile(null);
    setAdVideoFile(null);
    setCreativeKey((key) => key + 1);
    setAdInicia('');
    setAdTermina('');
  }

  function editDraft(ad: AnuncioRow, reuse = false) {
    resetAdForm();
    const target = ad.ventana === 'explorar' ||
      (!ad.ventana && ad.slot?.startsWith('explorar_')) ? 'explorar' : 'inicio';
    if (!reuse) setEditingDraftId(ad._id);
    setAdTitulo(ad.titulo ?? '');
    setAdCopy(ad.copy ?? '');
    setAdImagen(ad.imagen_url ?? '');
    setAdVideo(ad.video_url ?? '');
    setAdUrl(ad.url_destino ?? '');
    setAdVentana(target);
    setAdPosicion(ad.posicion || ad.slot || 'aleatoria');
    if (!reuse) {
      const dateInput = (date?: string | null) => {
        if (!date) return '';
        // Las fechas anteriores se guardaban a medianoche UTC desde el calendario.
        if (date.endsWith('T00:00:00.000Z')) return date.slice(0, 10);
        const parts = new Intl.DateTimeFormat('en', {
          timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(new Date(date));
        return ['year', 'month', 'day'].map((kind) => parts.find((part) => part.type === kind)?.value).join('-');
      };
      setAdInicia(dateInput(ad.inicia));
      setAdTermina(dateInput(ad.termina));
    }
    requestAnimationFrame(() => draftTitleRef.current?.focus());
  }

  async function deleteDraft(ad: AnuncioRow) {
    if (!window.confirm(t('chainAdDeleteConfirm').replace('{title}', ad.titulo ?? ''))) return;
    setBusy(true);
    try {
      await api.delete(`/api/cadena/anuncios/${ad._id}`);
      if (editingDraftId === ad._id) resetAdForm();
      setAnuncios((rows) => rows.filter((row) => row._id !== ad._id));
      flashAdsAlert('info', t('chainAdDeleted'));
    } catch (err: unknown) {
      const failure = err as { response?: { data?: { message?: string } } };
      flashAdsAlert('error', failure.response?.data?.message || t('chainAdsError'));
    } finally {
      setBusy(false);
    }
  }

  async function submitAnuncio(mode: 'borrador' | 'publicar') {
    setBusy(true);
    setAdsError('');
    setAdsInfo('');
    setError('');
    setInfo('');
    try {
      if (!adTitulo.trim()) {
        flashAdsAlert('error', t('chainAdTitleRequired'));
        return;
      }
      if (mode === 'borrador' && !editingDraftId && draftCount >= MAX_AD_DRAFTS) {
        flashAdsAlert(
          'error',
          t('chainAdDraftLimit').replace('{max}', String(MAX_AD_DRAFTS))
        );
        return;
      }
      if (mode === 'publicar') {
        if (!puedePauta) {
          flashAdsAlert('error', t('chainAdPublishNeedPauta'));
          return;
        }
        if (!(suscripcion?.ventanas || []).includes(adVentana)) {
          flashAdsAlert('error', t('chainAdPublishNeedWindow'));
          return;
        }
        if (
          adPosicion !== 'aleatoria' &&
          !(suscripcion?.posiciones || []).includes(adPosicion)
        ) {
          flashAdsAlert('error', t('chainAdPublishNeedPosition'));
          return;
        }
      }

      let imagen = adImagen.trim();
      let video = adVideo.trim();
      if (adPosterFile || adVideoFile) {
        flashAdsAlert('info', t('chainAdUploading'));
      }
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
      const payload = {
        titulo: adTitulo,
        copy: adCopy,
        imagen_url: imagen,
        video_url: video,
        url_destino: adUrl,
        slot: adPosicion,
        ventana: adVentana,
        posicion: adPosicion,
        zonas: ['gdl'],
        inicia: adInicia || null,
        termina: adTermina || null,
        publicar: mode === 'publicar',
      };
      const res = editingDraftId
        ? await api.put<{ anuncio?: AnuncioRow }>(`/api/cadena/anuncios/${editingDraftId}`, {
            ...payload,
            soloBorrador: true,
          })
        : await api.post<{ anuncio?: AnuncioRow }>('/api/cadena/anuncios', payload);
      setPublishedAdId(mode === 'publicar' ? res.data.anuncio?._id ?? null : null);
      resetAdForm();
      flashAdsAlert(
        'info',
        mode === 'publicar' ? t('chainAdPublishOk') : t(editingDraftId ? 'chainAdDraftUpdated' : 'chainAdDraftOk')
      );
      await load();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      flashAdsAlert(
        'error',
        axiosErr.response?.data?.message ||
          axiosErr.message ||
          t('chainAdsError')
      );
    } finally {
      setBusy(false);
    }
  }

  async function onCreateAnuncio(e: FormEvent) {
    e.preventDefault();
    await submitAnuncio('borrador');
  }

  async function onActivateAnuncio(id: string) {
    setBusy(true);
    setAdsError('');
    setAdsInfo('');
    setError('');
    try {
      await api.post(`/api/cadena/anuncios/${id}/activar`);
      setPublishedAdId(id);
      flashAdsAlert('info', t('chainAdPublishOk'));
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      flashAdsAlert(
        'error',
        axiosErr.response?.data?.message || t('chainAdsError')
      );
    } finally {
      setBusy(false);
    }
  }

  async function onPauseAnuncio(id: string) {
    setBusy(true);
    setAdsError('');
    setAdsInfo('');
    setError('');
    try {
      await api.put(`/api/cadena/anuncios/${id}`, { estatus: 'pausado' });
      flashAdsAlert('info', t('chainAdPausedOk'));
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      flashAdsAlert(
        'error',
        axiosErr.response?.data?.message || t('chainAdsError')
      );
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

  const selectVigenciaPin = useCallback((row: VigenciaMapRow) => {
    setSelectedVigencia(vigenciaKey(row));
  }, []);

  function showVigenciaOnMap(row: VigenciaMapRow) {
    selectVigenciaPin(row);
    document.getElementById('cadena-mapa-vigencia')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'center',
    });
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
          <h2>{t('chainUsersDontRegister')}</h2>
          <p className="muted">{t('chainUsersDontRegisterLead')}</p>
          <Link className="btn ghost" to="/cuenta" viewTransition>
            {t('titleAccount')}
          </Link>
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
            {(suscripcion?.ventanas || []).length > 0 && (
              <p className="meta">
                {t('payOwned')}:{' '}
                {(suscripcion?.ventanas || [])
                  .map((id) =>
                    t(id === 'explorar' ? 'chainAdSlotExplore' : 'chainAdSlotHome')
                  )
                  .join(' · ')}
              </p>
            )}
            {WINDOWS.some(([id]) => !(suscripcion?.ventanas || []).includes(id)) ? (
              <>
                <label>
                  {puedePauta ? t('payAnotherSlot') : t('payCheckoutCta')}
                  <select
                    value={paySlot}
                    onChange={(e) => setPaySlot(e.target.value)}
                  >
                    {WINDOWS.filter(
                      ([id]) => !(suscripcion?.ventanas || []).includes(id)
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
                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    navigate(
                      `/cadena/pagar?slot=${encodeURIComponent(paySlot)}&kind=ventana`
                    )
                  }
                >
                  {t('payCheckoutCta')}
                </button>
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
            <div ref={adsAlertRef}>
              {adsError ? <p className="error" role="alert">{adsError}</p> : null}
              {adsInfo ? <p className="cadena-info" role="status">{adsInfo}</p> : null}
            </div>
            {adGroups.map(({ heading, empty, rows }) => (
              <section key={heading} className="cadena-ad-group" aria-label={t(heading)}>
                <h3>{t(heading)}</h3>
                {rows.length === 0 ? (
                  <p className="muted">{t(empty)}</p>
                ) : (
                  <ul className="cadena-list">
                    {rows.map(({ ad: a, status }) => (
                      <li
                        key={a._id}
                        className={a._id === publishedAdId ? 'cadena-ad-published' : undefined}
                        onAnimationEnd={() => setPublishedAdId((id) => id === a._id ? null : id)}
                      >
                        <div className="cadena-ad-heading">
                          <strong>{a.titulo}</strong>
                          <span className="cadena-ad-status" data-active={status === 'chainAdLive'}>
                            {t(status)}
                          </span>
                        </div>
                        <span className="meta">
                          {placementName(a, t)}
                          {' · '}
                          {t('chainAdStats')
                            .replace('{imp}', String(a.impresiones ?? 0))
                            .replace('{clk}', String(a.clics ?? 0))}
                        </span>
                        {(a.posicion || a.slot)?.includes('side_') ? (
                          <p className="meta">{t('chainAdDesktopOnly')}</p>
                        ) : null}
                        {status === 'chainAdExpired' && a.termina && (
                          <p className="meta">
                            {t('chainAdEnd')} · {new Date(a.termina).toLocaleString(locale, { timeZone: 'America/Mexico_City' })}
                          </p>
                        )}
                        {status === 'chainAdScheduled' && a.inicia ? (
                          <p className="meta">
                            {t('chainAdStart')} · {new Date(a.inicia).toLocaleString(locale, { timeZone: 'America/Mexico_City' })}
                          </p>
                        ) : null}
                        <div className="cadena-vigencia-actions">
                          {(status === 'chainAdDraft' || status === 'chainAdPaused') && editingDraftId !== a._id && (
                            <button
                              type="button"
                              className="btn primary"
                              disabled={busy}
                              onClick={() => void onActivateAnuncio(a._id)}
                            >
                              {t('chainAdPublish')}
                            </button>
                          )}
                          {status === 'chainAdDraft' && (
                            <>
                              <button type="button" className="btn ghost" disabled={busy} onClick={() => editDraft(a)}>
                                {t('chainAdEditDraft')}
                              </button>
                              <button type="button" className="btn ghost" disabled={busy} onClick={() => void deleteDraft(a)}>
                                {t('chainAdDeleteDraft')}
                              </button>
                            </>
                          )}
                          {status === 'chainAdExpired' && (
                            <button type="button" className="btn ghost" disabled={busy} onClick={() => editDraft(a, true)}>
                              {t('chainAdReuse')}
                            </button>
                          )}
                          {a.estatus === 'activo' && status !== 'chainAdExpired' && (
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
              </section>
            ))}
            <form onSubmit={onCreateAnuncio} className="cadena-ad-form">
                <p className="muted">{t(editingDraftId ? 'chainAdEditHint' : 'chainAdDraftHint')}</p>
                <p className="meta">
                  {t('chainAdDraftCount')
                    .replace('{n}', String(draftCount))
                    .replace('{max}', String(MAX_AD_DRAFTS))}
                </p>
                <label>
                  {t('chainAdTitle')}
                  <input
                    ref={draftTitleRef}
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
                <label>
                  {t('chainAdImage')}
                  <input
                    key={`poster-${creativeKey}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setAdPosterFile(e.target.files?.[0] || null)}
                  />
                </label>
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
                  {t('adWindow')}
                  <select
                    value={adVentana}
                    onChange={(e) =>
                      setAdVentana(e.target.value === 'explorar' ? 'explorar' : 'inicio')
                    }
                  >
                    {WINDOWS.map(([id, label]) => (
                      <option key={id} value={id}>
                        {t(label)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('adPosition')}
                  <select
                    value={adPosicion}
                    onChange={(e) => setAdPosicion(e.target.value)}
                  >
                    {POSITIONS[adVentana].map(([id, label]) => (
                      <option key={id} value={id}>
                        {t(label)}
                      </option>
                    ))}
                  </select>
                  <span className="meta">{t('adPosHint')}</span>
                </label>
                <AdPlacementPreview
                  window={adVentana}
                  position={adPosicion}
                  title={adTitulo}
                  copy={adCopy}
                  image={adPosterPreview || resolveMediaUrl(adImagen)}
                  video={adVideoPreview || resolveMediaUrl(adVideo)}
                />
                {adPosicion !== 'aleatoria' &&
                  !(suscripcion?.posiciones || []).includes(adPosicion) && (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() =>
                        navigate(
                          `/cadena/pagar?slot=${encodeURIComponent(adPosicion)}&kind=posicion`
                        )
                      }
                    >
                      {t('payPositionCta')}
                    </button>
                  )}
                {!canPublishPlacement() && (
                  <p className="meta">{t('chainAdPublishHint')}</p>
                )}
                <p className="meta">{t('chainAdServingHint')}</p>
                <div className="cadena-row">
                  <button
                    className="btn ghost"
                    type="submit"
                    disabled={busy || (!editingDraftId && draftCount >= MAX_AD_DRAFTS)}
                  >
                    {busy ? t('loading') : t(editingDraftId ? 'chainAdSaveChanges' : 'chainAdSave')}
                  </button>
                  {editingDraftId ? (
                    <button type="button" className="btn ghost" disabled={busy} onClick={resetAdForm}>
                      {t('chainAdCancelEdit')}
                    </button>
                  ) : (
                    <button
                      className="btn primary"
                      type="button"
                      disabled={busy}
                      onClick={() => void submitAnuncio('publicar')}
                    >
                      {busy ? t('loading') : t('chainAdPublish')}
                    </button>
                  )}
                </div>
              </form>
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
            <p className="meta">{t('chainVigenciaMapHint')}</p>
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
                      aria-pressed={mapFilter === id}
                      onClick={() => {
                        setMapFilter(id);
                        setSelectedVigencia(null);
                      }}
                    >
                      {label}
                      {id !== 'all'
                        ? ` (${vigencia.filter((r) => r.crowdStatus === id).length})`
                        : ` (${vigencia.length})`}
                    </button>
                  ))}
                </div>

                <div id="cadena-mapa-vigencia">
                  <VigenciaMap
                    rows={filteredVigencia}
                    selectedKey={selectedVigencia}
                    onSelect={selectVigenciaPin}
                    onClear={() => setSelectedVigencia(null)}
                  />
                </div>

                <ul className="cadena-list">
                  {filteredVigencia.map((row) => {
                    const key = vigenciaKey(row);
                    return (
                      <li
                        key={key}
                        className={
                          selectedVigencia === key ? 'is-map-selected' : undefined
                        }
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
                          {row.lat != null && row.lng != null && (
                            <button
                              type="button"
                              className="btn ghost cerca-map-focus"
                              aria-pressed={selectedVigencia === key}
                              onClick={() => showVigenciaOnMap(row)}
                            >
                              {t('focusBranchOnMap')}
                            </button>
                          )}
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
