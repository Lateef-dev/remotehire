import { z } from 'zod';
import { APPLICATION_STATUSES, JOB_LEVELS, JOB_STATUSES, JOB_TYPES, REGIONS, ROLES } from './constants.ts';

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
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

const newPassword = z.string().min(8, 'Password must be at least 8 characters').max(100);

export const forgotPasswordSchema = z.object({
  email: z.email().trim().toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'This reset link is invalid'),
  password: newPassword,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword,
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'New password must be different from your current password',
  path: ['newPassword'],
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

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
export type ProfileInput = z.infer<typeof profileSchema>;

const jobFields = {
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(30, 'Description should be at least 30 characters').max(10000),
  requirements: z.array(z.string().trim().min(1).max(300)).max(20),
  type: z.enum(JOB_TYPES),
  level: z.enum(JOB_LEVELS),
  region: z.enum(REGIONS),
  timezone: z.string().trim().max(60).optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  currency: z.string().trim().length(3).toUpperCase(),
  tags: tagList,
  applyUrl: optionalUrl,
  status: z.enum(JOB_STATUSES).optional(),
};

const salaryOrder = (d: { salaryMin?: number; salaryMax?: number }) =>
  d.salaryMin === undefined || d.salaryMax === undefined || d.salaryMin <= d.salaryMax;
const salaryMsg = { message: 'salaryMin cannot be greater than salaryMax', path: ['salaryMax'] };

export const createJobSchema = z.object({
  ...jobFields,
  requirements: jobFields.requirements.default([]),
  region: jobFields.region.default('worldwide'),
  currency: jobFields.currency.default('USD'),
  tags: jobFields.tags.default([]),
}).refine(salaryOrder, salaryMsg);
export type CreateJobInput = z.infer<typeof createJobSchema>;

// Partial updates: no defaults, so missing fields are left untouched.
export const updateJobSchema = z.object(jobFields).partial().strict().refine(salaryOrder, salaryMsg);
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

const splitCsv = z.string().optional()
  .transform((s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []));
const csvEnum = <const T extends readonly [string, ...string[]]>(values: T) => splitCsv.pipe(z.array(z.enum(values)));
const csvTags = () => splitCsv.pipe(z.array(z.string().toLowerCase()));

export const jobQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: csvEnum(JOB_TYPES),
  level: csvEnum(JOB_LEVELS),
  region: csvEnum(REGIONS),
  tags: csvTags(),
  minSalary: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(['newest', 'salary']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type JobQuery = z.infer<typeof jobQuerySchema>;

export const applySchema = z.object({
  coverLetter: z.string().trim().max(5000).optional(),
  resumeUrl: url.optional(),
});
export type ApplyInput = z.infer<typeof applySchema>;

export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
});
export type ApplicationStatusInput = z.infer<typeof applicationStatusSchema>;
