const SLICE = 1024 * 1024;
const TYPES = new Set([
  'video/mp4',
  'video/webm',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const comma = text.indexOf(',');
      resolve(comma >= 0 ? text.slice(comma + 1) : text);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

type UploadResponse = { done?: boolean; url?: string; message?: string };

/** Sube el video o el poster de una campaña. Devuelve la ruta del archivo. */
export async function uploadCreative(
  file: File,
  post: (body: Record<string, unknown>) => Promise<UploadResponse>
): Promise<string> {
  const video = file.type.startsWith('video/');
  const max = video ? 8 * 1024 * 1024 : 3 * 1024 * 1024;
  if (!TYPES.has(file.type)) {
    throw new Error('Usa mp4, webm, jpg, png o webp.');
  }
  if (file.size > max) {
    throw new Error(
      video
        ? 'El video debe pesar 8 MB o menos.'
        : 'La imagen debe pesar 3 MB o menos.'
    );
  }
  const uploadId = crypto.randomUUID();
  const total = Math.max(1, Math.ceil(file.size / SLICE));
  let url = '';
  for (let index = 0; index < total; index += 1) {
    const slice = file.slice(index * SLICE, Math.min(file.size, (index + 1) * SLICE));
    const data = await blobToBase64(slice);
    const res = await post({
      uploadId,
      index,
      total,
      mime: file.type,
      name: file.name,
      data,
    });
    if (res.url) url = res.url;
  }
  if (!url) throw new Error('No se pudo guardar el archivo.');
  return url;
}
