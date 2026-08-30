import { Server as SocketServer, Socket } from 'socket.io';

// Map userId → socketId for targeted notification delivery
const userSocketMap = new Map<string, string>();

export function registerNotificationHandlers(
  _io: SocketServer,
  socket: Socket,
): void {
  userSocketMap.set(socket.userId, socket.id);

  socket.on('disconnect', () => {
    userSocketMap.delete(socket.userId);
  });
}

/**
 * Send a real-time notification to a specific user if they are online.
 * Called from service layer when notifications are created.
 */
export function sendNotificationToUser(
  io: SocketServer,
  userId: string,
  notification: unknown,
): void {
  const socketId = userSocketMap.get(userId);
  if (socketId) {
    io.to(socketId).emit('notification:new', notification);
  }
}

export { userSocketMap };
