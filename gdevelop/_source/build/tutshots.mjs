// Captures the tutorial pictures from the real game (after node make-project.mjs --export):
//   node tutshots.mjs   then build again so the new pictures go into the game
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const root = `${HERE}/export`, out = path.resolve(HERE, "../../assets/tutorial");
const types = {".html":"text/html",".js":"application/javascript",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".ttf":"font/ttf"};
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/index.html"; const f = path.join(root, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, {"content-type": types[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(r); }).listen(8125);
const b = await chromium.launch(process.env.CHROMIUM ? {executablePath:process.env.CHROMIUM} : {});
const pg = await b.newPage({viewport:{width:1280, height:720}});
await pg.addInitScript(() => { localStorage.setItem("p2050-tut", "1"); window.P2050_API = "http://localhost:9/api"; });
await pg.goto("http://localhost:8125/");
await pg.waitForFunction(() => window.P2050 && window.P2050.ready, null, {timeout:60000});
const W = ms => pg.waitForTimeout(ms), ev = f => pg.evaluate(f);
const shot = async n => { await ev(() => { P2050.UIM.toastQ = []; P2050.UIM.toast = null; P2050.Kit.dirty(); const w = document.getElementById("watermark-link"); if (w){ let e = w; while (e.parentElement && e.parentElement !== document.body && !e.parentElement.querySelector("canvas")) e = e.parentElement; e.style.display = "none"; } }); await W(500); await pg.screenshot({path:`${out}/${n}.jpg`, type:"jpeg", quality:82}); };
await W(1500); await pg.mouse.click(640, 360); await W(2000);
await ev(() => P2050.Screens.newGame()); await W(2500);
await ev(() => { P2050.UIM.modal = null; P2050.startGame("th", {mode:"normal", char:"sci", seed:12345}); for (let i = 0; i < 4; i++) P2050.Screens.storyNext(); });
await W(9000);   // let the GDevelop watermark fade
await ev(() => { const S = P2050.S; S.ep = 900; S.pc = 300; ["P1", "E1", "N1", "C1", "E2", "I1"].forEach(id => { S.buys = []; P2050.buyNode(id); }); for (let i = 0; i < 70; i++){ P2050.tick(); S.event = null; S.cev = null; } S.event = null; S.cev = null; S.haz = []; P2050.UIM.modal = null; S.speed = 1; P2050.Map.resetView(); P2050.changed(); });
await W(2600); await shot("t1-goal");
await ev(() => { for (let i = 0; i < 30; i++){ P2050.tick(); P2050.S.event = null; P2050.S.cev = null; } P2050.UIM.modal = null; P2050.S.haz = []; P2050.changed(); }); await W(600); await shot("t2-meters");
await ev(() => { P2050.UIM.abTip = "char"; P2050.Kit.dirty(); }); await W(400); await shot("t3-resources");
await ev(() => { P2050.UIM.abTip = null; P2050.Screens.selectCountry("CHN"); }); await W(1800); await shot("t4-regions");
await ev(() => { const S = P2050.S; S.tab = null; S.selC = null; S.haz = [{id:900, type:"typhoon", c:"PHL", at:S.tick + 2, sev:1, evac:false}]; S.bubbles.push({id:901, type:"red", reg:"SEA", cid:"VNM", hz:"flood", ttl:4}); S.bubbles.push({id:902, type:"green", reg:"SEA", lat:13.75, lon:100.5, ttl:3}); P2050.Map.lookAt(...P2050.countryPoint("PHL").map((v, i) => i ? v : v - 120), 2.0); P2050.changed(); }); await W(2200); await shot("t5-bubbles");
await ev(() => { const S = P2050.S; S.haz = []; S.bubbles = []; P2050.Map.resetView(); P2050.changed(); P2050.Screens.openSkills(); S.skillCat = "energy"; S.node = "E3"; S.ep = Math.max(S.ep, 300); P2050.Kit.dirty(); }); await W(1500); await shot("t6-tree");
await ev(() => { P2050.Screens.closeSkills(); const S = P2050.S; S.event = "CE_BATTERY"; S.cev = {id:"CE_BATTERY", A:["CHN", "KOR", "JPN"], B:["THA", "USA", "IND"]}; P2050.H.showEvent(); }); await W(2200); await shot("t7-event");
await ev(() => { P2050.chooseOption(2); const S = P2050.S; S.over = "win"; S.grade = "A"; S.temp = 1.78; P2050.H.showEnd(); P2050.UIM.reward = {terra:30, xp:140, level:4, levelUp:true}; P2050.Kit.dirty(); }); await W(1500); await shot("t8-win");
await b.close(); srv.close(); console.log("tutorial shots saved");
