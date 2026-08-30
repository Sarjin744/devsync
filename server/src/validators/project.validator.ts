import { z } from 'zod';
import { ProjectRole, ProjectStatus } from '@prisma/client';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  description: z.string().max(500, 'Description cannot exceed 500 characters').nullable().optional(),
  teamId: z.string().min(1, 'Team ID is required').nullable().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100).optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const addProjectMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.nativeEnum(ProjectRole).default(ProjectRole.DEVELOPER),
});

export const updateProjectMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectRole, {
    errorMap: () => ({ message: 'Role must be OWNER, TEAM_LEAD, DEVELOPER, or VIEWER' }),
  }),
});

export const projectQuerySchema = z.object({
  teamId: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberRoleInput = z.infer<typeof updateProjectMemberRoleSchema>;
export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
