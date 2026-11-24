import type { CookieOptions, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env, isProd } from '../config/env.ts';
import { User, type UserDoc } from '../models/User.ts';
import { ApiError } from '../utils/ApiError.ts';
import { TOKEN_COOKIE, currentUser } from '../middleware/auth.ts';
import type { LoginInput, RegisterInput } from '../utils/schemas.ts';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function sendSession(res: Response, user: UserDoc, status = 200) {
  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
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
  const user = await User.findOne({ email }).select('+password');
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
