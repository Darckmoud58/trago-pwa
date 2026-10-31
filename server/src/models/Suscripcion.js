import mongoose from 'mongoose';

/**
 * Suscripción de pauta / plan de negocio (piloto: activación manual por admin).
 * Colección: suscripciones
 */
const schema = new mongoose.Schema(
  {
    id_empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
      index: true,
    },
    /** Plan comercial de la suscripción (pauta o cadena Pro). */
    plan: {
      type: String,
      enum: ['freemium', 'pro', 'basic', 'campaign', 'premium'],
      default: 'basic',
    },
    inicia: { type: Date, default: Date.now },
    termina: { type: Date, default: null },
    activo: { type: Boolean, default: false, index: true },
    /** pending = solicitó; activo vía admin o pasarela (fase 2). */
    estatus: {
      type: String,
      enum: ['pending', 'activo', 'vencido', 'cancelado'],
      default: 'pending',
      index: true,
    },
    origen: {
      type: String,
      enum: ['manual', 'pasarela', 'solicitud'],
      default: 'solicitud',
    },
    notas: { type: String, default: '' },
    auto_renovar: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'suscripciones' }
);

schema.index({ id_empresa: 1, estatus: 1, activo: 1 });

export default mongoose.model('Suscripcion', schema);
