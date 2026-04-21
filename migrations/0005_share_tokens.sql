-- Migration 0005: 노트 공개 공유를 위한 share_tokens 테이블
-- FEATURE-008-note-public-sharing 구현

CREATE TABLE IF NOT EXISTS share_tokens (
  note_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL PRIMARY KEY,
  is_active INTEGER NOT NULL DEFAULT 1, -- SQLite boolean (1 = true, 0 = false)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT, -- NULL이면 만료 없음
  access_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(note_id)
);

-- 빠른 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(share_token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_note_id ON share_tokens(note_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_expires ON share_tokens(expires_at) WHERE expires_at IS NOT NULL;