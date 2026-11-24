import mongoose from 'mongoose';
import { APPLICATION_STATUSES } from '../utils/constants.js';

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    coverLetter: { type: String, trim: true, maxlength: 5000 },
    resumeUrl: { type: String, trim: true, required: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'submitted' },
  },
  { timestamps: true }
);

// One application per candidate per job.
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

applicationSchema.set('toJSON', { versionKey: false });

export const Application = mongoose.model('Application', applicationSchema);
