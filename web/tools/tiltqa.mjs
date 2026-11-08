/* 3.1 tilt check: zoom in, then click the screen point of several countries and see which one gets selected.
   node tools/tiltqa.mjs [w] [h]   (needs `node build.mjs --open`) */
import {chromium} from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const [W = 1600, H = 900] = process.argv.slice(2);
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".jpg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".svg":"image/svg+xml", ".woff2":"font/woff2"};
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html"; const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); } res.writeHead(200, {"Content-Type":TYPES[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(res); }).listen(0);
const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args:["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]});
const page = await browser.newPage({viewport:{width:+W, height:+H}, hasTouch:+W < 800, isMobile:+W < 800});
page.on("pageerror", e => console.log("pageerror", e.message));
await page.goto(`http://localhost:${srv.address().port}/index.html`);
await page.evaluate(() => { localStorage.setItem("p2050-tut", "1"); localStorage.setItem("p2050-trained", "1"); localStorage.setItem("p2050-gfx", "medium"); });
await page.reload(); await page.waitForSelector(".loading .enter", {timeout:90000}); await page.click(".loading .enter"); await page.waitForTimeout(1000);
await page.evaluate(() => window.P2050.Game.newGame(false)); await page.waitForSelector(".charsel", {timeout:60000});
await page.evaluate(() => { const P = window.P2050; P.Game.startGame("sci", "normal"); P.UIM.modal = null; P.setSpeed(0); P.UIM.toastQ.length = 0; });
await page.addStyleTag({content:".toast{display:none !important}"}); await page.waitForTimeout(2000);
let bad = 0;
for (const [zoomTo, ids] of [["CHN", ["JPN", "KOR", "MNG", "CHN", "VNM"]], ["DEU", ["FRA", "POL", "ITA", "GBR", "SWE"]], ["BRA", ["ARG", "PER", "COL", "BRA"]]]){
  const info = await page.evaluate(id => { const G = window.P2050.GameMap || null; return !!G; }, zoomTo);
  // zoom into the area like a player would: focus + 3 zoom steps
  await page.evaluate(id => { const P = window.P2050, M = P.GameMapRef; }, zoomTo);
  for (const id of ids){
    const pt = await page.evaluate(([z, id]) => {
      const P = window.P2050, M = P._map; if (!M) return null;
      M.focusCountry(z); M.cam = {...M.target}; M.target = null; M.cam.z = Math.max(M.cam.z, 3.2); M.clampCam(); M.applyTilt(); M.dirtyBase = true;
      const p = M.countryPoint(id); if (!p) return null; const [x, y] = M.toViewport(p[0], p[1]); const r = M.el.getBoundingClientRect();
      return {x:x + r.left, y:y + r.top, tilt:M.tilt, z:M.cam.z};
    }, [zoomTo, id]);
    if (!pt){ console.log("no point", id); continue; }
    await page.waitForTimeout(400);
    await page.evaluate(() => { const S = window.P2050.S; S.selC = null; window.P2050.UIM.modal = null; });
    await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(450);
    const got = await page.evaluate(() => window.P2050.S.selC);
    const ok = got === id; if (!ok) bad++;
    console.log(`${ok ? "OK " : "BAD"} click ${id} at (${pt.x.toFixed(0)},${pt.y.toFixed(0)}) tilt ${(pt.tilt * 180 / Math.PI).toFixed(1)}° z ${pt.z.toFixed(2)} → ${got}`);
  }
}
console.log(bad ? `${bad} wrong` : "all clicks hit the right country");
await browser.close(); srv.close();
