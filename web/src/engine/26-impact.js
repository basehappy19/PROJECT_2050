const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.impact) return;
(P.mods = P.mods || {}).impact = 1;
/* ===== Impact dashboard (phase 5 of the feature plan):
   · "if we had done nothing": a shadow world that only grows, so the player sees what their work prevented
   · how much each kind of work lowered yearly CO₂ (skills, country orders and deals, decisions, green technology)
   · a timeline of the moments that mattered
   All numbers come from the game's own model; nothing is estimated after the fact. ===== */
const S = P.S, T = (th, en) => ({th, en});
const KINDS = {
  skills:{icon:"network", col:"accent", t:T("สกิลและโครงการ", "Skills and projects")},
  orders:{icon:"handshake", col:"warn", t:T("สั่งการและข้อตกลง", "Orders and deals")},
  decisions:{icon:"lightbulb", col:"purple", t:T("การตัดสินใจ", "Decisions")},
  green:{icon:"leaf", col:"good", t:T("เทคโนโลยีสีเขียว", "Green technology")},
};

function impactInit(){
  if (!S.regions) return;
  S.impact = S.impact || {skills:0, orders:0, decisions:0, green:0};
  if (!S.bau) S.bau = {co2:S.regions.map(r => r.co2_0), sink:0, temp:S.temp, tip:S.tip || 0, hist:[]};
  S.tl = S.tl || [];
  S.ms = S.ms || {};
}
function impactAdd(k, d){ if (!S.impact) impactInit(); if (k && S.impact && Number.isFinite(d)) S.impact[k] = (S.impact[k] || 0) + d; }
/* mark(k): everything that changed net CO₂ since the last mark is credited to k (null = not credited) */
function impactMark(){
  let last = P.netCO2();
  return k => { const n = P.netCO2(); if (k) impactAdd(k, last - n); last = n; };
}
/* the do-nothing world grows with the same rule as the real one, with no damping and no cuts */
function impactTick(net){
  impactInit(); const b = S.bau; if (!b) return;
  const g = P.bal ? P.bal().growth : 1;
  S.regions.forEach((r, i) => { const fossil = r.fossil0 * (b.co2[i] / r.co2_0); b.co2[i] *= 1 + 0.0022 * fossil * g; });
  const bn = b.co2.reduce((s, v) => s + v, 0) - b.sink;
  b.tip = b.tip || 0;
  b.temp += (bn / 36.0) * 0.0035 + (b.tip / 100) * 0.0015;
  if (b.temp >= 2.5) b.tip += 1.2; else if (b.temp >= 2.0) b.tip += 0.6; else if (b.temp >= 1.5) b.tip += 0.2;
  b.tip = Math.min(100, b.tip);
  b.hist.push(+bn.toFixed(2));
  // milestones for the timeline
  const ms = S.ms;
  [[30, "n30"], [20, "n20"], [10, "n10"]].forEach(([v, k]) => { if (!ms[k] && net < v){ ms[k] = 1; timeline("ms", {k, v}); } });
  if (!ms.temp15 && S.temp >= 1.5){ ms.temp15 = 1; timeline("hot", {v:1.5}); }
  if (!ms.temp20 && S.temp >= 2.0){ ms.temp20 = 1; timeline("hot", {v:2.0}); }
}
function timeline(kind, o){ if (!S.tl) S.tl = []; S.tl.push({tk:S.tick, kind, ...o}); if (S.tl.length > 60) S.tl.splice(0, S.tl.length - 60); }

/* the player's own actions: credit the change to the right kind */
const wrap = (name, k, after) => {
  const f = P[name]; if (typeof f !== "function") return;
  P[name] = function(...a){
    const n0 = P.netCO2 ? P.netCO2() : 0, ev = name === "chooseOption" && S.event ? P.currentEvent() : null;
    const r = f.apply(this, a);
    const d = n0 - P.netCO2(); impactAdd(k, d);
    if (after) after(a, d, ev);
    return r;
  };
};
wrap("chooseOption", "decisions", (a, d, ev) => { if (ev && a[0] !== -1 && ev.options[a[0]]) timeline("ev", {title:ev.title, label:ev.options[a[0]].label}); });
["doAction", "countryAction", "bilateral", "formAlliance", "useAbility", "popBubble", "evacuate"].forEach(n => wrap(n, "orders"));
wrap("buyNode", "skills", a => { if (S.owned[a[0]]) timeline("buy", {id:a[0]}); });

function impactSummary(){
  impactInit();
  const b = S.bau, now = P.netCO2(), bau = b && b.hist.length ? b.hist[b.hist.length - 1] : now;
  const parts = Object.keys(KINDS).map(k => ({k, v:Math.max(0, S.impact[k] || 0), ...KINDS[k]}));
  return {now, bau, saved:Math.max(0, bau - now), bauTemp:b ? b.temp : S.temp, parts, total:parts.reduce((s, x) => s + x.v, 0)};
}
function timelineText(e){
  const L = o => P.L(o);
  if (e.kind === "buy") return {icon:"shopping-cart", col:"accent", txt:`${L(T("อนุมัติ", "Approved"))} ${L(P.SKILL[e.id].name)}`};
  if (e.kind === "skill") return {icon:"circle-check", col:"good", txt:`${L(P.SKILL[e.id].name)} ${L(T("เสร็จสมบูรณ์", "is complete"))}`};
  if (e.kind === "ev") return {icon:"lightbulb", col:"purple", txt:`${L(e.title)} → ${L(e.label)}`};
  if (e.kind === "ms") return {icon:"flag", col:"good", txt:`${L(T("CO₂ สุทธิต่ำกว่า", "Net CO₂ below"))} ${e.v} Gt`};
  if (e.kind === "hot") return {icon:"thermometer", col:"bad", txt:`${L(T("โลกร้อนถึง", "Warming reached"))} +${e.v.toFixed(1)}°C`};
  if (e.kind === "sanct") return {icon:"ban", col:"bad", txt:`${P.cname(e.c)} ${L(T("คว่ำบาตรการค้ากับเรา", "put sanctions on us"))}`};
  return {icon:"dot", col:"muted", txt:""};
}
Object.assign(P, {IMPACT_KINDS:KINDS, impactInit, impactAdd, impactMark, impactTick, impactSummary, timeline, timelineText});
