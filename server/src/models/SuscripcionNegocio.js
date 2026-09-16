import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    negocioId: { type: String, required: true, index: true },
    plan: { type: String, enum: ['free', 'pro', 'premium'], required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    autoRenew: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'suscripcionesNegocio' }
);

export default mongoose.model('SuscripcionNegocio', schema);
