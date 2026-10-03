import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import catalogoRoutes from './routes/catalogo.routes.js';
import favoritosRoutes from './routes/favoritos.routes.js';

/**
 * App Express (sin listen) — usable en local y en Netlify Functions.
 */
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  if (process.env.NETLIFY !== 'true') {
    app.use(morgan('dev'));
  }

  app.get('/', (_req, res) =>
    res.json({
      ok: true,
      name: 'TraGo API',
      pattern: 'Express + Mongoose (mismo estilo Todo PWA / clase)',
      db: process.env.MONGODB_DB || 'trago',
      er: 'traGO.1.2.drawio',
      collections: [
        'usuarios',
        'roles',
        'niveles',
        'insignias',
        'usuario_insignias',
        'empresas',
        'ubicaciones',
        'categorias',
        'promociones',
        'cupones',
        'canjes',
        'resenas',
        'promo_ubicaciones',
      ],
    })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/favoritos', favoritosRoutes);
  app.use('/api', catalogoRoutes);

  return app;
}
