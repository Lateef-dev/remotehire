import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, createJob, registerAs, type AuthHeader } from './helpers.ts';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const upload = (auth: AuthHeader, body: Buffer, type = 'application/pdf', name = 'Cara CV.pdf') =>
  request(app).put('/api/users/me/resume').set(auth).set('Content-Type', type).set('X-File-Name', encodeURIComponent(name)).send(body);

describe('resume uploads', () => {
  it('stores a PDF on the profile and lets the owner download it', async () => {
    const cara = await registerAs('candidate');
    const res = await upload(cara.auth, PDF);
    expect(res.status).toBe(201);
    expect(res.body.user.resumeFile).toMatchObject({ name: 'Cara CV.pdf', size: PDF.length, contentType: 'application/pdf' });

    const file = await request(app).get(`/api/resumes/${res.body.user.resumeFile.fileId}`).set(cara.auth).buffer(true);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('application/pdf');
    expect(file.headers['content-disposition']).toContain('inline');
    expect(Buffer.from(file.body).equals(PDF)).toBe(true);
  });

  it('rejects files that are not PDF or Word, and oversized files', async () => {
    const cara = await registerAs('candidate');
    expect((await upload(cara.auth, Buffer.from('<script>alert(1)</script>'), 'application/pdf')).status).toBe(400);
    // A zip that claims to be a PDF is still rejected
    expect((await upload(cara.auth, Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2]), 'application/pdf')).status).toBe(400);
    expect((await upload(cara.auth, Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2]), DOCX_TYPE, 'cv.docx')).status).toBe(201);
    expect((await upload(cara.auth, Buffer.alloc(0))).status).toBe(400);
    const big = Buffer.concat([PDF, Buffer.alloc(4 * 1024 * 1024)]);
    const res = await upload(cara.auth, big);
    expect(res.status).toBe(413);
    expect(res.body.error.message).toMatch(/4 MB/);
  });

  it('only candidates can upload', async () => {
    const erin = await registerAs('employer');
    expect((await upload(erin.auth, PDF)).status).toBe(403);
    expect((await request(app).put('/api/users/me/resume').set('Content-Type', 'application/pdf').send(PDF)).status).toBe(401);
  });

  it('applies with the uploaded file and shares it only with that employer', async () => {
    const erin = await registerAs('employer');
    const other = await registerAs('employer');
    const cara = await registerAs('candidate');
    const stranger = await registerAs('candidate');
    const job = await createJob(erin.auth);

    // No resume at all yet
    expect((await request(app).post(`/api/jobs/${job._id}/apply`).set(cara.auth).send({})).status).toBe(400);

    const { body } = await upload(cara.auth, PDF);
    const fileId = body.user.resumeFile.fileId;
    const applied = await request(app).post(`/api/jobs/${job._id}/apply`).set(cara.auth).send({});
    expect(applied.status).toBe(201);
    expect(applied.body.application.resumeFile).toMatchObject({ fileId, name: 'Cara CV.pdf' });
    expect(applied.body.application.resumeUrl).toBeUndefined();

    const list = await request(app).get(`/api/jobs/${job._id}/applications`).set(erin.auth);
    expect(list.body.applications[0].resumeFile.fileId).toBe(fileId);

    expect((await request(app).get(`/api/resumes/${fileId}`).set(erin.auth)).status).toBe(200);
    expect((await request(app).get(`/api/resumes/${fileId}`).set(other.auth)).status).toBe(404);
    expect((await request(app).get(`/api/resumes/${fileId}`).set(stranger.auth)).status).toBe(404);
    expect((await request(app).get(`/api/resumes/${fileId}`)).status).toBe(401);
    expect((await request(app).get('/api/resumes/not-an-id').set(cara.auth)).status).toBe(404);
  });

  it('can still apply with a link, even when a file is uploaded', async () => {
    const erin = await registerAs('employer');
    const cara = await registerAs('candidate');
    const job = await createJob(erin.auth);
    await upload(cara.auth, PDF);
    const res = await request(app)
      .post(`/api/jobs/${job._id}/apply`)
      .set(cara.auth)
      .send({ resumeSource: 'link', resumeUrl: 'https://example.com/cv.pdf' });
    expect(res.status).toBe(201);
    expect(res.body.application.resumeUrl).toBe('https://example.com/cv.pdf');
    expect(res.body.application.resumeFile).toBeUndefined();
  });

  it('keeps files that applications use when the profile resume is replaced or removed', async () => {
    const erin = await registerAs('employer');
    const cara = await registerAs('candidate');
    const job = await createJob(erin.auth);

    const first = (await upload(cara.auth, PDF, 'application/pdf', 'old.pdf')).body.user.resumeFile.fileId;
    await request(app).post(`/api/jobs/${job._id}/apply`).set(cara.auth).send({ resumeSource: 'file' });

    // Replace: the old file is still used by the application, so the employer can still open it
    const second = (await upload(cara.auth, PDF, 'application/pdf', 'new.pdf')).body.user.resumeFile.fileId;
    expect(second).not.toBe(first);
    expect((await request(app).get(`/api/resumes/${first}`).set(erin.auth)).status).toBe(200);

    // Replace again: the second file was only on the profile, so it is deleted
    await upload(cara.auth, PDF, 'application/pdf', 'newer.pdf');
    expect((await request(app).get(`/api/resumes/${second}`).set(cara.auth)).status).toBe(404);

    // Remove from profile
    const removed = await request(app).delete('/api/users/me/resume').set(cara.auth);
    expect(removed.status).toBe(200);
    expect(removed.body.user.resumeFile).toBeUndefined();
  });
});
