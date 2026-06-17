import { Router } from 'express'

import { pool } from '../db/pool'

const router = Router()

// Liveness/readiness probe. A probe reports status via its own body, so it does
// NOT funnel failures into the error envelope.
router.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.status(200).json({ status: 'ok', db: 'up' })
  } catch {
    res.status(503).json({ status: 'error', db: 'down' })
  }
})

export default router
