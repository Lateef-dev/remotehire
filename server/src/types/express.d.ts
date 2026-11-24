import type { UserDoc } from '../models/User.ts';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth / optionalAuth. */
      user?: UserDoc | null;
      /** Parsed query string, set by validate(schema, 'query'). */
      validatedQuery?: unknown;
    }
  }
}

export {};
