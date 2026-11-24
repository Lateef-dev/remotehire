import mongoose from 'mongoose';
import { Application, Job, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { JOB_LEVELS, JOB_TYPES, REGIONS, APPLICATION_STATUSES } from '../utils/constants.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildJobFilter({ q, type, level, region, tags, minSalary }) {
  const filter = { status: 'open' };
  if (q) {
    // Prefix-friendly search across the fields candidates actually scan.
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { companyName: rx }, { tags: q.toLowerCase() }, { description: rx }];
  }
  if (type.length) filter.type = { $in: type };
  if (level.length) filter.level = { $in: level };
  // Worldwide roles are open to everyone, so they match any region filter.
  if (region.length) filter.region = { $in: [...new Set([...region, 'worldwide'])] };
  if (tags.length) filter.tags = { $all: tags };
  if (minSalary !== undefined) filter.salaryMax = { $gte: minSalary };
  return filter;
}

export async function listJobs(req, res) {
  const query = req.validatedQuery;
  const filter = buildJobFilter(query);
  const sort = query.sort === 'salary' ? { salaryMax: -1, createdAt: -1 } : { createdAt: -1 };
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Job.find(filter).sort(sort).skip(skip).limit(query.limit).select('-description -requirements').lean(),
    Job.countDocuments(filter),
  ]);

  res.json({
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  });
}

export async function getJob(req, res) {
  const job = await Job.findById(req.params.id).populate('employer', 'name company');
  if (!job) throw ApiError.notFound('Job not found');

  const isOwner = req.user && job.employer._id.equals(req.user._id);
  // Closed jobs stay viewable so shared links keep working; the client shows them as closed.
  let viewer = null;
  if (req.user?.role === 'candidate') {
    const application = await Application.findOne({ job: job._id, candidate: req.user._id }).select('status createdAt');
    viewer = {
      hasApplied: !!application,
      applicationStatus: application?.status ?? null,
      isSaved: req.user.savedJobs.some((id) => id.equals(job._id)),
    };
  } else if (isOwner) {
    viewer = { isOwner: true };
  }

  res.json({ job, viewer });
}

export async function createJob(req, res) {
  const employer = req.user;
  const job = await Job.create({
    ...req.body,
    employer: employer._id,
    companyName: employer.company?.name ?? employer.name,
    companyLogoUrl: employer.company?.logoUrl,
  });
  res.status(201).json({ job });
}

async function findOwnedJob(req) {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found');
  if (!job.employer.equals(req.user._id)) throw ApiError.forbidden('You can only manage jobs you posted');
  return job;
}

export async function updateJob(req, res) {
  const job = await findOwnedJob(req);
  job.set(req.body);
  if (job.salaryMin !== undefined && job.salaryMax !== undefined && job.salaryMin > job.salaryMax) {
    throw ApiError.badRequest('salaryMin cannot be greater than salaryMax');
  }
  await job.save();
  res.json({ job });
}

export async function deleteJob(req, res) {
  const job = await findOwnedJob(req);
  await Promise.all([
    Application.deleteMany({ job: job._id }),
    User.updateMany({ savedJobs: job._id }, { $pull: { savedJobs: job._id } }),
    job.deleteOne(),
  ]);
  res.status(204).end();
}

export async function myJobs(req, res) {
  const jobs = await Job.find({ employer: req.user._id }).sort({ createdAt: -1 }).select('-description').lean();

  const counts = await Application.aggregate([
    { $match: { employer: new mongoose.Types.ObjectId(String(req.user._id)) } },
    { $group: { _id: { job: '$job', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const byJob = {};
  const totals = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0]));
  for (const { _id, count } of counts) {
    byJob[_id.job] ??= Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0]));
    byJob[_id.job][_id.status] = count;
    totals[_id.status] += count;
  }

  res.json({
    jobs: jobs.map((j) => ({ ...j, pipeline: byJob[j._id] ?? Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) })),
    stats: {
      openJobs: jobs.filter((j) => j.status === 'open').length,
      totalJobs: jobs.length,
      applications: totals,
    },
  });
}

export async function meta(_req, res) {
  const [popularTags, openJobs, companies] = await Promise.all([
    Job.aggregate([
      { $match: { status: 'open' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 20 },
    ]),
    Job.countDocuments({ status: 'open' }),
    Job.distinct('employer', { status: 'open' }),
  ]);

  res.json({
    types: JOB_TYPES,
    levels: JOB_LEVELS,
    regions: REGIONS,
    popularTags: popularTags.map((t) => ({ tag: t._id, count: t.count })),
    counts: { openJobs, companies: companies.length },
  });
}
