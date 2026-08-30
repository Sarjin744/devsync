import { prisma } from '../config/prisma';
import { requireProjectMember } from './project.service';

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

export interface CreateActivityInput {
  projectId: string;
  userId: string;
  action: string;
  type?: string;
  description: string;
  entityType?: string;
  entityId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

export async function createActivity(input: CreateActivityInput) {
  return prisma.activity.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      action: input.action,
      type: input.type || input.action,
      description: input.description,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      metadata: input.metadata || null,
    },
  });
}

export async function getProjectActivity(
  projectId: string,
  userId: string,
  page = 1,
  limit = 30,
  type?: string,
) {
  await requireProjectMember(projectId, userId);

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  // Build filter where clause
  const where: { projectId: string; action?: string } = { projectId };
  if (type && type !== 'ALL') {
    where.action = type;
  }

  const [total, activities] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
  ]);

  const serialized = activities.map((a) => ({
    id: a.id,
    action: a.action,
    type: a.type || a.action,
    description: a.description,
    entityType: a.entityType,
    entityId: a.entityId,
    metadata: a.metadata,
    projectId: a.projectId,
    userId: a.userId,
    createdAt: a.createdAt.toISOString(),
    user: {
      ...a.user,
      createdAt: a.user.createdAt.toISOString(),
      updatedAt: a.user.updatedAt.toISOString(),
    },
  }));

  return {
    activities: serialized,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
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
    id: a.id,
    action: a.action,
    type: a.type || a.action,
    description: a.description,
    entityType: a.entityType,
    entityId: a.entityId,
    metadata: a.metadata,
    projectId: a.projectId,
    userId: a.userId,
    createdAt: a.createdAt.toISOString(),
    user: {
      ...a.user,
      createdAt: a.user.createdAt.toISOString(),
      updatedAt: a.user.updatedAt.toISOString(),
    },
  }));
}
