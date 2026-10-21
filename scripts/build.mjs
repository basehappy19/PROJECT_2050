/* npm run build: builds the web game into the repo root (index.html, sw.js, assets/app-*.js|css).
   GAME_DOMAINS in .env locks the game to those domains. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { ROOT, loadEnv } from "./env.mjs";
const e = loadEnv();
const env = {...process.env, P2050_DOMAINS:e.GAME_DOMAINS || ""};
console.log(`[build] web game${e.GAME_DOMAINS ? ` (locked to ${e.GAME_DOMAINS})` : ""}`);
const r = spawnSync(process.execPath, ["build.mjs", ...process.argv.slice(2)], {cwd:path.join(ROOT, "web"), env, stdio:"inherit"});
process.exit(r.status ?? 1);
