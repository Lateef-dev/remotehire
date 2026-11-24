import { z } from 'zod';
import { APPLICATION_STATUSES, JOB_LEVELS, JOB_STATUSES, JOB_TYPES, REGIONS, ROLES } from './constants.js';

const url = z.url().max(500);
const optionalUrl = z.union([url, z.literal('')]).optional();
const tagList = z.array(z.string().trim().toLowerCase().min(1).max(30)).max(15);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  role: z.enum(ROLES),
  companyName: z.string().trim().min(2).max(100).optional(),
}).refine((d) => d.role !== 'employer' || !!d.companyName, {
  message: 'Company name is required for employer accounts',
  path: ['companyName'],
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  skills: tagList.optional(),
  location: z.string().trim().max(80).optional(),
  resumeUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  company: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    website: optionalUrl,
    logoUrl: optionalUrl,
    about: z.string().trim().max(2000).optional(),
  }).optional(),
}).strict();

const jobBase = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(30, 'Description should be at least 30 characters').max(10000),
  requirements: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  type: z.enum(JOB_TYPES),
  level: z.enum(JOB_LEVELS),
  region: z.enum(REGIONS).default('worldwide'),
  timezone: z.string().trim().max(60).optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  currency: z.string().trim().length(3).toUpperCase().default('USD'),
  tags: tagList.default([]),
  applyUrl: optionalUrl,
  status: z.enum(JOB_STATUSES).optional(),
});

const salaryOrder = (d) => d.salaryMin === undefined || d.salaryMax === undefined || d.salaryMin <= d.salaryMax;
const salaryMsg = { message: 'salaryMin cannot be greater than salaryMax', path: ['salaryMax'] };

export const createJobSchema = jobBase.refine(salaryOrder, salaryMsg);
// Partial updates: drop defaults so missing fields are left untouched.
export const updateJobSchema = z.object(
  Object.fromEntries(Object.entries(jobBase.shape).map(([k, v]) => [k, (v.removeDefault?.() ?? v).optional()]))
).strict().refine(salaryOrder, salaryMsg);

const csv = (values) => z.string().optional().transform((s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []))
  .pipe(z.array(values ? z.enum(values) : z.string().toLowerCase()));

export const jobQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: csv(JOB_TYPES),
  level: csv(JOB_LEVELS),
  region: csv(REGIONS),
  tags: csv(),
  minSalary: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(['newest', 'salary']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const applySchema = z.object({
  coverLetter: z.string().trim().max(5000).optional(),
  resumeUrl: url.optional(),
});

export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
});
