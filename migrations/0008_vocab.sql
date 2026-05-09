-- Per-user vocab cards. Every "Define" lookup auto-saves so students build
-- a personal review list as they read. Same word looked up twice in the
-- same reading replaces the prior entry (latest definition wins) — looking
-- the same word up across two different readings keeps both, since the
-- contextual meaning often differs (Bohr's "apparatus" vs Foucault's).
CREATE TABLE IF NOT EXISTS vocab (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reading_slug TEXT NOT NULL,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  context TEXT,                              -- the passage where they encountered it
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, reading_slug, word)
);
CREATE INDEX IF NOT EXISTS idx_vocab_user_reading ON vocab(user_id, reading_slug);
CREATE INDEX IF NOT EXISTS idx_vocab_user ON vocab(user_id);
