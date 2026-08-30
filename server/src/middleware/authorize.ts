import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { ProjectRole, TeamRole, Team, TeamMember } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface TeamRequest extends AuthenticatedRequest {
  team: Team;
  teamMember: TeamMember;
}

export type AllowedRoles = ProjectRole | TeamRole | 'ANY';

/**
 * Role hierarchy levels for project roles (higher number = more privileges).
 */
export const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  [ProjectRole.OWNER]: 4,
  [ProjectRole.TEAM_LEAD]: 3,
  [ProjectRole.DEVELOPER]: 2,
  [ProjectRole.VIEWER]: 1,
};

/**
 * Middleware ensuring the authenticated user is an active member of the specified team.
 * Attaches the verified team and membership records to the request.
 */
export async function requireTeamMember(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.userId) {
    throw new UnauthorizedError('Authentication required');
  }

  const teamId = req.params.teamId || req.body?.teamId;
  if (!teamId) {
    throw new NotFoundError('Team');
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new NotFoundError('Team');
  }

  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: authReq.userId,
      },
    },
  });

  if (!membership) {
    throw new ForbiddenError('You are not a member of this team');
  }

  (req as TeamRequest).team = team;
  (req as TeamRequest).teamMember = membership;

  next();
}

/**
 * Middleware ensuring the authenticated user is the OWNER of the specified team.
 */
export async function requireTeamOwner(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.userId) {
    throw new UnauthorizedError('Authentication required');
  }

  const teamId = req.params.teamId || req.body?.teamId;
  if (!teamId) {
    throw new NotFoundError('Team');
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new NotFoundError('Team');
  }

  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: authReq.userId,
      },
    },
  });

  if (!membership || membership.role !== TeamRole.OWNER) {
    throw new ForbiddenError('Only the team owner can perform this action');
  }

  (req as TeamRequest).team = team;
  (req as TeamRequest).teamMember = membership;

  next();
}

/**
 * Foundation for project role-based access control (RBAC).
 */
export function requireMinimumProjectRole(minimumRole: ProjectRole) {
  const requiredLevel = PROJECT_ROLE_HIERARCHY[minimumRole];

  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
    userRole?: ProjectRole,
  ): void => {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!userRole) {
      throw new ForbiddenError('No project role assigned');
    }

    const userLevel = PROJECT_ROLE_HIERARCHY[userRole] ?? 0;
    if (userLevel < requiredLevel) {
      throw new ForbiddenError(
        `Requires at least ${minimumRole} role. Current role: ${userRole}`,
      );
    }

    next();
  };
}

/**
 * Helper to check if a specific role is permitted among a list of allowed roles.
 */
export function hasRequiredRole(
  userRole: ProjectRole | TeamRole | undefined,
  allowedRoles: (ProjectRole | TeamRole)[],
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}
