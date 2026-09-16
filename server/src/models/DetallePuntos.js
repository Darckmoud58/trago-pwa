import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    delta: { type: Number, required: true },
    reason: {
      type: String,
      enum: ['vote', 'review', 'redeem', 'referral', 'badge', 'signup'],
      required: true,
    },
    refKey: { type: String, required: true, unique: true },
    meta: { type: Map, of: String },
  },
  { timestamps: true, collection: 'detallesPuntos' }
);

export default mongoose.model('DetallePuntos', schema);
