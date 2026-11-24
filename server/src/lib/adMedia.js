import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
]);

export const AD_MEDIA_LIMITS = {
  chunk: 1536 * 1024,
  image: 3 * 1024 * 1024,
  video: 8 * 1024 * 1024,
};

function fail(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function creativeLimit(mime) {
  return String(mime).startsWith('video/')
    ? AD_MEDIA_LIMITS.video
    : AD_MEDIA_LIMITS.image;
}

export function assertCreativeMeta({ mime, total, index }) {
  const type = String(mime || '').toLowerCase();
  if (!ALLOWED.has(type)) {
    throw fail('Usa jpg, png, webp, mp4 o webm');
  }
  const parts = Number(total);
  const at = Number(index);
  if (!Number.isInteger(parts) || parts < 1 || parts > 12) {
    throw fail('El archivo viene incompleto');
  }
  if (!Number.isInteger(at) || at < 0 || at >= parts) {
    throw fail('Fragmento de archivo inválido');
  }
  return { mime: type, total: parts, index: at };
}

export function decodeChunk(data) {
  if (typeof data !== 'string' || !data.trim()) {
    throw fail('Fragmento vacío');
  }
  const buf = Buffer.from(data, 'base64');
  if (!buf.length || buf.length > AD_MEDIA_LIMITS.chunk) {
    throw fail('Ese archivo pesa de más para subirlo de una vez');
  }
  return buf;
}

export function assembleParts(parts, mime) {
  const sorted = [...parts].sort((a, b) => a.index - b.index);
  if (sorted.length === 0 || sorted.some((part, i) => part.index !== i)) {
    return null;
  }
  const buf = Buffer.concat(sorted.map((part) => part.chunk));
  if (buf.length > creativeLimit(mime)) {
    throw fail('Ese archivo pesa de más para el piloto');
  }
  return buf;
}

function partsCollection() {
  return mongoose.connection.collection('ad_media_parts');
}

function bucket() {
  return new GridFSBucket(mongoose.connection.db, { bucketName: 'admedia' });
}

/**
 * Guarda un fragmento. Cuando llegan todos, deja el archivo en GridFS.
 * @returns {Promise<{ done: boolean, url?: string, received: number, total: number }>}
 */
export async function acceptAdChunk({
  empresaId,
  uploadId,
  index,
  total,
  mime,
  name,
  data,
}) {
  const id = String(uploadId || '').trim();
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(id)) {
    throw fail('Carga inválida');
  }
  const meta = assertCreativeMeta({ mime, total, index });
  const chunk = decodeChunk(data);
  const col = partsCollection();
  await col.updateOne(
    { uploadId: id, index: meta.index },
    {
      $set: {
        uploadId: id,
        empresaId: String(empresaId),
        index: meta.index,
        total: meta.total,
        mime: meta.mime,
        name: String(name || '').slice(0, 120),
        chunk,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  const stored = await col.find({ uploadId: id }).sort({ index: 1 }).toArray();
  const foreign = stored.find((row) => row.empresaId !== String(empresaId));
  if (foreign) throw fail('Carga inválida', 403);
  if (stored.length < meta.total) {
    return { done: false, received: stored.length, total: meta.total };
  }

  const file = assembleParts(
    stored.map((row) => ({
      index: row.index,
      chunk: Buffer.isBuffer(row.chunk) ? row.chunk : Buffer.from(row.chunk.buffer),
    })),
    meta.mime
  );
  if (!file) {
    return { done: false, received: stored.length, total: meta.total };
  }

  const stream = bucket().openUploadStream(String(name || 'creativo').slice(0, 80), {
    contentType: meta.mime,
    metadata: { empresaId: String(empresaId) },
  });
  const fileId = await new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(file);
  });
  await col.deleteMany({ uploadId: id });
  return {
    done: true,
    received: meta.total,
    total: meta.total,
    url: `/api/anuncios/medios/${fileId}`,
  };
}

export async function openAdMedia(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const files = await bucket()
    .find({ _id: new ObjectId(String(id)) })
    .toArray();
  const file = files[0];
  if (!file) return null;
  return {
    contentType: file.contentType || 'application/octet-stream',
    stream: bucket().openDownloadStream(file._id),
  };
}
