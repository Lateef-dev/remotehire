import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, registerAs, type Session } from './helpers.ts';
import { sentEmails } from '../src/utils/mailer.ts';
import { User } from '../src/models/User.ts';

const resetTokenFrom = (text: string) => /reset-password\?token=([a-f0-9]{64})/.exec(text)?.[1];

async function requestReset(email: string) {
  const res = await request(app).post('/api/auth/forgot-password').send({ email });
  expect(res.status).toBe(200);
  const mail = sentEmails.at(-1);
  return { res, token: mail ? resetTokenFrom(mail.text) : undefined };
}

describe('password recovery', () => {
  let me: Session;

  beforeEach(async () => {
    sentEmails.length = 0;
    me = await registerAs('candidate', { email: 'reset@test.dev' });
  });

  it('emails a reset link and gives the same answer for unknown emails', async () => {
    const known = await requestReset('reset@test.dev');
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]!.to).toBe('reset@test.dev');
    expect(sentEmails[0]!.html).toContain('/reset-password?token=');
    expect(known.token).toMatch(/^[a-f0-9]{64}$/);

    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@test.dev' });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.res.body);
    expect(sentEmails).toHaveLength(1); // nothing sent for the unknown address

    // Only a hash of the token is stored.
    const stored = await User.findOne({ email: 'reset@test.dev' }).select('+passwordResetTokenHash');
    expect(stored!.passwordResetTokenHash).toBeDefined();
    expect(stored!.passwordResetTokenHash).not.toBe(known.token);
  });

  it('resets the password once, signs the user in, and signs out old sessions', async () => {
    const { token } = await requestReset('reset@test.dev');

    const reset = await request(app).post('/api/auth/reset-password').send({ token, password: 'brand-new-pass' });
    expect(reset.status).toBe(200);
    expect(reset.headers['set-cookie']![0]).toMatch(/rh_token=/);
    expect(reset.body.user.passwordResetTokenHash).toBeUndefined();
    expect(sentEmails.at(-1)!.subject).toMatch(/password was changed/);

    // The old session no longer works; the new one does.
    expect((await request(app).get('/api/auth/me').set(me.auth)).status).toBe(401);
    const fresh = await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${reset.body.token}` });
    expect(fresh.status).toBe(200);

    // Old password fails, new one works.
    const oldLogin = await request(app).post('/api/auth/login').send({ email: 'reset@test.dev', password: 'password123' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/auth/login').send({ email: 'reset@test.dev', password: 'brand-new-pass' });
    expect(newLogin.status).toBe(200);

    // The link only works once.
    const again = await request(app).post('/api/auth/reset-password').send({ token, password: 'another-pass-1' });
    expect(again.status).toBe(400);
  });

  it('rejects expired, unknown and malformed tokens', async () => {
    const { token } = await requestReset('reset@test.dev');
    await User.updateOne({ email: 'reset@test.dev' }, { passwordResetExpires: new Date(Date.now() - 1000) });
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'brand-new-pass' })).status).toBe(400);

    const unknown = 'a'.repeat(64);
    expect((await request(app).post('/api/auth/reset-password').send({ token: unknown, password: 'brand-new-pass' })).status).toBe(400);
    expect((await request(app).post('/api/auth/reset-password').send({ token: 'abc', password: 'brand-new-pass' })).status).toBe(400);
  });

  it('only the latest reset link works', async () => {
    const first = await requestReset('reset@test.dev');
    const second = await requestReset('reset@test.dev');
    expect((await request(app).post('/api/auth/reset-password').send({ token: first.token, password: 'brand-new-pass' })).status).toBe(400);
    expect((await request(app).post('/api/auth/reset-password').send({ token: second.token, password: 'brand-new-pass' })).status).toBe(200);
  });
});

describe('change password', () => {
  it('needs the current password, keeps this device signed in and signs out others', async () => {
    const me = await registerAs('employer', { email: 'change@test.dev' });
    const otherDevice = await request(app).post('/api/auth/login').send({ email: 'change@test.dev', password: 'password123' });

    const wrong = await request(app).patch('/api/auth/password').set(me.auth).send({ currentPassword: 'nope-nope', newPassword: 'brand-new-pass' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.details[0].path).toBe('currentPassword');

    const same = await request(app).patch('/api/auth/password').set(me.auth).send({ currentPassword: 'password123', newPassword: 'password123' });
    expect(same.status).toBe(400);

    expect((await request(app).patch('/api/auth/password').send({ currentPassword: 'password123', newPassword: 'brand-new-pass' })).status).toBe(401);

    const ok = await request(app).patch('/api/auth/password').set(me.auth).send({ currentPassword: 'password123', newPassword: 'brand-new-pass' });
    expect(ok.status).toBe(200);

    expect((await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${ok.body.token}` })).status).toBe(200);
    expect((await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${otherDevice.body.token}` })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'change@test.dev', password: 'brand-new-pass' })).status).toBe(200);
  });
});

describe('demo accounts', () => {
  it('cannot have their shared password reset or changed', async () => {
    const demo = await registerAs('candidate', { email: 'candidate@remotehire.dev' });
    sentEmails.length = 0;

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'candidate@remotehire.dev' });
    expect(forgot.status).toBe(403);
    expect(sentEmails).toHaveLength(0);

    const change = await request(app).patch('/api/auth/password').set(demo.auth).send({ currentPassword: 'password123', newPassword: 'brand-new-pass' });
    expect(change.status).toBe(403);
  });
});
