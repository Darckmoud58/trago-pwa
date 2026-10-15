import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: true },
  },
  { collection: 'rate_limits', timestamps: false }
);

/** TTL: Mongo borra el bucket al expirar. */
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RateLimit', schema);
