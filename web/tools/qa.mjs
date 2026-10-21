/* Scripted screenshots for checking UI changes. Usage: node tools/qa.mjs <steps.mjs> [outDir] [w] [h]
   steps.mjs default-exports async ({page, ev, shot, start}) => {…}; start(lang?) opens the game past the menu with a fresh game. */
import {chromium} from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const STEPS = path.resolve(process.argv[2]), OUT = process.argv[3] || "/tmp/qa", W = +(process.argv[4] || 1440), H = +(process.argv[5] || 860);
fs.mkdirSync(OUT, {recursive:true});
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".jpg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".svg":"image/svg+xml", ".mp3":"audio/mpeg", ".woff2":"font/woff2"};
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  if (p.startsWith("/api/")){ res.writeHead(404); return res.end(); }
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, {"Content-Type":TYPES[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(res);
}).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium", args:["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"]});
const page = await browser.newPage({viewport:{width:W, height:H}, deviceScaleFactor:1, hasTouch:W < 800, isMobile:W < 800});
const errs = [];
page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", e => errs.push("pageerror: " + e.message));
const idle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50)))));
const shot = async (n, opt = {}) => { await page.waitForTimeout(opt.wait ?? 500); await idle(); await page.screenshot({path:`${OUT}/${n}.png`, timeout:90000, ...(opt.clip ? {clip:opt.clip} : {})}); console.log("shot", n); };
const ev = (fn, ...a) => page.evaluate(fn, ...a);
async function start(o = {}){
  await page.goto(`http://localhost:${port}/index.html${o.q || ""}`);
  if (o.ls) await ev(ls => { for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); }, o.ls), await page.goto(`http://localhost:${port}/index.html${o.q || ""}`);
  await page.waitForSelector(".loading .enter", {timeout:60000});
  await page.click(".loading .enter"); await page.waitForTimeout(2500);
  if (o.menu) return;
  await ev(() => { localStorage.setItem("p2050-tut", "1"); });
  await page.click(".bigbtn"); await page.waitForTimeout(2600);
  await page.click(".charsel .mfoot .btn-lg"); await page.waitForTimeout(1200);
  await ev(() => { const P = window.P2050; P.UIM.modal = null; P.setSpeed(0); P.UIM.toastQ.length = 0; P._bump(); });
  await page.addStyleTag({content:".toast{display:none !important}"});
  await page.waitForTimeout(600);
}
const steps = (await import(pathToFileURL(STEPS).href)).default;
try { await steps({page, ev, shot, start, W, H}); } catch(e){ console.error("STEP FAILED", e); }
console.log("errors:", errs.length); errs.slice(0, 20).forEach(e => console.log(" ", e));
await browser.close(); srv.close();
