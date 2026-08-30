import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { io } from '../sockets';
import { sendNotificationToUser } from '../sockets/notification.handler';
import { NotificationType } from '@prisma/client';

interface CreateNotificationInput {
  type: NotificationType | string;
  title?: string;
  message: string;
  userId: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      type: input.type as NotificationType,
      title: input.title ?? '',
      message: input.message,
      userId: input.userId,
    },
  });

  // Send real-time notification if user is online
  if (io) {
    sendNotificationToUser(io, input.userId, {
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  return notification;
}

export async function getUserNotifications(
  userId: string,
  page: number,
  limit: number,
) {
  const total = await prisma.notification.count({ where: { userId } });
  const skip = (page - 1) * limit;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  return {
    items: notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError('Notification');
  if (notification.userId !== userId) throw new ForbiddenError('Not your notification');

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError('Notification');
  if (notification.userId !== userId) throw new ForbiddenError('Not your notification');

  await prisma.notification.delete({ where: { id: notificationId } });
}
