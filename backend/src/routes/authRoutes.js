import { Router } from 'express';
import { register, login, getMe, getUsers } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, authorize('admin'), getUsers);

export default router;
