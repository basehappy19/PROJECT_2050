// Admin: set a new password for a player (there is no self-service reset).
//   docker compose exec api node scripts/reset-password.js <username-or-email> <new-password>
import { config } from "../src/config.js";
import { makePool } from "../src/db.js";
import { hashPassword } from "../src/auth.js";
const [login, pw] = process.argv.slice(2);
if (!login || !pw || pw.length < 8){ console.log("usage: node scripts/reset-password.js <username-or-email> <new-password (8+ chars)>"); process.exit(1); }
const pool = makePool(config.databaseUrl);
const r = await pool.query("UPDATE users SET password_hash = $1 WHERE username = $2 OR email = $2 RETURNING username", [await hashPassword(pw), login.toLowerCase()]);
if (r.rowCount){ await pool.query("DELETE FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE username = $1)", [r.rows[0].username]); console.log(`password changed for ${r.rows[0].username}; they are signed out everywhere`); }
else console.log("no such player");
await pool.end();
