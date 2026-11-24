import mongoose, { Schema, type HydratedDocument, type Types } from 'mongoose';
import {
  JOB_LEVELS,
  JOB_STATUSES,
  JOB_TYPES,
  REGIONS,
  type JobLevel,
  type JobStatus,
  type JobType,
  type Region,
} from '../utils/constants.ts';

export interface IJob {
  employer: Types.ObjectId;
  title: string;
  companyName: string;
  companyLogoUrl?: string;
  description: string;
  requirements: string[];
  type: JobType;
  level: JobLevel;
  region: Region;
  timezone?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  tags: string[];
  applyUrl?: string;
  status: JobStatus;
  applicationsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type JobDoc = HydratedDocument<IJob>;

const jobSchema = new Schema<IJob>(
  {
    employer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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

export const Job = mongoose.model<IJob>('Job', jobSchema);
