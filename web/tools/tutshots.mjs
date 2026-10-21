/* Makes the "How to play" pictures from the real web build: public/img/tut/t1…t8.jpg
   Usage (after node build.mjs): node tools/tutshots.mjs */
import {chromium} from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../.."), OUT = path.join(HERE, "../../assets/img/tut");
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".jpg":"image/jpeg", ".png":"image/png", ".mp3":"audio/mpeg", ".woff2":"font/woff2"};
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, {"Content-Type":TYPES[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(res);
}).listen(0);
const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium", args:["--disable-accelerated-2d-canvas", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]});
const page = await browser.newPage({viewport:{width:1600, height:840}, deviceScaleFactor:1});
page.on("pageerror", e => console.log("pageerror", e.message));
const ev = (fn, a) => page.evaluate(fn, a);
const idle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 80)))));
/* dim everything except the given CSS selectors */
const spot = sels => ev(sels => {
  document.querySelectorAll(".tut-spot").forEach(e => e.remove());
  for (const s of sels){
    const el = document.querySelector(s); if (!el) continue;
    const r = el.getBoundingClientRect(), d = document.createElement("div"); d.className = "tut-spot";
    Object.assign(d.style, {position:"fixed", left:r.left - 6 + "px", top:r.top - 6 + "px", width:r.width + 12 + "px", height:r.height + 12 + "px", borderRadius:"14px", border:"2.5px solid #f2c14e", boxShadow:"0 0 24px rgba(242,193,78,.7)", zIndex:99, pointerEvents:"none"});
    document.body.appendChild(d);
  }
  if (sels.length){ const v = document.createElement("div"); v.className = "tut-spot"; Object.assign(v.style, {position:"fixed", inset:0, background:"rgba(2,6,9,.35)", zIndex:98, pointerEvents:"none"}); document.body.appendChild(v); }
}, sels);
const shot = async (name, sels = []) => { await page.waitForTimeout(700); await spot(sels); await idle(); await idle(); await page.screenshot({path:path.join(OUT, name), type:"jpeg", quality:84}); await spot([]); console.log("shot", name); };

await page.goto(`http://localhost:${srv.address().port}/index.html`);
await ev(() => { localStorage.setItem("p2050-tut", "1"); });
await page.waitForSelector(".loading .enter", {timeout:90000});
await page.click(".loading .enter"); await page.waitForTimeout(2500);
await ev(() => { const P = window.P2050; P.Game.newGame(); });
await page.waitForSelector(".charsel", {timeout:60000});
await ev(() => { const P = window.P2050; P.Game.startGame("sci", "normal"); P.UIM.modal = null; });
await page.waitForTimeout(1500);
// play a little so the world has some history
await ev(() => { const P = window.P2050, S = P.S; S.ep = 260; S.pc = 70; for (let i = 0; i < 40; i++){ S.event = null; P.tick(); } S.event = null; S.cev = null; P.UIM.modal = null; P.buyNode("E1"); P.buyNode("N1"); P.Game.setSpeed(0); P.Map.resetView(); P.changed(); });
await page.waitForTimeout(1800);
await page.addStyleTag({content:".toast{display:none !important}"});
await shot("t1-goal.jpg");
await shot("t2-meters.jpg", [".meters"]);
await shot("t3-resources.jpg", [".kpis", ".abar"]);
await ev(() => { const P = window.P2050; P.Game.selectCountry("THA"); });
await page.waitForTimeout(1800);
await shot("t4-regions.jpg", [".drawer"]);
await ev(() => { const P = window.P2050, S = P.S; P.Game.closeTab(); S.haz = [{id:901, type:"typhoon", c:"PHL", at:S.tick + 3, sev:1, evac:false}]; S.bubbles.push({id:902, type:"red", reg:"SEA", cid:"VNM", ttl:5}); S.bubbles.push({id:903, type:"green", reg:"SEA", lat:13.75, lon:100.5, ttl:4}); P.Map.focus("SEA", true); P.changed(); });
await page.waitForTimeout(2200);
await shot("t5-bubbles.jpg");
await ev(() => { const P = window.P2050, S = P.S; S.haz = []; S.bubbles = []; P.Game.openSkills(); });
await page.waitForTimeout(900);
await shot("t6-tree.jpg");
// minerals + builds: zoom on a region with pins, open a mineral country
await ev(() => { const P = window.P2050, S = P.S; P.Game.closeSkills(); S.ep = 400; S.pc = 120; S.ore = 30; ["E2", "E3", "N2", "R1"].forEach(id => { try { P.buyNode(id); } catch (e){} }); S.pins.forEach(p => p.done = true); S.bubbles.push({id:910, type:"ore", reg:"SA", cid:"CHL", lat:-24, lon:-69, ttl:5}); P.Game.selectCountry("CHL"); P.changed(); });
await page.waitForTimeout(2200);
await shot("t9-minerals.jpg", [".drawer .reslist", ".kpi.ore"]);
await ev(() => { const P = window.P2050; P.Game.closeTab(); P.Map.resetView(); P.changed(); });
await page.waitForTimeout(12000);   // let planes and ships fill the routes
await shot("t10-traffic.jpg");
await ev(() => { const P = window.P2050; P.Map.resetView(); const ev = P.EVENTS.find(e => e.id === "EVT_47") || P.EVENTS[3]; P.S.used = []; P.S.event = ev.id; P.S.cev = null; P.H.showEvent(); P.UIM.evAt = performance.now() - 5000; P.changed(); });
await page.waitForTimeout(1500);
await shot("t7-event.jpg");
await ev(() => { const P = window.P2050, S = P.S; S.event = null; S.regions.forEach(r => r.co2 = 0.05); S.sink = 4; S.temp = 1.55; P.checkEnd(); });
await page.waitForTimeout(2500);
await shot("t8-win.jpg");
await browser.close(); srv.close();
