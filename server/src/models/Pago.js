import mongoose from 'mongoose';

/**
 * Pagos de suscripción (sandbox TraGo o Mercado Pago).
 * Colección: pagos
 */
const schema = new mongoose.Schema(
  {
    id_empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
      index: true,
    },
    id_suscripcion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Suscripcion',
      default: null,
      index: true,
    },
    plan: {
      type: String,
      enum: ['basic', 'campaign', 'pro', 'premium'],
      required: true,
    },
    /** Sucursales incluidas en el cálculo del monto. */
    sucursales: { type: Number, default: 1, min: 1 },
    /** Campo publicitario que compra este pago. */
    slot: { type: String, default: '' },
    monto: { type: Number, required: true, min: 0 },
    moneda: { type: String, default: 'MXN' },
    dias: { type: Number, default: 30, min: 1 },
    estatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    provider: {
      type: String,
      enum: ['sandbox', 'mercadopago', 'paypal', 'manual'],
      default: 'sandbox',
      index: true,
    },
    /** Preferencia / payment id del proveedor. */
    provider_ref: { type: String, default: '', index: true },
    checkout_url: { type: String, default: '' },
    /** Token opaco para aprobar sandbox sin JWT en redirects. */
    sandbox_token: { type: String, default: '', index: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    pagado_en: { type: Date, default: null },
  },
  { timestamps: true, collection: 'pagos' }
);

schema.index({ id_empresa: 1, estatus: 1, createdAt: -1 });

export default mongoose.model('Pago', schema);
