-- Project Zero · the player's learning progress / unlocks follow the account to every device
ALTER TABLE progress ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
