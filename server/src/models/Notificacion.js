import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['push', 'email', 'in_app', 'birthday', 'promo', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    data: { type: Map, of: String },
  },
  { timestamps: true, collection: 'notificaciones' }
);

export default mongoose.model('Notificacion', schema);
