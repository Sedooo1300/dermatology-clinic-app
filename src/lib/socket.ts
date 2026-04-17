// WebSocket sync - No-op stub for Vercel deployment
// WebSocket requires a persistent server (not available on Vercel serverless)

export function getSocket() {
  return null
}

export function disconnectSocket() {
  // no-op
}

export function emitChange(_type: string, _action: string, _payload: unknown) {
  // no-op - sync is disabled on Vercel
}
