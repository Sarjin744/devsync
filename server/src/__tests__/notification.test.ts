import request from 'supertest';
import { createServer, Server as HttpServer } from 'http';
import app from '../app';
import { initializeSocket } from '../sockets';
import { prisma } from '../config/prisma';
import { generateAccessToken } from '../utils/jwt';
import { checkDueSoonTasks, checkOverdueTasks } from '../jobs/task-reminders';
import { NotificationType, TaskStatus, TaskPriority } from '@prisma/client';

jest.mock('../config/prisma', () => {
  const original = jest.requireActual('../config/prisma');
  return {
    ...original,
    prisma: {
      user: {
        findUnique: jest.fn(),
      },
      notification: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      notificationPreference: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      task: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
      $disconnect: jest.fn(),
    },
  };
});

describe('Notification & Preferences Suite (Stage 8)', () => {
  let server: HttpServer;

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

  const userB = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Sarah Chen',
    email: 'sarah@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Developer',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tokenA = generateAccessToken({ userId: userA.id, email: userA.email });
  const tokenB = generateAccessToken({ userId: userB.id, email: userB.email });

  const mockNotification = {
    id: 'notif-123',
    userId: userB.id,
    type: NotificationType.TASK_ASSIGNED,
    title: 'New Task Assigned',
    message: 'You were assigned to task "Build Authentication"',
    projectId: 'proj-1',
    taskId: 'task-1',
    actorId: userA.id,
    isRead: false,
    createdAt: new Date(),
  };

  beforeAll(async () => {
    server = createServer(app);
    initializeSocket(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        serverPort = typeof addr === 'object' && addr ? addr.port : 5000;
        resolve();
      });
    });
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
  });

  describe('Notification Preferences API', () => {
    it('GET /api/notification-preferences should return user preferences', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue({
        id: 'pref-1',
        userId: userA.id,
        taskAssignments: true,
        taskUpdates: true,
        projectInvitations: true,
        mentions: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/notification-preferences')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.taskAssignments).toBe(true);
      expect(res.body.data.taskUpdates).toBe(true);
    });

    it('PATCH /api/notification-preferences should update user preferences', async () => {
      (prisma.notificationPreference.upsert as jest.Mock).mockResolvedValue({
        id: 'pref-1',
        userId: userA.id,
        taskAssignments: false,
        taskUpdates: true,
        projectInvitations: false,
        mentions: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .patch('/api/notification-preferences')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ taskAssignments: false, projectInvitations: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.taskAssignments).toBe(false);
      expect(res.body.data.projectInvitations).toBe(false);
    });
  });

  describe('Notification List & Unread Count API', () => {
    it('GET /api/notifications should return paginated list of user notifications', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(1);
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([mockNotification]);

      const res = await request(app)
        .get('/api/notifications?page=1&limit=10')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0].id).toBe(mockNotification.id);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });

    it('GET /api/notifications/unread-count should return active unread count', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(3);

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(3);
    });
  });

  describe('Mark as Read & Deletion', () => {
    it('PATCH /api/notifications/:id/read should mark notification as read for recipient', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotification);
      (prisma.notification.update as jest.Mock).mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const res = await request(app)
        .patch(`/api/notifications/${mockNotification.id}/read`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/notifications/:id/read should reject non-owner with 403 Forbidden', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotification);

      const res = await request(app)
        .patch(`/api/notifications/${mockNotification.id}/read`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
    });

    it('PATCH /api/notifications/read-all should mark all notifications read for user', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/notifications/:id should allow owner to delete notification', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotification);
      (prisma.notification.delete as jest.Mock).mockResolvedValue(mockNotification);

      const res = await request(app)
        .delete(`/api/notifications/${mockNotification.id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
    });

    it('DELETE /api/notifications/:id should reject non-owner with 403 Forbidden', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotification);

      const res = await request(app)
        .delete(`/api/notifications/${mockNotification.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scheduled Reminders Job', () => {
    it('checkDueSoonTasks should find tasks due soon and create notifications', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'task-due-soon',
          title: 'Implement Chat System',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          projectId: 'proj-1',
          assigneeId: userB.id,
          dueDate: new Date(Date.now() + 3600 * 1000),
          project: { name: 'DevSync' },
        },
      ]);
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        id: 'notif-due-soon',
        userId: userB.id,
        type: NotificationType.TASK_DUE_SOON,
        title: 'Task Due Soon',
        message: 'Task is due soon',
        projectId: 'proj-1',
        taskId: 'task-due-soon',
        actorId: null,
        isRead: false,
        createdAt: new Date(),
      });

      const count = await checkDueSoonTasks(24);
      expect(count).toBe(1);
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('checkOverdueTasks should find overdue tasks and create notifications', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'task-overdue',
          title: 'Fix Critical Bug',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.CRITICAL,
          projectId: 'proj-1',
          assigneeId: userB.id,
          dueDate: new Date(Date.now() - 3600 * 1000),
          project: { name: 'DevSync' },
        },
      ]);
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        id: 'notif-overdue',
        userId: userB.id,
        type: NotificationType.TASK_OVERDUE,
        title: 'Task Overdue',
        message: 'Task is overdue',
        projectId: 'proj-1',
        taskId: 'task-overdue',
        actorId: null,
        isRead: false,
        createdAt: new Date(),
      });

      const count = await checkOverdueTasks();
      expect(count).toBe(1);
      expect(prisma.notification.create).toHaveBeenCalled();
    });
  });
});
