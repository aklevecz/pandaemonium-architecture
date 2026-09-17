-- The lab desk: two small things students do with the lab instructor.
--
-- meeting_requests: "can we meet?" A student says what it's about and when
-- they're free; the instructor answers with a time in `reply` and moves the
-- status along. Students only ever see their own rows.
CREATE TABLE IF NOT EXISTS meeting_requests (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id      INTEGER NOT NULL,
	topic        TEXT NOT NULL,
	availability TEXT NOT NULL DEFAULT '',
	status       TEXT NOT NULL DEFAULT 'open',   -- open | scheduled | done
	reply        TEXT NOT NULL DEFAULT '',
	created_at   TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_user ON meeting_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_status ON meeting_requests (status, created_at DESC);

-- fuser_signups: the sign-up sheet for Fuser access. One row per student.
-- `fuser_email` is the address their Fuser account uses, which is often not
-- the school address they sign in here with. Classmates see names on the
-- sheet; only the instructor sees the addresses.
CREATE TABLE IF NOT EXISTS fuser_signups (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id     INTEGER NOT NULL UNIQUE,
	fuser_email TEXT NOT NULL,
	note        TEXT NOT NULL DEFAULT '',
	status      TEXT NOT NULL DEFAULT 'requested', -- requested | granted
	created_at  TEXT NOT NULL DEFAULT (datetime('now')),
	granted_at  TEXT,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
