import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

pg.types.setTypeParser(20, v => Number(v));        // BIGINT → number (ids and sums stay far below 2^53)
pg.types.setTypeParser(1082, v => v);              // DATE → "YYYY-MM-DD"

export function makePool(url){ return new pg.Pool({connectionString:url, max:10}); }

/* Database migrations are managed by Prisma Migrate (prisma/migrations, see prisma/schema.prisma).
   migrate() runs `prisma migrate deploy` for the database the pool points at.
   Databases created before Prisma (they have the old schema_migrations table) are adopted first:
   the migrations they already ran are marked as applied, so nothing runs twice. */
const API_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OLD_TO_PRISMA = {"001_init.sql":"0001_init", "002_v1.sql":"0002_v1"};
function prisma(args, url){
  const cli = createRequire(import.meta.url).resolve("prisma/build/index.js");
  return execFileSync(process.execPath, [cli, ...args], {cwd:API_DIR, env:{...process.env, DATABASE_URL:url, PRISMA_HIDE_UPDATE_MESSAGE:"1", CHECKPOINT_DISABLE:"1"}, encoding:"utf8", stdio:["ignore", "pipe", "pipe"]});
}
export async function migrate(pool, log = console){
  const url = pool.options.connectionString;
  await pool.query("SELECT 1");   // fail fast (and let the caller retry) while the database is still starting
  const has = async t => (await pool.query("SELECT to_regclass($1) AS t", [t])).rows[0].t !== null;
  if (await has("public.schema_migrations") && !(await has("public._prisma_migrations"))){
    const old = (await pool.query("SELECT name FROM schema_migrations ORDER BY name")).rows.map(r => r.name);
    for (const f of old) if (OLD_TO_PRISMA[f]){ prisma(["migrate", "resolve", "--applied", OLD_TO_PRISMA[f]], url); log.info(`migration adopted by Prisma: ${OLD_TO_PRISMA[f]}`); }
  }
  const out = prisma(["migrate", "deploy"], url);
  if (!/No pending migrations/.test(out)) log.info(`database migrations: ${out.split("\n").filter(l => /Applying migration|successfully applied/.test(l)).map(l => l.trim()).join(" · ")}`);
}

/* run fn(client) inside a transaction */
export async function tx(pool, fn){
  const client = await pool.connect();
  try { await client.query("BEGIN"); const r = await fn(client); await client.query("COMMIT"); return r; }
  catch (e){ await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
}
