import type { ErrorRequestHandler } from 'express'

import { AppError } from '../errors/AppError'

// Pull a client-error (4xx) status off errors thrown by upstream middleware
// (e.g. express.json(): malformed body -> 400 SyntaxError, oversized body ->
// 413 PayloadTooLargeError). These carry a numeric `status`/`statusCode`.
function clientErrorStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null) {
    const candidate = err as { status?: unknown; statusCode?: unknown }
    const status = typeof candidate.status === 'number' ? candidate.status : candidate.statusCode
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return status
    }
  }
  return undefined
}

// Single Express 5 error-handling middleware (4-arg signature, mounted last).
// Typed AppErrors map to their status + { error: { code, message } }; known
// client errors keep their 4xx status; anything else is logged server-side and
// returned as a generic 500 with no leaked internals or stack trace.
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // If the response has already started, we can't write a fresh envelope;
  // delegate to Express's default handler to close the socket cleanly.
  if (res.headersSent) {
    next(err)
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } })
    return
  }

  const status = clientErrorStatus(err)
  if (status !== undefined) {
    const code = status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST'
    const message = status === 413 ? 'Request payload too large.' : 'Malformed request.'
    res.status(status).json({ error: { code, message } })
    return
  }

  console.error('Unexpected error:', err)
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong.' } })
}
