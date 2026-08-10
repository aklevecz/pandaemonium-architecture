-- Single-use magic-link tokens. Only the SHA-256 hash is stored, so a D1 dump
-- can't be replayed into a live session; the raw token exists only in the
-- email we sent.
CREATE TABLE IF NOT EXISTS login_tokens (
	token_hash TEXT PRIMARY KEY,
	email      TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	expires_at TEXT NOT NULL,
	used_at    TEXT,
	request_ip TEXT
);

-- Throttling reads "how many did this address ask for recently".
CREATE INDEX IF NOT EXISTS idx_login_tokens_email_created
	ON login_tokens (email, created_at DESC);

-- Sweeping expired rows.
CREATE INDEX IF NOT EXISTS idx_login_tokens_expires
	ON login_tokens (expires_at);

ALTER TABLE users ADD COLUMN email_verified_at TEXT;

-- users.password_hash is NOT NULL and the table is referenced by notes,
-- highlights, bookmarks, vocab, conversations and sessions — rebuilding it to
-- drop the constraint is more risk than the constraint is worth. Passwordless
-- accounts therefore store the sentinel '!passwordless', which cannot collide
-- with a real hash (those are '<hex salt>:<hex digest>', so never contain '!').
-- verifyPassword() rejects anything that isn't hex:hex, so the sentinel can't
-- be coaxed into matching if password login is ever reintroduced.

