import mongoose from 'mongoose';

/** Entidad ER: niveles — usuarios tiene niveles */
const schema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' }, // en diagrama: decripcion (typo)
    pts_min: { type: Number, required: true, default: 0 },
    pts_max: { type: Number, default: null },
    beneficio: { type: String, default: '' },
    imagen: { type: String, default: '' },
    estado: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo',
    },
  },
  { timestamps: true, collection: 'niveles' }
);

export default mongoose.model('Nivel', schema);
