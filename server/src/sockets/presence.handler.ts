import { Server as SocketServer, Socket } from 'socket.io';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export function registerPresenceHandlers(
  io: SocketServer,
  socket: Socket,
): void {
  // Mark user as online
  const markOnline = async () => {
    try {
      await prisma.user.update({
        where: { id: socket.userId },
        data: { isOnline: true },
      });
      io.emit('user:online', { userId: socket.userId });
    } catch (error) {
      logger.error('Error marking user online:', (error as Error).message);
    }
  };

  // Mark user as offline
  const markOffline = async () => {
    try {
      await prisma.user.update({
        where: { id: socket.userId },
        data: { isOnline: false },
      });
      io.emit('user:offline', { userId: socket.userId });
    } catch (error) {
      logger.error('Error marking user offline:', (error as Error).message);
    }
  };

  markOnline();

  socket.on('disconnect', () => {
    markOffline();
  });
}
