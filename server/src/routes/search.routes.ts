import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { search } from '../controllers/search.controller';
import { searchRateLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(authenticate);

// Global search endpoint with rate limiting
router.get('/', searchRateLimiter, search);

export default router;
