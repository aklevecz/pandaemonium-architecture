-- Bookmarks were storing only a 0-1 scroll ratio (scrollY / docHeight). That
-- breaks across devices because docHeight changes with viewport width (line
-- wrap, image sizing, padding all differ), so the same ratio scrolls you to
-- a different paragraph on phone vs desktop. Add a text anchor: the first
-- ~80 chars of the topmost visible paragraph at bookmark time. On resume we
-- find that text in the prose and scroll to it, falling back to the ratio
-- if the text can't be located (e.g., reading content edited).
ALTER TABLE bookmarks ADD COLUMN text_anchor TEXT;
