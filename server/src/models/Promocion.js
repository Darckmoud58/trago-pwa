import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    chainId: { type: String, required: true, index: true },
    chainName: { type: String, default: '' },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    kind: { type: String, required: true },
    categoriaId: { type: String },
    fuenteId: { type: String },
    isNocturno: { type: Boolean, default: false },
    alcohol: { type: Boolean, default: false },
    audience: { type: String, enum: ['all', 'adult'], default: 'all' },
    isBirthday: { type: Boolean, default: false },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    terms: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    sourceUrl: String,
    sourceLabel: String,
    origin: { type: String, enum: ['official', 'chain', 'demo'], default: 'demo' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'promociones' }
);

export default mongoose.model('Promocion', schema);
