const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.screens) return;
(P.mods = P.mods || {}).screens = 1;
/* =========================================================================
   Screens · common widgets, UI state, scene setup and the per-frame loop
   ========================================================================= */
const {Kit, S, t, L, UI, Audio} = P;
const k = Kit;
const H = P.H = P.H || {};

/* ---------------------------- UI state ---------------------------- */
const UIM = P.UIM = {
  screen:"menu", sub:null, modal:null, msg:"", err:false, tutI:0, thenIntro:false, prevSpeed:1, codeIn:"",
  toastQ:[], toast:null, toastT:0,
  kind(){
    if (this.modal === "tutorial" || this.modal === "pause") return this.modal;
    if (this.screen !== "game") return this.modal;
    if (S.over) return "end";
    if (S.event) return "event";
    return this.modal;   // "intro"
  },
  modalOpen(){ return !!this.kind(); },
  get paused(){ return this.modal === "pause"; },
  get blocking(){ return this.modal === "intro" || this.modal === "pause" || this.modal === "tutorial"; },
};
const tutSeen = () => { try { return localStorage.getItem("p2050-tut") === "1"; } catch(e) { return false; } };
const tutMarkSeen = () => { try { localStorage.setItem("p2050-tut", "1"); } catch(e) {} };

/* ---------------------------- widgets ---------------------------- */
/* upper-case for English labels, keeping [[icon]] tokens intact */
P.up = s => S.lang === "en" ? String(s).split(/(\[\[[a-z0-9-]+\]\])/).map(x => /^\[\[/.test(x) ? x : x.toUpperCase()).join("") : String(s);
const W = {};
W.glass = (l, x, y, w, h, r = 10) => k.rect(l, x, y, w, h, "glass", {a:.88, r, stroke:"line", bg:true});
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
  if (fill != null) k.rect(l, x, y, w, h, fill, {r:8, a, stroke, bg:true}); else k.rect(l, x, y, w, h, null, {r:8, stroke, bg:true});
  k.text(l, label, x, y + (h - size * 1.45) / 2, {font, size, color:col, w, align:"center", max:1});
  k.hit(l, id, x, y, w, h, () => { if (o.sound !== false) Audio.play("click"); fn(); }, {disabled:dis});
  return w;
};
W.hbtn = (l, id, x, y, icon, fn, o = {}) => {
  const s = o.s || 30, hov = k.isHover(l, id);
  k.rect(l, x, y, s, s, hov ? "panel2" : null, {r:7, stroke:hov ? "accent" : "line", bg:true});
  k.icon(l, icon, x + (s - 16) / 2, y + (s - 16) / 2, 16, o.color || (hov ? "accent" : "fg"));
  k.hit(l, id, x, y, s, s, fn);
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
    const col = it.on ? "ink" : hov ? "fg" : "muted";
    if (it.icon) k.icon(l, it.icon, xx + (iw - 15) / 2, y + (h - 15) / 2, 15, col);
    else k.text(l, it.label, xx, y + (h - 13 * 1.45) / 2, {font:it.on ? "monoB" : "mono", size:13, color:col, w:iw, align:"center"});
    k.hit(l, it.id, xx, y, iw, h, it.fn);
  });
  return w;
};
const PILL = {good:["good", "good", .4], bad:["bad", "bad", .4], acc:["accent", "accent", .4], "":["muted", "line", 1]};
W.pillW = (txt) => k.textW(txt, {font:"mono", size:11}) + 16;
W.pill = (l, x, y, txt, kind = "") => {
  const [col, st, sa] = PILL[kind] || PILL[""], w = W.pillW(txt);
  k.rect(l, x, y, w, 21, null, {r:10.5, stroke:st, sa, bg:true});
  k.text(l, txt, x + 8, y + 2, {font:"mono", size:11, color:col});
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
W.slider = (l, id, x, y, w, v, onSet) => {
  const hov = k.isHover(l, id) || k.isPress(l, id);
  k.rect(l, x, y + 9, w, 4, "panel2", {r:2});
  k.rect(l, x, y + 9, Math.max(4, w * v), 4, "accent", {r:2});
  k.circle(l, x + w * v, y + 11, hov ? 8 : 7, "accent", {stroke:"#ffffff", sw:hov ? 2 : 0, sa:.6});
  k.hit(l, id, x - 8, y, w + 16, 22, null, {drag:f => onSet(Math.round(f * 20) / 20)});
};
/* sequence of rich-text runs on one line: [[text, opts], ...] → end x */
W.runs = (l, x, y, parts) => { let cx = x; for (const [txt, o] of parts){ if (!txt) continue; const r = k.text(l, txt, cx, y, o); cx += r.w; } return cx; };
W.runsW = parts => parts.reduce((s, [txt, o]) => s + (txt ? k.textW(txt, o) : 0), 0);
/* label for small uppercase headings */
W.h3 = (l, txt, x, y, o = {}) => k.text(l, P.up(String(txt)), x, y, {font:"dispS", size:o.size || 12, color:o.color || "muted", w:o.w});
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
P.W = W;

/* ---------------------------- actions ---------------------------- */
const Screens = P.Screens = P.Screens || {};
Object.assign(Screens, {
  scene:null, kind:null,
  drawerWidth(){ return this.kind === "game" && S.tab ? (S.tab === "tech" ? 580 : 410) : 0; },
  selectRegion(id, focus = true){
    Audio.play("select");
    S.sel = id; S.tab = "region"; P.Map.focus(id); P.changed();
  },
  setTab(tab){
    Audio.play(S.tab === tab ? "close" : "open");
    S.tab = S.tab === tab ? null : tab;
    const dl = k.L("DrawerScroll"); if (dl) dl.scroll = 0;
    if (S.tab === "region") P.Map.focus(S.sel); else if (!S.tab) P.Map.recenter();
    P.changed();
  },
  closeTab(){ Audio.play("close"); S.tab = null; P.Map.recenter(); P.changed(); },
  goScene(name){ this.scene.getVariables().get("GoTo").setString(name); },
  pause(){ if (!S.started || S.over || S.event || UIM.modal) return; Audio.play("pause"); UIM.prevSpeed = S.speed || 1; UIM.modal = "pause"; UIM.msg = ""; k.dirty(); },
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
      UIM.modal = UIM.thenIntro ? "intro" : (UIM.tutFrom === "pause" ? "pause" : null);
    }
    const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0;
    k.dirty();
  },
  newGame(){ P.newGame(S.lang); UIM.screen = "game"; UIM.sub = null; UIM.modal = null; UIM.pendingIntro = true; this.goScene("Game"); },
  loadSave(obj){
    if (!P.loadState(obj)) return false;
    UIM.screen = "game"; UIM.sub = null; UIM.modal = null; UIM.pendingIntro = false; this.goScene("Game"); return true;
  },
  key(name){
    if (this.kind !== "game") { if (name === "esc" && UIM.modal === "tutorial") this.tutAct("skip"); return; }
    if (name === "space"){
      if (S.started && !S.over && !S.event && !UIM.modal){ P.setSpeed(S.speed === 0 ? 1 : 0); }
    } else if (name === "esc"){
      if (UIM.modal === "pause") this.resume();
      else if (UIM.modal === "tutorial") this.tutAct("skip");
      else if (S.tab){ S.tab = null; P.Map.recenter(); P.changed(); }
    }
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
        UIM.modal = null;
        if (!tutSeen()) this.openTutorial(0, true); else UIM.modal = "intro";
      } else { UIM.modal = null; P.Map.focus(S.sel); }
      UIM.pendingIntro = false;
    }
    if (kind === "menu"){ UIM.modal = null; UIM.sub = null; }
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
    }
    if (this.kind === "loading") this.loaderUpdate(dt);
  },
  /* mouse released: UI first. Returns 1 when the UI used the click (scene variable UIConsumed). */
  release(scene){ if (scene !== this.scene) return 1; return k.release() ? 1 : 0; },
});

/* hooks used by the engine */
H.dirty = () => k.dirty();
H.showEvent = () => { UIM.modal = UIM.modal === "intro" ? null : UIM.modal; const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0; k.dirty(); };
H.showEnd = () => { const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0; k.dirty(); };
H.closeModal = () => { if (UIM.modal === "intro") UIM.modal = null; k.dirty(); };
H.toast = a => { UIM.toastQ.push(a); };

