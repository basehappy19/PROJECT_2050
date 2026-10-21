/* Screenshot one game situation: node tools/scene.mjs <out.png> [w] [h] [dpr] [js run after the game starts] [wait ms] [clip x,y,w,h]
   Example: node tools/scene.mjs /tmp/a.png 1600 900 1 "P.Game.openSkills()" */
import {chromium} from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const [out, W = 1600, H = 900, DPR = 1, JS = "", WAIT = 1500, CLIP = ""] = process.argv.slice(2);
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".jpg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".svg":"image/svg+xml", ".mp3":"audio/mpeg", ".woff2":"font/woff2"};
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, {"Content-Type":TYPES[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(res);
}).listen(0);
const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium", args:["--disable-accelerated-2d-canvas", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]});
const page = await browser.newPage({viewport:{width:+W, height:+H}, deviceScaleFactor:+DPR, hasTouch:+W < 800, isMobile:+W < 800});
page.on("pageerror", e => console.log("pageerror", e.message));
page.on("console", m => { if (m.type() === "error" && !/api|Failed to load resource/.test(m.text())) console.log("console", m.text()); });
await page.goto(`http://localhost:${srv.address().port}/index.html`);
await page.evaluate(() => { localStorage.setItem("p2050-tut", "1"); localStorage.setItem("p2050-gfx", "low"); });
await page.reload();
await page.waitForSelector(".loading .enter", {timeout:90000});
await page.click(".loading .enter"); await page.waitForTimeout(1200);
if (!/^MENU/.test(JS)){
  await page.evaluate(() => window.P2050.Game.newGame()); await page.waitForSelector(".charsel", {timeout:60000});
  await page.evaluate(() => { const P = window.P2050; P.Game.startGame("sci", "normal"); P.UIM.modal = null; P.setSpeed(0); P.UIM.toastQ.length = 0; });
  await page.addStyleTag({content:".toast{display:none !important}"});
  await page.waitForTimeout(1500);
}
if (JS) await page.evaluate(js => { const P = window.P2050, S = P.S; return eval(js.replace(/^MENU;?/, "")); }, JS);
await page.waitForTimeout(+WAIT);
const clip = CLIP ? (([x, y, w, h]) => ({x, y, width:w, height:h}))(CLIP.split(",").map(Number)) : undefined;
await page.screenshot({path:out, clip});
await browser.close(); srv.close();
