import mongoose from 'mongoose';

/**
 * Entidad ER: cupones
 * Relación: promociones contiene cupones
 */
const schema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true, trim: true },
    qr_codigo: { type: String, default: '' },
    tipo_codigo: {
      type: String,
      enum: ['qr', 'alfanumerico', 'barra'],
      default: 'qr',
    },
    valor: { type: Number, required: true, default: 0 },
    tipo_valor: {
      type: String,
      enum: ['porcentaje', 'monto', 'puntos', 'producto'],
      default: 'porcentaje',
    },
    min_valor: { type: Number, default: 0 },
    max_valor: { type: Number, default: null },
    existencia: { type: Number, default: 0 },
    max_per: { type: Number, default: 1 },
    url_image_codigo: { type: String, default: '' },
    fuente: { type: String, default: '' },
    verificado: { type: Boolean, default: false },
    estatus: {
      type: String,
      enum: ['activo', 'canjeado', 'caduco', 'agotado'],
      default: 'activo',
    },
    id_promo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promocion',
      required: true,
      index: true,
    },
  },
  { timestamps: true, collection: 'cupones' }
);

export default mongoose.model('Cupon', schema);
