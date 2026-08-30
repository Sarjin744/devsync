import { prisma } from '../config/database';
import { ForbiddenError, NotFoundError, ConflictError } from '../utils/errors';

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

export async function createTeam(
  userId: string,
  data: { name: string; description?: string },
) {
  const team = await prisma.team.create({
    data: {
      name: data.name,
      description: data.description,
      ownerId: userId,
      members: {
        create: { userId, role: 'OWNER' },
      },
    },
    include: {
      members: { include: { user: { select: USER_SELECT } } },
    },
  });

  return serializeTeam(team);
}

export async function getUserTeams(userId: string) {
  const teams = await prisma.team.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { include: { user: { select: USER_SELECT } } },
      _count: { select: { members: true } },
    },
  });

  return teams.map(serializeTeam);
}

export async function getTeamById(teamId: string, userId: string) {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      members: { some: { userId } },
    },
    include: {
      members: { include: { user: { select: USER_SELECT } } },
    },
  });

  if (!team) throw new NotFoundError('Team');

  return serializeTeam(team);
}

export async function updateTeam(
  teamId: string,
  userId: string,
  data: { name?: string; description?: string },
) {
  await requireOwnerOrLead(teamId, userId);

  const team = await prisma.team.update({
    where: { id: teamId },
    data,
    include: {
      members: { include: { user: { select: USER_SELECT } } },
    },
  });

  return serializeTeam(team);
}

export async function deleteTeam(teamId: string, userId: string): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError('Team');
  if (team.ownerId !== userId) throw new ForbiddenError('Only the team owner can delete the team');

  await prisma.team.delete({ where: { id: teamId } });
}

export async function inviteMember(
  teamId: string,
  inviterId: string,
  data: { userId: string; role?: string },
) {
  await requireOwnerOrLead(teamId, inviterId);

  const existing = await prisma.teamMember.findFirst({
    where: { teamId, userId: data.userId },
  });
  if (existing) throw new ConflictError('User is already a team member');

  const member = await prisma.teamMember.create({
    data: {
      teamId,
      userId: data.userId,
      role: (data.role as 'OWNER' | 'TEAM_LEAD' | 'DEVELOPER' | 'VIEWER') ?? 'DEVELOPER',
    },
    include: { user: { select: USER_SELECT } },
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
  teamId: string,
  targetUserId: string,
  requesterId: string,
): Promise<void> {
  await requireOwnerOrLead(teamId, requesterId);

  const member = await prisma.teamMember.findFirst({
    where: { teamId, userId: targetUserId },
  });
  if (!member) throw new NotFoundError('Team member');

  await prisma.teamMember.delete({ where: { id: member.id } });
}

export async function updateMemberRole(
  teamId: string,
  targetUserId: string,
  requesterId: string,
  role: string,
) {
  await requireOwnerOrLead(teamId, requesterId);

  const member = await prisma.teamMember.findFirst({
    where: { teamId, userId: targetUserId },
  });
  if (!member) throw new NotFoundError('Team member');

  const updated = await prisma.teamMember.update({
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

export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundError('Team');
  if (team.ownerId === userId) {
    throw new ForbiddenError('Owner cannot leave the team. Transfer ownership first.');
  }

  const member = await prisma.teamMember.findFirst({ where: { teamId, userId } });
  if (!member) throw new NotFoundError('Team membership');

  await prisma.teamMember.delete({ where: { id: member.id } });
}

// ─── Helpers ─────────────────────────────────────────────────

async function requireOwnerOrLead(teamId: string, userId: string) {
  const member = await prisma.teamMember.findFirst({
    where: { teamId, userId, role: { in: ['OWNER', 'TEAM_LEAD'] } },
  });
  if (!member) throw new ForbiddenError('Insufficient team permissions');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTeam(team: any) {
  return {
    ...team,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    members: team.members?.map((m: {
      joinedAt: Date;
      user: { createdAt: Date; updatedAt: Date };
      [key: string]: unknown;
    }) => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
      user: {
        ...m.user,
        createdAt: m.user.createdAt.toISOString(),
        updatedAt: m.user.updatedAt.toISOString(),
      },
    })),
  };
}
