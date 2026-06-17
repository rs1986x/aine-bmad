import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Pool, PoolClient } from 'pg'

// Stable, arbitrary key so every instance serializes on the same advisory lock.
const MIGRATION_LOCK_KEY = 4815162342

// Resolve the migrations directory from this file's runtime location so it
// works under tsx (src/db/migrate.ts) and node dist/ (dist/db/migrate.js):
// both sit two levels below the package root that holds `migrations/`.
function migrationsDir(): string {
  return join(__dirname, '..', '..', 'migrations')
}

/**
 * Apply any not-yet-applied SQL migrations, in filename order, recording each
 * in a `_migrations` ledger. Idempotent and safe to run on every boot: an
 * already-migrated DB applies nothing. Each file runs in its own transaction.
 *
 * The whole run is guarded by a session-level advisory lock so concurrent boots
 * (multiple replicas, CI + a stray local run) serialize instead of racing the
 * check-then-apply and colliding on the `_migrations` primary key.
 */
export async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY])
    await applyPendingMigrations(client)
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY])
    client.release()
  }
}

async function applyPendingMigrations(client: PoolClient): Promise<void> {
  await client.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
       filename   TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  )

  const dir = migrationsDir()
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()

  for (const filename of files) {
    const { rows } = await client.query('SELECT 1 FROM _migrations WHERE filename = $1', [filename])
    if (rows.length > 0) continue

    const sql = readFileSync(join(dir, filename), 'utf8')
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [filename])
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }
  }
}
