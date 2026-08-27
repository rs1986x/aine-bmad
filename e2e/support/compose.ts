import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const composeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const healthUrl = 'http://localhost:8080/api/health'
const pollIntervalMs = 250

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function compose(args: string[]): Promise<void> {
  await execFileAsync('docker', ['compose', ...args], {
    cwd: composeRoot,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 90_000,
  })
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

export async function restoreBackendHealth(): Promise<void> {
  await startBackend()
}
