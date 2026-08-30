import { prisma } from '../config/database';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { requireProjectMember } from './project.service';
import { createActivity } from './activity.service';
import { createNotification } from './notification.service';

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

interface TaskFilters {
  status?: string;
  assigneeId?: string;
}

export async function createTask(userId: string, data: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  projectId: string;
  assigneeId?: string;
  dueDate?: string;
}) {
  await requireProjectMember(data.projectId, userId);

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      status: (data.status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE') ?? 'TODO',
      priority: (data.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') ?? 'MEDIUM',
      projectId: data.projectId,
      creatorId: userId,
      assigneeId: data.assigneeId ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      _count: { select: { comments: true } },
    },
  });

  await createActivity({
    type: 'TASK_CREATED',
    description: `Task "${task.title}" was created`,
    projectId: task.projectId,
    userId,
  });

  if (task.assigneeId && task.assigneeId !== userId) {
    await createNotification({
      type: 'TASK_ASSIGNED',
      message: `You were assigned to task "${task.title}"`,
      userId: task.assigneeId,
      referenceId: task.id,
      referenceType: 'TASK',
    });
  }

  return serializeTask(task);
}

export async function getProjectTasks(
  projectId: string,
  userId: string,
  filters: TaskFilters,
) {
  await requireProjectMember(projectId, userId);

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      ...(filters.status ? { status: filters.status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      _count: { select: { comments: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  return tasks.map(serializeTask);
}

export async function getTaskById(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      comments: {
        include: { user: { select: USER_SELECT } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { comments: true } },
    },
  });

  if (!task) throw new NotFoundError('Task');

  await requireProjectMember(task.projectId, userId);

  return {
    ...serializeTask(task),
    comments: task.comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      user: {
        ...c.user,
        createdAt: c.user.createdAt.toISOString(),
        updatedAt: c.user.updatedAt.toISOString(),
      },
    })),
  };
}

export async function updateTask(
  taskId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    dueDate?: string | null;
  },
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError('Task');

  await requireProjectMemberOrCreator(task.projectId, userId, task.creatorId);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title,
      description: data.description,
      status: data.status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | undefined,
      priority: data.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined,
      assigneeId: data.assigneeId,
      dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
    },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      _count: { select: { comments: true } },
    },
  });

  await createActivity({
    type: 'TASK_UPDATED',
    description: `Task "${updated.title}" was updated`,
    projectId: updated.projectId,
    userId,
  });

  return serializeTask(updated);
}

export async function deleteTask(taskId: string, userId: string): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError('Task');

  await requireOwnerOrLead(task.projectId, userId);

  await createActivity({
    type: 'TASK_DELETED',
    description: `Task "${task.title}" was deleted`,
    projectId: task.projectId,
    userId,
  });

  await prisma.task.delete({ where: { id: taskId } });
}

export async function assignTask(
  taskId: string,
  requesterId: string,
  assigneeId: string | null,
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError('Task');

  await requireOwnerOrLead(task.projectId, requesterId);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      _count: { select: { comments: true } },
    },
  });

  if (assigneeId && assigneeId !== requesterId) {
    await createNotification({
      type: 'TASK_ASSIGNED',
      message: `You were assigned to task "${task.title}"`,
      userId: assigneeId,
      referenceId: taskId,
      referenceType: 'TASK',
    });
  }

  await createActivity({
    type: 'TASK_ASSIGNED',
    description: `Task "${task.title}" was ${assigneeId ? 'assigned' : 'unassigned'}`,
    projectId: task.projectId,
    userId: requesterId,
  });

  return serializeTask(updated);
}

export async function updateTaskStatus(
  taskId: string,
  userId: string,
  status: string,
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError('Task');

  await requireProjectMember(task.projectId, userId);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      _count: { select: { comments: true } },
    },
  });

  const activityType = status === 'DONE' ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED';
  await createActivity({
    type: activityType,
    description: `Task "${task.title}" status changed to ${status.replace('_', ' ')}`,
    projectId: task.projectId,
    userId,
  });

  if (task.creatorId !== userId) {
    await createNotification({
      type: 'TASK_STATUS_CHANGED',
      message: `Task "${task.title}" was moved to ${status.replace('_', ' ')}`,
      userId: task.creatorId,
      referenceId: taskId,
      referenceType: 'TASK',
    });
  }

  return serializeTask(updated);
}

// ─── Helpers ─────────────────────────────────────────────────

async function requireProjectMemberOrCreator(
  projectId: string,
  userId: string,
  creatorId: string,
) {
  if (userId === creatorId) return;
  await requireOwnerOrLead(projectId, userId);
}

async function requireOwnerOrLead(projectId: string, userId: string) {
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId, role: { in: ['OWNER', 'TEAM_LEAD'] } },
  });
  if (!member) throw new ForbiddenError('Insufficient permissions for this action');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTask(task: any) {
  return {
    ...task,
    commentCount: task._count?.comments ?? 0,
    _count: undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    dueDate: task.dueDate?.toISOString() ?? null,
    assignee: task.assignee
      ? {
          ...task.assignee,
          createdAt: task.assignee.createdAt.toISOString(),
          updatedAt: task.assignee.updatedAt.toISOString(),
        }
      : null,
    creator: {
      ...task.creator,
      createdAt: task.creator.createdAt.toISOString(),
      updatedAt: task.creator.updatedAt.toISOString(),
    },
  };
}
