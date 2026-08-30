import request from 'supertest';
import { createServer, Server as HttpServer } from 'http';
import app from '../app';
import { prisma } from '../config/prisma';
import { generateAccessToken } from '../utils/jwt';
import { ProjectRole, ProjectStatus, TaskStatus, TaskPriority } from '@prisma/client';

jest.mock('../config/prisma', () => {
  const original = jest.requireActual('../config/prisma');
  return {
    ...original,
    prisma: {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      projectMember: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      teamMember: {
        findMany: jest.fn(),
      },
      task: {
        findMany: jest.fn(),
      },
      message: {
        findMany: jest.fn(),
      },
      file: {
        findMany: jest.fn(),
      },
      activity: {
        findMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    },
  };
});

describe('Global Search & Discovery Suite (Stage 10)', () => {
  let server: HttpServer;

  // User A (Project Alpha)
  const userA = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Alice Alpha',
    email: 'alice@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Frontend Specialist',
    isOnline: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  // User B (Project Beta)
  const userB = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Bob Beta',
    email: 'bob@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Backend Specialist',
    isOnline: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const tokenA = generateAccessToken({ userId: userA.id, email: userA.email });

  const projectAlpha = {
    id: 'proj-alpha-123',
    name: 'Authentication Core System',
    description: 'DevSync Authentication Infrastructure with JWT',
    status: ProjectStatus.ACTIVE,
    ownerId: userA.id,
    teamId: 'team-alpha',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const projectBeta = {
    id: 'proj-beta-456',
    name: 'Payment Gateway Secret',
    description: 'Secret Payment Integration',
    status: ProjectStatus.ACTIVE,
    ownerId: userB.id,
    teamId: 'team-beta',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const taskAlpha = {
    id: 'task-alpha-1',
    title: 'Implement Authentication API',
    description: 'Build JWT access and refresh token endpoints',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    projectId: projectAlpha.id,
    creatorId: userA.id,
    assigneeId: userA.id,
    dueDate: new Date('2026-09-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    project: { id: projectAlpha.id, name: projectAlpha.name },
    assignee: { id: userA.id, name: userA.name },
  };

  const messageAlpha = {
    id: 'msg-alpha-1',
    content: 'The authentication service is deployed and ready for testing.',
    projectId: projectAlpha.id,
    senderId: userA.id,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    project: { id: projectAlpha.id, name: projectAlpha.name },
    sender: { id: userA.id, name: userA.name },
  };

  const fileAlpha = {
    id: 'file-alpha-1',
    fileName: 'auth-architecture.pdf',
    originalName: 'auth-architecture.pdf',
    description: 'Architecture diagram for auth flow',
    mimeType: 'application/pdf',
    fileSize: 1048576,
    projectId: projectAlpha.id,
    uploadedById: userA.id,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    project: { id: projectAlpha.id, name: projectAlpha.name },
    uploadedBy: { id: userA.id, name: userA.name },
  };

  const activityAlpha = {
    id: 'act-alpha-1',
    action: 'TASK_CREATED',
    description: 'Created task "Implement Authentication API"',
    projectId: projectAlpha.id,
    userId: userA.id,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    project: { id: projectAlpha.id, name: projectAlpha.name },
    user: { id: userA.id, name: userA.name },
  };

  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === userA.id || where.email === userA.email) return Promise.resolve(userA);
      if (where.id === userB.id || where.email === userB.email) return Promise.resolve(userB);
      return Promise.resolve(null);
    });

    (prisma.projectMember.findMany as jest.Mock).mockImplementation(({ where }) => {
      if (where?.userId === userA.id) {
        return Promise.resolve([{ projectId: projectAlpha.id, userId: userA.id, role: ProjectRole.OWNER }]);
      }
      if (where?.userId === userB.id) {
        return Promise.resolve([{ projectId: projectBeta.id, userId: userB.id, role: ProjectRole.OWNER }]);
      }
      if (where?.projectId?.in?.includes(projectAlpha.id)) {
        return Promise.resolve([{ userId: userA.id }]);
      }
      return Promise.resolve([]);
    });

    (prisma.teamMember.findMany as jest.Mock).mockImplementation(({ where }) => {
      if (where?.userId === userA.id) {
        return Promise.resolve([{ teamId: 'team-alpha', userId: userA.id }]);
      }
      if (where?.userId === userB.id) {
        return Promise.resolve([{ teamId: 'team-beta', userId: userB.id }]);
      }
      return Promise.resolve([]);
    });
  });

  describe('Query Validation & Parameters', () => {
    it('should reject missing query parameter q (400 Bad Request)', async () => {
      const res = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject query shorter than 2 characters (400 Bad Request)', async () => {
      const res = await request(app)
        .get('/api/search?q=a')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid search type parameter (400 Bad Request)', async () => {
      const res = await request(app)
        .get('/api/search?q=auth&type=invalid_type')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should trim and normalize search query with excess spaces', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([projectAlpha]);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/search?q=%20%20%20authentication%20%20%20')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.query).toBe('authentication');
    });
  });

  describe('Entity-Specific Search Filters', () => {
    it('type=projects should return only matching accessible projects', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([projectAlpha]);

      const res = await request(app)
        .get('/api/search?q=auth&type=projects')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].type).toBe('PROJECT');
      expect(res.body.data.results[0].title).toBe(projectAlpha.name);
      expect(res.body.data.results[0].url).toBe(`/projects/${projectAlpha.id}`);
    });

    it('type=tasks should return only matching tasks with metadata', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([taskAlpha]);

      const res = await request(app)
        .get('/api/search?q=auth&type=tasks')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].type).toBe('TASK');
      expect(res.body.data.results[0].title).toBe(taskAlpha.title);
      expect(res.body.data.results[0].metadata.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('type=messages should return matching chat messages with snippets', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([messageAlpha]);

      const res = await request(app)
        .get('/api/search?q=deployed&type=messages')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].type).toBe('MESSAGE');
      expect(res.body.data.results[0].snippet).toContain('authentication service is deployed');
    });

    it('type=files should return matching project files with metadata', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([fileAlpha]);

      const res = await request(app)
        .get('/api/search?q=architecture&type=files')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].type).toBe('FILE');
      expect(res.body.data.results[0].title).toBe(fileAlpha.originalName);
      expect(res.body.data.results[0].metadata.mimeType).toBe('application/pdf');
    });

    it('type=activity should return matching project activity items', async () => {
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([activityAlpha]);

      const res = await request(app)
        .get('/api/search?q=authentication&type=activity')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].type).toBe('ACTIVITY');
      expect(res.body.data.results[0].metadata.action).toBe('TASK_CREATED');
    });
  });

  describe('Global Multi-Entity Search (type=all)', () => {
    it('should aggregate and rank results across all authorized entities', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([projectAlpha]);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([taskAlpha]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([messageAlpha]);
      (prisma.file.findMany as jest.Mock).mockResolvedValue([fileAlpha]);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([activityAlpha]);

      const res = await request(app)
        .get('/api/search?q=auth&type=all')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results.length).toBeGreaterThanOrEqual(4);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.total).toBe(res.body.data.results.length);
    });
  });

  describe('Project-Specific Search (projectId parameter)', () => {
    it('should scope search results strictly to specified projectId for authorized member', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([taskAlpha]);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([messageAlpha]);
      (prisma.file.findMany as jest.Mock).mockResolvedValue([fileAlpha]);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([activityAlpha]);

      const res = await request(app)
        .get(`/api/search?q=auth&projectId=${projectAlpha.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(
        res.body.data.results.every(
          (r: { project?: { id: string } }) => r.project?.id === projectAlpha.id,
        ),
      ).toBe(true);
    });

    it('should reject outsider trying to search within an unauthorized project (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/search?q=auth&projectId=${projectBeta.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('CRITICAL Security Isolation & Cross-Project Isolation', () => {
    it('User A must NEVER discover User B Project, Task, Message, File, or Activity', async () => {
      // User A searching for "Secret"
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/search?q=Secret&type=all')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(0);

      // Verify that database calls scoped project IDs to Project Alpha only
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: { in: [projectAlpha.id] },
          }),
        }),
      );
    });

    it('should return empty results when user belongs to zero projects', async () => {
      (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.teamMember.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/search?q=auth')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(0);
      expect(res.body.data.pagination.total).toBe(0);
    });
  });
});
