import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  getUserProjects,
  getUserTasks,
  searchUsers,
} from '../controllers/user.controller';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/search', searchUsers);
router.get('/:userId', getProfile);
router.put('/profile', updateProfile);
router.post('/avatar', upload.single('avatar'), uploadAvatar);
router.get('/:userId/projects', getUserProjects);
router.get('/:userId/tasks', getUserTasks);

export default router;
