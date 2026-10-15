import dotenv from 'dotenv';
import { requireEnv } from './config/env.js';
import { createApp } from './app.js';
import { connectDB } from './db/connect.js';
import { startOfficialPromoJob } from './services/officialPromoJob.js';

dotenv.config();

let env;
try {
  env = requireEnv();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const app = createApp();

connectDB()
  .then(() => {
    startOfficialPromoJob({ immediate: true });
    app.listen(env.PORT, () => {
      console.log(`TraGo API en http://localhost:${env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error al conectar a la base de datos:', err.message);
    process.exit(1);
  });
