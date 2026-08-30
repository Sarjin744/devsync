import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import path from 'path';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
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

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string; bio?: string },
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      bio: data.bio,
    },
    select: USER_SELECT,
  });

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function updateAvatar(
  userId: string,
  file: Express.Multer.File,
) {
  const avatarUrl = `/uploads/${path.basename(file.path)}`;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarUrl },
    select: USER_SELECT,
  });

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function getUserProjects(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return memberships.map((m) => ({
    ...m.project,
    role: m.role,
    createdAt: m.project.createdAt.toISOString(),
    updatedAt: m.project.updatedAt.toISOString(),
  }));
}

export async function getUserTasks(userId: string) {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      _count: { select: { comments: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return tasks.map((t) => ({
    ...t,
    commentCount: t._count.comments,
    _count: undefined,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    dueDate: t.dueDate?.toISOString() ?? null,
  }));
}

export async function searchUsers(query: string, excludeUserId: string) {
  if (!query || query.trim().length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: excludeUserId } },
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: USER_SELECT,
    take: 20,
  });

  return users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));
}
