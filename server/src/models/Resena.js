import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    promoId: { type: String, required: true },
    branchId: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, required: true },
    textHash: { type: String, required: true },
    nearStore: { type: Boolean, default: false },
    pointsAwarded: { type: Number, default: 0 },
    lat: Number,
    lng: Number,
  },
  { timestamps: true, collection: 'resenas' }
);

schema.index({ userId: 1, promoId: 1, branchId: 1 }, { unique: true });

export default mongoose.model('Resena', schema);
