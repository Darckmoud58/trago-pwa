import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import InstallBanner from './components/InstallBanner';
import OfflineBanner from './components/OfflineBanner';
import PageLoadOverlay from './components/PageLoadOverlay';
import './Layout.css';

export default function Layout() {
  const { pathname } = useLocation();
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, [pathname]);

  useEffect(() => {
    const on = () => setOnline(true);
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
    <div className={`app-shell${isAuth ? ' is-auth' : ''}${isHome ? ' is-home' : ''}`}>
      <PageLoadOverlay />
      {!hideHeader && <AppHeader online={online} />}
      {!online && <OfflineBanner />}
      <main className="app-main page-enter" id="main">
        <Outlet />
      </main>
      <BottomNav hasSession={!!token} />
      <InstallBanner />
    </div>
  );
}
