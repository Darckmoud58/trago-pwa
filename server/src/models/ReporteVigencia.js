import mongoose from 'mongoose';

/**
 * Voto de vigencia en piso (un voto por usuario × promo × sucursal).
 * Contadores agregados viven en PromoUbicacion; este doc es la fuente.
 */
const schema = new mongoose.Schema(
  {
    id_usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    id_promo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promocion',
      required: true,
    },
    id_ubicacion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ubicacion',
      required: true,
    },
    sigue_vigente: { type: Boolean, required: true },
    lat: { type: Number, required: true },
    long: { type: Number, required: true },
    distancia_m: { type: Number, required: true },
  },
  { timestamps: true, collection: 'reportes_vigencia' }
);

schema.index(
  { id_usuario: 1, id_promo: 1, id_ubicacion: 1 },
  { unique: true }
);
schema.index({ id_promo: 1, id_ubicacion: 1, updatedAt: -1 });

export default mongoose.model('ReporteVigencia', schema);
