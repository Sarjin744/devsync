import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  archiveProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole,
  getProjectMembers,
} from '../controllers/project.controller';

const router = Router();

router.use(authenticate);

router.post('/', createProject);
router.get('/', getProjects);
router.get('/:projectId', getProject);
router.put('/:projectId', updateProject);
router.patch('/:projectId/archive', archiveProject);
router.delete('/:projectId', deleteProject);

// Members
router.get('/:projectId/members', getProjectMembers);
router.post('/:projectId/members', addMember);
router.delete('/:projectId/members/:userId', removeMember);
router.put('/:projectId/members/:userId/role', updateMemberRole);

export default router;
