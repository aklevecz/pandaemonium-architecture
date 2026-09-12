-- Every failed call to the Claude API, so the instructor can see when the
-- key ran dry (or got rate-limited, or the model name went stale) instead of
-- hearing about it from a student. `emailed_at` is set on the rows that
-- triggered an alert email; the throttle reads the most recent one.
CREATE TABLE IF NOT EXISTS claude_failures (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	route      TEXT NOT NULL,
	kind       TEXT NOT NULL,
	status     INTEGER,
	detail     TEXT,
	emailed_at TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_claude_failures_emailed
	ON claude_failures (emailed_at DESC);
