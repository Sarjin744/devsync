import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getDashboard, getDashboardOverview } from '../controllers/dashboard.controller';

const router = Router();
router.use(authenticate);

router.get('/', getDashboard);
router.get('/overview', getDashboardOverview);

export default router;
