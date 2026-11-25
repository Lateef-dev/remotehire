import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.ts';
import { User, type UserDoc } from '../models/User.ts';
import { ApiError } from '../utils/ApiError.ts';
import type { Role } from '../utils/constants.ts';

export const TOKEN_COOKIE = 'rh_token';

function readToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[TOKEN_COOKIE];
}

async function resolveUser(req: Request): Promise<UserDoc | null> {
  const token = readToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    const user = await User.findById(payload.sub).select('+sessionVersion');
    // Sessions created before a password change or reset are no longer valid.
    if (!user || (payload.v ?? 0) !== (user.sessionVersion ?? 0)) return null;
    return user;
  } catch {
    return null;
  }
}

/** Requires a valid session. Sets req.user. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (!user) return next(ApiError.unauthorized());
  req.user = user;
  next();
}

/** Attaches req.user when a valid session exists, but never blocks. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = await resolveUser(req);
  next();
}

export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`This action is only available to ${roles.join(' or ')} accounts`));
  }
  next();
};

/** The signed-in user, for handlers mounted behind requireAuth. */
export function currentUser(req: Request): UserDoc {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
