/* Game controller: screens, actions, the month tick, keyboard shortcuts, engine hooks */
import {P, S, H, UIM, bump, ls, t} from "./core.js";
import {Audio} from "./audio.js";
import {GameMap} from "./map2d.js";
import {Gfx} from "./gfx.js";
Gfx.onAutoDrop = lv => { UIM.toastQ.push({icon:"monitor", title:t("gfxLbl"), msg:t("gfxDropped").replace("{L}", t("gfx_" + lv))}); bump(); };

const tutSeen = () => ls.get("p2050-tut") === "1";
export const G = P.Game = {
  globe:null,
  /* ---------- screens ---------- */
  toMenu(){
    if (UIM.screen === "game") P.autosave();
    Audio.stopAmb(300); Audio.setBed("space", .8); Audio.play("whoosh", {vol:.5});
    UIM.modal = null; UIM.sub = null; S.tab = null; UIM.msg = "";
    UIM.fade = true; bump();
    setTimeout(() => { UIM.screen = "menu"; UIM.fade = false; Audio.setMood("menu"); if (P.Net) P.Net.refresh(); bump(); }, 350);
  },
  /* menu → game: fly the globe down to Southeast Asia, then show the 2D map */
  enterGame(after){
    if (UIM.transition) return;
    UIM.transition = "in"; UIM.sub = null; UIM.msg = ""; bump();
    Audio.play("whoosh"); Audio.setBed(null);
    const go = () => { UIM.screen = "game"; UIM.transition = "reveal"; after && after(); bump(); setTimeout(() => { UIM.transition = null; bump(); }, 900); };
    if (this.globe && this.globe.running) this.globe.zoomTo(13, 101, go, 1500); else go();
  },
  newGame(world = false){
    UIM.placing = null;
    UIM.worldNext = !!world;
    P.newGame(S.lang);
    this.enterGame(() => {
      UIM.modal = null; UIM.charSel = UIM.charSel || S.char || "sci";
      if (!tutSeen()) this.openTutorial(0, true); else UIM.modal = "charsel";
      Audio.setMood("calm");
    });
  },
  loadSave(obj, slot){
    if (!P.validSave(obj)) return false;
    const go = () => { P.loadState(obj, slot); UIM.modal = null; UIM.hzAlert = []; Audio.setMood(Audio.gameMood()); GameMap.refresh(); GameMap.resetView(); bump(); };
    if (UIM.screen === "game"){ P.autosave(); Audio.stopAmb(300); UIM.reward = null; go(); return true; }
    this.enterGame(go);
    return true;
  },
  loadSlot(slot){ const all = P.readSaves(), s = all && all[slot]; if (!s || !this.loadSave(s.S, slot)){ UIM.msg = t("oldSave"); UIM.err = true; bump(); return false; } return true; },
  /* ---------- in-game navigation ---------- */
  selectRegion(id, zoom = false){
    Audio.play("select");
    if (S.sel !== id) S.selC = null;
    S.sel = id; S.noSel = false; S.tab = "region"; GameMap.focus(id, zoom); this.scrollDrawer(); P.changed();
  },
  selectCountry(id){
    const c = P.C(id); if (!c) return;
    Audio.play("select");
    S.sel = c.reg; S.selC = id; S.noSel = false; S.tab = "region"; GameMap.focusCountry(id); this.scrollDrawer(); P.changed();
  },
  setTab(tab){
    if (tab === "tech"){ this.openSkills(); return; }
    Audio.play(S.tab === tab ? "close" : "open");
    S.tab = S.tab === tab ? null : tab; this.scrollDrawer();
    if (S.tab === "region") S.noSel = false;
    if (S.tab === "news" && P.readNews && P.readNews()) Audio.play("coin");
    if (S.tab === "region") GameMap.focus(S.sel, false); else if (!S.tab) GameMap.recenter();
    P.changed();
  },
  closeTab(){ if (!S.tab) return; Audio.play("close"); S.tab = null; GameMap.recenter(); P.changed(); },
  scrollDrawer(){ const d = document.querySelector(".drawer .scroll"); if (d) d.scrollTop = 0; },
  openSkills(){ if (!S.started || S.over || S.event || (UIM.modal && UIM.modal !== "skills")) return; Audio.play("skillsOpen"); UIM.modal = "skills"; bump(); },
  closeSkills(){ if (UIM.modal !== "skills") return; Audio.play("skillsClose"); UIM.modal = null; bump(); },
  pause(){ if (!S.started || S.over || S.event || (UIM.modal && UIM.modal !== "skills")) return; Audio.play("pause"); UIM.prevSpeed = S.speed || 1; UIM.modal = "pause"; UIM.msg = ""; bump(); },
  resume(){ Audio.play("close"); UIM.modal = null; bump(); },
  openTutorial(start = 0, thenIntro = false){ UIM.tutI = start; UIM.thenIntro = thenIntro; UIM.tutFrom = UIM.modal; UIM.modal = "tutorial"; Audio.play("open"); bump(); },
  tutAct(a){
    const n = P.TUT.length;
    if (a === "next"){ UIM.tutI = Math.min(n - 1, UIM.tutI + 1); Audio.play("page"); }
    else if (a === "back"){ UIM.tutI = Math.max(0, UIM.tutI - 1); Audio.play("page2"); }
    else {
      if (UIM.tutI === n - 1) P.Ach.unlock("tutorial");
      ls.set("p2050-tut", "1");
      UIM.modal = UIM.thenIntro ? "charsel" : (UIM.tutFrom === "pause" ? "pause" : UIM.tutFrom === "learn" ? "learn" : null);
      Audio.play("close");
    }
    bump();
  },
  openLearn(tab){ UIM.learnFrom = UIM.modal; UIM.learnTab = tab || UIM.learnTab || "cards"; UIM.modal = "learn"; Audio.play("page"); bump(); },
  closeLearn(){ UIM.modal = UIM.learnFrom === "pause" ? "pause" : null; Audio.play("close"); bump(); },
  showStory(act){ UIM.storyAct = act; UIM.storyI = 0; UIM.storyT = performance.now(); UIM.modal = "story"; Audio.play("page"); bump(); },
  storyNext(){
    const st = P.STORY.find(a => a.act === UIM.storyAct);
    if (st && UIM.storyI < st.panels.length - 1){ UIM.storyI++; UIM.storyT = performance.now(); Audio.play(UIM.storyI % 2 ? "page2" : "page"); bump(); return; }
    UIM.modal = null; Audio.play("start"); bump();
  },
  storySkip(){ UIM.modal = null; Audio.play("close"); bump(); },
  startGame(char, mode){
    if (!P.Net.owns("char_" + char)) return;
    if (mode === "hard" && !UIM.worldNext && !P.hardUnlocked()){ UIM.msg = t("hardLockedMsg"); UIM.err = true; bump(); return; }
    const o = {mode:UIM.worldNext ? "normal" : mode, char, charLv:P.levelOf(P.Net.charXp(char)), seed:mode === "daily" && !UIM.worldNext ? P.dailySeed() : undefined, world:UIM.worldNext};
    // every game autosaves into its own slot: when all 3 are taken by other games, the player chooses which one to use
    if (o.slot === undefined && P.readSaves() !== null && !P.pickSlot(o)){ UIM.pendingStart = o; UIM.modal = "slotpick"; UIM.msg = ""; Audio.play("open"); bump(); return; }
    this.beginGame(o);
  },
  beginGame(o){
    UIM.msg = ""; UIM.modal = null; UIM.pendingStart = null; UIM.hzAlert = [];
    P.startGame(S.lang, o);
    GameMap.refresh(); GameMap.resetView(); Audio.setMood("calm", true);
  },
  /* after a win: keep playing the same world with no end year */
  continueWorld(){
    if (S.over !== "win") return;
    S.world = true; S.worldStart = S.tick; S.over = null; S.era = "heal"; S.firstNZ = S.firstNZ || S.tick; UIM.reward = null; UIM.modal = null;
    P.addLog(`[[sprout]] ${t("worldCont")}`, "gd"); P.autosave();
    Audio.stopAmb(400); Audio.setMood("calm", true); P.Ach.unlock("world1"); bump();
  },
  restart(){ Audio.stopAmb(300); UIM.reward = null; UIM.worldNext = !!S.world; S.over = null; S.started = false; P.newGame(S.lang, {mode:S.mode, char:S.char}); UIM.modal = "charsel"; GameMap.refresh(); Audio.setMood("calm"); bump(); },
  setSpeed(v){ P.setSpeed(v); },
  /* ---------- keyboard (PC): T skills · Esc close/pause · Space pause · 1/2/3 speed · H whole world · +/− zoom · R/S/N drawer tabs ---------- */
  key(name, e){
    if (UIM.screen !== "game"){
      if (name === "esc"){ if (UIM.modal === "tutorial") this.tutAct("skip"); else if (UIM.modal === "learn") this.closeLearn(); else if (UIM.sub){ UIM.sub = null; UIM.msg = ""; Audio.play("close"); bump(); } }
      return;
    }
    if (UIM.transition) return;
    const m = UIM.modal;
    if (name === "esc"){
      if (m === "pause") this.resume();
      else if (m === "tutorial") this.tutAct("skip");
      else if (m === "learn") this.closeLearn();
      else if (m === "story") this.storyNext();
      else if (m === "skills") this.closeSkills();
      else if (S.tab) this.closeTab();
      else if (!S.event && !S.over && !m) this.pause();
      return;
    }
    if (m === "story" && (name === "space" || name === "enter")){ this.storyNext(); return; }
    if (S.event && /^[123]$/.test(name)){ const i = +name - 1, ev = P.currentEvent(); if (ev && i < ev.options.length && !UIM.eventLocked() && P.affordable(ev.options[i].fx)) P.chooseOption(i); return; }
    if (name === "t"){ if (m === "skills") this.closeSkills(); else this.openSkills(); return; }
    if (m && m !== "skills") return;
    if (name === "space"){ if (S.started && !S.over && !S.event) P.setSpeed(S.speed === 0 ? (UIM.prevSpeed || 1) : (UIM.prevSpeed = S.speed, 0)); }
    else if (name === "1" || name === "2" || name === "3"){ if (S.started && !S.over) P.setSpeed(+name); }
    else if (name === "h") GameMap.resetView();
    else if (name === "+" || name === "=") GameMap.zoomBy(1.3);
    else if (name === "-") GameMap.zoomBy(1 / 1.3);
    else if (!m && name === "r") this.setTab("region");
    else if (!m && name === "s") this.setTab("stats");
    else if (!m && name === "n") this.setTab("news");
    else if (name === "f") this.fullscreen();
    bump();
  },
  fullscreen(){
    const d = document;
    try { if (d.fullscreenElement) d.exitFullscreen(); else d.documentElement.requestFullscreen({navigationUI:"hide"}).catch(() => {}); } catch(e){}
    setTimeout(bump, 300);
  },
};

window.addEventListener("keydown", e => {
  const tg = e.target, tag = tg && tg.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || (tg && tg.isContentEditable)) return;
  const map = {" ":"space", Escape:"esc", Enter:"enter"}, kk = map[e.key] || (e.key && e.key.length === 1 ? e.key.toLowerCase() : null);
  if (!kk) return;
  if (kk === "space" && UIM.screen === "game") e.preventDefault();
  if (kk === "enter" && UIM.modal !== "story") return;
  try { G.key(kk, e); } catch(err){ console.error(err); }
});

/* ---------- the clock: one game month every SPEEDS[speed] seconds ---------- */
let acc = 0, last = performance.now(), lastSec = 0;
function clock(now){
  const dt = Math.min(.25, (now - last) / 1000); last = now;
  if (UIM.screen === "game" && S.started && !S.over){
    S.realSec += dt;
    const sec = Math.floor(S.realSec); if (sec !== lastSec && UIM.modal === "pause"){ lastSec = sec; bump(); }
    if (P.running()){
      acc += dt;
      const step = P.SPEEDS[S.speed] || 4;
      if (acc >= step){ acc -= step; if (acc > step) acc = 0; P.tick(); afterTick(); }
    }
  }
  // keep redrawing while the event's choices unlock, and once more when they do (otherwise the buttons stay greyed out)
  if (S.event && UIM.evAt){ if (UIM.eventLockFrac() < 1) bump(); else if (UIM.evOpenAt !== UIM.evAt){ UIM.evOpenAt = UIM.evAt; bump(); } }
  requestAnimationFrame(clock);
}
requestAnimationFrame(clock);
P.tickProgress = () => (S.speed ? Math.min(1, acc / (P.SPEEDS[S.speed] || 4)) : 0);

/* quiet background soundscape: the clock in the last two years, otherwise the place you are zoomed into */
const PLACE_BED = {NA:"highway", EU:"street", EA:"city", SA:"jungle", MEAF:"gale", SEA:"river"};
function updateBed(){
  if (UIM.screen !== "game" || !S.started || S.over) return;
  const left = P.TOTAL_TICKS - S.tick;
  if (left <= 24) return Audio.setBed("clock", .55);
  const reg = GameMap.isCountryZoom() && S.sel ? S.sel : null;
  Audio.setBed(reg ? PLACE_BED[reg] : null, .4);
}
setInterval(updateBed, 1000);
function afterTick(){ Audio.setMood(Audio.gameMood()); updateBed(); }

/* ---------- engine hooks ---------- */
H.dirty = () => bump();
const CE_AMB = {CE_BATTERY:"factory", CE_COAL:"factory", CE_DAM:"river", CE_FOREST:"jungle", CE_CBAM:"market", CE_REFUGEE:"crowd", CE_SEABED:"underwater", CE_NUKE:"lab", CE_ARCTIC:"arctic", CE_LOSS:"office", CE_SOLARWAR:"market", CE_GEOENG:"lab", CE_MARINE:"ocean", CE_PALM:"jungle", CE_DATA:"keyboard", CE_RAIL:"train"};
H.showEvent = () => {
  if (UIM.modal === "skills" || UIM.modal === "charsel") UIM.modal = null;
  if (S.cev && CE_AMB[S.cev.id]) Audio.ambience(CE_AMB[S.cev.id]);
  UIM.evAt = performance.now(); Audio.play("question", {delay:.35, vol:.7}); bump();
  setTimeout(() => Audio.play("tick", {vol:.5}), 1500);
};
H.showEnd = () => {
  if (UIM.modal === "skills") UIM.modal = null; UIM.reward = null;
  Audio.setBed(null); Audio.setMood(S.over === "win" ? "win" : "lose", true);
  const AMB = {win:"fireworks", l1:"fire", l2:"crowd", l3:"gale"};
  setTimeout(() => { if (S.over){ Audio.ambience(AMB[S.over] || "wind", .8); if (S.over === "win") setTimeout(() => { if (S.over === "win") Audio.ambience("birds", .8); }, 9000); } }, 1200);
  bump();
};
H.closeModal = () => { if (UIM.modal === "charsel") UIM.modal = null; bump(); };
/* 1.1: a disaster forecast stops the clock (can be switched off in the pause menu) so there is time to evacuate */
export const hzPauseOn = () => ls.get("p2050-hzpause") !== "0";
const hw0 = H.hazardWarn;
H.hazardWarn = h => {
  if (hw0) hw0(h);
  if (!hzPauseOn() || UIM.screen !== "game") return;
  (UIM.hzAlert = UIM.hzAlert || []).push(h.id);
  if (S.speed){ UIM.hzPrev = S.speed; S.speed = 0; }
  bump();
};
G.hzResume = () => { UIM.hzAlert = []; if (!S.speed) P.setSpeed(UIM.hzPrev || 1); UIM.hzPrev = 0; bump(); };
H.toast = a => { UIM.toastQ.push(a); bump(); };
H.story = act => { if (UIM.modal === "skills") UIM.modal = null; G.showStory(act); };
H.gameStart = () => { G.showStory(1); if (P.Net){ P.Net.startRun(); P.Net.statStart(); } };
H.gameOver = () => { if (P.Net) P.Net.finishRun(); };
const sfx0 = H.sfx;
/* a few engine sounds get a second layer */
H.sfx = n => {
  sfx0(n);
  if (n === "buy") Audio.play("unlock", {vol:.6, delay:.08});
  else if (n === "warn") Audio.play("glitch", {vol:.35, delay:.15});
  else if (n === "year") Audio.play("bong", {vol:.5, delay:.1});
  else if (n === "spawnRed") Audio.play("drop", {vol:.6});
  else if (n === "action") Audio.play("confirm", {vol:.5, delay:.05});
};
