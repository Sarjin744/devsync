import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError, ConflictError } from '../utils/errors';
import { ProjectRole, ProjectStatus, NotificationType } from '@prisma/client';
import { createActivity } from './activity.service';
import { createNotification } from './notification.service';
import type { CreateProjectInput, UpdateProjectInput, ProjectQueryInput } from '../validators/project.validator';

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

export async function createProject(
  userId: string,
  data: CreateProjectInput,
) {
  // If teamId is specified, verify user belongs to the team
  if (data.teamId) {
    const teamMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: data.teamId,
          userId,
        },
      },
    });

    if (!teamMembership) {
      throw new ForbiddenError('You must belong to the team to create a project under it');
    }
  }

  const project = await prisma.$transaction(async (tx) => {
    const newProject = await tx.project.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        teamId: data.teamId || null,
        ownerId: userId,
        status: ProjectStatus.ACTIVE,
      },
    });

    await tx.projectMember.create({
      data: {
        projectId: newProject.id,
        userId,
        role: ProjectRole.OWNER,
      },
    });

    return newProject;
  });

  // Log activity
  createActivity({
    action: 'PROJECT_CREATED',
    description: `Created project "${project.name}"`,
    projectId: project.id,
    userId,
    entityType: 'PROJECT',
    entityId: project.id,
  }).catch(() => {});

  return getProjectById(project.id, userId);
}

export async function getUserProjects(
  userId: string,
  filters?: ProjectQueryInput,
) {
  const whereClause: {
    members: { some: { userId: string } };
    teamId?: string;
    status?: ProjectStatus;
  } = {
    members: { some: { userId } },
  };

  if (filters?.teamId) {
    whereClause.teamId = filters.teamId;
  }

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      owner: { select: USER_SELECT },
      team: { select: { id: true, name: true } },
      members: {
        where: { userId },
        select: { role: true },
      },
      _count: {
        select: {
          members: true,
          tasks: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    teamId: p.teamId,
    team: p.team,
    status: p.status,
    ownerId: p.ownerId,
    role: p.members[0]?.role || ProjectRole.VIEWER,
    owner: {
      ...p.owner,
      createdAt: p.owner.createdAt.toISOString(),
      updatedAt: p.owner.updatedAt.toISOString(),
    },
    memberCount: p._count.members,
    taskCount: p._count.tasks,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getProjectById(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: USER_SELECT },
      team: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      members: {
        include: { user: { select: USER_SELECT } },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: {
          members: true,
          tasks: true,
        },
      },
    },
  });

  if (!project) throw new NotFoundError('Project');

  const userMembership = project.members.find((m) => m.userId === userId);
  const isOwner = project.ownerId === userId;

  if (!userMembership && !isOwner) {
    throw new ForbiddenError('You do not have permission to view this project');
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    teamId: project.teamId,
    team: project.team,
    status: project.status,
    ownerId: project.ownerId,
    role: userMembership?.role || (isOwner ? ProjectRole.OWNER : ProjectRole.VIEWER),
    owner: {
      ...project.owner,
      createdAt: project.owner.createdAt.toISOString(),
      updatedAt: project.owner.updatedAt.toISOString(),
    },
    members: project.members.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      userId: m.userId,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
      user: {
        ...m.user,
        createdAt: m.user.createdAt.toISOString(),
        updatedAt: m.user.updatedAt.toISOString(),
      },
    })),
    memberCount: project._count.members,
    taskCount: project._count.tasks,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: UpdateProjectInput,
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const member = project.members.find((m) => m.userId === userId);
  const isOwner = project.ownerId === userId || member?.role === ProjectRole.OWNER;
  const isLead = member?.role === ProjectRole.TEAM_LEAD;

  if (!isOwner && !isLead) {
    throw new ForbiddenError('Only the project owner or team lead can update project details');
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      description: data.description !== undefined ? data.description : undefined,
      status: data.status !== undefined ? data.status : undefined,
    },
  });

  return getProjectById(projectId, userId);
}

export async function archiveProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const member = project.members.find((m) => m.userId === userId);
  const isOwner = project.ownerId === userId || member?.role === ProjectRole.OWNER;
  const isLead = member?.role === ProjectRole.TEAM_LEAD;

  if (!isOwner && !isLead) {
    throw new ForbiddenError('Only the project owner or team lead can archive the project');
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.ARCHIVED },
  });

  createActivity({
    action: 'PROJECT_ARCHIVED',
    description: `Archived project "${project.name}"`,
    projectId,
    userId,
    entityType: 'PROJECT',
    entityId: projectId,
  }).catch(() => {});

  return getProjectById(projectId, userId);
}

export async function restoreProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const member = project.members.find((m) => m.userId === userId);
  const isOwner = project.ownerId === userId || member?.role === ProjectRole.OWNER;

  if (!isOwner) {
    throw new ForbiddenError('Only the project owner can restore an archived project');
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.ACTIVE },
  });

  createActivity({
    action: 'PROJECT_RESTORED',
    description: `Restored project "${project.name}"`,
    projectId,
    userId,
    entityType: 'PROJECT',
    entityId: projectId,
  }).catch(() => {});

  return getProjectById(projectId, userId);
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const member = project.members.find((m) => m.userId === userId);
  const isOwner = project.ownerId === userId || member?.role === ProjectRole.OWNER;

  if (!isOwner) {
    throw new ForbiddenError('Only the project owner can permanently delete the project');
  }

  await prisma.project.delete({ where: { id: projectId } });
}

export async function leaveProject(projectId: string, userId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) throw new NotFoundError('Project');

  if (project.ownerId === userId) {
    throw new ForbiddenError('Project owner cannot leave the project. Transfer ownership or delete the project.');
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });

  if (!membership) {
    throw new NotFoundError('Project membership');
  }

  await prisma.projectMember.delete({ where: { id: membership.id } });
}

export async function getProjectMembers(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const isMember = project.members.some((m) => m.userId === userId);
  if (!isMember && project.ownerId !== userId) {
    throw new ForbiddenError('You are not a member of this project');
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: USER_SELECT } },
    orderBy: { createdAt: 'asc' },
  });

  return members.map((m) => ({
    id: m.id,
    projectId: m.projectId,
    userId: m.userId,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
    user: {
      ...m.user,
      createdAt: m.user.createdAt.toISOString(),
      updatedAt: m.user.updatedAt.toISOString(),
    },
  }));
}

export async function addProjectMember(
  projectId: string,
  requesterId: string,
  data: { userId: string; role?: ProjectRole },
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const requesterMember = project.members.find((m) => m.userId === requesterId);
  const isOwner = project.ownerId === requesterId || requesterMember?.role === ProjectRole.OWNER;
  const isLead = requesterMember?.role === ProjectRole.TEAM_LEAD;

  if (!isOwner && !isLead) {
    throw new ForbiddenError('Only project owner or team lead can add members');
  }

  // If project has parent team, verify target user belongs to parent team
  if (project.teamId) {
    const isTeamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: project.teamId,
          userId: data.userId,
        },
      },
    });

    if (!isTeamMember) {
      throw new ForbiddenError('User must belong to the parent team to be added to this project');
    }
  }

  // Check if already a project member
  const existing = project.members.find((m) => m.userId === data.userId);
  if (existing) {
    throw new ConflictError('User is already a member of this project');
  }

  const newMember = await prisma.projectMember.create({
    data: {
      projectId,
      userId: data.userId,
      role: data.role ?? ProjectRole.DEVELOPER,
    },
    include: { user: { select: USER_SELECT } },
  });

  // Log activity
  createActivity({
    action: 'MEMBER_ADDED',
    description: `Added ${newMember.user.name} to the project`,
    projectId,
    userId: requesterId,
    entityType: 'USER',
    entityId: data.userId,
  }).catch(() => {});

  // Notify member
  if (data.userId !== requesterId) {
    createNotification({
      userId: data.userId,
      type: NotificationType.PROJECT_MEMBER_ADDED,
      title: 'Added to Project',
      message: `You were added to project "${project.name}"`,
      projectId,
      actorId: requesterId,
    }).catch(() => {});
  }

  return {
    id: newMember.id,
    projectId: newMember.projectId,
    userId: newMember.userId,
    role: newMember.role,
    createdAt: newMember.createdAt.toISOString(),
    user: {
      ...newMember.user,
      createdAt: newMember.user.createdAt.toISOString(),
      updatedAt: newMember.user.updatedAt.toISOString(),
    },
  };
}

export async function updateProjectMemberRole(
  projectId: string,
  targetUserId: string,
  requesterId: string,
  role: ProjectRole,
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const requesterMember = project.members.find((m) => m.userId === requesterId);
  const isOwner = project.ownerId === requesterId || requesterMember?.role === ProjectRole.OWNER;

  if (!isOwner) {
    throw new ForbiddenError('Only the project owner can change member roles');
  }

  if (targetUserId === project.ownerId && role !== ProjectRole.OWNER) {
    throw new ForbiddenError('Cannot demote the project owner');
  }

  const member = project.members.find((m) => m.userId === targetUserId);
  if (!member) throw new NotFoundError('Project member');

  const updated = await prisma.projectMember.update({
    where: { id: member.id },
    data: { role },
    include: { user: { select: USER_SELECT } },
  });

  // Log activity
  createActivity({
    action: 'MEMBER_ROLE_CHANGED',
    description: `Changed ${updated.user.name}'s role to ${role}`,
    projectId,
    userId: requesterId,
    entityType: 'USER',
    entityId: targetUserId,
  }).catch(() => {});

  // Notify member
  if (targetUserId !== requesterId) {
    createNotification({
      userId: targetUserId,
      type: NotificationType.PROJECT_ROLE_CHANGED,
      title: 'Role Updated',
      message: `Your role in project "${project.name}" was changed to ${role}`,
      projectId,
      actorId: requesterId,
    }).catch(() => {});
  }

  return {
    id: updated.id,
    projectId: updated.projectId,
    userId: updated.userId,
    role: updated.role,
    createdAt: updated.createdAt.toISOString(),
    user: {
      ...updated.user,
      createdAt: updated.user.createdAt.toISOString(),
      updatedAt: updated.user.updatedAt.toISOString(),
    },
  };
}

export async function removeProjectMember(
  projectId: string,
  targetUserId: string,
  requesterId: string,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const requesterMember = project.members.find((m) => m.userId === requesterId);
  const isOwner = project.ownerId === requesterId || requesterMember?.role === ProjectRole.OWNER;
  const isLead = requesterMember?.role === ProjectRole.TEAM_LEAD;
  const isSelf = targetUserId === requesterId;

  if (!isOwner && !isLead && !isSelf) {
    throw new ForbiddenError('You do not have permission to remove this member');
  }

  if (targetUserId === project.ownerId) {
    throw new ForbiddenError('Cannot remove the project owner from the project');
  }

  const member = project.members.find((m) => m.userId === targetUserId);
  if (!member) throw new NotFoundError('Project member');

  // Log activity
  createActivity({
    action: 'MEMBER_REMOVED',
    description: `Removed member from the project`,
    projectId,
    userId: requesterId,
    entityType: 'USER',
    entityId: targetUserId,
  }).catch(() => {});

  // Notify member
  if (targetUserId !== requesterId) {
    createNotification({
      userId: targetUserId,
      type: NotificationType.PROJECT_MEMBER_REMOVED,
      title: 'Removed from Project',
      message: `You were removed from project "${project.name}"`,
      projectId,
      actorId: requesterId,
    }).catch(() => {});
  }

  await prisma.projectMember.delete({ where: { id: member.id } });
}

export async function requireProjectMember(
  projectId: string,
  userId: string,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw new NotFoundError('Project');

  const isMember = project.members.some((m) => m.userId === userId);
  if (!isMember && project.ownerId !== userId) {
    throw new ForbiddenError('You are not a member of this project');
  }
}
