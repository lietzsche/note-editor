-- Migration 0004: 서버 관리 세션
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_expires
  ON sessions(user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_sessions_expires
  ON sessions(expires_at);
