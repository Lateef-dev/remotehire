import mongoose, { Schema, type Types } from 'mongoose';
import { APPLICATION_STATUSES, type ApplicationStatus } from '../utils/constants.ts';

export interface IApplication {
  job: Types.ObjectId;
  candidate: Types.ObjectId;
  employer: Types.ObjectId;
  coverLetter?: string;
  resumeUrl: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    candidate: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    coverLetter: { type: String, trim: true, maxlength: 5000 },
    resumeUrl: { type: String, trim: true, required: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'submitted' },
  },
  { timestamps: true }
);

// One application per candidate per job.
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

applicationSchema.set('toJSON', { versionKey: false });

export const Application = mongoose.model<IApplication>('Application', applicationSchema);
