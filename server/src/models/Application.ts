import mongoose, { Schema, type Types } from 'mongoose';
import { APPLICATION_STATUSES, type ApplicationStatus } from '../utils/constants.ts';

export interface IApplication {
  job: Types.ObjectId;
  candidate: Types.ObjectId;
  employer: Types.ObjectId;
  coverLetter?: string;
  /** Either a link or an uploaded file (or both) identifies the resume. */
  resumeUrl?: string;
  resumeFile?: { fileId: Types.ObjectId; name: string };
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
    resumeUrl: { type: String, trim: true },
    resumeFile: {
      type: new Schema({ fileId: { type: Schema.Types.ObjectId, required: true, index: true }, name: { type: String, required: true } }, { _id: false }),
      default: undefined,
    },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'submitted' },
  },
  { timestamps: true }
);

applicationSchema.pre('validate', function requireResume() {
  if (!this.resumeUrl && !this.resumeFile) this.invalidate('resumeUrl', 'A resume link or file is required');
});

// One application per candidate per job.
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

applicationSchema.set('toJSON', { versionKey: false });

export const Application = mongoose.model<IApplication>('Application', applicationSchema);
