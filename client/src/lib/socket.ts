import { io } from "socket.io-client";

export const socket = io(window.location.origin, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  forceNew: true,
  rejectUnauthorized: false,
  pingInterval: 25000,
  pingTimeout: 10000
});

let reconnectTimer: NodeJS.Timeout | null = null;

// Handle connection
socket.on('connect', () => {
  console.log('Socket connected');
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
});

// Improved error handling
socket.on('connect_error', (error) => {
  console.warn('Socket connection error:', error);
  // Don't attempt immediate reconnection
  if (!reconnectTimer) {
    reconnectTimer = setTimeout(() => {
      if (!socket.connected) {
        socket.connect();
      }
    }, 2000);
  }
});

socket.on('disconnect', (reason) => {
  console.warn('Socket disconnected:', reason);

  if (reason === 'io server disconnect') {
    // Don't auto-reconnect on server-side disconnect
    return;
  }

  if (!reconnectTimer) {
    reconnectTimer = setTimeout(() => {
      if (!socket.connected) {
        socket.connect();
      }
    }, 2000);
  }
});


// Clean up on unmount
window.addEventListener('beforeunload', () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  socket.disconnect();
});

// Initial connection
socket.connect();

export default socket;