const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.alerts) return;
(P.mods = P.mods || {}).alerts = 1;
/* =========================================================================
   2.0 alerts (same as web/src/ui/alerts.jsx), drawn on the "Alerts" layer
     · loss feed — every automatic loss (missed aid, protest, sanctions, upkeep, a decision catching up, the year) with its reason
     · disaster forecast cards — a new forecast gets a card at the top: see it on the map or evacuate straight away
     · event pill — a minimised event waits at the bottom while you look at the map (the game stays paused)
   ========================================================================= */
const {Kit, S, t, L, Audio, W, UIM, Screens} = P;
const k = Kit, H = P.H = P.H || {};
const LIVE = 6500, ALERT_LIVE = 9000;
const HZ_COL = {hurricane:"#c3a6ff", typhoon:"#c3a6ff", flood:"#8fd0ff", heat:"#ff8a3c", drought:"#f2c14e", wildfire:"#ff5a4a", saltwater:"#4fd1c5"};
const COL = Kit.COL;
const now = () => performance.now();
const n1 = v => (Math.abs(v) >= 10 ? Math.round(Math.abs(v)) : Math.abs(v).toFixed(1).replace(/\.0$/, ""));
const RECUR = {sanct:1, refinery:1, bond:1};
let lossId = 0;
const hintSeen = {};

function lossText(o){
  const T = P.UI2 || {}, nm = o.c ? P.cname(o.c) : "";
  switch (o.k){
    case "hazard": return {icon:P.HAZARDS[o.hz] ? P.HAZARDS[o.hz].icon : "cloud-lightning", col:HZ_COL[o.hz] || COL.bad, txt:`${L(P.HAZARDS[o.hz].name)} · ${nm}`, sub:o.evac ? L(T.lossEvac) : L(T.lossNoEvac)};
    case "miss": return {icon:"heart-crack", col:COL.bad, txt:`${L(T.lossMiss)} · ${nm || L(P.RMETA[o.reg].name)}`, sub:L(T.lossMissSub)};
    case "protest": return {icon:"megaphone", col:COL.hot, txt:`${L(P.GROUP[o.g].name)} · ${L(T.lossProtest)}`, sub:L(T.lossProtestSub)};
    case "upkeep": return {icon:"receipt", col:COL.warn, txt:L(T.lossUpkeep), sub:o.parts.map(p => p.k === "sanct" ? `${L(T.lossSanct)} ${P.cname(p.c)}` : p.k === "bond" ? `${L(T.lossBond)} (${p.left} ${t("moShort")})` : L(T.lossRefinery)).join(" · ")};
    case "delay": return {icon:"hourglass", col:o.good ? COL.good : COL.warn, txt:L(T.lossDelay), sub:o.title ? L(o.title) : ""};
    case "year": return {icon:o.good ? "trending-up" : "trending-down", col:o.good ? COL.good : COL.bad, txt:`${L(T.yrTitle)} ${o.y}`, sub:o.good ? L(T.yrGood) : L(T.yrBad)};
    default: return {icon:"circle-alert", col:COL.warn, txt:String(o.k), sub:""};
  }
}
/* chips: what was lost (money, policy points, approval, friendship) */
function chips(o){
  const out = [];
  if (o.ep && Math.round(o.ep)) out.push([`[[$money]]${o.ep < 0 ? "−" : "+"}${Math.round(Math.abs(o.ep))}`, o.ep < 0]);
  if (o.pc && Math.round(o.pc)) out.push([`[[$policy]]${o.pc < 0 ? "−" : "+"}${Math.round(Math.abs(o.pc))}`, o.pc < 0]);
  if (o.appr && Math.abs(o.appr) >= .05) out.push([`[[$appr]]${o.appr < 0 ? "−" : "+"}${n1(o.appr)}%`, o.appr < 0]);
  if (o.rel) out.push([`[[$heart]]${o.rel < 0 ? "−" : "+"}${Math.abs(o.rel)}`, o.rel < 0]);
  return out;
}

const Alerts = P.Alerts = {
  addLoss(o){
    if (S.training && o.k !== "hazard" && o.k !== "miss") return;
    const big = (o.ep || 0) <= -1 || (o.pc || 0) <= -1 || (o.appr || 0) <= -.2 || o.k === "delay" || o.k === "year" || (o.rel || 0) < 0;
    if (!big) return;
    const L0 = UIM.losses = UIM.losses || [], tk = S.tick;
    if (RECUR[o.k]){
      let u = L0.find(x => x.k === "upkeep" && x.tk === tk);
      if (!u){ u = {k:"upkeep", tk, ep:0, parts:[], id:++lossId, at:now()}; L0.unshift(u); }
      u.ep += o.ep || 0; u.parts.push(o);
    } else { const key = o.k + (o.evac ? "e" : ""); hintSeen[key] = (hintSeen[key] || 0) + 1; L0.unshift({...o, tk, id:++lossId, at:now(), hint:hintSeen[key] <= 2 || S.training}); }
    if (L0.length > 8) L0.length = 8;
    // where it happened: a floating number on the map
    if (o.c && (o.k === "hazard" || o.k === "miss") && P.Map && P.countryPoint){
      const pt = P.countryPoint(o.c);
      if (pt){ const bits = []; if (o.ep && Math.round(o.ep)) bits.push(`−${Math.round(-o.ep)} ${t("ep")}`); if (o.appr) bits.push(`−${n1(o.appr)}%`); if (bits.length) P.Map.floatText(pt[0], pt[1] - 30, bits.join("  "), "bad"); }
    }
    k.dirty("Alerts");
  },
  addAlert(h){ const A = UIM.alerts = UIM.alerts || []; A.unshift({id:h.id, at:now()}); if (A.length > 6) A.length = 6; k.dirty("Alerts"); },
  reset(){ UIM.losses = []; UIM.alerts = []; UIM.evMin = false; },
  /* anything on screen that fades with time? (the frame loop redraws the layer while it is) */
  busy(){
    const live = S.training ? 60000 : LIVE;
    return (UIM.losses || []).some(x => now() - x.at < live) || (UIM.alerts || []).some(a => now() - a.at < ALERT_LIVE) || !!(S.event && UIM.evMin);
  },
};
H.loss = o => Alerts.addLoss(o);
H.hazardWarn = h => { Audio.play("data", {vol:.5}); Alerts.addAlert(h); };

Screens.renderAlerts = function(l){
  if (this.kind !== "game" || !S.started) return;
  const kind = UIM.kind();
  /* ---- loss feed: bottom left, newest at the bottom ---- */
  const live = S.training ? 60000 : LIVE;
  const list = (UIM.losses || []).filter(x => now() - x.at < live && x.k !== "hazard" && x.k !== "miss").slice(0, 4);
  if (list.length && !kind){
    const w = Math.min(360, k.W - 110), x = 14;
    let y = k.H - 74;   // above the bottom row (zoom · meters · tabs)
    for (const o of list){
      const d = lossText(o), age = (now() - o.at) / live, a = age > .8 ? Math.max(0, 1 - (age - .8) / .2) : 1;
      const showSub = d.sub && (o.hint || o.k === "upkeep" || o.k === "delay");
      const cs = chips(o), chipW = cs.reduce((s, [c]) => s + k.textW(c, {font:"monoB", size:11.5}) + 8, 0);
      const tw = w - 50 - chipW - 10;
      const subH = showSub ? Math.min(2, k.text(null, d.sub, 0, 0, {size:11.5, w:tw, measure:true}).lines) * 11.5 * 1.45 : 0, h = Math.max(40, 22 + subH + 8);
      y -= h;
      const id = "loss-" + o.id;
      k.rect(l, x, y, w, h, "glass", {r:10, a:.92 * a, stroke:"line", sa:a, bg:true});
      k.rect(l, x, y + 4, 3, h - 8, d.col, {r:1.5, a});
      k.rect(l, x + 8, y + (h - 30) / 2, 30, 30, d.col, {r:8, a:.22 * a});
      k.icon(l, d.icon, x + 14, y + (h - 18) / 2, 18, d.col, a);
      k.text(l, d.txt, x + 46, y + 5, {font:"dispS", size:13, w:tw, max:1, a});
      if (showSub) k.text(l, d.sub, x + 46, y + 24, {size:11.5, color:"muted", w:tw, max:2, a});
      let cx = x + w - 8 - chipW;
      for (const [c, bad] of cs){ k.text(l, c, cx, y + (h - 18) / 2, {font:"monoB", size:11.5, color:bad ? "bad" : "good", a}); cx += k.textW(c, {font:"monoB", size:11.5}) + 8; }
      if (o.c) k.hit(l, id, x, y, w, h, () => { Audio.play("whoosh", {vol:.3}); P.Map.focusCountry(o.c); });
      y -= 6;
    }
  }
  /* ---- disaster forecast cards: top centre ---- */
  const A = (UIM.alerts || []).filter(a => now() - a.at < ALERT_LIVE).map(a => ({a, h:(S.haz || []).find(h => h.id === a.id)})).filter(q => q.h && !q.h.evac);
  if (A.length && !kind){
    const T = P.UI2, w = Math.min(520, k.W - 24), x = (k.W - w) / 2;
    let y = 70;
    const shown = A.slice(0, 2), more = A.length - shown.length;
    for (const {a, h} of shown){
      const Z = P.HAZARDS[h.type], col = HZ_COL[h.type] || COL.bad, left = Math.max(0, h.at - S.tick), cost = P.evacCost(), can = S.ep >= cost, hh = 54;
      const fade = Math.min(1, (ALERT_LIVE - (now() - a.at)) / 600);
      k.rect(l, x, y, w, hh, "panel", {r:12, stroke:col, sa:.8 * fade, a:.96 * fade, bg:true});
      k.rect(l, x, y + 5, 3, hh - 10, col, {r:1.5, a:fade});
      k.rect(l, x + 10, y + 9, 36, 36, col, {r:9, a:.22 * fade});
      k.icon(l, Z.icon, x + 16, y + 15, 24, col, fade);
      const lab = `[[siren]] ${L(T.alertEvac)} ${cost}`, bw = W.btnW(lab, {size:12.5});
      k.text(l, `${L(Z.name)} → ${P.cname(h.c)}`, x + 56, y + 8, {font:"dispS", size:14.5, w:w - 56 - bw - 50, max:1, a:fade});
      k.text(l, S.lang === "th" ? `อีก ${left} เดือน · ${L(T.alertSee)}` : `in ${left} mo · ${L(T.alertSee)}`, x + 56, y + 30, {font:"mono", size:11, color:"muted", a:fade});
      k.hit(l, "hz-see-" + a.id, x, y, w - bw - 46, hh, () => { Audio.play("whoosh", {vol:.35}); P.Map.focusCountry(h.c); });
      W.btn(l, "hz-ev-" + a.id, x + w - 40 - bw, y + (hh - 32) / 2, lab, () => { if (P.evacuate(h.id)){ Audio.play("shield"); UIM.alerts = UIM.alerts.filter(q => q.id !== h.id); k.dirty(); } }, {size:12.5, h:32, disabled:!can, sound:false});
      W.hbtn(l, "hz-x-" + a.id, x + w - 34, y + (hh - 28) / 2, "x", () => { UIM.alerts = UIM.alerts.filter(q => q.id !== h.id); k.dirty("Alerts"); }, {s:28, is:14, color:"muted"});
      y += hh + 6;
    }
    if (more > 0) k.text(l, `+${more} ${L(T.alertMore)}`, x, y, {size:11.5, color:"muted", w, align:"center"});
  }
  /* ---- minimised event: a pill above the bottom row ---- */
  const e = S.event && UIM.evMin && !S.over ? P.currentEvent() : null;
  if (e){
    const sub = L(P.UI2.evWaiting), title = L(e.title);
    const w = Math.min(k.W - 40, Math.max(k.textW(sub, {size:11}), k.textW(title, {font:"dispS", size:14})) + 100), h = 52, x = (k.W - w) / 2, y = k.H - 74 - h;
    const hov = k.isHover(l, "evpill"), pulse = .5 + .5 * Math.sin(now() / 300);
    k.rect(l, x, y, w, h, "panel", {r:26, stroke:"warn", sa:.5 + .5 * pulse, sw:hov ? 2 : 1.5, bg:true});
    k.icon(l, "siren", x + 18, y + 15, 22, "warn");
    k.text(l, sub, x + 50, y + 7, {size:11, color:"warn", w:w - 100, max:1});
    k.text(l, title, x + 50, y + 25, {font:"dispS", size:14, w:w - 100, max:1});
    k.icon(l, "maximize-2", x + w - 36, y + 16, 18, "fg");
    k.hit(l, "evpill", x, y, w, h, () => { Audio.play("open"); UIM.evMin = false; k.dirty(); });
  }
};
