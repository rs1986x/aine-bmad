import dotenv from 'dotenv'
import { z } from 'zod'

// Pick the test env file when running under Vitest (NODE_ENV=test), otherwise
// the regular .env. This is the only place that decides which file to load.
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
dotenv.config({ path: envFile })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
})

export type Env = z.infer<typeof envSchema>

// Thrown (never exits the process) so it stays unit-testable; index.ts is the
// single place that turns this into a fail-fast non-zero exit.
export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvValidationError'
  }
}

// Pure: takes a record so tests can exercise it without mutating process.env.
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new EnvValidationError(`Invalid environment configuration:\n${details}`)
  }
  return result.data
}

// Parsed once at module load. Throws EnvValidationError on bad config; callers
// that want fail-fast process exit (index.ts) catch it and exit non-zero.
export const env: Env = parseEnv(process.env)
