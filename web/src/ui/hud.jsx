/* In-game HUD: top bar (KPIs, date, speed, buttons) · character + abilities · zoom · meters · ticker + tabs */
import {useState, useEffect, useRef} from "preact/hooks";
import {P, S, UIM, t, L, up, COL, bump, isTouch} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {GameMap} from "../map2d.js";
import {Icon, Rich, plain} from "./icon.jsx";
import {IconBtn, Seg, Portrait, Meter} from "./widgets.jsx";
import {tipOpen, tipProps, showTip, hideTip, toggleTip, lastPointer} from "./tip.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* 1.1.3: numbers slide to their new value, with a short +/− flash so you see what you gained or lost */
function AnimNum({v, fmt = x => Math.floor(x)}){
  const [shown, setShown] = useState(v), [delta, setDelta] = useState(null), r = useRef({from:v, to:v, t0:0, raf:0, shown:v});
  r.current.shown = shown;
  useEffect(() => {
    const q = r.current; if (v === q.to) return;
    const d = v - q.to; q.from = q.shown; q.to = v; q.t0 = performance.now();
    if (Math.abs(d) >= 1) setDelta({d, k:q.t0});
    cancelAnimationFrame(q.raf);
    const step = now => { const p = Math.min(1, (now - q.t0) / 450), e = 1 - Math.pow(1 - p, 3); setShown(q.from + (q.to - q.from) * e); if (p < 1) q.raf = requestAnimationFrame(step); };
    q.raf = requestAnimationFrame(step);
  }, [v]);
  useEffect(() => () => cancelAnimationFrame(r.current.raf), []);
  return <>{fmt(shown)}{delta ? <i class={"kdelta " + (delta.d > 0 ? "up" : "down")} key={delta.k}>{delta.d > 0 ? "+" : "−"}{Math.abs(Math.round(delta.d))}</i> : null}</>;
}
/* 3.5: on touch screens a tooltip says how to close it */
const TapClose = () => lastPointer() === "mouse" ? null : <small class="tapclose">{S.lang === "th" ? "แตะที่ไหนก็ได้เพื่อปิด" : "Tap anywhere to close"}</small>;
/* a value in the top bar: hover (or tap) shows what it is and how to get more */
function Kpi({label, value, fmt, sub, meter, cls = "", danger, stat, tip, onClick, badge, kid}){
  const id = "kpi-" + kid, open = tipOpen(id);
  const box = <div class={`kpi ${cls} ${danger ? "danger" : ""} ${stat ? "has3d" : ""}`}>
    {stat ? <Icon n={"$" + stat} size={30} cls="k3d"/> : null}
    <span class="k">{stat ? plain(label) : <Rich t={label}/>}</span>
    <span class="v">{typeof value === "number" ? <AnimNum v={value} fmt={fmt}/> : value}</span>
    {sub && /sanct/.test(cls) ? <span class="s">{sub}</span> : null}
    {meter !== undefined ? <Meter v={meter.v} color={meter.c} h={4} cls="kmeter"/> : null}
    {badge ? <i class="kbadge">{badge}</i> : null}
  </div>;
  return <div class="kpiw" data-kpi={kid} {...tipProps(id, onClick)}>
    {onClick ? <button type="button" class="kpibtn">{box}<Icon n="chevron-down" size={14} cls="kmore"/></button> : box}
    {open && tip ? <div class="ktip glass-strong" role="tooltip"><b><Rich t={label}/></b>{sub ? <span class="mono acc">{sub}</span> : null}<span><Rich t={tip}/></span><TapClose/></div> : null}
  </div>;
}

export function TopBar(){
  const acls = S.appr < 25 ? "bad" : S.appr < 45 ? "warn" : "good";
  const has3 = P.Net && P.Net.owns("speed3");
  const sp = [{id:"sp0", icon:"pause", on:S.speed === 0, fn:() => G.setSpeed(0), title:(S.lang === "th" ? "หยุด" : "Pause") + " (Space)", sound:null}, {id:"sp1", label:"1×", on:S.speed === 1, fn:() => G.setSpeed(1), sound:null}, {id:"sp2", label:"2×", on:S.speed === 2, fn:() => G.setSpeed(2), sound:null}];
  if (has3) sp.push({id:"sp3", label:"3×", on:S.speed === 3, fn:() => G.setSpeed(3), sound:null});
  const running = P.running();
  return <header class="topbar">
    <div class="tleft">
    <div class="kpis glass">
      <Kpi kid="ep" stat="money" label={t("ep")} value={S.ep} sub={P.sanctionsCost() ? `+${P.epGain()} −${P.sanctionsCost()}` : `+${P.epGain()}${t("perMo")}`} cls={P.sanctionsCost() ? "sanct" : ""} tip={t("tipEp")}/>
      <Kpi kid="pc" stat="policy" label={t("pc")} value={S.pc} sub={`+${P.pcGain()}${t("perMo")}`} tip={t("tipPc")}/>
      {S.oreOn ? <Kpi kid="ore" stat="ore" label={t("oreLbl")} value={P.matTotal()} sub={`+${Math.round(P.oreGain())}${t("perMo")}`} cls="ore mkton" tip={t("tipOre")} onClick={() => { Audio.play("open"); UIM.modal = "market"; bump(); }}/> : null}
      <Kpi kid="appr" stat="appr" label={t("appr")} value={S.appr} fmt={x => `${x.toFixed(0)}%`} meter={{v:S.appr / 100, c:acls}} cls={"appr mkton " + acls} danger={S.appr < 25} badge={P.angryCount && P.angryCount() ? "!" : null}
        tip={S.groups ? P.GROUPS.map(G => `[[${G.icon}]] ${Math.round(S.groups[G.id])}%`).join("  ") : t("tipAppr")} onClick={() => { Audio.play("open"); UIM.modal = "politics"; bump(); }}/>
    </div>
    {S.started ? <NewsLine/> : null}
    </div>
    <div class="ctrls glass">
      <div class="date">
        <span aria-label={`${L(P.seasonOf().name)}\n${P.SEASON_TXT ? L(P.SEASON_TXT.tip[P.seasonOf().id]) : ""}`}><Icon n={P.seasonOf().icon} size={14} cls="season"/> {P.dateStr()}</span>
        <i class="month"><b key={S.tick + ":" + S.speed} style={{animationDuration:`${P.secPerMonth()}s`, animationPlayState:running ? "running" : "paused"}}/></i>
      </div>
      <Seg cls="speed" items={sp}/>
      <div class="ibtns">
        <IconBtn n="menu" title={`${t("pTitle")} (Esc)`} onClick={() => G.pause()}/>
      </div>
    </div>
  </header>;
}

/* 3.2: the newest news line sits under the money / policy / approval bar; it fades after a few seconds and comes back with the next line */
function NewsLine(){
  const lg = S.log[0], LCOL = {tc:"accent", al:"bad", gd:"good", ev:"warn", nw:"fg", in:"purple"};
  if (!lg) return null;
  return <button type="button" class="ticker glass fadeout" onClick={() => G.setTab("news")} key={S.log.length + ":" + lg.tk}>
    <Icon n="newspaper" size={14} cls="tkic"/><Rich t={lg.txt} cls={"txt " + (LCOL[lg.cls] || "fg")} iconColor="inherit"/>
  </button>;
}

/* character portrait + ability buttons */
export function AbilityBar(){
  const ch = P.CHAR[S.char]; if (!ch) return null;
  const tip = tipOpen("ab-char") ? "char" : (P.abilityList().find(a => tipOpen("ab-" + a.id)) || {}).id || null;
  const list = P.abilityList();
  const xp = P.Net ? P.Net.charXp(S.char) : 0;
  const charTp = tipProps("ab-char");
  return <aside class="abar glass">
    <button type="button" class="abar-char" {...charTp} onClick={e => { Audio.play("click"); charTp.onClick(e); }}>
      <Portrait id={S.char} size={52} lv={S.charLv}/>
    </button>
    {list.map(a => {
      const ready = P.abilityReady(a), cd = S.actCd[a.id] || 0;
      return <button type="button" key={a.id} class={`abtn ${ready ? "ready" : ""} ${a.kind}`} aria-label={L(a.name)}
        data-tip={"ab-" + a.id}
        onPointerEnter={e => { if (e.pointerType === "mouse"){ showTip("ab-" + a.id); Audio.hover(); } }}
        onPointerLeave={e => { if (e.pointerType === "mouse") hideTip("ab-" + a.id); }}
        onClick={() => { if (ready){ if (P.useAbility(a.id)){ hideTip(); Audio.play("powerup", {vol:.6}); } } else { if (lastPointer() === "mouse") showTip("ab-" + a.id); else toggleTip("ab-" + a.id); Audio.play("error"); } }}>
        <Icon n={a.lock ? "lock" : a.icon} size={20}/>
        {cd > 0 ? <><i class="cd" style={{height:`${clamp(cd / a.cd, 0, 1) * 100}%`}}/><b class="cdn">{cd}</b></> : a.lock ? <b class="lvn">Lv{a.lock}</b> : null}
      </button>;
    })}
    {tip === "char" ? <div class="tip" style={{top:0}}>
      <b>{L(ch.person)} · {L(ch.name)}</b>
      <span class="mono acc">{t("level")} {S.charLv} · XP {xp}</span>
      <span class="muted"><Rich t={`${t("passive")}: ${L(ch.pas)}`}/></span><TapClose/>
    </div> : null}
    {list.map((a, i) => tip === a.id ? <div class="tip" key={"t" + a.id} style={{top:66 + i * 54}}>
      <b>{L(a.name)}</b><span class="muted"><Rich t={L(a.desc)}/></span>
      <span class={"mono " + ((S.actCd[a.id] || a.lock) ? "warn" : "acc")}>{a.lock ? `${t("unlockAtLv")} ${a.lock}` : S.actCd[a.id] ? `${t("cooldown")} ${S.actCd[a.id]} ${t("months")}` : a.target === "country" && !(S.selC && !S.selC.startsWith("R_")) ? t("needCountry") : `${t("cooldownLen")} ${a.cd} ${t("months")}`}</span><TapClose/>
    </div> : null)}
  </aside>;
}

/* Continuous World: this season's two goals */
/* 3.1: collapsible, placed under the money / policy bar (to the right of the ability bar, so the two never overlap) */
const LS_GOALS = "p2050-goalsOpen";
const goalsOpen = () => { try { const v = localStorage.getItem(LS_GOALS); return v === null ? !isTouch() : v === "1"; } catch { return true; } };
export function WorldGoals(){
  if (!S.world) return null;
  const open = UIM.goalsOpen ?? (UIM.goalsOpen = goalsOpen());
  const toggle = () => { UIM.goalsOpen = !open; try { localStorage.setItem(LS_GOALS, UIM.goalsOpen ? "1" : "0"); } catch {} Audio.play(UIM.goalsOpen ? "open" : "close", {vol:.5}); bump(); };
  const won = S.goals ? S.goals.filter(g => g.won).length : 0;
  return <div class="wside">
    {S.goals ? <div class={"wgoals glass " + (open ? "open" : "min")}>
      <button type="button" class="wghead" onClick={toggle} aria-expanded={open}>
        <Icon n="target" size={15}/><b class="mono small">{up(t("goalsTitle"))}</b>
        <span class={"wgcount mono " + (won === S.goals.length ? "good" : "")}>{won}/{S.goals.length}</span>
        <Icon n={open ? "chevron-up" : "chevron-down"} size={15} cls="wgchev"/>
      </button>
      {open ? <>
        <small class="muted wgseason">{L(P.seasonOf().name)}</small>
        {S.goals.map((g, i) => { const d = P.GOALS.find(x => x.id === g.id); return <div class={"wg " + (g.won ? "won" : "")} key={i}>
          <Icon n={g.won ? "circle-check" : d.icon} size={17}/><span>{P.goalText(g)}</span>
        </div>; })}
      </> : null}
    </div> : null}
    <PlaceBar/>
  </div>;
}
/* phase 4: builds waiting to be placed by hand */
const KIND_ICON = {wind:"wind", solar:"sun", floatsolar:"waves", geo:"flame", nuclear:"atom"};
function PlaceBar(){
  const list = (S.toPlace || []).filter(x => x.n > 0); if (!list.length){ if (UIM.placing) UIM.placing = null; return null; }
  const T = P.PLACE_TXT, on = UIM.placing;
  return <div class={"placebar glass " + (on ? "on" : "")}>
    <b class="mono warn small"><Icon n="map-pin" size={14}/> {up(L(T.bar))}</b>
    <div class="ptoks">{list.map(x => <button type="button" key={x.k + x.sk} class={"ptok " + (on === x.k ? "on" : "")} onClick={() => { Audio.play("select"); UIM.placing = on === x.k ? null : x.k; GameMap.fxDirty = true; bump(); }}>
      <Icon n={KIND_ICON[x.k] || "map-pin"} size={16}/><span>{L(P.KIND_NAME[x.k])}</span><i class="mono">×{x.n}</i>
    </button>)}</div>
    {on ? <><small class="muted">{L(T.pick)}</small><div class="plegend"><i/><span>{L(T.poor)}</span><i class="m"/><span>{L(T.ok)}</span><i class="g"/><span>{L(T.good)}</span></div><small class="muted tiny">{L(T.note)}</small></> : null}
    <div class="row gap"><button type="button" class="linkbtn" onClick={() => { UIM.placing = null; P.placeAuto(); bump(); }}>{L(T.auto)}</button>{on ? <button type="button" class="linkbtn" onClick={() => { UIM.placing = null; bump(); }}>{L(T.done)}</button> : null}</div>
  </div>;
}

export function ZoomBtns(){
  return <div class="zoom glass">
    <IconBtn n="plus" title="Zoom in (+)" onClick={() => GameMap.zoomBy(1.35)} sound={null}/>
    <IconBtn n="minus" title="Zoom out (−)" onClick={() => GameMap.zoomBy(1 / 1.35)} sound={null}/>
    <IconBtn n="locate-fixed" title={(S.lang === "th" ? "ทั้งโลก" : "Whole world") + " (H)"} onClick={() => { GameMap.resetView(); Audio.play("whoosh", {vol:.35}); }} sound={null}/>
  </div>;
}

/* Net Zero meter: 50 Gt (left) … 0 (win, right) · Warming meter: +1.0 … +3.0 °C */
function MeterNZ(){
  const NZ_MAX = 50, net = P.netCO2(), start = 36, prev = S.hist.length > 12 ? S.hist[S.hist.length - 13].net : start, trend = net - prev;
  let proj, pcls;
  if (trend < -0.05){ const yr = 2026 + S.tick / 12 + net / -trend; proj = yr <= 2051 ? `${t("onTrack")} ${Math.floor(yr)}` : t("offTrack"); pcls = yr <= 2051 ? "good" : "bad"; }
  else { proj = t("rising"); pcls = "bad"; }
  const pos = v => clamp(v / NZ_MAX, 0, 1), cls = net <= 8 ? "good" : net <= 20 ? "warn" : "bad";
  return <div class="mtr" aria-label={`${plain(t("tipNZ"))}\n${plain(proj)}`}>
    <Rich t={`[[flag]] ${t("nzTitle")}`} cls="ttl"/>
    <div class="bar nz">
      <i class="fill" style={{width:`${(1 - pos(net)) * 100}%`}}/>
      <i class="ghost" style={{left:`${(1 - pos(start)) * 100}%`}}/>
      {S.v2 && !S.world && P.yearTarget ? (() => { const tk = Math.min(P.TOTAL_TICKS, (Math.floor(S.tick / 12) + 1) * 12), v = P.yearTarget(tk), y = 2025 + tk / 12;
        return <i class="ms next yr" style={{left:`${(1 - pos(v)) * 100}%`}} aria-label={`${L(P.UI2.yrMeter)} ${y}: CO₂ ≤ ${v.toFixed(1)} Gt`}><b>{y}</b></i>; })() : null}
      {!S.world && !S.v2 && P.MILESTONES ? P.MILESTONES.map((m, i) => { const st = (S.ms17 || {})[i], cur = st === undefined && P.MILESTONES.findIndex((q, k) => (S.ms17 || {})[k] === undefined) === i;
        return <i key={m.y} class={"ms " + (st === 1 ? "hit" : st === 0 ? "miss" : cur ? "next" : "")} style={{left:`${(1 - pos(m.v)) * 100}%`}} aria-label={`${m.y}: CO₂ ≤ ${m.v} Gt`}><b>{st === 1 ? "✓" : st === 0 ? "✕" : ""}{m.y}</b></i>; }) : null}
      <i class={"dot " + cls} style={{left:`${(1 - pos(net)) * 100}%`}}/>
      <Icon n="trophy" size={14} cls="end good"/>
    </div>
    <span class={"big " + cls}>{net.toFixed(1)}<small> Gt</small><i class={"trend " + pcls} aria-hidden="true">{pcls === "good" ? "▼" : "▲"}</i></span>
  </div>;
}
function MeterT(){
  const monthsLeft = Math.max(0, P.TOTAL_TICKS - S.tick), era = S.world && P.ERAS[S.era || "shift"], cls = S.temp >= 2.5 ? "bad" : S.temp >= 2.0 ? "hot" : S.temp >= 1.5 ? "warn" : "good";
  const foot = era ? `${L(era.name)} · ${L(era.goal)}` : `${Math.max(0, 3 - S.temp).toFixed(1)}°C ${t("toLose")} · ${t("left")} ${Math.ceil(monthsLeft / 12)} ${t("yrs")}`;
  return <div class="mtr" aria-label={`${plain(t("tipTemp"))}\n${plain(foot)}`}>
    <Rich t={`[[$temp]] ${t("tTitle")}`} cls="ttl"/>
    <div class="bar temp">
      <i class="z"/><i class="z"/><i class="z"/><i class="z"/>
      <i class={"dot " + cls} style={{left:`${clamp((S.temp - 1) / 2, 0, 1) * 100}%`}}/>
      <Icon n="triangle-alert" size={14} cls="end bad"/>
    </div>
    <span class={"big " + cls}>+{S.temp.toFixed(2)}<small>°C</small></span>
  </div>;
}
export function Bottom(){
  const tabs = [["tech", "network", "nbTech", "T"], ["region", "map", "nbRegion", "R"], ["stats", "chart-line", "nbStats", "S"], ["news", "newspaper", "nbNews", "N"]];
  const ready = P.SKILLS.filter(n => P.nodeState(n) === "ready" && P.canAfford(n)).length;
  const badge = {tech:ready, news:S.unread || 0, stats:S.report && !S.report.read ? "!" : 0};
  /* 3.3: one row at the very bottom: zoom (left) · Net Zero + warming (centre) · tabs (right) */
  return <footer class="bottom">
    <div class="row2">
      <div class="bl"><ZoomBtns/></div>
      <div class="meters glass"><MeterNZ/><MeterT/></div>
      <nav class="tabbar glass">{tabs.map(([id, ic, key, kk]) => {
        const on = id === "tech" ? UIM.modal === "skills" : S.tab === id;
        return <button type="button" key={id} data-tab={id} class={`tabbtn ${on ? "on" : ""}`} aria-label={t(key)} onPointerEnter={() => Audio.hover()} onClick={() => G.setTab(id)}>
          <Icon n={ic} size={17}/><span>{t(key)}</span>{badge[id] ? <b class={"badge " + (id === "tech" ? "" : "b2")}>{badge[id]}</b> : null}
        </button>;
      })}</nav>
    </div>
  </footer>;
}
