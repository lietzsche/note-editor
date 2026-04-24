-- Current schema for note-editor
-- See docs/specs/SPEC-02-d1-migration-framework.md

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_reset_required INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS share_tokens (
  note_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL PRIMARY KEY,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  access_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(note_id)
);

CREATE TABLE IF NOT EXISTS admin_password_resets (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  admin_username TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  target_username TEXT NOT NULL,
  reset_mode TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pages_user_sort ON pages(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pages_user_group_sort ON pages(user_id, group_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_groups_user_position ON groups(user_id, position);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username_time ON login_attempts(username, attempted_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username_time ON audit_logs(username, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(share_token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_note_id ON share_tokens(note_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_expires ON share_tokens(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_password_resets_created_at ON admin_password_resets(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_password_resets_target_user ON admin_password_resets(target_user_id, created_at);
