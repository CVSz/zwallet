import crypto from 'crypto'

export function extractIdentity(req) {
  const raw = `${req.socket.remoteAddress}|${req.headers['user-agent'] || ''}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}
