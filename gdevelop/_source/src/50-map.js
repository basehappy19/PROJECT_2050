const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.map) return;
(P.mods = P.mods || {}).map = 1;
/* =========================================================================
   Map · 2D world map (Robinson projection) on the base layer
   Objects placed in the scene: Ocean, MapRim, ArcticIce, Region ×6, RegionLine ×6, Plume ×N
   Created at runtime: Bubble (green = Eco-Points, red = disaster)
   The base layer camera pans/zooms the map (drag / mouse wheel).
   ========================================================================= */
const MAPMETA = /*MAPMETA*/null;
const {S, Kit, RMETA, CITIES, clamp} = P;
const M = MAPMETA.meta, GRID = MAPMETA.grid;
const MAP_TOP = 84;                        // world y of the map's top edge (px)
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
  // look at a small neighbourhood so taps on small islands still count
  for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]){
    const xx = gx + dx, yy = gy + dy; if (xx < 0 || yy < 0 || xx >= GRID.w || yy >= GRID.h) continue;
    const v = grid[yy * GRID.w + xx]; if (v) return RIDX[v];
  }
  return null;
}
const HEAT = [[31,158,120],[217,166,43],[208,97,47],[224,48,42]];
function regionHeatValue(r){ return clamp(0.55 * (r.co2 / r.co2_0) + 0.35 * (r.vuln / 100) + (S.temp - 1.2) * 0.35 - 0.2, 0, 1); }
function heatRGB(v){ const x = clamp(v, 0, 0.999) * (HEAT.length - 1), i = Math.floor(x), f = x - i, a = HEAT[i], b = HEAT[i + 1]; return [0,1,2].map(k => Math.round(a[k] + (b[k] - a[k]) * f)); }
const CITY_TOT = Object.fromEntries(Object.entries(CITIES).map(([k, l]) => [k, l.reduce((s, c) => s + c[2], 0)]));
const W = 1920, Hh = 1080;
const Map = {
  scene:null, mode:"game", cam:{x:960, y:540, z:1}, target:null, regions:{}, lines:{}, plumes:[], bubbles:{}, drag:null, floats:[],
  init(scene, mode){
    this.scene = scene; this.mode = mode; this.regions = {}; this.lines = {}; this.plumes = []; this.bubbles = {}; this.floats = []; this.drag = null;
    const vs = (o, n) => o.getVariables().get(n);
    for (const o of scene.getObjects("Region") || []) this.regions[vs(o, "Reg").getAsString()] = o;
    for (const o of scene.getObjects("RegionLine") || []) this.lines[vs(o, "Reg").getAsString()] = o;
    for (const o of scene.getObjects("Plume") || []){ o.setBlendMode(1); this.plumes.push(o); }
    this.ocean = (scene.getObjects("Ocean") || [])[0]; this.rim = (scene.getObjects("MapRim") || [])[0]; this.ice = (scene.getObjects("ArcticIce") || [])[0];
    if (this.rim) this.rim.setBlendMode(1);
    if (this.ice){ this.iceW = this.ice.getWidth(); this.iceH = this.ice.getHeight(); }
    if (mode === "menu") this.cam = {x:690, y:500, z:0.66};
    else this.cam = {x:960, y:516, z:1};
    this.target = null; this.applyCam(); this.refresh();
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
  /* move the camera so a region is centred in the part of the screen the drawer doesn't cover */
  focus(reg){
    if (this.mode !== "game" || !RMETA[reg]) return;
    const [lat, lon] = RMETA[reg].lab; const [x, y] = toWorld(lat, lon);
    const dw = P.Screens ? P.Screens.drawerWidth() : 0;           // design units
    const freeCx = (1264 - dw - 16) / 2 * Kit.K;                    // centre of the free area, px
    const z = this.cam.z;
    const ty = z > 1.05 ? y + 20 : 516;                              // at normal zoom only pan sideways
    this.target = {x: x - (freeCx - W / 2) / z, y: ty, z};
  },
  /* drawer closed: slide back to the whole-world view (when not zoomed in) */
  recenter(){ if (this.mode === "game" && this.cam.z <= 1.05) this.target = {x:960, y:516, z:1}; },
  refresh(){
    if (!this.scene || !S.regions) return;
    const sel = this.mode === "game" ? S.sel : null;
    for (const r of S.regions){
      const o = this.regions[r.id]; if (!o) continue;
      let c = heatRGB(regionHeatValue(r)); if (sel === r.id) c = c.map(v => Math.min(255, v + 35));
      o.setColor(c.join(";"));
      const ln = this.lines[r.id]; if (ln) ln.hide(sel !== r.id);
    }
    const T = S.temp || 1.2, warm = clamp((T - 1.2) / 1.6, 0, 1);
    if (this.ocean) this.ocean.setColor([10 + warm * 26, 52 - warm * 10, 80 - warm * 24].map(v => Math.round(Math.min(255, v * 1.45))).join(";"));
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
      p.setColor(`255;${Math.round(g * 255)};38`);
    }
    this.syncBubbles();
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
        const [x, y] = toWorld(b.lat, b.lon); o.setPosition(x, y);
        const v = o.getVariables(); v.get("Id").setNumber(b.id); v.get("BaseY").setNumber(y); v.get("Phase").setNumber(Math.random() * 6.28);
        this.bubbles[b.id] = o;
      }
    }
    for (const id in this.bubbles) if (!live.has(+id)){ this.bubbles[id].deleteFromScene(this.scene); delete this.bubbles[id]; }
  },
  /* tap on a bubble (called from the scene events with the picked Bubble) */
  popBubbleObject(o){
    const id = o.getVariables().get("Id").getAsNumber();
    const [sx, sy] = this.toScreen(o.getX(), o.getY() - 40);
    return P.popBubble(id, sx, sy);
  },
  /* tap on the map (no UI or bubble under the pointer) */
  click(){
    const m = Kit.mouse; if (m.moved > 8) return false;
    const [x, y] = this.toWorldFromScreen(m.x, m.y);
    const reg = regionAtWorld(x, y);
    if (reg && P.Screens){ P.Screens.selectRegion(reg, false); return true; }
    return false;
  },
  floatText(x, y, txt, color){ this.floats.push({x, y, txt, color, t:0}); Kit.dirty("MapUI"); },
  update(dt){
    if (!this.scene) return;
    const m = Kit.mouse, im = this.scene.getGame().getInputManager();
    if (this.mode === "game"){
      // drag to pan (only when the press started on the map)
      if (m.down && !m.onUI && !(P.UIM && P.UIM.modalOpen())){
        if (!this.drag) this.drag = {x:m.x, y:m.y};
        else if (m.moved > 6){ this.cam.x -= (m.x - this.drag.x) * Kit.K / this.cam.z; this.cam.y -= (m.y - this.drag.y) * Kit.K / this.cam.z; this.target = null; this.drag = {x:m.x, y:m.y}; this.clampCam(); }
      } else this.drag = null;
      const wheel = im.getMouseWheelDelta ? im.getMouseWheelDelta() : 0;
      if (wheel && !Kit.wheelUsed && !Kit.overUI && !(P.UIM && P.UIM.modalOpen())){
        const z0 = this.cam.z, z1 = clamp(z0 * (wheel > 0 ? 1.1 : 1 / 1.1), 0.8, 2.4);
        const [wx, wy] = this.toWorldFromScreen(m.x, m.y);
        this.cam.z = z1; this.cam.x = wx - (m.x * Kit.K - W / 2) / z1; this.cam.y = wy - (m.y * Kit.K - Hh / 2) / z1; this.target = null; this.clampCam();
      }
    } else {
      this.cam.x = 690 + Math.sin(this.scene.getTimeManager().getTimeFromStart() / 9000) * 40;   // menu: slow drift
    }
    if (this.target){
      const k = 1 - Math.pow(0.92, dt * 60);
      this.cam.x += (this.target.x - this.cam.x) * k; this.cam.y += (this.target.y - this.cam.y) * k; this.cam.z += (this.target.z - this.cam.z) * k;
      if (Math.abs(this.target.x - this.cam.x) < 0.5 && Math.abs(this.target.y - this.cam.y) < 0.5) this.target = null;
    }
    const key = `${this.cam.x.toFixed(1)},${this.cam.y.toFixed(1)},${this.cam.z.toFixed(3)}`;
    if (key !== this._ck){ this._ck = key; this.applyCam(); Kit.dirty("MapUI"); }
    if (this.floats.length){ this.floats.forEach(f => f.t += dt); this.floats = this.floats.filter(f => f.t < 1.2); Kit.dirty("MapUI"); }
  },
};
P.Map = Map; P.toWorld = toWorld; P.heatRGB = heatRGB; P.regionHeatValue = regionHeatValue; P.regionAtWorld = regionAtWorld;
const H = P.H = P.H || {};
H.mapRefresh = () => Map.refresh();
H.mapFocus = reg => Map.focus(reg);
H.floatText = (x, y, txt, color) => Map.floatText(x, y, txt, color);
