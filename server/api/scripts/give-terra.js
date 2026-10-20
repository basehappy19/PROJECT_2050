// Admin: add (or remove, with a negative number) Terra for a player, e.g. as a prize.
//   docker compose exec api node scripts/give-terra.js <username> <amount> [note]
import { config } from "../src/config.js";
import { makePool } from "../src/db.js";
const [username, amount, ...note] = process.argv.slice(2);
if (!username || !Number.isInteger(Number(amount))){ console.log("usage: node scripts/give-terra.js <username> <amount> [note]"); process.exit(1); }
const pool = makePool(config.databaseUrl);
const u = (await pool.query("SELECT id FROM users WHERE username = $1", [username.toLowerCase()])).rows[0];
if (!u) console.log("no such player");
else { await pool.query("INSERT INTO wallet_ledger(user_id, amount, reason, ref) VALUES ($1, $2, 'admin', $3)", [u.id, Number(amount), note.join(" ") || null]); console.log("done"); }
await pool.end();
