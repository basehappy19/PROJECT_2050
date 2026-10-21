/* In-game HUD: top bar (KPIs, date, speed, buttons) · character + abilities · zoom · meters · ticker + tabs */
import {useState} from "preact/hooks";
import {P, S, UIM, t, L, up, COL, bump} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {GameMap} from "../map2d.js";
import {Icon, Rich, plain} from "./icon.jsx";
import {IconBtn, Seg, LangSeg, Portrait, Key, Meter} from "./widgets.jsx";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function Kpi({label, value, sub, meter, cls = "", danger, stat}){
  return <div class={`kpi glass ${cls} ${danger ? "danger" : ""} ${stat ? "has3d" : ""}`}>
    {stat ? <Icon n={"$" + stat} size={30} cls="k3d"/> : null}
    <span class="k">{stat ? plain(label) : <Rich t={label}/>}</span>
    <span class="v" key={value}>{value}</span>
    {sub ? <span class="s">{sub}</span> : null}
    {meter !== undefined ? <Meter v={meter.v} color={meter.c} h={4} cls="kmeter"/> : null}
  </div>;
}

export function TopBar(){
  const acls = S.appr < 25 ? "bad" : S.appr < 45 ? "warn" : "good";
  const has3 = P.Net && P.Net.owns("speed3");
  const sp = [{id:"sp0", icon:"pause", on:S.speed === 0, fn:() => G.setSpeed(0), title:(S.lang === "th" ? "หยุด" : "Pause") + " (Space)", sound:null}, {id:"sp1", label:"1×", on:S.speed === 1, fn:() => G.setSpeed(1), sound:null}, {id:"sp2", label:"2×", on:S.speed === 2, fn:() => G.setSpeed(2), sound:null}];
  if (has3) sp.push({id:"sp3", label:"3×", on:S.speed === 3, fn:() => G.setSpeed(3), sound:null});
  const fs = !!document.fullscreenElement, running = P.running();
  return <header class="topbar">
    <div class="brand glass" onClick={() => G.pause()} title={t("pTitle")}><span>PROJECT</span><b>:</b><span>2050</span></div>
    <div class="kpis">
      <Kpi stat="money" label={t("ep")} value={Math.floor(S.ep)} sub={`+${P.epGain()}${t("perMo")}`}/>
      <Kpi stat="policy" label={t("pc")} value={Math.floor(S.pc)} sub={`+${P.pcGain()}${t("perMo")}`}/>
      {S.oreOn ? (P.isFullRes() ? <button type="button" class="kpibtn" title={S.lang === "th" ? "ตลาดแร่โลก" : "World minerals market"} onClick={() => { Audio.play("open"); UIM.modal = "market"; bump(); }}><Kpi stat="ore" label={t("oreLbl")} value={P.matTotal()} sub={`+${Math.round(P.oreGain())}${t("perMo")}`} cls="ore mkton"/></button>
        : <Kpi stat="ore" label={t("oreLbl")} value={Math.floor(S.ore || 0)} sub={`+${Math.round(P.oreGain())}${t("perMo")}`} cls="ore"/>) : null}
      <Kpi stat="appr" label={t("appr")} value={`${S.appr.toFixed(0)}%`} meter={{v:S.appr / 100, c:acls}} cls={"appr " + acls} danger={S.appr < 25}/>
    </div>
    <div class="ctrls glass">
      <div class="date">
        <span title={L(P.seasonOf().name)}><Icon n={P.seasonOf().icon} size={14} cls="season"/> {P.dateStr()}</span>
        <i class="month"><b key={S.tick + ":" + S.speed} style={{animationDuration:`${P.SPEEDS[S.speed] || 4}s`, animationPlayState:running ? "running" : "paused"}}/></i>
      </div>
      <Seg cls="speed" items={sp}/>
      <LangSeg/>
      <div class="ibtns">
        <IconBtn n={fs ? "minimize" : "maximize"} title="Fullscreen (F)" onClick={() => G.fullscreen()} cls="hide-sm"/>
        <IconBtn n={Audio.musicOn ? "music" : "music-off"} title={t("musicLbl")} onClick={() => { Audio.toggleMusic(); P._bump(); }} sound={null} cls="hide-xs"/>
        <IconBtn n={Audio.on ? "volume-2" : "volume-x"} title={t("sfxLbl")} onClick={() => { Audio.toggle(); P._bump(); }} sound={null} cls="hide-xs"/>
        <IconBtn n="menu" title={`${t("pTitle")} (Esc)`} onClick={() => G.pause()}/>
      </div>
    </div>
  </header>;
}

/* character portrait + ability buttons */
export function AbilityBar(){
  const [tip, setTip] = useState(null);
  const ch = P.CHAR[S.char]; if (!ch) return null;
  const list = P.abilityList();
  const xp = P.Net ? P.Net.charXp(S.char) : 0;
  return <aside class="abar glass" onPointerLeave={() => setTip(null)}>
    <button type="button" class="abar-char" onClick={() => { Audio.play("click"); setTip(tip === "char" ? null : "char"); }} onPointerEnter={() => setTip("char")}>
      <Portrait id={S.char} size={52} lv={S.charLv}/>
    </button>
    {list.map(a => {
      const ready = P.abilityReady(a), cd = S.actCd[a.id] || 0;
      return <button type="button" key={a.id} class={`abtn ${ready ? "ready" : ""} ${a.kind}`} aria-label={L(a.name)}
        onPointerEnter={() => { setTip(a.id); Audio.hover(); }}
        onClick={() => { if (ready){ if (P.useAbility(a.id)){ setTip(null); Audio.play("powerup", {vol:.6}); } } else { setTip(a.id); Audio.play("error"); } }}>
        <Icon n={a.lock ? "lock" : a.icon} size={20}/>
        {cd > 0 ? <><i class="cd" style={{height:`${clamp(cd / a.cd, 0, 1) * 100}%`}}/><b class="cdn">{cd}</b></> : a.lock ? <b class="lvn">Lv{a.lock}</b> : null}
      </button>;
    })}
    {tip === "char" ? <div class="tip" style={{top:0}}>
      <b>{L(ch.person)} · {L(ch.name)}</b>
      <span class="mono acc">{t("level")} {S.charLv} · XP {xp}</span>
      <span class="muted"><Rich t={`${t("passive")}: ${L(ch.pas)}`}/></span>
    </div> : null}
    {list.map((a, i) => tip === a.id ? <div class="tip" key={"t" + a.id} style={{top:66 + i * 54}}>
      <b>{L(a.name)}</b><span class="muted"><Rich t={L(a.desc)}/></span>
      <span class={"mono " + ((S.actCd[a.id] || a.lock) ? "warn" : "acc")}>{a.lock ? `${t("unlockAtLv")} ${a.lock}` : S.actCd[a.id] ? `${t("cooldown")} ${S.actCd[a.id]} ${t("months")}` : a.target === "country" && !(S.selC && !S.selC.startsWith("R_")) ? t("needCountry") : `${t("cooldownLen")} ${a.cd} ${t("months")}`}</span>
    </div> : null)}
  </aside>;
}

/* Continuous World: this season's two goals */
export function WorldGoals(){
  if (!S.world) return null;
  return <div class="wside">
    {S.goals ? <div class="wgoals glass">
      <b class="mono acc small"><Icon n="target" size={14}/> {up(t("goalsTitle"))} · {L(P.seasonOf().name)}</b>
      {S.goals.map((g, i) => { const d = P.GOALS.find(x => x.id === g.id); return <div class={"wg " + (g.won ? "won" : "")} key={i}>
        <Icon n={g.won ? "circle-check" : d.icon} size={18}/><span>{P.goalText(g)}</span>
      </div>; })}
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
  return <div class="mtr">
    <div class="mtr-h"><Rich t={`[[flag]] ${up(t("nzTitle"))}`} cls="ttl"/><span class={"big " + cls}>{net.toFixed(1)}<small> Gt</small></span></div>
    <div class="bar nz">
      <i class="fill" style={{width:`${(1 - pos(net)) * 100}%`}}/>
      <i class="ghost" style={{left:`${(1 - pos(start)) * 100}%`}}/>
      <i class={"dot " + cls} style={{left:`${(1 - pos(net)) * 100}%`}}/>
      <Icon n="trophy" size={17} cls="end good"/>
    </div>
    <div class="mtr-f"><span>{t("vs2026")} <b class={net < start ? "good" : "bad"}>{P.fmt(net - start)}</b> · {trend <= 0 ? "▼" : "▲"} <b class={trend <= 0 ? "good" : "bad"}>{P.fmt(trend)}</b>/12{t("perMo").replace("/", "")}</span><span class={pcls}>{proj}</span></div>
  </div>;
}
function MeterT(){
  const monthsLeft = Math.max(0, P.TOTAL_TICKS - S.tick), era = S.world && P.ERAS[S.era || "shift"], cls = S.temp >= 2.5 ? "bad" : S.temp >= 2.0 ? "hot" : S.temp >= 1.5 ? "warn" : "good";
  return <div class="mtr">
    <div class="mtr-h"><Rich t={`[[$temp]] ${up(t("tTitle"))}`} cls="ttl"/><span class={"big " + cls}>+{S.temp.toFixed(2)}<small>°C</small></span></div>
    <div class="bar temp">
      <i class="z"/><i class="z"/><i class="z"/><i class="z"/>
      <span class="tk" style={{left:"25%"}}>1.5</span><span class="tk" style={{left:"50%"}}>2.0</span><span class="tk" style={{left:"75%"}}>2.5</span>
      <i class={"dot " + cls} style={{left:`${clamp((S.temp - 1) / 2, 0, 1) * 100}%`}}/>
      <Icon n="triangle-alert" size={17} cls="end bad"/>
    </div>
    {era ? <div class="mtr-f"><span><Rich t={`[[${era.icon}]] ${L(era.name)}`} iconColor="accent"/></span><span class="muted">{L(era.goal)}</span></div>
      : <div class="mtr-f"><span><b class={cls}>{Math.max(0, 3 - S.temp).toFixed(2)}°C</b> {t("toLose")} (3.0°C)</span><span>{t("left")} <b>{Math.floor(monthsLeft / 12)}</b> {t("yrs")} {monthsLeft % 12} {t("months")}</span></div>}
  </div>;
}
export function Bottom(){
  const tabs = [["tech", "network", "nbTech", "T"], ["region", "map", "nbRegion", "R"], ["stats", "chart-line", "nbStats", "S"], ["news", "newspaper", "nbNews", "N"]];
  const ready = P.SKILLS.filter(n => P.nodeState(n) === "ready" && P.canAfford(n)).length;
  const lg = S.log[0], LCOL = {tc:"accent", al:"bad", gd:"good", ev:"warn", nw:"fg"};
  return <footer class="bottom">
    <div class="meters glass"><MeterNZ/><MeterT/></div>
    <div class="row2">
      <button type="button" class="ticker glass" onClick={() => G.setTab("news")} key={S.log.length + ":" + (lg && lg.tk)}>
        {lg ? <><span class="d">{P.dateStr(lg.tk)}</span><Rich t={lg.txt} cls={"txt " + (LCOL[lg.cls] || "fg")} iconColor="inherit"/></> : null}
      </button>
      <nav class="tabbar">{tabs.map(([id, ic, key, kk]) => {
        const on = id === "tech" ? UIM.modal === "skills" : S.tab === id;
        return <button type="button" key={id} class={`tabbtn glass ${on ? "on" : ""} ${id === "tech" && ready ? "pulse" : ""}`} onPointerEnter={() => Audio.hover()} onClick={() => G.setTab(id)}>
          <Icon n={ic} size={17}/><span>{up(t(key))}</span>{id === "tech" && ready ? <b class="badge">{ready}</b> : <Key k={kk}/>}
        </button>;
      })}</nav>
    </div>
  </footer>;
}
