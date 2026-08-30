import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';
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

function generateAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
    select: USER_SELECT,
  });

  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token with tokenHash
  await prisma.refreshToken.create({
    data: {
      tokenHash: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    tokens: { accessToken, refreshToken },
  };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...USER_SELECT, passwordHash: true },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token with tokenHash
  await prisma.refreshToken.create({
    data: {
      tokenHash: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...userWithoutPassword } = user;

  return {
    user: {
      ...userWithoutPassword,
      createdAt: userWithoutPassword.createdAt.toISOString(),
      updatedAt: userWithoutPassword.updatedAt.toISOString(),
    },
    tokens: { accessToken, refreshToken },
  };
}

export async function logoutUser(userId: string): Promise<void> {
  // Invalidate all refresh tokens for this user
  await prisma.refreshToken.deleteMany({ where: { userId } });

  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: false },
  });
}

export async function refreshAccessToken(token: string) {
  let payload: { userId: string };
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash: token, userId: payload.userId },
  });

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

  // Rotate refresh token
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const newAccessToken = generateAccessToken(user.id, user.email);
  const newRefreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      tokenHash: newRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  });

  if (!user) throw new NotFoundError('User');

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
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

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  // Invalidate all refresh tokens
  await prisma.refreshToken.deleteMany({ where: { userId } });
}
