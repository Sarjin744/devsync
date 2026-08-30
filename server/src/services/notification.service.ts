import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { io } from '../sockets';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title?: string;
  message: string;
  projectId?: string | null;
  taskId?: string | null;
  actorId?: string | null;
}

export interface NotificationQueryFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

export async function createNotification(input: CreateNotificationInput) {
  // 1. Check user notification preferences if they exist
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId: input.userId },
  });

  if (preferences) {
    if (input.type === NotificationType.TASK_ASSIGNED && !preferences.taskAssignments) {
      return null;
    }
    if (
      (input.type === NotificationType.TASK_STATUS_CHANGED ||
        input.type === NotificationType.TASK_DUE_SOON ||
        input.type === NotificationType.TASK_OVERDUE) &&
      !preferences.taskUpdates
    ) {
      return null;
    }
    if (input.type === NotificationType.PROJECT_INVITATION && !preferences.projectInvitations) {
      return null;
    }
    if (input.type === NotificationType.MENTION && !preferences.mentions) {
      return null;
    }
  }

  // 2. Persist notification to PostgreSQL
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title ?? '',
      message: input.message,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      actorId: input.actorId ?? null,
    },
  });

  const serialized = {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    userId: notification.userId,
    projectId: notification.projectId,
    taskId: notification.taskId,
    actorId: notification.actorId,
    createdAt: notification.createdAt.toISOString(),
  };

  // 3. Emit real-time notification to user's private socket room
  if (io) {
    const userRoom = `user:${input.userId}`;
    io.to(userRoom).emit('notification:new', serialized);

    // Also push updated unread count
    prisma.notification
      .count({ where: { userId: input.userId, isRead: false } })
      .then((count) => {
        io.to(userRoom).emit('notification:count', { count });
      })
      .catch(() => {});
  }

  return serialized;
}

export async function getUserNotifications(
  userId: string,
  filters: NotificationQueryFilters = {},
) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const where: { userId: string; isRead?: boolean } = { userId };
  if (typeof filters.isRead === 'boolean') {
    where.isRead = filters.isRead;
  }

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  const serialized = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    userId: n.userId,
    projectId: n.projectId,
    taskId: n.taskId,
    actorId: n.actorId,
    createdAt: n.createdAt.toISOString(),
  }));

  return {
    notifications: serialized,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
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

  if (io) {
    const userRoom = `user:${userId}`;
    io.to(userRoom).emit('notification:read', { notificationId });
    const count = await getUnreadCount(userId);
    io.to(userRoom).emit('notification:count', { count });
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  if (io) {
    const userRoom = `user:${userId}`;
    io.to(userRoom).emit('notification:read-all', { userId });
    io.to(userRoom).emit('notification:count', { count: 0 });
  }
}

export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError('Notification');
  if (notification.userId !== userId) throw new ForbiddenError('Not your notification');

  await prisma.notification.delete({ where: { id: notificationId } });

  if (io) {
    const userRoom = `user:${userId}`;
    const count = await getUnreadCount(userId);
    io.to(userRoom).emit('notification:count', { count });
  }
}
