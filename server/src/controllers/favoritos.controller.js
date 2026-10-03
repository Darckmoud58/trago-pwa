import Favorito from '../models/Favorito.js';

const TARGET_TYPES = new Set(['ubicacion', 'empresa']);
const SNAPSHOT_FIELDS = ['nombre', 'subtitulo', 'direccion', 'colonia', 'municipio', 'horario', 'imagen'];

function validTarget(type, id) {
  return TARGET_TYPES.has(type) && typeof id === 'string' && id.trim().length > 0 && id.length <= 128;
}

function snapshotFrom(body = {}) {
  body ||= {};
  const out = {};
  for (const field of SNAPSHOT_FIELDS) {
    if (typeof body[field] === 'string') out[field] = body[field].trim().slice(0, field === 'nombre' ? 160 : 500);
  }
  if (!out.nombre) throw new Error('El nombre del favorito es requerido');
  return out;
}

function toClient(doc) {
  return {
    id: doc.targetId,
    type: doc.targetType,
    nombre: doc.nombre,
    subtitulo: doc.subtitulo,
    direccion: doc.direccion,
    colonia: doc.colonia,
    municipio: doc.municipio,
    horario: doc.horario,
    imagen: doc.imagen,
    savedAt: new Date(doc.savedAt || doc.createdAt).getTime(),
  };
}

export async function list(req, res) {
  const rows = await Favorito.find({ userId: req.userId }).sort({ savedAt: -1 }).lean();
  res.json({ favoritos: rows.map(toClient) });
}

export async function upsert(req, res) {
  const { type, targetId } = req.params;
  if (!validTarget(type, targetId)) return res.status(400).json({ message: 'Favorito inválido' });
  try {
    const favorite = await Favorito.findOneAndUpdate(
      { userId: req.userId, targetType: type, targetId },
      { $set: snapshotFrom(req.body), $setOnInsert: { userId: req.userId, targetType: type, targetId, savedAt: req.body.savedAt ? new Date(req.body.savedAt) : new Date() } },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    res.json({ favorito: toClient(favorite) });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Favorito inválido' });
  }
}

export async function remove(req, res) {
  const { type, targetId } = req.params;
  if (!validTarget(type, targetId)) return res.status(400).json({ message: 'Favorito inválido' });
  await Favorito.deleteOne({ userId: req.userId, targetType: type, targetId });
  res.json({ ok: true });
}

/** Aplica una cola de cambios guardados localmente mientras el dispositivo estaba offline. */
export async function sync(req, res) {
  const { changes } = req.body || {};
  if (!Array.isArray(changes) || changes.length > 500) {
    return res.status(400).json({ message: 'La sincronización debe incluir hasta 500 cambios' });
  }
  try {
    for (const change of changes) {
      if (!validTarget(change?.type, change?.id) || !['put', 'delete'].includes(change.op)) continue;
      const key = { userId: req.userId, targetType: change.type, targetId: change.id };
      if (change.op === 'delete') {
        await Favorito.deleteOne(key);
      } else {
        const snapshot = snapshotFrom(change.favorite || {});
        await Favorito.findOneAndUpdate(
          key,
          { $set: snapshot, $setOnInsert: { ...key, savedAt: change.favorite.savedAt ? new Date(change.favorite.savedAt) : new Date() } },
          { upsert: true, runValidators: true },
        );
      }
    }
    res.json({ ok: true, applied: changes.length });
  } catch (error) {
    res.status(400).json({ message: error.message || 'No se pudo sincronizar favoritos' });
  }
}
