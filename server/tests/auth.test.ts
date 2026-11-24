import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, registerAs } from './helpers.ts';

describe('auth', () => {
  it('registers a candidate, sets an httpOnly cookie and never returns the password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada', email: 'ada@test.dev', password: 'password123', role: 'candidate',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.password).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/rh_token=.*HttpOnly/);
  });

  it('requires a company name for employers', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bo', email: 'bo@test.dev', password: 'password123', role: 'employer',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('companyName');
  });

  it('rejects duplicate emails', async () => {
    await registerAs('candidate', { email: 'dup@test.dev' });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dup', email: 'DUP@test.dev', password: 'password123', role: 'candidate',
    });
    expect(res.status).toBe(409);
  });

  it('logs in with the right password and returns the session user from /me via cookie', async () => {
    await registerAs('candidate', { email: 'login@test.dev' });
    const agent = request.agent(app);
    const bad = await agent.post('/api/auth/login').send({ email: 'login@test.dev', password: 'wrong-pass' });
    expect(bad.status).toBe(401);

    const ok = await agent.post('/api/auth/login').send({ email: 'login@test.dev', password: 'password123' });
    expect(ok.status).toBe(200);
    const me = await agent.get('/api/auth/me');
    expect(me.body.user.email).toBe('login@test.dev');

    await agent.post('/api/auth/logout');
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});
