import mongoose, { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { ROLES, type Role } from '../utils/constants.ts';

export interface Company {
  name?: string;
  website?: string;
  logoUrl?: string;
  about?: string;
}

export interface ResumeFile {
  fileId: Types.ObjectId;
  name: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
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
  resumeFile?: ResumeFile;
  portfolioUrl?: string;
  savedJobs: Types.ObjectId[];
  company?: Company;
  /** Bumped on every password change; JWTs carry it, so older sessions stop working. */
  sessionVersion: number;
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
  createPasswordResetToken(): string;
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
    resumeFile: {
      type: new Schema<ResumeFile>(
        {
          fileId: { type: Schema.Types.ObjectId, required: true },
          name: { type: String, required: true },
          size: { type: Number, required: true },
          contentType: { type: String, required: true },
          uploadedAt: { type: Date, required: true },
        },
        { _id: false }
      ),
      default: undefined,
    },
    portfolioUrl: { type: String, trim: true },
    savedJobs: [{ type: Schema.Types.ObjectId, ref: 'Job' }],
    // Auth housekeeping (never sent to clients)
    sessionVersion: { type: Number, default: 0, select: false },
    passwordResetTokenHash: { type: String, select: false, index: true },
    passwordResetExpires: { type: Date, select: false },
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

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export const hashResetToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  // Every session issued before this change becomes invalid.
  if (!this.isNew) this.sessionVersion = (this.sessionVersion ?? 0) + 1;
});

userSchema.method('comparePassword', function comparePassword(this: UserDoc, candidate: string) {
  return bcrypt.compare(candidate, this.password);
});

/** Creates a single-use reset token. Only its SHA-256 hash is stored; the raw token goes in the email. */
userSchema.method('createPasswordResetToken', function createPasswordResetToken(this: UserDoc) {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetTokenHash = hashResetToken(token);
  this.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  return token;
});

userSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret: Partial<IUser>) => {
    delete ret.password;
    delete ret.sessionVersion;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    return ret;
  },
});

export const User = mongoose.model<IUser, UserModel>('User', userSchema);
