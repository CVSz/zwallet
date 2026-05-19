import { v4 as uuid } from 'uuid'

export function traceMiddleware(req, res, next) {
  req.trace_id = req.headers['x-trace-id'] || uuid()
  res.setHeader('x-trace-id', req.trace_id)
  next()
}
