ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_todos_idempotency_key
  ON todos (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
