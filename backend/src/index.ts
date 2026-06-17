// Real entrypoint: validate env (fail-fast) -> run migrations -> listen.
// Imports are dynamic so an EnvValidationError thrown while loading config is
// catchable here and turned into a clean non-zero exit rather than an
// uncaught exception with a stack trace. Dynamic import() is a real ESM import
// under NodeNext, so these (unlike the static CJS imports elsewhere) carry the
// explicit .js extension; tsx and node dist/ both resolve them.
async function main(): Promise<void> {
  try {
    const { env } = await import('./config/env.js')
    const { pool } = await import('./db/pool.js')
    const { runMigrations } = await import('./db/migrate.js')
    const { createApp } = await import('./app.js')

    await runMigrations(pool)

    const app = createApp()
    const server = app.listen(env.PORT, () => {
      console.log(`backend listening on :${env.PORT} [${env.NODE_ENV}]`)
    })
    // listen() reports failures (EADDRINUSE, EACCES) via an async 'error' event,
    // not by rejecting — the surrounding try/catch can't see them. Fail fast.
    server.on('error', (err) => {
      console.error('Failed to start HTTP server:', err)
      process.exit(1)
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'EnvValidationError') {
      console.error(`\n✖ ${err.message}\n`)
      process.exit(1)
    }
    console.error('Failed to start backend:', err)
    process.exit(1)
  }
}

void main()
