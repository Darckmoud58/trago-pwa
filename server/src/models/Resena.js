import mongoose from 'mongoose';

/**
 * Entidad ER: resenas
 * Relaciones: usuarios genera reseñas; reseñas tiene ubicaciones
 */
const schema = new mongoose.Schema(
  {
    calificacion: { type: Number, required: true, min: 1, max: 5 },
    comentario: { type: String, required: true, trim: true },
    id_usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    id_ubicacion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ubicacion',
      required: true,
      index: true,
    },
    id_promo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promocion',
      default: null,
    },
    puntos_otorgados: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'resenas' }
);

schema.index({ id_usuario: 1, id_ubicacion: 1, id_promo: 1 }, { unique: true });

export default mongoose.model('Resena', schema);
