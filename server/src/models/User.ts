import mongoose, { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, type Role } from '../utils/constants.ts';

export interface Company {
  name?: string;
  website?: string;
  logoUrl?: string;
  about?: string;
}

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  headline?: string;
  bio?: string;
  skills: string[];
  location?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  savedJobs: Types.ObjectId[];
  company?: Company;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, object, IUserMethods>;
export type UserDoc = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
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
    savedJobs: [{ type: Schema.Types.ObjectId, ref: 'Job' }],
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

userSchema.method('comparePassword', function comparePassword(this: UserDoc, candidate: string) {
  return bcrypt.compare(candidate, this.password);
});

userSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret: Partial<IUser>) => {
    delete ret.password;
    return ret;
  },
});

export const User = mongoose.model<IUser, UserModel>('User', userSchema);
