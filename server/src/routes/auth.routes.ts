import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/auth.controller.ts';
import { requireAuth } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../utils/schemas.ts';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

router.post('/register', authLimiter, validate(registerSchema), auth.register);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);

// Password recovery
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { message: 'Too many attempts. Please try again in an hour.' } },
});
router.post('/forgot-password', resetLimiter, validate(forgotPasswordSchema), auth.forgotPassword);
router.post('/reset-password', resetLimiter, validate(resetPasswordSchema), auth.resetPassword);
router.patch('/password', requireAuth, validate(changePasswordSchema), auth.changePassword);

export default router;
