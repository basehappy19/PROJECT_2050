/* Reads the project's .env (repo root) into process.env; values already set in the environment win. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export function loadEnv(){
  const f = path.join(ROOT, ".env");
  if (!fs.existsSync(f)){ console.warn("[env] no .env found: copy .env.example to .env and edit it"); return process.env; }
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)){
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line); if (!m) continue;
    let v = m[2]; if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1); else v = v.replace(/\s+#.*$/, "");
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
  const e = process.env;
  if (!e.CORS_ORIGIN && e.PUBLIC_URL) e.CORS_ORIGIN = e.PUBLIC_URL;
  return e;
}
export const num = (v, d) => (v !== undefined && v !== "" && !isNaN(+v) ? +v : d);
