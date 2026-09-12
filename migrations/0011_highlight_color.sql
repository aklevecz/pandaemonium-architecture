-- Per-highlight colour. Existing rows backfill to 'yellow', which is what the
-- reader painted every highlight before the palette existed, so nothing
-- changes visually for highlights saved prior to this migration.
ALTER TABLE highlights ADD COLUMN color TEXT NOT NULL DEFAULT 'yellow';
