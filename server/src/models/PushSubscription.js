import mongoose from 'mongoose';

/**
 * Suscripciones Web Push (colección pushSubs — mismo rol que Todo_pwa / legacy).
 */
const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true, collection: 'pushSubs' }
);

export default mongoose.model('PushSubscription', schema);
