import { Router } from 'express';
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

export default router;
