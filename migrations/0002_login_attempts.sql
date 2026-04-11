-- Migration 0002: 로그인 속도 제한용 테이블
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_username_time
  ON login_attempts(username, attempted_at);
