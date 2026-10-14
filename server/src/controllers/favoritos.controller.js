import Favorito from '../models/Favorito.js';

const TARGET_TYPES = new Set(['ubicacion', 'empresa']);
const SNAPSHOT_FIELDS = [
  'nombre',
  'subtitulo',
  'direccion',
  'colonia',
  'municipio',
  'horario',
  'imagen',
];

function validTarget(type, id) {
  return (
    TARGET_TYPES.has(type) &&
    typeof id === 'string' &&
    id.trim().length > 0 &&
    id.length <= 128
  );
}

function parseSavedAt(raw) {
  if (raw == null || raw === '') return new Date();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const err = new Error('savedAt inválido');
    err.status = 400;
    throw err;
  }
  const maxFuture = Date.now() + 5 * 60 * 1000;
  if (d.getTime() > maxFuture) {
    const err = new Error('savedAt no puede estar en el futuro');
    err.status = 400;
    throw err;
  }
  return d;
}

function snapshotFrom(body = {}) {
  body ||= {};
  const out = {};
  for (const field of SNAPSHOT_FIELDS) {
    if (typeof body[field] === 'string') {
      out[field] = body[field].trim().slice(0, field === 'nombre' ? 160 : 500);
    }
  }
  if (!out.nombre) throw Object.assign(new Error('El nombre del favorito es requerido'), { status: 400 });
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

export async function list(req, res, next) {
  try {
    const rows = await Favorito.find({ userId: req.userId })
      .sort({ savedAt: -1 })
      .lean();
    res.json({ favoritos: rows.map(toClient) });
  } catch (e) {
    next(e);
  }
}

export async function upsert(req, res, next) {
  const { type, targetId } = req.params;
  if (!validTarget(type, targetId)) {
    return res.status(400).json({ message: 'Favorito inválido' });
  }
  try {
    const savedAt = parseSavedAt(req.body?.savedAt);
    const favorite = await Favorito.findOneAndUpdate(
      { userId: req.userId, targetType: type, targetId },
      {
        $set: snapshotFrom(req.body),
        $setOnInsert: {
          userId: req.userId,
          targetType: type,
          targetId,
          savedAt,
        },
      },
      { upsert: true, new: true, runValidators: true }
    ).lean();
    res.json({ favorito: toClient(favorite) });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const { type, targetId } = req.params;
    if (!validTarget(type, targetId)) {
      return res.status(400).json({ message: 'Favorito inválido' });
    }
    await Favorito.deleteOne({
      userId: req.userId,
      targetType: type,
      targetId,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

/** Aplica una cola de cambios guardados localmente mientras el dispositivo estaba offline. */
export async function sync(req, res, next) {
  const { changes } = req.body || {};
  if (!Array.isArray(changes) || changes.length > 500) {
    return res
      .status(400)
      .json({ message: 'La sincronización debe incluir hasta 500 cambios' });
  }
  try {
    for (const change of changes) {
      if (
        !validTarget(change?.type, change?.id) ||
        !['put', 'delete'].includes(change.op)
      ) {
        continue;
      }
      const key = {
        userId: req.userId,
        targetType: change.type,
        targetId: change.id,
      };
      if (change.op === 'delete') {
        await Favorito.deleteOne(key);
      } else {
        const snapshot = snapshotFrom(change.favorite || {});
        const savedAt = parseSavedAt(change.favorite?.savedAt);
        await Favorito.findOneAndUpdate(
          key,
          { $set: snapshot, $setOnInsert: { ...key, savedAt } },
          { upsert: true, runValidators: true }
        );
      }
    }
    res.json({ ok: true, applied: changes.length });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}
