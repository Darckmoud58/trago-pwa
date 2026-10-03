import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Locale = 'es' | 'en';

const STORAGE_KEY = 'trago_locale';

const messages = {
  es: {
    navHome: 'Inicio',
    navExplore: 'Explorar',
    navNear: 'Cerca',
    navFavorites: 'Favoritos',
    navAccount: 'Cuenta',
    navAria: 'Navegación principal',
    titleDetail: 'Detalle',
    titlePromos: 'Promociones',
    titleNear: 'Cerca de ti',
    titleFavorites: 'Favoritos',
    titleAccount: 'Mi cuenta',
    titleLogin: 'Entrar',
    titleRegister: 'Registro',
    titleBusinesses: 'Negocios',
    titleTerms: 'Términos',
    titlePrivacy: 'Privacidad',
    titleLanguage: 'Idioma',
    back: 'Volver',
    online: 'En línea',
    offline: 'Sin conexión',
    offlineCache: 'Sin conexión · caché local',
    loading: 'Cargando…',
    searching: 'Buscando…',
    tapContinue: 'Toca para continuar',
    languageTitle: 'Idioma',
    languageLead: 'Elige el idioma de la app. Se guarda en este dispositivo.',
    languageEs: 'Español',
    languageEn: 'English',
    languageCurrent: 'Actual',
    settingsAria: 'Ajustes',
    settingsLanguage: 'Idioma',
    settingsFavorites: 'Favoritos',
    settingsPromos: 'Promociones',
    settingsNear: 'Cerca de ti',
    settingsNotif: 'Notificaciones',
    settingsSoon: 'Próximamente',
    settingsPrivacy: 'Privacidad',
    settingsTerms: 'Términos',
    logout: 'Cerrar sesión',
    sessionInvalid: 'Sesión inválida. Vuelve a entrar.',
    teenNote: 'Perfil 13–17: ocultamos alcohol y nocturno.',
    ageDialog: 'Aviso de edad',
    ageBody:
      'Hay promos con alcohol solo 18+. Al continuar aceptas los términos y el aviso de privacidad.',
    ageTerms: 'términos',
    agePrivacy: 'aviso de privacidad',
    understood: 'Entendido',
    hello: 'Hola',
    homeHeadline: '¿Qué se te antoja hoy?',
    quickNear: 'Cerca de mí',
    quickPromos: 'Promos',
    quickFavorites: 'Favoritos',
    quickLogin: 'Entrar',
    categories: 'Categorías',
    catAll: 'Todas',
    catFood: 'Comida',
    catBday: 'Cumple',
    catCafe: 'Café',
    catAlcohol: '18+',
    featured: 'Destacadas',
    seeAll: 'Ver todas',
    cacheHint: 'Mostrando última consulta guardada',
    apiOffline: 'Sin conexión a la API. Revisa favoritos o vuelve más tarde.',
    chainFallback: 'Cadena',
    until: 'hasta',
    gpsLabel: 'GPS',
    aroundTitle: 'Qué hay a tu alrededor',
    aroundBody:
      'Encuentra negocios registrados cerca de tu GPS en el mapa. Guarda lugares para verlos offline.',
    openNear: 'Abrir cerca',
    useMyLocation: 'Usar mi ubicación',
    demoCenter: 'Demo Centro GDL',
    usingLocation: 'Usando tu ubicación',
    locationPermissionError: 'No pudimos obtener tu ubicación. Activa el permiso de ubicación o elige Demo Centro GDL para explorar esa zona.',
    osmCoverageNote: 'La cobertura depende de los lugares registrados en OpenStreetMap.',
    centerGdl: 'Centro Histórico GDL',
    lastSearchSaved: 'Última búsqueda guardada',
    offlineLastSearch: 'Sin red · última búsqueda guardada',
    nearError:
      'No pudimos buscar lugares. Revisa tu conexión o abre Favoritos.',
    noGeo: 'Tu dispositivo no soporta geolocalización',
    cacheTag: ' · caché',
    branchFallback: 'Sucursal',
    businessFallback: 'Negocio',
    nearEmpty: 'Toca “Usar mi ubicación” para ver qué hay cerca.',
    nearEmptyHint: 'También puedes guardar lugares en Favoritos para verlos offline.',
    favEmpty: 'Aún no tienes favoritos.',
    favEmptyHint: 'En Cerca toca el corazón para guardar un lugar offline.',
    favSearchNear: 'Buscar cerca',
    favRemove: 'Quitar',
    favRemoveAria: 'Quitar {name} de favoritos',
    typeBusiness: 'Negocio',
    typeBranch: 'Sucursal',
    favAdd: 'Guardar en favoritos',
    favAdded: 'Quitar de favoritos',
    favTitleOn: 'En favoritos (offline)',
    favTitleOff: 'Guardar offline',
    filterAll: 'Todas',
    filterFeatured: 'Destacadas',
    filterFood: 'Comida',
    filterCafe: 'Café',
    filterBday: 'Cumpleaños',
    filterNight: 'Nocturno',
    filterAlcohol: '18+',
    filtersAria: 'Filtros',
    search: 'Buscar',
    searchPlaceholder: 'Buscar nombre o cadena…',
    promosTeenNote: 'Perfil 13–17: ocultamos alcohol y nocturno',
    promoCount: '{n} promo',
    promoCountPlural: '{n} promos',
    localCache: ' · caché local',
    promosLoadError:
      'No se pudieron cargar las promos. Revisa tu conexión o vuelve más tarde.',
    featuredTag: 'Destacada',
    untilDate: 'Hasta',
    expired: ' · caducada',
    promosEmpty: 'No hay promociones con ese filtro.',
    clearFilters: 'Limpiar filtros',
    offlineBannerTitle: 'Sin conexión',
    offlineBannerBody: 'Puedes abrir favoritos y lo último guardado.',
    goFavorites: 'Ir a favoritos',
    installTitleIos: 'Añadir a pantalla de inicio',
    installTitle: 'Instalar TraGo',
    installTipIos:
      'Toca Compartir (□↑) y elige “Añadir a pantalla de inicio”.',
    installTipReady:
      'Instálala como app: acceso rápido y favoritos a la mano.',
    installTipAndroid:
      'Menú ⋮ del navegador → “Instalar app” o “Añadir a la pantalla de inicio”.',
    installTipOther:
      'En Chrome o Edge: mira el icono ⊕ / Instalar en la barra de direcciones y elige Instalar.',
    installTitleWindows: 'Instalar TraGo en Windows',
    installTipWindows:
      'En Edge o Chrome: icono ⊕ / Instalar en la barra de direcciones, o Menú ⋮ → Instalar TraGo.',
    installTipWindowsReady: 'Pulsa Instalar ahora para agregarla como app.',
    installTitleSafari: 'Agregar TraGo al Dock',
    installTipSafari:
      'En Safari de Mac: Archivo → “Agregar al Dock” (o Compartir → Agregar al Dock).',
    installStepSafari1: '1. Abre TraGo en Safari (no Chrome)',
    installStepSafari2: '2. Menú Archivo → “Agregar al Dock”',
    installStepSafari3: '3. Confirma para usarla como app',
    installPreparing: 'Preparando instalación…',
    installWaitingBrowser:
      'Cuando el navegador esté listo, el botón Instalar se activará aquí.',
    installStepIos1: '1. Toca Compartir □↑ (Safari)',
    installStepIos2: '2. “Añadir a pantalla de inicio”',
    installStepIos3: '3. Confirma con Añadir',
    installHow: 'Cómo instalar',
    installNow: 'Instalar ahora',
    installAddHome: 'Agregar a inicio',
    installIosNeedSafari:
      'En iPhone/iPad hay que usar Safari. Apple no permite un botón de instalar automático.',
    installStepShare: 'Compartir',
    installStepAddHome: 'Añadir a pantalla de inicio',
    installStepAdd: 'Añadir',
    install: 'Instalar',
    notNow: 'Ahora no',
    loginTitle: 'Entrar',
    loginLead: 'Accede a tu cuenta TraGo. Demo:',
    email: 'Correo',
    password: 'Contraseña',
    loginSubmit: 'Entrar',
    loggingIn: 'Entrando…',
    loginError: 'Error de login',
    noAccount: '¿Sin cuenta?',
    registerLink: 'Regístrate',
    languageLink: 'Idioma / Language',
    registerTitle: 'Registro',
    registerLead:
      'Mínimo {minAccount} años. Promos con alcohol y nocturno solo para {minAge}+.',
    name: 'Nombre',
    birthDate: 'Fecha de nacimiento',
    acceptTermsNeed:
      'Debes aceptar términos, aviso de privacidad y confirmar tu edad.',
    minAgeError: 'Debes tener al menos {n} años para crear una cuenta.',
    acceptTerms: 'Acepto los',
    termsLink: 'Términos y condiciones',
    acceptPrivacy: 'Acepto el',
    privacyLink: 'Aviso de privacidad',
    confirmAge:
      'Confirmo que mi fecha de nacimiento es real. Sé que el contenido con alcohol es solo para mayores de {n} años.',
    creating: 'Creando…',
    createAccount: 'Crear cuenta',
    registerError: 'Error al registrar',
    hasAccount: '¿Ya tienes cuenta?',
    directory: 'Directorio',
    businessesLead:
      'Cadenas y locales en TraGo. Guárdalos en favoritos para verlos offline.',
    searchBusiness: 'Buscar negocio',
    searchBusinessPh: 'Buscar negocio…',
    businessCount: '{n} negocio',
    businessCountPlural: '{n} negocios',
    businessesError:
      'No se pudieron cargar los negocios. Si estás sin red, revisa tus favoritos.',
    businessesEmpty: 'No hay negocios con esa búsqueda.',
    loadingPromo: 'Cargando promo…',
    promoNotFound: 'Promoción no encontrada',
    promoMissing: 'No encontramos esa promoción.',
    backToPromos: 'Volver a promos',
    promo18Only: 'Esta promo es solo para mayores de 18.',
    seeTerms: 'Ver términos',
    promoFallback: 'Promoción',
    myFavorites: 'Mis favoritos',
    locations: 'Sucursales',
    points: 'Puntos',
    validity: 'Vigencia',
    policies: 'Políticas',
    whereApplies: 'Dónde aplica',
    noBranches: 'Sin sucursales ligadas aún.',
    seeNearMe: 'Ver cerca de mí',
    nightTag: 'Nocturno',
    bdayTag: 'Cumple',
  },
  en: {
    navHome: 'Home',
    navExplore: 'Explore',
    navNear: 'Near',
    navFavorites: 'Favorites',
    navAccount: 'Account',
    navAria: 'Main navigation',
    titleDetail: 'Details',
    titlePromos: 'Deals',
    titleNear: 'Near you',
    titleFavorites: 'Favorites',
    titleAccount: 'My account',
    titleLogin: 'Sign in',
    titleRegister: 'Sign up',
    titleBusinesses: 'Businesses',
    titleTerms: 'Terms',
    titlePrivacy: 'Privacy',
    titleLanguage: 'Language',
    back: 'Back',
    online: 'Online',
    offline: 'Offline',
    offlineCache: 'Offline · local cache',
    loading: 'Loading…',
    searching: 'Searching…',
    tapContinue: 'Tap to continue',
    languageTitle: 'Language',
    languageLead: 'Choose the app language. Saved on this device.',
    languageEs: 'Español',
    languageEn: 'English',
    languageCurrent: 'Current',
    settingsAria: 'Settings',
    settingsLanguage: 'Language',
    settingsFavorites: 'Favorites',
    settingsPromos: 'Deals',
    settingsNear: 'Near you',
    settingsNotif: 'Notifications',
    settingsSoon: 'Coming soon',
    settingsPrivacy: 'Privacy',
    settingsTerms: 'Terms',
    logout: 'Sign out',
    sessionInvalid: 'Invalid session. Sign in again.',
    teenNote: 'Ages 13–17: we hide alcohol and nightlife.',
    ageDialog: 'Age notice',
    ageBody:
      'Some deals include alcohol for 18+ only. By continuing you accept the terms and privacy notice.',
    ageTerms: 'terms',
    agePrivacy: 'privacy notice',
    understood: 'Got it',
    hello: 'Hi',
    homeHeadline: 'What are you craving today?',
    quickNear: 'Near me',
    quickPromos: 'Deals',
    quickFavorites: 'Favorites',
    quickLogin: 'Sign in',
    categories: 'Categories',
    catAll: 'All',
    catFood: 'Food',
    catBday: 'Birthday',
    catCafe: 'Coffee',
    catAlcohol: '18+',
    featured: 'Featured',
    seeAll: 'See all',
    cacheHint: 'Showing last saved results',
    apiOffline: 'API offline. Check favorites or try again later.',
    chainFallback: 'Chain',
    until: 'until',
    gpsLabel: 'GPS',
    aroundTitle: 'What’s around you',
    aroundBody:
      'Find businesses mapped near your GPS location. Save places to view them offline.',
    openNear: 'Open nearby',
    useMyLocation: 'Use my location',
    demoCenter: 'Demo Downtown GDL',
    usingLocation: 'Using your location',
    locationPermissionError: 'We could not get your location. Enable location access or choose Demo Downtown GDL to explore that area.',
    osmCoverageNote: 'Coverage depends on the places recorded in OpenStreetMap.',
    centerGdl: 'Downtown GDL',
    lastSearchSaved: 'Last saved search',
    offlineLastSearch: 'Offline · last saved search',
    nearError: 'We couldn’t find places. Check your connection or open Favorites.',
    noGeo: 'Your device does not support geolocation',
    cacheTag: ' · cache',
    branchFallback: 'Branch',
    businessFallback: 'Business',
    nearEmpty: 'Tap “Use my location” to see what’s nearby.',
    nearEmptyHint: 'You can also save places in Favorites to view them offline.',
    favEmpty: 'No favorites yet.',
    favEmptyHint: 'In Near, tap the heart to save a place offline.',
    favSearchNear: 'Search nearby',
    favRemove: 'Remove',
    favRemoveAria: 'Remove {name} from favorites',
    typeBusiness: 'Business',
    typeBranch: 'Branch',
    favAdd: 'Save to favorites',
    favAdded: 'Remove from favorites',
    favTitleOn: 'In favorites (offline)',
    favTitleOff: 'Save offline',
    filterAll: 'All',
    filterFeatured: 'Featured',
    filterFood: 'Food',
    filterCafe: 'Coffee',
    filterBday: 'Birthday',
    filterNight: 'Nightlife',
    filterAlcohol: '18+',
    filtersAria: 'Filters',
    search: 'Search',
    searchPlaceholder: 'Search name or chain…',
    promosTeenNote: 'Ages 13–17: alcohol and nightlife are hidden',
    promoCount: '{n} deal',
    promoCountPlural: '{n} deals',
    localCache: ' · local cache',
    promosLoadError:
      'Could not load deals. Check your connection or try again later.',
    featuredTag: 'Featured',
    untilDate: 'Until',
    expired: ' · expired',
    promosEmpty: 'No deals match that filter.',
    clearFilters: 'Clear filters',
    offlineBannerTitle: 'Offline',
    offlineBannerBody: 'You can open favorites and last saved data.',
    goFavorites: 'Go to favorites',
    installTitleIos: 'Add to Home Screen',
    installTitle: 'Install TraGo',
    installTipIos: 'Tap Share (□↑) and choose “Add to Home Screen”.',
    installTipReady: 'Install as an app: quick access and favorites at hand.',
    installTipAndroid:
      'Browser menu ⋮ → “Install app” or “Add to Home screen”.',
    installTipOther:
      'In Chrome or Edge: use the ⊕ / Install icon in the address bar and choose Install.',
    installTitleWindows: 'Install TraGo on Windows',
    installTipWindows:
      'In Edge or Chrome: use the ⊕ / Install icon in the address bar, or Menu ⋮ → Install TraGo.',
    installTipWindowsReady: 'Tap Install now to add it as an app.',
    installTitleSafari: 'Add TraGo to the Dock',
    installTipSafari:
      'In Mac Safari: File → “Add to Dock” (or Share → Add to Dock).',
    installStepSafari1: '1. Open TraGo in Safari (not Chrome)',
    installStepSafari2: '2. File menu → “Add to Dock”',
    installStepSafari3: '3. Confirm to use it as an app',
    installPreparing: 'Preparing install…',
    installWaitingBrowser:
      'When the browser is ready, the Install button will activate here.',
    installStepIos1: '1. Tap Share □↑ (Safari)',
    installStepIos2: '2. “Add to Home Screen”',
    installStepIos3: '3. Confirm with Add',
    installHow: 'How to install',
    installNow: 'Install now',
    installAddHome: 'Add to Home Screen',
    installIosNeedSafari:
      'On iPhone/iPad use Safari. Apple does not allow an automatic Install button.',
    installStepShare: 'Share',
    installStepAddHome: 'Add to Home Screen',
    installStepAdd: 'Add',
    install: 'Install',
    notNow: 'Not now',
    loginTitle: 'Sign in',
    loginLead: 'Access your TraGo account. Demo:',
    email: 'Email',
    password: 'Password',
    loginSubmit: 'Sign in',
    loggingIn: 'Signing in…',
    loginError: 'Sign-in error',
    noAccount: 'No account?',
    registerLink: 'Sign up',
    languageLink: 'Language / Idioma',
    registerTitle: 'Sign up',
    registerLead:
      'Minimum age {minAccount}. Alcohol and nightlife deals only for {minAge}+.',
    name: 'Name',
    birthDate: 'Date of birth',
    acceptTermsNeed:
      'You must accept the terms, privacy notice, and confirm your age.',
    minAgeError: 'You must be at least {n} years old to create an account.',
    acceptTerms: 'I accept the',
    termsLink: 'Terms and conditions',
    acceptPrivacy: 'I accept the',
    privacyLink: 'Privacy notice',
    confirmAge:
      'I confirm my date of birth is real. I know alcohol content is only for ages {n}+.',
    creating: 'Creating…',
    createAccount: 'Create account',
    registerError: 'Registration error',
    hasAccount: 'Already have an account?',
    directory: 'Directory',
    businessesLead:
      'Chains and venues on TraGo. Save them to favorites for offline.',
    searchBusiness: 'Search business',
    searchBusinessPh: 'Search business…',
    businessCount: '{n} business',
    businessCountPlural: '{n} businesses',
    businessesError:
      'Could not load businesses. If you are offline, check your favorites.',
    businessesEmpty: 'No businesses match that search.',
    loadingPromo: 'Loading deal…',
    promoNotFound: 'Deal not found',
    promoMissing: 'We could not find that deal.',
    backToPromos: 'Back to deals',
    promo18Only: 'This deal is only for ages 18+.',
    seeTerms: 'See terms',
    promoFallback: 'Deal',
    myFavorites: 'My favorites',
    locations: 'Locations',
    points: 'Points',
    validity: 'Valid until',
    policies: 'Policies',
    whereApplies: 'Where it applies',
    noBranches: 'No linked locations yet.',
    seeNearMe: 'See near me',
    nightTag: 'Nightlife',
    bdayTag: 'Birthday',
  },
} as const;

export type MessageKey = keyof (typeof messages)['es'];

type Vars = Record<string, string | number>;

type I18nValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'en' || raw === 'es') return raw;
  } catch {
    /* ignore */
  }
  return 'es';
}

function format(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window !== 'undefined' ? readStoredLocale() : 'es'
  );

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) =>
        format(
          messages[locale][key] ?? messages.es[key] ?? key,
          vars
        ),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de I18nProvider');
  return ctx;
}
