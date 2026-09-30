import dotenv from 'dotenv';
import { createApp } from './app.js';
import { connectDB } from './db/connect.js';

dotenv.config();

const app = createApp();
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
