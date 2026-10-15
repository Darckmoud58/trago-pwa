/**
 * Lista las claves (campos) de todas las colecciones en MongoDB.
 * Uso: cd server && node scripts/listCollectionKeys.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Falta MONGODB_URI en server/.env');
  process.exit(1);
}

await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'trago' });
const db = mongoose.connection.db;
console.log(`DB: ${db.databaseName}\n`);

const cols = (await db.listCollections().toArray())
  .map((c) => c.name)
  .sort((a, b) => a.localeCompare(b));

for (const name of cols) {
  const col = db.collection(name);
  const count = await col.estimatedDocumentCount();
  const keys = new Set();
  for (const doc of await col.find({}).limit(50).toArray()) {
    for (const k of Object.keys(doc)) keys.add(k);
  }
  console.log(`▶ ${name}  (${count} docs)`);
  console.log(keys.size ? `  ${[...keys].sort().join(', ')}\n` : '  (vacía — sin claves)\n');
}

await mongoose.disconnect();
