import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { requireProjectMember } from './project.service';
import { createActivity } from './activity.service';
import { createNotification } from './notification.service';

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

export async function createComment(
  userId: string,
  data: { taskId: string; content: string },
) {
  const task = await prisma.task.findUnique({
    where: { id: data.taskId },
    select: { projectId: true, creatorId: true, title: true },
  });
  if (!task) throw new NotFoundError('Task');

  await requireProjectMember(task.projectId, userId);

  const comment = await prisma.taskComment.create({
    data: {
      content: data.content,
      taskId: data.taskId,
      userId,
    },
    include: { user: { select: USER_SELECT } },
  });

  await createActivity({
    action: 'COMMENT_ADDED',
    description: `A comment was added to task "${task.title}"`,
    projectId: task.projectId,
    userId,
  });

  if (task.creatorId !== userId) {
    await createNotification({
      type: 'TASK_COMMENTED',
      title: 'New Comment',
      message: `Someone commented on your task "${task.title}"`,
      userId: task.creatorId,
    });
  }

  return {
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    user: {
      ...comment.user,
      createdAt: comment.user.createdAt.toISOString(),
      updatedAt: comment.user.updatedAt.toISOString(),
    },
  };
}

export async function getTaskComments(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) throw new NotFoundError('Task');

  await requireProjectMember(task.projectId, userId);

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: { user: { select: USER_SELECT } },
    orderBy: { createdAt: 'asc' },
  });

  return comments.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    user: {
      ...c.user,
      createdAt: c.user.createdAt.toISOString(),
      updatedAt: c.user.updatedAt.toISOString(),
    },
  }));
}

export async function updateComment(commentId: string, userId: string, content: string) {
  const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new NotFoundError('Comment');
  if (comment.userId !== userId) throw new ForbiddenError('You can only edit your own comments');

  const updated = await prisma.taskComment.update({
    where: { id: commentId },
    data: { content },
    include: { user: { select: USER_SELECT } },
  });

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    user: {
      ...updated.user,
      createdAt: updated.user.createdAt.toISOString(),
      updatedAt: updated.user.updatedAt.toISOString(),
    },
  };
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new NotFoundError('Comment');
  if (comment.userId !== userId) throw new ForbiddenError('You can only delete your own comments');

  await prisma.taskComment.delete({ where: { id: commentId } });
}
