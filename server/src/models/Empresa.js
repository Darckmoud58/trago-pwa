import mongoose from 'mongoose';

/**
 * Entidad ER: empresas
 * Relaciones: genera promociones; tiene categorias; tiene ubicaciones
 */
const schema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    imagen: { type: String, default: '' },
    id_categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria',
      default: null,
    },
    // extras útiles PWA (no rompen el ER)
    slug: { type: String, sparse: true, unique: true },
    sitio_web: { type: String, default: '' },
    estatus: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo',
    },
  },
  { timestamps: true, collection: 'empresas' }
);

export default mongoose.model('Empresa', schema);
