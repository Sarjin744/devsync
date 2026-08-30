import { z } from 'zod';
import { TeamRole } from '@prisma/client';

export const createInvitationSchema = z
  .object({
    email: z.string().email('Invalid email address').optional(),
    userId: z.string().uuid('Invalid user ID').optional(),
    role: z.nativeEnum(TeamRole).default(TeamRole.MEMBER),
  })
  .refine((data) => data.email !== undefined || data.userId !== undefined, {
    message: 'Either email or userId must be provided to invite a user',
    path: ['email'],
  });

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
