import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

pg.types.setTypeParser(20, v => Number(v));        // BIGINT → number (ids and sums stay far below 2^53)
pg.types.setTypeParser(1082, v => v);              // DATE → "YYYY-MM-DD"

export function makePool(url){ return new pg.Pool({connectionString:url, max:10}); }

/* run every migrations/*.sql file once, in name order */
export async function migrate(pool, log = console){
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
  await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  const done = new Set((await pool.query("SELECT name FROM schema_migrations")).rows.map(r => r.name));
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort()){
    if (done.has(f)) continue;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
      await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [f]);
      await client.query("COMMIT");
      log.info(`migration applied: ${f}`);
    } catch (e){ await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }
  }
}

/* run fn(client) inside a transaction */
export async function tx(pool, fn){
  const client = await pool.connect();
  try { await client.query("BEGIN"); const r = await fn(client); await client.query("COMMIT"); return r; }
  catch (e){ await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}
