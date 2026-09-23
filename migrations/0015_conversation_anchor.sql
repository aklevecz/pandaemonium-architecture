-- A conversation started from "Explain" remembers the passage it was about, so
-- the reader can mark that phrase in the text and open the explanation from
-- it, the way a highlight opens its note. Conversations started from the chat
-- box have no anchor.
ALTER TABLE conversations ADD COLUMN anchor_text TEXT;
ALTER TABLE conversations ADD COLUMN anchor_position REAL;

-- Backfill from explain_events, which logged the same passage at the same
-- moment the conversation was created but never linked to it. A match is the
-- nearest event by the same user on the same reading within ten seconds.
UPDATE conversations
SET anchor_text = m.text, anchor_position = m.position
FROM (
  SELECT c.id AS cid, e.text, e.position,
         ROW_NUMBER() OVER (
           PARTITION BY c.id
           ORDER BY abs(strftime('%s', e.created_at) - strftime('%s', c.created_at))
         ) AS rn
  FROM conversations c
  JOIN explain_events e
    ON e.user_id = c.user_id AND e.reading_slug = c.reading_slug
  WHERE abs(strftime('%s', e.created_at) - strftime('%s', c.created_at)) <= 10
) AS m
WHERE m.cid = conversations.id AND m.rn = 1 AND conversations.anchor_text IS NULL;
