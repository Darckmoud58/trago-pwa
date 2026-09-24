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
