import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { ProjectRole, TeamRole, Team, TeamMember, Project, ProjectMember } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface TeamRequest extends AuthenticatedRequest {
  team: Team;
  teamMember: TeamMember;
}

export interface ProjectRequest extends AuthenticatedRequest {
  project: Project;
  projectMember: ProjectMember;
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
 * Middleware ensuring the authenticated user is a member of the specified project.
 */
export async function requireProjectMember(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.userId) {
    throw new UnauthorizedError('Authentication required');
  }

  const projectId = req.params.projectId || req.body?.projectId;
  if (!projectId) {
    throw new NotFoundError('Project');
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: authReq.userId,
      },
    },
  });

  if (!membership && project.ownerId !== authReq.userId) {
    throw new ForbiddenError('You are not a member of this project');
  }

  (req as ProjectRequest).project = project;
  if (membership) {
    (req as ProjectRequest).projectMember = membership;
  }

  next();
}

/**
 * Middleware ensuring the user has at least the specified minimum project role.
 */
export function requireProjectRole(minimumRole: ProjectRole) {
  const requiredLevel = PROJECT_ROLE_HIERARCHY[minimumRole];

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const projectId = req.params.projectId || req.body?.projectId;
    if (!projectId) {
      throw new NotFoundError('Project');
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project');
    }

    // Owner always has maximum level
    if (project.ownerId === authReq.userId) {
      (req as ProjectRequest).project = project;
      next();
      return;
    }

    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: authReq.userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this project');
    }

    const userLevel = PROJECT_ROLE_HIERARCHY[membership.role] ?? 0;
    if (userLevel < requiredLevel) {
      throw new ForbiddenError(`This action requires at least ${minimumRole} role`);
    }

    (req as ProjectRequest).project = project;
    (req as ProjectRequest).projectMember = membership;

    next();
  };
}

/**
 * Middleware ensuring the user is the project OWNER.
 */
export const requireProjectOwner = requireProjectRole(ProjectRole.OWNER);

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
