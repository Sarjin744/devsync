import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { ProjectRole, TeamRole } from '@prisma/client';

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
 * Foundation for role-based access control (RBAC).
 * Creates a middleware that checks if the user's role satisfies the required minimum role.
 *
 * @param minimumRole The minimum required role in the hierarchy
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
