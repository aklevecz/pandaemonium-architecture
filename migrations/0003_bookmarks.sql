CREATE TABLE IF NOT EXISTS bookmarks (
  user_id INTEGER NOT NULL,
  reading_slug TEXT NOT NULL,
  scroll_position REAL NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, reading_slug),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
