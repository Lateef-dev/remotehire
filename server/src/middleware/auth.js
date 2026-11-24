import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const TOKEN_COOKIE = 'rh_token';

function readToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[TOKEN_COOKIE];
}

async function resolveUser(req) {
  const token = readToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return await User.findById(payload.sub);
  } catch {
    return null;
  }
}

/** Requires a valid session. Sets req.user. */
export async function requireAuth(req, _res, next) {
  const user = await resolveUser(req);
  if (!user) return next(ApiError.unauthorized());
  req.user = user;
  next();
}

/** Attaches req.user when a valid session exists, but never blocks. */
export async function optionalAuth(req, _res, next) {
  req.user = await resolveUser(req);
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`This action is only available to ${roles.join(' or ')} accounts`));
  }
  next();
};
