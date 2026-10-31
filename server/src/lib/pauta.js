import Suscripcion from '../models/Suscripcion.js';

const PAUTA_PLANS = new Set(['basic', 'campaign', 'premium', 'pro']);

/**
 * Suscripción vigente que habilita pauta (activo + no vencida).
 * @param {import('mongoose').Types.ObjectId|string} empresaId
 */
export async function findActivePautaSub(empresaId) {
  if (!empresaId) return null;
  const now = new Date();
  const sub = await Suscripcion.findOne({
    id_empresa: empresaId,
    activo: true,
    estatus: 'activo',
    plan: { $in: [...PAUTA_PLANS] },
    $and: [
      {
        $or: [{ inicia: null }, { inicia: { $lte: now } }],
      },
      {
        $or: [{ termina: null }, { termina: { $gte: now } }],
      },
    ],
  })
    .sort({ updatedAt: -1 })
    .lean();
  return sub;
}

/**
 * @param {object|null} empresa
 * @param {object|null} [sub]
 */
export function puedePauta(empresa, sub = null) {
  if (!empresa) return false;
  if (empresa.plan_pauta && empresa.plan_pauta !== 'none') return true;
  if (empresa.plan === 'premium') return true;
  if (sub && sub.activo && sub.estatus === 'activo') {
    return PAUTA_PLANS.has(String(sub.plan));
  }
  return false;
}

export function mapSuscripcion(s) {
  if (!s) return null;
  return {
    _id: s._id,
    plan: s.plan,
    inicia: s.inicia,
    termina: s.termina,
    activo: s.activo,
    estatus: s.estatus,
    origen: s.origen,
    notas: s.notas || '',
  };
}
