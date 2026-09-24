import { NavLink, Outlet } from 'react-router-dom';
import InstallBanner from './components/InstallBanner';
import './Layout.css';

export default function Layout() {
  const token = localStorage.getItem('token');

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand" end>
          TraGo
        </NavLink>
        <nav className="nav" aria-label="Principal">
          <NavLink to="/promos">Promos</NavLink>
          <NavLink to="/cerca">Cerca</NavLink>
          <NavLink to="/negocios">Negocios</NavLink>
          <NavLink to="/favoritos">Favoritos</NavLink>
          {token ? (
            <NavLink to="/cuenta">Cuenta</NavLink>
          ) : (
            <NavLink to="/entrar">Entrar</NavLink>
          )}
        </nav>
      </header>
      <main className="main page-enter">
        <Outlet />
      </main>
      <footer className="foot">
        <div className="foot-links">
          <NavLink to="/terminos">Términos y condiciones</NavLink>
          <NavLink to="/aviso-de-privacidad">Aviso de privacidad</NavLink>
        </div>
        <p className="foot-note">
          TraGo · promociones en Guadalajara · cuenta desde 13 años · alcohol
          solo 18+ · la vigencia la confirma el local
        </p>
      </footer>
      <InstallBanner />
    </div>
  );
}
