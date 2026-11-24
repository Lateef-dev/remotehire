import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, required: true },
    // Candidate profile
    headline: { type: String, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 2000 },
    skills: [{ type: String, trim: true, lowercase: true }],
    location: { type: String, trim: true, maxlength: 80 },
    resumeUrl: { type: String, trim: true },
    portfolioUrl: { type: String, trim: true },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    // Employer profile
    company: {
      name: { type: String, trim: true, maxlength: 100 },
      website: { type: String, trim: true },
      logoUrl: { type: String, trim: true },
      about: { type: String, trim: true, maxlength: 2000 },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
