import mongoose from 'mongoose';

/**
 * Eventos de la métrica norte TraGo:
 * sesiones con GPS × promo abierta × sucursal vista.
 */
const EVENT_TYPES = [
  'gps_ok',
  'gps_fail',
  'cerca_open',
  'promo_open',
  'sucursal_vista',
];

const schema = new mongoose.Schema(
  {
    tipo: { type: String, enum: EVENT_TYPES, required: true, index: true },
    sessionId: { type: String, required: true, index: true, trim: true },
    id_usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null,
      index: true,
    },
    id_promo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promocion',
      default: null,
      index: true,
    },
    id_ubicacion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ubicacion',
      default: null,
    },
    id_empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      default: null,
      index: true,
    },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    path: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'eventos_metrica' }
);

schema.index({ createdAt: -1 });
schema.index({ tipo: 1, createdAt: -1 });
schema.index({ sessionId: 1, tipo: 1, createdAt: -1 });

export const METRICA_EVENT_TYPES = EVENT_TYPES;
export default mongoose.model('EventoMetrica', schema);
