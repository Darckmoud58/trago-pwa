import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    suscripcionId: { type: String, required: true, index: true },
    negocioId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'MXN' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    provider: String,
    providerRef: String,
    paidAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'pagosSuscripcion' }
);

export default mongoose.model('PagoSuscripcion', schema);
