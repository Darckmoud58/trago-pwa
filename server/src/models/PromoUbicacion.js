import mongoose from 'mongoose';

/** Relación promo ↔ ubicación (vigencia GPS TraGo) */
const schema = new mongoose.Schema(
  {
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
    activa_oficial: { type: Boolean, default: true },
    reportes_vigente: { type: Number, default: 0 },
    reportes_caduco: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'promo_ubicaciones' }
);

schema.index({ id_promo: 1, id_ubicacion: 1 }, { unique: true });

export default mongoose.model('PromoUbicacion', schema);
