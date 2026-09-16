import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    minPoints: { type: Number, required: true },
    maxPoints: { type: Number, default: null },
    benefits: [{ type: String }],
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'niveles' }
);

export default mongoose.model('Nivel', schema);
