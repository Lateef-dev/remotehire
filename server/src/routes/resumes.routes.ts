import { Router } from 'express';
import * as resumes from '../controllers/resumes.controller.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

router.get('/:fileId', requireAuth, resumes.downloadResume);

export default router;
