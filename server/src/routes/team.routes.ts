import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
  removeMember,
  updateMemberRole,
  leaveTeam,
} from '../controllers/team.controller';

const router = Router();

router.use(authenticate);

router.post('/', createTeam);
router.get('/', getTeams);
router.get('/:teamId', getTeam);
router.put('/:teamId', updateTeam);
router.delete('/:teamId', deleteTeam);
router.post('/:teamId/members', inviteMember);
router.delete('/:teamId/members/:userId', removeMember);
router.put('/:teamId/members/:userId/role', updateMemberRole);
router.delete('/:teamId/leave', leaveTeam);

export default router;
