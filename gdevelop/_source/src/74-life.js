const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.life) return;
(P.mods = P.mods || {}).life = 1;
/* =========================================================================
   Life · 3.6 — a livelier map (like web/src/life.js)
   3D on the map layer (tips back with the camera):
     · clouds drifting west → east above the planes, with shadows; hurricanes / typhoons spin over the country they will hit
     · forests growing back: countries with finished forest / mangrove builds turn greener month by month
   2D on the MapUI layer (Screens.drawRigs / drawTrains, called from 61-hud.js; wind / solar fields in 71-place.js):
     · oil rigs on the big oil fields, flaring until the country goes green (green ≥ 60)
     · high-speed trains between the nearest big cities wherever a rail build is finished
   ========================================================================= */
const {S, Map, toWorld, Kit, Screens, L} = P;
const k = Kit;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2, MAPW = P.MAPW || 1920, LON0 = 11;
let seed = 99; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const lowGfx = () => P.Gfx && P.Gfx.level === "low";
const night = () => { try { const v = localStorage.getItem("p2050-theme") || ""; return v === "night" && P.Net && P.Net.owns("theme_night"); } catch(e) { return false; } };

/* ---------- pictures (the same as the website) ---------- */
/* 3.7: flat, thin sheets of cloud (wispy noise stretched along the wind), not round puffs */
function cloudCanvas(v, dark){
  const W = 384, H = 150, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), img = g.createImageData(W, H), d = img.data;
  const hash = (i, j) => { const h = Math.sin(i * 127.1 + j * 311.7 + v * 74.7) * 43758.5453; return h - Math.floor(h); };
  const sm = t => t * t * (3 - 2 * t);
  const vn = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
    return (hash(i, j) * (1 - fx) + hash(i + 1, j) * fx) * (1 - fy) + (hash(i, j + 1) * (1 - fx) + hash(i + 1, j + 1) * fx) * fy; };
  const sk = .25 + .2 * (v % 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const u = x / W * 2 - 1, w = y / H * 2 - 1, xx = x + y * sk * 2;
    const n = .5 * vn(xx / 70, y / 26) + .28 * vn(xx / 30 + 9, y / 11 + 3) + .14 * vn(xx / 13 + 5, y / 5 + 7) + .08 * vn(xx / 6, y / 3 + 11);
    const edge = Math.max(0, 1 - (u * u + w * w * 1.1));
    const a = Math.max(0, Math.min(1, (n - .42) * 2.4)) * Math.min(1, edge * 2.2);
    const k = (y * W + x) * 4;
    if (dark){ d[k] = 0; d[k + 1] = 10; d[k + 2] = 20; d[k + 3] = a * 90; }
    else { const l = 232 + 23 * n; d[k] = l; d[k + 1] = l + 4; d[k + 2] = Math.min(255, l + 10); d[k + 3] = a * 200; }
  }
  g.putImageData(img, 0, 0);
  if (dark){ const b = document.createElement("canvas"); b.width = W; b.height = H; const bg = b.getContext("2d"); bg.filter = "blur(5px)"; bg.drawImage(cv, 0, 0); return b; }
  return cv;
}
function spiralCanvas(dark){
  const N = 256, c = N / 2, cv = document.createElement("canvas"); cv.width = cv.height = N;
  const g = cv.getContext("2d");
  if (dark) g.filter = "blur(6px)";
  const base = g.createRadialGradient(c, c, 8, c, c, c);
  base.addColorStop(0, dark ? "rgba(0,10,20,.35)" : "rgba(255,255,255,.2)"); base.addColorStop(.5, dark ? "rgba(0,10,20,.25)" : "rgba(235,242,250,.55)"); base.addColorStop(1, "rgba(235,242,250,0)");
  g.fillStyle = base; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
  g.lineCap = "round";
  for (let arm = 0; arm < 4; arm++) for (let t = 0; t < 1; t += .012){
    const a = arm * TAU / 4 + t * 4.2, rr = 10 + t * (c - 14);
    g.strokeStyle = dark ? `rgba(0,10,20,${.18 * (1 - t)})` : `rgba(255,255,255,${.5 * (1 - t * .8)})`;
    g.lineWidth = 6 + t * 26; g.beginPath(); g.arc(c, c, rr, a, a + .09); g.stroke();
  }
  if (!dark){ g.globalCompositeOperation = "destination-out"; const eye = g.createRadialGradient(c, c, 0, c, c, 12); eye.addColorStop(0, "rgba(0,0,0,1)"); eye.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = eye; g.fillRect(0, 0, N, N); }
  return cv;
}
const texCache = {};
const texOf = (key, make) => { if (!texCache[key]){ const t = new THREE.CanvasTexture(make()); t.colorSpace = THREE.SRGBColorSpace; texCache[key] = t; } return texCache[key]; };
const plane = (tex, order) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map:tex, transparent:true, depthTest:false, depthWrite:false, side:THREE.DoubleSide})); m.renderOrder = order; m.frustumCulled = false; return m; };

const Life = {
  R:null, on:false,
  init(R, mode){
    this.R = R; this.on = mode === "game" && !!R; this.forest = {}; this.storms = {};
    if (!this.on) return;
    try {
      // clouds
      this.clouds = [];
      for (let i = 0; i < 8; i++){   // 3.7: fewer
        const band = rnd(), lat = band < .4 ? 38 + rnd() * 24 : band < .7 ? -45 + rnd() * 18 : -8 + rnd() * 20;
        const [x, y] = toWorld(lat, LON0 - 180 + rnd() * 360), v = i % 6, s = .55 + rnd() * .6;
        const cl = {x, y, s, sp:5 + rnd() * 5, m:plane(texOf("c" + v, () => cloudCanvas(v)), 50), sh:plane(texOf("cd" + v, () => cloudCanvas(v, true)), 39)};
        R.add3DRendererObject(cl.sh); R.add3DRendererObject(cl.m); this.clouds.push(cl);
      }
    } catch(e){ console.warn("life", e); this.on = false; }
  },
  update(dt){
    if (!this.on || !this.R || Map.mode !== "game") return;
    const low = lowGfx(), z = Map.cam.z, run = S.started && !S.over && S.speed > 0, nt = night(), now = performance.now() / 1000;
    const h = 46, a = (low ? 0 : .42) * clamp(1.45 - z * .2, .45, 1) * (nt ? .5 : 1);   // 3.7: thin and faint
    // clouds
    for (const cl of this.clouds || []){
      if (run) cl.x += cl.sp * dt; if (cl.x > MAPW + 180) cl.x -= MAPW + 360;
      const w = 304 * cl.s, hh = 120 * cl.s;
      cl.m.visible = cl.sh.visible = a > 0;
      cl.m.position.set(cl.x, cl.y, h); cl.m.scale.set(w, hh, 1); cl.m.material.opacity = a;
      cl.sh.position.set(cl.x + h * .3, cl.y + h * .38, .4); cl.sh.scale.set(w, hh, 1); cl.sh.material.opacity = a * .35;
    }
    // storms: a spinning spiral over each hurricane / typhoon that is coming
    const want = new Set();
    for (const hz of S.haz || []){
      if (hz.type !== "hurricane" && hz.type !== "typhoon") continue;
      const pt = P.countryPoint(hz.c); if (!pt) continue;
      want.add(hz.id);
      let st = this.storms[hz.id];
      if (!st){ st = this.storms[hz.id] = {m:plane(texOf("sp", () => spiralCanvas()), 51), sh:plane(texOf("spd", () => spiralCanvas(true)), 39)}; this.R.add3DRendererObject(st.sh); this.R.add3DRendererObject(st.m); }
      const size = 152 * (.7 + .3 * (hz.sev || 1)), left = Math.max(0, hz.at - S.tick), sa = low ? 0 : .85 * clamp(1.15 - left / 6, .35, 1), north = pt[1] < toWorld(0, LON0)[1];
      st.m.position.set(pt[0] + 32, pt[1] + 8, h + 4); st.m.scale.set(size, size, 1); st.m.rotation.z = (north ? 1 : -1) * now * .9; st.m.material.opacity = sa;
      st.sh.position.set(pt[0] + 32 + h * .3, pt[1] + 8 + h * .38, .4); st.sh.scale.set(size, size, 1); st.sh.rotation.z = st.m.rotation.z; st.sh.material.opacity = sa * .8;
      st.m.visible = st.sh.visible = sa > 0;
    }
    for (const id of Object.keys(this.storms)) if (!want.has(+id)){ const st = this.storms[id]; this.R.remove3DRendererObject(st.m); this.R.remove3DRendererObject(st.sh); delete this.storms[id]; }
    // forests growing back (checked twice a second)
    this._fT = (this._fT || 0) + dt; if (this._fT > .5){ this._fT = 0; this.updateForest(); }
  },
  updateForest(){
    const lv = {};
    for (const p of S.pins || []) if ((p.k === "forest" || p.k === "mangrove") && p.done) lv[p.c] = (lv[p.c] || 0) + clamp((S.tick - (p.t || 0)) / 48, .15, 1) * .13;
    for (const [cid, a0] of Object.entries(lv)){
      const a = clamp(a0, 0, .34);
      let m = this.forest[cid];
      if (!m){
        const fill = [];
        for (const c of P.CGEO || []) if (c.c === cid) for (const p of c.p){
          const v = []; for (let i = 0; i < p.length; i += 2) v.push(new THREE.Vector2(p[i], p[i + 1]));
          try { for (const t of THREE.ShapeUtils.triangulateShape(v, [])) for (const kk of t) fill.push(v[kk].x, v[kk].y, 0); } catch(e) {}
        }
        if (!fill.length) continue;
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(fill, 3));
        m = this.forest[cid] = new THREE.Mesh(g, new THREE.MeshBasicMaterial({color:0x2fbf6a, transparent:true, opacity:0, depthTest:false, depthWrite:false, side:THREE.DoubleSide}));
        m.renderOrder = 10.5; m.frustumCulled = false; this.R.add3DRendererObject(m);
      }
      m.material.opacity = a; m.visible = a > 0;
    }
    for (const [cid, m] of Object.entries(this.forest)) if (!(cid in lv)) m.visible = false;
  },
};
P.Life = Life;
const _init = Map.init; Map.init = function(scene, mode){ _init.call(this, scene, mode); Life.init(this.R3, mode); };
const _upd = Map.update; Map.update = function(dt){ _upd.call(this, dt); Life.update(dt); };

/* ---------- 2D: oil rigs ---------- */
const OIL_FIELDS = [["NOR", 58.4, 2.3, 1], ["GBR", 57.6, 1.0, 1], ["USA", 27.6, -90.6, 1], ["USA", 70.3, -148.5, 0], ["MEX", 19.6, -92.4, 1], ["CAN", 57.0, -111.6, 0],
  ["VEN", 10.3, -71.6, 1], ["BRA", -22.9, -40.4, 1], ["SAU", 26.6, 50.6, 1], ["ARE", 24.8, 53.4, 1], ["QAT", 25.9, 52.3, 1], ["KWT", 29.2, 47.9, 0], ["IRQ", 30.6, 47.4, 0],
  ["IRN", 29.4, 50.6, 1], ["NGA", 4.3, 5.8, 1], ["AGO", -7.8, 12.0, 1], ["DZA", 31.7, 6.1, 0], ["LBY", 28.4, 19.6, 0], ["RUS", 61.3, 73.4, 0], ["KAZ", 46.4, 51.6, 0],
  ["AZE", 40.2, 50.8, 1], ["CHN", 38.6, 119.6, 1], ["MYS", 5.6, 104.6, 1], ["IDN", -1.2, 117.2, 0]];
let rigPts = null;
Screens.drawRigs = function(l){
  if (!S.regions || !P.COUNTRY) return;
  if (!rigPts) rigPts = OIL_FIELDS.filter(f => P.COUNTRY[f[0]]).map(([cid, lat, lon, sea], i) => ({cid, p:toWorld(lat, lon), sea, ph:i * 1.37}));
  const M = Map, z = M.cam.z; if (z < 1.12) return;
  const now = performance.now() / 1000, s = clamp(6 + 6 * Math.sqrt(z), 12, 26), vis = (x, y) => x > -30 && y > 40 && x < k.W + 30 && y < k.H - 30;
  let any = false;
  for (const r of rigPts){
    const [x, y] = M.toScreen(r.p[0], r.p[1]); if (!vis(x, y)) continue;
    const cc = P.C && P.C(r.cid), burn = !cc || (cc.green || 0) < 60; any = any || burn;
    if (r.sea){ k.circle(l, x, y + s * .5, s * .5, "#0a1e2d", {a:.5}); for (const lx of [-.32, .32]) k.line(l, x + lx * s, y + s * .5, x + lx * s * .8, y + s * .1, "#5d6a72", {w:1.4}); }
    k.rect(l, x - s * .42, y + s * .02, s * .84, s * .12, burn ? "#4a545b" : "#3b4f47");
    const col = burn ? "#cfd6da" : "#9fc9b4";
    k.line(l, x - s * .2, y + s * .02, x - s * .05, y - s * .62, col, {w:1.2}); k.line(l, x - s * .05, y - s * .62, x + s * .1, y + s * .02, col, {w:1.2});
    k.line(l, x - s * .16, y - s * .15, x + s * .06, y - s * .15, col, {w:1.2}); k.line(l, x - s * .12, y - s * .35, x + s * .02, y - s * .35, col, {w:1.2});
    k.line(l, x + s * .3, y + s * .04, x + s * .62, y - s * .34, col, {w:1.2});
    const fx = x + s * .66, fy = y - s * .4;
    if (burn){
      const f = .75 + .25 * Math.sin(now * 13 + r.ph) * Math.sin(now * 7.3 + r.ph * 2);
      k.circle(l, fx, fy, s * .55 * f, "#ff8a2a", {a:.22});
      k.circle(l, fx, fy - s * .1 * f, s * .17 * f, "#ff781e", {a:.9});
      k.circle(l, fx, fy - s * .05, s * .08 * f, "#ffe68c", {a:.95});
      if (!lowGfx()) for (let i = 0; i < 3; i++){ const q = (now * .35 + i / 3 + r.ph) % 1; k.circle(l, fx + q * s * .5, fy - s * .45 - q * s * .9, s * (.1 + q * .22), "#3c4046", {a:.45 * (1 - q)}); }
    } else k.circle(l, fx - s * .04, fy + s * .06, s * .07, "#5fd39a");
    k.hit(l, "rig-" + r.cid + r.ph, x - s * .5, y - s * .6, s * 1.2, s * 1.2, () => { M.info = {x, y:y - s * .8, t:performance.now(), txt:`${L(burn ? {th:"แท่นขุดเจาะน้ำมัน · ยังเผาก๊าซทิ้ง", en:"Oil rig · still flaring gas"} : {th:"แท่นขุดเจาะน้ำมัน · ปิดแล้ว", en:"Oil rig · shut down"})} · ${P.cname(r.cid)}`}; k.dirty("MapUI"); });
  }
  if (any && !lowGfx()) this._edgeAnim = true;   // the flares flicker
};

/* ---------- 2D: high-speed trains ---------- */
const railCache = new window.Map();
function railRoute(p, pos){
  if (railCache.has(p.id)) return railCache.get(p.id);
  const cc = P.C && P.C(p.c), list = (P.CITIES[cc && cc.reg] || []).map(([lat, lon]) => toWorld(lat, lon));
  list.sort((a, b) => Math.hypot(a[0] - pos[0], a[1] - pos[1]) - Math.hypot(b[0] - pos[0], b[1] - pos[1]));
  const ends = list.filter(q => Math.hypot(q[0] - pos[0], q[1] - pos[1]) < 210).slice(0, 2);
  const pts = ends.length >= 2 ? [ends[0], pos, ends[1]] : ends.length ? [pos, ends[0]] : [[pos[0] - 32, pos[1] + 8], pos, [pos[0] + 32, pos[1] - 5]];
  const seg = [0]; for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const r = {pts, seg, len:seg[seg.length - 1] || 1}; railCache.set(p.id, r); return r;
}
function along(r, d){
  d = clamp(d, 0, r.len); let i = 1; while (i < r.seg.length - 1 && r.seg[i] < d) i++;
  const a = r.pts[i - 1], b = r.pts[i], f = (d - r.seg[i - 1]) / Math.max(1e-6, r.seg[i] - r.seg[i - 1]);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
Screens.drawTrains = function(l){
  const pins = (S.pins || []).filter(p => p.k === "rail" && p.done); if (!pins.length) return;
  const M = Map, z = M.cam.z; if (z < 1.15) return;
  const now = performance.now() / 1000, vis = (x, y) => x > -60 && y > 0 && x < k.W + 60 && y < k.H;
  for (const p of pins){
    const pos = M.pinPoint(p); if (!pos) continue;
    const r = railRoute(p, pos), sp = r.pts.map(q => M.toScreen(q[0], q[1]));
    if (!sp.some(q => vis(q[0], q[1]))) continue;
    for (let i = 1; i < sp.length; i++){ k.line(l, sp[i - 1][0], sp[i - 1][1], sp[i][0], sp[i][1], "#14181c", {w:3.4, a:.7}); k.line(l, sp[i - 1][0], sp[i - 1][1], sp[i][0], sp[i][1], "#f2c14e", {w:1.2, a:.7}); }
    for (const [ph, dir] of [[0, 1], [.5, -1]]){
      const u = (now * 22 / r.len + ph + (p.sd % 100) / 100) % 2, f = u < 1 ? u : 2 - u, fwd = (u < 1 ? 1 : -1) * dir;
      const d = (dir > 0 ? f : 1 - f) * r.len, L1 = clamp(8 / Math.sqrt(z), 3, 7);
      const [hx, hy] = M.toScreen(...along(r, d + L1 * fwd)), [tx, ty] = M.toScreen(...along(r, d - L1 * 2.4 * fwd));
      k.line(l, tx + 1, ty + 2, hx + 1, hy + 2, "#00080e", {w:5.5, a:.35});
      k.line(l, tx, ty, hx, hy, "#f4f7f8", {w:5});
      k.line(l, tx, ty, hx, hy, "#2bb3a6", {w:1.4});
    }
  }
  this._edgeAnim = true;
};

/* ---------- 2D: 3.7.4 the season on the map (like web/src/life.js drawSeason) ----------
   winter: snow over the north · hot season: heat haze over South Asia / the Middle East, smoke over mainland Southeast
   Asia · monsoon: rain over South and Southeast Asia, heat over the northern summer · storm season: rain bands over
   the Western Pacific and the Caribbean. Stronger as the world warms (P.seasonPower). */
const SEA_AREAS = {
  cool:[[48, 66, -128, -62, "snow"], [47, 66, 2, 58, "snow"], [44, 64, 62, 138, "snow"]],
  hot:[[10, 30, 68, 92, "heat"], [16, 32, 36, 58, "heat"], [14, 22, 96, 106, "smoke"], [-2, 6, 98, 116, "smoke"]],
  monsoon:[[8, 27, 70, 92, "rain"], [8, 24, 94, 122, "rain"], [36, 48, -8, 30, "heat"], [30, 42, -118, -92, "heat"]],
  storm:[[12, 30, 122, 150, "rain"], [14, 28, -88, -62, "rain"]],
};
const SEA_COL = {snow:"#ebf5ff", heat:"#ff8c3c", smoke:"#968264", rain:"#466e96"};
const seaParts = []; for (let i = 0; i < 260; i++) seaParts.push([rnd(), rnd(), rnd()]);
Screens.drawSeason = function(l){
  if (lowGfx() || !S.regions || !P.seasonOf) return;
  const sea = P.seasonOf(S.tick), areas = SEA_AREAS[sea.id]; if (!areas) return;
  const M = Map, z = M.cam.z, kk = clamp(P.seasonPower ? P.seasonPower() : 1, 1, 2), fade = clamp(1.6 - z * .25, .35, 1);
  const run = S.speed > 0 && !S.event && !(P.UIM && P.UIM.modalOpen()), t = run ? performance.now() / 1000 : (this._seaT || performance.now() / 1000); if (run) this._seaT = t;
  let moving = false;
  areas.forEach(([la0, la1, lo0, lo1, kind], ai) => {
    const a0 = toWorld(la1, lo0), a1 = toWorld(la0, lo1), [x0, y0] = M.toScreen(a0[0], a0[1]), [x1, y1] = M.toScreen(a1[0], a1[1]);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
    if (cx + rx < 0 || cx - rx > k.W || cy + ry < 0 || cy - ry > k.H || rx < 4) return;
    const col = SEA_COL[kind], a = (kind === "heat" ? .07 + .02 * Math.sin(t * 1.3 + ai) : kind === "snow" ? .06 : .09) * kk * fade;
    // a soft oval: a few overlapping circles, fainter toward the edge
    const n0 = Math.max(1, Math.round(rx / ry)); for (let i = 0; i < n0; i++){ const px = cx - rx + ry + (n0 > 1 ? i * (2 * rx - 2 * ry) / (n0 - 1) : rx - ry); k.circle(l, px, cy, ry, col, {a}); k.circle(l, px, cy, ry * .6, col, {a:a * .8}); }
    if (kind === "heat") return;
    moving = true;
    const n = Math.round((kind === "smoke" ? 12 : kind === "snow" ? 50 : 40) * kk), sc = clamp(Math.sqrt(rx * ry) / 90, .7, 1.6);
    for (let i = 0; i < n; i++){
      const p = seaParts[(i * 7 + ai * 41) % seaParts.length], ang = p[0] * TAU, rr = Math.sqrt(p[1]) * .9;
      let px = cx + Math.cos(ang) * rr * rx, py = cy + Math.sin(ang) * rr * ry;
      const ph = (t * (kind === "rain" ? .9 : kind === "snow" ? .18 : .05) + p[2]) % 1, vis2 = 1 - Math.abs(ph - .5) * 2;
      if (kind === "rain"){ py += (ph - .5) * ry * .5; px += (ph - .5) * ry * .15; const L0 = 10 * sc; k.line(l, px, py, px + L0 * .3, py + L0, "#c8e1fa", {w:1.3, a:.65 * vis2 * fade}); }
      else if (kind === "snow"){ py += (ph - .5) * ry * .6; px += Math.sin(t + i) * 3; k.circle(l, px, py, 1.9 * sc, "#fafcff", {a:.85 * vis2 * fade}); }
      else { px += ph * rx * .4; py -= ph * ry * .3; k.circle(l, px, py, 10 * sc * (.6 + ph), col, {a:.26 * (1 - ph) * fade}); }
    }
  });
  if (moving && run) this._edgeAnim = true;   // redraw the map layer a few times a second while it rains / snows
};
