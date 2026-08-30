import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
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

export async function getProjectMessages(
  projectId: string,
  userId: string,
  page: number,
  limit: number,
) {
  await requireProjectMember(projectId, userId);

  const total = await prisma.message.count({ where: { projectId } });
  const skip = (page - 1) * limit;

  const messages = await prisma.message.findMany({
    where: { projectId },
    include: { sender: { select: USER_SELECT } },
    orderBy: { createdAt: 'asc' },
    skip,
    take: limit,
  });

  return {
    items: messages.map((m) => ({
      id: m.id,
      content: m.content,
      projectId: m.projectId,
      senderId: m.senderId,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      user: {
        ...m.sender,
        createdAt: m.sender.createdAt.toISOString(),
        updatedAt: m.sender.updatedAt.toISOString(),
      },
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function deleteMessage(messageId: string, userId: string): Promise<void> {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new NotFoundError('Message');
  if (message.senderId !== userId) {
    throw new ForbiddenError('You can only delete your own messages');
  }

  await prisma.message.delete({ where: { id: messageId } });
}
