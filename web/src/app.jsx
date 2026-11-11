/* App root: loading card → home (3D globe) → game (2D map + HUD) with windows on top */
import {useEffect, useRef, useState} from "preact/hooks";
import {P, S, UIM, t, L, up, bump, useVersion, isTouch} from "./core.js";
import {Audio} from "./audio.js";
import {G} from "./game.js";
import {GameMap} from "./map2d.js";
import {Icon, Rich} from "./ui/icon.jsx";
import {Btn} from "./ui/widgets.jsx";
import {TopBar, AbilityBar, Bottom, WorldGoals} from "./ui/hud.jsx";
import {Drawer} from "./ui/drawer.jsx";
import {Skills} from "./ui/skills.jsx";
import {Narr} from "./narrator.js";
import {EventModal, EndModal, CharSel, Story, Pause, Tutorial, Market, SlotPick} from "./ui/modals.jsx";
import {Politics} from "./ui/politics.jsx";
import {KeysModal} from "./ui/keys.jsx";
import {Learn} from "./ui/learn.jsx";
import {Menu, ensureGlobe} from "./ui/menu.jsx";
import {LossFeed, EventPill} from "./ui/alerts.jsx";
import {YearModal, Intro} from "./ui/year.jsx";
import {Training} from "./ui/training.jsx";

/* ---------- loading (3.4: checklist of what is loading, design "L7"; 3.8: the menu's own 3D Earth, see LoadGlobe) ---------- */
const LD = {
  tag:{th:"ภารกิจกู้วิกฤตโลก · พาโลกถึง Net Zero ก่อนสิ้นปี 2050", en:"Lead the world to Net Zero before the end of 2050"},
};
const pick = a => a[Math.floor(Math.random() * a.length)], LD_POOL = P.LD_POOL;   // 3.8: random checklist lines (engine/42-loading.js)
const LOGO_SVG = <svg class="lmark" viewBox="22 22 156 156" aria-hidden="true">
  <defs>
    <radialGradient id="ldSun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffd36b"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
    <linearGradient id="ldPl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b4f7a"/><stop offset=".25" stop-color="#0a2340"/><stop offset="1" stop-color="#030a14"/></linearGradient>
    <linearGradient id="ldSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#040b1a"/><stop offset=".75" stop-color="#11324a"/><stop offset="1" stop-color="#2a6b78"/></linearGradient>
    <clipPath id="ldTile"><rect x="24" y="24" width="152" height="152" rx="38"/></clipPath>
  </defs>
  <g clip-path="url(#ldTile)">
    <rect width="200" height="200" fill="url(#ldSky)"/>
    <g fill="#fff"><circle cx="56" cy="52" r="1.6"/><circle cx="90" cy="40" r="1.2"/><circle cx="150" cy="48" r="1.8"/><circle cx="130" cy="72" r="1.2"/><circle cx="44" cy="86" r="1.2"/></g>
    <circle class="lsun" cx="100" cy="122" r="46" fill="url(#ldSun)"/>
    <circle cx="100" cy="270" r="150" fill="url(#ldPl)"/>
    <circle cx="100" cy="270" r="150" fill="none" stroke="#7ff0e4" stroke-width="4"/>
  </g>
  <rect x="24" y="24" width="152" height="152" rx="38" fill="none" stroke="#4fd1c5" stroke-opacity=".55" stroke-width="2"/>
</svg>;
/* 3.8: where the Earth sits on the loading screen: big, on the left (wide screens) or across the top (tall ones) */
function loaderFrame(gl){
  const w = window.innerWidth, h = window.innerHeight, tall = w / h <= 1;
  const c = tall ? {x:w * .5, y:h * .24, r:Math.min(w * .6, h * .29)} : {x:w * .18, y:h * .53, r:h * .555};
  const f = gl.frameOf(c.x, c.y, c.r); return [f.ox, f.oy, f.dist];
}
function LoadGlobe(){
  const ref = useRef(null);
  useEffect(() => {
    const gl = ensureGlobe(), host = ref.current;
    host.appendChild(gl.canvas); gl.resize();
    const fit = () => { if (gl.canvas.parentElement === host) gl.setFrame(...loaderFrame(gl), true); };
    fit(); window.addEventListener("resize", fit);
    gl.setHeat(0); gl.start();
    return () => { window.removeEventListener("resize", fit); if (gl.canvas.parentElement === host) gl.stop(); };
  }, []);
  return <div class="lglobe" ref={ref} aria-hidden="true"/>;
}
function Loading({leaving}){
  const [done, setDone] = useState({}), [ready, setReady] = useState(false), [lines] = useState(() => Object.fromEntries(Object.entries(LD_POOL).map(([k, a]) => [k, pick(a)])));
  /* 3.8: after "Tap to enter" the menu opens underneath and takes the Earth (menu.jsx GlobeView glides it onto its menu
     place); the text fades here, then this screen goes away */
  useEffect(() => {
    if (!leaving) return;
    const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => { UIM.leaving = false; bump(); }, still ? 400 : 1450);
    return () => clearTimeout(id);
  }, [leaving]);
  const lang = S.lang === "en" ? "en" : "th", tx = o => o[lang];
  useEffect(() => {
    const sfx = Math.min(screen.width, screen.height) < 600 ? "-s" : "";
    const get = u => fetch(u.replace("{s}", sfx)).then(r => r.blob()).catch(() => {});
    const mark = k => () => setDone(d => ({...d, [k]:true}));
    const fonts = document.fonts ? Promise.all([document.fonts.load("600 16px Kanit"), document.fonts.load("400 16px 'IBM Plex Sans Thai'"), document.fonts.load("700 16px 'Chakra Petch'")]).catch(() => {}) : Promise.resolve();
    Promise.all([
      fonts.finally(mark("fonts")),
      Promise.all([GameMap.load().catch(e => console.error(e)), get("assets/data/world-m.json")]).finally(mark("data")),
      Promise.all([get("assets/img/globe-day{s}.jpg"), get("assets/img/globe-night{s}.jpg")]).finally(mark("globe")),
      Promise.all([get("assets/img/globe-clouds{s}.jpg"), get("assets/img/ui/logo.png")]).finally(mark("clouds")),
    ]).then(() => setReady(true));
  }, []);
  const steps = ["fonts", "data", "globe", "clouds"], n = steps.filter(k => done[k]).length, active = steps.find(k => !done[k]);
  const p = ready ? 1 : n / steps.length;
  const enter = () => { if (isTouch() && document.fullscreenEnabled && !document.fullscreenElement) document.documentElement.requestFullscreen({navigationUI:"hide"}).catch(() => {}); Audio.unlock(); Audio.play("start"); Audio.setMood("menu", true); Audio.setBed("space", .8); UIM.leaving = true; UIM.screen = "menu"; bump(); };
  return <div class={`loading l7${ready ? " ready" : ""}${leaving ? " leaving" : ""}${G.globe && G.globe.ready ? " gl" : ""}`} onClick={ready && !leaving ? enter : undefined}>
    <LoadGlobe/>
    <div class="lpanel">
      <div class="lbrand">{LOGO_SVG}<small class="mono">GLOBAL CLIMATE TASKFORCE · 2026 – 2050</small></div>
      <h1>PROJECT <b>ZERO</b></h1>
      <p class="ltag">{tx(LD.tag)}</p>
      <ul class="lsteps" aria-live="polite">
        {steps.map(k => <li class={done[k] ? "ok" : k === active ? "now" : ""} key={k}><i aria-hidden="true"/>{tx(lines[k])}</li>)}
      </ul>
      <div class="lbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(p * 100)} aria-label={t("loading")}><i style={{width:`${p * 100}%`}}/></div>
      <div class="lrow mono"><span>{ready ? t("ldReady") : `${n} / ${steps.length}`}</span><span>{Math.round(p * 100)}%</span></div>
      {ready ? <Btn size="lg" sound={null} onClick={enter} cls="enter">{t("enter")}</Btn> : null}
    </div>
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
    <div><small class="warn">{up(cur.msg ? cur.title : t("achUnlocked"))}</small><b>{cur.msg ? <Rich t={cur.msg}/> : L(cur.t)}</b>{!cur.msg ? <span class="muted small">{L(cur.d)}</span> : null}</div>
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
    // 3.3: the ability bar hangs right under the money bar; goals sit under the news line
    const kp = r(q(".topbar .kpis")); if (kp) document.documentElement.style.setProperty("--kpi-b", Math.round(kp.bottom) + "px");
    GameMap.setInsets({fb:bt ? Hh - bt.top : 0, t:tb ? tb.bottom : 0, b:bt ? Hh - bt.top : 0, l:ab && !phone ? ab.right : 0, r:dr && !phone ? W - dr.left + 8 : 0, ...(phone && dr ? {b:Hh - dr.top} : {})});
  });
  return <div class={"game " + (S.tab ? "has-drawer" : "")}>
    <div class="map" ref={mapRef}/>
    <div class="hud" ref={hudRef}>
      <TopBar/>
      {S.started ? <AbilityBar/> : null}
      <WorldGoals/>
      <Drawer/>
      <Bottom/>
      {S.started ? <LossFeed/> : null}
    </div>
  </div>;
}

function Windows(){
  const k = UIM.kind();
  if (!k) return null;
  if (k === "skills") return <Skills/>;
  if (k === "event") return UIM.evMin ? <EventPill/> : <EventModal/>;
  if (k === "year") return <YearModal/>;
  if (k === "intro") return <Intro/>;
  if (k === "end") return <EndModal/>;
  if (k === "charsel") return <CharSel/>;
  if (k === "story") return <Story/>;
  if (k === "pause") return <Pause/>;
  if (k === "tutorial") return <Tutorial/>;
  if (k === "learn") return <Learn/>;
  if (k === "market") return <Market/>;
  if (k === "politics") return <Politics/>;
  if (k === "slotpick") return <SlotPick/>;
  if (k === "keys") return <KeysModal/>;
  return null;
}

export function App(){
  useVersion();
  const sc = UIM.screen;
  return <>
    {sc === "menu" ? <Menu/> : sc === "game" ? <GameScreen/> : null}
    {sc === "loading" || UIM.leaving ? <Loading leaving={!!UIM.leaving}/> : null}
    {sc !== "loading" ? <Windows/> : null}
    {sc === "game" && UIM.train ? <Training onFinish={play => G.finishTraining(play)} onQuit={() => G.quitTraining()}/> : null}
    <Toast/>
    <UpdateBar/>
    {Narr.subs && Narr.line ? <div class="subline" aria-live="polite"><span>{Narr.line}</span></div> : null}
    {UIM.transition === "in" ? <div class="flash in"/> : UIM.transition === "reveal" ? <div class="flash out"/> : null}
    {UIM.fade ? <div class="flash fade"/> : null}
  </>;
}
