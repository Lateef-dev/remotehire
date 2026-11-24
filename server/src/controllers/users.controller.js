import { Job, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const CANDIDATE_FIELDS = ['name', 'headline', 'bio', 'skills', 'location', 'resumeUrl', 'portfolioUrl'];
const EMPLOYER_FIELDS = ['name', 'company'];

export async function updateProfile(req, res) {
  const allowed = req.user.role === 'employer' ? EMPLOYER_FIELDS : CANDIDATE_FIELDS;
  const rejected = Object.keys(req.body).filter((k) => !allowed.includes(k));
  if (rejected.length) throw ApiError.badRequest(`These fields are not editable for your account: ${rejected.join(', ')}`);

  const { company, ...rest } = req.body;
  req.user.set(rest);
  if (company) {
    for (const [k, v] of Object.entries(company)) req.user.set(`company.${k}`, v);
  }
  await req.user.save();

  // Keep denormalised company details on the employer's jobs in sync.
  if (company && (company.name || company.logoUrl !== undefined)) {
    await Job.updateMany(
      { employer: req.user._id },
      { companyName: req.user.company.name, companyLogoUrl: req.user.company.logoUrl }
    );
  }

  res.json({ user: req.user });
}

export async function savedJobs(req, res) {
  const user = await User.findById(req.user._id).populate({
    path: 'savedJobs',
    select: '-description -requirements',
  });
  res.json({ jobs: user.savedJobs });
}

export async function saveJob(req, res) {
  if (!(await Job.exists({ _id: req.params.jobId }))) throw ApiError.notFound('Job not found');
  await User.updateOne({ _id: req.user._id }, { $addToSet: { savedJobs: req.params.jobId } });
  res.status(204).end();
}

export async function unsaveJob(req, res) {
  await User.updateOne({ _id: req.user._id }, { $pull: { savedJobs: req.params.jobId } });
  res.status(204).end();
}
