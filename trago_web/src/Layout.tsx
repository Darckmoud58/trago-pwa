import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import InstallBanner from './components/InstallBanner';
import OfflineBanner from './components/OfflineBanner';
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

  const hideHeader =
    pathname.startsWith('/entrar') || pathname.startsWith('/registro');

  return (
    <div className={`app-shell${hideHeader ? ' is-auth' : ''}`}>
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
