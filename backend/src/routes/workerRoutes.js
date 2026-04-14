import { Router } from 'express';
import { getWorkerTasks, updateTaskStatus } from '../controllers/workerController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticate, authorize('worker'));

router.get('/tasks', getWorkerTasks);
router.patch('/tasks/:id/resolve', upload.array('proof', 3), updateTaskStatus);

export default router;
