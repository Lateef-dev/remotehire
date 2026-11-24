import mongoose from 'mongoose';
import { JOB_LEVELS, JOB_STATUSES, JOB_TYPES, REGIONS } from '../utils/constants.js';

const jobSchema = new mongoose.Schema(
  {
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    companyName: { type: String, required: true, trim: true, maxlength: 100 },
    companyLogoUrl: { type: String, trim: true },
    description: { type: String, required: true, maxlength: 10000 },
    requirements: [{ type: String, trim: true, maxlength: 300 }],
    type: { type: String, enum: JOB_TYPES, required: true },
    level: { type: String, enum: JOB_LEVELS, required: true },
    region: { type: String, enum: REGIONS, default: 'worldwide' },
    timezone: { type: String, trim: true, maxlength: 60 },
    salaryMin: { type: Number, min: 0 },
    salaryMax: { type: Number, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true, maxlength: 3 },
    tags: [{ type: String, trim: true, lowercase: true }],
    applyUrl: { type: String, trim: true },
    status: { type: String, enum: JOB_STATUSES, default: 'open', index: true },
    applicationsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

jobSchema.index({ tags: 1 });
jobSchema.index({ status: 1, createdAt: -1 });

jobSchema.set('toJSON', { versionKey: false });

export const Job = mongoose.model('Job', jobSchema);
