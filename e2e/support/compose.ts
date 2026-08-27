import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const composeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const apiBase = 'http://localhost:8080/api'
const healthUrl = `${apiBase}/health`
const pollIntervalMs = 250

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function compose(args: string[]): Promise<void> {
  try {
    await execFileAsync('docker', ['compose', ...args], {
      cwd: composeRoot,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 90_000,
    })
  } catch (error) {
    // execFile rejections carry the captured output on the error object; without
    // this the only diagnostic is an exit code, which is useless in CI.
    const { stderr, stdout } = error as { stderr?: string; stdout?: string }
    const output = stderr?.trim() || stdout?.trim() || String(error)
    throw new Error(`docker compose ${args.join(' ')} failed: ${output}`, { cause: error })
  }
}

async function readHealth(): Promise<{ ok: boolean; status?: string; db?: string }> {
  const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5_000) })
  if (!response.ok) return { ok: false }
  const body = (await response.json()) as { status?: string; db?: string }
  return { ok: body.status === 'ok' && body.db === 'up', status: body.status, db: body.db }
}

export async function waitForApiHealth(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      const health = await readHealth()
      if (health.ok) return
      lastError = new Error(`health not ready: status=${health.status} db=${health.db}`)
    } catch (error) {
      lastError = error
    }
    await delay(pollIntervalMs)
  }
  throw new Error(`Timed out waiting for ${healthUrl}`, { cause: lastError })
}

export async function waitForApiUnavailable(timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let misses = 0
  while (Date.now() < deadline) {
    try {
      const health = await readHealth()
      misses = health.ok ? 0 : misses + 1
    } catch {
      misses += 1
    }
    if (misses >= 3) return
    await delay(pollIntervalMs)
  }
  throw new Error(`Timed out waiting for ${healthUrl} to become unavailable`)
}

export async function stopBackend(): Promise<void> {
  await compose(['stop', 'backend'])
}

export async function startBackend(): Promise<void> {
  await compose(['start', 'backend'])
  await waitForApiHealth()
}

export async function restartBackend(): Promise<void> {
  await compose(['restart', 'backend'])
  await waitForApiHealth()
}

// Called from `finally` blocks, so it must never throw: rethrowing here would
// replace the assertion failure that actually explains the run. It escalates
// from `start` to a full recreate, then gives up loudly and lets globalTeardown
// report the stack as unusable.
export async function restoreBackendHealth(): Promise<void> {
  try {
    await startBackend()
    return
  } catch (error) {
    console.error('[e2e] `docker compose start backend` did not restore health:', error)
  }

  try {
    await compose(['up', '-d', '--wait', 'backend'])
    await waitForApiHealth()
  } catch (error) {
    console.error('[e2e] backend could not be restored; later tests will fail:', error)
  }
}

// Removes only the todos this suite created, identified by the `e2e ` prefix
// that `uniqueTodo` stamps on every description. The production stack keeps a
// named volume, so without this a repeated local run accumulates rows forever.
export async function cleanupE2eTodos(): Promise<void> {
  const response = await fetch(`${apiBase}/todos`, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error(`Could not list todos for cleanup: ${response.status}`)
  const todos = (await response.json()) as { id: string; description: string }[]

  for (const todo of todos.filter((todo) => todo.description.startsWith('e2e '))) {
    await fetch(`${apiBase}/todos/${encodeURIComponent(todo.id)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10_000),
    })
  }
}
