import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket: Socket | null = null;
const SOCKET_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://devsync-api.onrender.com';

export async function getMobileSocket(): Promise<Socket> {
  const token = (await AsyncStorage.getItem('@devsync/access_token')) || '';

  if (!socket) {
    socket = io(SOCKET_BASE_URL, {
      auth: { token },
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  } else {
    socket.auth = { token };
  }

  return socket;
}

export function disconnectMobileSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
