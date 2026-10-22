-- Project Zero 1.1.6 · which game version each play came from (difficulty page in /admin compares versions)
ALTER TABLE play_stats ADD COLUMN IF NOT EXISTS ver TEXT;
CREATE INDEX IF NOT EXISTS play_stats_started ON play_stats(started_at);
