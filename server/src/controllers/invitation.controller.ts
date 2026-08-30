import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as InvitationService from '../services/invitation.service';
import { sendSuccess } from '../utils/response';

export async function getMyInvitations(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const invitations = await InvitationService.getUserInvitations(userId);
  sendSuccess(res, invitations);
}

export async function acceptInvitation(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const result = await InvitationService.acceptInvitation(req.params.invitationId, userId);
  sendSuccess(res, result, 'Invitation accepted');
}

export async function rejectInvitation(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const result = await InvitationService.rejectInvitation(req.params.invitationId, userId);
  sendSuccess(res, result, 'Invitation rejected');
}
