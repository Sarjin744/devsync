import request from 'supertest';
import { createServer, Server as HttpServer } from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import app from '../app';
import { initializeSocket } from '../sockets';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { generateAccessToken } from '../utils/jwt';
import { ProjectRole, ProjectStatus } from '@prisma/client';

jest.mock('../config/prisma', () => {
  const original = jest.requireActual('../config/prisma');
  return {
    ...original,
    prisma: {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      projectMember: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      message: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
      $disconnect: jest.fn(),
    },
  };
});

describe('Real-Time Chat & Socket.IO Suite (Stage 7)', () => {
  let server: HttpServer;
  let serverPort: number;

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
    bio: 'Senior Engineer',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const userC = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Marcus Brody',
    email: 'marcus@devsync.local',
    passwordHash: '',
    profileImage: null,
    bio: 'Outside Engineer',
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;

  const projectA = {
    id: 'proj-aaa',
    name: 'Project Alpha',
    description: 'Alpha workspace',
    teamId: 'team-1',
    ownerId: userA.id,
    status: ProjectStatus.ACTIVE,
    members: [
      { id: 'pm-1', projectId: 'proj-aaa', userId: userA.id, role: ProjectRole.OWNER, user: userA },
      { id: 'pm-2', projectId: 'proj-aaa', userId: userB.id, role: ProjectRole.DEVELOPER, user: userB },
    ],
  };

  const projectB = {
    id: 'proj-bbb',
    name: 'Project Beta',
    description: 'Beta workspace',
    teamId: 'team-1',
    ownerId: userC.id,
    status: ProjectStatus.ACTIVE,
    members: [
      { id: 'pm-3', projectId: 'proj-bbb', userId: userC.id, role: ProjectRole.OWNER, user: userC },
    ],
  };

  const mockMessageA = {
    id: 'msg-100',
    content: 'Hello Team Alpha!',
    projectId: projectA.id,
    senderId: userA.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    sender: userA,
  };

  beforeAll(async () => {
    const hash = await bcrypt.hash('Password123!', 10);
    userA.passwordHash = hash;
    userB.passwordHash = hash;
    userC.passwordHash = hash;

    tokenA = generateAccessToken({ userId: userA.id, email: userA.email });
    tokenB = generateAccessToken({ userId: userB.id, email: userB.email });
    tokenC = generateAccessToken({ userId: userC.id, email: userC.email });

    // Start test HTTP server with Socket.IO
    server = createServer(app);
    initializeSocket(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          serverPort = address.port;
        }
        resolve();
      });
    });
  });

  afterAll((done) => {
    server.close(() => done());
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. REST API Message History ────────────────────────────────────
  describe('REST Message History Endpoints', () => {
    it('GET /api/projects/:projectId/messages should return message list for project member', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userA);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(projectA);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([mockMessageA]);
      (prisma.message.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get(`/api/projects/${projectA.id}/messages?page=1&limit=30`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages).toHaveLength(1);
      expect(res.body.data.messages[0].content).toBe('Hello Team Alpha!');
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 30,
        total: 1,
        totalPages: 1,
      });
    });

    it('GET /api/projects/:projectId/messages should reject non-members with 403 Forbidden', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userC);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(projectA);

      const res = await request(app)
        .get(`/api/projects/${projectA.id}/messages`)
        .set('Authorization', `Bearer ${tokenC}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('DELETE /api/messages/:messageId should allow sender to delete own message', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userA);
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessageA,
        project: projectA,
      });
      (prisma.message.delete as jest.Mock).mockResolvedValue(mockMessageA);

      const res = await request(app)
        .delete(`/api/messages/${mockMessageA.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(204);
      expect(prisma.message.delete).toHaveBeenCalledWith({ where: { id: mockMessageA.id } });
    });
  });

  // ─── 2. Socket.IO Authentication & Project Rooms ─────────────────────
  describe('Socket.IO Authentication & Room Management', () => {
    it('should reject socket connection without valid JWT token', (done) => {
      const client = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      client.on('connect_error', (err) => {
        expect(err.message).toBe('Invalid token');
        client.disconnect();
        done();
      });
    });

    it('should connect authenticated socket and allow member to join project room', (done) => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userA);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(projectA);

      const client = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: tokenA },
        transports: ['websocket'],
      });

      client.on('connect', () => {
        client.emit('project:join', { projectId: projectA.id });
      });

      client.on('project:joined', (data) => {
        expect(data.projectId).toBe(projectA.id);
        client.disconnect();
        done();
      });
    });

    it('should reject non-member from joining project room with FORBIDDEN error', (done) => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userC);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(projectA);

      const client = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: tokenC },
        transports: ['websocket'],
      });

      client.on('connect', () => {
        client.emit('project:join', { projectId: projectA.id });
      });

      client.on('error', (err) => {
        expect(err.code).toBe('FORBIDDEN');
        client.disconnect();
        done();
      });
    });
  });

  // ─── 3. Real-Time Messaging & Room Isolation ─────────────────────────
  describe('Real-Time Messaging & Room Isolation', () => {
    let clientA: ClientSocketType;
    let clientB: ClientSocketType;
    let clientC: ClientSocketType;

    afterEach(() => {
      if (clientA?.connected) clientA.disconnect();
      if (clientB?.connected) clientB.disconnect();
      if (clientC?.connected) clientC.disconnect();
    });

    it('should persist message and broadcast to all members of the project room', (done) => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(userA)
        .mockResolvedValueOnce(userB);

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(projectA);
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-new-1',
        content: 'Broadcast test message',
        projectId: projectA.id,
        senderId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: userA,
      });

      clientA = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: tokenA },
        transports: ['websocket'],
      });

      clientB = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: tokenB },
        transports: ['websocket'],
      });

      let joinedCount = 0;
      const onJoined = () => {
        joinedCount++;
        if (joinedCount === 2) {
          // Client A sends message
          clientA.emit('message:send', {
            projectId: projectA.id,
            content: 'Broadcast test message',
          });
        }
      };

      clientA.on('connect', () => {
        clientA.emit('project:join', { projectId: projectA.id });
      });
      clientA.on('project:joined', onJoined);

      clientB.on('connect', () => {
        clientB.emit('project:join', { projectId: projectA.id });
      });
      clientB.on('project:joined', onJoined);

      // Client B should receive the message in real time
      clientB.on('message:new', (msg) => {
        expect(msg.content).toBe('Broadcast test message');
        expect(msg.projectId).toBe(projectA.id);
        expect(msg.senderId).toBe(userA.id);
        expect(msg.sender.name).toBe(userA.name);
        done();
      });
    });

    it('should reject empty or whitespace-only messages', (done) => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userA);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(projectA);

      clientA = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: tokenA },
        transports: ['websocket'],
      });

      clientA.on('connect', () => {
        clientA.emit('message:send', {
          projectId: projectA.id,
          content: '   ',
        });
      });

      clientA.on('error', (err) => {
        expect(err.code).toBe('INVALID_MESSAGE');
        done();
      });
    });

    it('should reject oversized messages (> 2000 chars)', (done) => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userA);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(projectA);

      clientA = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: tokenA },
        transports: ['websocket'],
      });

      clientA.on('connect', () => {
        clientA.emit('message:send', {
          projectId: projectA.id,
          content: 'A'.repeat(2005),
        });
      });

      clientA.on('error', (err) => {
        expect(err.code).toBe('MESSAGE_TOO_LONG');
        done();
      });
    });

    it('CRITICAL: Room Isolation - Project B user should NOT receive Project A messages', (done) => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(userA)
        .mockResolvedValueOnce(userC);

      (prisma.project.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === projectA.id) return Promise.resolve(projectA);
        if (where.id === projectB.id) return Promise.resolve(projectB);
        return Promise.resolve(null);
      });

      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-isolated',
        content: 'Secret alpha message',
        projectId: projectA.id,
        senderId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: userA,
      });

      clientA = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: tokenA },
        transports: ['websocket'],
      });

      clientC = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: tokenC },
        transports: ['websocket'],
      });

      let projectCReceived = false;

      clientC.on('connect', () => {
        clientC.emit('project:join', { projectId: projectB.id });
      });

      clientC.on('message:new', () => {
        projectCReceived = true;
      });

      clientA.on('connect', () => {
        clientA.emit('project:join', { projectId: projectA.id });
      });

      clientA.on('project:joined', () => {
        // Send message to Project A
        clientA.emit('message:send', {
          projectId: projectA.id,
          content: 'Secret alpha message',
        });

        // Wait 150ms to ensure clientC did not receive it
        setTimeout(() => {
          expect(projectCReceived).toBe(false);
          done();
        }, 150);
      });
    });

    it('should broadcast typing indicators to room members', (done) => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(userA)
        .mockResolvedValueOnce(userB);

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(projectA);

      clientA = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: tokenA },
        transports: ['websocket'],
      });

      clientB = ClientSocket(`http://localhost:${serverPort}`, {
        auth: { token: tokenB },
        transports: ['websocket'],
      });

      clientB.on('connect', () => {
        clientB.emit('project:join', { projectId: projectA.id });
      });

      clientB.on('typing:update', (data) => {
        expect(data.projectId).toBe(projectA.id);
        expect(data.userId).toBe(userA.id);
        expect(data.isTyping).toBe(true);
        done();
      });

      clientA.on('connect', () => {
        clientA.emit('project:join', { projectId: projectA.id });
      });

      clientA.on('project:joined', () => {
        clientA.emit('typing:start', { projectId: projectA.id });
      });
    });
  });
});
