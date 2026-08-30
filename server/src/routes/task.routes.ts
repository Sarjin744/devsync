import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus,
} from '../controllers/task.controller';

const router = Router();

router.use(authenticate);

router.post('/', createTask);
router.get('/', getTasks);
router.get('/:taskId', getTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);
router.patch('/:taskId/assign', assignTask);
router.patch('/:taskId/status', updateTaskStatus);

export default router;
