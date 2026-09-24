import mongoose from 'mongoose';

/** Entidad ER: insignias — usuarios tiene insignias (N:M vía usuario_insignias) */
const schema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    imagen: { type: String, default: '' },
    puntos: { type: Number, default: 0 },
    estatus: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo',
    },
  },
  { timestamps: true, collection: 'insignias' }
);

export default mongoose.model('Insignia', schema);
