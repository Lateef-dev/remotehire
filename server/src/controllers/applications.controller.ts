import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import { deleteResumeIfUnused } from './resumes.controller.ts';
import { Application, Job } from '../models/index.ts';
import { ApiError } from '../utils/ApiError.ts';
import { currentUser } from '../middleware/auth.ts';
import { APPLICATION_STATUSES, type ApplicationStatus } from '../utils/constants.ts';
import type { ApplicationStatusInput, ApplyInput } from '../utils/schemas.ts';

type IdParams = { id: string };

const WITHDRAWABLE: ApplicationStatus[] = ['submitted', 'reviewing'];

export async function applyToJob(req: Request<IdParams>, res: Response) {
  const candidate = currentUser(req);
  const body = req.body as ApplyInput;
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found');
  if (job.status !== 'open') throw ApiError.badRequest('This job is no longer accepting applications');

  const source = body.resumeSource ?? (body.resumeUrl ? 'link' : candidate.resumeFile ? 'file' : 'link');
  let resumeUrl: string | undefined;
  let resumeFile: { fileId: Types.ObjectId; name: string } | undefined;
  if (source === 'file') {
    if (!candidate.resumeFile) throw ApiError.badRequest('Upload your resume first');
    resumeFile = { fileId: candidate.resumeFile.fileId, name: candidate.resumeFile.name };
  } else {
    resumeUrl = body.resumeUrl || candidate.resumeUrl;
    if (!resumeUrl) throw ApiError.badRequest('Upload your resume or add a link to it');
  }

  if (await Application.exists({ job: job._id, candidate: candidate._id })) {
    throw ApiError.conflict('You have already applied to this job');
  }

  const application = await Application.create({
    job: job._id,
    candidate: candidate._id,
    employer: job.employer,
    coverLetter: body.coverLetter,
    resumeUrl,
    resumeFile,
  });
  await Job.updateOne({ _id: job._id }, { $inc: { applicationsCount: 1 } });

  res.status(201).json({ application });
}

export async function myApplications(req: Request, res: Response) {
  const applications = await Application.find({ candidate: currentUser(req)._id })
    .sort({ createdAt: -1 })
    .populate('job', 'title companyName companyLogoUrl type level region status salaryMin salaryMax currency');
  res.json({ applications });
}

export async function jobApplications(req: Request<IdParams>, res: Response) {
  const job = await Job.findById(req.params.id).select('employer title');
  if (!job) throw ApiError.notFound('Job not found');
  if (!job.employer.equals(currentUser(req)._id)) throw ApiError.forbidden('You can only view applicants for your own jobs');

  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  if (status && !APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
    throw ApiError.badRequest(`status must be one of: ${APPLICATION_STATUSES.join(', ')}`);
  }

  const applications = await Application.find({ job: job._id, ...(status && { status: status as ApplicationStatus }) })
    .sort({ createdAt: -1 })
    .populate('candidate', 'name email headline skills location portfolioUrl');
  res.json({ job, applications });
}

export async function updateApplicationStatus(req: Request<IdParams>, res: Response) {
  const application = await Application.findById(req.params.id);
  if (!application) throw ApiError.notFound('Application not found');
  if (!application.employer.equals(currentUser(req)._id)) throw ApiError.forbidden();
  application.status = (req.body as ApplicationStatusInput).status;
  await application.save();
  res.json({ application });
}

export async function withdrawApplication(req: Request<IdParams>, res: Response) {
  const application = await Application.findById(req.params.id);
  if (!application) throw ApiError.notFound('Application not found');
  if (!application.candidate.equals(currentUser(req)._id)) throw ApiError.forbidden();
  if (!WITHDRAWABLE.includes(application.status)) {
    throw ApiError.badRequest('Applications can only be withdrawn before a decision is made');
  }
  await application.deleteOne();
  if (application.resumeFile) await deleteResumeIfUnused(application.resumeFile.fileId);
  await Job.updateOne({ _id: application.job, applicationsCount: { $gt: 0 } }, { $inc: { applicationsCount: -1 } });
  res.status(204).end();
}
