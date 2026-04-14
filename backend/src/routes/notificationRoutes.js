import { Router } from 'express';
import { getNotifications, markNotificationsRead } from '../services/notificationService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getNotifications);
router.patch('/read', authenticate, markNotificationsRead);

export default router;
