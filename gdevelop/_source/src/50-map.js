const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.map) return;
(P.mods = P.mods || {}).map = 1;
/* =========================================================================
   Map · 2D world map (Robinson projection) on the base layer
   Objects placed in the scene: Ocean, MapRim, ArcticIce, Region ×6, RegionLine ×6, Plume ×N
   Created at runtime: Bubble (green = Eco-Points, red = disaster aid), 2 UIPainter objects in world space
   (country borders + the selected country), drawn once and moved by the camera.
   Controls: drag = pan · wheel / pinch / + − buttons = zoom · double-tap or H = whole world
   Tap a region (zoomed out) = zoom into it · tap a country (zoomed in) = select the country
   ========================================================================= */
const MAPMETA = /*MAPMETA*/null;
const CGEO = /*COUNTRYGEO*/null;         // [{g:geo name, c:country id|null, r:region, p:[[x,y,…] rings in world px], b:[x0,y0,x1,y1], cx, cy}]
const {S, Kit, RMETA, CITIES, clamp, COUNTRY, SHORT} = P;
const M = MAPMETA.meta, GRID = MAPMETA.grid;
const MAP_TOP = 84;                        // world y of the map's top edge (px)
const ZMIN = 0.8, ZMAX = 3.4, ZCOUNTRY = 1.3;
const ROB = [[1.0000,0.0000],[0.9986,0.0620],[0.9954,0.1240],[0.9900,0.1860],[0.9822,0.2480],[0.9730,0.3100],[0.9600,0.3720],[0.9427,0.4340],[0.9216,0.4958],[0.8962,0.5571],[0.8679,0.6176],[0.8350,0.6769],[0.7986,0.7346],[0.7597,0.7903],[0.7186,0.8435],[0.6732,0.8936],[0.6213,0.9394],[0.5722,0.9761],[0.5322,1.0000]];
/* lat/lon → world px */
function toWorld(lat, lon){
  let l = lon - M.LON0; while (l < -180) l += 360; while (l > 180) l -= 360;
  const a = Math.min(90, Math.abs(lat)) / 5, i = Math.min(17, Math.floor(a)), f = a - i;
  const X = ROB[i][0] + (ROB[i+1][0] - ROB[i][0]) * f, Y = ROB[i][1] + (ROB[i+1][1] - ROB[i][1]) * f;
  return [(0.8487 * X * l * Math.PI / 180 + M.XR) * M.U / M.SS, MAP_TOP + (M.YT - 1.3523 * Y * Math.sign(lat)) * M.U / M.SS];
}
/* decode the region hit grid (RLE: digit + base36 count, '.' separated) */
const grid = new Uint8Array(GRID.w * GRID.h);
(() => { let p = 0; for (const run of GRID.rle.split(".")){ const v = +run[0], n = parseInt(run.slice(1), 36); grid.fill(v, p, p + n); p += n; } })();
const RIDX = ["", "NA", "EU", "EA", "SA", "MEAF", "SEA"];
function regionAtWorld(x, y){
  const gx = Math.floor(x / GRID.cell), gy = Math.floor((y - MAP_TOP) / GRID.cell);
  if (gx < 0 || gy < 0 || gx >= GRID.w || gy >= GRID.h) return null;
  for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]){
    const xx = gx + dx, yy = gy + dy; if (xx < 0 || yy < 0 || xx >= GRID.w || yy >= GRID.h) continue;
    const v = grid[yy * GRID.w + xx]; if (v) return RIDX[v];
  }
  return null;
}
/* point in polygon (even-odd over all rings) */
function inRings(rings, x, y){
  let inside = false;
  for (const p of rings){ for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2){ const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } }
  return inside;
}
/* world px → {geo entry} (exact polygon; small islands get a few px of slack) */
function geoAtWorld(x, y){
  for (const g of CGEO) if (x >= g.b[0] && x <= g.b[2] && y >= g.b[1] && y <= g.b[3] && inRings(g.p, x, y)) return g;
  for (const [dx, dy] of [[4,0],[-4,0],[0,4],[0,-4]]) for (const g of CGEO) if (x + dx >= g.b[0] && x + dx <= g.b[2] && y + dy >= g.b[1] && y + dy <= g.b[3] && inRings(g.p, x + dx, y + dy)) return g;
  return null;
}
const GEO_OF = {}; for (const g of CGEO) if (g.c) GEO_OF[g.c] = g;
/* where to put a country's label / bubble / hazard marker (world px) */
function countryPoint(id){
  if (!id) return null;
  if (id.startsWith("R_")){ const [lat, lon] = RMETA[id.slice(2)].lab; return toWorld(lat, lon); }
  const g = GEO_OF[id]; return g ? [g.cx, g.cy] : null;
}
/* ---- colours ---- */
const HEAT = [[31,158,120],[217,166,43],[208,97,47],[224,48,42]];
const HEAT_PAINT = [[134,201,170],[236,211,140],[233,160,128],[226,120,120]];
const HEAT_NIGHT = [[22,96,82],[128,104,40],[128,64,36],[140,36,34]];
function regionHeatValue(r){ return clamp(0.55 * (r.co2 / r.co2_0) + 0.35 * (r.vuln / 100) + (S.temp - 1.2) * 0.35 - 0.2, 0, 1); }
function heatRGB(v, pal = HEAT){ const x = clamp(v, 0, 0.999) * (pal.length - 1), i = Math.floor(x), f = x - i, a = pal[i], b = pal[i + 1]; return [0,1,2].map(k => Math.round(a[k] + (b[k] - a[k]) * f)); }
const theme = () => { try { const v = localStorage.getItem("p2050-theme") || ""; return P.Net && v && P.Net.owns("theme_" + v) ? v : ""; } catch(e) { return ""; } };
const CITY_TOT = Object.fromEntries(Object.entries(CITIES).map(([k, l]) => [k, l.reduce((s, c) => s + c[2], 0)]));
const W = 1920, Hh = 1080;
const Map = {
  scene:null, mode:"game", cam:{x:960, y:540, z:1}, target:null, regions:{}, lines:{}, plumes:[], bubbles:{}, drag:null, floats:[], fx:[], pinch:null, lastTap:0,
  init(scene, mode){
    this.scene = scene; this.mode = mode; this.regions = {}; this.lines = {}; this.plumes = []; this.bubbles = {}; this.floats = []; this.fx = []; this.drag = null; this.pinch = null;
    const vs = (o, n) => o.getVariables().get(n);
    for (const o of scene.getObjects("Region") || []) this.regions[vs(o, "Reg").getAsString()] = o;
    for (const o of scene.getObjects("RegionLine") || []) this.lines[vs(o, "Reg").getAsString()] = o;
    for (const o of scene.getObjects("Plume") || []){ o.setBlendMode(1); this.plumes.push(o); }
    this.ocean = (scene.getObjects("Ocean") || [])[0]; this.rim = (scene.getObjects("MapRim") || [])[0]; this.ice = (scene.getObjects("ArcticIce") || [])[0];
    if (this.rim) this.rim.setBlendMode(1);
    if (this.ice){ this.iceW = this.ice.getWidth(); this.iceH = this.ice.getHeight(); }
    this.borders = null; this.selPaint = null; this._selKey = null;
    if (mode === "game") this.makePainters();
    if (mode === "menu") this.cam = {x:690, y:500, z:0.66};
    else this.cam = {x:960, y:516, z:1};
    this.target = null; this.applyCam(); this.refresh();
  },
  /* country borders: drawn once in world coordinates on the map layer, faded in when zoomed */
  makePainters(){
    const mk = z => { const o = this.scene.createObject("UIPainter"); o.setLayer(""); o.setZOrder(z); o.setPosition(0, 0); if (o.setClearBetweenFrames) o.setClearBetweenFrames(false); return o; };
    this.borders = mk(25); this.selPaint = mk(26);
    const g = this.borders.getRendererObject(); g.clear();
    g.lineStyle({width:0.9, color:0x04100c, alpha:.75, join:"round"});
    for (const c of CGEO) for (const p of c.p){ g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
    g.lineStyle(0);
    g.alpha = 0;
  },
  drawSelected(){
    if (!this.selPaint) return;
    const key = (S.selC || "") + "|" + (this.cam.z >= ZCOUNTRY ? 1 : 0);
    if (key === this._selKey) return; this._selKey = key;
    const g = this.selPaint.getRendererObject(); g.clear();
    const id = S.selC; if (!id) return;
    const list = id.startsWith("R_") ? CGEO.filter(x => !x.c && x.r === id.slice(2)) : [GEO_OF[id]].filter(Boolean);
    for (const c of list){
      g.lineStyle({width:2.2, color:0xe6fffb, alpha:.95, join:"round"}); g.beginFill(0x4fd1c5, .28);
      for (const p of c.p){ g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
      g.endFill();
    }
    g.lineStyle(0);
  },
  layer(){ return this.scene.getLayer(""); },
  applyCam(){ const l = this.layer(); l.setCameraX(this.cam.x); l.setCameraY(this.cam.y); l.setCameraZoom(this.cam.z); },
  /* world px → screen design units (for labels drawn on the MapUI layer) */
  toScreen(x, y){ return [((x - this.cam.x) * this.cam.z + W / 2) / Kit.K, ((y - this.cam.y) * this.cam.z + Hh / 2) / Kit.K]; },
  toWorldFromScreen(dx, dy){ return [(dx * Kit.K - W / 2) / this.cam.z + this.cam.x, (dy * Kit.K - Hh / 2) / this.cam.z + this.cam.y]; },
  latlonScreen(lat, lon){ const [x, y] = toWorld(lat, lon); return this.toScreen(x, y); },
  clampCam(){
    const z = this.cam.z, halfW = W / 2 / z, halfH = Hh / 2 / z;
    this.cam.x = clamp(this.cam.x, Math.min(960, 0 + halfW - 500 / z), Math.max(960, 1920 - halfW + 500 / z));
    this.cam.y = clamp(this.cam.y, Math.min(516, MAP_TOP + halfH - 300 / z), Math.max(516, MAP_TOP + 807 - halfH + 300 / z));
  },
  freeCx(){ const dw = P.Screens ? P.Screens.drawerWidth() : 0; return (1264 - dw - 16) / 2 * Kit.K; },
  /* move the camera so a world point is centred in the part of the screen the drawer doesn't cover */
  lookAt(x, y, z){ this.target = {x: x - (this.freeCx() - W / 2) / z, y: y + 20 / z, z}; },
  focus(reg, zoomIn){
    if (this.mode !== "game" || !RMETA[reg]) return;
    const [lat, lon] = RMETA[reg].lab; const [x, y] = toWorld(lat, lon);
    const z = zoomIn ? Math.max(this.cam.z, 1.6) : this.cam.z;
    if (z > 1.05) this.lookAt(x, y, z); else this.target = {x: x - (this.freeCx() - W / 2) / z, y:516, z};
  },
  focusCountry(id){ const pt = countryPoint(id); if (!pt || this.mode !== "game") return; this.lookAt(pt[0], pt[1], Math.max(this.cam.z, id.startsWith("R_") ? 1.6 : 2.0)); },
  /* drawer closed: slide back to the whole-world view (when not zoomed in) */
  recenter(){ if (this.mode === "game" && this.cam.z <= 1.05) this.target = {x:960, y:516, z:1}; },
  resetView(){ if (this.mode === "game"){ this.target = {x:960, y:516, z:1}; Kit.dirty(); } },
  zoomBy(f){ if (this.mode !== "game") return; const z0 = this.target ? this.target.z : this.cam.z, z1 = clamp(z0 * f, ZMIN, ZMAX); const cx = this.target ? this.target.x : this.cam.x, cy = this.target ? this.target.y : this.cam.y; this.target = {x:cx, y:cy, z:z1}; },
  refresh(){
    if (!this.scene || !S.regions) return;
    const sel = this.mode === "game" ? S.sel : null, th = theme();
    const pal = th === "paint" ? HEAT_PAINT : th === "night" ? HEAT_NIGHT : HEAT;
    for (const r of S.regions){
      const o = this.regions[r.id]; if (!o) continue;
      let c = heatRGB(regionHeatValue(r), pal); if (sel === r.id) c = c.map(v => Math.min(255, v + 35));
      o.setColor(c.join(";"));
      const ln = this.lines[r.id]; if (ln) ln.hide(sel !== r.id || this.cam.z >= ZCOUNTRY);
    }
    const T = S.temp || 1.2, warm = clamp((T - 1.2) / 1.6, 0, 1);
    let oc = [10 + warm * 26, 52 - warm * 10, 80 - warm * 24].map(v => v * 1.45);
    if (th === "night") oc = oc.map(v => v * .45); else if (th === "paint") oc = [150, 196, 214];
    if (this.ocean) this.ocean.setColor(oc.map(v => Math.round(Math.min(255, v))).join(";"));
    const aw = clamp((T - 1.2) / 1.4, 0, 1);
    if (this.rim) this.rim.setColor([0.37 + aw * 0.6, 0.72 - aw * 0.35, 1 - aw * 0.8].map(v => Math.round(clamp(v, 0, 1) * 255)).join(";"));
    if (this.ice){
      const iceLat = clamp(70 + (T - 1.2) * 9, 70, 88);
      const yEdge = toWorld(iceLat - 4, 0)[1] - MAP_TOP, f = clamp(yEdge / this.iceH, 0, 1);
      this.ice.setHeight(Math.max(1, this.iceH * f)); this.ice.hide(f <= 0.01);
    }
    for (const p of this.plumes){
      const v = p.getVariables(), reg = v.get("Reg").getAsString(), w = v.get("W").getAsNumber();
      const r = S.regions.find(q => q.id === reg); if (!r) continue;
      const amt = r.co2 * w / CITY_TOT[reg];
      const size = amt <= 0.02 ? 0 : (0.035 + Math.sqrt(amt) * 0.075) * 300;   // px
      v.get("Base").setNumber(size / 96);
      const g = clamp(0.55 - r.co2 / r.co2_0 * 0.35, 0.15, 0.7);
      p.setColor(th === "night" ? `255;${Math.round(200 + g * 50)};120` : `255;${Math.round(g * 255)};38`);
    }
    this.syncBubbles(); this._selKey = null; this.drawSelected();
  },
  bubblePoint(b){
    if (b.cid){ const pt = countryPoint(b.cid); if (pt) return pt; }
    return toWorld(b.lat, b.lon);
  },
  syncBubbles(){
    if (this.mode !== "game") return;
    const live = new Set();
    for (const b of S.bubbles || []){
      live.add(b.id);
      let o = this.bubbles[b.id];
      if (!o){
        o = this.scene.createObject("Bubble"); o.setLayer(""); o.setZOrder(50);
        o.setAnimationName(b.type); o.setScale(0.5);
        const [x, y] = this.bubblePoint(b); o.setPosition(x, y);
        const v = o.getVariables(); v.get("Id").setNumber(b.id); v.get("BaseY").setNumber(y); v.get("Phase").setNumber(Math.random() * 6.28);
        this.bubbles[b.id] = o;
      }
    }
    for (const id in this.bubbles) if (!live.has(+id)){ this.bubbles[id].deleteFromScene(this.scene); delete this.bubbles[id]; }
  },
  /* tap on a bubble (called from the scene events with the picked Bubble) */
  popBubbleObject(o){
    if (this.pinch || Kit.mouse.moved > 8) return false;
    const id = o.getVariables().get("Id").getAsNumber();
    const [sx, sy] = this.toScreen(o.getX(), o.getY() - 40);
    return P.popBubble(id, sx, sy);
  },
  /* tap on the map (no UI or bubble under the pointer) */
  click(){
    const m = Kit.mouse; if (m.moved > 8 || this.pinchEnded > performance.now() - 250) return false;
    const now = performance.now();
    if (now - this.lastTap < 320 && Math.abs(m.x - this.lastTapX) + Math.abs(m.y - this.lastTapY) < 24){ this.lastTap = 0; this.resetView(); return true; }
    this.lastTap = now; this.lastTapX = m.x; this.lastTapY = m.y;
    const [x, y] = this.toWorldFromScreen(m.x, m.y);
    if (this.cam.z >= ZCOUNTRY){
      const g = geoAtWorld(x, y);
      if (g && g.r && RMETA[g.r] && P.Screens){ P.Screens.selectCountry(g.c || "R_" + g.r); return true; }
    }
    const reg = regionAtWorld(x, y);
    if (reg && P.Screens){ P.Screens.selectRegion(reg, true); return true; }
    // tap on the empty sea closes the drawer
    if (S.tab && P.Screens){ P.Screens.closeTab(); return true; }
    return false;
  },
  floatText(x, y, txt, color){ this.floats.push({x, y, txt, color, t:0}); Kit.dirty("MapUI"); },
  /* hazard strike animation: an icon sweeping across the country + an expanding ring */
  hazardFx(h, d){ const pt = countryPoint(h.c); if (!pt) return; this.fx.push({x:pt[0], y:pt[1], type:h.type, d, t:0}); Kit.dirty("MapUI"); },
  update(dt){
    if (!this.scene) return;
    const m = Kit.mouse, im = this.scene.getGame().getInputManager();
    if (this.mode === "game"){
      const modal = P.UIM && P.UIM.modalOpen();
      // two-finger pinch zoom (touch screens)
      const ids = im.getAllTouchIdentifiers ? im.getAllTouchIdentifiers() : [];
      if (ids.length >= 2 && !modal){
        const ax = im.getTouchX(ids[0]), ay = im.getTouchY(ids[0]), bx = im.getTouchX(ids[1]), by = im.getTouchY(ids[1]);
        const dist = Math.hypot(ax - bx, ay - by), mx = (ax + bx) / 2, my = (ay + by) / 2;
        if (!this.pinch){ this.pinch = {d:dist, z:this.cam.z, w:this.toWorldFromScreen(mx / Kit.K, my / Kit.K)}; this.target = null; }
        else {
          const z1 = clamp(this.pinch.z * dist / Math.max(20, this.pinch.d), ZMIN, ZMAX);
          this.cam.z = z1; this.cam.x = this.pinch.w[0] - (mx - W / 2) / z1; this.cam.y = this.pinch.w[1] - (my - Hh / 2) / z1; this.clampCam();
        }
        this.drag = null;
      } else {
        if (this.pinch){ this.pinch = null; this.pinchEnded = performance.now(); m.moved = 99; }
        // drag to pan (only when the press started on the map)
        if (m.down && !m.onUI && !modal){
          if (!this.drag) this.drag = {x:m.x, y:m.y};
          else if (m.moved > 6){ this.cam.x -= (m.x - this.drag.x) * Kit.K / this.cam.z; this.cam.y -= (m.y - this.drag.y) * Kit.K / this.cam.z; this.target = null; this.drag = {x:m.x, y:m.y}; this.clampCam(); }
        } else this.drag = null;
      }
      const wheel = im.getMouseWheelDelta ? im.getMouseWheelDelta() : 0;
      if (wheel && !Kit.wheelUsed && !Kit.overUI && !modal){
        const z0 = this.target ? this.target.z : this.cam.z, z1 = clamp(z0 * (wheel > 0 ? 1.12 : 1 / 1.12), ZMIN, ZMAX);
        const [wx, wy] = this.toWorldFromScreen(m.x, m.y);
        this.target = null; this.cam.z = z1; this.cam.x = wx - (m.x * Kit.K - W / 2) / z1; this.cam.y = wy - (m.y * Kit.K - Hh / 2) / z1; this.clampCam();
      }
    } else {
      this.cam.x = 690 + Math.sin(this.scene.getTimeManager().getTimeFromStart() / 9000) * 40;   // menu: slow drift
    }
    if (this.target){
      const k = 1 - Math.pow(0.88, dt * 60);
      this.cam.x += (this.target.x - this.cam.x) * k; this.cam.y += (this.target.y - this.cam.y) * k; this.cam.z += (this.target.z - this.cam.z) * k;
      if (Math.abs(this.target.x - this.cam.x) < 0.5 && Math.abs(this.target.y - this.cam.y) < 0.5 && Math.abs(this.target.z - this.cam.z) < 0.002){ this.cam.x = this.target.x; this.cam.y = this.target.y; this.cam.z = this.target.z; this.target = null; this.clampCam(); }
    }
    const key = `${this.cam.x.toFixed(1)},${this.cam.y.toFixed(1)},${this.cam.z.toFixed(3)}`;
    if (key !== this._ck){
      const wasC = this._z >= ZCOUNTRY, isC = this.cam.z >= ZCOUNTRY; this._z = this.cam.z;
      this._ck = key; this.applyCam(); Kit.dirty("MapUI");
      if (this.borders) this.borders.getRendererObject().alpha = clamp((this.cam.z - 1.05) / (ZCOUNTRY - 1.05), 0, 1);
      if (wasC !== isC){ Kit.dirty("HUD"); for (const r of S.regions){ const ln = this.lines[r.id]; if (ln) ln.hide(S.sel !== r.id || isC); } this.drawSelected(); }
    }
    if (this.floats.length){ this.floats.forEach(f => f.t += dt); this.floats = this.floats.filter(f => f.t < 1.2); Kit.dirty("MapUI"); }
    if (this.fx.length){ this.fx.forEach(f => f.t += dt); this.fx = this.fx.filter(f => f.t < 2.2); Kit.dirty("MapUI"); }
    if (this.mode === "game" && S.haz && S.haz.length){ this._pulse = (this._pulse || 0) + dt; if (this._pulse > 0.05){ this._pulse = 0; Kit.dirty("MapUI"); } }
  },
  isCountryZoom(){ return this.cam.z >= ZCOUNTRY; },
};
P.Map = Map; P.toWorld = toWorld; P.heatRGB = heatRGB; P.regionHeatValue = regionHeatValue; P.regionAtWorld = regionAtWorld; P.countryPoint = countryPoint; P.CGEO = CGEO; P.ZCOUNTRY = ZCOUNTRY;
const H = P.H = P.H || {};
H.mapRefresh = () => Map.refresh();
H.mapFocus = reg => Map.focus(reg, false);
H.floatText = (x, y, txt, color) => Map.floatText(x, y, txt, color);
H.hazardStrike = (h, d) => {
  Map.hazardFx(h, d);
  const A = P.Audio, n = P.HAZARDS[h.type].snd;
  if (A && !S.event && !A.amb){ A.ambience(n); setTimeout(() => { if (A.amb === n && !S.event) A.stopAmb(900); }, 2600); }
};
H.hazardWarn = h => Kit.dirty("MapUI");
