import { config } from "./config.js";
import { makePool, migrate } from "./db.js";
import { buildApp } from "./app.js";

const pool = makePool(config.databaseUrl);
/* the database container may still be starting: retry for ~60 s */
for (let i = 0; ; i++){
  try { await migrate(pool); break; }
  catch (e){ if (i >= 30) throw e; console.log("waiting for the database…", e.code || e.message); await new Promise(r => setTimeout(r, 2000)); }
}
const app = buildApp(pool);
await app.listen({port:config.port, host:"0.0.0.0"});
if (!config.googleClientId) app.log.info("Google sign-in is off (GOOGLE_CLIENT_ID is empty)");
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, async () => { await app.close(); await pool.end(); process.exit(0); });
