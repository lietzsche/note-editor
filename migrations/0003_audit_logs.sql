-- Migration 0003: 인증 이벤트 감사 로그
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,  -- 'login_success' | 'login_failure' | 'logout'
  username TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_username_time
  ON audit_logs(username, created_at);
