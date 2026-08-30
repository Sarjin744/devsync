import { prisma } from '../config/prisma';
import { createNotification } from '../services/notification.service';
import { NotificationType, TaskStatus } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Check for tasks due within the reminder window (default: 24 hours) and send notifications.
 * Deduplicates to prevent sending duplicate notifications for the same task.
 */
export async function checkDueSoonTasks(windowHours = 24): Promise<number> {
  const now = new Date();
  const reminderThreshold = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const dueSoonTasks = await prisma.task.findMany({
    where: {
      status: { not: TaskStatus.DONE },
      assigneeId: { not: null },
      dueDate: {
        gte: now,
        lte: reminderThreshold,
      },
    },
    include: {
      assignee: true,
      project: true,
    },
  });

  let notificationsSent = 0;

  for (const task of dueSoonTasks) {
    if (!task.assigneeId) continue;

    // Deduplication check: Has a TASK_DUE_SOON notification already been sent for this task?
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: task.assigneeId,
        taskId: task.id,
        type: NotificationType.TASK_DUE_SOON,
      },
    });

    if (!existingNotification) {
      await createNotification({
        userId: task.assigneeId,
        type: NotificationType.TASK_DUE_SOON,
        title: 'Task Due Soon',
        message: `Task "${task.title}" in ${task.project.name} is due on ${task.dueDate?.toLocaleDateString()}`,
        projectId: task.projectId,
        taskId: task.id,
      });
      notificationsSent++;
    }
  }

  logger.info(`Due soon task check completed: ${notificationsSent} notifications generated.`);
  return notificationsSent;
}

/**
 * Check for overdue tasks and send overdue notifications to assignees.
 * Deduplicates to prevent spamming notifications repeatedly.
 */
export async function checkOverdueTasks(): Promise<number> {
  const now = new Date();

  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { not: TaskStatus.DONE },
      assigneeId: { not: null },
      dueDate: {
        lt: now,
      },
    },
    include: {
      assignee: true,
      project: true,
    },
  });

  let notificationsSent = 0;

  for (const task of overdueTasks) {
    if (!task.assigneeId) continue;

    // Deduplication check: Has a TASK_OVERDUE notification already been sent for this task?
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: task.assigneeId,
        taskId: task.id,
        type: NotificationType.TASK_OVERDUE,
      },
    });

    if (!existingNotification) {
      await createNotification({
        userId: task.assigneeId,
        type: NotificationType.TASK_OVERDUE,
        title: 'Task Overdue',
        message: `Task "${task.title}" in ${task.project.name} is overdue!`,
        projectId: task.projectId,
        taskId: task.id,
      });
      notificationsSent++;
    }
  }

  logger.info(`Overdue task check completed: ${notificationsSent} notifications generated.`);
  return notificationsSent;
}
