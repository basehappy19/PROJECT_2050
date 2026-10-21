-- Project : 2050 · database schema v2 (game version 1.0)
-- · players can be given a role (player · tester · admin) and special settings (flags)
-- · game settings that can be changed online without updating the game (game_config)
-- · every change an admin makes is written down (admin_log)
-- · play statistics for the A/B balance test, for guests too (play_stats)

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player';          -- player · tester · admin
ALTER TABLE users ADD COLUMN IF NOT EXISTS flags JSONB NOT NULL DEFAULT '{}'::jsonb;      -- {certOverride, abGroup, …}
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE game_results ADD COLUMN IF NOT EXISTS ab TEXT;                -- balance preset the game used (A, B, …)
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS world BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS last_tick INTEGER;      -- last month reported while playing (to see where people stop)

CREATE TABLE IF NOT EXISTS game_config (
  key         TEXT PRIMARY KEY,                     -- balance · announcement · disabledEvents · prices · certMinCards
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  BIGINT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO game_config(key, value) VALUES
  ('balance', '{"presets":{"A":{"inc":1.22,"cost":0.88,"haz":1,"growth":1},"B":{"inc":1.2,"cost":0.9,"haz":1,"growth":1}},"weights":{"A":50,"B":50}}'::jsonb),
  ('announcement', '{"th":"","en":""}'::jsonb),
  ('disabledEvents', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_log (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  target_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                        -- gems · items · xp · flags · role · ban · reset · config
  detail      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_log_time ON admin_log(created_at DESC);

CREATE TABLE IF NOT EXISTS play_stats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,   -- NULL = guest
  ab          TEXT NOT NULL DEFAULT 'A',
  mode        TEXT NOT NULL DEFAULT 'normal',
  world       BOOLEAN NOT NULL DEFAULT FALSE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_tick   INTEGER NOT NULL DEFAULT 0,
  ending      TEXT,                                 -- win · l1 · l2 · l3 · NULL while playing / left
  temp        REAL, net REAL, appr REAL, real_sec INTEGER, skills INTEGER, ore_used INTEGER
);
CREATE INDEX IF NOT EXISTS play_stats_ab ON play_stats(ab, started_at);
