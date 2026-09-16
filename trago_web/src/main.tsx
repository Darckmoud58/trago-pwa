import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Layout from './Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Promos from './pages/Promos';
import Cerca from './pages/Cerca';
import Negocios from './pages/Negocios';
import Cuenta from './pages/Cuenta';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/promos" element={<Promos />} />
          <Route path="/cerca" element={<Cerca />} />
          <Route path="/negocios" element={<Negocios />} />
          <Route path="/cuenta" element={<Cuenta />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
