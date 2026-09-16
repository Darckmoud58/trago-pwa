import { MongoClient, type Db } from "mongodb";

/**
 * Un cliente por proceso (Next reutiliza el módulo).
 * Docker: 1 instancia Next → pool chico.
 * maxPoolSize 10: OLTP liviano, un contenedor.
 * minPoolSize 0: no retener conexiones idle en compose.
 */
const g = globalThis as unknown as {
  _tragoMongo?: MongoClient;
  _tragoMongoPromise?: Promise<MongoClient>;
};

export function hasMongoUri() {
  if (process.env.NEXT_PUBLIC_DEMO === "true" || process.env.TRAGO_SKIP_MONGO === "true") {
    return false;
  }
  return Boolean(process.env.MONGODB_URI);
}

export async function getMongo(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGODB_URI");

  if (!g._tragoMongoPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 8000,
    });
    g._tragoMongoPromise = client.connect().then((c) => {
      g._tragoMongo = c;
      return c;
    });
  }
  const client = await g._tragoMongoPromise;
  return client.db(process.env.MONGODB_DB || "trago");
}
