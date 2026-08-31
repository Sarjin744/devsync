import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './api';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  const socketUrl = getApiBaseUrl();

  if (!socket) {
    socket = io(socketUrl, {
      auth: {
        token:
          token ||
          (typeof window !== 'undefined'
            ? localStorage.getItem('devsync_access_token') || localStorage.getItem('token')
            : ''),
      },
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  } else if (token) {
    socket.auth = { token };
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
