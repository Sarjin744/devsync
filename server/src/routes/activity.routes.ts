import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getProjectActivity, getUserActivity } from '../controllers/activity.controller';

const router = Router();
router.use(authenticate);

router.get('/project/:projectId', getProjectActivity);
router.get('/user/:userId', getUserActivity);

export default router;
