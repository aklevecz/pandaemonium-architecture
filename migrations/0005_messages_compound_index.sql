-- Compound index lets D1 satisfy
--   SELECT ... FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
-- (the chat history fetch on every POST and on conversation load) using the
-- index alone, no separate sort step. The previous single-column index on
-- conversation_id required SQLite to filter then sort; this fixes that as
-- chat threads grow.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at);

-- Drop the now-redundant single-column index. The compound index above
-- covers any query that filtered by conversation_id alone.
DROP INDEX IF EXISTS idx_messages_conversation;
