import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiError, type ErrorDetail } from '../utils/ApiError.ts';
import { isProd } from '../config/env.ts';

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let status = err instanceof ApiError ? err.status : 500;
  let message = err instanceof Error && err.message ? err.message : 'Something went wrong';
  let details: ErrorDetail[] | undefined = err instanceof ApiError ? err.details : undefined;

  if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if ((err as { code?: number })?.code === 11000) {
    status = 409;
    message = 'That record already exists';
  } else if (typeof (err as { status?: unknown })?.status === 'number') {
    // e.g. body-parser errors for malformed JSON
    status = (err as { status: number }).status;
  }

  if (status >= 500 && !isProd) console.error(err);
  if (status >= 500 && isProd) message = 'Something went wrong';

  res.status(status).json({ error: { message, ...(details && { details }) } });
}
