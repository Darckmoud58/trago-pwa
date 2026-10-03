import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  targetType: { type: String, enum: ['ubicacion', 'empresa'], required: true },
  targetId: { type: String, required: true },
  nombre: { type: String, required: true, trim: true },
  subtitulo: { type: String, default: '' },
  direccion: { type: String, default: '' },
  colonia: { type: String, default: '' },
  municipio: { type: String, default: '' },
  horario: { type: String, default: '' },
  imagen: { type: String, default: '' },
  savedAt: { type: Date, default: Date.now },
}, { timestamps: true, collection: 'favoritos' });

schema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

export default mongoose.model('Favorito', schema);
