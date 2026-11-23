import Empresa from '../models/Empresa.js';
import Pago from '../models/Pago.js';
import Suscripcion from '../models/Suscripcion.js';

/**
 * Marca un pago como approved y activa la suscripción + plan_pauta de la empresa.
 * Idempotente si ya estaba approved.
 */
export async function activarPagoAprobado(pago, { notas = '' } = {}) {
  if (!pago) {
    const err = new Error('Pago no encontrado');
    err.status = 404;
    throw err;
  }

  if (pago.estatus === 'approved' && pago.id_suscripcion) {
    const existing = await Suscripcion.findById(pago.id_suscripcion).lean();
    return { pago, suscripcion: existing, already: true };
  }

  const empresa = await Empresa.findById(pago.id_empresa);
  if (!empresa) {
    const err = new Error('Empresa no encontrada');
    err.status = 404;
    throw err;
  }

  const inicia = new Date();
  const dias = Number(pago.dias) || 30;
  const termina = new Date(inicia.getTime() + dias * 24 * 60 * 60 * 1000);

  await Suscripcion.updateMany(
    { id_empresa: empresa._id, estatus: 'pending' },
    { $set: { estatus: 'cancelado', activo: false } }
  );

  const sub = await Suscripcion.create({
    id_empresa: empresa._id,
    plan: pago.plan,
    inicia,
    termina,
    activo: true,
    estatus: 'activo',
    origen: pago.provider === 'sandbox' ? 'pasarela' : 'pasarela',
    notas:
      notas ||
      `Pago ${pago.provider} ${pago.provider_ref || pago._id} · ${pago.sucursales} suc.`,
    auto_renovar: false,
  });

  const pautaPlan =
    pago.plan === 'campaign' ? 'campaign' : pago.plan === 'freemium' ? 'none' : 'basic';
  empresa.plan_pauta = pautaPlan;
  if (pago.plan === 'pro' || pago.plan === 'premium') {
    empresa.plan = pago.plan === 'premium' ? 'premium' : 'pro';
  }
  await empresa.save();

  pago.estatus = 'approved';
  pago.pagado_en = new Date();
  pago.id_suscripcion = sub._id;
  await pago.save();

  return { pago: pago.toObject(), suscripcion: sub.toObject(), already: false };
}

export async function findPagoById(id) {
  return Pago.findById(id);
}
