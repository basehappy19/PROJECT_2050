const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.engine) return;
(P.mods = P.mods || {}).engine = 1;
/* =========================================================================
   Engine · Simulation (rules unchanged from the web version)
   One tick = one in-game month. The scene's "tick" timer calls P.tick().
   Everything visual goes through the hooks in P.H (set by the UI/Map/Audio modules).
   ========================================================================= */
const {UI, MONTHS, RESERVE, REGIONS, RIDS, RMETA, CITIES, ACTIONS, NODES, NODE, EVENTS, NEWS, ACH, IC} = P;
const H = P.H = P.H || {};
const hook = (name, ...a) => (H[name] ? H[name](...a) : undefined);
const S = P.S = P.S || {};
const t = k => (UI[k] ? UI[k][S.lang || "th"] : k);
const L = o => (o && typeof o === "object" ? o[S.lang || "th"] : o);

const TOTAL_TICKS = 300;
const TIP_TO_TEMP = 0.004;   // 1 'tipping %' in the GDD ≈ +0.004 °C
const SPEEDS = [0, 4, 2];     // seconds per month: 300 ticks = 15 min at 1×, 7.5 min at 2×
const MAX_PROJECTS = 3;
function newState(lang){
  return {
    lang: lang || "th", speed:1, tick:0,
    temp:1.20, tip:10, ep:25, pc:20, appr:75, buys:[],
    epInc:0, damp:0, sink:0, discAll:1, disc:{}, p3:false,
    owned:{}, rollouts:[], delays:[], stall:0,
    used:[], lastEv:-3, bubbles:[], bubId:0, newsUsed:[], flags:{},
    regions: REGIONS.map(r => ({id:r.id, co2:r.co2, co2_0:r.co2, fossil0:r.fossil, comp:r.comp, compBase:r.comp, vuln:r.vuln, cd:{}, uses:{}})),
    hist:[{net:36, temp:1.2}], log:[],
    sel:"SEA", tab:null, node:"E1", over:null, event:null, started:false,
  };
}
function resetState(o){ Object.keys(S).forEach(k => delete S[k]); Object.assign(S, o); }

/* ---------------------------- Helpers ---------------------------- */
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const R = id => S.regions.find(r => r.id === id);
const avg = f => S.regions.reduce((s,r) => s + f(r), 0) / S.regions.length;
const grossCO2 = () => S.regions.reduce((s,r) => s + r.co2, 0);
const sinkEff = () => clamp(1 - Math.max(0, S.temp - 1.2) * 0.3, 0.5, 1);
const netCO2 = () => grossCO2() - S.sink * sinkEff();
const lastMile = r => 0.2 + 0.8 * clamp(r.co2 / r.co2_0, 0, 1);
const dateStr = (tk = S.tick) => `${MONTHS[S.lang][tk % 12]} ${2026 + Math.floor(tk / 12)}`;
const fmt = (v,d=1) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d);
const pick = (arr, w) => { let s = arr.reduce((a,x) => a + w(x), 0), r = Math.random() * s; for (const x of arr){ r -= w(x); if (r <= 0) return x; } return arr[arr.length-1]; };
function addLog(txt, cls=""){ S.log.unshift({tk:S.tick, txt, cls}); if (S.log.length > 150) S.log.pop(); }
function applyGlobalCO2(delta){ const g = grossCO2() || 1; S.regions.forEach(r => applyRegionCO2(r, delta * (r.co2 / g))); }
function applyRegionCO2(r, delta){ const d = delta < 0 ? delta * (r.comp / 100) * lastMile(r) : delta; r.co2 = Math.max(0, r.co2 + d); }
function changeComp(id, v, permanent){ (id === "ALL" ? S.regions : [R(id)]).forEach(r => { r.comp = clamp(r.comp + v, 0, 100); if (permanent) r.compBase = clamp(r.compBase + v, 0, 100); }); }
function changeVuln(id, v){ (id === "ALL" ? S.regions : [R(id)]).forEach(r => { r.vuln = clamp(r.vuln + v, 0, 100); }); }

/* ---------------------------- Economy ---------------------------- */
const epGain = () => Math.floor(2 + avg(r => r.comp) * 0.07 + S.appr / 30) + S.epInc;
const pcGain = () => Math.floor(1 + avg(r => r.comp) * 0.03);
const recentBuys = () => (S.buys || []).filter(tk => S.tick - tk < 12).length;
const rushMult = () => 1 + 0.2 * recentBuys();
function nodeCost(n){ const m = (S.disc[n.id] ?? 1) * S.discAll * rushMult(); return {ep: Math.round(n.ep * m), pc: Math.round(n.pc * m)}; }
const busyIds = () => [...new Set(S.rollouts.map(r => r.id))];
const atCapacity = n => n.months > 0 && busyIds().length >= MAX_PROJECTS;
function nodeState(n){ if (S.owned[n.id]) return "own"; return n.req.every(q => S.owned[q]) ? "ready" : "locked"; }
function actionCost(a, r){ const m = Math.pow(1.25, r.uses[a.id] || 0); return {ep: Math.round(a.ep * RESERVE[RMETA[r.id].reserve].m * m), pc: Math.round(a.pc * m)}; }
function rollProgress(id){ const rs = S.rollouts.filter(r => r.id === id); if (!rs.length) return null; return Math.min(...rs.map(r => 1 - r.left / r.months)); }

/* ---------------------------- Player actions ---------------------------- */
function buyNode(id){
  const n = NODE[id]; if (!n || nodeState(n) !== "ready") return;
  const c = nodeCost(n); if (S.ep < c.ep || S.pc < c.pc || atCapacity(n)) return;
  S.ep -= c.ep; S.pc -= c.pc; S.owned[id] = true; (S.buys = S.buys || []).push(S.tick);
  const fx = n.fx;
  const boost = (n.cat === 1 && id !== "E1" && S.owned.E1) ? 1.1 : 1;
  const dacEff = (id === "N4" && !S.owned.E2) ? 0.6 : 1;
  if (fx.appr) S.appr = clamp(S.appr + fx.appr, 0, 100);
  if (fx.compAll) changeComp("ALL", fx.compAll, true);
  if (fx.comp) Object.entries(fx.comp).forEach(([k,v]) => changeComp(k, v, true));
  if (fx.vuln) Object.entries(fx.vuln).forEach(([k,v]) => changeVuln(k, v));
  if (fx.vulnAll) changeVuln("ALL", fx.vulnAll);
  if (fx.epInc) S.epInc += fx.epInc;
  if (fx.damp) S.damp += fx.damp;
  if (fx.tip) S.temp += fx.tip * TIP_TO_TEMP;
  if (fx.p3) S.p3 = true;
  const per = {};
  if (fx.co2){ const g = grossCO2() || 1; S.regions.forEach(r => per[r.id] = (per[r.id]||0) + fx.co2 * boost * r.co2 / g); }
  if (fx.all) RIDS.forEach(k => per[k] = (per[k]||0) + fx.all * boost);
  if (fx.rco2) Object.entries(fx.rco2).forEach(([k,v]) => per[k] = (per[k]||0) + v * boost);
  const months = Math.max(1, n.months);
  if (Object.keys(per).length) S.rollouts.push({id, kind:"co2", left:months, months, per});
  if (fx.sink) S.rollouts.push({id, kind:"sink", left:months, months, amt: fx.sink * dacEff});
  addLog(`${t("logTech")}: ${n.id} ${L(n.name)}`, "tc"); Ach.check();
  hook("sfx", "buy"); changed();
}
function doAction(aid){
  const a = ACTIONS.find(x => x.id === aid), r = R(S.sel);
  if (!a || !r || (r.cd[aid] || 0) > 0) return;
  const c = actionCost(a, r); if (S.ep < c.ep || S.pc < c.pc) return;
  S.ep -= c.ep; S.pc -= c.pc; r.uses[aid] = (r.uses[aid] || 0) + 1; r.cd[aid] = a.cd;
  if (aid === "fund")   r.co2 = Math.max(0, r.co2 - 0.35 * r.comp / 100);
  if (aid === "diplo")  r.comp = clamp(r.comp + 8, 0, 100);
  if (aid === "adapt"){ r.vuln = clamp(r.vuln - 10, 0, 100); S.appr = clamp(S.appr + 1, 0, 100); }
  if (aid === "tariff"){ r.co2 = Math.max(0, r.co2 - 0.8 * r.comp / 100); r.comp = clamp(r.comp - 6, 0, 100); }
  addLog(`${t("logAct")}: ${L(a.name)} → ${L(RMETA[r.id].name)}`, "tc"); Ach.unlock("action1"); hook("sfx", "action");
  if (!checkEnd()) changed();
}
function applyFx(fx, target){
  if (fx.co2){ if (target) applyRegionCO2(R(target), fx.co2); else applyGlobalCO2(fx.co2); }
  if (fx.rco2) Object.entries(fx.rco2).forEach(([k,v]) => applyRegionCO2(R(k), v));
  if (fx.temp) S.temp += fx.temp;
  if (fx.tip)  S.temp += fx.tip * TIP_TO_TEMP;
  if (fx.appr) S.appr = clamp(S.appr + fx.appr, 0, 100);
  if (fx.ep)   S.ep = Math.max(0, S.ep + fx.ep);
  if (fx.pc)   S.pc = Math.max(0, S.pc + fx.pc);
  if (fx.comp) Object.entries(fx.comp).forEach(([k,v]) => changeComp(k === "T" ? (target || "ALL") : k, v, false));
  if (fx.vuln) Object.entries(fx.vuln).forEach(([k,v]) => changeVuln(k === "T" ? (target || "ALL") : k, v));
  if (fx.disc) Object.entries(fx.disc).forEach(([k,v]) => { if (k === "ALL") S.discAll *= (1 - v); else S.disc[k] = (S.disc[k] ?? 1) * (1 - v); });
  S.discAll = Math.max(.5, S.discAll);
  if (fx.damp) S.damp += fx.damp;
  if (fx.stall) S.stall += fx.stall;
  if (fx.delay) S.delays.push({at:S.tick + fx.delay.m, fx:fx.delay.fx, target});
}

/* ---------------------------- Bubbles ---------------------------- */
const RED_COST = 20;
function spawnBubbles(){
  const greens = S.bubbles.filter(b => b.type === "green").length;
  if (greens < 1 && Math.random() < 0.10){
    const reg = pick(S.regions, r => 0.3 + r.comp / 100);
    const city = pick(CITIES[reg.id], c => c[2]);
    S.bubbles.push({id:++S.bubId, type:"green", reg:reg.id, lat:city[0], lon:city[1], ttl:4}); hook("sfx", "spawnGreen");
  }
  const pRed = 0.025 + Math.max(0, S.temp - 1.2) * 0.08;
  if (S.bubbles.filter(b => b.type === "red").length < 1 && Math.random() < pRed){
    const reg = pick(S.regions, r => r.vuln);
    const city = pick(CITIES[reg.id], c => 1);
    S.bubbles.push({id:++S.bubId, type:"red", reg:reg.id, lat:city[0] + (Math.random()-.5)*4, lon:city[1] + (Math.random()-.5)*4, ttl:6}); hook("sfx", "spawnRed");
  }
}
function ageBubbles(){
  S.bubbles.forEach(b => {
    b.ttl--;
    if (b.ttl <= 0 && b.type === "red"){
      const r = R(b.reg); S.appr = clamp(S.appr - 1.5, 0, 100); r.vuln = clamp(r.vuln + 2, 0, 100); r.comp = clamp(r.comp - 2, 0, 100);
      hook("sfx", "miss"); addLog(`${t("redMiss")} ${L(RMETA[b.reg].name)} · ${t("appr")} −1.5% · ${t("vuln")} +2%`, "al");
    }
  });
  S.bubbles = S.bubbles.filter(b => b.ttl > 0);
}
/* x, y = screen position (design units) for the floating "+EP" text */
function popBubble(id, x, y){
  const b = S.bubbles.find(q => q.id === id); if (!b || S.over || S.event) return false;
  if (b.type === "green"){
    const gain = 2 + Math.round(avg(r => r.comp) / 40);
    S.ep += gain; hook("sfx", "pop"); Ach.green(); hook("floatText", x, y, `+${gain} ${IC.ep}`, "good");
  } else {
    if (S.ep < RED_COST) { hook("sfx", "error"); hook("floatText", x, y, t("cantAfford"), "bad"); return true; }
    const r = R(b.reg); S.ep -= RED_COST; r.comp = clamp(r.comp + 3, 0, 100); r.vuln = clamp(r.vuln - 1, 0, 100); S.appr = clamp(S.appr + 1, 0, 100);
    hook("sfx", "aid"); Ach.aid(); hook("floatText", x, y, `+1% ${IC.appr}`, "accent");
    addLog(`${t("redHelp")} ${L(RMETA[b.reg].name)} · ${IC.ep} −${RED_COST} · ${t("compliance")} +3%`, "gd");
  }
  S.bubbles = S.bubbles.filter(q => q.id !== id);
  changed(); return true;
}

/* ---------------------------- Tick engine ---------------------------- */
function tick(){
  if (!S.started || S.over || S.event) return;
  S.tick++;
  const prevTemp = S.temp;
  if (S.stall > 0) S.stall--;
  else {
    S.rollouts.forEach(ro => {
      if (ro.kind === "co2") S.regions.forEach(r => { const d = ro.per[r.id]; if (d) r.co2 = Math.max(0, r.co2 + (d / ro.months) * (r.comp / 100) * lastMile(r)); });
      else S.sink += ro.amt / ro.months;
      ro.left--;
      if (ro.left === 0){ hook("sfx", "done"); addLog(`${ro.id} ${L(NODE[ro.id].name)} — ${t("logRollDone")}`, "tc"); }
    });
    S.rollouts = S.rollouts.filter(ro => ro.left > 0);
  }
  S.delays.filter(d => d.at <= S.tick).forEach(d => applyFx(d.fx, d.target));
  S.delays = S.delays.filter(d => d.at > S.tick);
  const damp = Math.min(1.3, S.damp);
  S.regions.forEach(r => {
    const fossil = r.fossil0 * (r.co2 / r.co2_0);
    r.co2 = Math.max(0, r.co2 * (1 + 0.0022 * fossil * (1 - damp)));
    if (S.p3 && r.comp < 70) r.co2 = Math.max(0, r.co2 - 0.3 / 12);
    const target = clamp(r.compBase + (S.appr - 75) * 0.25, 0, 100);
    r.comp = clamp(r.comp + (target - r.comp) * 0.02, 0, 100);
    Object.keys(r.cd).forEach(k => { if (r.cd[k] > 0) r.cd[k]--; });
  });
  const net = netCO2();
  S.temp += (net / 36.0) * 0.0035 + (S.tip / 100) * 0.0015;
  S.ep += epGain(); S.pc += pcGain();
  if (S.temp >= 2.5) S.tip += 1.2; else if (S.temp >= 2.0) S.tip += 0.6; else if (S.temp >= 1.5) S.tip += 0.2;
  S.tip = clamp(S.tip, 0, 100);
  if (prevTemp < 1.5 && S.temp >= 1.5) { addLog(t("logTipping"), "al"); hook("sfx", "warn"); }
  if (prevTemp < 2.0 && S.temp >= 2.0) { addLog(t("logTipping2"), "al"); hook("sfx", "warn"); }
  const stress = avg(r => r.vuln) / 100 * Math.max(0, S.temp - 1.3) * 0.6;
  S.appr = clamp(S.appr - stress + (60 - S.appr) * 0.004, 0, 100);
  ageBubbles(); spawnBubbles();
  S.hist.push({net, temp:S.temp}); Ach.check();
  if (checkEnd()) return;
  maybeNews();
  if (S.tick % 6 === 0) autosave();
  const p = Math.min(0.25, 0.08 + S.temp * 0.03);
  if (S.tick - S.lastEv >= 4 && Math.random() < p) triggerEvent();
  changed();
}
function maybeNews(){
  if (S.tick > 0 && S.tick % 12 === 0){
    const y = 2025 + S.tick / 12, prev = S.hist[Math.max(0, S.hist.length - 13)].net, net = netCO2();
    hook("sfx", "year"); addLog(`[[chart-line]] ${t("annual")} ${y}: ${t("co2")} ${net.toFixed(1)} Gt (${fmt(net - prev)}) · ΔT +${S.temp.toFixed(2)}°C · ${t("appr")} ${S.appr.toFixed(0)}%`, "tc");
  }
  S.regions.forEach(r => { if (!S.flags["half" + r.id] && r.co2 <= r.co2_0 / 2){ S.flags["half" + r.id] = 1; addLog(`${L(RMETA[r.id].name)} ${t("halved")}`, "gd"); } });
  if (Math.random() > 0.3) return;
  const idx = NEWS.map((n,i) => i).filter(i => !S.newsUsed.includes(i) && (!NEWS[i].c || NEWS[i].c(S)));
  if (!idx.length) return;
  const i = idx[Math.floor(Math.random() * idx.length)];
  S.newsUsed.push(i); if (S.newsUsed.length > 24) S.newsUsed.shift();
  const reg = REGIONS[Math.floor(Math.random() * REGIONS.length)], cities = CITIES[reg.id];
  const txt = NEWS[i][S.lang].replace("{C}", cities[Math.floor(Math.random() * cities.length)][3]).replace("{R}", L(reg.name)).replace("{Y}", 2025 + Math.floor(S.tick / 12));
  addLog("[[newspaper]] " + txt, "nw"); hook("sfx", "news");
}
function eligible(e){
  const c = e.cond || {}, y = 2026 + Math.floor(S.tick / 12);
  return !S.used.includes(e.id) && (!c.minTemp || S.temp >= c.minTemp) && (!c.minYear || y >= c.minYear) && (!c.req || S.owned[c.req]);
}
function triggerEvent(){
  const pool = EVENTS.filter(eligible); if (!pool.length) return;
  const e = pool[Math.floor(Math.random() * pool.length)];
  S.used.push(e.id); S.lastEv = S.tick; S.event = e.id; hook("sfx", "event"); hook("amb", e.snd);
  if (e.target) hook("mapFocus", e.target);
  hook("showEvent");
}
const POSTPONE = {appr:-6, tip:1};
function affordable(fx){ return (!(fx.ep < 0) || S.ep >= -fx.ep) && (!(fx.pc < 0) || S.pc >= -fx.pc); }
function chooseOption(i){
  const e = EVENTS.find(x => x.id === S.event); if (!e) return;
  const opt = i === -1 ? {label:{th:UI.postpone.th,en:UI.postpone.en}, fx:POSTPONE} : e.options[i];
  if (i !== -1 && !affordable(opt.fx)) return;
  applyFx(opt.fx, e.target); hook("sfx", "choose"); Ach.unlock("event1"); Ach.sawEvent(e.id); if (e.id === "EVT_119" || e.id === "EVT_47") Ach.unlock("chaoPhraya");
  addLog(`${L(e.title)} → ${L(opt.label)} [${fxChips(opt.fx, e.target).map(c => c.txt).join(", ") || "—"}]`, "ev");
  S.event = null; hook("closeModal"); hook("stopAmb");
  if (!checkEnd()) changed();
}
function checkEnd(){
  let o = null;
  if (netCO2() <= 0) o = "win"; else if (S.temp >= 3.0) o = "l1"; else if (S.appr <= 0) o = "l2"; else if (S.tick >= TOTAL_TICKS) o = "l3";
  if (!o) return false;
  S.over = o; S.event = null; hook("sfx", o === "win" ? "win" : "lose"); Ach.check(); changed(); hook("showEnd");
  const sv = readSaves(); if (sv && sv.auto){ delete sv.auto; try { localStorage.setItem(SAVE_KEY, JSON.stringify(sv)); } catch(e) {} }
  return true;
}
function score(){
  const left = Math.max(0, TOTAL_TICKS - S.tick);
  const base = S.over === "win" ? 5000 + left * 20 : Math.round((36 - netCO2()) * 80);
  return Math.max(0, Math.round(base + Math.max(0, 2.5 - S.temp) * 1500 + S.appr * 15));
}
function fxChips(fx, target){
  const c = [], rn = id => id === "ALL" ? (S.lang === "th" ? "ทั้งโลก" : "all") : (id === "T" ? (target || "ALL") : id);
  const push = (txt, good) => c.push({txt, good});
  if (fx.co2) push(`${IC.co2} ${target ? target + " " : ""}${fmt(fx.co2)} Gt`, fx.co2 < 0);
  if (fx.rco2) Object.entries(fx.rco2).forEach(([k,v]) => push(`${IC.co2} ${k} ${fmt(v)} Gt`, v < 0));
  if (fx.temp) push(`${IC.temp} ${fmt(fx.temp,2)}°C`, fx.temp < 0);
  if (fx.ep) push(`${IC.ep} ${fmt(fx.ep,0)}`, fx.ep > 0);
  if (fx.pc) push(`${IC.pc} ${fmt(fx.pc,0)}`, fx.pc > 0);
  if (fx.appr) push(`${IC.appr} ${fmt(fx.appr,0)}%`, fx.appr > 0);
  if (fx.tip) push(`${IC.temp} ${fmt(fx.tip * TIP_TO_TEMP,2)}°C`, fx.tip < 0);
  if (fx.comp) Object.entries(fx.comp).forEach(([k,v]) => push(`${IC.comp} ${rn(k)} ${fmt(v,0)}%`, v > 0));
  if (fx.vuln) Object.entries(fx.vuln).forEach(([k,v]) => push(`${IC.vuln} ${rn(k)} ${fmt(v,0)}%`, v < 0));
  if (fx.disc) Object.entries(fx.disc).forEach(([k,v]) => push(`[[flask-conical]] ${k === "ALL" ? (S.lang==="th"?"ทุกโหนด":"all") : k} ${v >= 0 ? "−" : "+"}${Math.round(Math.abs(v)*100)}%`, v >= 0));
  if (fx.damp) push(`${IC.co2} ${S.lang === "th" ? "โตช้าลง" : "growth ↓"}`, true);
  if (fx.stall) push(`[[flask-conical]] ${S.lang === "th" ? "ชะงัก" : "stall"} ${fx.stall} ${t("months")}`, false);
  if (fx.delay) fxChips(fx.delay.fx, target).forEach(x => push(`${x.txt} (${t("delayed")} ${fx.delay.m} ${t("months")})`, x.good));
  return c;
}
/* Something in the game state changed: redraw the HUD and the map colours. */
function changed(){ hook("dirty"); hook("mapRefresh"); }

/* ---------------------------- Session control ---------------------------- */
function setSpeed(v){ S.speed = v; hook("sfx", v ? "speed" : "pause"); changed(); }
function setLang(l){ S.lang = l; try { localStorage.setItem("p2050-lang", l); } catch(e) {} changed(); }
/* "Ready to tick" = what the scene's tick timer checks every frame (scene variable Running). */
function running(){ return !!(S.started && S.speed > 0 && !S.over && !S.event && !(P.UIM && P.UIM.paused) && !(P.UIM && P.UIM.blocking)); }
function newGame(lang){ resetState(newState(lang)); }
function startGame(lang){
  resetState(newState(lang)); S.started = true; S.speed = 1;
  addLog(t("logStart"), "tc"); hook("sfx", "start"); Ach.unlock("start");
  hook("closeModal"); changed(); autosave();
}

/* ---------------------------- Save / Load ----------------------------
   localStorage key p2050-saves = {auto, s1, s2, s3}; each {meta, S}. Save codes = base64 JSON for moving between devices. */
const SAVE_KEY = "p2050-saves", SLOTS = ["auto","s1","s2","s3"];
function readSaves(){ try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; } catch(e) { return null; } }
function snapshot(){ const c = JSON.parse(JSON.stringify(S)); c.tab = null; return c; }
function writeSlot(slot){
  const all = readSaves(); if (all === null) return false;
  all[slot] = {meta:{tick:S.tick, temp:S.temp, net:netCO2(), appr:S.appr, at:Date.now()}, S:snapshot()};
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(all)); return true; } catch(e) { return false; }
}
function autosave(){ if (S.started && !S.over) writeSlot("auto"); }
function validSave(o){ return o && Array.isArray(o.regions) && o.regions.length === 6 && typeof o.tick === "number" && Array.isArray(o.hist); }
function loadState(obj){
  if (!validSave(obj)) return false;
  const lang = S.lang;
  resetState(Object.assign(newState(lang), obj, {lang, started:true, speed:0, tab:null}));
  return true;
}
function exportCode(){ return "P2050:" + btoa(unescape(encodeURIComponent(JSON.stringify(snapshot())))); }
function importCode(txt){ try { const raw = String(txt).trim().replace(/^P2050:/, ""); return JSON.parse(decodeURIComponent(escape(atob(raw)))); } catch(e) { return null; } }
function slotName(k){ return k === "auto" ? t("slotAuto") : `${t("slot")} ${k.slice(1)}`; }
function slotMetaLines(m){
  if (!m) return [t("empty")];
  const when = new Date(m.at).toLocaleString(S.lang === "th" ? "th-TH" : "en-GB", {dateStyle:"short", timeStyle:"short"});
  return [`${dateStr(m.tick)} · ΔT +${m.temp.toFixed(2)}°C · CO₂ ${m.net.toFixed(1)} Gt · ${t("appr")} ${m.appr.toFixed(0)}%`, when];
}

/* ---------------------------- Achievements ---------------------------- */
const AchStore = (() => {
  const KEY = "p2050-ach";
  let data = {got:{}, greens:0, aids:0, seen:[]};
  try { data = Object.assign(data, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch(e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {} };
  return { get data(){ return data; }, save };
})();
const Ach = (() => {
  function unlock(id){
    const d = AchStore.data; if (d.got[id]) return;
    const a = ACH.find(x => x.id === id); if (!a) return;
    d.got[id] = Date.now(); AchStore.save(); hook("toast", a);
  }
  const byCat = cat => NODES.filter(n => n.cat === cat).every(n => S.owned[n.id]);
  function check(){
    if (!S || !S.started) return;
    if (Object.keys(S.owned).length) unlock("tech1");
    if (recentBuys() >= 3) unlock("rush");
    if (S.ep >= 300) unlock("rich");
    if (byCat(1)) unlock("branchE"); if (byCat(2)) unlock("branchP"); if (byCat(3)) unlock("branchN");
    if (NODES.every(n => S.owned[n.id])) unlock("allTech");
    if (S.owned.E5 && rollProgress("E5") === null) unlock("fusion");
    if (S.regions.every(r => r.comp >= 85)) unlock("unity");
    if (S.regions.every(r => r.vuln < 35)) unlock("safe");
    if (S.hist.length > 12 && S.hist[S.hist.length - 13].net - netCO2() >= 2) unlock("peak");
    if (netCO2() < 18) unlock("half");
    if (S.tick >= 120) unlock("decade");
    const d = AchStore.data;
    if (d.greens >= 25) unlock("greens"); if (d.aids >= 10) unlock("aids");
    if (d.seen.length >= 25) unlock("read25"); if (d.seen.length >= 100) unlock("read100"); if (d.seen.length >= EVENTS.length) unlock("readAll");
    if (S.over === "win"){
      unlock("win");
      if (S.tick < 240) unlock("winEarly");
      if (S.temp < 1.5) unlock("win15");
      if (S.appr >= 70) unlock("winLoved");
    }
    if (S.over === "l3") unlock("loseTime");
    if (S.over === "l1") unlock("loseHeat");
    if (S.over === "l2") unlock("loseVote");
  }
  function count(){ return ACH.filter(a => AchStore.data.got[a.id]).length; }
  return {
    unlock, check, count,
    green(){ AchStore.data.greens++; AchStore.save(); check(); },
    aid(){ AchStore.data.aids++; AchStore.save(); check(); },
    sawEvent(id){ const s = AchStore.data.seen; if (!s.includes(id)){ s.push(id); AchStore.save(); } check(); },
  };
})();

Object.assign(P, {
  t, L, TOTAL_TICKS, TIP_TO_TEMP, SPEEDS, MAX_PROJECTS, RED_COST, POSTPONE,
  newState, resetState, clamp, R, avg, grossCO2, netCO2, sinkEff, dateStr, fmt, addLog,
  epGain, pcGain, recentBuys, nodeCost, busyIds, atCapacity, nodeState, actionCost, rollProgress,
  buyNode, doAction, applyFx, popBubble, tick, eligible, triggerEvent, affordable, chooseOption, checkEnd, score, fxChips, changed,
  setSpeed, setLang, running, newGame, startGame,
  SAVE_KEY, SLOTS, readSaves, writeSlot, autosave, validSave, loadState, exportCode, importCode, slotName, slotMetaLines,
  AchStore, Ach,
});
if (!S.regions){ let lang = "th"; try { lang = localStorage.getItem("p2050-lang") || "th"; } catch(e) {} resetState(newState(lang)); }
