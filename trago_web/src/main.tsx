import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { I18nProvider } from './lib/i18n';
import { hookInstallPromptEarly } from './lib/installPrompt';
import Layout from './Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Promos from './pages/Promos';
import PromoDetalle from './pages/PromoDetalle';
import Cerca from './pages/Cerca';
import Negocios from './pages/Negocios';
import Favoritos from './pages/Favoritos';
import Cuenta from './pages/Cuenta';
import Idioma from './pages/Idioma';
import Terminos from './pages/Terminos';
import AvisoPrivacidad from './pages/AvisoPrivacidad';

hookInstallPromptEarly();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/promos" element={<Promos />} />
            <Route path="/promos/:promoId" element={<PromoDetalle />} />
            <Route path="/cerca" element={<Cerca />} />
            <Route path="/negocios" element={<Negocios />} />
            <Route path="/favoritos" element={<Favoritos />} />
            <Route path="/cuenta" element={<Cuenta />} />
            <Route path="/idioma" element={<Idioma />} />
            <Route path="/terminos" element={<Terminos />} />
            <Route path="/aviso-de-privacidad" element={<AvisoPrivacidad />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>
);
