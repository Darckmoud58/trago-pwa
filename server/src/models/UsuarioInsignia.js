import mongoose from 'mongoose';

/** Relación ER N:M: usuarios —tiene— insignias */
const schema = new mongoose.Schema(
  {
    id_usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    id_insignia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Insignia',
      required: true,
    },
    obtenida_en: { type: Date, default: Date.now },
    puntos_otorgados: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'usuario_insignias' }
);

schema.index({ id_usuario: 1, id_insignia: 1 }, { unique: true });

export default mongoose.model('UsuarioInsignia', schema);
