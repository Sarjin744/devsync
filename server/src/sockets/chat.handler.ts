import { Server as SocketServer, Socket } from 'socket.io';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

// In-memory presence map: projectId -> Set of userIds
const projectPresence = new Map<string, Set<string>>();

// Rate limiting: socketId -> timestamps array
const messageRateLimits = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5000;
const MAX_MESSAGES_PER_WINDOW = 15;

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

export function registerChatHandlers(io: SocketServer, socket: Socket): void {
  // ─── 1. Join Project Room ───────────────────────────────────
  socket.on(
    'project:join',
    async (payload: string | { projectId: string }, callback?: (res: unknown) => void) => {
      try {
        const projectId = typeof payload === 'string' ? payload : payload?.projectId;

        if (!projectId) {
          socket.emit('error', { code: 'INVALID_PROJECT', message: 'Project ID is required' });
          if (callback) callback({ success: false, error: 'Project ID is required' });
          return;
        }

        // Verify project exists & user is member or owner
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: { members: true },
        });

        if (!project) {
          socket.emit('error', { code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
          if (callback) callback({ success: false, error: 'Project not found' });
          return;
        }

        const isMember = project.members.some((m) => m.userId === socket.userId);
        if (!isMember && project.ownerId !== socket.userId) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Not a member of this project' });
          if (callback) callback({ success: false, error: 'Forbidden' });
          return;
        }

        // Join room
        const roomName = `project:${projectId}`;
        socket.join(roomName);

        // Update presence
        if (!projectPresence.has(projectId)) {
          projectPresence.set(projectId, new Set<string>());
        }
        projectPresence.get(projectId)!.add(socket.userId);

        const onlineUserIds = Array.from(projectPresence.get(projectId)!);

        // Confirm join
        socket.emit('project:joined', { projectId });
        if (callback) callback({ success: true, projectId });

        // Notify room of presence update
        io.to(roomName).emit('presence:sync', {
          projectId,
          onlineUserIds,
        });

        io.to(roomName).emit('presence:online', {
          projectId,
          userId: socket.userId,
          userName: socket.userName,
        });

        logger.debug(`User ${socket.userName} (${socket.userId}) joined chat room: ${roomName}`);
      } catch (error) {
        logger.error('Error joining project room:', (error as Error).message);
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join project room' });
      }
    },
  );

  // ─── 2. Leave Project Room ──────────────────────────────────
  socket.on(
    'project:leave',
    (payload: string | { projectId: string }, callback?: (res: unknown) => void) => {
      try {
        const projectId = typeof payload === 'string' ? payload : payload?.projectId;
        if (!projectId) return;

        const roomName = `project:${projectId}`;
        socket.leave(roomName);

        const usersSet = projectPresence.get(projectId);
        if (usersSet) {
          usersSet.delete(socket.userId);
          if (usersSet.size === 0) {
            projectPresence.delete(projectId);
          }
        }

        io.to(roomName).emit('presence:offline', {
          projectId,
          userId: socket.userId,
          userName: socket.userName,
        });

        if (callback) callback({ success: true, projectId });
        logger.debug(`User ${socket.userName} left chat room: ${roomName}`);
      } catch (error) {
        logger.error('Error leaving project room:', (error as Error).message);
      }
    },
  );

  // ─── 3. Send Message ────────────────────────────────────────
  socket.on(
    'message:send',
    async (
      data: { projectId: string; content: string },
      callback?: (res: unknown) => void,
    ) => {
      try {
        const { projectId, content } = data || {};

        if (!projectId) {
          socket.emit('error', { code: 'INVALID_PROJECT', message: 'Project ID is required' });
          if (callback) callback({ success: false, error: 'Project ID is required' });
          return;
        }

        const trimmedContent = (content || '').trim();

        // Validation: Empty or whitespace-only
        if (!trimmedContent) {
          socket.emit('error', { code: 'INVALID_MESSAGE', message: 'Message cannot be empty' });
          if (callback) callback({ success: false, error: 'Message cannot be empty' });
          return;
        }

        // Validation: Max length (2000 characters)
        if (trimmedContent.length > 2000) {
          socket.emit('error', {
            code: 'MESSAGE_TOO_LONG',
            message: 'Message exceeds 2000 characters limit',
          });
          if (callback) callback({ success: false, error: 'Message exceeds 2000 characters limit' });
          return;
        }

        // Rate limiting check
        const now = Date.now();
        const timestamps = messageRateLimits.get(socket.id) || [];
        const recentTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

        if (recentTimestamps.length >= MAX_MESSAGES_PER_WINDOW) {
          socket.emit('error', {
            code: 'RATE_LIMITED',
            message: 'You are sending messages too quickly. Please slow down.',
          });
          if (callback) callback({ success: false, error: 'Rate limit exceeded' });
          return;
        }

        recentTimestamps.push(now);
        messageRateLimits.set(socket.id, recentTimestamps);

        // Verify project membership
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: { members: true },
        });

        if (!project) {
          socket.emit('error', { code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
          if (callback) callback({ success: false, error: 'Project not found' });
          return;
        }

        const isMember = project.members.some((m) => m.userId === socket.userId);
        if (!isMember && project.ownerId !== socket.userId) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Not authorized to post in this project' });
          if (callback) callback({ success: false, error: 'Forbidden' });
          return;
        }

        // Persist message in PostgreSQL
        const message = await prisma.message.create({
          data: {
            content: trimmedContent,
            projectId,
            senderId: socket.userId,
          },
          include: {
            sender: { select: USER_SELECT },
          },
        });

        const payload = {
          id: message.id,
          content: message.content,
          projectId: message.projectId,
          senderId: message.senderId,
          createdAt: message.createdAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),
          sender: {
            ...message.sender,
            createdAt: message.sender.createdAt.toISOString(),
            updatedAt: message.sender.updatedAt.toISOString(),
          },
          user: {
            ...message.sender,
            createdAt: message.sender.createdAt.toISOString(),
            updatedAt: message.sender.updatedAt.toISOString(),
          },
        };

        const roomName = `project:${projectId}`;

        // Broadcast to project room
        io.to(roomName).emit('message:new', payload);
        io.to(roomName).emit('message:received', payload); // Compatibility alias

        if (callback) callback({ success: true, data: payload });
      } catch (error) {
        logger.error('Error sending message:', (error as Error).message);
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to send message' });
        if (callback) callback({ success: false, error: 'Failed to send message' });
      }
    },
  );

  // ─── 4. Typing Indicators ───────────────────────────────────
  socket.on('typing:start', (data: { projectId: string }) => {
    if (!data?.projectId) return;
    socket.to(`project:${data.projectId}`).emit('typing:update', {
      projectId: data.projectId,
      userId: socket.userId,
      userName: socket.userName,
      isTyping: true,
    });
    socket.to(`project:${data.projectId}`).emit('message:typing', {
      projectId: data.projectId,
      userId: socket.userId,
      isTyping: true,
    });
  });

  socket.on('typing:stop', (data: { projectId: string }) => {
    if (!data?.projectId) return;
    socket.to(`project:${data.projectId}`).emit('typing:update', {
      projectId: data.projectId,
      userId: socket.userId,
      userName: socket.userName,
      isTyping: false,
    });
    socket.to(`project:${data.projectId}`).emit('message:typing', {
      projectId: data.projectId,
      userId: socket.userId,
      isTyping: false,
    });
  });

  socket.on('message:typing', (data: { projectId: string; isTyping: boolean }) => {
    if (!data?.projectId) return;
    socket.to(`project:${data.projectId}`).emit('typing:update', {
      projectId: data.projectId,
      userId: socket.userId,
      userName: socket.userName,
      isTyping: data.isTyping,
    });
    socket.to(`project:${data.projectId}`).emit('message:typing', {
      projectId: data.projectId,
      userId: socket.userId,
      isTyping: data.isTyping,
    });
  });

  // ─── 5. Cleanup on Disconnect ───────────────────────────────
  socket.on('disconnect', () => {
    messageRateLimits.delete(socket.id);

    // Clean up project presence across rooms
    for (const [projectId, usersSet] of projectPresence.entries()) {
      if (usersSet.has(socket.userId)) {
        usersSet.delete(socket.userId);
        io.to(`project:${projectId}`).emit('presence:offline', {
          projectId,
          userId: socket.userId,
          userName: socket.userName,
        });
        if (usersSet.size === 0) {
          projectPresence.delete(projectId);
        }
      }
    }
  });
}
