import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
} from '../controllers/invitation.controller';

const router = Router();

// All invitation endpoints require authentication
router.use(authenticate);

// List user's pending invitations
router.get('/', getMyInvitations);

// Accept an invitation
router.post('/:invitationId/accept', acceptInvitation);

// Reject an invitation
router.post('/:invitationId/reject', rejectInvitation);

export default router;
