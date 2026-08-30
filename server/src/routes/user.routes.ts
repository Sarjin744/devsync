import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  updateProfileSchema,
  changeUserPasswordSchema,
  userSearchQuerySchema,
} from '../validators/user.validator';
import {
  getMe,
  updateMe,
  changePassword,
  searchUsers,
  getProfile,
} from '../controllers/user.controller';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Profile and Password endpoints for current user
router.get('/me', getMe);
router.patch('/me', validate({ body: updateProfileSchema }), updateMe);
router.put('/me', validate({ body: updateProfileSchema }), updateMe); // Backward compatibility
router.patch('/me/password', validate({ body: changeUserPasswordSchema }), changePassword);

// User search
router.get('/search', validate({ query: userSearchQuerySchema }), searchUsers);

// Individual profile by ID
router.get('/:userId', getProfile);

export default router;
