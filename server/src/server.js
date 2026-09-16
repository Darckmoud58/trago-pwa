import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { connectDB } from './db/connect.js';
import authRoutes from './routes/auth.routes.js';
import catalogoRoutes from './routes/catalogo.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_req, res) =>
  res.json({
    ok: true,
    name: 'TraGo API',
    pattern: 'Express + Mongoose (mismo estilo Todo PWA / clase)',
    collections: [
      'usuarios',
      'roles',
      'categorias',
      'negocios',
      'sucursales',
      'promociones',
      'fuentesPromociones',
      'cupones',
      'favoritos',
      'resenas',
      'reportes',
      'niveles',
      'detallesPuntos',
      'insignias',
      'usuarioInsignias',
      'referidos',
      'suscripcionesNegocio',
      'pagosSuscripcion',
      'notificaciones',
      'promoSucursales',
    ],
  })
);

app.use('/api/auth', authRoutes);
app.use('/api', catalogoRoutes);

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`TraGo API en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error al conectar a la base de datos:', err.message);
    process.exit(1);
  });
