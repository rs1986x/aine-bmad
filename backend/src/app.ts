import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import { env } from './config/env'
import { NotFoundError } from './errors/AppError'
import { errorHandler } from './middleware/errorHandler'
import healthRoutes from './routes/health.routes'
import todoRoutes from './routes/todo.routes'

// Builds and returns the Express app WITHOUT calling listen, so Supertest can
// drive it in-process. Middleware order matters: security/parse first, routes
// next, error envelope last.
export function createApp(): Express {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN }))
  app.use(express.json({ limit: '16kb' }))
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'))
  }

  app.use('/api', healthRoutes)
  app.use('/api', todoRoutes)

  // Unmatched routes funnel through the same error envelope rather than
  // Express's default HTML 404, keeping the client contract uniform.
  app.use((_req, _res, next) => {
    next(new NotFoundError('Route not found.'))
  })

  app.use(errorHandler)

  return app
}
