/* 2.0: things that used to happen silently, now shown where you can see them
   · LossFeed — every automatic loss (disaster, missed aid, protest, sanctions, upkeep, a decision catching up) with its reason
   · HazardAlerts — a new disaster forecast gets a card at the top: see it on the map or evacuate straight away
   · EventPill — a minimised event waits at the bottom while you look at the map */
import {useEffect} from "preact/hooks";
import {P, S, UIM, t, L, bump, COL, HZ_COL} from "../core.js";
import {Audio} from "../audio.js";
import {GameMap} from "../map2d.js";
import {Icon, Rich} from "./icon.jsx";
import {Btn} from "./widgets.jsx";

const LIVE = 6500;              // ms a loss line stays
const ALERT_LIVE = 9000;        // ms a forecast card stays (unless you act on it)
const now = () => performance.now();
const n1 = v => (Math.abs(v) >= 10 ? Math.round(Math.abs(v)) : Math.abs(v).toFixed(1).replace(/\.0$/, ""));

/* what was lost, as small chips */
function Chips({o}){
  const out = [];
  if (o.ep && Math.round(o.ep)) out.push(<span key="e" class={o.ep < 0 ? "bad" : "good"}><Icon n="$money" size={15}/>{o.ep < 0 ? "−" : "+"}{Math.round(Math.abs(o.ep))}</span>);
  if (o.pc && Math.round(o.pc)) out.push(<span key="p" class={o.pc < 0 ? "bad" : "good"}><Icon n="$policy" size={15}/>{o.pc < 0 ? "−" : "+"}{Math.round(Math.abs(o.pc))}</span>);
  if (o.appr && Math.abs(o.appr) >= .05) out.push(<span key="a" class={o.appr < 0 ? "bad" : "good"}><Icon n="$appr" size={15}/>{o.appr < 0 ? "−" : "+"}{n1(o.appr)}%</span>);
  if (o.rel) out.push(<span key="r" class={o.rel < 0 ? "bad" : "good"}><Icon n="$heart" size={15}/>{o.rel < 0 ? "−" : "+"}{Math.abs(o.rel)}</span>);
  return <span class="lchips">{out}</span>;
}
/* one line of text for a loss */
function lossText(o){
  const T = P.UI2 || {};
  const nm = o.c ? P.cname(o.c) : "";
  switch (o.k){
    case "hazard": return {icon:P.HAZARDS[o.hz] ? P.HAZARDS[o.hz].icon : "cloud-lightning", col:HZ_COL[o.hz] || COL.bad, txt:`${L(P.HAZARDS[o.hz].name)} · ${nm}`, sub:o.evac ? L(T.lossEvac) : L(T.lossNoEvac)};
    case "miss": return {icon:"heart-crack", col:COL.bad, txt:`${L(T.lossMiss)} · ${nm || L(P.RMETA[o.reg].name)}`, sub:L(T.lossMissSub)};
    case "protest": return {icon:"megaphone", col:COL.hot, txt:`${L(P.GROUP[o.g].name)} · ${L(T.lossProtest)}`, sub:L(T.lossProtestSub)};
    case "upkeep": return {icon:"receipt", col:COL.warn, txt:L(T.lossUpkeep), sub:o.parts.map(p => p.k === "sanct" ? `${L(T.lossSanct)} ${P.cname(p.c)}` : p.k === "bond" ? `${L(T.lossBond)} (${p.left} ${t("moShort")})` : L(T.lossRefinery)).join(" · ")};
    case "delay": return {icon:"hourglass", col:o.good ? COL.good : COL.warn, txt:L(T.lossDelay), sub:o.title ? L(o.title) : ""};
    case "vsTariff": return {icon:"ban", col:COL.bad, txt:`${o.from} · ${L(P.MP.VS.tariff.name)}`, sub:""};
    case "year": return {icon:o.good ? "trending-up" : "trending-down", col:o.good ? COL.good : COL.bad, txt:`${L(T.yrTitle)} ${o.y}`, sub:o.good ? L(T.yrGood) : L(T.yrBad)};
    default: return {icon:"circle-alert", col:COL.warn, txt:o.k, sub:""};
  }
}
const RECUR = {sanct:1, refinery:1, bond:1};
let lossId = 0;
const hintSeen = {};   // 2.1: a loss line explains itself the first two times, then stays one line
/* engine hook: collect losses (monthly running costs of one month become one line) */
export function addLoss(o){
  if (S.training && o.k !== "hazard" && o.k !== "miss") return;
  const big = (o.ep || 0) <= -1 || (o.pc || 0) <= -1 || (o.appr || 0) <= -.2 || o.k === "delay" || o.k === "year" || (o.rel || 0) < 0;
  if (!big) return;
  const L0 = UIM.losses = UIM.losses || [], tk = S.tick;
  if (RECUR[o.k]){
    let u = L0.find(x => x.k === "upkeep" && x.tk === tk);
    if (!u){ u = {k:"upkeep", tk, ep:0, parts:[], id:++lossId, at:now()}; L0.unshift(u); }
    u.ep += o.ep || 0; u.parts.push(o);
  } else { const k = o.k + (o.evac ? "e" : ""); hintSeen[k] = (hintSeen[k] || 0) + 1; L0.unshift({...o, tk, id:++lossId, at:now(), hint:hintSeen[k] <= 2 || S.training}); }
  if (L0.length > 8) L0.length = 8;
  // where it happened: a floating number on the map
  if (o.c && (o.k === "hazard" || o.k === "miss") && GameMap.active){
    const pt = GameMap.countryPoint(o.c);
    if (pt){ const bits = []; if (o.ep && Math.round(o.ep)) bits.push(`−${Math.round(-o.ep)} ${t("ep")}`); if (o.appr) bits.push(`−${n1(o.appr)}%`); if (bits.length) GameMap.floatAt(pt[0], pt[1], bits.join("  "), "bad"); }
  }
  bump();
}

export function LossFeed(){
  const live = S.training ? 60000 : LIVE;
  const list = (UIM.losses || []).filter(x => now() - x.at < live && x.k !== "hazard" && x.k !== "miss").slice(0, 4);   // 2.0: disasters show on the map only
  useEffect(() => { if (!list.length) return; const id = setTimeout(bump, 600); return () => clearTimeout(id); });
  if (!list.length) return null;
  return <div class="lossfeed" aria-live="polite">{list.map(o => {
    const d = lossText(o), age = (now() - o.at) / live;
    return <button type="button" key={o.id} class={"lossline " + (age > .8 ? "fade" : "")} style={{"--lc":d.col}}
      onClick={() => { if (o.c){ Audio.play("whoosh", {vol:.3}); GameMap.focusCountry(o.c); } }}>
      <i class="lic"><Icon n={d.icon} size={18}/></i>
      <span class="ltxt"><b>{d.txt}</b>{d.sub && (o.hint || o.k === "upkeep" || o.k === "delay") ? <small>{d.sub}</small> : null}</span>
      <Chips o={o}/>
    </button>;
  })}</div>;
}

/* engine hook: a new disaster forecast */
export function addAlert(h){
  const A = UIM.alerts = UIM.alerts || [];
  A.unshift({id:h.id, at:now()}); if (A.length > 6) A.length = 6;
  bump();
}
export function HazardAlerts(){
  const A = (UIM.alerts || []).filter(a => now() - a.at < ALERT_LIVE).map(a => ({a, h:(S.haz || []).find(h => h.id === a.id)})).filter(x => x.h && !x.h.evac);
  useEffect(() => { if (!A.length) return; const id = setTimeout(bump, 1000); return () => clearTimeout(id); });
  if (!A.length || UIM.kind()) return null;
  const T = P.UI2;
  const shown = A.slice(0, 2), more = A.length - shown.length;
  return <div class="hzalerts">{shown.map(({a, h}) => {
    const Z = P.HAZARDS[h.type], col = HZ_COL[h.type] || COL.bad, left = Math.max(0, h.at - S.tick), cost = P.evacCost(), can = S.ep >= cost;
    return <div class="hzalert glass-strong" key={a.id} style={{"--hc":col}}>
      <button type="button" class="hsee" onClick={() => GameMap.focusCountry(h.c)}>
        <i class="hic"><Icon n={Z.icon} size={24}/></i>
        <span class="htxt"><b>{L(Z.name)} → {P.cname(h.c)}</b><small>{S.lang === "th" ? `อีก ${left} เดือน` : `in ${left} mo`}</small></span>
      </button>
      <div class="hbtns">
        <Btn kind="primary" size="sm" disabled={!can} sound={null} onClick={() => { if (P.evacuate(h.id)){ Audio.play("shield"); UIM.alerts = UIM.alerts.filter(x => x.id !== h.id); bump(); } }}>{`[[siren]] ${L(T.alertEvac)} ${cost}`}</Btn>
      </div>
      {S.mp && S.mp.kind === "coop" && P.Mp && P.Mp.myRoles().includes("disaster") && (S.haz || []).filter(x => !x.evac && P.C(x.c).reg === P.C(h.c).reg).length >= 2 ?
        <Btn kind="danger" size="sm" onClick={() => P.Mp.evacAll(P.C(h.c).reg)}>{`[[users]] ${S.lang === "th" ? "อพยพทั้งภูมิภาค" : "Whole region"}`}</Btn> : null}
      <button type="button" class="hx" aria-label="close" onClick={() => { UIM.alerts = UIM.alerts.filter(x => x.id !== h.id); bump(); }}><Icon n="x" size={14}/></button>
    </div>;
  })}{more > 0 ? <small class="hzmore">+{more} {L(T.alertMore)}</small> : null}</div>;
}

/* a minimised event: the game stays paused; tap to open it again */
export function EventPill(){
  const e = P.currentEvent(); if (!e) return null;
  return <div class="evpill-wrap"><button type="button" class="evpill glass-strong" onClick={() => { Audio.play("open"); UIM.evMin = false; bump(); }}>
    <Icon n="siren" size={20} color="warn"/><span><small class="warn">{L(P.UI2.evWaiting)}</small><b>{L(e.title)}</b></span><Icon n="maximize-2" size={18}/>
  </button></div>;
}
