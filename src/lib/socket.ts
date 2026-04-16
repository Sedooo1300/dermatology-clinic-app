import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id)
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
    })

    socket.on('connect_error', (err) => {
      console.log('[Socket] Connection error:', err.message)
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function emitChange(type: string, action: string, payload: unknown) {
  const s = getSocket()
  s.emit('sync:change', { type, action, payload, timestamp: new Date().toISOString() })
}
