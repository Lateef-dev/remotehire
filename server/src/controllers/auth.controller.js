import jwt from 'jsonwebtoken';
import { env, isProd } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { TOKEN_COOKIE } from '../middleware/auth.js';

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function sendSession(res, user, status = 200) {
  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.cookie(TOKEN_COOKIE, token, cookieOptions);
  res.status(status).json({ user, token });
}

export async function register(req, res) {
  const { name, email, password, role, companyName } = req.body;
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

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  sendSession(res, user);
}

export function logout(_req, res) {
  res.clearCookie(TOKEN_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
}

export function me(req, res) {
  res.json({ user: req.user });
}
