-- The Commons: a class-wide space where students choose to share highlights
-- and talk about them.
--
-- Sharing is per highlight and opt-in. `shared_at` is NULL for a private
-- highlight (every row that exists before this migration stays private) and
-- carries the moment of sharing otherwise, which is also the feed order.
-- Explain events are untouched: they stay count-only teaching data.
ALTER TABLE highlights ADD COLUMN shared_at TEXT;
CREATE INDEX IF NOT EXISTS idx_highlights_shared
	ON highlights (shared_at DESC) WHERE shared_at IS NOT NULL;

-- How a student appears to classmates. NULL falls back to the part of the
-- email before the @; the reader asks for a name the first time you share.
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Replies under a shared highlight. Deleting the highlight (or unsharing it,
-- which hides the thread) is the author's call; deleting an account removes
-- that person's comments everywhere.
CREATE TABLE IF NOT EXISTS comments (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	highlight_id INTEGER NOT NULL,
	user_id      INTEGER NOT NULL,
	body         TEXT NOT NULL,
	created_at   TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (highlight_id) REFERENCES highlights(id) ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_highlight ON comments (highlight_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments (user_id);
