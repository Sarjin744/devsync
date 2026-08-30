import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  createTeamSchema,
  updateTeamSchema,
  updateMemberRoleSchema,
} from '../validators/team.validator';
import { createInvitationSchema } from '../validators/invitation.validator';
import {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  updateMemberRole,
  removeMember,
  createTeamInvitation,
} from '../controllers/team.controller';

const router = Router();

// All team routes require authentication
router.use(authenticate);

// Team CRUD
router.post('/', validate({ body: createTeamSchema }), createTeam);
router.get('/', getTeams);
router.get('/:teamId', getTeam);
router.patch('/:teamId', validate({ body: updateTeamSchema }), updateTeam);
router.put('/:teamId', validate({ body: updateTeamSchema }), updateTeam); // Compatibility
router.delete('/:teamId', deleteTeam);

// Team Members
router.get('/:teamId/members', getTeamMembers);
router.patch('/:teamId/members/:userId', validate({ body: updateMemberRoleSchema }), updateMemberRole);
router.put('/:teamId/members/:userId/role', validate({ body: updateMemberRoleSchema }), updateMemberRole);
router.delete('/:teamId/members/:userId', removeMember);

// Team Invitations from Team Context
router.post('/:teamId/invitations', validate({ body: createInvitationSchema }), createTeamInvitation);

export default router;
