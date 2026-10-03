import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  places: { type: [mongoose.Schema.Types.Mixed], default: [] },
  fetchedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
}, { collection: 'nearby_place_cache' });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('NearbyPlaceCache', schema);
