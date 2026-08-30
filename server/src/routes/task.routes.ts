import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from '../validators/task.validator';
import {
  createProjectTask,
  getProjectTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getMyTasks,
} from '../controllers/task.controller';

const router = Router();

router.use(authenticate);

// My tasks (across all projects)
router.get('/my', getMyTasks);

// Direct tasks querying & creation (supports ?projectId=... and body.projectId)
router.get('/', getProjectTasks);
router.post('/', validate({ body: createTaskSchema }), createProjectTask);

// Task individual operations
router.get('/:taskId', getTask);
router.patch('/:taskId', validate({ body: updateTaskSchema }), updateTask);
router.put('/:taskId', validate({ body: updateTaskSchema }), updateTask); // Compatibility
router.patch('/:taskId/status', validate({ body: updateTaskStatusSchema }), updateTaskStatus);
router.delete('/:taskId', deleteTask);

export default router;
