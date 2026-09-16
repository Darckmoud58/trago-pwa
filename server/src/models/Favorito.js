import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    targetType: { type: String, enum: ['promocion', 'sucursal', 'negocio'], required: true },
    targetId: { type: String, required: true },
  },
  { timestamps: true, collection: 'favoritos' }
);

schema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

export default mongoose.model('Favorito', schema);
