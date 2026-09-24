import mongoose from 'mongoose';

/** Relación ER: usuarios —canjea— promociones */
const schema = new mongoose.Schema(
  {
    id_usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    id_promo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promocion',
      required: true,
      index: true,
    },
    id_cupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cupon',
      default: null,
    },
    id_ubicacion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ubicacion',
      default: null,
    },
    canjeado_en: { type: Date, default: Date.now },
    puntos_usados: { type: Number, default: 0 },
    estatus: {
      type: String,
      enum: ['pendiente', 'completado', 'cancelado'],
      default: 'completado',
    },
  },
  { timestamps: true, collection: 'canjes' }
);

export default mongoose.model('Canje', schema);
