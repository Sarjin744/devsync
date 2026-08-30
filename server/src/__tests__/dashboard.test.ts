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
      },
      project: {
        findUnique: jest.fn(),
      },
      projectMember: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      task: {
        findMany: jest.fn(),
      },
      activity: {
        findMany: jest.fn(),
      },
      notification: {
        findMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    },
  };
});

describe('Dashboard, Analytics & Project Insights Suite (Stage 11)', () => {
  let server: HttpServer;

  const userA = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Alice Analyst',
    email: 'alice@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Lead Analyst',
    isOnline: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const userB = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Bob Builder',
    email: 'bob@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Developer',
    isOnline: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const outsiderUser = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Outsider User',
    email: 'outsider@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: null,
    isOnline: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const tokenA = generateAccessToken({ userId: userA.id, email: userA.email });
  const tokenOutsider = generateAccessToken({ userId: outsiderUser.id, email: outsiderUser.email });

  const mockProject = {
    id: 'proj-123',
    name: 'DevSync Analytics Engine',
    description: 'Insights and Metrics Platform',
    status: ProjectStatus.ACTIVE,
    ownerId: userA.id,
    teamId: 'team-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    members: [
      { id: 'pm-1', projectId: 'proj-123', userId: userA.id, role: ProjectRole.OWNER },
      { id: 'pm-2', projectId: 'proj-123', userId: userB.id, role: ProjectRole.DEVELOPER },
    ],
  };

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Design Dashboard UI',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      projectId: 'proj-123',
      assigneeId: userA.id,
      dueDate: new Date('2026-08-01T00:00:00.000Z'),
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-15T00:00:00.000Z'),
      assignee: userA,
    },
    {
      id: 'task-2',
      title: 'Implement Health Metrics API',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      projectId: 'proj-123',
      assigneeId: userB.id,
      dueDate: new Date('2026-08-20T00:00:00.000Z'), // Overdue
      createdAt: new Date('2026-08-05T00:00:00.000Z'),
      updatedAt: new Date('2026-08-10T00:00:00.000Z'),
      assignee: userB,
    },
    {
      id: 'task-3',
      title: 'Build Productivity Trend Charts',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      projectId: 'proj-123',
      assigneeId: userA.id,
      dueDate: new Date('2026-09-10T00:00:00.000Z'), // Upcoming
      createdAt: new Date('2026-08-08T00:00:00.000Z'),
      updatedAt: new Date('2026-08-08T00:00:00.000Z'),
      assignee: userA,
    },
  ];

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
      if (where.id === outsiderUser.id || where.email === outsiderUser.email) return Promise.resolve(outsiderUser);
      return Promise.resolve(null);
    });

    (prisma.project.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === mockProject.id) return Promise.resolve(mockProject);
      return Promise.resolve(null);
    });

    (prisma.projectMember.findFirst as jest.Mock).mockImplementation(({ where }) => {
      const match = mockProject.members.find(
        (m) => m.projectId === where.projectId && m.userId === where.userId,
      );
      return Promise.resolve(match || null);
    });
  });

  describe('Global Dashboard Overview (GET /api/dashboard/overview)', () => {
    it('should aggregate metrics and summaries for authorized user projects', async () => {
      (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([
        {
          projectId: mockProject.id,
          userId: userA.id,
          project: {
            ...mockProject,
            members: mockProject.members,
            tasks: mockTasks,
          },
        },
      ]);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.projects).toBe(1);
      expect(res.body.data.openTasks).toBe(2);
      expect(res.body.data.completedTasks).toBe(1);
      expect(res.body.data.projectSummaries).toHaveLength(1);
      expect(res.body.data.projectSummaries[0].completionRate).toBe(33); // 1 out of 3 tasks
      expect(res.body.data.projectSummaries[0].health).toBeDefined();
    });

    it('GET /api/dashboard should serve as backward-compatible overview endpoint', async () => {
      (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.projects).toBe(0);
    });
  });

  describe('Project Dashboard API (GET /api/projects/:projectId/dashboard)', () => {
    it('should compute status and priority distribution, completion rate, overdue tasks, and health', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/dashboard`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tasks.total).toBe(3);
      expect(res.body.data.tasks.done).toBe(1);
      expect(res.body.data.tasks.inProgress).toBe(1);
      expect(res.body.data.tasks.todo).toBe(1);
      expect(res.body.data.tasks.completionRate).toBe(33);
      expect(res.body.data.tasks.overdue).toBe(1);
      expect(res.body.data.tasks.priorityDistribution.high).toBe(1);
      expect(res.body.data.tasks.priorityDistribution.urgent).toBe(1);
      expect(res.body.data.upcomingDeadlines).toHaveLength(1);
      expect(res.body.data.health.status).toBeDefined();
    });

    it('should reject non-project member with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/dashboard`)
        .set('Authorization', `Bearer ${tokenOutsider}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Project Workload API (GET /api/projects/:projectId/dashboard/workload)', () => {
    it('should compute tasks assigned per member partitioned into open, completed, and overdue', async () => {
      (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([
        {
          userId: userA.id,
          role: ProjectRole.OWNER,
          user: {
            ...userA,
            tasksAssigned: [mockTasks[0], mockTasks[2]], // 1 done, 1 todo
          },
        },
        {
          userId: userB.id,
          role: ProjectRole.DEVELOPER,
          user: {
            ...userB,
            tasksAssigned: [mockTasks[1]], // 1 in progress (overdue)
          },
        },
      ]);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/dashboard/workload`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.members).toHaveLength(2);

      const memberB = res.body.data.members.find((m: { userId: string }) => m.userId === userB.id);
      expect(memberB.openTasks).toBe(1);
      expect(memberB.overdueTasks).toBe(1);
      expect(memberB.completedTasks).toBe(0);
    });
  });

  describe('Productivity Trend API (GET /api/projects/:projectId/dashboard/productivity)', () => {
    it('should return daily aggregated task completion trend points', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'task-1',
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/dashboard/productivity?range=7d`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.range).toBe('7d');
      expect(res.body.data.trend).toBeInstanceOf(Array);
      expect(res.body.data.trend.length).toBeGreaterThanOrEqual(7);
    });
  });
});
