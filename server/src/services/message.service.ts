import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';

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

export async function getProjectMessages(
  projectId: string,
  userId: string,
  page = 1,
  limit = 30,
  before?: string,
) {
  // 1. Verify project exists & requester is a project member
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const isMember = project.members.some((m) => m.userId === userId);
  if (!isMember && project.ownerId !== userId) {
    throw new ForbiddenError('You do not have permission to view messages in this project');
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  // Build where clause
  const where: { projectId: string; createdAt?: { lt: Date } } = { projectId };
  if (before) {
    const beforeMessage = await prisma.message.findUnique({ where: { id: before } });
    if (beforeMessage) {
      where.createdAt = { lt: beforeMessage.createdAt };
    }
  }

  const [total, messages] = await Promise.all([
    prisma.message.count({ where: { projectId } }),
    prisma.message.findMany({
      where,
      include: { sender: { select: USER_SELECT } },
      orderBy: { createdAt: 'asc' },
      skip: before ? 0 : skip,
      take: safeLimit,
    }),
  ]);

  const serializedMessages = messages.map((m) => ({
    id: m.id,
    content: m.content,
    projectId: m.projectId,
    senderId: m.senderId,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    sender: {
      ...m.sender,
      createdAt: m.sender.createdAt.toISOString(),
      updatedAt: m.sender.updatedAt.toISOString(),
    },
    user: {
      ...m.sender,
      createdAt: m.sender.createdAt.toISOString(),
      updatedAt: m.sender.updatedAt.toISOString(),
    },
  }));

  const pagination = {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };

  return {
    messages: serializedMessages,
    pagination,
  };
}

export async function deleteMessage(messageId: string, userId: string): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { project: { include: { members: true } } },
  });

  if (!message) throw new NotFoundError('Message');

  const isSender = message.senderId === userId;
  const isOwner = message.project.ownerId === userId;

  if (!isSender && !isOwner) {
    throw new ForbiddenError('You do not have permission to delete this message');
  }

  await prisma.message.delete({ where: { id: messageId } });
}
