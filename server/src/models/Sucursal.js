import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    chainId: { type: String, required: true, index: true },
    chainName: { type: String, default: '' },
    name: { type: String, required: true },
    kind: { type: String, required: true },
    categoriaId: { type: String },
    address: { type: String, required: true },
    colonia: { type: String, default: '' },
    city: { type: String, default: 'Guadalajara' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    hours: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'sucursales' }
);

schema.index({ location: '2dsphere' });

export default mongoose.model('Sucursal', schema);
