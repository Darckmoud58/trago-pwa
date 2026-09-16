import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    mark: { type: String, default: '' },
    markColor: { type: String, default: '#333' },
    website: { type: String, default: '' },
    tier: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
    publishesPromos: { type: Boolean, default: true },
    hasApiAccess: { type: Boolean, default: false },
    showAds: { type: Boolean, default: true },
    ownerUserId: { type: String },
    categoriaId: { type: String },
    suscripcionId: { type: String },
  },
  { timestamps: true, collection: 'negocios' }
);

export default mongoose.model('Negocio', schema);
