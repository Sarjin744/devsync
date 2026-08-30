import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { generateAccessToken } from '../utils/jwt';
import { TeamRole, InvitationStatus } from '@prisma/client';

jest.mock('../config/prisma', () => {
  const original = jest.requireActual('../config/prisma');
  return {
    ...original,
    prisma: {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      team: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      teamMember: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      teamInvitation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
      $disconnect: jest.fn(),
    },
  };
});

describe('Teams, Members & Invitations Suite (Stage 4)', () => {
  const ownerUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Owner User',
    email: 'owner@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Team Owner',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const memberUser = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Member User',
    email: 'member@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Team Member',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const nonMemberUser = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Outsider User',
    email: 'outsider@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Not in team',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;

  const mockTeam = {
    id: 'team-uuid-100',
    name: 'DevSync Engineering',
    description: 'Core Engineering Team',
    ownerId: ownerUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: ownerUser,
    members: [
      {
        id: 'tm-1',
        teamId: 'team-uuid-100',
        userId: ownerUser.id,
        role: TeamRole.OWNER,
        createdAt: new Date(),
        user: ownerUser,
      },
      {
        id: 'tm-2',
        teamId: 'team-uuid-100',
        userId: memberUser.id,
        role: TeamRole.MEMBER,
        createdAt: new Date(),
        user: memberUser,
      },
    ],
    _count: { members: 2 },
  };

  beforeAll(async () => {
    const hash = await bcrypt.hash('Password123!', 10);
    ownerUser.passwordHash = hash;
    memberUser.passwordHash = hash;
    nonMemberUser.passwordHash = hash;

    ownerToken = generateAccessToken({ userId: ownerUser.id, email: ownerUser.email });
    memberToken = generateAccessToken({ userId: memberUser.id, email: memberUser.email });
    outsiderToken = generateAccessToken({ userId: nonMemberUser.id, email: nonMemberUser.email });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. Team Management (CRUD) ─────────────────────────────────────
  describe('Team CRUD', () => {
    it('POST /api/teams should create a team and assign owner as OWNER', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.team.create as jest.Mock).mockResolvedValue({
        id: mockTeam.id,
        name: mockTeam.name,
        description: mockTeam.description,
        ownerId: ownerUser.id,
      });
      (prisma.teamMember.create as jest.Mock).mockResolvedValue({
        id: 'tm-1',
        teamId: mockTeam.id,
        userId: ownerUser.id,
        role: TeamRole.OWNER,
      });
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);

      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'DevSync Engineering',
          description: 'Core Engineering Team',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('DevSync Engineering');
      expect(res.body.data.ownerId).toBe(ownerUser.id);
    });

    it('GET /api/teams should return all teams the user is member of', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'tm-1',
          teamId: mockTeam.id,
          userId: ownerUser.id,
          role: TeamRole.OWNER,
          createdAt: new Date(),
          team: mockTeam,
        },
      ]);

      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(mockTeam.id);
    });

    it('GET /api/teams/:teamId should allow team members to view details', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(memberUser);
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);

      const res = await request(app)
        .get(`/api/teams/${mockTeam.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockTeam.id);
      expect(res.body.data.memberCount).toBe(2);
    });

    it('GET /api/teams/:teamId should reject non-members with 403 Forbidden', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(nonMemberUser);
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);

      const res = await request(app)
        .get(`/api/teams/${mockTeam.id}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/not a member/i);
    });

    it('PATCH /api/teams/:teamId should allow OWNER to update team', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);
      (prisma.team.update as jest.Mock).mockResolvedValue({
        ...mockTeam,
        name: 'DevSync Core Team',
      });

      const res = await request(app)
        .patch(`/api/teams/${mockTeam.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'DevSync Core Team' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/teams/:teamId should reject non-owner update with 403', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(memberUser);
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);

      const res = await request(app)
        .patch(`/api/teams/${mockTeam.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hacked Team' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('DELETE /api/teams/:teamId should allow OWNER to delete team', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);
      (prisma.team.delete as jest.Mock).mockResolvedValue(mockTeam);

      const res = await request(app)
        .delete(`/api/teams/${mockTeam.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/teams/:teamId should reject non-owner deletion with 403', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(memberUser);
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);

      const res = await request(app)
        .delete(`/api/teams/${mockTeam.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 2. Team Members & Roles ───────────────────────────────────────
  describe('Team Members & Roles', () => {
    it('GET /api/teams/:teamId/members should list all team members', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(memberUser);
      (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(mockTeam.members[1]);
      (prisma.teamMember.findMany as jest.Mock).mockResolvedValue(mockTeam.members);

      const res = await request(app)
        .get(`/api/teams/${mockTeam.id}/members`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('PATCH /api/teams/:teamId/members/:userId should allow OWNER to change member role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);
      (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(mockTeam.members[1]);
      (prisma.teamMember.update as jest.Mock).mockResolvedValue({
        ...mockTeam.members[1],
        role: TeamRole.OWNER,
      });

      const res = await request(app)
        .patch(`/api/teams/${mockTeam.id}/members/${memberUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'OWNER' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('OWNER');
    });

    it('DELETE /api/teams/:teamId/members/:userId should allow OWNER to remove a member', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);
      (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(mockTeam.members[1]);
      (prisma.teamMember.delete as jest.Mock).mockResolvedValue(mockTeam.members[1]);

      const res = await request(app)
        .delete(`/api/teams/${mockTeam.id}/members/${memberUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── 3. Invitations ────────────────────────────────────────────────
  describe('Team Invitations', () => {
    it('POST /api/teams/:teamId/invitations should create invitation when invited by OWNER', async () => {
      (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === ownerUser.id) return Promise.resolve(ownerUser);
        if (where.id === nonMemberUser.id || where.email === nonMemberUser.email) {
          return Promise.resolve(nonMemberUser);
        }
        return Promise.resolve(null);
      });
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);
      (prisma.teamInvitation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.teamInvitation.create as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        teamId: mockTeam.id,
        invitedById: ownerUser.id,
        invitedUserId: nonMemberUser.id,
        role: TeamRole.MEMBER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
        team: mockTeam,
        invitedBy: ownerUser,
        invitedUser: nonMemberUser,
      });

      const res = await request(app)
        .post(`/api/teams/${mockTeam.id}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: nonMemberUser.email,
          role: 'MEMBER',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invitedUserId).toBe(nonMemberUser.id);
    });

    it('POST /api/teams/:teamId/invitations should reject inviting existing member (409)', async () => {
      (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === ownerUser.id) return Promise.resolve(ownerUser);
        if (where.id === memberUser.id || where.email === memberUser.email) {
          return Promise.resolve(memberUser);
        }
        return Promise.resolve(null);
      });
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(mockTeam);

      const res = await request(app)
        .post(`/api/teams/${mockTeam.id}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: memberUser.email });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/already a member/i);
    });

    it('POST /api/invitations/:invitationId/accept should accept invite and add to team', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(nonMemberUser);
      (prisma.teamInvitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        teamId: mockTeam.id,
        invitedUserId: nonMemberUser.id,
        role: TeamRole.MEMBER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 86400000),
        team: mockTeam,
      });
      (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.teamMember.create as jest.Mock).mockResolvedValue({
        id: 'tm-3',
        teamId: mockTeam.id,
        userId: nonMemberUser.id,
        role: TeamRole.MEMBER,
      });
      (prisma.teamInvitation.update as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.ACCEPTED,
      });

      const res = await request(app)
        .post('/api/invitations/inv-1/accept')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/accepted/i);
    });

    it('POST /api/invitations/:invitationId/reject should mark invite as REJECTED', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(nonMemberUser);
      (prisma.teamInvitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        teamId: mockTeam.id,
        invitedUserId: nonMemberUser.id,
        role: TeamRole.MEMBER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 86400000),
      });
      (prisma.teamInvitation.update as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.REJECTED,
      });

      const res = await request(app)
        .post('/api/invitations/inv-1/reject')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.teamInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: InvitationStatus.REJECTED },
      });
    });
  });
});
