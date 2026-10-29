import mongoose from 'mongoose';

/**
 * Conexión MongoDB cacheada — mismo enfoque serverless que Todo_pwa.
 * En Vercel/Netlify reutiliza la conexión entre invocaciones warm.
 */
let cached = globalThis._mongooseConn;
if (!cached) {
  cached = globalThis._mongooseConn = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI no está definida en .env');
  }

  if (!cached.promise) {
    const onServerless = Boolean(
      process.env.VERCEL || process.env.NETLIFY === 'true'
    );
    cached.promise = mongoose
      .connect(uri, {
        dbName: process.env.MONGODB_DB || 'trago',
        // En serverless no construimos índices en cada cold start.
        autoIndex: !onServerless,
      })
      .then((m) => m.connection)
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  console.log('Conectado a la base de datos:', cached.conn.name);
  return cached.conn;
}
