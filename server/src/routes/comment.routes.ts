import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { createComment, getComments, updateComment, deleteComment } from '../controllers/comment.controller';

const router = Router();
router.use(authenticate);

router.post('/', createComment);
router.get('/task/:taskId', getComments);
router.put('/:commentId', updateComment);
router.delete('/:commentId', deleteComment);

export default router;
