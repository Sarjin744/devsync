import { prisma } from '../config/prisma';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { hashPassword, comparePassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/jwt';
import type { RegisterInput, LoginInput } from '../validators/auth.validator';

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

export async function registerUser(input: RegisterInput) {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      isOnline: true,
    },
    select: USER_SELECT,
  });

  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken(user.id);
  const tokenHash = hashToken(refreshToken);

  // Store hashed refresh token in database
  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      bio: user.bio,
      isOnline: user.isOnline,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    accessToken,
    refreshToken,
  };
}

export async function loginUser(input: LoginInput) {
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { ...USER_SELECT, passwordHash: true },
  });

  // Generic error to avoid revealing if email exists
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await comparePassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update online status
  await prisma.user.update({
    where: { id: user.id },
    data: { isOnline: true },
  });

  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken(user.id);
  const tokenHash = hashToken(refreshToken);

  // Store hashed refresh token in database
  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...safeUser } = user;

  return {
    user: {
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      profileImage: safeUser.profileImage,
      bio: safeUser.bio,
      isOnline: true,
      createdAt: safeUser.createdAt.toISOString(),
      updatedAt: safeUser.updatedAt.toISOString(),
    },
    accessToken,
    refreshToken,
  };
}

export async function logoutUser(userId?: string, refreshToken?: string): Promise<void> {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });
  }

  if (userId) {
    // If no specific refreshToken provided, delete all user tokens
    if (!refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false },
    }).catch(() => null);
  }
}

export async function refreshAccessToken(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  // Check if token exists, is not expired, and is not revoked
  if (!stored || stored.expiresAt < new Date() || stored.revokedAt) {
    throw new UnauthorizedError('Refresh token expired or revoked. Please log in again.');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Token rotation: Revoke / delete previous refresh token
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  // Issue new access token and new rotated refresh token
  const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });
  const newRefreshToken = generateRefreshToken(user.id);
  const newTokenHash = hashToken(newRefreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash: newTokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  });

  if (!user) throw new NotFoundError('User');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...safeUser } = user as unknown as { passwordHash?: string; [key: string]: unknown };

  return {
    ...safeUser,
    createdAt: (user.createdAt as Date).toISOString(),
    updatedAt: (user.updatedAt as Date).toISOString(),
  };
}

export async function changePassword(
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
