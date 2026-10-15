/**
 * Quita el campo legacy token_login de usuarios.
 * Uso: node src/scripts/migrate-drop-token-login.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { requireEnv } from '../config/env.js';

dotenv.config();

async function main() {
  const env = requireEnv();
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB });
  const res = await mongoose.connection.db
    .collection('usuarios')
    .updateMany({}, { $unset: { token_login: '' } });
  console.log(`token_login unset: matched=${res.matchedCount} modified=${res.modifiedCount}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
