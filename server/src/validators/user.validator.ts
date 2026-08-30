import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').nullable().optional(),
  profileImage: z.string().url('Profile image must be a valid URL').nullable().optional().or(z.literal('')),
});

export const changeUserPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'New password must contain at least one number'),
    confirmNewPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });

export const userSearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query must not be empty').max(100),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangeUserPasswordInput = z.infer<typeof changeUserPasswordSchema>;
export type UserSearchQueryInput = z.infer<typeof userSearchQuerySchema>;
