import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();

export async function registerAs(role, overrides = {}) {
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

export const jobPayload = (overrides = {}) => ({
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

export async function createJob(auth, overrides) {
  const res = await request(app).post('/api/jobs').set(auth).send(jobPayload(overrides));
  if (res.status !== 201) throw new Error(`create job failed: ${JSON.stringify(res.body)}`);
  return res.body.job;
}
