import { prisma } from '../config/database';
import { requireProjectMember } from './project.service';

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

interface CreateActivityInput {
  type: string;
  description: string;
  projectId: string;
  userId: string;
}

export async function createActivity(input: CreateActivityInput) {
  return prisma.activity.create({
    data: {
      type: input.type as 'PROJECT_CREATED' | 'PROJECT_UPDATED' | 'MEMBER_ADDED' | 'MEMBER_REMOVED' | 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED' | 'TASK_COMPLETED' | 'TASK_DELETED' | 'COMMENT_ADDED' | 'FILE_UPLOADED',
      description: input.description,
      projectId: input.projectId,
      userId: input.userId,
    },
  });
}

export async function getProjectActivity(
  projectId: string,
  userId: string,
  page: number,
  limit: number,
) {
  await requireProjectMember(projectId, userId);

  const total = await prisma.activity.count({ where: { projectId } });
  const skip = (page - 1) * limit;

  const activities = await prisma.activity.findMany({
    where: { projectId },
    include: { user: { select: USER_SELECT } },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  return {
    items: activities.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      user: {
        ...a.user,
        createdAt: a.user.createdAt.toISOString(),
        updatedAt: a.user.updatedAt.toISOString(),
      },
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUserActivity(userId: string) {
  const activities = await prisma.activity.findMany({
    where: { userId },
    include: { user: { select: USER_SELECT } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return activities.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    user: {
      ...a.user,
      createdAt: a.user.createdAt.toISOString(),
      updatedAt: a.user.updatedAt.toISOString(),
    },
  }));
}
