-- Project Zero · settings move to the admin page (game_config); the A/B balance preset is no longer an online setting
DELETE FROM game_config WHERE key = 'balance';
