import { Router } from 'express';
import * as apps from '../controllers/applications.controller.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import { applicationStatusSchema } from '../utils/schemas.ts';

const router = Router();

router.get('/me', requireAuth, requireRole('candidate'), apps.myApplications);
router.patch('/:id/status', requireAuth, requireRole('employer'), validate(applicationStatusSchema), apps.updateApplicationStatus);
router.delete('/:id', requireAuth, requireRole('candidate'), apps.withdrawApplication);

export default router;
