import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['official', 'chain', 'user', 'demo'], required: true },
    baseUrl: String,
    active: { type: Boolean, default: true },
    notes: String,
  },
  { timestamps: true, collection: 'fuentesPromociones' }
);

schema.index({ type: 1, name: 1 }, { unique: true });

export default mongoose.model('FuentePromocion', schema);
