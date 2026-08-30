import { prisma } from '../config/database';
import { ForbiddenError, NotFoundError, ConflictError } from '../utils/errors';
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

const PROJECT_SELECT = {
  id: true,
  name: true,
  description: true,
  status: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createProject(
  userId: string,
  data: { name: string; description?: string },
) {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      ownerId: userId,
      members: {
        create: { userId, role: 'OWNER' },
      },
    },
    select: PROJECT_SELECT,
  });

  await createActivity({
    type: 'PROJECT_CREATED',
    description: `Project "${project.name}" was created`,
    projectId: project.id,
    userId,
  });

  return serializeProject(project);
}

export async function getUserProjects(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        select: {
          ...PROJECT_SELECT,
          _count: {
            select: {
              tasks: true,
              members: true,
            },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return memberships.map((m) => ({
    ...serializeProject(m.project),
    role: m.role,
  }));
}

export async function getProjectById(projectId: string, userId: string) {
  await requireProjectMember(projectId, userId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: { user: { select: USER_SELECT } },
      },
      _count: {
        select: {
          tasks: true,
          members: true,
        },
      },
    },
  });

  if (!project) throw new NotFoundError('Project');

  // Count tasks by status
  const taskCounts = await prisma.task.groupBy({
    by: ['status'],
    where: { projectId },
    _count: true,
  });

  const counts = {
    total: 0,
    todo: 0,
    inProgress: 0,
    inReview: 0,
    done: 0,
  };

  taskCounts.forEach((tc) => {
    counts.total += tc._count;
    if (tc.status === 'TODO') counts.todo = tc._count;
    if (tc.status === 'IN_PROGRESS') counts.inProgress = tc._count;
    if (tc.status === 'IN_REVIEW') counts.inReview = tc._count;
    if (tc.status === 'DONE') counts.done = tc._count;
  });

  return {
    ...serializeProject(project),
    members: project.members.map((m) => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
      user: {
        ...m.user,
        createdAt: m.user.createdAt.toISOString(),
        updatedAt: m.user.updatedAt.toISOString(),
      },
    })),
    taskCounts: counts,
  };
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: { name?: string; description?: string },
) {
  await requireOwnerOrLead(projectId, userId);

  const project = await prisma.project.update({
    where: { id: projectId },
    data,
    select: PROJECT_SELECT,
  });

  await createActivity({
    type: 'PROJECT_UPDATED',
    description: `Project "${project.name}" was updated`,
    projectId,
    userId,
  });

  return serializeProject(project);
}

export async function archiveProject(projectId: string, userId: string) {
  await requireOwner(projectId, userId);

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { status: 'ARCHIVED' },
    select: PROJECT_SELECT,
  });

  return serializeProject(project);
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  await requireOwner(projectId, userId);
  await prisma.project.delete({ where: { id: projectId } });
}

export async function addMember(
  projectId: string,
  requesterId: string,
  data: { userId: string; role?: string },
) {
  await requireOwnerOrLead(projectId, requesterId);

  const existing = await prisma.projectMember.findFirst({
    where: { projectId, userId: data.userId },
  });
  if (existing) throw new ConflictError('User is already a project member');

  const member = await prisma.projectMember.create({
    data: {
      projectId,
      userId: data.userId,
      role: (data.role as 'OWNER' | 'TEAM_LEAD' | 'DEVELOPER' | 'VIEWER') ?? 'DEVELOPER',
    },
    include: { user: { select: USER_SELECT } },
  });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });

  await createActivity({
    type: 'MEMBER_ADDED',
    description: `A new member was added to "${project?.name}"`,
    projectId,
    userId: requesterId,
  });

  await createNotification({
    type: 'PROJECT_MEMBER_ADDED',
    message: `You were added to the project "${project?.name}"`,
    userId: data.userId,
    referenceId: projectId,
    referenceType: 'PROJECT',
  });

  return {
    ...member,
    joinedAt: member.joinedAt.toISOString(),
    user: {
      ...member.user,
      createdAt: member.user.createdAt.toISOString(),
      updatedAt: member.user.updatedAt.toISOString(),
    },
  };
}

export async function removeMember(
  projectId: string,
  targetUserId: string,
  requesterId: string,
): Promise<void> {
  await requireOwnerOrLead(projectId, requesterId);

  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId: targetUserId },
  });
  if (!member) throw new NotFoundError('Project member');

  await prisma.projectMember.delete({ where: { id: member.id } });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });

  await createActivity({
    type: 'MEMBER_REMOVED',
    description: `A member was removed from "${project?.name}"`,
    projectId,
    userId: requesterId,
  });
}

export async function updateMemberRole(
  projectId: string,
  targetUserId: string,
  requesterId: string,
  role: string,
) {
  await requireOwnerOrLead(projectId, requesterId);

  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId: targetUserId },
  });
  if (!member) throw new NotFoundError('Project member');

  const updated = await prisma.projectMember.update({
    where: { id: member.id },
    data: { role: role as 'OWNER' | 'TEAM_LEAD' | 'DEVELOPER' | 'VIEWER' },
    include: { user: { select: USER_SELECT } },
  });

  return {
    ...updated,
    joinedAt: updated.joinedAt.toISOString(),
    user: {
      ...updated.user,
      createdAt: updated.user.createdAt.toISOString(),
      updatedAt: updated.user.updatedAt.toISOString(),
    },
  };
}

export async function getProjectMembers(projectId: string, userId: string) {
  await requireProjectMember(projectId, userId);

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: USER_SELECT } },
  });

  return members.map((m) => ({
    ...m,
    joinedAt: m.joinedAt.toISOString(),
    user: {
      ...m.user,
      createdAt: m.user.createdAt.toISOString(),
      updatedAt: m.user.updatedAt.toISOString(),
    },
  }));
}

// ─── Helpers ─────────────────────────────────────────────────

export async function requireProjectMember(
  projectId: string,
  userId: string,
): Promise<void> {
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!member) throw new ForbiddenError('You are not a member of this project');
}

async function requireOwnerOrLead(projectId: string, userId: string) {
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId, role: { in: ['OWNER', 'TEAM_LEAD'] } },
  });
  if (!member) throw new ForbiddenError('Insufficient project permissions');
}

async function requireOwner(projectId: string, userId: string) {
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId, role: 'OWNER' },
  });
  if (!member) throw new ForbiddenError('Only the project owner can perform this action');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeProject(project: any) {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
