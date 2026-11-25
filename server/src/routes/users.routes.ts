import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as resumes from '../controllers/resumes.controller.ts';
import { MAX_RESUME_BYTES } from '../utils/resumeStorage.ts';
import * as users from '../controllers/users.controller.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import { profileSchema } from '../utils/schemas.ts';

const router = Router();
const candidate = [requireAuth, requireRole('candidate')];

router.patch('/me', requireAuth, validate(profileSchema), users.updateProfile);
router.get('/me/saved', ...candidate, users.savedJobs);
router.put('/me/saved/:jobId', ...candidate, users.saveJob);
router.delete('/me/saved/:jobId', ...candidate, users.unsaveJob);

// Resume upload: the raw file is the request body; its name goes in the X-File-Name header.
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { message: 'Too many uploads. Please try again later.' } },
});
const rawFile = express.raw({ type: () => true, limit: MAX_RESUME_BYTES });
router.put('/me/resume', ...candidate, uploadLimiter, rawFile, resumes.uploadResume);
router.delete('/me/resume', ...candidate, resumes.removeResume);

export default router;
