import { z } from 'zod';
import { TeamRole } from '@prisma/client';

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100),
  description: z.string().max(500, 'Description cannot exceed 500 characters').nullable().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100).optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').nullable().optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(TeamRole, {
    errorMap: () => ({ message: 'Role must be either OWNER or MEMBER' }),
  }),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
