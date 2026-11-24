export const ROLES = ['candidate', 'employer'] as const;
export const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'] as const;
export const JOB_LEVELS = ['junior', 'mid', 'senior', 'lead'] as const;
export const REGIONS = ['worldwide', 'africa', 'europe', 'americas', 'asia-pacific', 'emea'] as const;
export const JOB_STATUSES = ['open', 'closed'] as const;
export const APPLICATION_STATUSES = ['submitted', 'reviewing', 'shortlisted', 'rejected', 'hired'] as const;

export type Role = (typeof ROLES)[number];
export type JobType = (typeof JOB_TYPES)[number];
export type JobLevel = (typeof JOB_LEVELS)[number];
export type Region = (typeof REGIONS)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
