import { Server } from 'socket.io';

const io = new Server(3003, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Store connected clients
const clients = new Map<string, string>();

io.on('connection', (socket) => {
  const clientId = socket.id;
  clients.set(clientId, 'connected');
  console.log(`[Sync] Client connected: ${clientId} (Total: ${clients.size})`);

  // Notify others about new connection
  socket.broadcast.emit('sync:client-count', { count: clients.size });

  // Sync request - full data sync between devices
  socket.on('sync:request', (data) => {
    console.log(`[Sync] Sync request from ${clientId}:`, data.type);
    socket.broadcast.emit('sync:broadcast', {
      type: data.type,
      payload: data.payload,
      from: clientId,
      timestamp: new Date().toISOString(),
    });
  });

  // Real-time change notifications
  socket.on('sync:change', (data) => {
    console.log(`[Sync] Change from ${clientId}:`, data.type);
    socket.broadcast.emit('sync:update', {
      type: data.type,
      action: data.action, // create, update, delete
      payload: data.payload,
      from: clientId,
      timestamp: new Date().toISOString(),
    });
  });

  // Ping/Pong for keepalive
  socket.on('sync:ping', () => {
    socket.emit('sync:pong', { timestamp: new Date().toISOString() });
  });

  socket.on('disconnect', () => {
    clients.delete(clientId);
    console.log(`[Sync] Client disconnected: ${clientId} (Total: ${clients.size})`);
    io.emit('sync:client-count', { count: clients.size });
  });
});

console.log('[Sync] WebSocket sync service running on port 3003');
