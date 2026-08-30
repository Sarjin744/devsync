import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:5000';

  if (!socket) {
    socket = io(socketUrl, {
      auth: {
        token: token || (typeof window !== 'undefined' ? localStorage.getItem('token') : ''),
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
