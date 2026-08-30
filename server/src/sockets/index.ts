import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { registerChatHandlers } from './chat.handler';
import { registerNotificationHandlers } from './notification.handler';
import { registerPresenceHandlers } from './presence.handler';

export let io: SocketServer;

interface SocketAuth {
  userId: string;
  email: string;
}

declare module 'socket.io' {
  interface Socket {
    userId: string;
    userEmail: string;
  }
}

export function initializeSocket(server: HttpServer): void {
  io = new SocketServer(server, {
    cors: {
      origin: env.ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ─── Authentication Middleware ────────────────────────────
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as SocketAuth & {
        userId: string;
        email: string;
      };

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true },
      });

      if (!user) {
        next(new Error('User not found'));
        return;
      }

      socket.userId = user.id;
      socket.userEmail = user.email;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ───────────────────────────────────
  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Register domain-specific handlers
    registerChatHandlers(io, socket);
    registerNotificationHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.IO initialized');
}
