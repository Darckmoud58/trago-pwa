import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { corsOriginList, getEnv, isDev } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import ageRoutes from './routes/age.routes.js';
import catalogoRoutes from './routes/catalogo.routes.js';
import favoritosRoutes from './routes/favoritos.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import cadenaRoutes from './routes/cadena.routes.js';
import metricasRoutes from './routes/metricas.routes.js';
import pushRoutes from './routes/push.routes.js';

/**
 * App Express (sin listen) — usable en local y en Netlify Functions.
 * Requiere requireEnv() antes de llamar (server.js / netlify).
 */
export function createApp() {
  const env = getEnv();
  const app = express();
  const allowed = new Set(corsOriginList(env));
  if (isDev(env)) {
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
  }

  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowed.has(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '20kb' }));

  if (env.NETLIFY !== 'true') {
    app.use(
      morgan((tokens, req, res) =>
        [
          tokens.method(req, res),
          (tokens.url(req, res) || '').split('?')[0],
          tokens.status(req, res),
          tokens['response-time'](req, res),
          'ms',
        ].join(' ')
      )
    );
  }

  app.get('/', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/age', ageRoutes);
  app.use('/api/favoritos', favoritosRoutes);
  app.use('/api/reportes', reportesRoutes);
  app.use('/api/cadena', cadenaRoutes);
  app.use('/api/metricas', metricasRoutes);
  app.use('/api/push', pushRoutes);
  app.use('/api', catalogoRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
