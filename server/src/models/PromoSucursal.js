import mongoose from 'mongoose';

/** Relación promo ↔ sucursal + contadores de vigencia (núcleo GPS TraGo). */
const schema = new mongoose.Schema(
  {
    promoId: { type: String, required: true },
    branchId: { type: String, required: true },
    officialActive: { type: Boolean, default: true },
    reportsVigente: { type: Number, default: 0 },
    reportsCaduco: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'promoSucursales' }
);

schema.index({ promoId: 1, branchId: 1 }, { unique: true });

export default mongoose.model('PromoSucursal', schema);
