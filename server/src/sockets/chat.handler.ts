import { Server as SocketServer, Socket } from 'socket.io';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export function registerChatHandlers(io: SocketServer, socket: Socket): void {
  // Join a project room to receive messages
  socket.on('project:join', (projectId: string) => {
    socket.join(`project:${projectId}`);
    logger.debug(`User ${socket.userId} joined project room: ${projectId}`);
  });

  socket.on('project:leave', (projectId: string) => {
    socket.leave(`project:${projectId}`);
  });

  // Handle sending a message
  socket.on(
    'message:send',
    async (data: { projectId: string; content: string }) => {
      try {
        if (!data.content?.trim()) return;

        // Verify user is a member of this project
        const membership = await prisma.projectMember.findFirst({
          where: { projectId: data.projectId, userId: socket.userId },
        });

        if (!membership) {
          socket.emit('error', { message: 'Not a member of this project' });
          return;
        }

        // Persist message
        const message = await prisma.message.create({
          data: {
            content: data.content.trim(),
            projectId: data.projectId,
            userId: socket.userId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                bio: true,
                isOnline: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

        // Broadcast to project room
        io.to(`project:${data.projectId}`).emit('message:received', {
          ...message,
          createdAt: message.createdAt.toISOString(),
          user: {
            ...message.user,
            createdAt: message.user.createdAt.toISOString(),
            updatedAt: message.user.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        logger.error('Error sending message:', (error as Error).message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    },
  );

  // Typing indicator
  socket.on(
    'message:typing',
    (data: { projectId: string; isTyping: boolean }) => {
      socket.to(`project:${data.projectId}`).emit('message:typing', {
        projectId: data.projectId,
        userId: socket.userId,
        isTyping: data.isTyping,
      });
    },
  );
}
