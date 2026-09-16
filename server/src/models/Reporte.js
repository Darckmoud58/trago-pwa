import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    promoId: { type: String, required: true },
    branchId: { type: String, required: true },
    stillValid: { type: Boolean, required: true },
    motivo: String,
    lat: Number,
    lng: Number,
  },
  { timestamps: true, collection: 'reportes' }
);

schema.index({ userId: 1, promoId: 1, branchId: 1 }, { unique: true });

export default mongoose.model('Reporte', schema);
