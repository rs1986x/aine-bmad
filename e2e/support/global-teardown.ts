import { assertAxeResultManifest } from './a11y'
import { cleanupE2eTodos, restoreBackendHealth } from './compose'

// Safety net for the stack-mutating specs: if a run was interrupted between
// `stopBackend()` and its `finally`, the backend is still down. Restore it
// first, then drop the rows this suite created so repeated local runs against
// the persistent named volume do not accumulate todos.
export default async function globalTeardown(): Promise<void> {
  let manifestFailure: unknown
  if (process.env.CI) {
    try {
      await assertAxeResultManifest()
    } catch (error) {
      manifestFailure = error
    }
  }

  await restoreBackendHealth()

  try {
    await cleanupE2eTodos()
  } catch (error) {
    console.error('[e2e] could not clean up e2e todos:', error)
  }

  if (manifestFailure) throw manifestFailure
}
