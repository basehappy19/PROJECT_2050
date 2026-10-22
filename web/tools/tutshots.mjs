/* Makes the "How to play" pictures from the real web build: assets/img/tut/n01…n10.jpg (1.7)
   Usage (after node build.mjs --open): node tools/tutshots.mjs */
import {chromium} from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../.."), OUT = path.join(HERE, "../../assets/img/tut");
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".jpg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".svg":"image/svg+xml", ".mp3":"audio/mpeg", ".woff2":"font/woff2"};
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  if (p.startsWith("/api/")){ res.writeHead(404); return res.end(); }
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, {"Content-Type":TYPES[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(res);
}).listen(0);
const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium", args:["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]});
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
    Object.assign(d.style, {position:"fixed", left:r.left - 6 + "px", top:r.top - 6 + "px", width:r.width + 12 + "px", height:r.height + 12 + "px", borderRadius:"14px", border:"2.5px solid #f2c14e", boxShadow:"0 0 24px rgba(242,193,78,.55)", zIndex:99, pointerEvents:"none"});
    document.body.appendChild(d);
  }
  if (sels.length){ const v = document.createElement("div"); v.className = "tut-spot"; Object.assign(v.style, {position:"fixed", inset:0, background:"rgba(2,6,9,.35)", zIndex:98, pointerEvents:"none"}); document.body.appendChild(v); }
}, sels);
const shot = async (name, sels = [], wait = 900) => { await page.waitForTimeout(wait); await spot(sels); await idle(); await idle(); await page.screenshot({path:path.join(OUT, name), type:"jpeg", quality:84}); await spot([]); console.log("tut", name); };

await page.goto(`http://localhost:${srv.address().port}/index.html`);
await ev(() => { localStorage.setItem("p2050-tut", "1"); });
await page.goto(`http://localhost:${srv.address().port}/index.html`);
await page.waitForSelector(".loading .enter", {timeout:90000});
await page.click(".loading .enter"); await page.waitForTimeout(2500);
await ev(() => { const P = window.P2050; P.Game.newGame(); });
await page.waitForSelector(".charsel", {timeout:60000});
await ev(() => { const P = window.P2050; P.Game.startGame("sci", "normal"); P.UIM.modal = null; });
await page.waitForTimeout(1500);
await page.addStyleTag({content:".toast{display:none !important}"});
// play a few years so the world has some history
await ev(() => { const P = window.P2050, S = P.S; S.ep = 900; S.pc = 260; P.unlockOre(); Object.keys(S.mat).forEach(g => S.mat[g] = 120);
  for (let i = 0; i < 52; i++){ S.event = null; P.tick(); if (P.UIM.modal === "story") P.UIM.modal = null; for (const id of ["P1", "E1", "N1", "E2", "I2", "C1"]) if (!S.owned[id] && P.canAfford(P.SKILL[id])) P.buyNode(id); }
  S.event = null; S.cev = null; S.ep = 340; S.pc = 95; P.UIM.modal = null; P.Map.resetView(); P.setSpeed(1); P.changed(); });
await page.waitForTimeout(2500);
await ev(() => { const P = window.P2050; P.setSpeed(0); });
await shot("n01-goal.jpg", [], 1500);
await shot("n02-meters.jpg", [".meters"]);
await shot("n03-top.jpg", [".kpis", ".abar"]);
// country panel with a sanction badge on the map
await ev(() => { const P = window.P2050, S = P.S; S.sanct = {MMR:5}; S.oreBan = {MMR:5}; P.C("THA").rel = 46; P.C("VNM").rel = 44; P.Game.selectRegion("SEA", true); P.Game.selectCountry("THA"); });
await shot("n04-map.jpg", [".drawer"], 2600);
await ev(() => { const P = window.P2050, S = P.S; P.Game.closeTab(); S.sanct = {}; S.oreBan = {}; S.haz = [{id:901, type:"typhoon", c:"PHL", at:S.tick + 3, sev:1, evac:false}];
  S.bubbles = [{id:902, type:"red", reg:"SEA", cid:"VNM", ttl:5}, {id:903, type:"green", reg:"SEA", lat:13.75, lon:100.5, ttl:4}, {id:904, type:"ore", reg:"SEA", cid:"IDN", ttl:4}];
  P.setSpeed(1); P.Map.focus("SEA", true); P.changed(); });
await page.waitForTimeout(2500);
await ev(() => { window.P2050.setSpeed(0); });
await ev(() => { window.P2050.S.speed = 1; window.P2050._bump(); });   // show the bubbles bright (time running)
await shot("n05-bubbles.jpg", [], 1200);
await ev(() => { const P = window.P2050, S = P.S; S.speed = 0; S.haz = []; S.bubbles = []; S.skillCat = "energy"; S.node = "E3"; P.Game.openSkills(); });
await shot("n06-skills.jpg", [], 1500);
await ev(() => { const P = window.P2050, S = P.S; P.Game.closeSkills(); S.raw.bat = 18; S.raw.cu = 7; P.UIM.modal = "market"; P._bump(); });
await shot("n07-market.jpg", [], 1500);
await ev(() => { const P = window.P2050; P.UIM.modal = null; P.Map.resetView(); const e = P.EVENTS.find(x => x.id === "EVT_47") || P.EVENTS[3]; P.S.event = e.id; P.S.cev = null; P.H.showEvent(); P.UIM.evAt = performance.now() - 5000; P._bump(); });
await shot("n08-event.jpg", [], 2500);
await ev(() => { const P = window.P2050, S = P.S; S.event = null; P.Game.showStory("s_fon"); P.UIM.storyI = 2; P._bump(); });
await shot("n09-story.jpg", [], 6000);
await ev(() => { const P = window.P2050, S = P.S; P.UIM.modal = null; S.regions.forEach(r => r.co2 = 0.05); S.sink = 4; S.temp = 1.55; P.checkEnd(); P.UIM.reward = {guest:true, xp:150}; P._bump(); });
await shot("n10-win.jpg", [], 3000);
await browser.close(); srv.close();
