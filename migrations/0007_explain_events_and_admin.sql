-- Tracks every "Explain" trigger from the selection tooltip so the instructor
-- can see which passages students find confusing or thought-provoking.
-- Aggregated by (reading_slug, text) — no per-student attribution shown in the
-- dashboard (just counts), though user_id is kept for cleanup-on-account-delete.
CREATE TABLE IF NOT EXISTS explain_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reading_slug TEXT NOT NULL,
  text TEXT NOT NULL,
  position REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_explain_events_reading
  ON explain_events(reading_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_explain_events_user ON explain_events(user_id);

-- Instructor / admin role. Default false; an instructor flips themselves to
-- admin manually via:
--   wrangler d1 execute pandaemonium-db --remote \
--     --command "UPDATE users SET is_admin = 1 WHERE email = 'instructor@email'"
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;
