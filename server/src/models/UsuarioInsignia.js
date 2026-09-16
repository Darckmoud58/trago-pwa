import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    insigniaId: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
    pointsAwarded: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'usuarioInsignias' }
);

schema.index({ userId: 1, insigniaId: 1 }, { unique: true });

export default mongoose.model('UsuarioInsignia', schema);
