import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/ApiError.ts';

type Source = 'body' | 'query' | 'params';

/** Validates req[source] against a zod schema and replaces it with the parsed value. */
export const validate = (schema: ZodType, source: Source = 'body') => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return next(ApiError.badRequest('Validation failed', details));
  }
  // req.query is a getter in Express 5, so store parsed values separately.
  if (source === 'query') req.validatedQuery = result.data;
  else req[source] = result.data as never;
  next();
};
