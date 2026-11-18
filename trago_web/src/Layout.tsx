import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import BirthdayGuideFab from './components/BirthdayGuideFab';
import BirthdaySurpriseSplash from './components/BirthdaySurpriseSplash';
import BottomNav from './components/BottomNav';
import InstallBanner from './components/InstallBanner';
import PwaUpdater from './components/PwaUpdater';
import LocationSplash from './components/LocationSplash';
import OfflineBanner from './components/OfflineBanner';
import PageLoadOverlay from './components/PageLoadOverlay';
import PageTransition from './components/PageTransition';
import SideAdRails from './components/SideAdRails';
import { readToken } from './api';
import { syncFavorites } from './lib/favorites';
import { useAuthUser } from './hooks/useAuthUser';
import { useImmersiveScroll } from './hooks/useImmersiveScroll';
import { useNightTheme } from './hooks/useNightTheme';
import { useUserPrefs } from './hooks/useUserPrefs';
import './Layout.css';

export default function Layout() {
  const { pathname } = useLocation();
  const night = useNightTheme();
  const { birthdayToday } = useAuthUser();
  const { prefs } = useUserPrefs();
  useImmersiveScroll();
  const [token, setToken] = useState(() => readToken());
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    setToken(readToken());
  }, [pathname]);

  useEffect(() => {
    const onSession = () => setToken(readToken());
    window.addEventListener('trago-session', onSession);
    return () => window.removeEventListener('trago-session', onSession);
  }, []);

  useEffect(() => {
    void syncFavorites();
  }, [token]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      void syncFavorites();
    };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const isHome = pathname === '/';
  const isAuth =
    pathname.startsWith('/entrar') || pathname.startsWith('/registro');
  const hideHeader = isHome || isAuth;

  return (
    <div
      className={`app-shell${isAuth ? ' is-auth' : ''}${isHome ? ' is-home' : ''}${night ? ' is-night' : ' is-day'}${birthdayToday ? ' is-bday-day' : ''}${prefs.densidad === 'compacta' ? ' is-dense' : ''}${!online ? ' is-offline' : ''}`}
      data-zone={prefs.zona || 'gdl'}
    >
      <PageLoadOverlay />
      <BirthdaySurpriseSplash />
      <LocationSplash />
      {!hideHeader && <AppHeader online={online} loggedIn={!!token} />}
      {!online && <OfflineBanner />}
      <div className={`app-body${isAuth ? ' is-auth' : ''}`}>
        <SideAdRails />
        <main className="app-main" id="main">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <BirthdayGuideFab />
      <BottomNav hasSession={!!token} birthdayToday={birthdayToday} />
      <PwaUpdater />
      <InstallBanner />
    </div>
  );
}
