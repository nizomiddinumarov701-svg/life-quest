-- LifeQuest Cloud Sync tables (Netlify Database Postgres)
CREATE TABLE IF NOT EXISTS sync_vaults (
  vault_id TEXT PRIMARY KEY,
  pass_salt TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  state_json JSONB NOT NULL,
  active_timer_json JSONB,
  active_timer_updated_at BIGINT NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_sessions (
  token_hash TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES sync_vaults(vault_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_sessions_vault_id ON sync_sessions(vault_id);
