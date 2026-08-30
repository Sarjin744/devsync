import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getMessages, deleteMessage } from '../controllers/message.controller';

const router = Router();
router.use(authenticate);

router.get('/project/:projectId', getMessages);
router.get('/:projectId', getMessages);
router.delete('/:messageId', deleteMessage);

export default router;
