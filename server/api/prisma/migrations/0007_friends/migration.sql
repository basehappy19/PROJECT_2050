-- Project Zero 2.0 · friends (for multiplayer invites)
-- A request from A to B is the row (A, B, 'pending'). Accepting it makes (A, B) and (B, A) both 'accepted'.
CREATE TABLE IF NOT EXISTS friendships (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);
CREATE INDEX IF NOT EXISTS friendships_friend ON friendships(friend_id);
-- finished multiplayer games (for the statistics page; no gems are paid for them)
CREATE TABLE IF NOT EXISTS mp_games (
  id          BIGSERIAL PRIMARY KEY,
  mode        TEXT NOT NULL,                       -- coop · versus
  players     JSONB NOT NULL DEFAULT '[]',         -- [{id, username, role|bloc, result}]
  ending      TEXT,
  tick        INT,
  started_at  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ(6)
);
