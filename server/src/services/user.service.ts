import { prisma } from '../config/prisma';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import { hashPassword, comparePassword } from '../utils/password';
import type { UpdateProfileInput } from '../validators/user.validator';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  profileImage: true,
  bio: true,
  isOnline: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  });

  if (!user) throw new NotFoundError('User');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...safeUser } = user as unknown as {
    passwordHash?: string;
    [key: string]: unknown;
  };

  return {
    ...safeUser,
    createdAt: (user.createdAt as Date).toISOString(),
    updatedAt: (user.updatedAt as Date).toISOString(),
  };
}

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileInput,
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name?.trim(),
      bio: data.bio !== undefined ? data.bio : undefined,
      profileImage: data.profileImage !== undefined ? data.profileImage : undefined,
    },
    select: USER_SELECT,
  });

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) throw new NotFoundError('User');

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Current password is incorrect');

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  // Invalidate all active sessions upon password change
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function searchUsers(
  query: string,
  excludeUserId: string,
  page = 1,
  limit = 20,
) {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      users: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  const skip = (page - 1) * limit;

  const whereClause = {
    AND: [
      { id: { not: excludeUserId } },
      {
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' as const } },
          { email: { contains: trimmed, mode: 'insensitive' as const } },
        ],
      },
    ],
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      select: USER_SELECT,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  return {
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
