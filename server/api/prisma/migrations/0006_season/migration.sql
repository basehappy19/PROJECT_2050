-- Project Zero 1.8 · weekly missions and the gem season pass (rewards claimed once per player)
CREATE TABLE IF NOT EXISTS weekly_claims (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week       TEXT NOT NULL,
  mission    TEXT NOT NULL,
  terra      INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week, mission)
);
CREATE TABLE IF NOT EXISTS season_claims (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season     TEXT NOT NULL,
  tier       INT NOT NULL,
  reward     TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season, tier)
);
CREATE INDEX IF NOT EXISTS game_results_user_finished ON game_results(user_id, finished_at);
