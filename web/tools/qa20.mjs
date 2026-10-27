/* 2.0 checks in a real browser: node tools/qa20.mjs <outdir> [scenario …]
   Needs the readable build (node build.mjs --open). Scenarios: train · game · end · fast · phone */
import {chromium} from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const OUT = process.argv[2] || "/tmp/qa20"; fs.mkdirSync(OUT, {recursive:true});
const ONLY = process.argv.slice(3);
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".jpg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".svg":"image/svg+xml", ".mp3":"audio/mpeg", ".woff2":"font/woff2"};
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  if (p.startsWith("/api/")){ res.writeHead(503); return res.end("{}"); }
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, {"Content-Type":TYPES[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(res);
}).listen(0);
const URL = `http://localhost:${srv.address().port}/index.html`;
const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium", args:["--disable-accelerated-2d-canvas", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]});
const errors = [];
let shotN = 0;

async function open(w = 1600, h = 900, ls = {}){
  const page = await browser.newPage({viewport:{width:w, height:h}, hasTouch:w < 800, isMobile:w < 800});
  page.on("pageerror", e => { errors.push(e.message); console.log("pageerror", e.message); });
  page.on("console", m => { if (m.type() === "error" && !/api|Failed to load resource|503/.test(m.text())) { errors.push(m.text()); console.log("console", m.text()); } });
  await page.goto(URL);
  await page.evaluate(o => { localStorage.clear(); localStorage.setItem("p2050-gfx", "low"); localStorage.setItem("p2050-mapgl", "0"); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, ls);
  await page.reload();
  await page.waitForSelector(".loading .enter", {timeout:90000});
  await page.click(".loading .enter"); await page.waitForTimeout(1200);
  await page.evaluate(() => { const g = window.P2050.Game.globe; if (g){ g.stop(); g.start = () => {}; } });
  return page;
}
const ev = (page, f, a) => page.evaluate(f, a);
const shot = async (page, name) => { const f = path.join(OUT, `${String(++shotN).padStart(2, "0")}-${name}.png`); await page.screenshot({path:f}); console.log("shot", f); };
const wait = (page, ms) => page.waitForTimeout(ms);
async function clickSel(page, sel){ await page.evaluate(s => { const el = document.querySelector(s); if (!el) throw new Error("no element " + s); el.click(); }, sel); }
/* a tap on the map at a country point / bubble (through the canvas) */
async function tapMap(page, xy){ await page.mouse.click(xy[0], xy[1]); }
const stepId = page => ev(page, () => { const P = window.P2050, t = P.UIM.train; return t ? t.i : -1; });

const scen = {};
/* a brand-new player presses Play: training starts and can be finished by really doing each step */
scen.train = async () => {
  const page = await open();
  await ev(page, () => window.P2050.Game.newGame());
  await wait(page, 2500);
  await shot(page, "train-hello");
  const ids = await ev(page, () => 0);
  const STEP = async () => ev(page, () => window.P2050.UIM.train && window.P2050.UIM.train.i);
  const nextBtn = async () => clickSel(page, ".tcard .tfoot .btn");
  const go = async (name, fn, wantNext = true) => {
    const before = await STEP(); await fn(); await wait(page, 900);
    const after = await STEP(); console.log(`step ${before} ${name} → ${after}`); if (wantNext && after === before) errors.push("training stuck at " + name);
    await shot(page, "train-" + name);
  };
  await go("hello", nextBtn);
  await go("goal", nextBtn);
  await go("kpis", nextBtn);
  await go("time", () => clickSel(page, '.ctrls .speed [data-id="sp1"]'));
  await wait(page, 800);
  await go("green", async () => { const xy = await ev(page, () => { const P = window.P2050, b = P.S.bubbles.find(q => q.type === "green"), h = P.Map.hits.find(q => q.id === "bb-" + b.id); return [h.x + h.w / 2, h.y + h.h / 2]; }); await tapMap(page, xy); });
  await go("skills", () => clickSel(page, "[data-tab=tech]"));
  await wait(page, 600);
  await go("buy", () => clickSel(page, ".sk-detail .btn-lg"));
  await go("skclose", () => clickSel(page, ".skclose"));
  await wait(page, 1200);
  await go("hazard", async () => { const xy = await ev(page, () => { const h = window.P2050.Map.hits.find(q => q.id.startsWith("hz-")); return h ? [h.x + h.w / 2, h.y + 10] : null; }); if (xy) await tapMap(page, xy); else await clickSel(page, ".hzalert .btn-primary"); });
  for (let i = 0; i < 30 && (await STEP()) === 9; i++) await wait(page, 500);
  console.log("after strike", await STEP()); await shot(page, "train-feed");
  await go("feed", nextBtn);
  await wait(page, 600);
  await go("red", async () => { const xy = await ev(page, () => { const P = window.P2050, b = P.S.bubbles.find(q => q.type === "red"), h = P.Map.hits.find(q => q.id === "bb-" + b.id); return [h.x + h.w / 2, h.y + h.h / 2]; }); await tapMap(page, xy); });
  await wait(page, 1500);
  await go("country", async () => { const xy = await ev(page, () => { const P = window.P2050, pt = P.Map.countryPoint("THA"); return P.Map.toScreen(pt[0], pt[1]); }); await tapMap(page, xy); });
  await wait(page, 800);
  await go("talk", () => clickSel(page, "[data-cact=talk] .btn"));
  await wait(page, 2200);
  await go("event", () => clickSel(page, ".modal.event .opts .opt"));
  await go("appr", () => clickSel(page, "[data-kpi=appr] .kpibtn"));
  await go("apprclose", () => clickSel(page, ".modal.politics .mclose"));
  await go("ore", () => clickSel(page, "[data-kpi=ore] .kpibtn"));
  await go("oreclose", () => clickSel(page, ".modal.market .mclose"));
  await go("ability", () => clickSel(page, ".abar .abtn"));
  await go("year", nextBtn);
  await wait(page, 1500);
  await go("edge", async () => { const xy = await ev(page, () => { const h = window.P2050.Map.hits.find(q => q.id.startsWith("eh-")); return h ? [h.x + h.w / 2, h.y + h.h / 2] : null; }); if (xy) await tapMap(page, xy); else errors.push("no edge arrow"); });
  await wait(page, 1500); await shot(page, "train-final");
  await clickSel(page, ".tcard .tfoot .btn-lg"); await wait(page, 1200);
  await shot(page, "train-after");
  console.log("trained", await ev(page, () => localStorage.getItem("p2050-trained")), "modal", await ev(page, () => window.P2050.UIM.modal));
  await page.close();
};
/* a normal game: opening scene, a disaster in a country added in 1.1, the alert, losses with reasons, edge arrows, a minimised event, the yearly review */
scen.game = async () => {
  const page = await open(1600, 900, {"p2050-trained":"1", "p2050-tut":"1"});
  await ev(page, () => window.P2050.Game.newGame()); await page.waitForSelector(".charsel", {timeout:60000});
  await shot(page, "charsel-modes");
  await ev(page, () => window.P2050.Game.startGame("sci", "normal")); await wait(page, 1500);
  await shot(page, "intro-1"); await wait(page, 5200); await shot(page, "intro-2");
  await clickSel(page, ".intro .ifoot .btn"); await wait(page, 1200);
  await ev(page, () => { const P = window.P2050, S = P.S; S.lastEv = 999; P.setSpeed(0); S.bubbles = []; S.haz = []; P.addHazard(P.C("SOM"), "drought"); P.addHazard(P.C("FJI"), "typhoon"); P.Map.focus("SEA", true); });
  await wait(page, 1500); await shot(page, "alerts-edge");
  await ev(page, () => { const P = window.P2050; P.Map.resetView(); }); await wait(page, 1500); await shot(page, "world-1.1-countries");
  await ev(page, () => { const P = window.P2050, S = P.S; S.haz.forEach(h => h.at = S.tick + 1); S.bubbles.push({id:++S.bubId, type:"red", reg:"MEAF", cid:"KEN", ttl:1}); P.setSpeed(2); });
  await wait(page, 5600); await shot(page, "losses");
  await ev(page, () => { const P = window.P2050, S = P.S; P.setSpeed(0); S.event = "EVT_48"; S.cev = null; P.H.showEvent(); P._bump(); }); await wait(page, 1800);
  await clickSel(page, ".modal.event .ask .btn-ghost"); await wait(page, 700); await shot(page, "event-min");
  await clickSel(page, ".evpill"); await wait(page, 1800); await clickSel(page, ".modal.event .opts .opt");
  await ev(page, () => { const P = window.P2050, S = P.S; S.tick = 59; S.lastEv = 999; P.setSpeed(1); }); await wait(page, 10500);
  await shot(page, "year");
  await ev(page, () => window.P2050.Game.closeYear()); await wait(page, 600);
  // drag the map: the HUD fades
  await page.mouse.move(800, 450); await page.mouse.down(); await page.mouse.move(700, 420, {steps:6}); await wait(page, 300); await shot(page, "panning"); await page.mouse.up();
  await page.close();
};
/* the ending screen with the yearly record */
scen.end = async () => {
  const page = await open(1600, 900, {"p2050-trained":"1", "p2050-tut":"1"});
  await ev(page, () => window.P2050.Game.newGame()); await page.waitForSelector(".charsel", {timeout:60000});
  await ev(page, () => window.P2050.Game.startGame("sci", "normal")); await wait(page, 800);
  await ev(page, () => { const P = window.P2050, S = P.S; P.UIM.modal = null; S.years = Array.from({length:23}, (_, i) => ({y:2026 + i, s:i % 4 ? 70 : 30, g:i % 4 ? 1 : 0})); S.tick = 280; S.regions.forEach(r => P.setRegionCO2(r, 0)); S.sink = 1; P.tick(); });
  await wait(page, 2500); await shot(page, "end-win");
  await page.close();
};
scen.fast = async () => {
  const page = await open(1600, 900, {"p2050-trained":"1", "p2050-tut":"1"});
  await ev(page, () => window.P2050.Game.newGame()); await page.waitForSelector(".charsel", {timeout:60000});
  await ev(page, () => { const P = window.P2050; P.Game.startGame("sci", "fast"); }); await wait(page, 600);
  await ev(page, () => { const P = window.P2050; P.UIM.modal = null; P._bump(); });
  await ev(page, () => { const P = window.P2050, S = P.S; P.buyNode("E1"); S.tick = 11; P.setSpeed(1); }); await wait(page, 4200);
  console.log("fast", await ev(page, () => { const S = window.P2050.S; return {simple:S.simple, ore:S.oreOn, groups:!!S.groups, tick:S.tick, years:S.years}; }));
  await shot(page, "fast");
  await page.close();
};
scen.phone = async () => {
  const page = await open(390, 844, {"p2050-trained":"1", "p2050-tut":"1"});
  await ev(page, () => window.P2050.Game.newGame()); await page.waitForSelector(".charsel", {timeout:60000});
  await ev(page, () => window.P2050.Game.startGame("sci", "normal")); await wait(page, 7000); await shot(page, "phone-intro");
  await ev(page, () => { const P = window.P2050, S = P.S; P.UIM.modal = null; S.lastEv = 999; P.setSpeed(0); P.addHazard(P.C("PHL"), "typhoon"); P.addHazard(P.C("USA"), "hurricane"); P._bump(); });
  await wait(page, 1500); await shot(page, "phone-alert");
  await ev(page, () => { const P = window.P2050, S = P.S; S.haz.forEach(h => h.at = S.tick + 1); P.setSpeed(2); }); await wait(page, 5500); await shot(page, "phone-loss");
  await ev(page, () => { const P = window.P2050, S = P.S; P.setSpeed(0); P.Game.showYear({y:2027, s:62, g:1, net:35.2, tgt:36.9, cut:.8, ep:12, pc:2, appr:0}); }); await wait(page, 1500); await shot(page, "phone-year");
  await page.close();
  const p2 = await open(390, 844);
  await ev(p2, () => window.P2050.Game.newGame()); await wait(p2, 2500); await shot(p2, "phone-train");
  await p2.close();
};

for (const k of Object.keys(scen)) if (!ONLY.length || ONLY.includes(k)){ console.log("== " + k); try { await scen[k](); } catch (e){ errors.push(k + ": " + e.message); console.log("FAIL", k, e.message); } }
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no errors");
await browser.close(); srv.close();
