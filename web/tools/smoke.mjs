/* Release smoke test (works on the protected build — uses only clicks, never window.P2050):
   loads the game, starts a mission, plays ~25 s at top speed answering whatever pops up, and reports
   page errors, whether the game object leaks onto window, and main-thread time.  Usage: node tools/smoke.mjs [w] [h] */
import {chromium} from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const W = +(process.argv[2] || 1600), H = +(process.argv[3] || 900);
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".jpg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".svg":"image/svg+xml", ".mp3":"audio/mpeg", ".woff2":"font/woff2"};
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, {"Content-Type":TYPES[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(res);
}).listen(0);
const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium", args:["--disable-accelerated-2d-canvas", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]});
const page = await browser.newPage({viewport:{width:W, height:H}, hasTouch:W < 800, isMobile:W < 800});
const errors = [];
page.on("pageerror", e => errors.push(e.message));
await page.goto(`http://localhost:${srv.address().port}/index.html`);
await page.evaluate(() => { localStorage.setItem("p2050-tut", "1"); localStorage.setItem("p2050-gfx", "medium"); });
await page.reload();
await page.waitForSelector(".loading .enter", {timeout:90000});
await page.click(".loading .enter"); await page.waitForTimeout(1200);
await page.click(".bigbtn.primary"); await page.waitForSelector(".charsel", {timeout:60000});
await page.click(".charsel .mfoot .btn:last-child");
const cdp = await page.context().newCDPSession(page); await cdp.send("Performance.enable");
const met = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(m => [m.name, m.value]));
let m0 = null, clicks = 0;
const t0 = Date.now();
while (Date.now() - t0 < 30000){
  // answer anything that is open: story / event / news / tutorial → press its main button or first option
  const did = await page.evaluate(() => {
    const m = document.querySelector(".modal-wrap .modal, .modal");
    if (!m) return 0;
    const b = m.querySelector(".opt:not([disabled]), .mfoot .btn:last-child, .btns .btn:last-child, .btn.primary");
    if (b){ b.click(); return 1; } return 0;
  });
  clicks += did;
  if (!m0 && Date.now() - t0 > 5000){
    await page.evaluate(() => { const f = document.querySelector('.speed button:last-child, [data-speed="3"]'); if (f) f.click(); });
    m0 = await met();
  }
  await page.waitForTimeout(400);
}
const m1 = await met();
if (process.env.SHOT) await page.screenshot({path:process.env.SHOT});
if (process.env.DBG) console.log(await page.evaluate(() => { const P = window.P2050; return P ? JSON.stringify({speed:P.S.speed, tick:P.S.tick, modal:P.UIM.modal, over:P.S.over, started:P.S.started, ph:P.UIM.phase, scr:P.UIM.screen, ev:P.S.event && P.S.event.id, paused:P.UIM.paused, blocking:P.UIM.blocking, rs:P.S.realSec}) : "-"; }));
const leak = await page.evaluate(() => typeof window.P2050);
const hud = await page.evaluate(() => (document.querySelector(".hud .date, .date") || {}).textContent || "");
console.log(JSON.stringify({errors, leak, clicks, hud, scriptMsPerSec:+((m1.ScriptDuration - m0.ScriptDuration) * 1000 / ((m1.Timestamp - m0.Timestamp))).toFixed(0), taskMsPerSec:+((m1.TaskDuration - m0.TaskDuration) * 1000 / ((m1.Timestamp - m0.Timestamp))).toFixed(0), heapMB:+(m1.JSHeapUsedSize / 1048576).toFixed(1)}));
await browser.close(); srv.close();
