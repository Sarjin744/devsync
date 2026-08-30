import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  getPreferences,
  updatePreferences,
} from '../controllers/notificationPreference.controller';

const router = Router();

router.use(authenticate);

router.get('/', getPreferences);
router.patch('/', updatePreferences);

export default router;
