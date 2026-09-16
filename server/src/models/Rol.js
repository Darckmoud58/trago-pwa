import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, enum: ['user', 'chain', 'admin'] },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    permissions: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'roles' }
);

export default mongoose.model('Rol', schema);
