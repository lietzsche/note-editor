ALTER TABLE pages ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_pages_user_deleted_at ON pages(user_id, deleted_at);
