CREATE TABLE IF NOT EXISTS todos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos (created_at DESC);
