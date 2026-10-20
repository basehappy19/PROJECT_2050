/* In-game 2D map (canvas, sharp at any screen density)
   Satellite base (NASA Blue Marble / Black Marble, reprojected to Robinson) + country shapes from Natural Earth 1:50m.
   Two canvases: "base" (image + country colours + borders, redrawn only when the camera or colours change)
   and "fx" (labels, hazards, bubbles, plumes, weather effects, floating numbers — every frame).
   Controls: drag = pan · wheel / pinch / buttons = zoom · double-tap / H = whole world
   Tap a region (zoomed out) = zoom into it · tap a country (zoomed in) = select it · tap the sea = close the drawer. */
import {P, S, H, UIM, t, L, COL, relCol, HZ_COL, ls, bump} from "./core.js";
import {MAP, ll} from "./geo.js";
import {Audio} from "./audio.js";
import ICONS from "./gen/icons.js";

const ZMIN = .9, ZMAX = 5, ZCOUNTRY = 1.55;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const HEAT = [[31,158,120],[217,166,43],[208,97,47],[224,48,42]];
const regionHeatValue = r => clamp(0.55 * (r.co2 / r.co2_0) + 0.35 * (r.vuln / 100) + (S.temp - 1.2) * 0.35 - 0.2, 0, 1);
const heatRGB = (v, pal = HEAT) => { const x = clamp(v, 0, .999) * (pal.length - 1), i = Math.floor(x), f = x - i, a = pal[i], b = pal[i + 1]; return [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * f)); };
P.heatRGB = heatRGB; P.regionHeatValue = regionHeatValue;

/* ---------- icon images for the canvas (lucide SVG → <img>) ---------- */
const iconImgs = new Map();
function iconImg(name, color){
  const key = name + color; let im = iconImgs.get(key);
  if (!im){
    im = new Image();
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.circle}</svg>`);
    iconImgs.set(key, im);
  }
  return im.complete && im.naturalWidth ? im : null;
}

export const GameMap = {
  el:null, base:null, fx:null, bctx:null, fctx:null, w:0, h:0, dpr:1,
  shapes:[], byCountry:{}, img:null, imgTheme:null,
  cam:{x:MAP.W / 2, y:MAP.H / 2, z:1}, target:null, s0:1, insets:{l:0, r:0, t:0, b:0},
  dirtyBase:true, floats:[], fx_:[], hits:[], hover:null, ptrs:new Map(), drag:null, pinch:null, lastTap:0, active:false,
  async load(){
    if (this.shapes.length) return;
    const j = await (await fetch("assets/data/world.json")).json();
    for (const s of j.shapes){
      const rings = s.p.map(r => { const a = new Float32Array(r.length); let x = 0, y = 0; for (let i = 0; i < r.length; i += 2){ if (i === 0){ x = r[0]; y = r[1]; } else { x += r[i]; y += r[i + 1]; } a[i] = x / 10; a[i + 1] = y / 10; } return a; });
      const path = new Path2D(); for (const r of rings){ path.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) path.lineTo(r[i], r[i + 1]); path.closePath(); }
      const sh = {name:s.n, c:s.c, r:s.r, b:s.b, l:s.l, rings, path};
      this.shapes.push(sh); if (s.c && !this.byCountry[s.c]) this.byCountry[s.c] = sh;
    }
    const regPaths = {};
    for (const sh of this.shapes){ (regPaths[sh.r] = regPaths[sh.r] || new Path2D()).addPath(sh.path); }
    this.regPaths = regPaths;
    // outline of the whole map (Robinson edge) from the edge of the texture area
    const edge = new Path2D(), N = 90;
    const {projection} = await import("./geo.js"); const pr = projection();
    for (let i = 0; i <= N; i++){ const p = pr([MAP.lon0 + 179.99, MAP.latTop - (MAP.latTop - MAP.latBot) * i / N]); i ? edge.lineTo(p[0], p[1]) : edge.moveTo(p[0], p[1]); }
    for (let i = 0; i <= N; i++){ const p = pr([MAP.lon0 - 179.99, MAP.latBot + (MAP.latTop - MAP.latBot) * i / N]); edge.lineTo(p[0], p[1]); }
    edge.closePath(); this.edge = edge;
    // CO₂ plume points
    this.plumes = [];
    for (const reg of Object.keys(P.CITIES)){ const tot = P.CITIES[reg].reduce((s, c) => s + c[2], 0); for (const [lat, lon, w, name] of P.CITIES[reg]){ const [x, y] = ll(lat, lon); this.plumes.push({reg, x, y, w:w / tot, name, ph:Math.random() * 6.28}); } }
  },
  theme(){ const v = ls.get("p2050-theme", ""); return P.Net && v && P.Net.owns("theme_" + v) ? v : ""; },
  loadImage(){
    const th = this.theme() || "day"; if (this.imgTheme === th) return;
    this.imgTheme = th;
    const big = Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1) > 1700;
    const im = new Image(); im.decoding = "async";
    im.onload = () => { if (this.imgTheme === th){ this.img = im; this.dirtyBase = true; } };
    im.src = `assets/img/map-${th === "night" ? "night" : th === "paint" ? "paint" : "day"}${big ? "" : "-s"}.jpg`;
    // load the small one first so something shows quickly
    if (big && !this.img){ const s = new Image(); s.onload = () => { if (!this.img){ this.img = s; this.dirtyBase = true; } }; s.src = im.src.replace(".jpg", "-s.jpg"); }
  },
  mount(el){
    this.el = el;
    if (!this.base){
      this.base = document.createElement("canvas"); this.base.className = "map-base";
      this.fx = document.createElement("canvas"); this.fx.className = "map-fx";
      this.bctx = this.base.getContext("2d", {alpha:false}); this.fctx = this.fx.getContext("2d");
      this.bindInput();
    }
    el.append(this.base, this.fx);
    this.loadImage();
    this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(el);
    this.resize();
    this.active = true; this.lastT = performance.now();
    const loop = () => { if (!this.active) return; this.frame(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  },
  unmount(){ this.active = false; cancelAnimationFrame(this.raf); if (this._ro) this._ro.disconnect(); this.base && this.base.remove(); this.fx && this.fx.remove(); },
  resize(){
    if (!this.el) return;
    const w = this.el.clientWidth, h = this.el.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (!w || !h) return;
    this.w = w; this.h = h; this.dpr = dpr;
    for (const c of [this.base, this.fx]){ c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + "px"; c.style.height = h + "px"; }
    this.s0 = Math.max(w / MAP.W, (h * .55) / MAP.H);
    this.clampCam(); this.dirtyBase = true;
  },
  setInsets(o){ const k = JSON.stringify(o); if (k === this._ins) return; this._ins = k; this.insets = o; },
  scale(){ return this.s0 * this.cam.z; },
  toScreen(x, y){ const s = this.scale(); return [(x - this.cam.x) * s + this.w / 2, (y - this.cam.y) * s + this.h / 2]; },
  toWorld(sx, sy){ const s = this.scale(); return [(sx - this.w / 2) / s + this.cam.x, (sy - this.h / 2) / s + this.cam.y]; },
  clampCam(){
    const s = this.scale(), hw = this.w / 2 / s, hh = this.h / 2 / s, padX = 180 / s, padY = 140 / s;
    this.cam.x = clamp(this.cam.x, Math.min(MAP.W / 2, hw - padX), Math.max(MAP.W / 2, MAP.W - hw + padX));
    this.cam.y = clamp(this.cam.y, Math.min(MAP.H / 2, hh - padY), Math.max(MAP.H / 2, MAP.H - hh + padY));
  },
  /* centre of the part of the screen not covered by the HUD / drawer */
  freeCentre(){ const i = this.insets; return [(i.l + this.w - i.r) / 2, (i.t + this.h - i.b) / 2]; },
  lookAt(x, y, z){
    const s = this.s0 * z, [fx, fy] = this.freeCentre();
    this.target = {x:x - (fx - this.w / 2) / s, y:y - (fy - this.h / 2) / s, z};
  },
  homeView(){ const [fx, fy] = this.freeCentre(), s = this.s0; return {x:MAP.W / 2 - (fx - this.w / 2) / s * .5, y:MAP.H / 2 - (fy - this.h / 2) / s * .6, z:1}; },
  resetView(){ this.target = this.homeView(); },
  recenter(){ if (this.cam.z <= 1.08) this.target = this.homeView(); },
  zoomBy(f){ const b = this.target || this.cam, z = clamp(b.z * f, ZMIN, ZMAX); const [fx, fy] = this.freeCentre(); const [wx, wy] = this.toWorld(fx, fy); this.lookAt(wx, wy, z); Audio.play("tick", {vol:.5}); },
  isCountryZoom(){ return this.cam.z >= ZCOUNTRY; },
  regionPoint(reg){ const m = P.RMETA[reg]; return ll(m.lab[0], m.lab[1]); },
  countryPoint(id){ if (!id) return null; if (id.startsWith("R_")) return this.regionPoint(id.slice(2)); const s = this.byCountry[id]; return s ? s.l : null; },
  focus(reg, zoomIn){ if (!P.RMETA[reg]) return; const [x, y] = this.regionPoint(reg); const z = zoomIn ? Math.max(this.cam.z, 1.75) : this.cam.z; this.lookAt(x, y, Math.max(z, 1)); },
  focusCountry(id){ const pt = this.countryPoint(id); if (!pt) return; const sh = this.byCountry[id]; let z = 2.4; if (sh){ const bw = sh.b[2] - sh.b[0], bh = sh.b[3] - sh.b[1], fw = this.w - this.insets.l - this.insets.r, fh = this.h - this.insets.t - this.insets.b; z = clamp(Math.min(fw * .55 / (bw * this.s0), fh * .55 / (bh * this.s0)), 1.8, 4.2); } this.lookAt(pt[0], pt[1], Math.max(this.cam.z, id.startsWith("R_") ? 1.8 : z)); },
  refresh(){ this.dirtyBase = true; this.loadImage(); },
  floatText(x, y, txt, color){ this.floats.push({x, y, txt, color, t:0}); },
  /* ---------- input ---------- */
  bindInput(){
    const c = this.fx;
    c.style.touchAction = "none";
    c.addEventListener("pointerdown", e => {
      if (UIM.kind()) return;
      c.setPointerCapture(e.pointerId);
      this.ptrs.set(e.pointerId, {x:e.offsetX, y:e.offsetY});
      if (this.ptrs.size === 1){ this.drag = {x:e.offsetX, y:e.offsetY, sx:e.offsetX, sy:e.offsetY, moved:0}; }
      else if (this.ptrs.size === 2){
        const [a, b] = [...this.ptrs.values()];
        this.pinch = {d:Math.hypot(a.x - b.x, a.y - b.y), z:this.cam.z, w:this.toWorld((a.x + b.x) / 2, (a.y + b.y) / 2)}; this.drag = null; this.target = null;
      }
    });
    c.addEventListener("pointermove", e => {
      const p = this.ptrs.get(e.pointerId);
      if (!p){ this.hoverAt(e.offsetX, e.offsetY); return; }
      p.x = e.offsetX; p.y = e.offsetY;
      if (this.pinch && this.ptrs.size >= 2){
        const [a, b] = [...this.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const z = clamp(this.pinch.z * d / Math.max(20, this.pinch.d), ZMIN, ZMAX), s = this.s0 * z;
        this.cam.z = z; this.cam.x = this.pinch.w[0] - (mx - this.w / 2) / s; this.cam.y = this.pinch.w[1] - (my - this.h / 2) / s; this.clampCam(); this.dirtyBase = true;
      } else if (this.drag){
        const dx = e.offsetX - this.drag.x, dy = e.offsetY - this.drag.y;
        this.drag.moved += Math.abs(dx) + Math.abs(dy);
        if (this.drag.moved > 6){ const s = this.scale(); this.cam.x -= dx / s; this.cam.y -= dy / s; this.target = null; this.clampCam(); this.dirtyBase = true; c.style.cursor = "grabbing"; }
        this.drag.x = e.offsetX; this.drag.y = e.offsetY;
      }
    });
    const end = e => {
      const had = this.ptrs.has(e.pointerId); this.ptrs.delete(e.pointerId);
      if (!had) return;
      if (this.pinch){ if (this.ptrs.size < 2){ this.pinch = null; this.pinchEnd = performance.now(); this.drag = null; } return; }
      const d = this.drag; this.drag = null; c.style.cursor = "";
      if (d && d.moved <= 8 && e.type === "pointerup" && performance.now() - (this.pinchEnd || 0) > 250) this.click(e.offsetX, e.offsetY);
    };
    c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end);
    c.addEventListener("pointerleave", () => { if (this.hover){ this.hover = null; } c.style.cursor = ""; });
    c.addEventListener("wheel", e => {
      if (UIM.kind()) return;
      e.preventDefault();
      const f = Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0016)), z = clamp(this.cam.z * f, ZMIN, ZMAX);
      const [wx, wy] = this.toWorld(e.offsetX, e.offsetY), s = this.s0 * z;
      this.target = null; this.cam.z = z; this.cam.x = wx - (e.offsetX - this.w / 2) / s; this.cam.y = wy - (e.offsetY - this.h / 2) / s; this.clampCam(); this.dirtyBase = true;
    }, {passive:false});
  },
  shapeAt(sx, sy){
    const [x, y] = this.toWorld(sx, sy), ctx = this.bctx;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    try { return this._shapeAt(ctx, x, y); } finally { ctx.restore(); }
  },
  _shapeAt(ctx, x, y){
    for (const sh of this.shapes){ if (x < sh.b[0] - 2 || x > sh.b[2] + 2 || y < sh.b[1] - 2 || y > sh.b[3] + 2) continue; if (ctx.isPointInPath(sh.path, x, y, "evenodd")) return sh; }
    // small islands: a little slack
    const slack = 6 / this.scale();
    for (const sh of this.shapes){ if (x < sh.b[0] - slack || x > sh.b[2] + slack || y < sh.b[1] - slack || y > sh.b[3] + slack) continue; for (const [dx, dy] of [[slack, 0], [-slack, 0], [0, slack], [0, -slack]]) if (ctx.isPointInPath(sh.path, x + dx, y + dy, "evenodd")) return sh; }
    return null;
  },
  hitAt(sx, sy){ for (let i = this.hits.length - 1; i >= 0; i--){ const h = this.hits[i]; if (sx >= h.x && sx <= h.x + h.w && sy >= h.y && sy <= h.y + h.h) return h; } return null; },
  hoverAt(sx, sy){
    if (UIM.kind() || !this.w){ this.hover = null; return; }
    const h = this.hitAt(sx, sy);
    if (h){ this.fx.style.cursor = "pointer"; if (this.hover && this.hover.hit === h.id) return; this.hover = {hit:h.id}; return; }
    const sh = this.shapeAt(sx, sy);
    this.fx.style.cursor = sh && P.RMETA[sh.r] ? "pointer" : "";
    const key = sh ? sh.name : null;
    if (!this.hover || this.hover.key !== key){ if (sh && this.hover && this.hover.key) Audio.hover(); this.hover = sh ? {key, sh, x:sx, y:sy} : null; this.dirtyBase = true; }
    else if (this.hover){ this.hover.x = sx; this.hover.y = sy; }
  },
  click(sx, sy){
    const now = performance.now();
    if (now - this.lastTap < 320 && Math.abs(sx - this.lastTapX) + Math.abs(sy - this.lastTapY) < 24){ this.lastTap = 0; this.resetView(); Audio.play("whoosh", {vol:.35}); return; }
    this.lastTap = now; this.lastTapX = sx; this.lastTapY = sy;
    const h = this.hitAt(sx, sy); if (h){ h.fn(); return; }
    const sh = this.shapeAt(sx, sy), G = P.Game;
    if (sh && P.RMETA[sh.r]){
      if (this.cam.z >= ZCOUNTRY) G.selectCountry(sh.c || "R_" + sh.r);
      else G.selectRegion(sh.r, true);
      return;
    }
    if (S.tab) G.closeTab();
  },
  /* ---------- drawing ---------- */
  frame(){
    const now = performance.now(), dt = Math.min(.05, (now - this.lastT) / 1000); this.lastT = now;
    if (this.target){
      const k = 1 - Math.pow(.86, dt * 60), T = this.target;
      this.cam.x += (T.x - this.cam.x) * k; this.cam.y += (T.y - this.cam.y) * k; this.cam.z += (T.z - this.cam.z) * k;
      if (Math.abs(T.x - this.cam.x) < .3 && Math.abs(T.y - this.cam.y) < .3 && Math.abs(T.z - this.cam.z) < .002){ Object.assign(this.cam, T); this.target = null; this.clampCam(); }
      this.dirtyBase = true;
    }
    const zc = this.cam.z >= ZCOUNTRY; if (zc !== this._zc){ this._zc = zc; bump(); }
    const moved = this.dirtyBase;
    if (this.dirtyBase){ this.drawBase(); this.dirtyBase = false; }
    // the overlay animates gently; when nothing is happening draw it at half rate to save battery
    const busy = moved || this.fx_.length || this.floats.length || (this.parts && this.parts.length) || (S.haz && S.haz.length) || (S.bubbles && S.bubbles.length) || this.hover;
    this._f = (this._f || 0) + 1;
    if (busy || this._f % 2 === 0) this.drawFx(busy ? dt : dt * 2, now / 1000);
  },
  drawBase(){
    const c = this.bctx, d = this.dpr, s = this.scale();
    c.setTransform(d, 0, 0, d, 0, 0);
    c.fillStyle = COL.bg; c.fillRect(0, 0, this.w, this.h);
    c.setTransform(d * s, 0, 0, d * s, d * (this.w / 2 - this.cam.x * s), d * (this.h / 2 - this.cam.y * s));
    const px = 1 / s;   // one CSS pixel in map units
    // glow around the map edge
    if (this.edge){ c.fillStyle = "#08202a"; c.fill(this.edge); c.lineJoin = "round"; for (const [w, a] of [[16, .05], [8, .08], [3, .14]]){ c.strokeStyle = `rgba(79,209,197,${a})`; c.lineWidth = w * px; c.stroke(this.edge); } }
    if (this.img){ c.save(); if (this.edge) c.clip(this.edge); c.imageSmoothingQuality = "high"; c.drawImage(this.img, 0, 0, MAP.W, MAP.H); c.restore(); }
    if (!S.regions) return;
    const th = this.theme(), zc = this.cam.z >= ZCOUNTRY, sel = S.sel, selC = S.selC;
    const aBase = th === "night" ? .18 : th === "paint" ? .26 : .2;
    const regCol = {};
    for (const r of S.regions) regCol[r.id] = heatRGB(regionHeatValue(r));
    // region heat tint
    for (const reg of Object.keys(this.regPaths)){
      const col = regCol[reg]; if (!col) continue;
      const on = reg === sel;
      c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${on ? aBase + .1 : (sel && zc ? aBase * .55 : aBase)})`;
      c.fill(this.regPaths[reg], "evenodd");
    }
    // countries: borders (fade in with zoom)
    const bAlpha = clamp((this.cam.z - .95) / .7, .25, 1);
    c.lineJoin = "round";
    c.strokeStyle = `rgba(4,16,12,${.55 * bAlpha})`; c.lineWidth = 1.1 * px;
    for (const sh of this.shapes) c.stroke(sh.path);
    c.strokeStyle = `rgba(230,255,250,${.16 * bAlpha})`; c.lineWidth = .6 * px;
    for (const sh of this.shapes) c.stroke(sh.path);
    // selected region outline
    if (sel && this.regPaths[sel]){
      const rs = this.shapes.filter(sh => sh.r === sel);
      if (!zc){ c.strokeStyle = "rgba(79,209,197,.22)"; c.lineWidth = 5 * px; for (const sh of rs) c.stroke(sh.path); }
      c.strokeStyle = zc ? "rgba(79,209,197,.55)" : "rgba(160,255,245,.9)"; c.lineWidth = (zc ? 1.2 : 1.6) * px;
      for (const sh of rs) c.stroke(sh.path);
    }
    // hover
    if (this.hover && this.hover.sh){
      const hs = this.hover.sh, list = zc ? [hs] : this.shapes.filter(x => x.r === hs.r);
      c.fillStyle = "rgba(255,255,255,.08)"; for (const sh of list) c.fill(sh.path, "evenodd");
      c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 1.2 * px; for (const sh of list) c.stroke(sh.path);
    }
    // selected country
    if (selC){
      const list = selC.startsWith("R_") ? this.shapes.filter(x => !x.c && x.r === selC.slice(2)) : this.shapes.filter(x => x.c === selC);
      c.fillStyle = "rgba(79,209,197,.28)"; for (const sh of list) c.fill(sh.path, "evenodd");
      c.strokeStyle = "rgba(79,209,197,.35)"; c.lineWidth = 6 * px; for (const sh of list) c.stroke(sh.path);
      c.strokeStyle = "#e6fffb"; c.lineWidth = 2 * px; for (const sh of list) c.stroke(sh.path);
    }
    // warming haze over the whole map
    const warm = clamp((S.temp - 1.4) / 1.4, 0, 1);
    if (warm > 0){ c.setTransform(d, 0, 0, d, 0, 0); c.fillStyle = `rgba(255,90,40,${warm * .12})`; c.fillRect(0, 0, this.w, this.h); }
  },
  pill(x, y, text, o = {}){
    const c = this.fctx; c.font = o.font || "600 11.5px 'IBM Plex Sans Thai', 'Kanit', sans-serif";
    const tw = c.measureText(text).width, padL = o.dot || o.icon ? 22 : 9, w = tw + padL + 9 + (o.extraW || 0), h = o.h || 22;
    const bx = Math.round(x - w / 2), by = Math.round(y - h / 2);
    c.fillStyle = o.bg || "rgba(6,16,21,.82)"; c.beginPath(); c.roundRect(bx, by, w, h, h / 2); c.fill();
    if (o.stroke){ c.strokeStyle = o.stroke; c.lineWidth = o.sw || 1; c.stroke(); }
    if (o.dot){ c.fillStyle = o.dot; c.beginPath(); c.arc(bx + 12, by + h / 2, 3.6, 0, Math.PI * 2); c.fill(); }
    if (o.icon){ const im = iconImg(o.icon, o.iconColor || COL.accent); if (im) c.drawImage(im, bx + 5, by + h / 2 - 7, 14, 14); }
    c.fillStyle = o.color || COL.fg; c.textBaseline = "middle"; c.fillText(text, bx + padL, by + h / 2 + .5);
    return {x:bx, y:by, w, h, tw};
  },
  drawFx(dt, now){
    const c = this.fctx, d = this.dpr; this.hits = [];
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, this.w, this.h);
    if (!S.regions || !this.plumes) return;
    const s = this.scale(), zc = this.cam.z >= ZCOUNTRY, G = P.Game;
    const vis = (x, y, m = 40) => x > this.insets.l - m && x < this.w - this.insets.r + m && y > this.insets.t - m && y < this.h - this.insets.b + m;
    // CO₂ plumes (glowing smog over the big emitters)
    c.globalCompositeOperation = "lighter";
    for (const p of this.plumes){
      const r = S.regions.find(q => q.id === p.reg); if (!r) continue;
      const amt = r.co2 * p.w; if (amt < .02) continue;
      const [x, y] = this.toScreen(p.x, p.y); if (!vis(x, y, 80)) continue;
      const rad = (8 + Math.sqrt(amt) * 26) * Math.sqrt(this.cam.z) * (1 + .08 * Math.sin(now * 1.7 + p.ph));
      const g = c.createRadialGradient(x, y, 0, x, y, rad), hot = clamp(r.co2 / r.co2_0, 0, 1.3);
      g.addColorStop(0, `rgba(255,${Math.round(150 - hot * 70)},40,${.42 * Math.min(1, hot + .2)})`); g.addColorStop(.45, `rgba(255,${Math.round(110 - hot * 50)},30,${.14 * Math.min(1, hot + .2)})`); g.addColorStop(1, "rgba(255,80,20,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
    }
    c.globalCompositeOperation = "source-over";
    // labels
    if (!zc){
      for (const r of S.regions){
        const [wx, wy] = this.regionPoint(r.id), [x, y] = this.toScreen(wx, wy); if (!vis(x, y)) continue;
        const sel = S.sel === r.id, txt = `${r.id}  ${r.co2.toFixed(1)} Gt`;
        const hov = this.hover && this.hover.hit === "lab-" + r.id;
        const b = this.pill(x, y, txt, {font:"600 12px 'IBM Plex Mono', monospace", h:24, stroke:sel || hov ? COL.accent : "rgba(79,209,197,.25)", sw:sel ? 1.5 : 1, icon:S.alli[r.id] ? "handshake" : null, iconColor:COL.good, bg:sel ? "rgba(8,40,40,.9)" : undefined});
        this.hits.push({id:"lab-" + r.id, ...b, fn:() => G.selectRegion(r.id, true)});
      }
    } else {
      c.font = "600 11px 'IBM Plex Sans Thai', sans-serif";
      for (const cc of S.countries){
        if (cc.rest) continue;
        const sh = this.byCountry[cc.id]; if (!sh) continue;
        const [x, y] = this.toScreen(sh.l[0], sh.l[1]); if (!vis(x, y, 0)) continue;
        const big = P.COUNTRY[cc.id].w >= 250 || this.cam.z > 2.3 || S.selC === cc.id; if (!big) continue;
        const nm = L((P.SHORT && P.SHORT[cc.id]) || P.COUNTRY[cc.id].name), sel = S.selC === cc.id;
        const b = this.pill(x, y, nm, {h:20, dot:COL[relCol(cc.rel)], stroke:sel ? COL.accent : null, color:sel ? COL.accent : COL.fg, bg:sel ? "rgba(6,16,21,.94)" : "rgba(6,16,21,.68)"});
        this.hits.push({id:"cl-" + cc.id, ...b, fn:() => G.selectCountry(cc.id)});
      }
    }
    // hazard forecasts: pulsing ring + icon + months left (tap = evacuate)
    for (const h of S.haz || []){
      const pt = this.countryPoint(h.c); if (!pt) continue;
      const [x, y0] = this.toScreen(pt[0], pt[1]), y = y0 - 30; if (!vis(x, y)) continue;
      const Z = P.HAZARDS[h.type], col = HZ_COL[h.type] || COL.bad, left = Math.max(0, h.at - S.tick), ph = (now * 1.4) % 1;
      c.strokeStyle = col; c.globalAlpha = (1 - ph) * .7; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 18 + ph * 22, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = "rgba(6,16,21,.9)"; c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.fill(); c.lineWidth = 2; c.strokeStyle = col; c.stroke();
      const im = iconImg(Z.icon, col); if (im) c.drawImage(im, x - 11, y - 11, 22, 22);
      c.strokeStyle = col; c.globalAlpha = .6; c.beginPath(); c.moveTo(x, y + 18); c.lineTo(x, y0 - 2); c.stroke(); c.globalAlpha = 1;
      const lab = h.evac ? `✓ ${t("evacShort")}` : `${left} ${t("moShort")} · ${t("evacShort")} ${P.evacCost()}`;
      const b = this.pill(x, y + 33, lab, {font:"600 10.5px 'IBM Plex Mono', 'IBM Plex Sans Thai', monospace", h:19, bg:h.evac ? "rgba(95,211,154,.92)" : "rgba(6,16,21,.9)", color:h.evac ? "#04130c" : COL.fg, stroke:col});
      if (!h.evac) this.hits.push({id:"hz-" + h.id, x:Math.min(x - 22, b.x), y:y - 20, w:Math.max(44, b.w), h:b.y + b.h - (y - 20), fn:() => { if (P.evacuate(h.id)){ this.floatText(x, y - 24, t("evacuated"), "good"); Audio.play("shield"); } }});
    }
    // bubbles (green = free Eco-Points · red = disaster aid)
    for (const bb of S.bubbles){
      const pt = bb.cid ? this.countryPoint(bb.cid) : ll(bb.lat, bb.lon); if (!pt) continue;
      const bob = Math.sin(now * 2.4 + bb.id) * 3;
      const [x, y0] = this.toScreen(pt[0], pt[1]), y = y0 - 22 + bob; if (!vis(x, y)) continue;
      const red = bb.type === "red", col = red ? COL.bad : COL.good, R = 17;
      const g = c.createRadialGradient(x, y, 2, x, y, R + 12); g.addColorStop(0, red ? "rgba(255,90,74,.5)" : "rgba(95,211,154,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, R + 12, 0, Math.PI * 2); c.fill();
      c.fillStyle = red ? "#3a0d0a" : "#0a2e20"; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill();
      c.lineWidth = 2.2; c.strokeStyle = col; c.stroke();
      // remaining time ring
      const maxT = red ? 5 : 4; c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, R + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(bb.ttl / maxT, 0, 1)); c.stroke();
      const im = iconImg(red ? "heart-handshake" : "leaf", col); if (im) c.drawImage(im, x - 10, y - 10, 20, 20);
      if (red) this.pill(x, y + R + 14, `${P.aidCost()} · ${bb.ttl}`, {font:"600 10px 'IBM Plex Mono', monospace", h:17, icon:"leaf", iconColor:COL.good, bg:"rgba(6,16,21,.88)"});
      this.hits.push({id:"bb-" + bb.id, x:x - R - 6, y:y - R - 6, w:2 * R + 12, h:2 * R + 12, fn:() => { if (P.popBubble(bb.id, x, y - 26)){ this.burst(x, y, col); if (!red) Audio.play("coin", {vol:.6}); } }});
    }
    // hazard strike effects
    for (const f of this.fx_){
      f.t += dt; const p = f.t / f.dur; if (p >= 1) continue;
      const pt = this.countryPoint(f.c); if (!pt) continue;
      const [x, y] = this.toScreen(pt[0], pt[1]), col = HZ_COL[f.type] || COL.bad;
      this.weatherFx(c, f, x, y, p, col, now);
    }
    this.fx_ = this.fx_.filter(f => f.t < f.dur);
    // particles
    if (this.parts){ for (const q of this.parts){ q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 140 * dt; c.globalAlpha = Math.max(0, 1 - q.t / .7); c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1; this.parts = this.parts.filter(q => q.t < .7); }
    // floating numbers
    for (const f of this.floats){
      f.t += dt; const p = f.t / 1.4, a = p < .7 ? 1 : 1 - (p - .7) / .3;
      c.globalAlpha = Math.max(0, a); c.font = "700 15px 'IBM Plex Mono', 'Kanit', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
      const col = f.color === "good" ? COL.good : f.color === "bad" ? COL.bad : COL.accent;
      const txt = String(f.txt).replace(/\[\[[a-z0-9-]+\]\]/g, "").trim();
      c.lineWidth = 4; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText(txt, f.x, f.y - p * 46); c.fillStyle = col; c.fillText(txt, f.x, f.y - p * 46);
      c.textAlign = "left"; c.globalAlpha = 1;
    }
    this.floats = this.floats.filter(f => f.t < 1.4);
    // hover tooltip (country name, CO₂, relation)
    if (this.hover && this.hover.sh && !this.drag && P.RMETA[this.hover.sh.r]){
      const sh = this.hover.sh, cc = sh.c ? P.C(sh.c) : null;
      const name = cc ? L(P.COUNTRY[cc.id].name) : sh.name;
      const line2 = cc ? `CO₂ ${cc.co2.toFixed(2)} Gt · ${t("relation")} ${cc.rel >= 0 ? "+" : ""}${Math.round(cc.rel)}` : L(P.RMETA[sh.r].name);
      c.font = "600 12.5px 'IBM Plex Sans Thai', sans-serif"; const w1 = c.measureText(name).width; c.font = "500 11px 'IBM Plex Mono', 'IBM Plex Sans Thai', monospace"; const w2 = c.measureText(line2).width;
      const w = Math.max(w1, w2) + 20, h = 42; let x = this.hover.x + 16, y = this.hover.y + 14; if (x + w > this.w - 8) x = this.hover.x - w - 12; if (y + h > this.h - 8) y = this.hover.y - h - 10;
      c.fillStyle = "rgba(6,16,21,.92)"; c.strokeStyle = "rgba(79,209,197,.5)"; c.lineWidth = 1; c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill(); c.stroke();
      c.textBaseline = "top"; c.fillStyle = COL.fg; c.font = "600 12.5px 'IBM Plex Sans Thai', sans-serif"; c.fillText(name, x + 10, y + 5);
      c.fillStyle = cc ? COL[relCol(cc.rel)] : COL.muted; c.font = "500 11px 'IBM Plex Mono', 'IBM Plex Sans Thai', monospace"; c.fillText(line2, x + 10, y + 24); c.textBaseline = "alphabetic";
    }
  },
  burst(x, y, col){ (this.parts = this.parts || []); for (let i = 0; i < 14; i++){ const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 110; this.parts.push({x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 60, r:1.5 + Math.random() * 2.2, col, t:0}); } },
  /* weather drawn over the struck country */
  weatherFx(c, f, x, y, p, col, now){
    const k = Math.sqrt(this.cam.z), R = 70 * k, a = p < .15 ? p / .15 : p > .75 ? (1 - p) / .25 : 1;
    // shock rings
    for (let i = 0; i < 3; i++){ const q = (p * 1.6 - i * .18); if (q <= 0 || q >= 1) continue; c.strokeStyle = col; c.globalAlpha = (1 - q) * .8; c.lineWidth = 3 * (1 - q) + .5; c.beginPath(); c.arc(x, y, 12 + q * R * 1.4, 0, Math.PI * 2); c.stroke(); }
    c.globalAlpha = 1;
    const T = f.type;
    if (T === "flood" || T === "hurricane" || T === "typhoon"){
      c.strokeStyle = "rgba(170,210,255,.75)"; c.lineWidth = 1.2; c.globalAlpha = a * .9;
      for (let i = 0; i < 60; i++){ const sx = x + ((f.seed[i] * 2 - 1) * R), sy = y - R + ((now * 380 + f.seed[i + 60] * 1000) % (2 * R)); c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 4, sy + 12); c.stroke(); }
      if (T !== "flood"){ c.save(); c.translate(x, y); c.rotate(-now * 3); c.strokeStyle = "rgba(220,230,255,.6)"; c.lineWidth = 3; for (let i = 0; i < 4; i++){ c.rotate(Math.PI / 2); c.beginPath(); c.arc(0, 0, R * .55, 0, Math.PI * .6); c.stroke(); } c.restore(); }
      else { c.fillStyle = "rgba(60,120,200,.25)"; c.beginPath(); c.ellipse(x, y + 6, R * .8 * a, R * .35 * a, 0, 0, Math.PI * 2); c.fill(); }
      if (T !== "flood" && Math.floor(now * 7) % 9 === 0){ c.fillStyle = "rgba(230,240,255,.18)"; c.fillRect(0, 0, this.w, this.h); }
    } else if (T === "heat" || T === "drought"){
      const g = c.createRadialGradient(x, y, 0, x, y, R * 1.3); g.addColorStop(0, T === "heat" ? `rgba(255,120,40,${.45 * a})` : `rgba(230,180,80,${.4 * a})`); g.addColorStop(1, "rgba(255,120,40,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, R * 1.3, 0, Math.PI * 2); c.fill();
      c.globalAlpha = a * .7; c.strokeStyle = T === "heat" ? "rgba(255,200,140,.7)" : "rgba(230,200,140,.6)"; c.lineWidth = 1.5;
      for (let i = 0; i < 7; i++){ const yy = y - R * .6 + i * R * .2, ph = now * 4 + i; c.beginPath(); for (let xx = -R * .7; xx <= R * .7; xx += 6){ const py = yy + Math.sin(xx * .08 + ph) * 3; xx === -R * .7 ? c.moveTo(x + xx, py) : c.lineTo(x + xx, py); } c.stroke(); }
      if (T === "drought"){ c.fillStyle = "rgba(200,160,90,.5)"; for (let i = 0; i < 40; i++){ const sx = x + ((f.seed[i] * 2 - 1) * R) + ((now * 60) % 40), sy = y + (f.seed[i + 40] * 2 - 1) * R * .5; c.fillRect(sx, sy, 2, 2); } }
    } else if (T === "wildfire"){
      const g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,90,30,${.5 * a})`); g.addColorStop(1, "rgba(255,60,20,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 50; i++){ const q = (now * .7 + f.seed[i]) % 1, sx = x + (f.seed[i + 50] * 2 - 1) * R * .7 + Math.sin(now * 3 + i) * 6, sy = y + R * .3 - q * R * 1.2; c.fillStyle = `rgba(255,${Math.round(140 + 100 * (1 - q))},60,${(1 - q) * a})`; c.beginPath(); c.arc(sx, sy, 1.5 + (1 - q) * 1.6, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = `rgba(60,50,45,${.25 * a})`; c.beginPath(); c.ellipse(x + 10, y - R * .8, R * .6, R * .3, 0, 0, Math.PI * 2); c.fill();
    } else if (T === "saltwater"){
      c.strokeStyle = "rgba(79,209,197,.7)"; c.lineWidth = 2; c.globalAlpha = a;
      for (let i = 0; i < 4; i++){ const yy = y - R * .3 + i * R * .2; c.beginPath(); for (let xx = -R * .8; xx <= R * .8; xx += 5){ const py = yy + Math.sin(xx * .06 + now * 3 + i) * 5; xx === -R * .8 ? c.moveTo(x + xx, py) : c.lineTo(x + xx, py); } c.stroke(); }
    }
    c.globalAlpha = 1;
    // the hazard icon swinging over the country
    const Z = P.HAZARDS[T], im = iconImg(Z.icon, col), sz = 34 + 10 * Math.sin(p * Math.PI);
    if (im){ c.save(); c.globalAlpha = a; c.translate(x + Math.sin(p * Math.PI * 2) * 30, y - 10); if (T === "hurricane" || T === "typhoon") c.rotate(p * 12); c.drawImage(im, -sz / 2, -sz / 2, sz, sz); c.restore(); }
  },
  strike(h){ const seed = Array.from({length:120}, () => Math.random()); this.fx_.push({c:h.c, type:h.type, t:0, dur:3.2, seed}); },
};
P.Map = GameMap;
P.countryPoint = id => GameMap.countryPoint(id);

/* engine hooks */
H.mapRefresh = () => GameMap.refresh();
H.mapFocus = reg => { if (GameMap.active) GameMap.focus(reg, false); };
H.floatText = (x, y, txt, color) => GameMap.floatText(x, y, txt, color);
const STRIKE_SND = {hurricane:["thunder", "storm"], typhoon:["thunder", "storm"], flood:["impact", "flood"], heat:["impact", "heat"], drought:["impact", "gale"], wildfire:["impact", "fire"], saltwater:["impact", "ocean"]};
H.hazardStrike = (h, d) => {
  GameMap.strike(h);
  const [one, amb] = STRIKE_SND[h.type] || ["impact", P.HAZARDS[h.type].snd];
  Audio.play(one, {vol:.5 + Math.min(.5, d * .5)});
  if (!S.event && !(Audio.amb && !Audio.amb.stopping)){ Audio.ambience(amb, .9); setTimeout(() => { if (Audio.amb && Audio.amb.n === amb && !S.event) Audio.stopAmb(1400); }, 3600); }
};
H.hazardWarn = h => { Audio.play("data", {vol:.5, delay:.25}); };
