import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { search } from '../controllers/search.controller';

const router = Router();
router.use(authenticate);

router.get('/', search);

export default router;
