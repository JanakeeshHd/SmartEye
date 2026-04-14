import { Router } from 'express';
import { getAnalytics, getAllIssuesAdmin, assignIssue, escalateIssue, generateReport } from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/analytics', getAnalytics);
router.get('/issues', getAllIssuesAdmin);
router.patch('/issues/:id/assign', assignIssue);
router.patch('/issues/:id/escalate', escalateIssue);
router.get('/reports', generateReport);

export default router;
