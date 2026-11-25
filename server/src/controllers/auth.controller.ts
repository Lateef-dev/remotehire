import type { CookieOptions, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env, isProd } from '../config/env.ts';
import { User, hashResetToken, type UserDoc } from '../models/User.ts';
import { ApiError } from '../utils/ApiError.ts';
import { TOKEN_COOKIE, currentUser } from '../middleware/auth.ts';
import { DEMO_EMAILS, DEMO_PASSWORD_MESSAGE } from '../utils/demo.ts';
import { passwordChangedEmail, passwordResetEmail, sendEmail } from '../utils/mailer.ts';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '../utils/schemas.ts';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function sendSession(res: Response, user: UserDoc, status = 200) {
  const token = jwt.sign({ sub: user.id, role: user.role, v: user.sessionVersion ?? 0 }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });
  res.cookie(TOKEN_COOKIE, token, cookieOptions);
  res.status(status).json({ user, token });
}

export async function register(req: Request, res: Response) {
  const { name, email, password, role, companyName } = req.body as RegisterInput;
  if (await User.exists({ email })) throw ApiError.conflict('An account with that email already exists');
  const user = await User.create({
    name,
    email,
    password,
    role,
    ...(role === 'employer' && { company: { name: companyName } }),
  });
  sendSession(res, user, 201);
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput;
  const user = await User.findOne({ email }).select('+password +sessionVersion');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  sendSession(res, user);
}

export function logout(_req: Request, res: Response) {
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie(TOKEN_COOKIE, clearOptions);
  res.status(204).end();
}

export function me(req: Request, res: Response) {
  res.json({ user: currentUser(req) });
}

const FORGOT_RESPONSE = {
  message: 'If an account exists for that email, we have sent a link to reset the password.',
};

/** The web app's origin used in emailed links (the first entry when CLIENT_ORIGIN lists several). */
const appOrigin = () => env.clientOrigin.split(',')[0]!.trim().replace(/\/$/, '');

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as ForgotPasswordInput;
  const user = await User.findOne({ email });
  if (user && DEMO_EMAILS.has(user.email)) throw ApiError.forbidden(DEMO_PASSWORD_MESSAGE);
  // Same response either way, so the endpoint can't be used to discover which emails have accounts.
  if (user) {
    const token = user.createPasswordResetToken();
    await user.save({ validateModifiedOnly: true });
    const link = `${appOrigin()}/reset-password?token=${token}`;
    await sendEmail(passwordResetEmail(user.email, user.name, link));
  }
  res.json(FORGOT_RESPONSE);
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body as ResetPasswordInput;
  const user = await User.findOne({
    passwordResetTokenHash: hashResetToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+sessionVersion');
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired. Please request a new one.');

  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await sendEmail(passwordChangedEmail(user.email, user.name));
  // Signs the user in on this device; every older session is now rejected.
  sendSession(res, user);
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;
  if (DEMO_EMAILS.has(currentUser(req).email)) throw ApiError.forbidden(DEMO_PASSWORD_MESSAGE);
  const user = await User.findById(currentUser(req)._id).select('+password +sessionVersion');
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect', [
      { path: 'currentPassword', message: 'Your current password is incorrect' },
    ]);
  }
  user.password = newPassword;
  await user.save();

  await sendEmail(passwordChangedEmail(user.email, user.name));
  // Issue a fresh session so this device stays signed in while others are signed out.
  sendSession(res, user);
}
