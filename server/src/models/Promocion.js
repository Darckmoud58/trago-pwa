import mongoose from 'mongoose';

/**
 * Entidad ER: promociones
 * Relaciones: empresas genera; contiene cupones; tiene categorias; usuarios canjea
 */
const schema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    politicas: { type: String, default: '' },
    imagen: { type: String, default: '' },
    origen: {
      type: String,
      enum: ['oficial', 'empresa', 'demo', 'usuario'],
      default: 'demo',
    },
    url_fuente: { type: String, default: '' },
    puntos: { type: Number, default: 0 },
    id_empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
      index: true,
    },
    id_categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria',
      default: null,
    },
    // extras PWA
    slug: { type: String, sparse: true, unique: true },
    inicia_en: { type: Date, default: null },
    termina_en: { type: Date, default: null },
    alcohol: { type: Boolean, default: false },
    nocturno: { type: Boolean, default: false },
    cumpleanos: { type: Boolean, default: false },
    audiencia: { type: String, enum: ['todos', 'adulto'], default: 'todos' },
    destacada: { type: Boolean, default: false },
    estatus: {
      type: String,
      enum: ['activo', 'inactivo', 'caduco'],
      default: 'activo',
    },
  },
  { timestamps: true, collection: 'promociones' }
);

export default mongoose.model('Promocion', schema);
