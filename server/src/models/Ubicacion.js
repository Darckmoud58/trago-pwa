import mongoose from 'mongoose';

/**
 * Entidad ER: ubicaciones (sucursales / puntos físicos)
 * Relaciones: empresas tiene ubicaciones; usuarios tiene ubicaciones; reseñas tiene ubicaciones
 */
const schema = new mongoose.Schema(
  {
    calle: { type: String, required: true, trim: true },
    num_ext: { type: String, default: '' },
    num_int: { type: String, default: '' },
    colonia: { type: String, default: '', trim: true },
    municipio: { type: String, default: 'Guadalajara', trim: true },
    estado: { type: String, default: 'Jalisco', trim: true },
    lat: { type: Number, required: true },
    long: { type: Number, required: true },
    // GeoJSON para $geoNear (mismo patrón cerca GPS)
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [long, lat]
    },
    id_empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
      index: true,
    },
    nombre: { type: String, default: '', trim: true },
    slug: { type: String, sparse: true, unique: true },
    horario: { type: String, default: '' },
    imagen: { type: String, default: '' },
    estatus: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo',
    },
  },
  { timestamps: true, collection: 'ubicaciones' }
);

schema.index({ location: '2dsphere' });

export default mongoose.model('Ubicacion', schema);
