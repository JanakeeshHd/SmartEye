import { Router } from 'express';
import { 
  createIssue, getIssues, getMyIssues, getIssueById, 
  updateIssueStatus, upvoteIssue, addComment, getComments, addFeedback 
} from '../controllers/issueController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.post('/', authenticate, upload.array('images', 5), createIssue);
router.get('/', getIssues);
router.get('/mine', authenticate, getMyIssues);
router.get('/:id', getIssueById);
router.patch('/:id/status', authenticate, updateIssueStatus);
router.post('/:id/upvote', authenticate, upvoteIssue);
router.post('/:id/comments', authenticate, addComment);
router.get('/:id/comments', getComments);
router.post('/:id/feedback', authenticate, addFeedback);

export default router;
