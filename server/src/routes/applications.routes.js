import { Router } from 'express';
import * as apps from '../controllers/applications.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { applicationStatusSchema } from '../utils/schemas.js';

const router = Router();

router.get('/me', requireAuth, requireRole('candidate'), apps.myApplications);
router.patch('/:id/status', requireAuth, requireRole('employer'), validate(applicationStatusSchema), apps.updateApplicationStatus);
router.delete('/:id', requireAuth, requireRole('candidate'), apps.withdrawApplication);

export default router;
