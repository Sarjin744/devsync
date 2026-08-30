import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['OWNER', 'TEAM_LEAD', 'DEVELOPER', 'VIEWER']).default('DEVELOPER'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'TEAM_LEAD', 'DEVELOPER', 'VIEWER']),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
