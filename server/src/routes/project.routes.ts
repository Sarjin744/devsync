import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
} from '../validators/project.validator';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  archiveProject,
  restoreProject,
  deleteProject,
  leaveProject,
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from '../controllers/project.controller';

import {
  createProjectTask,
  getProjectTasks,
} from '../controllers/task.controller';
import { createTaskSchema } from '../validators/task.validator';
import { getMessages } from '../controllers/message.controller';
import { getProjectActivity } from '../controllers/activity.controller';
import { uploadFile, getFiles } from '../controllers/file.controller';
import { upload } from '../middleware/upload';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// Project CRUD & Lifecycle
router.post('/', validate({ body: createProjectSchema }), createProject);
router.get('/', getProjects);
router.get('/:projectId', getProject);
router.patch('/:projectId', validate({ body: updateProjectSchema }), updateProject);
router.put('/:projectId', validate({ body: updateProjectSchema }), updateProject); // Compatibility
router.post('/:projectId/archive', archiveProject);
router.patch('/:projectId/archive', archiveProject); // Compatibility
router.post('/:projectId/restore', restoreProject);
router.delete('/:projectId', deleteProject);
router.post('/:projectId/leave', leaveProject);

// Project Files
router.get('/:projectId/files', getFiles);
router.post('/:projectId/files', upload.single('file'), uploadFile);

// Project Activity
router.get('/:projectId/activity', getProjectActivity);

// Project Messages / Chat
router.get('/:projectId/messages', getMessages);

// Project Tasks
router.get('/:projectId/tasks', getProjectTasks);
router.post('/:projectId/tasks', validate({ body: createTaskSchema }), createProjectTask);

// Project Members
router.get('/:projectId/members', getProjectMembers);
router.post('/:projectId/members', validate({ body: addProjectMemberSchema }), addProjectMember);
router.patch('/:projectId/members/:userId', validate({ body: updateProjectMemberRoleSchema }), updateProjectMemberRole);
router.put('/:projectId/members/:userId/role', validate({ body: updateProjectMemberRoleSchema }), updateProjectMemberRole); // Compatibility
router.delete('/:projectId/members/:userId', removeProjectMember);

export default router;
