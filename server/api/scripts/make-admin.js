// Admin: give a player the admin role (or take it away with --remove). Usage: node scripts/make-admin.js <username> [--remove]
import { config } from "../src/config.js";
import { makePool, migrate } from "../src/db.js";
const [username, flag] = process.argv.slice(2);
if (!username){ console.log("usage: node scripts/make-admin.js <username> [--remove]"); process.exit(1); }
const pool = makePool(config.databaseUrl);
await migrate(pool, {info(){}});
const r = await pool.query("UPDATE users SET role = $2 WHERE username = $1 RETURNING id", [username.toLowerCase(), flag === "--remove" ? "player" : "admin"]);
console.log(r.rowCount ? `${username} is now ${flag === "--remove" ? "a player" : "an admin"}` : `no player called ${username}`);
await pool.end();
