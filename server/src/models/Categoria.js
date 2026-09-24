import mongoose from 'mongoose';

/** Entidad ER: categorias — empresas/promociones tienen categorias */
const schema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    ambito: {
      type: String,
      enum: ['empresa', 'promocion', 'ambos'],
      default: 'ambos',
    },
    estatus: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo',
    },
  },
  { timestamps: true, collection: 'categorias' }
);

export default mongoose.model('Categoria', schema);
