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
const ZMIN = 1, ZMAX = 3.4, ZCOUNTRY = 1.3;   // 3.x: like the website, the map can't be zoomed out past the whole world
/* 3.x: the map layer is 3D; the camera tilts back as you zoom in (like the website / Plague Inc). Labels and icons stay flat on the UI layers. */
const TILT_MAX = 38, TZ0 = 1.3, TZ1 = 2.6;
const tiltAt = z => { const u = clamp((z - TZ0) / (TZ1 - TZ0), 0, 1); return TILT_MAX * u * u * (3 - 2 * u); };
const HOME = {x:960, y:516, z:1};
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
  const g = GEO_OF[id]; if (g) return [g.cx, g.cy];
  const cap = P.CAPITALS && P.CAPITALS[id]; return cap ? toWorld(cap[0], cap[1]) : null;   // 3.x: small islands without an outline use their capital
}
/* ---- colours ---- */
const HEAT_N = [[31,158,120],[217,166,43],[208,97,47],[224,48,42]], HEAT_CB = [[46,120,200],[140,170,205],[240,170,70],[225,110,25]];   // colour-blind: blue → orange
let HEAT = HEAT_N;
const HEAT_PAINT = [[134,201,170],[236,211,140],[233,160,128],[226,120,120]];
const HEAT_NIGHT = [[22,96,82],[128,104,40],[128,64,36],[140,36,34]];
function regionHeatValue(r){ return clamp(0.55 * (r.co2 / r.co2_0) + 0.35 * (r.vuln / 100) + (S.temp - 1.2) * 0.35 - 0.2, 0, 1); }
function heatRGB(v, pal = HEAT){ const x = clamp(v, 0, 0.999) * (pal.length - 1), i = Math.floor(x), f = x - i, a = pal[i], b = pal[i + 1]; return [0,1,2].map(k => Math.round(a[k] + (b[k] - a[k]) * f)); }
const theme = () => { try { const v = localStorage.getItem("p2050-theme") || ""; return P.Net && v && P.Net.owns("theme_" + v) ? v : ""; } catch(e) { return ""; } };
const CITY_TOT = Object.fromEntries(Object.entries(CITIES).map(([k, l]) => [k, l.reduce((s, c) => s + c[2], 0)]));
let W = 1920; const Hh = 1080;   // W follows the screen width (Kit.fit)
/* ---------- 3.x · the map drawn in real 3D ----------
   The map pieces are still GDevelop sprites (so their colour, size and visibility work as before), but on the 3D layer they
   are hidden and each one is mirrored by a textured plane in the layer's three.js scene. That gives a true perspective
   when the camera tilts. Country borders and the selected country are three.js lines and meshes. */
const flipV = g => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); uv.needsUpdate = true; return g; };   // the y flip also flips the pictures: undo it
const RES_OF = {Ocean:() => "map/ocean.png", MapRim:() => "map/rim.png", ArcticIce:() => "map/ice.png", Region:a => `map/region-${a}.png`, RegionLine:a => `map/line-${a}.png`, Plume:() => "ui/glow.png", Bubble:a => `ui/bubble-${a}.png`};
const Mirror = {
  list:[], unit:null,
  reset(){ this.list = []; this.unit = null; },
  geo(){ if (!this.unit){ const g = new THREE.PlaneGeometry(1, 1); g.translate(.5, .5, 0); this.unit = flipV(g); } return this.unit; },   // GDevelop's 3D group flips y, so local coordinates are plain world px
  add(R, o, kind){
    const tex = Map.scene.getGame().getImageManager().getThreeTexture(RES_OF[kind](o.getAnimationName()));
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({map:tex, transparent:true, depthTest:false, depthWrite:false, side:THREE.DoubleSide});
    if (o.getBlendMode && o.getBlendMode() === 1) mat.blending = THREE.AdditiveBlending;
    const m = new THREE.Mesh(this.geo(), mat); m.frustumCulled = false; m.renderOrder = o.getZOrder();
    R.add3DRendererObject(m); const e = {o, m, kind, anim:o.getAnimationName(), col:""}; this.list.push(e); return e;
  },
  drop(R, o){ const i = this.list.findIndex(e => e.o === o); if (i < 0) return; R.remove3DRendererObject(this.list[i].m); this.list[i].m.material.dispose(); this.list.splice(i, 1); },
  sync(tilt){
    for (const e of this.list){
      const o = e.o, m = e.m;
      m.visible = !o.isHidden() && o.getOpacity() > 0;
      if (!m.visible) continue;
      const a = o.getAnimationName(); if (a !== e.anim){ e.anim = a; m.material.map = Map.scene.getGame().getImageManager().getThreeTexture(RES_OF[e.kind](a)); m.material.needsUpdate = true; }
      const c = o.getColor(); if (c !== e.col){ e.col = c; const [r, g, b] = c.split(";").map(Number); m.material.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace); }
      m.material.opacity = o.getOpacity() / 255;
      if (e.kind === "Bubble"){   // bubbles stand up and face the camera (their tip stays on the country)
        const w = o.getWidth(), h = o.getHeight();
        m.position.set(o.getX() - w / 2, o.getY(), 0); m.scale.set(w, h, 1);
        m.geometry = this.stand || (this.stand = (() => { const g = new THREE.PlaneGeometry(1, 1); g.translate(.5, -.5, 0); return flipV(g); })());
        m.rotation.set(-tilt * Math.PI / 180, 0, 0);
      } else {
        m.position.set(o.getDrawableX(), o.getDrawableY(), 0); m.scale.set(o.getWidth(), o.getHeight(), 1);
      }
    }
  },
};
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
    this.borders = null; this.selPaint = null; this._selKey = null; this.selMesh = null;
    Mirror.reset(); this.R3 = this.three();
    if (this.R3){
      if (this.R3.show2DRenderingPlane) this.R3.show2DRenderingPlane(false);   // the 2D copies stay for logic only
      for (const kind of ["Ocean", "MapRim", "ArcticIce", "Region", "RegionLine", "Plume"]) for (const o of scene.getObjects(kind) || []) Mirror.add(this.R3, o, kind);
    }
    if (mode === "game") this.makePainters();
    if (mode === "menu") this.cam = {x:690, y:500, z:0.66};
    else this.cam = {x:960, y:516, z:1};
    this.target = null; this.applyCam(); this.refresh();
  },
  /* country borders: drawn once in world coordinates on the map layer, faded in when zoomed */
  makePainters(){
    if (this.R3){
      const pos = []; for (const c of CGEO) for (const p of c.p){ for (let i = 0; i < p.length; i += 2){ const j = (i + 2) % p.length; pos.push(p[i], p[i + 1], 0, p[j], p[j + 1], 0); } }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      this.borders3 = new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:0x04100c, transparent:true, opacity:0, depthTest:false, depthWrite:false}));
      this.borders3.renderOrder = 25; this.borders3.frustumCulled = false; this.R3.add3DRendererObject(this.borders3);
      return;
    }
    const mk = z => { const o = this.scene.createObject("UIPainter"); o.setLayer(""); o.setZOrder(z); o.setPosition(0, 0); if (o.setClearBetweenFrames) o.setClearBetweenFrames(false); return o; };
    this.borders = mk(25); this.selPaint = mk(26);
    const g = this.borders.getRendererObject(); g.clear();
    g.lineStyle({width:0.9, color:0x04100c, alpha:.75, join:"round"});
    for (const c of CGEO) for (const p of c.p){ g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
    g.lineStyle(0);
    g.alpha = 0;
  },
  drawSelected(){
    if (this.mode !== "game"){ if (this.selMesh && this.R3) this.R3.remove3DRendererObject(this.selMesh); this.selMesh = null; this._selKey = null; if (this.selPaint) this.selPaint.getRendererObject().clear(); return; }   // 3.4: the menu shows the 3D Earth, so the last game's selected country must not be drawn over it
    if (this.R3){
      const key = (S.selC || "") + "|" + (this.cam.z >= ZCOUNTRY ? 1 : 0); if (key === this._selKey) return; this._selKey = key;
      if (this.selMesh){ this.R3.remove3DRendererObject(this.selMesh); this.selMesh = null; }
      const id = S.selC; if (!id) return;
      const list = id.startsWith("R_") ? CGEO.filter(x => !x.c && x.r === id.slice(2)) : [GEO_OF[id]].filter(Boolean);
      const grp = new THREE.Group(), fill = [], line = [];
      for (const c of list) for (const p of c.p){
        const pts = []; for (let i = 0; i < p.length; i += 2) pts.push(new THREE.Vector2(p[i], p[i + 1]));
        try { for (const t of THREE.ShapeUtils.triangulateShape(pts, [])) for (const k of t) fill.push(pts[k].x, pts[k].y, 0); } catch(e) {}
        for (let i = 0; i < pts.length; i++){ const a = pts[i], b = pts[(i + 1) % pts.length]; line.push(a.x, a.y, 0, b.x, b.y, 0); }
      }
      const gf = new THREE.BufferGeometry(); gf.setAttribute("position", new THREE.Float32BufferAttribute(fill, 3));
      const mf = new THREE.Mesh(gf, new THREE.MeshBasicMaterial({color:0x4fd1c5, transparent:true, opacity:.28, depthTest:false, depthWrite:false, side:THREE.DoubleSide})); mf.renderOrder = 26;
      const gl = new THREE.BufferGeometry(); gl.setAttribute("position", new THREE.Float32BufferAttribute(line, 3));
      const ml = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({color:0xe6fffb, transparent:true, opacity:.95, depthTest:false, depthWrite:false})); ml.renderOrder = 27;
      grp.add(mf, ml); grp.traverse(x => { x.frustumCulled = false; }); this.selMesh = grp; this.R3.add3DRendererObject(grp);
      return;
    }
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
  three(){ const R = this.layer().getRenderer(); return R && R.getThreeCamera ? R : null; },
  /* three.js units per world px: GDevelop 5.6.27x+ scales the 3D scene (1 unit = 100 px, y flipped on the scene);
     older versions used plain px with the y flip on the layer's group. Objects stay in px either way; only camera math needs it. */
  ws(){ const sc = this.scene; return sc && sc.getRenderer3DInverseWorldScale ? sc.getRenderer3DInverseWorldScale() || 1 : 1; },
  /* place the 3D camera: zoom sets the distance, the tilt grows with the zoom, and the camera slides back
     so the point (cam.x, cam.y) stays in the middle of the screen */
  applyCam(){
    const l = this.layer(), R = this.three(), t = this.mode === "game" ? tiltAt(this.cam.z) : 0;
    l.setCameraZoom(this.cam.z); l.setCameraX(this.cam.x); l.setCameraY(this.cam.y);
    this._tilt = t; this._camOk = false;
    if (!R) return;
    R.setCameraRotationX(t);
    if (t > 0.01){ const hit = this.toWorldFromScreen(W / 2 / Kit.K, Hh / 2 / Kit.K); l.setCameraY(this.cam.y + (this.cam.y - hit[1])); this._camOk = false; }
  },
  cam3(){
    const R = this.three(); if (!R) return null;
    const c = R.getThreeCamera();
    if (!this._camOk){ if (R.updatePosition) R.updatePosition(); c.updateMatrixWorld(true); this._camOk = true; }
    return c;
  },
  /* world px → screen design units (for labels drawn on the MapUI layer) */
  toScreen(x, y){
    const c = this.cam3();
    if (!c) return [((x - this.cam.x) * this.cam.z + W / 2) / Kit.K, ((y - this.cam.y) * this.cam.z + Hh / 2) / Kit.K];
    const v = (this._v = this._v || new THREE.Vector3()).set(x * this.ws(), -y * this.ws(), 0).project(c);
    return [(v.x + 1) / 2 * W / Kit.K, (1 - v.y) / 2 * Hh / Kit.K];
  },
  /* screen design units → world px on the map plane */
  toWorldFromScreen(dx, dy){
    const c = this.cam3();
    if (!c) return [(dx * Kit.K - W / 2) / this.cam.z + this.cam.x, (dy * Kit.K - Hh / 2) / this.cam.z + this.cam.y];
    const v = (this._u = this._u || new THREE.Vector3()).set(dx * Kit.K / W * 2 - 1, 1 - dy * Kit.K / Hh * 2, 0.5).unproject(c);
    const o = c.position, kx = v.x - o.x, ky = v.y - o.y, kz = v.z - o.z, f = kz ? -o.z / kz : 0;
    const e = this.ws(); return [(o.x + kx * f) / e, -(o.y + ky * f) / e];
  },
  geoAt(x, y){ return geoAtWorld(x, y); },
  colorsChanged(){ HEAT = P.A11y && P.A11y.cb ? HEAT_CB : HEAT_N; if (this.scene && this.refresh) this.refresh(); },
  /* where a build pin goes: a seeded random point well inside the country (web/src/mapfx.js placePin) */
  pinPoint(p){
    if (p.xy) return p.xy;
    this._pins = this._pins || {}; if (this._pins[p.id]) return this._pins[p.id];
    const g = GEO_OF[p.c]; let pos = null;
    if (g){
      let seed = p.sd | 0; const r = () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
      const w = g.b[2] - g.b[0], h = g.b[3] - g.b[1], m = Math.min(w, h) * .08;
      for (let i = 0; i < 80 && !pos; i++){ const x = g.b[0] + w * (.1 + .8 * r()), y = g.b[1] + h * (.1 + .8 * r()); if (inRings(g.p, x, y) && inRings(g.p, x + m, y) && inRings(g.p, x - m, y) && inRings(g.p, x, y + m) && inRings(g.p, x, y - m)) pos = [x, y]; }
    }
    if (!pos) pos = countryPoint(p.c);
    return (this._pins[p.id] = pos);
  },
  latlonScreen(lat, lon){ const [x, y] = toWorld(lat, lon); return this.toScreen(x, y); },
  clampCam(){
    const z = this.cam.z, halfW = W / 2 / z, halfH = Hh / 2 / z;
    // 3.5: like the website, the map can't be dragged past its edge (the ice round it shows only a little)
    this.cam.x = clamp(this.cam.x, Math.min(960, 0 + halfW - 90 / z), Math.max(960, 1920 - halfW + 90 / z));
    this.cam.y = clamp(this.cam.y, Math.min(516, MAP_TOP + halfH - 70 / z), Math.max(516, MAP_TOP + 807 - halfH + 70 / z));
  },
  onResize(gw){ W = gw; this._ck = null; if (this.scene) this.applyCam(); },
  freeCx(){ const dw = P.Screens ? P.Screens.drawerWidth() : 0; return (Kit.W - 16 - dw - 16) / 2 * Kit.K; },
  /* move the camera so a world point is centred in the part of the screen the drawer doesn't cover */
  lookAt(x, y, z){ this.zAnim = null; this.target = {x: x - (this.freeCx() - W / 2) / z, y: y + 20 / z, z}; },
  focus(reg, zoomIn){
    if (this.mode !== "game" || !RMETA[reg]) return;
    const [lat, lon] = RMETA[reg].lab; const [x, y] = toWorld(lat, lon);
    const z = zoomIn ? Math.max(this.cam.z, 1.6) : this.cam.z;
    if (z > 1.05) this.lookAt(x, y, z); else this.target = {x: x - (this.freeCx() - W / 2) / z, y:516, z};
  },
  focusCountry(id){ const pt = countryPoint(id); if (!pt || this.mode !== "game") return; this.lookAt(pt[0], pt[1], Math.max(this.cam.z, id.startsWith("R_") ? 1.6 : 2.0)); },
  /* drawer closed: slide back to the whole-world view (when not zoomed in) */
  recenter(){ if (this.mode === "game" && this.cam.z <= 1.05) this.target = {...HOME}; },
  resetView(){ if (this.mode === "game"){ this.zAnim = null; this.target = {...HOME}; Kit.dirty(); } },
  zoomBy(f){
    if (this.mode !== "game") return; this.zAnim = null;
    const z0 = this.target ? this.target.z : this.cam.z, z1 = clamp(z0 * f, ZMIN, ZMAX);
    if (z1 <= ZMIN + .001){ this.target = {...HOME}; return; }   // 3.x: fully zoomed out → always back to the centre
    const cx = this.target ? this.target.x : this.cam.x, cy = this.target ? this.target.y : this.cam.y; this.target = {x:cx, y:cy, z:z1};
  },
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
      const size = amt <= 0.02 || (P.Gfx && P.Gfx.level === "low") ? 0 : (0.035 + Math.sqrt(amt) * 0.075) * 300;   // px
      v.get("Base").setNumber(size / 96);
      const g = clamp(0.55 - r.co2 / r.co2_0 * 0.35, 0.15, 0.7);
      p.setColor(th === "night" ? `255;${Math.round(200 + g * 50)};120` : `255;${Math.round(g * 255)};38`);
    }
    this.syncBubbles(); this._selKey = null; this.drawSelected();
  },
  bubblePoint(b){
    if (b.cid){ const pt = countryPoint(b.cid); if (pt) return pt; }
    if (b.lat == null && b.reg){ const pt = countryPoint("R_" + b.reg); if (pt) return pt; }
    return b.lat == null ? toWorld(0, 0) : toWorld(b.lat, b.lon);
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
        this.bubbles[b.id] = o; if (this.R3) Mirror.add(this.R3, o, "Bubble");
      }
    }
    for (const id in this.bubbles) if (!live.has(+id)){ if (this.R3) Mirror.drop(this.R3, this.bubbles[id]); this.bubbles[id].deleteFromScene(this.scene); delete this.bubbles[id]; }
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
    if (P.UIM && P.UIM.placing && P.Screens.placeTap) return P.Screens.placeTap(m.x, m.y);   // placing a build: the grid takes every tap
    const now = performance.now();
    if (now - this.lastTap < 320 && Math.abs(m.x - this.lastTapX) + Math.abs(m.y - this.lastTapY) < 24){ this.lastTap = 0; this.resetView(); return true; }
    this.lastTap = now; this.lastTapX = m.x; this.lastTapY = m.y;
    // 3.x: bubbles first (found on screen, so a tilted map still picks the right one)
    for (const id in this.bubbles){ const o = this.bubbles[id], [bx, by] = this.toScreen(o.getX(), o.getY()); if (Math.hypot(bx - m.x, by - m.y) < 26){ if (P.popBubble(+id, bx, by - 26)) return true; } }
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
          this.cam.z = z1; this.applyCam(); const w = this.toWorldFromScreen(mx / Kit.K, my / Kit.K);
          this.cam.x += this.pinch.w[0] - w[0]; this.cam.y += this.pinch.w[1] - w[1]; this.clampCam();
        }
        this.drag = null;
      } else {
        if (this.pinch){ this.pinch = null; this.pinchEnded = performance.now(); m.moved = 99; if (this.cam.z <= ZMIN + .02) this.target = {...HOME}; }
        // drag to pan (only when the press started on the map)
        if (m.down && !m.onUI && !modal){
          if (!this.drag) this.drag = {x:m.x, y:m.y};
          else if (m.moved > 6){ const a = this.toWorldFromScreen(this.drag.x, this.drag.y), b = this.toWorldFromScreen(m.x, m.y); this.cam.x -= b[0] - a[0]; this.cam.y -= b[1] - a[1]; this.target = null; this.zAnim = null; this.drag = {x:m.x, y:m.y, did:true}; this.clampCam(); this.applyCam(); }
        } else { if (this.drag && this.drag.did && this.cam.z <= ZMIN + .02) this.target = {...HOME}; this.drag = null; }
      }
      const wheel = im.getMouseWheelDelta ? im.getMouseWheelDelta() : 0;
      if (wheel && !Kit.wheelUsed && !Kit.overUI && !modal){
        // 3.x: smooth — the wheel sets a zoom goal; the camera eases toward it, keeping the point under the cursor still
        const A = this.zAnim, same = A && Math.abs(A.sx - m.x) + Math.abs(A.sy - m.y) < 8;
        const w = same ? [A.wx, A.wy] : this.toWorldFromScreen(m.x, m.y);
        this.target = null; this.zAnim = {z:clamp((A ? A.z : this.cam.z) * (wheel > 0 ? 1.15 : 1 / 1.15), ZMIN, ZMAX), sx:m.x, sy:m.y, wx:w[0], wy:w[1]};
      }
    } else {
      this.cam.x = 960 - (1230 + (W - 1920) * .6 - W / 2) + Math.sin(this.scene.getTimeManager().getTimeFromStart() / 9000) * 40;   // menu: slow drift
    }
    if (this.zAnim){
      const A = this.zAnim, k = 1 - Math.pow(.8, dt * 60);
      let z = Math.exp(Math.log(this.cam.z) + (Math.log(A.z) - Math.log(this.cam.z)) * k); if (Math.abs(A.z - z) < .002) z = A.z;
      this.cam.z = z; this.applyCam(); const w = this.toWorldFromScreen(A.sx, A.sy);
      this.cam.x += A.wx - w[0]; this.cam.y += A.wy - w[1]; this.clampCam();
      if (z === A.z){ this.zAnim = null; if (z <= ZMIN + .001) this.target = {...HOME}; }
    }
    if (this.target){
      const k = 1 - Math.pow(0.86, dt * 60);
      this.cam.x += (this.target.x - this.cam.x) * k; this.cam.y += (this.target.y - this.cam.y) * k; this.cam.z += (this.target.z - this.cam.z) * k;
      if (Math.abs(this.target.x - this.cam.x) < 0.5 && Math.abs(this.target.y - this.cam.y) < 0.5 && Math.abs(this.target.z - this.cam.z) < 0.002){ this.cam.x = this.target.x; this.cam.y = this.target.y; this.cam.z = this.target.z; this.target = null; this.clampCam(); }
    }
    const key = `${this.cam.x.toFixed(1)},${this.cam.y.toFixed(1)},${this.cam.z.toFixed(3)}`;
    if (key !== this._ck){
      const wasC = this._z >= ZCOUNTRY, isC = this.cam.z >= ZCOUNTRY; this._z = this.cam.z;
      this._ck = key; this.applyCam(); Kit.dirty("MapUI");
      if (this.borders) this.borders.getRendererObject().alpha = clamp((this.cam.z - 1.05) / (ZCOUNTRY - 1.05), 0, 1);
      if (this.borders3) this.borders3.material.opacity = .75 * clamp((this.cam.z - 1.05) / (ZCOUNTRY - 1.05), 0, 1);
      if (wasC !== isC){ Kit.dirty("HUD"); for (const r of S.regions){ const ln = this.lines[r.id]; if (ln) ln.hide(S.sel !== r.id || isC); } this.drawSelected(); }
    }
    if (this.floats.length){ this.floats.forEach(f => f.t += dt); this.floats = this.floats.filter(f => f.t < 1.2); Kit.dirty("MapUI"); }
    if (this.fx.length){ this.fx.forEach(f => f.t += dt); this.fx = this.fx.filter(f => f.t < 2.2); Kit.dirty("MapUI"); }
    if (this.mode === "game" && S.haz && S.haz.length){ this._pulse = (this._pulse || 0) + dt; if (this._pulse > 0.05){ this._pulse = 0; Kit.dirty("MapUI"); } }
  },
  isCountryZoom(){ return this.cam.z >= ZCOUNTRY; },
};
const _upd = Map.update; Map.update = function(dt){ _upd.call(this, dt); if (this.R3) Mirror.sync(this._tilt || 0); };
P.Map = Map; P._Mirror = Mirror; P.toWorld = toWorld; P.heatRGB = heatRGB; P.regionHeatValue = regionHeatValue; P.regionAtWorld = regionAtWorld; P.countryPoint = countryPoint; P.CGEO = CGEO; P.ZCOUNTRY = ZCOUNTRY;
const H = P.H = P.H || {};
H.mapRefresh = () => Map.refresh();
H.mapFocus = () => {};   // 3.6.1: an event no longer moves the camera (like the website)
H.floatText = (x, y, txt, color) => Map.floatText(x, y, txt, color);
H.hazardStrike = (h, d) => {
  Map.hazardFx(h, d);
  const A = P.Audio, n = P.HAZARDS[h.type].snd;
  if (A && !S.event && !A.amb){ A.ambience(n); setTimeout(() => { if (A.amb === n && !S.event) A.stopAmb(900); }, 2600); }
};
H.hazardWarn = h => Kit.dirty("MapUI");
