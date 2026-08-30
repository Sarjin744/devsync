import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors';
import { TaskStatus, TaskPriority, ProjectRole, NotificationType } from '@prisma/client';
import { createActivity } from './activity.service';
import { createNotification } from './notification.service';
import type { CreateTaskInput, UpdateTaskInput, TaskQueryInput } from '../validators/task.validator';

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

export async function createTask(
  projectId: string,
  userId: string,
  data: CreateTaskInput,
) {
  // 1. Verify project exists & requester is a project member with task creation permission
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const requesterMember = project.members.find((m) => m.userId === userId);
  const isOwner = project.ownerId === userId || requesterMember?.role === ProjectRole.OWNER;
  const isLead = requesterMember?.role === ProjectRole.TEAM_LEAD;
  const isDev = requesterMember?.role === ProjectRole.DEVELOPER;

  if (!isOwner && !isLead && !isDev) {
    throw new ForbiddenError('You do not have permission to create tasks in this project');
  }

  // 2. If assignee is specified, verify assignee is a member of the project
  if (data.assigneeId) {
    const isAssigneeMember = project.members.some((m) => m.userId === data.assigneeId);
    if (!isAssigneeMember && project.ownerId !== data.assigneeId) {
      throw new BadRequestError('Assignee must be an active member of this project');
    }
  }

  // 3. Create task
  const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

  const task = await prisma.task.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      status: TaskStatus.TODO,
      priority: data.priority ?? TaskPriority.MEDIUM,
      projectId,
      creatorId: userId,
      assigneeId: data.assigneeId || null,
      dueDate: parsedDueDate,
    },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      project: { select: { id: true, name: true } },
    },
  });

  // Log activity
  createActivity({
    action: 'TASK_CREATED',
    description: `Created task "${task.title}"`,
    projectId,
    userId,
    entityType: 'TASK',
    entityId: task.id,
  }).catch(() => {});

  // Send notification to assignee if assigned to someone else
  if (task.assigneeId && task.assigneeId !== userId) {
    createNotification({
      userId: task.assigneeId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'New Task Assignment',
      message: `You were assigned to task "${task.title}" in ${project.name}`,
      projectId: task.projectId,
      taskId: task.id,
      actorId: userId,
    }).catch(() => {});
  }

  return serializeTask(task);
}

export async function getProjectTasks(
  projectId: string,
  userId: string,
  query: TaskQueryInput,
) {
  // Verify requester is a project member
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const isMember = project.members.some((m) => m.userId === userId);
  if (!isMember && project.ownerId !== userId) {
    throw new ForbiddenError('You do not have permission to view tasks in this project');
  }

  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  // Build filter where clause
  const where: {
    projectId: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
  } = {
    projectId,
  };

  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.assigneeId) where.assigneeId = query.assigneeId;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignee: { select: USER_SELECT },
        creator: { select: USER_SELECT },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    tasks: tasks.map(serializeTask),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getTaskById(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          members: true,
        },
      },
    },
  });

  if (!task) throw new NotFoundError('Task');

  const isMember = task.project.members.some((m) => m.userId === userId);
  if (!isMember && task.project.ownerId !== userId) {
    throw new ForbiddenError('You do not have permission to view this task');
  }

  return serializeTask(task);
}

export async function updateTask(
  taskId: string,
  userId: string,
  data: UpdateTaskInput,
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: { members: true },
      },
    },
  });

  if (!task) throw new NotFoundError('Task');

  const requesterMember = task.project.members.find((m) => m.userId === userId);
  const isOwner = task.project.ownerId === userId || requesterMember?.role === ProjectRole.OWNER;
  const isLead = requesterMember?.role === ProjectRole.TEAM_LEAD;
  const isAssigned = task.assigneeId === userId;
  const isCreator = task.creatorId === userId;

  if (!isOwner && !isLead && !isAssigned && !isCreator) {
    throw new ForbiddenError('You do not have permission to modify this task');
  }

  // If reassigning, verify permissions and new assignee validity
  if (data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
    if (!isOwner && !isLead && !isCreator) {
      throw new ForbiddenError('Only project owner, lead, or task creator can reassign tasks');
    }

    if (data.assigneeId !== null) {
      const isNewAssigneeMember = task.project.members.some((m) => m.userId === data.assigneeId);
      if (!isNewAssigneeMember && task.project.ownerId !== data.assigneeId) {
        throw new BadRequestError('Assignee must be an active member of this project');
      }
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title !== undefined ? data.title.trim() : undefined,
      description: data.description !== undefined ? data.description : undefined,
      status: data.status !== undefined ? data.status : undefined,
      priority: data.priority !== undefined ? data.priority : undefined,
      assigneeId: data.assigneeId !== undefined ? data.assigneeId : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
    },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      project: { select: { id: true, name: true } },
    },
  });

  // Log activity
  createActivity({
    action: 'TASK_UPDATED',
    description: `Updated task "${updated.title}"`,
    projectId: task.projectId,
    userId,
    entityType: 'TASK',
    entityId: task.id,
  }).catch(() => {});

  // Send assignment notification if assignee changed
  if (data.assigneeId && data.assigneeId !== task.assigneeId && data.assigneeId !== userId) {
    createNotification({
      userId: data.assigneeId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'Task Assigned',
      message: `You were assigned to task "${updated.title}" in ${task.project.name}`,
      projectId: task.projectId,
      taskId: task.id,
      actorId: userId,
    }).catch(() => {});
  }

  return serializeTask(updated);
}

export async function updateTaskStatus(
  taskId: string,
  userId: string,
  status: TaskStatus,
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: { members: true },
      },
    },
  });

  if (!task) throw new NotFoundError('Task');

  const requesterMember = task.project.members.find((m) => m.userId === userId);
  const isOwner = task.project.ownerId === userId || requesterMember?.role === ProjectRole.OWNER;
  const isLead = requesterMember?.role === ProjectRole.TEAM_LEAD;
  const isDev = requesterMember?.role === ProjectRole.DEVELOPER;
  const isCreator = task.creatorId === userId;

  if (!isOwner && !isLead && !isDev && !isCreator) {
    throw new ForbiddenError('You do not have permission to update task status');
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      project: { select: { id: true, name: true } },
    },
  });

  const actionName = status === TaskStatus.DONE ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED';

  // Log activity
  createActivity({
    action: actionName,
    description: `Moved task "${updated.title}" to ${status.replace('_', ' ')}`,
    projectId: task.projectId,
    userId,
    entityType: 'TASK',
    entityId: task.id,
    metadata: { fromStatus: task.status, toStatus: status },
  }).catch(() => {});

  // Notify task creator if someone else changed status
  if (task.creatorId && task.creatorId !== userId) {
    createNotification({
      userId: task.creatorId,
      type: NotificationType.TASK_STATUS_CHANGED,
      title: 'Task Status Updated',
      message: `Task "${updated.title}" was moved to ${status.replace('_', ' ')}`,
      projectId: task.projectId,
      taskId: task.id,
      actorId: userId,
    }).catch(() => {});
  }

  // Notify assignee if someone else changed status
  if (task.assigneeId && task.assigneeId !== userId && task.assigneeId !== task.creatorId) {
    createNotification({
      userId: task.assigneeId,
      type: NotificationType.TASK_STATUS_CHANGED,
      title: 'Task Status Updated',
      message: `Your task "${updated.title}" was moved to ${status.replace('_', ' ')}`,
      projectId: task.projectId,
      taskId: task.id,
      actorId: userId,
    }).catch(() => {});
  }

  return serializeTask(updated);
}

export async function deleteTask(taskId: string, userId: string): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: { members: true },
      },
    },
  });

  if (!task) throw new NotFoundError('Task');

  const requesterMember = task.project.members.find((m) => m.userId === userId);
  const isOwner = task.project.ownerId === userId || requesterMember?.role === ProjectRole.OWNER;
  const isLead = requesterMember?.role === ProjectRole.TEAM_LEAD;
  const isCreator = task.creatorId === userId;

  if (!isOwner && !isLead && !isCreator) {
    throw new ForbiddenError('Only project owner, team lead, or task creator can delete this task');
  }

  // Log activity before deleting
  createActivity({
    action: 'TASK_DELETED',
    description: `Deleted task "${task.title}"`,
    projectId: task.projectId,
    userId,
    entityType: 'TASK',
    entityId: task.id,
  }).catch(() => {});

  await prisma.task.delete({ where: { id: taskId } });
}

export async function getMyTasks(userId: string) {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId },
    include: {
      assignee: { select: USER_SELECT },
      creator: { select: USER_SELECT },
      project: { select: { id: true, name: true, status: true } },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  });

  return tasks.map(serializeTask);
}

// ─── Helpers ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTask(task: any) {
  const now = new Date();
  const isOverdue =
    task.dueDate && task.status !== TaskStatus.DONE && new Date(task.dueDate) < now;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    creatorId: task.creatorId,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    isOverdue: Boolean(isOverdue),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    project: task.project
      ? {
          id: task.project.id,
          name: task.project.name,
          status: task.project.status,
        }
      : undefined,
    assignee: task.assignee
      ? {
          ...task.assignee,
          createdAt: task.assignee.createdAt.toISOString(),
          updatedAt: task.assignee.updatedAt.toISOString(),
        }
      : null,
    creator: task.creator
      ? {
          ...task.creator,
          createdAt: task.creator.createdAt.toISOString(),
          updatedAt: task.creator.updatedAt.toISOString(),
        }
      : undefined,
  };
}
