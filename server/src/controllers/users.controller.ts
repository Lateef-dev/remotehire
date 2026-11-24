import type { Request, Response } from 'express';
import { Job, User } from '../models/index.ts';
import { ApiError } from '../utils/ApiError.ts';
import { currentUser } from '../middleware/auth.ts';
import type { ProfileInput } from '../utils/schemas.ts';

const CANDIDATE_FIELDS = ['name', 'headline', 'bio', 'skills', 'location', 'resumeUrl', 'portfolioUrl'];
const EMPLOYER_FIELDS = ['name', 'company'];

export async function updateProfile(req: Request, res: Response) {
  const user = currentUser(req);
  const body = req.body as ProfileInput;
  const allowed = user.role === 'employer' ? EMPLOYER_FIELDS : CANDIDATE_FIELDS;
  const rejected = Object.keys(body).filter((k) => !allowed.includes(k));
  if (rejected.length) throw ApiError.badRequest(`These fields are not editable for your account: ${rejected.join(', ')}`);

  const { company, ...rest } = body;
  user.set(rest);
  if (company) {
    for (const [k, v] of Object.entries(company)) user.set(`company.${k}`, v);
  }
  await user.save();

  // Keep denormalised company details on the employer's jobs in sync.
  if (company && (company.name || company.logoUrl !== undefined)) {
    await Job.updateMany(
      { employer: user._id },
      { companyName: user.company?.name, companyLogoUrl: user.company?.logoUrl }
    );
  }

  res.json({ user });
}

export async function savedJobs(req: Request, res: Response) {
  const user = await User.findById(currentUser(req)._id).populate({
    path: 'savedJobs',
    select: '-description -requirements',
  });
  res.json({ jobs: user?.savedJobs ?? [] });
}

export async function saveJob(req: Request<{ jobId: string }>, res: Response) {
  if (!(await Job.exists({ _id: req.params.jobId }))) throw ApiError.notFound('Job not found');
  await User.updateOne({ _id: currentUser(req)._id }, { $addToSet: { savedJobs: req.params.jobId } });
  res.status(204).end();
}

export async function unsaveJob(req: Request<{ jobId: string }>, res: Response) {
  await User.updateOne({ _id: currentUser(req)._id }, { $pull: { savedJobs: req.params.jobId } });
  res.status(204).end();
}
