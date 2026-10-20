const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.screens) return;
(P.mods = P.mods || {}).screens = 1;
/* =========================================================================
   Screens · common widgets, UI state, keyboard shortcuts, scene setup and the per-frame loop
   ========================================================================= */
const {Kit, S, t, L, UI, Audio} = P;
const k = Kit;
const H = P.H = P.H || {};

/* ---------------------------- UI state ----------------------------
   modal kinds (top = highest priority): tutorial · pause · story · skills · learn · end · event · charsel */
const EVENT_LOCK = 1.5;      // seconds before an event's choices can be pressed (stops accidental taps)
const UIM = P.UIM = {
  screen:"menu", sub:null, modal:null, msg:"", err:false, tutI:0, thenIntro:false, prevSpeed:1, codeIn:"",
  toastQ:[], toast:null, toastT:0, evAt:0, storyAct:0, storyI:0, reward:null, charSel:null, modeSel:"normal",
  kind(){
    if (this.modal === "tutorial" || this.modal === "pause" || this.modal === "learn") return this.modal;
    if (this.screen !== "game") return this.modal;
    if (this.modal === "story") return "story";
    if (S.over) return "end";
    if (S.event) return "event";
    return this.modal;   // "skills" | "charsel"
  },
  modalOpen(){ return !!this.kind(); },
  get paused(){ return this.modal === "pause"; },
  get blocking(){ return ["charsel", "pause", "tutorial", "story", "skills", "learn"].includes(this.modal); },
  eventLocked(){ return (performance.now() - this.evAt) / 1000 < EVENT_LOCK; },
  eventLockFrac(){ return Math.min(1, (performance.now() - this.evAt) / 1000 / EVENT_LOCK); },
};
const tutSeen = () => { try { return localStorage.getItem("p2050-tut") === "1"; } catch(e) { return false; } };
const tutMarkSeen = () => { try { localStorage.setItem("p2050-tut", "1"); } catch(e) {} };

/* ---------------------------- widgets ---------------------------- */
/* upper-case for English labels, keeping [[icon]] tokens intact */
P.up = s => S.lang === "en" ? String(s).split(/(\[\[[a-z0-9-]+\]\])/).map(x => /^\[\[/.test(x) ? x : x.toUpperCase()).join("") : String(s);
const W = {};
W.glass = (l, x, y, w, h, r = 10) => k.rect(l, x, y, w, h, "glass", {a:.9, r, stroke:"line", bg:true});
W.panel = (l, x, y, w, h, r = 10, fill = "panel") => k.rect(l, x, y, w, h, fill, {r, stroke:"line", bg:true});
W.card  = (l, x, y, w, h, o = {}) => k.rect(l, x, y, w, h, o.fill || "panel2", {r:o.r ?? 9, stroke:o.stroke || "line", sa:o.sa ?? 1, a:o.a ?? 1, under:true, sw:o.sw});
/* button: kind = primary | ghost | danger; returns width */
W.btn = (l, id, x, y, label, fn, o = {}) => {
  const size = o.size || 14, h = o.h || 36, font = o.font || "dispS";
  const tw = k.textW(label, {font, size}), w = o.w || Math.ceil(tw + 30);
  const dis = !!o.disabled, hov = !dis && k.isHover(l, id), kind = o.kind || "primary";
  let fill = null, stroke = "accent", col = "ink", a = 1;
  if (dis){ stroke = "line"; col = "muted"; }
  else if (kind === "primary"){ fill = hov ? k.mix("accent", "#ffffff", .25) : "accent"; }
  else if (kind === "ghost"){ fill = hov ? "accent" : null; a = .14; col = "accent"; }
  else if (kind === "danger"){ fill = hov ? k.mix("bad", "#ffffff", .2) : "bad"; stroke = "bad"; col = "#2b0603"; }
  else if (kind === "gold"){ fill = hov ? k.mix("gold", "#ffffff", .25) : "gold"; stroke = "gold"; col = "#2b1d00"; }
  if (fill != null) k.rect(l, x, y, w, h, fill, {r:8, a, stroke, bg:true}); else k.rect(l, x, y, w, h, null, {r:8, stroke, bg:true});
  k.text(l, label, x, y + (h - size * 1.45) / 2, {font, size, color:col, w, align:"center", max:1, iconColor:col});
  k.hit(l, id, x, y, w, h, () => { if (o.sound !== false) Audio.play("click"); fn(); }, {disabled:dis});
  return w;
};
W.btnW = (label, o = {}) => o.w || Math.ceil(k.textW(label, {font:o.font || "dispS", size:o.size || 14}) + 30);
W.hbtn = (l, id, x, y, icon, fn, o = {}) => {
  const s = o.s || 30, hov = k.isHover(l, id);
  k.rect(l, x, y, s, s, hov ? "panel2" : (o.fill || null), {r:7, stroke:hov ? "accent" : "line", bg:true, a:o.a ?? 1});
  const is = o.is || 16;
  k.icon(l, icon, x + (s - is) / 2, y + (s - is) / 2, is, o.color || (hov ? "accent" : "fg"));
  k.hit(l, id, x, y, s, s, fn, {disabled:o.disabled});
  return s;
};
/* segmented control: items [{id, label?, icon?, on, fn}] */
W.seg = (l, x, y, items, o = {}) => {
  const iw = o.w || 36, h = o.h || 30, w = iw * items.length;
  k.rect(l, x, y, w, h, null, {r:8, stroke:"line", bg:true});
  items.forEach((it, i) => {
    const xx = x + i * iw, hov = k.isHover(l, it.id);
    if (it.on) k.rect(l, xx + 1, y + 1, iw - 2, h - 2, "accent", {r:i === 0 ? 7 : i === items.length - 1 ? 7 : 0, bg:true});
    else if (hov) k.rect(l, xx + 1, y + 1, iw - 2, h - 2, "panel2", {r:6, bg:true});
    if (i) k.line(l, xx, y + 4, xx, y + h - 4, "line");
    const col = it.on ? "ink" : it.dis ? "line" : hov ? "fg" : "muted";
    if (it.icon) k.icon(l, it.icon, xx + (iw - 15) / 2, y + (h - 15) / 2, 15, col);
    else k.text(l, it.label, xx, y + (h - (o.size || 13) * 1.45) / 2, {font:it.on ? (o.fontOn || "monoB") : (o.font || "mono"), size:o.size || 13, color:col, w:iw, align:"center", max:1});
    k.hit(l, it.id, xx, y, iw, h, it.fn, {disabled:it.dis});
  });
  return w;
};
/* tabs with text: items [{id, label, on, fn, badge}] auto width */
W.tabs = (l, x, y, items, o = {}) => {
  const h = o.h || 32, size = o.size || 13; let cx = x;
  for (const it of items){
    const w = Math.ceil(k.textW(it.label, {font:"dispS", size})) + 28 + (it.badge ? 26 : 0), hov = k.isHover(l, it.id);
    k.rect(l, cx, y, w, h, it.on ? "accent" : hov ? "panel2" : null, {r:8, stroke:it.on || hov ? "accent" : "line", bg:true});
    k.text(l, it.label, cx + 14, y + (h - size * 1.45) / 2, {font:"dispS", size, color:it.on ? "ink" : "fg", iconColor:it.on ? "ink" : "accent"});
    if (it.badge){ const bx = cx + w - 14 - 20; k.rect(l, bx, y + (h - 18) / 2, 20, 18, it.on ? "ink" : "good", {r:9}); k.text(l, String(it.badge), bx, y + (h - 18) / 2 + 1, {font:"mono", size:11, color:it.on ? "accent" : "#04130c", w:20, align:"center"}); }
    k.hit(l, it.id, cx, y, w, h, () => { Audio.play("click"); it.fn(); });
    cx += w + (o.gap ?? 6);
  }
  return cx - x;
};
const PILL = {good:["good", "good", .4], bad:["bad", "bad", .4], acc:["accent", "accent", .4], warn:["warn", "warn", .4], gold:["gold", "gold", .5], "":["muted", "line", 1]};
W.pillW = (txt) => k.textW(txt, {font:"mono", size:11}) + 16;
W.pill = (l, x, y, txt, kind = "") => {
  const [col, st, sa] = PILL[kind] || PILL[""], w = W.pillW(txt);
  k.rect(l, x, y, w, 21, null, {r:10.5, stroke:st, sa, bg:true});
  k.text(l, txt, x + 8, y + 2, {font:"mono", size:11, color:col, iconColor:col});
  return w;
};
/* wrapping row of pills: list [{txt, kind}] → height */
W.pills = (l, x, y, maxW, list, gap = 5, measureOnly = false) => {
  let cx = x, cy = y;
  for (const p of list){
    const w = W.pillW(p.txt);
    if (cx > x && cx + w > x + maxW){ cx = x; cy += 21 + gap; }
    if (!measureOnly) W.pill(l, cx, cy, p.txt, p.kind);
    cx += w + gap;
  }
  return list.length ? cy - y + 21 : 0;
};
W.meter = (l, x, y, w, h, frac, color = "warn", bg = "panel2") => {
  k.rect(l, x, y, w, h, bg, {r:h / 2});
  const fw = Math.max(0, Math.min(1, frac)) * w;
  if (fw > 0.5) k.rect(l, x, y, Math.max(fw, h), h, color, {r:h / 2});
};
/* relation bar −100 … +100, centre line at 0 */
W.relBar = (l, x, y, w, rel) => {
  k.rect(l, x, y, w, 6, "panel2", {r:3});
  const mid = x + w / 2, f = Math.max(-1, Math.min(1, rel / 100)), col = rel >= 50 ? "good" : rel >= 0 ? "accent" : rel > -40 ? "warn" : "bad";
  if (f >= 0) k.rect(l, mid, y, Math.max(2, w / 2 * f), 6, col, {r:3}); else k.rect(l, mid + w / 2 * f, y, Math.max(2, -w / 2 * f), 6, col, {r:3});
  k.rect(l, mid - .5, y - 2, 1, 10, "muted", {a:.6});
};
W.relCol = rel => rel >= 50 ? "good" : rel >= 0 ? "accent" : rel > -40 ? "warn" : "bad";
W.slider = (l, id, x, y, w, v, onSet) => {
  const hov = k.isHover(l, id) || k.isPress(l, id);
  k.rect(l, x, y + 9, w, 4, "panel2", {r:2});
  k.rect(l, x, y + 9, Math.max(4, w * v), 4, "accent", {r:2});
  k.circle(l, x + w * v, y + 11, hov ? 8 : 7, "accent", {stroke:"#ffffff", sw:hov ? 2 : 0, sa:.6});
  k.hit(l, id, x - 8, y, w + 16, 22, null, {drag:f => onSet(Math.round(f * 20) / 20)});
};
W.check = (l, id, x, y, w, on, label, fn) => {
  const hov = k.isHover(l, id);
  k.rect(l, x, y + 1, 20, 20, on ? "accent" : null, {r:5, stroke:on || hov ? "accent" : "line", bg:true});
  if (on) k.icon(l, "check", x + 3, y + 4, 14, "ink");
  const h = k.text(l, label, x + 30, y, {size:12.5, color:"fg", w:w - 30}).h;
  k.hit(l, id, x, y, w, Math.max(22, h), () => { Audio.play("click"); fn(); });
  return Math.max(22, h);
};
/* sequence of rich-text runs on one line: [[text, opts], ...] → end x */
W.runs = (l, x, y, parts) => { let cx = x; for (const [txt, o] of parts){ if (!txt) continue; const r = k.text(l, txt, cx, y, o); cx += r.w; } return cx; };
W.runsW = parts => parts.reduce((s, [txt, o]) => s + (txt ? k.textW(txt, o) : 0), 0);
/* label for small uppercase headings */
W.h3 = (l, txt, x, y, o = {}) => k.text(l, P.up(String(txt)), x, y, {font:"dispS", size:o.size || 12, color:o.color || "muted", w:o.w});
/* character portrait in a rounded frame */
W.portrait = (l, x, y, s, charId, o = {}) => {
  const ch = P.CHAR[charId], col = o.ring || (ch ? ch.color : "#8fd0ff");
  k.rect(l, x, y, s, s, "panel2", {r:o.r ?? s / 2, stroke:col, sw:o.sw || 2, bg:true});
  const anim = charId === "adv" ? "adv" : `${charId}-${P.outfitOf ? P.outfitOf(charId) : "base"}`;
  k.sprite(l, "Portrait", anim, x + 2, y + 2, s - 4, s - 4, o.a ?? 1);
};
/* Terra amount with the coin icon */
W.terra = (l, x, y, amount, o = {}) => {
  const size = o.size || 14, is = size * 1.2;
  k.icon(l, "terra", x, y + (size * 1.45 - is) / 2, is, "#ffffff", o.a ?? 1);
  return is + 4 + k.text(l, String(amount), x + is + 4, y, {font:o.font || "monoB", size, color:o.color || "fg", a:o.a ?? 1}).w;
};
/* volume rows */
W.vol = (l, x, y, w) => {
  const row = (yy, kind, icon, iconOff, on, lv, label) => {
    W.hbtn(l, "vol-" + kind, x, yy, on && lv > 0 ? icon : iconOff, () => { if (kind === "music") Audio.toggleMusic(); else Audio.toggle(); k.dirty(); });
    k.text(l, label, x + 40, yy + 5, {size:12.5, color:"muted", w:92, max:1});
    W.slider(l, "sl-" + kind, x + 140, yy + 4, w - 140 - 52, lv, v => { Audio.setLevel(kind, v); k.dirty(); });
    k.text(l, Math.round(lv * 100) + "%", x + w - 44, yy + 6, {font:"mono", size:12, w:44, align:"right"});
  };
  row(y, "music", "music", "music-off", Audio.musicOn, Audio.lvMusic, t("musicLbl"));
  row(y + 38, "sfx", "volume-2", "volume-x", Audio.on, Audio.lvSfx, t("sfxLbl"));
  return 70;
};
W.langSeg = (l, x, y) => W.seg(l, x, y, [
  {id:"lg-th", label:"TH", on:S.lang === "th", fn:() => { Audio.play("click"); P.setLang("th"); k.dirty(); }},
  {id:"lg-en", label:"EN", on:S.lang === "en", fn:() => { Audio.play("click"); P.setLang("en"); k.dirty(); }},
], {w:40});
/* keyboard hint chip (PC) */
W.key = (l, x, y, txt) => { const w = k.textW(txt, {font:"mono", size:9.5}) + 8; k.rect(l, x, y, w, 15, null, {r:3, stroke:"line", bg:true}); k.text(l, txt, x + 4, y + 1, {font:"mono", size:9.5, color:"muted"}); return w; };
P.W = W;
const hasKeyboard = () => !(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
P.hasKeyboard = hasKeyboard;

/* ---------------------------- actions ---------------------------- */
const Screens = P.Screens = P.Screens || {};
Object.assign(Screens, {
  scene:null, kind:null,
  drawerWidth(){ return this.kind === "game" && S.tab ? 420 : 0; },
  selectRegion(id, zoom = false){
    Audio.play("select");
    if (S.sel !== id) S.selC = null;
    S.sel = id; S.tab = "region"; P.Map.focus(id, zoom); const dl = k.L("DrawerScroll"); if (dl) dl.scroll = 0; P.changed();
  },
  selectCountry(id){
    Audio.play("select");
    const c = P.C(id); if (!c) return;
    S.sel = c.reg; S.selC = id; S.tab = "region"; P.Map.focusCountry(id); const dl = k.L("DrawerScroll"); if (dl) dl.scroll = 0; P.changed();
  },
  setTab(tab){
    if (tab === "tech"){ this.openSkills(); return; }
    Audio.play(S.tab === tab ? "close" : "open");
    S.tab = S.tab === tab ? null : tab;
    const dl = k.L("DrawerScroll"); if (dl) dl.scroll = 0;
    if (S.tab === "region") P.Map.focus(S.sel, false); else if (!S.tab) P.Map.recenter();
    P.changed();
  },
  closeTab(){ Audio.play("close"); S.tab = null; P.Map.recenter(); P.changed(); },
  openSkills(){ if (!S.started || S.over || S.event || (UIM.modal && UIM.modal !== "skills")) return; Audio.play("open"); UIM.modal = "skills"; const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0; k.dirty(); },
  closeSkills(){ if (UIM.modal !== "skills") return; Audio.play("close"); UIM.modal = null; k.dirty(); },
  goScene(name){ this.scene.getVariables().get("GoTo").setString(name); },
  pause(){ if (!S.started || S.over || S.event || (UIM.modal && UIM.modal !== "skills")) return; Audio.play("pause"); UIM.prevSpeed = S.speed || 1; UIM.modal = "pause"; UIM.msg = ""; k.dirty(); },
  resume(){ UIM.modal = null; k.dirty(); },
  toMenu(){ P.autosave(); Audio.stopAmb(0); UIM.modal = null; S.tab = null; UIM.screen = "menu"; UIM.sub = null; this.goScene("Menu"); },
  openTutorial(start = 0, thenIntro = false){ UIM.tutI = start; UIM.thenIntro = thenIntro; UIM.tutFrom = UIM.modal; UIM.modal = "tutorial"; const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0; k.dirty(); },
  tutAct(a){
    const n = P.TUT.length;
    if (a === "next"){ UIM.tutI = Math.min(n - 1, UIM.tutI + 1); }
    else if (a === "back"){ UIM.tutI = Math.max(0, UIM.tutI - 1); }
    else {
      if (UIM.tutI === n - 1) P.Ach.unlock("tutorial");
      tutMarkSeen();
      UIM.modal = UIM.thenIntro ? "charsel" : (UIM.tutFrom === "pause" ? "pause" : UIM.tutFrom === "learn" ? "learn" : null);
    }
    const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0;
    k.dirty();
  },
  openLearn(tab){ UIM.learnFrom = UIM.modal; UIM.learnTab = tab || UIM.learnTab || "cards"; UIM.modal = "learn"; const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0; Audio.play("open"); k.dirty(); },
  closeLearn(){ UIM.modal = UIM.learnFrom === "pause" ? "pause" : null; Audio.play("close"); k.dirty(); },
  showStory(act){ UIM.storyAct = act; UIM.storyI = 0; UIM.storyT = performance.now(); UIM.modal = "story"; const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0; k.dirty(); },
  storyNext(){
    const st = P.STORY.find(a => a.act === UIM.storyAct);
    if (st && UIM.storyI < st.panels.length - 1){ UIM.storyI++; UIM.storyT = performance.now(); Audio.play("click"); k.dirty(); return; }
    UIM.modal = null; Audio.play("start"); k.dirty();
  },
  storySkip(){ UIM.modal = null; k.dirty(); },
  newGame(){ P.newGame(S.lang); UIM.screen = "game"; UIM.sub = null; UIM.modal = null; UIM.pendingIntro = true; this.goScene("Game"); },
  loadSave(obj){
    if (!P.loadState(obj)) return false;
    UIM.screen = "game"; UIM.sub = null; UIM.modal = null; UIM.pendingIntro = false; this.goScene("Game"); return true;
  },
  /* ---- keyboard (PC) ---- T = skills · Esc = close · Space = pause · 1/2/3 = speed · H = whole world · +/− = zoom · R = regions · S = stats · N = news */
  key(name){
    if (this.kind !== "game"){
      if (name === "esc"){ if (UIM.modal === "tutorial") this.tutAct("skip"); else if (UIM.modal === "learn") this.closeLearn(); else if (UIM.sub){ UIM.sub = null; UIM.msg = ""; k.dirty(); } }
      return;
    }
    const m = UIM.modal;
    if (name === "esc"){
      if (m === "pause") this.resume();
      else if (m === "tutorial") this.tutAct("skip");
      else if (m === "learn") this.closeLearn();
      else if (m === "story") this.storyNext();
      else if (m === "skills") this.closeSkills();
      else if (S.tab){ S.tab = null; P.Map.recenter(); P.changed(); }
      else if (!S.event && !S.over && !m) this.pause();
      return;
    }
    if (m === "story" && (name === "space" || name === "enter")){ this.storyNext(); return; }
    if (S.event && /^[123]$/.test(name)){ const i = +name - 1, e = P.currentEvent(); if (e && i < e.options.length && !UIM.eventLocked() && P.affordable(e.options[i].fx)) P.chooseOption(i); return; }
    if (name === "t"){ if (m === "skills") this.closeSkills(); else this.openSkills(); return; }
    if (m && m !== "skills") return;
    if (name === "space"){ if (S.started && !S.over && !S.event) P.setSpeed(S.speed === 0 ? (UIM.prevSpeed || 1) : (UIM.prevSpeed = S.speed, 0)); }
    else if (name === "1" || name === "2" || name === "3"){ if (S.started && !S.over) P.setSpeed(+name); }
    else if (name === "h") P.Map.resetView();
    else if (name === "+" || name === "=") P.Map.zoomBy(1.25);
    else if (name === "-") P.Map.zoomBy(1 / 1.25);
    else if (!m && name === "r") this.setTab("region");
    else if (!m && name === "s") this.setTab("stats");
    else if (!m && name === "n") this.setTab("news");
    k.dirty();
  },
  /* ---- scene setup (called from each scene's "At the beginning of the scene" event) ---- */
  setup(scene, kind){
    this.scene = scene; this.kind = kind; UIM.screen = kind === "loading" ? "menu" : kind;
    const layers = kind === "loading" ? ["Loader", "Toast"]
      : kind === "menu" ? ["MapUI", "Menu", "MenuScroll", "Modal", "ModalScroll", "Toast"]
      : ["MapUI", "HUD", "Drawer", "DrawerScroll", "Modal", "ModalScroll", "Toast"];
    k.setup(scene, layers);
    const set = (n, fn, master) => { const l = k.L(n); if (!l) return; if (fn) l.render = fn; if (master) l.master = master; };
    set("Loader", l => this.renderLoader(l));
    set("MapUI", l => this.renderMapUI(l));
    set("HUD", l => this.renderHUD(l));
    set("Drawer", l => this.renderDrawer(l)); set("DrawerScroll", null, "Drawer");
    set("Menu", l => this.renderMenu(l)); set("MenuScroll", null, "Menu");
    set("Modal", l => this.renderModal(l)); set("ModalScroll", null, "Modal");
    set("Toast", l => this.renderToast(l));
    Audio.setScene(scene);
    if (kind !== "loading") P.Map.init(scene, kind);
    if (kind === "game"){
      if (!S.started){
        UIM.modal = null; UIM.charSel = UIM.charSel || S.char || "sci";
        if (!tutSeen()) this.openTutorial(0, true); else UIM.modal = "charsel";
      } else { UIM.modal = null; P.Map.focus(S.sel, false); }
      UIM.pendingIntro = false;
    }
    if (kind === "menu"){ UIM.modal = null; UIM.sub = null; if (P.Net) P.Net.refresh(); }
    this.toastLayerSetup();
    k.dirty();
  },
  /* ---- every frame ---- */
  frame(scene){
    if (scene !== this.scene) return;
    const dt = Math.min(0.25, scene.getTimeManager().getElapsedTime() / 1000);
    k.update(scene);
    if (this.kind !== "loading") P.Map.update(dt);
    Audio.update(dt);
    this.toastUpdate(dt);
    if (this.kind === "game"){
      const v = scene.getVariables();
      v.get("Running").setNumber(P.running() ? 1 : 0);
      v.get("TickSeconds").setNumber(P.SPEEDS[S.speed] || 4);
      if (S.started && !S.over){ S.realSec += dt; const sec = Math.floor(S.realSec); if (sec !== this._sec && UIM.modal === "pause"){ this._sec = sec; k.dirty("Modal"); } }
      if (S.event && UIM.evAt && UIM.eventLockFrac() < 1){ k.dirty("Modal"); this._lockDirty = true; } else if (this._lockDirty){ this._lockDirty = false; k.dirty("Modal"); }
      if (UIM.modal === "story" && performance.now() - (UIM.storyT || 0) < 700) k.dirty("Modal");
      if (P.Net && P.Net.googleOverlay) P.Net.googleOverlay(null);
    }
    if (this.kind === "loading") this.loaderUpdate(dt);
  },
  /* mouse released: UI first. Returns 1 when the UI used the click (scene variable UIConsumed). */
  release(scene){ if (scene !== this.scene) return 1; return k.release() ? 1 : 0; },
});

/* keyboard: one listener for the whole game (ignored while typing in a text box) */
if (!P._keys){
  P._keys = true;
  window.addEventListener("keydown", e => {
    const tg = e.target, tag = tg && tg.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (tg && tg.isContentEditable)) return;
    const map = {" ":"space", Escape:"esc", Enter:"enter"}, kk = map[e.key] || (e.key.length === 1 ? e.key.toLowerCase() : null);
    if (!kk || !P.Screens || !P.Screens.scene) return;
    if (kk === "space") e.preventDefault();
    try { P.Screens.key(kk); } catch(err){ console.error(err); }
  });
}

/* hooks used by the engine */
H.dirty = () => k.dirty();
H.showEvent = () => { if (UIM.modal === "skills" || UIM.modal === "charsel") UIM.modal = null; UIM.evAt = performance.now(); const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0; k.dirty(); };
H.showEnd = () => {
  if (UIM.modal === "skills") UIM.modal = null; UIM.reward = null; const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0;
  const e = P.ENDINGS[S.over]; if (e && e.amb) setTimeout(() => { if (S.over) Audio.ambience(e.amb); }, 1200);   // each ending has its own soundscape
  k.dirty();
};
H.closeModal = () => { if (UIM.modal === "charsel") UIM.modal = null; k.dirty(); };
H.toast = a => { UIM.toastQ.push(a); };
H.story = act => { if (UIM.modal === "skills") UIM.modal = null; Screens.showStory(act); };
H.gameStart = () => { Screens.showStory(1); if (P.Net) P.Net.startRun(); };
H.gameOver = () => { if (P.Net) P.Net.finishRun(); };
H.stopAmb = () => Audio.stopAmb();
