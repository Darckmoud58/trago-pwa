import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    code: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    costPoints: { type: Number, required: true },
    promocionId: String,
    redeemedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: ['active', 'redeemed', 'expired'], default: 'active' },
  },
  { timestamps: true, collection: 'cupones' }
);

export default mongoose.model('Cupon', schema);
