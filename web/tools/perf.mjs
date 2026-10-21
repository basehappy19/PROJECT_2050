/* Map performance check: pans and zooms the in-game map and reports the time spent drawing.
   Usage (after node build.mjs): node tools/perf.mjs [w] [h] [dpr] [quality] */
import {chromium} from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const W = +(process.argv[2] || 1600), H = +(process.argv[3] || 900), DPR = +(process.argv[4] || 2), Q = process.argv[5] || "";
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".jpg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".svg":"image/svg+xml", ".mp3":"audio/mpeg", ".woff2":"font/woff2"};
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, {"Content-Type":TYPES[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(res);
}).listen(0);
const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium", args:[...(process.env.GPU ? [] : ["--disable-accelerated-2d-canvas"]), "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]});
const page = await browser.newPage({viewport:{width:W, height:H}, deviceScaleFactor:DPR});
page.on("pageerror", e => console.log("pageerror", e.message));
await page.goto(`http://localhost:${srv.address().port}/index.html`);
await page.evaluate(q => { localStorage.setItem("p2050-tut", "1"); if (q) localStorage.setItem("p2050-gfx", q); }, Q);
await page.reload();
await page.waitForSelector(".loading .enter", {timeout:90000});
await page.click(".loading .enter"); await page.waitForTimeout(1500);
await page.evaluate(() => { const P = window.P2050; P.Game.newGame(); });
await page.waitForSelector(".charsel", {timeout:60000});
await page.evaluate(() => { const P = window.P2050; P.Game.startGame("sci", "normal"); P.UIM.modal = null; P.setSpeed(0); });
if (process.env.CSS) await page.addStyleTag({content:process.env.CSS});
await page.waitForTimeout(4000);
const cdp = await page.context().newCDPSession(page); await cdp.send("Performance.enable");
const met = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(m => [m.name, m.value]));
const m0 = await met();
const res = await page.evaluate(async () => {
  const P = window.P2050, M = P.Map, S = P.S;
  for (let i = 0; i < 3; i++) S.bubbles.push({id:900 + i, type:i ? "green" : "red", reg:"EU", cid:i ? null : "FRA", lat:48 + i * 4, lon:2 + i * 10, ttl:4});
  const wrap = (obj, k, acc) => { const f = obj[k]; obj[k] = function(...a){ const t0 = performance.now(); const r = f.apply(this, a); acc.push(performance.now() - t0); return r; }; return () => { obj[k] = f; }; };
  const base = [], fx = [], frames = [];
  const u1 = wrap(M, "drawBase", base), u2 = wrap(M, "drawFx", fx);
  let last = performance.now();
  const t0 = performance.now();
  await new Promise(done => {
    const step = now => {
      frames.push(now - last); last = now;
      const t = (now - t0) / 1000;
      // pan in a circle and breathe the zoom, like a player dragging around
      M.target = null; M.cam.x = 1200 + Math.cos(t * 1.4) * 350; M.cam.y = 560 + Math.sin(t * 1.4) * 160; M.cam.z = 1.6 + Math.sin(t * .9) * .9; M.dirtyBase = true;
      if (t < 6) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  // then idle (nothing moving) for 3 s
  const idleBase = base.length, idleFx = fx.length, ti = performance.now();
  await new Promise(r => setTimeout(r, 3000));
  u1(); u2();
  const avg = a => a.length ? +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2) : 0;
  const p95 = a => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return +b[Math.floor(b.length * .95)].toFixed(2); };
  return {moving:{frames:frames.length, fps:+(frames.length / 6).toFixed(1), frameAvg:avg(frames.slice(2)), frameP95:p95(frames.slice(2)), base:avg(base.slice(0, idleBase)), baseP95:p95(base.slice(0, idleBase)), fx:avg(fx.slice(0, idleFx))},
    idle:{baseCalls:base.length - idleBase, fxCalls:fx.length - idleFx, fx:avg(fx.slice(idleFx))}, dpr:M.dpr, canvas:[M.base.width, M.base.height], quality:P.gfx ? P.gfx.level : "-"};
});
const m1 = await met(); const d = k => +((m1[k] - m0[k]) * 1000 / 9).toFixed(1);
res.mainThreadMsPerSec = {task:d("TaskDuration"), script:d("ScriptDuration"), layout:d("LayoutDuration"), style:d("RecalcStyleDuration")};
console.log(JSON.stringify(res, null, 1));
await browser.close(); srv.close();
