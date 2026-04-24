-- Migration 0006: admin password reset audit log
-- FEATURE-009-admin-password-reset

CREATE TABLE IF NOT EXISTS admin_password_resets (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  admin_username TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  target_username TEXT NOT NULL,
  reset_mode TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_password_resets_created_at
  ON admin_password_resets(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_password_resets_target_user
  ON admin_password_resets(target_user_id, created_at);
