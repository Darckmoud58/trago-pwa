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
    /** Dueño del panel cadena (rol empresa). */
    id_dueno: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null,
      index: true,
    },
    /** Solo cadenas verificadas por admin entran al catálogo público (como oficial). */
    verificada: { type: Boolean, default: false, index: true },
    plan: {
      type: String,
      enum: ['freemium', 'pro', 'premium'],
      default: 'freemium',
    },
    estatus: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo',
    },
  },
  { timestamps: true, collection: 'empresas' }
);

export default mongoose.model('Empresa', schema);
