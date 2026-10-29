import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { corsOriginList, getEnv, isDev, isServerless } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import ageRoutes from './routes/age.routes.js';
import catalogoRoutes from './routes/catalogo.routes.js';
import cronRoutes from './routes/cron.routes.js';
import favoritosRoutes from './routes/favoritos.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import cadenaRoutes from './routes/cadena.routes.js';
import metricasRoutes from './routes/metricas.routes.js';
import pushRoutes from './routes/push.routes.js';

/**
 * App Express (sin listen) — local, Netlify Functions y Vercel.
 * Requiere requireEnv() antes de llamar (server.js / netlify / api/index).
 * Mongo se conecta fuera (server.js, netlify ensureDb, api/index.js).
 */
export function createApp() {
  const env = getEnv();
  const app = express();
  const serverless = isServerless(env);
  const allowed = new Set(corsOriginList(env));
  if (isDev(env)) {
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
    // vite preview (npm run preview) usa 4173
    allowed.add('http://localhost:4173');
    allowed.add('http://127.0.0.1:4173');
  }

  // Solo confiar en X-Forwarded-* detrás de proxy real (Netlify / Vercel / TRUST_PROXY).
  const trustProxy =
    serverless ||
    process.env.TRUST_PROXY === '1' ||
    process.env.TRUST_PROXY === 'true';
  app.set('trust proxy', trustProxy ? 1 : false);

  app.disable('x-powered-by');
  app.use(
    helmet({
      // API JSON: sin CSP de documentos HTML; sí headers de hardening.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts:
        env.NODE_ENV === 'production' || serverless
          ? { maxAge: 15552000, includeSubDomains: true }
          : false,
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
  // Serverless: body a veces llega como string o Buffer
  app.use((req, _res, next) => {
    if (typeof req.body === 'string' && req.body.length) {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        /* dejar string; validadores responderán 400 */
      }
    } else if (Buffer.isBuffer(req.body) && req.body.length) {
      try {
        req.body = JSON.parse(req.body.toString('utf8'));
      } catch {
        /* ignore */
      }
    }
    next();
  });

  if (!serverless) {
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
  } else {
    app.use(morgan('tiny'));
  }

  app.get('/', (_req, res) => res.json({ ok: true, name: 'trago-api' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/edad', ageRoutes);
  app.use('/api/age', ageRoutes);
  app.use('/api/favoritos', favoritosRoutes);
  app.use('/api/reportes', reportesRoutes);
  app.use('/api/cadena', cadenaRoutes);
  app.use('/api/metricas', metricasRoutes);
  app.use('/api/push', pushRoutes);
  app.use('/api/cron', cronRoutes);
  app.use('/api', catalogoRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
