import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { generateAccessToken } from '../utils/jwt';
import { ProjectRole, ProjectStatus, TaskPriority, TaskStatus } from '@prisma/client';

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
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      task: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
      $disconnect: jest.fn(),
    },
  };
});

describe('Task Management & Kanban Suite (Stage 6)', () => {
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

  const viewerUser = {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Elena Viewer',
    email: 'elena@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Viewer',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const outsiderUser = {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Outsider User',
    email: 'outsider@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Not in project',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let ownerToken: string;
  let leadToken: string;
  let devToken: string;
  let viewerToken: string;
  let outsiderToken: string;

  const mockProject = {
    id: 'proj-100',
    name: 'DevSync Mobile App',
    description: 'Mobile collaboration application',
    teamId: 'team-100',
    ownerId: ownerUser.id,
    status: ProjectStatus.ACTIVE,
    members: [
      { id: 'pm-1', projectId: 'proj-100', userId: ownerUser.id, role: ProjectRole.OWNER, user: ownerUser },
      { id: 'pm-2', projectId: 'proj-100', userId: leadUser.id, role: ProjectRole.TEAM_LEAD, user: leadUser },
      { id: 'pm-3', projectId: 'proj-100', userId: devUser.id, role: ProjectRole.DEVELOPER, user: devUser },
      { id: 'pm-4', projectId: 'proj-100', userId: viewerUser.id, role: ProjectRole.VIEWER, user: viewerUser },
    ],
  };

  const mockTask = {
    id: 'task-100',
    title: 'Implement Auth API',
    description: 'Create login and registration endpoints',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    projectId: mockProject.id,
    creatorId: ownerUser.id,
    assigneeId: devUser.id,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: ownerUser,
    assignee: devUser,
    project: mockProject,
  };

  beforeAll(async () => {
    const hash = await bcrypt.hash('Password123!', 10);
    ownerUser.passwordHash = hash;
    leadUser.passwordHash = hash;
    devUser.passwordHash = hash;
    viewerUser.passwordHash = hash;
    outsiderUser.passwordHash = hash;

    ownerToken = generateAccessToken({ userId: ownerUser.id, email: ownerUser.email });
    leadToken = generateAccessToken({ userId: leadUser.id, email: leadUser.email });
    devToken = generateAccessToken({ userId: devUser.id, email: devUser.email });
    viewerToken = generateAccessToken({ userId: viewerUser.id, email: viewerUser.email });
    outsiderToken = generateAccessToken({ userId: outsiderUser.id, email: outsiderUser.email });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. Task Creation ───────────────────────────────────────────────
  describe('Task Creation', () => {
    it('POST /api/projects/:projectId/tasks should create a task and set defaults', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Implement Auth API',
          description: 'Create login and registration endpoints',
          priority: 'HIGH',
          assigneeId: devUser.id,
          dueDate: '2026-09-15T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Implement Auth API');
      expect(res.body.data.status).toBe('TODO');
      expect(res.body.data.priority).toBe('HIGH');
    });

    it('POST /api/projects/:projectId/tasks should allow TEAM_LEAD to create a task', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(leadUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/tasks`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({
          title: 'Lead Created Task',
          priority: 'MEDIUM',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/projects/:projectId/tasks should reject missing title (400)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/projects/:projectId/tasks should reject assignee outside the project (400)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Invalid Assignment',
          assigneeId: outsiderUser.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Assignee must be an active member/i);
    });

    it('POST /api/projects/:projectId/tasks should reject non-members with 403 Forbidden', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(outsiderUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/tasks`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          title: 'Unauthorized Task',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 2. Task Retrieval & Pagination ──────────────────────────────────
  describe('Task Listing & Pagination', () => {
    it('GET /api/projects/:projectId/tasks should return paginated tasks with metadata', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);
      (prisma.task.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/tasks?page=1&limit=10`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('GET /api/projects/:projectId/tasks should filter by status and priority', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);
      (prisma.task.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/tasks?status=TODO&priority=HIGH`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: mockProject.id,
            status: 'TODO',
            priority: 'HIGH',
          }),
        }),
      );
    });

    it('GET /api/tasks/:taskId should return single task details for project member', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

      const res = await request(app)
        .get(`/api/tasks/${mockTask.id}`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockTask.id);
    });

    it('GET /api/tasks/:taskId should reject outsider with 403 Forbidden', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(outsiderUser);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

      const res = await request(app)
        .get(`/api/tasks/${mockTask.id}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 3. Task Updates & Status Changes ────────────────────────────────
  describe('Task Updates & Status Changes', () => {
    it('PATCH /api/tasks/:taskId should allow OWNER to update title and priority', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTask,
        title: 'Updated Auth Title',
        priority: TaskPriority.CRITICAL,
      });

      const res = await request(app)
        .patch(`/api/tasks/${mockTask.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Updated Auth Title',
          priority: 'CRITICAL',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Auth Title');
      expect(res.body.data.priority).toBe('CRITICAL');
    });

    it('PATCH /api/tasks/:taskId should allow assigned DEVELOPER to update description', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTask,
        description: 'Developer updated notes',
      });

      const res = await request(app)
        .patch(`/api/tasks/${mockTask.id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          description: 'Developer updated notes',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/tasks/:taskId should reject VIEWER from modifying task (403)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(viewerUser);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

      const res = await request(app)
        .patch(`/api/tasks/${mockTask.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Viewer Attempt',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('PATCH /api/tasks/:taskId/status should update task status to IN_PROGRESS', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      });

      const res = await request(app)
        .patch(`/api/tasks/${mockTask.id}/status`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('PATCH /api/tasks/:taskId/status should reject invalid status enum (400)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);

      const res = await request(app)
        .patch(`/api/tasks/${mockTask.id}/status`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 4. Task Deletion & My Tasks ─────────────────────────────────────
  describe('Task Deletion & My Tasks', () => {
    it('DELETE /api/tasks/:taskId should allow OWNER to delete task', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerUser);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.task.delete as jest.Mock).mockResolvedValue(mockTask);

      const res = await request(app)
        .delete(`/api/tasks/${mockTask.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: mockTask.id } });
    });

    it('DELETE /api/tasks/:taskId should reject unassigned DEVELOPER / VIEWER (403)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(viewerUser);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

      const res = await request(app)
        .delete(`/api/tasks/${mockTask.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/tasks/my should return user assigned tasks', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(devUser);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);

      const res = await request(app)
        .get('/api/tasks/my')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].assigneeId).toBe(devUser.id);
    });
  });
});
