import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { prisma } from '../config/prisma';
import { registerChatHandlers } from './chat.handler';
import { registerNotificationHandlers } from './notification.handler';
import { registerPresenceHandlers } from './presence.handler';

export let io: SocketServer;

interface JwtPayload {
  userId: string;
  email: string;
}

declare module 'socket.io' {
  interface Socket {
    userId: string;
    userEmail: string;
    userName: string;
  }
}

export function initializeSocket(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: env.ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // ─── Authentication Middleware ────────────────────────────
  io.use(async (socket: Socket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        socket.handshake.query?.token;

      if (!authHeader || typeof authHeader !== 'string') {
        return next(new Error('Authentication required'));
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

      // Verify user exists in database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.userEmail = user.email;
      socket.userName = user.name;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ───────────────────────────────────
  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userName} [${socket.userId}])`);

    // Automatically join private user room for targeted notifications
    socket.join(`user:${socket.userId}`);

    // Register domain handlers
    registerChatHandlers(io, socket);
    registerNotificationHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
}
