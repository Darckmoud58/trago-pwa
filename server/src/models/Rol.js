import mongoose from 'mongoose';

/** Entidad ER: roles — usuarios tiene roles */
const schema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    codigo: { type: String, required: true, unique: true },
    estatus: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo',
    },
  },
  { timestamps: true, collection: 'roles' }
);

export default mongoose.model('Rol', schema);
