import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { TeamRole } from '@prisma/client';
import type { CreateTeamInput, UpdateTeamInput } from '../validators/team.validator';

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

export async function createTeam(
  userId: string,
  data: CreateTeamInput,
) {
  const team = await prisma.$transaction(async (tx) => {
    const newTeam = await tx.team.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        ownerId: userId,
      },
    });

    await tx.teamMember.create({
      data: {
        teamId: newTeam.id,
        userId,
        role: TeamRole.OWNER,
      },
    });

    return newTeam;
  });

  return getTeamById(team.id, userId);
}

export async function getUserTeams(userId: string) {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          owner: { select: USER_SELECT },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return memberships.map((m) => ({
    id: m.team.id,
    name: m.team.name,
    description: m.team.description,
    ownerId: m.team.ownerId,
    role: m.role,
    owner: {
      ...m.team.owner,
      createdAt: m.team.owner.createdAt.toISOString(),
      updatedAt: m.team.owner.updatedAt.toISOString(),
    },
    memberCount: m.team._count.members,
    createdAt: m.team.createdAt.toISOString(),
    updatedAt: m.team.updatedAt.toISOString(),
  }));
}

export async function getTeamById(teamId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      owner: { select: USER_SELECT },
      members: {
        include: { user: { select: USER_SELECT } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { members: true } },
    },
  });

  if (!team) throw new NotFoundError('Team');

  const isMember = team.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new ForbiddenError('You are not a member of this team');
  }

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    ownerId: team.ownerId,
    owner: {
      ...team.owner,
      createdAt: team.owner.createdAt.toISOString(),
      updatedAt: team.owner.updatedAt.toISOString(),
    },
    members: team.members.map((m) => ({
      id: m.id,
      teamId: m.teamId,
      userId: m.userId,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
      user: {
        ...m.user,
        createdAt: m.user.createdAt.toISOString(),
        updatedAt: m.user.updatedAt.toISOString(),
      },
    })),
    memberCount: team._count.members,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

export async function updateTeam(
  teamId: string,
  userId: string,
  data: UpdateTeamInput,
) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError('Team');

  if (team.ownerId !== userId) {
    throw new ForbiddenError('Only the team owner can update team details');
  }

  await prisma.team.update({
    where: { id: teamId },
    data: {
      name: data.name ? data.name.trim() : undefined,
      description: data.description !== undefined ? data.description : undefined,
    },
  });

  return getTeamById(teamId, userId);
}

export async function deleteTeam(teamId: string, userId: string): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError('Team');

  if (team.ownerId !== userId) {
    throw new ForbiddenError('Only the team owner can delete the team');
  }

  await prisma.team.delete({ where: { id: teamId } });
}

export async function getTeamMembers(teamId: string, userId: string) {
  // Verify requester is a team member
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });

  if (!membership) {
    throw new ForbiddenError('You are not a member of this team');
  }

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: { user: { select: USER_SELECT } },
    orderBy: { createdAt: 'asc' },
  });

  return members.map((m) => ({
    id: m.id,
    teamId: m.teamId,
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

export async function updateMemberRole(
  teamId: string,
  targetUserId: string,
  requesterId: string,
  newRole: TeamRole,
) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError('Team');

  if (team.ownerId !== requesterId) {
    throw new ForbiddenError('Only the team owner can change member roles');
  }

  if (targetUserId === team.ownerId && newRole !== TeamRole.OWNER) {
    throw new ForbiddenError('Cannot demote the team owner');
  }

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: targetUserId } },
  });

  if (!member) throw new NotFoundError('Team member');

  const updated = await prisma.teamMember.update({
    where: { id: member.id },
    data: { role: newRole },
    include: { user: { select: USER_SELECT } },
  });

  return {
    id: updated.id,
    teamId: updated.teamId,
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

export async function removeMember(
  teamId: string,
  targetUserId: string,
  requesterId: string,
): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError('Team');

  // Allow team owner to remove anyone (except self), or member to remove self (leave)
  const isOwner = team.ownerId === requesterId;
  const isSelf = targetUserId === requesterId;

  if (!isOwner && !isSelf) {
    throw new ForbiddenError('You do not have permission to remove this member');
  }

  if (isSelf && isOwner) {
    throw new ForbiddenError('Team owner cannot leave the team. Delete the team or transfer ownership.');
  }

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: targetUserId } },
  });

  if (!member) throw new NotFoundError('Team member');

  await prisma.teamMember.delete({ where: { id: member.id } });
}
