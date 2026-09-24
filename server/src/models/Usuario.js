import mongoose from 'mongoose';

/**
 * Entidad ER: usuarios
 * Relaciones: tiene roles, niveles, insignias, ubicaciones; canjea promociones; genera reseñas
 */
const schema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    ape_paterno: { type: String, default: '', trim: true },
    ape_materno: { type: String, default: '', trim: true },
    correo: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    edad: { type: Number, required: true, min: 13 },
    puntos: { type: Number, default: 0 },
    estatus: {
      type: String,
      enum: ['activo', 'inactivo', 'bloqueado'],
      default: 'activo',
    },
    token_login: { type: String, default: null },
    // FKs del diagrama
    id_rol: { type: mongoose.Schema.Types.ObjectId, ref: 'Rol', default: null },
    id_nivel: { type: mongoose.Schema.Types.ObjectId, ref: 'Nivel', default: null },
    // Extra clase TraGo (18+)
    fecha_nacimiento: { type: Date, default: null },
  },
  { timestamps: true, collection: 'usuarios' }
);

export default mongoose.model('Usuario', schema);
