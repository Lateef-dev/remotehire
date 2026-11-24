import type { APPLICATION_STATUSES, JOB_LEVELS, JOB_TYPES, REGIONS } from './constants';

export type Role = 'candidate' | 'employer';
export type JobType = (typeof JOB_TYPES)[number];
export type JobLevel = (typeof JOB_LEVELS)[number];
export type Region = (typeof REGIONS)[number];
export type JobStatus = 'open' | 'closed';
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type Pipeline = Record<ApplicationStatus, number>;

export interface Company {
  name?: string;
  website?: string;
  logoUrl?: string;
  about?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  headline?: string;
  bio?: string;
  skills?: string[];
  location?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  savedJobs?: string[];
  company?: Company;
}

export interface SalaryFields {
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
}

/** A job as it appears in lists (no description). */
export interface JobSummary extends SalaryFields {
  _id: string;
  title: string;
  companyName: string;
  companyLogoUrl?: string;
  type: JobType;
  level: JobLevel;
  region: Region;
  timezone?: string;
  tags: string[];
  status: JobStatus;
  applicationsCount: number;
  createdAt: string;
}

export interface Job extends JobSummary {
  description: string;
  requirements: string[];
  employer: { _id: string; name: string; company?: Company };
}

export interface JobViewer {
  hasApplied?: boolean;
  applicationStatus?: ApplicationStatus | null;
  isSaved?: boolean;
  isOwner?: boolean;
}

export interface JobInput extends SalaryFields {
  title: string;
  type: JobType;
  level: JobLevel;
  region: Region;
  timezone?: string;
  tags: string[];
  requirements: string[];
  description: string;
  status?: JobStatus;
}

export interface MyJob extends JobSummary {
  pipeline: Pipeline;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JobFilters {
  q?: string;
  type?: string[];
  level?: string[];
  region?: string[];
  tags?: string[];
  minSalary?: string | number;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface JobMeta {
  types: JobType[];
  levels: JobLevel[];
  regions: Region[];
  popularTags: { tag: string; count: number }[];
  counts: { openJobs: number; companies: number };
}

export interface Candidate {
  _id: string;
  name: string;
  email: string;
  headline?: string;
  skills?: string[];
  location?: string;
  portfolioUrl?: string;
}

export interface Application {
  _id: string;
  status: ApplicationStatus;
  resumeUrl: string;
  coverLetter?: string;
  createdAt: string;
}

export interface CandidateApplication extends Application {
  /** null when the employer deleted the job */
  job: JobSummary | null;
}

export interface Applicant extends Application {
  candidate: Candidate;
}

export interface ProfileInput {
  name?: string;
  headline?: string;
  bio?: string;
  skills?: string[];
  location?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  company?: Company;
}

export interface ApiErrorBody {
  error: { message: string; details?: { path: string; message: string }[] };
}
