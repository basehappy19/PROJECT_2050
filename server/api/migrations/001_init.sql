-- Project : 2050 · database schema v1
-- Terra balance = SUM(wallet_ledger.amount) per user, so every change can be traced back.

CREATE TABLE IF NOT EXISTS users (
  id             BIGSERIAL PRIMARY KEY,
  username       TEXT NOT NULL UNIQUE,              -- a–z 0–9 _ (3–16), never changes
  email          TEXT UNIQUE,                       -- lower-case
  password_hash  TEXT,                              -- argon2id; NULL for Google-only accounts
  google_sub     TEXT UNIQUE,                       -- Google account id
  display_name   TEXT NOT NULL,
  renamed        BOOLEAN NOT NULL DEFAULT FALSE,    -- first display-name change is free
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,                 -- sha-256 of the token
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,                     -- + earned / − spent
  reason      TEXT NOT NULL,                        -- game · achievement · shop · rename · admin
  ref         TEXT,                                 -- run id, achievement id, item id …
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_user ON wallet_ledger(user_id);

CREATE TABLE IF NOT EXISTS owned_items (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item        TEXT NOT NULL,                        -- speed3 · char_dip · theme_night · outfit · frame …
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item)
);

CREATE TABLE IF NOT EXISTS character_progress (
  user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  char     TEXT NOT NULL,                           -- sci · dip · eco · act
  xp       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, char)
);

CREATE TABLE IF NOT EXISTS game_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode         TEXT NOT NULL,                       -- normal · hard · daily
  char         TEXT NOT NULL,
  seed         BIGINT,
  day          DATE NOT NULL,                       -- Bangkok date the run started (daily caps)
  daily_date   DATE,                                -- UTC date of the Daily Challenge
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ,
  ending       TEXT,                                -- win · l1 · l2 · l3
  tick         INTEGER, temp REAL, net REAL, appr REAL, rel REAL, skills INTEGER, real_sec INTEGER,
  score        INTEGER, terra INTEGER, xp INTEGER,
  flagged      BOOLEAN NOT NULL DEFAULT FALSE,      -- result looked impossible → no reward, no ranking
  note         TEXT
);
CREATE INDEX IF NOT EXISTS results_user_day ON game_results(user_id, day);
CREATE INDEX IF NOT EXISTS results_board ON game_results(mode, finished_at, score DESC) WHERE finished_at IS NOT NULL AND NOT flagged;

CREATE TABLE IF NOT EXISTS achievements (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ach         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ach)
);

CREATE TABLE IF NOT EXISTS progress (
  user_id     BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cards       INTEGER NOT NULL DEFAULT 0,           -- knowledge cards unlocked (reported by the game)
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cloud_saves (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot        TEXT NOT NULL,                        -- s1 · s2 · s3
  meta        JSONB NOT NULL,
  state       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE IF NOT EXISTS certificates (
  code        TEXT PRIMARY KEY,                     -- P2050-XXXX-XXXX
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,                        -- real name, typed when requesting
  grade       TEXT,                                 -- best Net Zero grade S/A/B
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS certificates_user ON certificates(user_id);
