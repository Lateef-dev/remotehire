import request from 'supertest';
import { createApp } from '../src/app.ts';
import type { Role } from '../src/utils/constants.ts';

export type AuthHeader = { Authorization: string };
export interface Session {
  user: { _id: string; name: string; email: string; role: Role };
  token: string;
  auth: AuthHeader;
}
// Shape of a job as returned by the API (JSON).
export type JobJson = { _id: string; title: string; [key: string]: unknown };

export const app = createApp();

export async function registerAs(role: Role, overrides: Record<string, unknown> = {}): Promise<Session> {
  const body = {
    name: role === 'employer' ? 'Erin Employer' : 'Cara Candidate',
    email: `${role}-${Math.random().toString(36).slice(2)}@test.dev`,
    password: 'password123',
    role,
    ...(role === 'employer' && { companyName: 'Acme Remote' }),
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  return { user: res.body.user, token: res.body.token, auth: { Authorization: `Bearer ${res.body.token}` } };
}

export const jobPayload = (overrides: Record<string, unknown> = {}) => ({
  title: 'Senior React Engineer',
  description: 'Build delightful interfaces for a fully remote product team across the world.',
  type: 'full-time',
  level: 'senior',
  region: 'africa',
  salaryMin: 60000,
  salaryMax: 90000,
  tags: ['react', 'next.js'],
  ...overrides,
});

export async function createJob(auth: AuthHeader, overrides?: Record<string, unknown>): Promise<JobJson> {
  const res = await request(app).post('/api/jobs').set(auth).send(jobPayload(overrides));
  if (res.status !== 201) throw new Error(`create job failed: ${JSON.stringify(res.body)}`);
  return res.body.job;
}
