import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, createJob, jobPayload, registerAs } from './helpers.js';

describe('jobs', () => {
  it('only lets employers post jobs, and fills in the company name', async () => {
    const cand = await registerAs('candidate');
    const blocked = await request(app).post('/api/jobs').set(cand.auth).send(jobPayload());
    expect(blocked.status).toBe(403);

    const emp = await registerAs('employer');
    const job = await createJob(emp.auth);
    expect(job.companyName).toBe('Acme Remote');
    expect(job.status).toBe('open');
  });

  it('validates salary range', async () => {
    const emp = await registerAs('employer');
    const res = await request(app).post('/api/jobs').set(emp.auth).send(jobPayload({ salaryMin: 100, salaryMax: 50 }));
    expect(res.status).toBe(400);
  });

  it('searches and filters open jobs with pagination', async () => {
    const emp = await registerAs('employer');
    await createJob(emp.auth, { title: 'React Developer', level: 'mid', region: 'africa', tags: ['react'] });
    await createJob(emp.auth, { title: 'Go Backend Engineer', level: 'senior', region: 'europe', tags: ['go'], salaryMax: 150000 });
    await createJob(emp.auth, { title: 'Vue Engineer', level: 'mid', region: 'worldwide', tags: ['vue'] });
    const closed = await createJob(emp.auth, { title: 'Old React Role' });
    await request(app).patch(`/api/jobs/${closed._id}`).set(emp.auth).send({ status: 'closed' });

    const all = await request(app).get('/api/jobs');
    expect(all.body.total).toBe(3);

    const q = await request(app).get('/api/jobs?q=react');
    expect(q.body.items.map((j) => j.title)).toEqual(['React Developer']);

    // Worldwide roles match any region filter.
    const africa = await request(app).get('/api/jobs?region=africa');
    expect(africa.body.items.map((j) => j.title).sort()).toEqual(['React Developer', 'Vue Engineer']);

    const levels = await request(app).get('/api/jobs?level=senior');
    expect(levels.body.total).toBe(1);

    const salary = await request(app).get('/api/jobs?minSalary=100000');
    expect(salary.body.items[0].title).toBe('Go Backend Engineer');

    const paged = await request(app).get('/api/jobs?limit=2&page=2');
    expect(paged.body.items).toHaveLength(1);
    expect(paged.body.totalPages).toBe(2);

    const invalid = await request(app).get('/api/jobs?level=wizard');
    expect(invalid.status).toBe(400);
  });

  it('stops employers editing or deleting jobs they do not own', async () => {
    const owner = await registerAs('employer');
    const other = await registerAs('employer', { companyName: 'Other Co' });
    const job = await createJob(owner.auth);

    expect((await request(app).patch(`/api/jobs/${job._id}`).set(other.auth).send({ title: 'Hijacked' })).status).toBe(403);
    expect((await request(app).delete(`/api/jobs/${job._id}`).set(other.auth)).status).toBe(403);

    const updated = await request(app).patch(`/api/jobs/${job._id}`).set(owner.auth).send({ title: 'Staff React Engineer' });
    expect(updated.body.job.title).toBe('Staff React Engineer');
    expect(updated.body.job.region).toBe('africa'); // untouched by partial update
    expect((await request(app).delete(`/api/jobs/${job._id}`).set(owner.auth)).status).toBe(204);
  });

  it('returns 400 for malformed ids and 404 for missing jobs', async () => {
    expect((await request(app).get('/api/jobs/not-an-id')).status).toBe(400);
    expect((await request(app).get('/api/jobs/507f1f77bcf86cd799439011')).status).toBe(404);
  });

  it('exposes filter metadata with popular tags', async () => {
    const emp = await registerAs('employer');
    await createJob(emp.auth, { tags: ['react', 'node.js'] });
    await createJob(emp.auth, { tags: ['react'] });
    const res = await request(app).get('/api/jobs/meta');
    expect(res.body.popularTags[0]).toEqual({ tag: 'react', count: 2 });
    expect(res.body.counts.openJobs).toBe(2);
  });
});
