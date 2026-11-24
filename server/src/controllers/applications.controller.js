import { Application, Job } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const WITHDRAWABLE = ['submitted', 'reviewing'];

export async function applyToJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found');
  if (job.status !== 'open') throw ApiError.badRequest('This job is no longer accepting applications');

  const resumeUrl = req.body.resumeUrl || req.user.resumeUrl;
  if (!resumeUrl) throw ApiError.badRequest('Add a resume link to your profile or include one with your application');

  if (await Application.exists({ job: job._id, candidate: req.user._id })) {
    throw ApiError.conflict('You have already applied to this job');
  }

  const application = await Application.create({
    job: job._id,
    candidate: req.user._id,
    employer: job.employer,
    coverLetter: req.body.coverLetter,
    resumeUrl,
  });
  await Job.updateOne({ _id: job._id }, { $inc: { applicationsCount: 1 } });

  res.status(201).json({ application });
}

export async function myApplications(req, res) {
  const applications = await Application.find({ candidate: req.user._id })
    .sort({ createdAt: -1 })
    .populate('job', 'title companyName companyLogoUrl type level region status salaryMin salaryMax currency');
  res.json({ applications });
}

export async function jobApplications(req, res) {
  const job = await Job.findById(req.params.id).select('employer title');
  if (!job) throw ApiError.notFound('Job not found');
  if (!job.employer.equals(req.user._id)) throw ApiError.forbidden('You can only view applicants for your own jobs');

  const filter = { job: job._id };
  if (req.query.status) filter.status = String(req.query.status);

  const applications = await Application.find(filter)
    .sort({ createdAt: -1 })
    .populate('candidate', 'name email headline skills location portfolioUrl');
  res.json({ job, applications });
}

export async function updateApplicationStatus(req, res) {
  const application = await Application.findById(req.params.id);
  if (!application) throw ApiError.notFound('Application not found');
  if (!application.employer.equals(req.user._id)) throw ApiError.forbidden();
  application.status = req.body.status;
  await application.save();
  res.json({ application });
}

export async function withdrawApplication(req, res) {
  const application = await Application.findById(req.params.id);
  if (!application) throw ApiError.notFound('Application not found');
  if (!application.candidate.equals(req.user._id)) throw ApiError.forbidden();
  if (!WITHDRAWABLE.includes(application.status)) {
    throw ApiError.badRequest('Applications can only be withdrawn before a decision is made');
  }
  await application.deleteOne();
  await Job.updateOne({ _id: application.job, applicationsCount: { $gt: 0 } }, { $inc: { applicationsCount: -1 } });
  res.status(204).end();
}
