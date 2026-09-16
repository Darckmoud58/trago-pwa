import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

export default function Layout() {
  const token = localStorage.getItem('token');

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          TraGo
        </NavLink>
        <nav className="nav">
          <NavLink to="/promos">Promos</NavLink>
          <NavLink to="/cerca">Cerca</NavLink>
          <NavLink to="/negocios">Negocios</NavLink>
          {token ? (
            <NavLink to="/cuenta">Cuenta</NavLink>
          ) : (
            <NavLink to="/entrar">Entrar</NavLink>
          )}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="foot">
        TraGo · promos vigentes en Guadalajara · alcohol 18+
      </footer>
    </div>
  );
}
