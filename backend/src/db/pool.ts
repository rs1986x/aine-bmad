import { Pool } from 'pg'

import { env } from '../config/env'

// One shared pool for the whole process (never one pool per request).
export const pool = new Pool({ connectionString: env.DATABASE_URL })

// Without a listener, an error on an idle pooled client (DB restart, dropped
// connection, server-side termination) is emitted as an unhandled 'error'
// event and crashes the whole process. Log it and let the pool recover.
pool.on('error', (err) => {
  console.error('Unexpected idle Postgres client error:', err)
})
