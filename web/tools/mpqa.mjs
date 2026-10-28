/* 2.0 multiplayer check in two real browsers against a real server and database:
   node tools/mpqa.mjs <outdir>   (needs PostgreSQL: TEST_DATABASE_URL, default p2050_test — it is wiped; and the readable build: node build.mjs --open) */
import {chromium} from "playwright";
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../.."), API = path.join(ROOT, "server/api/src");
const OUT = process.argv[2] || "/tmp/mpqa"; fs.mkdirSync(OUT, {recursive:true});
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://p2050:p2050@localhost:5432/p2050_test";
process.env.MIN_GAME_SECONDS = "0";
const {makePool, migrate} = await import(pathToFileURL(path.join(API, "db.js")));
const {buildApp} = await import(pathToFileURL(path.join(API, "app.js")));
const pool = makePool(process.env.DATABASE_URL);
await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
await migrate(pool, {info(){}});
const app = buildApp(pool, {logger:false});
await app.listen({port:0, host:"127.0.0.1"});
const APORT = app.server.address().port;
/* the game + /api forwarded to the API (like scripts/start.mjs) */
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".jpg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".svg":"image/svg+xml", ".mp3":"audio/mpeg", ".woff2":"font/woff2"};
const srv = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")){ const up = http.request({host:"127.0.0.1", port:APORT, path:req.url, method:req.method, headers:req.headers}, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); }); req.pipe(up); return; }
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, {"Content-Type":TYPES[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(res);
});
srv.on("upgrade", (req, socket, head) => { const up = net.connect(APORT, "127.0.0.1", () => { const l = [`${req.method} ${req.url} HTTP/1.1`]; for (let i = 0; i < req.rawHeaders.length; i += 2) l.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`); up.write(l.join("\r\n") + "\r\n\r\n"); if (head.length) up.write(head); socket.pipe(up).pipe(socket); }); up.on("error", () => socket.destroy()); socket.on("error", () => up.destroy()); });
await new Promise(r => srv.listen(0, r));
const URL = `http://localhost:${srv.address().port}/index.html`;
const errors = [];
const reg = async name => { const r = await app.inject({method:"POST", url:"/api/auth/register", payload:{username:name, email:`${name}@x.th`, password:"secret123", displayName:name === "ploy" ? "พลอย" : "ต้น"}}); return r.json(); };
const A = await reg("ploy"), B = await reg("ton");
await app.inject({method:"POST", url:"/api/friends/request", payload:{username:"ton"}, headers:{authorization:"Bearer " + A.access}});
await app.inject({method:"POST", url:"/api/friends/respond", payload:{username:"ploy", accept:true}, headers:{authorization:"Bearer " + B.access}});

const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium", args:["--disable-accelerated-2d-canvas", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]});
async function open(tok, w = 1440, h = 860){
  const page = await browser.newPage({viewport:{width:w, height:h}, hasTouch:w < 800, isMobile:w < 800});
  page.on("pageerror", e => { errors.push(e.message); console.log("pageerror", e.message); });
  await page.goto(URL);
  await page.evaluate(t => { localStorage.clear(); localStorage.setItem("p2050-gfx", "low"); localStorage.setItem("p2050-mapgl", "0"); localStorage.setItem("p2050-trained", "1"); localStorage.setItem("p2050-tut", "1"); localStorage.setItem("p2050-at", t.access); localStorage.setItem("p2050-rt", t.refresh); }, tok);
  await page.reload(); await page.waitForSelector(".loading .enter", {timeout:90000}); await page.click(".loading .enter"); await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = window.P2050.Game.globe; if (g){ g.stop(); g.start = () => {}; } });
  return page;
}
const ev = (p, f, a) => p.evaluate(f, a);
let n = 0; const shot = async (p, name) => { const f = path.join(OUT, `${String(++n).padStart(2, "0")}-${name}.png`); await p.screenshot({path:f}); console.log("shot", f); };
const click = (p, sel) => p.evaluate(s => { const el = document.querySelector(s); if (!el) throw new Error("no " + s); el.click(); }, sel);
const until = async (p, f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms){ if (await p.evaluate(f).catch(() => false)) return true; await p.waitForTimeout(250); } errors.push("timeout: " + f.toString().slice(0, 100)); return false; };

try {
  const pa = await open(A), pb = await open(B);
  await until(pa, () => window.P2050.Net.user && window.P2050.Net.user.username === "ploy");
  await click(pa, ".bigbtn.mpbtn"); await until(pa, () => window.P2050.Mp.status === "online");
  await pa.waitForTimeout(800); await shot(pa, "lobby");
  await ev(pa, () => window.P2050.Mp.create({mode:"coop", max:3, public:true, diff:"normal"}));
  await until(pa, () => window.P2050.Mp.room && window.P2050.UIM.sub === "room");
  const code = await ev(pa, () => window.P2050.Mp.room.code);
  // friends + invite
  await click(pb, ".bigbtn.mpbtn"); await until(pb, () => window.P2050.Mp.status === "online");
  await ev(pa, () => window.P2050.Mp.invite("ton"));
  await until(pb, () => window.P2050.Mp.invites.length > 0); await pb.waitForTimeout(400); await shot(pb, "invite");
  await click(pb, ".mpinv .btn");
  await until(pb, () => window.P2050.Mp.room && window.P2050.Mp.room.players.length === 2);
  await ev(pb, () => window.P2050.Mp.chat(1)); await pa.waitForTimeout(500);
  await ev(pb, () => window.P2050.Mp.ready(true));
  await until(pa, () => window.P2050.Mp.room.players.every(p => p.ready || p.host));
  await pa.waitForTimeout(400); await shot(pa, "room-host"); await shot(pb, "room-guest");
  await click(pa, ".mpfoot .btn-lg");
  await until(pa, () => window.P2050.UIM.screen === "game" && window.P2050.S.mp); await until(pb, () => window.P2050.UIM.screen === "game" && window.P2050.S.mp);
  // the opening pick, in the game: click the badges
  await until(pa, () => !!document.querySelector(".modal.mppick")); await pa.waitForTimeout(600); await shot(pa, "coop-pick-empty");
  await click(pb, ".mproles.big .mprole:nth-child(2)"); await click(pb, ".mproles.big .mprole:nth-child(3)");
  await until(pa, () => document.querySelectorAll(".mproles.big .mprole.busy").length === 2);
  await click(pa, ".mproles.big .mprole:nth-child(1)"); await pa.waitForTimeout(500); await shot(pa, "coop-pick-host"); await shot(pb, "coop-pick-guest");
  await click(pb, ".mppick .mpfoot .btn"); await click(pa, ".mppick .mpfoot .btn");
  await until(pa, () => !document.querySelector(".modal.mppick") && window.P2050.Mp.game.phase === "play");
  console.log("roles", await ev(pa, () => JSON.stringify(window.P2050.Mp.game.roles)));
  await pa.waitForTimeout(2500); await shot(pa, "coop-game-host");
  // guest tries an energy skill: refused with a message; host buys it
  await ev(pb, () => { const P = window.P2050; return P.buyNode("E1"); });
  await pb.waitForTimeout(600); await shot(pb, "coop-not-my-role");
  console.log("before skills", await ev(pa, () => { const P = window.P2050; return [P.UIM.modal, P.S.event, P.S.over, P.S.started]; }));
  await ev(pa, () => { const P = window.P2050; if (P.S.event) P.chooseOption(0); P.Game.openSkills(); }); await until(pa, () => !!document.querySelector(".sk-detail .btn-lg"));
  // give the team money through the server (test only) and buy
  const room = app.hub.rooms.get(code); room.game.S.ep = 600; room.game.S.pc = 120; room.game.dirty = true;
  await pa.waitForTimeout(800);
  await click(pa, ".sk-detail .btn-lg"); await until(pb, () => !!window.P2050.S.owned.E1);
  await ev(pa, () => window.P2050.Game.closeSkills());
  // an event: both vote
  room.game.S.event = "EVT_48"; room.game.S.cev = null; room.game.after(); room.game.dirty = true;
  await until(pa, () => !!window.P2050.S.event); await pa.waitForTimeout(1800);
  await click(pa, ".modal.event .opts .opt:nth-child(2)"); await pa.waitForTimeout(500); await shot(pb, "coop-vote");
  await until(pb, () => !!window.P2050.S.event); await pb.waitForTimeout(1600); await click(pb, ".modal.event .opts .opt:nth-child(2)");
  await until(pa, () => !window.P2050.S.event);
  // a region-wide evacuation vote (the disaster minister is the guest)
  const P = room.game.P; P.addHazard(P.C("PHL"), "typhoon"); P.addHazard(P.C("VNM"), "typhoon"); room.game.dirty = true;
  await pb.waitForTimeout(1200); await shot(pb, "coop-hazards");
  await ev(pb, () => window.P2050.Mp.evacAll("SEA")); await pa.waitForTimeout(800); await shot(pa, "coop-evac-vote");
  await ev(pa, () => window.P2050.Mp.voteYes(true));
  await until(pa, () => window.P2050.S.haz.every(h => h.evac));
  // the end
  room.game.S.over = "l3"; room.game.after(); await pa.waitForTimeout(1500); await shot(pa, "coop-end");
  // back to the room, versus
  await click(pa, ".modal.end .endfoot .btn-primary"); await pa.waitForTimeout(800);
  await until(pa, () => window.P2050.UIM.screen === "menu" && window.P2050.Mp.room && window.P2050.Mp.room.state === "lobby", 8000);
  await ev(pa, () => window.P2050.Mp.settings({mode:"versus"})); await pa.waitForTimeout(500);
  await until(pb, () => window.P2050.Mp.room && window.P2050.Mp.room.mode === "versus" && window.P2050.Mp.room.state === "lobby");
  if (await ev(pb, () => window.P2050.UIM.screen === "game")) await ev(pb, () => { window.P2050.Mp.exitGame(); window.P2050.UIM.sub = "room"; });
  await ev(pb, () => { window.P2050.Mp.ready(true); });
  await until(pa, () => window.P2050.Mp.room.players.every(p => p.ready || p.host)); await shot(pa, "versus-room");
  await ev(pa, () => window.P2050.Mp.start());
  await until(pa, () => window.P2050.S.mp && window.P2050.S.mp.kind === "versus"); await until(pb, () => window.P2050.S.mp && window.P2050.S.mp.kind === "versus");
  await until(pb, () => !!document.querySelector(".modal.mppick .mpblocs")); await pb.waitForTimeout(500);
  await click(pb, ".mpblocs.big .mpbloc:nth-child(2)");   // EU
  await until(pa, () => !!document.querySelector(".mpblocs.big .mpbloc:nth-child(2):disabled")); await pa.waitForTimeout(800); await shot(pa, "versus-pick");
  await click(pb, ".mppick .mpfoot .btn"); await click(pa, ".mppick .mpfoot .btn");
  await until(pa, () => window.P2050.Mp.game.phase === "play");
  const vg = app.hub.rooms.get(code).game; for (let i = 0; i < 24; i++){ for (const w of vg.worlds()) if (w.S.event) w.P.chooseOption(0); vg.tickAll(); } vg.dirty = true;
  await pa.waitForTimeout(1500); await shot(pa, "versus-race");
  await ev(pa, () => { const P = window.P2050, me = P.Mp.me.id, o = P.Mp.game.ranking.find(x => x.id !== me); P.Mp.vsAct("vsPact", o.id); });
  await until(pb, () => (window.P2050.Mp.game.offers || []).length > 0); await shot(pb, "versus-pact-offer");
  await click(pb, ".mpoffer .btn-primary"); await pb.waitForTimeout(800);
  for (const w of vg.worlds()) w.S.over = w.bloc === "EU" ? "win" : null; vg.after(); await pa.waitForTimeout(1500); await shot(pa, "versus-end");
  // a phone
  const pp = await open(B, 390, 844); await pp.waitForTimeout(1500); await shot(pp, "phone-rejoin");
} catch (e){ errors.push("FAIL " + e.message); console.log(e); }
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no errors");
await browser.close(); srv.close(); await app.close(); await pool.end();
process.exit(0);
