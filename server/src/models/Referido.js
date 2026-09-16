import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    referrerUserId: { type: String, required: true, index: true },
    referredUserId: { type: String },
    code: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'rewarded'],
      default: 'pending',
    },
    pointsAwarded: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'referidos' }
);

export default mongoose.model('Referido', schema);
