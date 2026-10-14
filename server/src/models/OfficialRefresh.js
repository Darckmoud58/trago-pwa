import mongoose from 'mongoose';

/** Estado del job de scrapers (compartido entre server.js y Netlify Functions). */
const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    at: { type: Date, default: null },
    sources: { type: Array, default: [] },
    error: { type: String, default: null },
  },
  { collection: 'official_refresh', timestamps: true }
);

export default mongoose.model('OfficialRefresh', schema);
