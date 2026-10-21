/* npm start: runs every Project Zero service from one command (ports from .env).
     API      → API_PORT   (Node.js + Fastify, server/api; runs database migrations itself on start)
     game     → WEB_PORT   (the built game + /admin/; /api and /verify are forwarded to the API,
                            so a reverse proxy only needs this one port)
     admin    → ADMIN_PORT (optional: the admin page on its own port, also forwards /api)
   Put your own Nginx in front for the domain and HTTPS. Stops everything if one service stops,
   so systemd / pm2 can restart the lot. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { spawn } from "node:child_process";
import { ROOT, loadEnv, num } from "./env.mjs";

const e = loadEnv();
const HOST = e.HOST || "127.0.0.1";
const WEB_PORT = num(e.WEB_PORT, 8080), API_PORT = num(e.API_PORT, 3000), ADMIN_PORT = num(e.ADMIN_PORT, 0);
const ADMIN_DIR = path.join(ROOT, "server/admin");
const log = (who, msg) => console.log(`${new Date().toLocaleTimeString("en-GB", {hour12:false})} [${who}] ${msg}`);

if (!fs.existsSync(path.join(ROOT, "index.html")) || !fs.readdirSync(path.join(ROOT, "assets")).some(f => /^app-.*\.js$/.test(f))){
  console.error("The game is not built yet: run `npm run build` first."); process.exit(1);
}
if (!e.JWT_SECRET || e.JWT_SECRET.length < 32){ console.error("Set JWT_SECRET in .env (32+ characters, e.g. `openssl rand -hex 32`)."); process.exit(1); }

/* ---------- API ---------- */
const children = [];
function runApi(){
  const env = {...process.env, NODE_ENV:e.NODE_ENV || "production", PORT:String(API_PORT), HOST, TZ:e.TZ || "Asia/Bangkok"};
  const p = spawn(process.execPath, ["src/index.js"], {cwd:path.join(ROOT, "server/api"), env, stdio:["ignore", "pipe", "pipe"]});
  const out = s => s.toString().split("\n").filter(Boolean).forEach(l => { let m = l; try { const j = JSON.parse(l); m = `${j.msg}${j.req ? ` ${j.req.method} ${j.req.url}` : ""}${j.res ? ` → ${j.res.statusCode}` : ""}${j.err ? ` ${j.err.message}` : ""}`; if (j.msg === "incoming request" || (j.msg === "request completed" && j.res && j.res.statusCode < 400)) return; } catch {} log("api", m); });
  p.stdout.on("data", out); p.stderr.on("data", out);
  p.on("exit", code => { log("api", `stopped (code ${code})`); shutdown(code || 1); });
  children.push(p);
}

/* ---------- static files + forwarding ---------- */
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json", ".webmanifest":"application/manifest+json",
  ".jpg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".svg":"image/svg+xml", ".mp3":"audio/mpeg", ".woff2":"font/woff2", ".txt":"text/plain; charset=utf-8"};
const ROOT_FILES = new Set(["index.html", "sw.js", "site.webmanifest", "favicon.svg", "apple-touch-icon.png", "icon-16.png", "icon-32.png", "icon-192.png", "icon-512.png", "og-image.png"]);
/* only game files are served; the rest of the project folder (code, .env) is never reachable */
function resolveFile(urlPath, adminOnly){
  let p; try { p = decodeURIComponent(urlPath.split("?")[0]); } catch { return null; }
  if (p.includes("\0") || p.includes("\\") || p.split("/").includes("..")) return null;
  if (p === "/admin") return {redirect:"/admin/"};
  if (adminOnly && (p.startsWith("/assets/") || p === "/favicon.svg")) return resolveFile(urlPath, false);   // fonts, logo and pictures for the admin page
  if (p.startsWith("/admin/") || adminOnly){
    const rel = adminOnly ? p.replace(/^\/(admin\/)?/, "") : p.slice(7);
    return {file:path.join(ADMIN_DIR, rel || "index.html"), cache:"no-cache"};
  }
  if (p === "/") return {file:path.join(ROOT, "index.html"), cache:"no-cache"};
  const rel = p.slice(1);
  if (ROOT_FILES.has(rel)) return {file:path.join(ROOT, rel), cache:/^(index\.html|sw\.js)$/.test(rel) ? "no-cache" : "public, max-age=86400"};
  if (rel.startsWith("assets/")) return {file:path.join(ROOT, rel), cache:/^assets\/app-[0-9a-f]+\.(js|css)$/.test(rel) ? "public, max-age=31536000, immutable" : "public, max-age=86400"};
  return null;
}
function forward(req, res){
  const up = http.request({host:/^(0\.0\.0\.0|::)$/.test(HOST) ? "127.0.0.1" : HOST, port:API_PORT, path:req.url, method:req.method,
    headers:{...req.headers, "x-forwarded-for":[req.headers["x-forwarded-for"], req.socket.remoteAddress].filter(Boolean).join(", "), "x-forwarded-proto":req.headers["x-forwarded-proto"] || "http"}}, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on("error", () => { if (!res.headersSent) res.writeHead(502, {"Content-Type":"application/json"}); res.end('{"error":"api_unavailable"}'); });
  req.pipe(up);
}
function staticServer(name, port, adminOnly){
  const srv = http.createServer((req, res) => {
    if (/^\/(api|verify)\//.test(req.url)) return forward(req, res);
    if (req.method !== "GET" && req.method !== "HEAD"){ res.writeHead(405); return res.end(); }
    const hit = resolveFile(req.url, adminOnly);
    if (hit && hit.redirect){ res.writeHead(301, {Location:hit.redirect}); return res.end(); }
    if (!hit || !fs.existsSync(hit.file) || !fs.statSync(hit.file).isFile()){ res.writeHead(404, {"Content-Type":"text/plain"}); return res.end("not found"); }
    const ext = path.extname(hit.file), type = TYPES[ext] || "application/octet-stream";
    const headers = {"Content-Type":type, "Cache-Control":hit.cache, "X-Content-Type-Options":"nosniff"};
    if (hit.file.startsWith(ADMIN_DIR)) headers["X-Robots-Tag"] = "noindex";
    const gz = /text|javascript|json|svg|manifest/.test(type) && /\bgzip\b/.test(req.headers["accept-encoding"] || "");
    if (gz){ headers["Content-Encoding"] = "gzip"; headers["Vary"] = "Accept-Encoding"; }
    res.writeHead(200, headers);
    if (req.method === "HEAD") return res.end();
    const s = fs.createReadStream(hit.file); (gz ? s.pipe(zlib.createGzip()) : s).pipe(res);
  });
  srv.on("error", err => { log(name, `cannot listen on ${HOST}:${port}: ${err.message}`); shutdown(1); });
  srv.listen(port, HOST, () => log(name, `http://${HOST}:${port}${adminOnly ? "/" : "/  (admin: /admin/)"}`));
  return srv;
}

let stopping = false;
const servers = [];
function shutdown(code = 0){
  if (stopping) return; stopping = true;
  servers.forEach(s => s.close()); children.forEach(c => { if (c.exitCode === null) c.kill("SIGTERM"); });
  setTimeout(() => process.exit(code), 1500).unref();
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => shutdown(0));

log("start", `Project Zero · game ${WEB_PORT} · api ${API_PORT}${ADMIN_PORT ? ` · admin ${ADMIN_PORT}` : ""} · listening on ${HOST}`);
runApi();
servers.push(staticServer("game", WEB_PORT, false));
if (ADMIN_PORT) servers.push(staticServer("admin", ADMIN_PORT, true));
