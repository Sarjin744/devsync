import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as TeamService from '../services/team.service';
import * as InvitationService from '../services/invitation.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createTeam(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const team = await TeamService.createTeam(userId, req.body);
  sendCreated(res, team, 'Team created successfully');
}

export async function getTeams(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const teams = await TeamService.getUserTeams(userId);
  sendSuccess(res, teams);
}

export async function getTeam(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const team = await TeamService.getTeamById(req.params.teamId, userId);
  sendSuccess(res, team);
}

export async function updateTeam(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const team = await TeamService.updateTeam(req.params.teamId, userId, req.body);
  sendSuccess(res, team, 'Team updated successfully');
}

export async function deleteTeam(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await TeamService.deleteTeam(req.params.teamId, userId);
  sendSuccess(res, null, 'Team deleted successfully');
}

export async function getTeamMembers(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const members = await TeamService.getTeamMembers(req.params.teamId, userId);
  sendSuccess(res, members);
}

export async function updateMemberRole(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const member = await TeamService.updateMemberRole(
    req.params.teamId,
    req.params.userId,
    userId,
    req.body.role,
  );
  sendSuccess(res, member, 'Member role updated successfully');
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  await TeamService.removeMember(req.params.teamId, req.params.userId, userId);
  sendSuccess(res, null, 'Member removed successfully');
}

export async function createTeamInvitation(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const invitation = await InvitationService.createInvitation(
    req.params.teamId,
    userId,
    req.body,
  );
  sendCreated(res, invitation, 'Invitation sent successfully');
}
