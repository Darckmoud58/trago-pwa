import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, sparse: true },
    profile: {
      name: { type: String, required: true, trim: true },
      picture: String,
    },
    age: {
      birthDate: { type: Date, required: true },
      yearsAtSignup: { type: Number, required: true },
      confirmed18: { type: Boolean, required: true },
      confirmedAt: { type: Date, required: true },
      band: { type: String, enum: ['teen', 'adult'] },
    },
    role: { type: String, enum: ['user', 'chain'], default: 'user' },
    roleId: { type: String },
    nivelId: { type: String },
    points: { type: Number, default: 0 },
    referralCode: { type: String, sparse: true },
    referredByUserId: { type: String },
    twoFactorEmail: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'usuarios' }
);

export default mongoose.model('Usuario', schema);
