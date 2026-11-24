import { Router } from 'express';
import * as jobs from '../controllers/jobs.controller.ts';
import * as apps from '../controllers/applications.controller.ts';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import { applySchema, createJobSchema, jobQuerySchema, updateJobSchema } from '../utils/schemas.ts';

const router = Router();
const employer = [requireAuth, requireRole('employer')];
const candidate = [requireAuth, requireRole('candidate')];

router.get('/', validate(jobQuerySchema, 'query'), jobs.listJobs);
router.get('/meta', jobs.meta);
router.get('/mine', ...employer, jobs.myJobs);
router.post('/', ...employer, validate(createJobSchema), jobs.createJob);
router.get('/:id', optionalAuth, jobs.getJob);
router.patch('/:id', ...employer, validate(updateJobSchema), jobs.updateJob);
router.delete('/:id', ...employer, jobs.deleteJob);

router.post('/:id/apply', ...candidate, validate(applySchema), apps.applyToJob);
router.get('/:id/applications', ...employer, apps.jobApplications);

export default router;
