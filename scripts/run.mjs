/* Helper for npm scripts that need .env: `node scripts/run.mjs api <command…>` runs a command in server/api,
   `node scripts/run.mjs studio` opens Prisma Studio on 127.0.0.1:STUDIO_PORT. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { ROOT, loadEnv, num } from "./env.mjs";
const e = loadEnv(), [what, ...args] = process.argv.slice(2), cwd = path.join(ROOT, "server/api");
let cmd = args;
if (what === "studio"){
  const port = num(e.STUDIO_PORT, 5555);
  console.log(`[studio] Prisma Studio on http://127.0.0.1:${port} (from another computer: ssh -L ${port}:localhost:${port} <server>)`);
  cmd = ["prisma", "studio", "--port", String(port), "--browser", "none"];
}
const bin = cmd[0] === "prisma" ? [process.execPath, [path.join(cwd, "node_modules/prisma/build/index.js"), ...cmd.slice(1)]] : [cmd[0] === "node" ? process.execPath : cmd[0], cmd.slice(1)];
const r = spawnSync(bin[0], bin[1], {cwd, env:process.env, stdio:"inherit"});
process.exit(r.status ?? 1);
