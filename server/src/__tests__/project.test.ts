import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { generateAccessToken } from '../utils/jwt';
import { ProjectRole, ProjectStatus, TeamRole } from '@prisma/client';

jest.mock('../config/prisma', () => {
  const original = jest.requireActual('../config/prisma');
  return {
    ...original,
    prisma: {
      user: {
        findUnique: jest.fn(),
      },
      team: {
        findUnique: jest.fn(),
      },
      teamMember: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      project: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      projectMember: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
      $disconnect: jest.fn(),
    },
  };
});

describe('Project Management & Membership Suite (Stage 5)', () => {
  const ownerUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Alex Owner',
    email: 'alex@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Project Owner',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const leadUser = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Sarah Lead',
    email: 'sarah@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Team Lead',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const devUser = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Marcus Dev',
    email: 'marcus@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Developer',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const outsiderUser = {
    id: '44444444-4444-4444-4444-444444444444',
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
  let leadToken: string;
  let devToken: string;
  let outsiderToken: string;

  const mockTeam = {
    id: 'team-100',
    name: 'Core Platform Engineering',
    ownerId: ownerUser.id,
  };

  const mockProject = {
    id: 'proj-100',
    name: 'DevSync Mobile App',
    description: 'Mobile collaboration application',
    teamId: mockTeam.id,
    ownerId: ownerUser.id,
    status: ProjectStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: ownerUser,
    team: mockTeam,
    members: [
      {
        id: 'pm-1',
        projectId: 'proj-100',
        userId: ownerUser.id,
        role: ProjectRole.OWNER,
        createdAt: new Date(),
        user: ownerUser,
      },
      {
        id: 'pm-2',
        projectId: 'proj-100',
        userId: leadUser.id,
        role: ProjectRole.TEAM_LEAD,
        createdAt: new Date(),
        user: leadUser,
      },
      {
        id: 'pm-3',
        projectId: 'proj-100',
        userId: devUser.id,
        role: ProjectRole.DEVELOPER,
        createdAt: new Date(),
        user: devUser,
      },
    ],
    _count: { members: 3, tasks: 5 },
  };

  beforeAll(async () => {
    const hash = await bcrypt.hash('Password123!', 10);
    ownerUser.passwordHash = hash;
    leadUser.passwordHash = hash;
    devUser.passwordHash = hash;
    outsiderUser.passwordHash = hash;

    ownerToken = generateAccessToken({ userId: ownerUser.id, email: ownerUser.email });
    leadToken = generateAccessToken({ userId: leadUser.id, email: leadUser.email });
    devToken = generateAccessToken({ userId: devUser.id, email: devUser.email });
    outsiderToken = generateAccessToken({ userId: outsiderUser.id, email: outsiderUser.email });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. Project Creation & Listing ───────────────────────────────────
  describe('Project Creation & Listing', () => {
    it('POST /api/projects should create a project under a team and assign creator as OWNER', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'tm-1',
        teamId: mockTeam.id,
        userId: ownerUser.id,
        role: TeamRole.OWNER,
      });
      (prisma.project.create as jest.Mock).mockResolvedValue({
        id: mockProject.id,
        name: mockProject.name,
        description: mockProject.description,
        teamId: mockTeam.id,
        ownerId: ownerUser.id,
        status: ProjectStatus.ACTIVE,
      });
      (prisma.projectMember.create as jest.Mock).mockResolvedValue({
        id: 'pm-1',
        projectId: mockProject.id,
        userId: ownerUser.id,
        role: ProjectRole.OWNER,
      });
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'DevSync Mobile App',
          description: 'Mobile collaboration application',
          teamId: mockTeam.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('DevSync Mobile App');
      expect(res.body.data.ownerId).toBe(ownerUser.id);
    });

    it('POST /api/projects should reject creation if user is not in the team (403)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(outsiderUser);
      (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          name: 'Unauthorized Project',
          teamId: mockTeam.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/projects should list projects accessible to user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(mockProject.id);
    });

    it('GET /api/projects/:projectId should return project details for member', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockProject.id);
      expect(res.body.data.memberCount).toBe(3);
    });

    it('GET /api/projects/:projectId should reject non-members with 403 Forbidden', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(outsiderUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 2. Update, Archive, Restore & Delete ──────────────────────────
  describe('Project Lifecycle', () => {
    it('PATCH /api/projects/:projectId should allow OWNER to update project', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.project.update as jest.Mock).mockResolvedValue({
        ...mockProject,
        name: 'DevSync Next-Gen App',
      });

      const res = await request(app)
        .patch(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'DevSync Next-Gen App' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/projects/:projectId should allow TEAM_LEAD to update project', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(leadUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.project.update as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .patch(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({ description: 'Updated by lead' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/projects/:projectId should reject DEVELOPER from updating (403)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .patch(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ name: 'Hacked Project' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/projects/:projectId/archive should set status to ARCHIVED', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.project.update as jest.Mock).mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.ARCHIVED,
      });

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/archive`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/projects/:projectId/restore should restore status to ACTIVE', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.ARCHIVED,
      });
      (prisma.project.update as jest.Mock).mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.ACTIVE,
      });

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/restore`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/projects/:projectId should allow OWNER to delete project', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.project.delete as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .delete(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: mockProject.id } });
    });

    it('DELETE /api/projects/:projectId should reject TEAM_LEAD from deleting (403)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(leadUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .delete(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${leadToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 3. Project Members & Roles ────────────────────────────────────
  describe('Project Members & Roles', () => {
    it('GET /api/projects/:projectId/members should list members for project member', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMember.findMany as jest.Mock).mockResolvedValue(mockProject.members);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/members`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
    });

    it('POST /api/projects/:projectId/members should allow OWNER/LEAD to add member from parent team', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        members: [mockProject.members[0]], // only owner currently
      });
      (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'tm-2',
        teamId: mockTeam.id,
        userId: leadUser.id,
        role: TeamRole.MEMBER,
      });
      (prisma.projectMember.create as jest.Mock).mockResolvedValue({
        id: 'pm-new',
        projectId: mockProject.id,
        userId: leadUser.id,
        role: ProjectRole.TEAM_LEAD,
        createdAt: new Date(),
        user: leadUser,
      });

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: leadUser.id,
          role: 'TEAM_LEAD',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(leadUser.id);
    });

    it('POST /api/projects/:projectId/members should reject adding user not in parent team (403)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null); // not in parent team

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: outsiderUser.id,
          role: 'DEVELOPER',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/parent team/i);
    });

    it('PATCH /api/projects/:projectId/members/:userId should allow OWNER to change member role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMember.update as jest.Mock).mockResolvedValue({
        ...mockProject.members[2],
        role: ProjectRole.TEAM_LEAD,
      });

      const res = await request(app)
        .patch(`/api/projects/${mockProject.id}/members/${devUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'TEAM_LEAD' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('TEAM_LEAD');
    });

    it('DELETE /api/projects/:projectId/members/:userId should allow OWNER to remove a member', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMember.delete as jest.Mock).mockResolvedValue(mockProject.members[2]);

      const res = await request(app)
        .delete(`/api/projects/${mockProject.id}/members/${devUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/projects/:projectId/members/:userId should reject removing the OWNER (403)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .delete(`/api/projects/${mockProject.id}/members/${ownerUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Cannot remove the project owner/i);
    });

    it('POST /api/projects/:projectId/leave should allow a member to leave', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(mockProject.members[2]);
      (prisma.projectMember.delete as jest.Mock).mockResolvedValue(mockProject.members[2]);

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/leave`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.projectMember.delete).toHaveBeenCalled();
    });

    it('POST /api/projects/:projectId/leave should prevent the OWNER from leaving (403)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/leave`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/owner cannot leave/i);
    });
  });
});
