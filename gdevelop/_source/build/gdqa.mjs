// QA for the GDevelop build (after node make-project.mjs --export): node gdqa.mjs [outDir]
// Opens the HTML5 export, starts a game, plays a few years quickly and takes screenshots; prints page errors.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const root = `${HERE}/export`, out = process.argv[2] || "/tmp/gdqa";
fs.mkdirSync(out, {recursive:true});
const types = {".html":"text/html",".js":"application/javascript",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".ttf":"font/ttf",".webp":"image/webp",".glb":"model/gltf-binary"};
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/index.html"; const f = path.join(root, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, {"Content-Type":types[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(r); }).listen(0);
const b = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", args:["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"]});
const pg = await b.newPage({viewport:{width:+(process.env.W || 1280), height:+(process.env.H || 720)}});
const errs = [];
pg.on("pageerror", e => { errs.push(e.message); console.log("pageerror", e.message, (e.stack || "").split("\n").slice(0, 4).join(" | ")); });
pg.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::|api/i.test(m.text())) { errs.push(m.text()); console.log("console", m.text().slice(0, 300)); } });
await pg.addInitScript(() => { localStorage.setItem("p2050-tut", "1"); localStorage.setItem("p2050-trained", "1"); window.P2050_API = "http://localhost:9/api"; });
await pg.goto(`http://localhost:${srv.address().port}/`);
await pg.waitForFunction(() => window.P2050 && window.P2050.ready, null, {timeout:90000});
const W = ms => pg.waitForTimeout(ms), ev = (f, a) => pg.evaluate(f, a);
const shot = async n => { await W(400); await pg.screenshot({path:`${out}/${n}.png`}); console.log("shot", n); };
await W(1500); await shot("0-loading"); await pg.mouse.click(640, 360); await W(2500); await shot("1-menu");
const steps = (process.env.STEPS || "game").split(",");
if (steps.includes("game")){
  await ev(() => P2050.Screens.newGame()); await W(3500); await shot("2a-charsel");
  await ev(() => { const P = P2050; P.UIM.modal = null; P.startGame("th", {mode:"normal", char:"sci", seed:12345}); P.UIM.modal = null; P.Kit && P.Kit.dirty(); });
  await W(3000); await shot("2-game");
  await ev(() => { const P = P2050, S = P.S; for (let i = 0; i < 40; i++){ P.tick(); S.event = null; S.cev = null; if (P.UIM) P.UIM.modal = null; } P.changed && P.changed(); });
  await W(1500); await shot("3-after40");
  await ev(() => { const P = P2050; P.S.log.unshift({tk:P.S.tick, txt:"[[newspaper]] ข่าวกรองฤดูกาล: 6 เดือนข้างหน้า เอเชียตะวันออกเฉียงใต้ เสี่ยงภัยพิบัติสูงกว่าที่อื่นมาก (คลื่นความร้อน, น้ำท่วมใหญ่, พายุไต้ฝุ่น) ช่วยเตรียมรับมือภัยหรือเก็บเงินไว้อพยพ", cls:"nw"}); P.Kit.dirty(); }); await W(900); await shot("3b-hud");
  for (const win of ["market", "politics", "year"]){
    await ev(w => { const P = P2050; if (w === "year") P.UIM.yearRec = {y:2027, s:62, g:1, net:35.1, tgt:35.4, cut:0.9, ep:40, pc:6, appr:0}; P.Screens.openWin(w); }, win); await W(1200); await shot("w-" + win);
    await ev(() => P2050.Screens.closeWin());
  }
  await ev(() => { const P = P2050; P.Screens.selectCountry && P.Screens.selectCountry("CHN"); }); await W(1500); await shot("4-country");
  await ev(() => { const P = P2050; P.Screens.closeTab && P.Screens.closeTab(); P.Map.lookAt(1400, 380, 3); }); await W(2500); await shot("4b-tilt");
  const t = await ev(() => { const M = P2050.Map, a = M.toScreen(1400, 380), b = M.toWorldFromScreen(a[0], a[1]); return {cam:M.cam, tilt:M._tilt, scr:a, back:b}; }); console.log("tilt check", JSON.stringify(t));
  await pg.mouse.move(640, 360); await pg.mouse.down(); for (let i = 1; i <= 8; i++){ await pg.mouse.move(640 - i * 25, 360 + i * 10); await W(40); } await pg.mouse.up(); await W(800); await shot("4c-drag");
  for (let i = 0; i < 12; i++){ await pg.mouse.wheel(0, 400); await W(60); } await W(2500); await shot("4d-zoomout");
  console.log("after zoom out", JSON.stringify(await ev(() => P2050.Map.cam)));
  if (process.env.TRAFFIC){
    await ev(() => { const P = P2050; P.UIM.modal = null; P.S.event = null; P.setSpeed(1); });
    await W(9000);
    const vs = await ev(() => { const T = P2050.Traffic; return T.list.map(v => ({k:v.kind, f:+v.f.toFixed(2), x:Math.round(v.obj.position.x), y:Math.round(v.obj.position.y)})); }); console.log("traffic", JSON.stringify(vs));
    for (const [kind, z, tag] of [["box", 3.4, "ship"], ["air", 3.4, "plane"]]){
      const ok = await ev(([kind, z]) => { const P = P2050, v = P.Traffic.list.find(v => v.kind === kind && v.f > .3 && v.f < .7) || P.Traffic.list.find(v => (v.kind === "air") === (kind === "air")); if (!v) return false; P.setSpeed(0); P.UIM.modal = null; P.S.event = null; P.Map.lookAt(v.obj.position.x, v.obj.position.y, z); return true; }, [kind, z]);
      await W(2500); await shot("6-" + tag); await ev(() => P2050.setSpeed(1)); await W(1500);
    }
  }
}
if (steps.includes("train")){
  await ev(() => { localStorage.removeItem("p2050-trained"); P2050.Screens.goScene("Menu"); }); await W(2500);
  await shot("t0-menu");
  await ev(() => P2050.Train.start()); await W(4000); await shot("t1-hello");
  const step = async (n, fn) => { if (fn) await ev(fn); await W(900); const i = await ev(() => P2050.UIM.train && P2050.UIM.train.i); await shot(`t${n}-step${i}`); };
  await step(2, () => P2050.Train.next());          // goal
  await step(3, () => P2050.Train.next());          // kpis
  await step(4, () => P2050.Train.next());          // time
  await step(5, () => P2050.setSpeed(1));           // -> green
  await step(6, () => { const S = P2050.S; S.bubbles = S.bubbles.filter(b => !b.train); });   // -> skills
  await step(7, () => P2050.Screens.openSkills());  // -> buy
  await step(8, () => P2050.buyNode("E1"));         // -> skclose
  await step(9, () => P2050.Screens.closeSkills()); // -> hazard
  await step(10, () => { const h = P2050.S.haz[0]; if (h) P2050.evacuate(h.id); });
  await W(3500); await step(11, null);
  console.log("train at", await ev(() => P2050.UIM.train && P2050.UIM.train.i));
  await ev(() => { const P = P2050; while (P.UIM.train && P.UIM.train.i < 19) P.Train.next(); }); await step(19, null);
  await ev(() => P2050.Train.next()); await step(20, null);
}
if (steps.includes("full")){
  const r = await ev(() => { const P = P2050, S = P.S; let bought = 0, blocked = 0;
    for (let i = 0; i < 320 && !S.over; i++){
      if (P.currentEvent && P.currentEvent()) P.chooseOption(0);
      if (S.event) { try { P.chooseOption(0); } catch(e){} S.event = null; S.cev = null; }
      for (const n of P.SKILLS){ if (P.nodeState(n) !== "ready") continue; const c = P.nodeCost(n); if (S.ep >= c.ep && S.pc >= c.pc){ if (P.canAfford(n)){ if (P.buyNode(n.id) !== false) bought++; } else blocked++; } }
      (S.bubbles || []).slice().forEach(b => { try { P.popBubble ? P.popBubble(b.id) : 0; } catch(e){} });
      P.tick(); if (P.UIM) P.UIM.modal = P.UIM.modal === "story" ? null : P.UIM.modal;
    }
    return {tick:S.tick, over:S.over, bought, blocked, owned:Object.keys(S.owned).length, mat:S.mat, ore:S.ore, temp:S.temp.toFixed(2), net:P.netCO2().toFixed(1), years:(S.years || []).length}; });
  console.log("full game:", JSON.stringify(r));
  await W(2500); await shot("5-end");
}
fs.writeFileSync(`${out}/errors.txt`, errs.join("\n"));
console.log("errors:", errs.length);
await b.close(); srv.close();
