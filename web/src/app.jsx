/* App root: loading card → home (3D globe) → game (2D map + HUD) with windows on top */
import {useEffect, useRef, useState} from "preact/hooks";
import {P, S, UIM, t, L, up, bump, useVersion, isTouch} from "./core.js";
import {Audio} from "./audio.js";
import {G} from "./game.js";
import {GameMap} from "./map2d.js";
import {Icon, Rich} from "./ui/icon.jsx";
import {Btn} from "./ui/widgets.jsx";
import {TopBar, AbilityBar, ZoomBtns, Bottom, WorldGoals} from "./ui/hud.jsx";
import {Drawer} from "./ui/drawer.jsx";
import {Skills} from "./ui/skills.jsx";
import {Narr} from "./narrator.js";
import {EventModal, EndModal, CharSel, Story, Pause, Tutorial, Market, Politics, SlotPick} from "./ui/modals.jsx";
import {Learn} from "./ui/learn.jsx";
import {Menu} from "./ui/menu.jsx";

/* ---------- loading ---------- */
const PRELOAD = ["assets/img/globe-day{s}.jpg", "assets/img/globe-night{s}.jpg", "assets/img/globe-clouds{s}.jpg", "assets/img/ui/logo.png", "assets/data/world.json"];
function Loading(){
  const [p, setP] = useState(0), [ready, setReady] = useState(false);
  useEffect(() => {
    const sfx = Math.min(screen.width, screen.height) < 600 ? "-s" : "";
    const list = PRELOAD.map(u => u.replace("{s}", sfx));
    let done = 0;
    const tick = () => { done++; setP(done / (list.length + 2)); };
    Promise.all([
      ...list.map(u => fetch(u).then(r => r.blob()).catch(() => {}).finally(tick)),
      document.fonts ? document.fonts.load("600 16px Kanit").then(() => document.fonts.load("400 16px 'IBM Plex Sans Thai'")).catch(() => {}).finally(tick) : Promise.resolve(tick()),
      GameMap.load().catch(e => console.error(e)).finally(tick),
    ]).then(() => { setP(1); setReady(true); });
  }, []);
  const enter = () => { if (isTouch() && document.fullscreenEnabled && !document.fullscreenElement) document.documentElement.requestFullscreen({navigationUI:"hide"}).catch(() => {}); Audio.unlock(); Audio.play("start"); Audio.setMood("menu", true); Audio.setBed("space", .8); UIM.screen = "menu"; bump(); };
  return <div class="loading" onClick={ready ? enter : undefined}>
    <img src="assets/img/ui/logo.png" alt="" class="llogo"/>
    <small class="mono acc">GLOBAL CLIMATE TASKFORCE · 2026 – 2050</small>
    <h1>PROJECT <b>ZERO</b></h1>
    <div class="lbar"><i style={{width:`${p * 100}%`}}/></div>
    <div class="lrow"><span class="muted">{ready ? t("ldReady") : `${t("loading")} · ${p < .5 ? t("ldGlobe") : t("ldImg")}`}</span><span class="mono muted">{Math.round(p * 100)}%</span></div>
    {ready ? <Btn size="lg" sound={null} onClick={enter} cls="enter">{t("enter")}</Btn> : null}
    <p class="muted small disc">{t("disclaimer")}</p>
  </div>;
}

/* ---------- toast (achievements, Terra) ---------- */
function Toast(){
  const [cur, setCur] = useState(null);
  const kind = UIM.kind();
  useEffect(() => {
    if (cur || !UIM.toastQ.length || (kind && kind !== "end")) return;
    const a = UIM.toastQ.shift(); setCur(a); Audio.play(a.msg ? "coin" : "jingle", {vol:.8});
  });
  useEffect(() => { if (!cur) return; const id = setTimeout(() => { setCur(null); bump(); }, 4600); return () => clearTimeout(id); }, [cur]);
  if (!cur) return null;
  return <div class={"toast glass-strong " + (kind === "end" ? "tl" : "")} role="status" key={cur.id || cur.title || cur.msg}>
    <span class="ticon"><Icon n={cur.icon} size={26}/></span>
    <div><small class="warn">{up(cur.msg ? cur.title : t("achUnlocked"))}</small><b>{cur.msg ? cur.msg : L(cur.t)}</b>{!cur.msg ? <span class="muted small">{L(cur.d)}</span> : null}</div>
  </div>;
}

/* ---------- 1.1.5: a new version arrived while a game is running ---------- */
function UpdateBar(){
  if (!UIM.updateReady) return null;
  return <div class="updbar glass-strong" role="status"><Icon n="sparkles" size={18} color="accent"/><span>{t("updReady")}</span>
    <Btn size="sm" onClick={() => P.updateNow()}>{t("updNow")}</Btn><Btn size="sm" kind="ghost" onClick={() => { UIM.updateReady = false; bump(); }}>{t("updLater")}</Btn></div>;
}

/* ---------- game screen ---------- */
function GameScreen(){
  const mapRef = useRef(), hudRef = useRef();
  useEffect(() => { GameMap.mount(mapRef.current); if (UIM.transition === "reveal") { GameMap.cam = {x:GameMap.regionPoint("SEA")[0], y:GameMap.regionPoint("SEA")[1], z:3.2}; } setTimeout(() => GameMap.resetView(), 60); return () => GameMap.unmount(); }, []);
  // tell the map which parts of the screen the HUD covers
  useEffect(() => {
    const q = s => document.querySelector(s), r = el => (el ? el.getBoundingClientRect() : null);
    const tb = r(q(".topbar")), bt = r(q(".bottom")), ab = r(q(".abar")), dr = r(q(".drawer")), W = window.innerWidth, Hh = window.innerHeight;
    const phone = W < 700;
    if (bt) document.documentElement.style.setProperty("--bottom-h", Math.round(Hh - bt.top) + "px");
    GameMap.setInsets({t:tb ? tb.bottom : 0, b:bt ? Hh - bt.top : 0, l:ab && !phone ? ab.right : 0, r:dr && !phone ? W - dr.left + 8 : 0, ...(phone && dr ? {b:Hh - dr.top} : {})});
  });
  return <div class={"game " + (S.tab ? "has-drawer" : "")}>
    <div class="map" ref={mapRef}/>
    <div class="hud" ref={hudRef}>
      <TopBar/>
      {S.started ? <AbilityBar/> : null}
      <WorldGoals/>
      <ZoomBtns/>
      <Drawer/>
      <Bottom/>
    </div>
  </div>;
}

function Windows(){
  const k = UIM.kind();
  if (!k) return null;
  if (k === "skills") return <Skills/>;
  if (k === "event") return <EventModal/>;
  if (k === "end") return <EndModal/>;
  if (k === "charsel") return <CharSel/>;
  if (k === "story") return <Story/>;
  if (k === "pause") return <Pause/>;
  if (k === "tutorial") return <Tutorial/>;
  if (k === "learn") return <Learn/>;
  if (k === "market") return <Market/>;
  if (k === "politics") return <Politics/>;
  if (k === "slotpick") return <SlotPick/>;
  return null;
}

export function App(){
  useVersion();
  const sc = UIM.screen;
  return <>
    {sc === "loading" ? <Loading/> : sc === "menu" ? <Menu/> : <GameScreen/>}
    {sc !== "loading" ? <Windows/> : null}
    <Toast/>
    <UpdateBar/>
    {Narr.subs && Narr.line ? <div class="subline" aria-live="polite"><span>{Narr.line}</span></div> : null}
    {UIM.transition === "in" ? <div class="flash in"/> : UIM.transition === "reveal" ? <div class="flash out"/> : null}
    {UIM.fade ? <div class="flash fade"/> : null}
  </>;
}
