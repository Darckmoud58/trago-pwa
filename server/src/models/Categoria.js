import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    scope: { type: String, enum: ['venue', 'promo'], required: true },
    alcoholAllowed: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'categorias' }
);

schema.index({ code: 1, scope: 1 }, { unique: true });

export default mongoose.model('Categoria', schema);
