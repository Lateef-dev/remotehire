import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, createJob, registerAs, type JobJson } from './helpers.ts';

describe('applications', () => {
  it('runs the full hiring flow: apply, review, track', async () => {
    const emp = await registerAs('employer');
    const cand = await registerAs('candidate');
    const job = await createJob(emp.auth);

    // Needs a resume.
    const noResume = await request(app).post(`/api/jobs/${job._id}/apply`).set(cand.auth).send({});
    expect(noResume.status).toBe(400);

    await request(app).patch('/api/users/me').set(cand.auth).send({ resumeUrl: 'https://example.com/cv.pdf' });
    const applied = await request(app).post(`/api/jobs/${job._id}/apply`).set(cand.auth).send({ coverLetter: 'Hi!' });
    expect(applied.status).toBe(201);
    expect(applied.body.application.resumeUrl).toBe('https://example.com/cv.pdf');

    const again = await request(app).post(`/api/jobs/${job._id}/apply`).set(cand.auth).send({});
    expect(again.status).toBe(409);

    const detail = await request(app).get(`/api/jobs/${job._id}`).set(cand.auth);
    expect(detail.body.job.applicationsCount).toBe(1);
    expect(detail.body.viewer).toMatchObject({ hasApplied: true, applicationStatus: 'submitted' });

    const list = await request(app).get(`/api/jobs/${job._id}/applications`).set(emp.auth);
    expect(list.body.applications).toHaveLength(1);
    expect(list.body.applications[0].candidate.name).toBe('Cara Candidate');

    const appId = list.body.applications[0]._id;
    const moved = await request(app).patch(`/api/applications/${appId}/status`).set(emp.auth).send({ status: 'shortlisted' });
    expect(moved.body.application.status).toBe('shortlisted');

    const mine = await request(app).get('/api/applications/me').set(cand.auth);
    expect(mine.body.applications[0]).toMatchObject({ status: 'shortlisted' });
    expect(mine.body.applications[0].job.title).toBe(job.title);

    const dashboard = await request(app).get('/api/jobs/mine').set(emp.auth);
    expect(dashboard.body.stats.applications.shortlisted).toBe(1);
    expect(dashboard.body.jobs[0].pipeline.shortlisted).toBe(1);

    // Cannot withdraw after shortlisting.
    expect((await request(app).delete(`/api/applications/${appId}`).set(cand.auth)).status).toBe(400);
  });

  it('keeps applicants private to the job owner and blocks applying to closed jobs', async () => {
    const emp = await registerAs('employer');
    const rival = await registerAs('employer', { companyName: 'Rival' });
    const cand = await registerAs('candidate');
    const job = await createJob(emp.auth);

    expect((await request(app).get(`/api/jobs/${job._id}/applications`).set(rival.auth)).status).toBe(403);
    expect((await request(app).get(`/api/jobs/${job._id}/applications`).set(cand.auth)).status).toBe(403);

    await request(app).patch(`/api/jobs/${job._id}`).set(emp.auth).send({ status: 'closed' });
    const res = await request(app).post(`/api/jobs/${job._id}/apply`).set(cand.auth).send({ resumeUrl: 'https://example.com/cv.pdf' });
    expect(res.status).toBe(400);
  });

  it('lets candidates withdraw early and save jobs', async () => {
    const emp = await registerAs('employer');
    const cand = await registerAs('candidate');
    const job = await createJob(emp.auth);

    const applied = await request(app).post(`/api/jobs/${job._id}/apply`).set(cand.auth).send({ resumeUrl: 'https://example.com/cv.pdf' });
    expect((await request(app).delete(`/api/applications/${applied.body.application._id}`).set(cand.auth)).status).toBe(204);
    expect((await request(app).get(`/api/jobs/${job._id}`)).body.job.applicationsCount).toBe(0);

    expect((await request(app).put(`/api/users/me/saved/${job._id}`).set(cand.auth)).status).toBe(204);
    const saved = await request(app).get('/api/users/me/saved').set(cand.auth);
    expect(saved.body.jobs.map((j: JobJson) => j._id)).toEqual([job._id]);
    await request(app).delete(`/api/users/me/saved/${job._id}`).set(cand.auth);
    expect((await request(app).get('/api/users/me/saved').set(cand.auth)).body.jobs).toHaveLength(0);
  });

  it('only lets each role edit its own profile fields', async () => {
    const cand = await registerAs('candidate');
    const res = await request(app).patch('/api/users/me').set(cand.auth).send({ company: { name: 'Sneaky' } });
    expect(res.status).toBe(400);

    const emp = await registerAs('employer');
    const job = await createJob(emp.auth);
    await request(app).patch('/api/users/me').set(emp.auth).send({ company: { name: 'Acme Global' } });
    expect((await request(app).get(`/api/jobs/${job._id}`)).body.job.companyName).toBe('Acme Global');
  });
});
