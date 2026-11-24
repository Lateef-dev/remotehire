import type { Request, Response } from 'express';
import type { QueryFilter, SortOrder } from 'mongoose';
import { Application, Job, User } from '../models/index.ts';
import type { IJob } from '../models/Job.ts';
import { ApiError } from '../utils/ApiError.ts';
import { currentUser } from '../middleware/auth.ts';
import {
  APPLICATION_STATUSES,
  JOB_LEVELS,
  JOB_TYPES,
  REGIONS,
  type ApplicationStatus,
} from '../utils/constants.ts';
import type { CreateJobInput, JobQuery, UpdateJobInput } from '../utils/schemas.ts';

type Pipeline = Record<ApplicationStatus, number>;
const emptyPipeline = (): Pipeline =>
  Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Pipeline;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildJobFilter({ q, type, level, region, tags, minSalary }: JobQuery): QueryFilter<IJob> {
  const filter: QueryFilter<IJob> = { status: 'open' };
  if (q) {
    // Prefix-friendly search across the fields candidates actually scan.
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { companyName: rx }, { tags: q.toLowerCase() }, { description: rx }];
  }
  if (type.length) filter.type = { $in: type };
  if (level.length) filter.level = { $in: level };
  // Worldwide roles are open to everyone, so they match any region filter.
  if (region.length) filter.region = { $in: [...new Set([...region, 'worldwide' as const])] };
  if (tags.length) filter.tags = { $all: tags };
  if (minSalary !== undefined) filter.salaryMax = { $gte: minSalary };
  return filter;
}

export async function listJobs(req: Request, res: Response) {
  const query = req.validatedQuery as JobQuery;
  const filter = buildJobFilter(query);
  const sort: Record<string, SortOrder> =
    query.sort === 'salary' ? { salaryMax: -1, createdAt: -1 } : { createdAt: -1 };
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

export async function getJob(req: Request<{ id: string }>, res: Response) {
  const job = await Job.findById(req.params.id).populate('employer', 'name company');
  if (!job) throw ApiError.notFound('Job not found');

  const user = req.user;
  const isOwner = !!user && job.employer._id.equals(user._id);
  // Closed jobs stay viewable so shared links keep working; the client shows them as closed.

  let viewer = null;
  if (user?.role === 'candidate') {
    const application = await Application.findOne({ job: job._id, candidate: user._id }).select('status createdAt');
    viewer = {
      hasApplied: !!application,
      applicationStatus: application?.status ?? null,
      isSaved: user.savedJobs.some((id) => id.equals(job._id)),
    };
  } else if (isOwner) {
    viewer = { isOwner: true };
  }

  res.json({ job, viewer });
}

export async function createJob(req: Request, res: Response) {
  const employer = currentUser(req);
  const job = await Job.create({
    ...(req.body as CreateJobInput),
    employer: employer._id,
    companyName: employer.company?.name ?? employer.name,
    companyLogoUrl: employer.company?.logoUrl,
  });
  res.status(201).json({ job });
}

async function findOwnedJob(req: Request<{ id: string }>) {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found');
  if (!job.employer.equals(currentUser(req)._id)) throw ApiError.forbidden('You can only manage jobs you posted');
  return job;
}

export async function updateJob(req: Request<{ id: string }>, res: Response) {
  const job = await findOwnedJob(req);
  job.set(req.body as UpdateJobInput);
  if (job.salaryMin != null && job.salaryMax != null && job.salaryMin > job.salaryMax) {
    throw ApiError.badRequest('salaryMin cannot be greater than salaryMax');
  }
  await job.save();
  res.json({ job });
}

export async function deleteJob(req: Request<{ id: string }>, res: Response) {
  const job = await findOwnedJob(req);
  await Promise.all([
    Application.deleteMany({ job: job._id }),
    User.updateMany({ savedJobs: job._id }, { $pull: { savedJobs: job._id } }),
    job.deleteOne(),
  ]);
  res.status(204).end();
}

export async function myJobs(req: Request, res: Response) {
  const employerId = currentUser(req)._id;
  const jobs = await Job.find({ employer: employerId }).sort({ createdAt: -1 }).select('-description').lean();

  const counts = await Application.aggregate<{ _id: { job: string; status: ApplicationStatus }; count: number }>([
    { $match: { employer: employerId } },
    { $group: { _id: { job: '$job', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const byJob = new Map<string, Pipeline>();
  const totals = emptyPipeline();
  for (const { _id, count } of counts) {
    const key = String(_id.job);
    const pipeline = byJob.get(key) ?? emptyPipeline();
    pipeline[_id.status] = count;
    byJob.set(key, pipeline);
    totals[_id.status] += count;
  }

  res.json({
    jobs: jobs.map((j) => ({ ...j, pipeline: byJob.get(String(j._id)) ?? emptyPipeline() })),
    stats: {
      openJobs: jobs.filter((j) => j.status === 'open').length,
      totalJobs: jobs.length,
      applications: totals,
    },
  });
}

export async function meta(_req: Request, res: Response) {
  const [popularTags, openJobs, companies] = await Promise.all([
    Job.aggregate<{ _id: string; count: number }>([
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
