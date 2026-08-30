import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';
import { generateAccessToken } from '../utils/jwt';
import { ProjectRole, ProjectStatus } from '@prisma/client';

jest.mock('../config/prisma', () => {
  const original = jest.requireActual('../config/prisma');
  return {
    ...original,
    prisma: {
      user: {
        findUnique: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      activity: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
      $disconnect: jest.fn(),
    },
  };
});

describe('Project Activity Feed Suite (Stage 8)', () => {
  const userA = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Alex Johnson',
    email: 'alex@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Project Lead',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const outsider = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Outsider User',
    email: 'outsider@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: null,
    isOnline: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tokenA = generateAccessToken({ userId: userA.id, email: userA.email });
  const tokenOutsider = generateAccessToken({ userId: outsider.id, email: outsider.email });

  const mockProject = {
    id: 'proj-123',
    name: 'DevSync Web',
    description: 'Main project',
    status: ProjectStatus.ACTIVE,
    ownerId: userA.id,
    teamId: 'team-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [
      {
        id: 'pm-1',
        projectId: 'proj-123',
        userId: userA.id,
        role: ProjectRole.OWNER,
      },
    ],
  };

  const mockActivity = {
    id: 'act-1',
    projectId: 'proj-123',
    userId: userA.id,
    action: 'TASK_CREATED',
    type: 'TASK_CREATED',
    description: 'Created task "Build Notifications"',
    entityType: 'TASK',
    entityId: 'task-1',
    metadata: { title: 'Build Notifications' },
    createdAt: new Date(),
    user: userA,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === userA.id || where.email === userA.email) return Promise.resolve(userA);
      if (where.id === outsider.id || where.email === outsider.email)
        return Promise.resolve(outsider);
      return Promise.resolve(null);
    });
  });

  describe('Activity Feed Retrieval & Filtering', () => {
    it('GET /api/projects/:id/activity should return project activities with pagination', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.activity.count as jest.Mock).mockResolvedValue(1);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([mockActivity]);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/activity?page=1&limit=20`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0].action).toBe('TASK_CREATED');
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });

    it('GET /api/projects/:id/activity should filter by activity type', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.activity.count as jest.Mock).mockResolvedValue(1);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([mockActivity]);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/activity?type=TASK_CREATED`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId: mockProject.id,
            action: 'TASK_CREATED',
          },
        }),
      );
    });

    it('GET /api/projects/:id/activity should reject non-members with 403 Forbidden', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/activity`)
        .set('Authorization', `Bearer ${tokenOutsider}`);

      expect(res.status).toBe(403);
    });
  });
});
