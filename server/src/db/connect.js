import mongoose from 'mongoose';

/**
 * Conexión MongoDB — mismo enfoque que Todo_pwa/server (clase PWA).
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI no está definida en .env');
  }

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || 'trago',
  });

  console.log('Conectado a la base de datos:', mongoose.connection.name);
  return mongoose.connection;
}
