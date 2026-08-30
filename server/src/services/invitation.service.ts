import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { InvitationStatus, TeamRole } from '@prisma/client';
import type { CreateInvitationInput } from '../validators/invitation.validator';

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

export async function createInvitation(
  teamId: string,
  invitedById: string,
  input: CreateInvitationInput,
) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  });

  if (!team) throw new NotFoundError('Team');

  // Verify inviter is team owner
  if (team.ownerId !== invitedById) {
    throw new ForbiddenError('Only the team owner can send invitations');
  }

  // Find target user
  let targetUser = null;
  if (input.userId) {
    targetUser = await prisma.user.findUnique({
      where: { id: input.userId },
      select: USER_SELECT,
    });
  } else if (input.email) {
    targetUser = await prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      select: USER_SELECT,
    });
  }

  if (!targetUser) {
    throw new NotFoundError('User to invite');
  }

  // Prevent inviting yourself
  if (targetUser.id === invitedById) {
    throw new BadRequestError('You cannot invite yourself to a team you already own');
  }

  // Check if user is already a team member
  const isAlreadyMember = team.members.some((m) => m.userId === targetUser.id);
  if (isAlreadyMember) {
    throw new ConflictError('User is already a member of this team');
  }

  // Check if active pending invitation already exists
  const existingPending = await prisma.teamInvitation.findFirst({
    where: {
      teamId,
      invitedUserId: targetUser.id,
      status: InvitationStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingPending) {
    throw new ConflictError('A pending invitation already exists for this user in this team');
  }

  // 7-day expiration for invitations
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.teamInvitation.create({
    data: {
      teamId,
      invitedById,
      invitedUserId: targetUser.id,
      role: input.role ?? TeamRole.MEMBER,
      status: InvitationStatus.PENDING,
      expiresAt,
    },
    include: {
      team: true,
      invitedBy: { select: USER_SELECT },
      invitedUser: { select: USER_SELECT },
    },
  });

  return {
    id: invitation.id,
    teamId: invitation.teamId,
    invitedById: invitation.invitedById,
    invitedUserId: invitation.invitedUserId,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
    team: {
      id: invitation.team.id,
      name: invitation.team.name,
      description: invitation.team.description,
      ownerId: invitation.team.ownerId,
      createdAt: invitation.team.createdAt.toISOString(),
      updatedAt: invitation.team.updatedAt.toISOString(),
    },
    invitedBy: {
      ...invitation.invitedBy,
      createdAt: invitation.invitedBy.createdAt.toISOString(),
      updatedAt: invitation.invitedBy.updatedAt.toISOString(),
    },
    invitedUser: {
      ...invitation.invitedUser,
      createdAt: invitation.invitedUser.createdAt.toISOString(),
      updatedAt: invitation.invitedUser.updatedAt.toISOString(),
    },
  };
}

export async function getUserInvitations(userId: string) {
  const invitations = await prisma.teamInvitation.findMany({
    where: {
      invitedUserId: userId,
      status: InvitationStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    include: {
      team: {
        include: {
          owner: { select: USER_SELECT },
          _count: { select: { members: true } },
        },
      },
      invitedBy: { select: USER_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return invitations.map((inv) => ({
    id: inv.id,
    teamId: inv.teamId,
    role: inv.role,
    status: inv.status,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
    team: {
      id: inv.team.id,
      name: inv.team.name,
      description: inv.team.description,
      ownerId: inv.team.ownerId,
      memberCount: inv.team._count.members,
      owner: {
        ...inv.team.owner,
        createdAt: inv.team.owner.createdAt.toISOString(),
        updatedAt: inv.team.owner.updatedAt.toISOString(),
      },
      createdAt: inv.team.createdAt.toISOString(),
      updatedAt: inv.team.updatedAt.toISOString(),
    },
    invitedBy: {
      ...inv.invitedBy,
      createdAt: inv.invitedBy.createdAt.toISOString(),
      updatedAt: inv.invitedBy.updatedAt.toISOString(),
    },
  }));
}

export async function acceptInvitation(invitationId: string, userId: string) {
  const invitation = await prisma.teamInvitation.findUnique({
    where: { id: invitationId },
    include: { team: true },
  });

  if (!invitation) throw new NotFoundError('Invitation');

  if (invitation.invitedUserId !== userId) {
    throw new ForbiddenError('You cannot accept an invitation intended for another user');
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new BadRequestError(`Invitation cannot be accepted because it is ${invitation.status.toLowerCase()}`);
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.EXPIRED },
    });
    throw new BadRequestError('Invitation has expired');
  }

  // Transaction: Add user to TeamMember and mark invitation ACCEPTED
  await prisma.$transaction(async (tx) => {
    // Check if membership was somehow already added
    const existing = await tx.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: invitation.teamId,
          userId,
        },
      },
    });

    if (!existing) {
      await tx.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId,
          role: invitation.role,
        },
      });
    }

    await tx.teamInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.ACCEPTED },
    });
  });

  return {
    success: true,
    message: 'Invitation accepted successfully',
    teamId: invitation.teamId,
  };
}

export async function rejectInvitation(invitationId: string, userId: string) {
  const invitation = await prisma.teamInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) throw new NotFoundError('Invitation');

  if (invitation.invitedUserId !== userId) {
    throw new ForbiddenError('You cannot reject an invitation intended for another user');
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new BadRequestError(`Invitation cannot be rejected because it is ${invitation.status.toLowerCase()}`);
  }

  await prisma.teamInvitation.update({
    where: { id: invitationId },
    data: { status: InvitationStatus.REJECTED },
  });

  return {
    success: true,
    message: 'Invitation rejected',
  };
}
