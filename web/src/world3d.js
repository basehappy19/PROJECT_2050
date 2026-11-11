/* 3.9 · The map in 3D — on the same three.js layer as the planes (air3d.js), tipped back with the map's tilt:
   · trains: high-speed trains (and Shinkansen-style bullet trains in Japan, Taiwan, Beijing–Shanghai and Mumbai) on the
     real corridors that run today, more corridors as the rail skill (I2) rolls out, freight trains on the big cargo
     lines (diesel with smoke until the line is electrified) and passenger trains on the long ones (electric trains
     where the line is electrified, diesel-hauled coaches where it isn't). Each line is double track: trains going
     opposite ways keep to their own side. Where a train is depends only on the clock, never on the zoom.
   · industry: coal plants, steelworks, cement works, refineries, mines and EV factories at real sites; they smoke as
     much as their continent still emits and turn clean when it does
   · trees: forest and mangrove builds grow into groves of 3D trees over four years
   · disasters you can see: floods spread over the land and drain away, wildfires burn across a country with flames and
     smoke and leave a black scar, drought cracks the ground, heatwaves glow, salt water creeps in from the coast
   · snow: the northern winter whitens the land with snow falling over it
   Everything lives in map units inside one group (world) that is moved and scaled with the camera every frame, so
   nothing is rebuilt when you pan or zoom. Only used with the GPU map and a graphics level above "low"; otherwise
   the flat pictures in mapfx.js / life.js are drawn as before. Visual only: no game rule reads anything from here. */
import * as THREE from "three";
import {mergeGeometries} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {P, S, L} from "./core.js";
import {ll} from "./geo.js";
import {Gfx} from "./gfx.js";
import {placePin} from "./mapfx.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
const sm = t => t * t * (3 - 2 * t);
const ss = (a, b, x) => sm(clamp((x - a) / (b - a), 0, 1));
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const mrng = sd => { let x = Math.floor(sd * 2147483646) + 1; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };

/* ---------------- geometry helpers: parts with a vertex colour, merged into one mesh ---------------- */
function paint(geo, hex){
  const g = geo.index ? geo.toNonIndexed() : geo; if (g.attributes.uv) g.deleteAttribute("uv");
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++){ a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3)); return g;
}
const box = (w, d, h, x, y, z, col) => { const g = new THREE.BoxGeometry(w, d, h); g.translate(x, y, z + h / 2); return paint(g, col); };
const cyl = (r0, r1, h, x, y, z, col, seg = 10) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.rotateX(Math.PI / 2); g.translate(x, y, z + h / 2); return paint(g, col); };
const cylX = (r, len, x, y, z, col, seg = 10) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(Math.PI / 2); g.translate(x, y, z); return paint(g, col); };
const lathe = (pts, x, y, z, col, seg = 14) => { const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg); g.rotateX(Math.PI / 2); g.translate(x, y, z); return paint(g, col); };
const ico = (r, x, y, z, col, det = 0, sz = 1) => { const g = new THREE.IcosahedronGeometry(r, det); g.scale(1, 1, sz); g.translate(x, y, z); return paint(g, col); };
const cone = (r, h, x, y, z, col, seg = 7) => { const g = new THREE.ConeGeometry(r, h, seg); g.rotateX(Math.PI / 2); g.translate(x, y, z + h / 2); return paint(g, col); };
const merge = parts => { const g = mergeGeometries(parts, false); g.computeVertexNormals(); return g; };
/* a side profile (x along the car, z up) extruded across the car */
function profile(pts, width, col){
  const s = new THREE.Shape(); pts.forEach(([x, z], i) => i ? s.lineTo(x, z) : s.moveTo(x, z)); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth:width, bevelEnabled:false}); g.rotateX(Math.PI / 2); g.translate(0, width / 2, 0); return paint(g, col);
}

/* ---------------- models (1 unit = one car length / one site across) ---------------- */
function buildModels(){
  const W = "#f2f5f7", TEAL = "#2bb3a6", GLASS = "#1b3446", DARK = "#2a2f35", GREY = "#77818a";
  const car = {};
  // high-speed train: a long nose and a teal stripe (the same livery as the clean planes)
  car.hsrHead = merge([
    profile([[-.5, .02], [.18, .02], [.5, .07], [.5, .1], [.3, .24], [-.5, .3]], .24, W),
    box(.72, .245, .035, -.12, 0, .1, TEAL), box(.6, .246, .05, -.16, 0, .19, GLASS),
    profile([[.2, .2], [.36, .2], [.29, .25], [.2, .27]], .2, GLASS), box(.9, .2, .02, 0, 0, 0, DARK)]);
  car.hsrMid = merge([box(.96, .24, .28, 0, 0, .02, W), box(.96, .245, .035, 0, 0, .1, TEAL), box(.86, .246, .05, 0, 0, .19, GLASS), box(.9, .2, .02, 0, 0, 0, DARK)]);
  // bullet train (Shinkansen style): a very long, low duck-bill nose, white with a deep blue stripe
  const BLUE = "#1f5fbf";
  car.bulletHead = merge([
    profile([[-.5, .02], [.5, .02], [.5, .045], [.42, .07], [.28, .12], [.1, .2], [-.08, .25], [-.5, .265]], .23, W),
    profile([[-.5, .085], [.36, .085], [.44, .065], [.47, .06], [.36, .105], [-.5, .115]], .234, BLUE),
    box(.42, .236, .045, -.28, 0, .175, GLASS), profile([[-.02, .215], [.1, .19], [.04, .225], [-.06, .245]], .19, GLASS),
    box(.9, .19, .02, 0, 0, 0, DARK)]);
  car.bulletMid = merge([box(.97, .23, .245, 0, 0, .02, W), box(.97, .234, .03, 0, 0, .085, BLUE), box(.86, .236, .045, 0, 0, .175, GLASS), box(.9, .19, .02, 0, 0, 0, DARK)]);
  // electric train (EMU): silver with a red stripe, a flat cab front and a pantograph on the roof
  const SIL = "#cfd6db", RED = "#d8443a";
  car.emuHead = merge([profile([[-.5, .02], [.5, .02], [.5, .2], [.45, .28], [-.5, .28]], .24, SIL),
    box(.96, .245, .03, 0, 0, .09, RED), box(.7, .246, .06, -.12, 0, .17, GLASS), profile([[.46, .17], [.5, .17], [.5, .2], [.455, .27], [.44, .27]], .2, GLASS),
    box(.24, .02, .02, -.1, 0, .33, DARK), box(.02, .14, .02, -.18, 0, .31, DARK), box(.9, .2, .02, 0, 0, 0, DARK)]);
  car.emuMid = merge([box(.97, .24, .26, 0, 0, .02, SIL), box(.97, .245, .03, 0, 0, .09, RED), box(.86, .246, .06, 0, 0, .17, GLASS), box(.9, .2, .02, 0, 0, 0, DARK)]);
  // passenger coach for a diesel-hauled train
  car.coach = merge([box(.96, .24, .25, 0, 0, .03, "#2f6e4f"), box(.96, .245, .025, 0, 0, .19, "#e9d9a8"), box(.84, .246, .05, 0, 0, .13, "#cfe3ea"), box(.9, .2, .03, 0, 0, 0, DARK)]);
  // freight: a diesel locomotive (with an exhaust stack), an electric one (pantograph), and wagons
  car.diesel = merge([box(.94, .26, .24, 0, 0, .04, "#d9622b"), box(.26, .262, .1, .3, 0, .28, "#b44c1f"), box(.2, .263, .06, .3, 0, .3, GLASS),
    cyl(.025, .025, .08, -.1, 0, .28, DARK, 6), box(.94, .22, .04, 0, 0, 0, DARK), box(.94, .265, .02, 0, 0, .12, "#f2c14e")]);
  car.electric = merge([box(.94, .26, .26, 0, 0, .04, "#e9eef1"), box(.94, .265, .04, 0, 0, .12, "#3cc77a"), box(.18, .262, .06, .36, 0, .2, GLASS),
    box(.3, .02, .02, 0, 0, .34, DARK), box(.02, .16, .02, -.1, 0, .32, DARK), box(.94, .22, .04, 0, 0, 0, DARK)]);
  car.box = merge([box(.96, .2, .06, 0, 0, 0, DARK), box(.9, .24, .25, 0, 0, .07, "#ffffff")]);
  car.ore = merge([box(.96, .2, .06, 0, 0, 0, DARK), box(.86, .25, .18, 0, 0, .06, "#7d5a3c"), box(.8, .2, .03, 0, 0, .24, "#3a2a1e")]);
  car.tank = merge([box(.96, .2, .06, 0, 0, 0, DARK), cylX(.12, .86, 0, 0, .19, "#262a2f", 12)]);
  car.shadow = new THREE.BoxGeometry(1, .3, .01);

  // industry (footprint about 1 × 1, x east, y north)
  const site = {};
  const coal = clean => merge([
    box(.42, .34, .2, -.18, -.16, 0, clean ? "#5d6a63" : "#6b6f73"), box(.42, .34, .04, -.18, -.16, .2, clean ? "#7fa58e" : "#8c8f93"),
    lathe([[.17, 0], [.12, .3], [.1, .42], [.115, .5], [.115, .5]], .22, .2, 0, clean ? "#9aa59e" : "#cfd3d6"),
    lathe([[.15, 0], [.105, .26], [.09, .36], [.1, .43]], -.12, .28, 0, clean ? "#9aa59e" : "#cfd3d6"),
    cyl(.045, .03, .78, .26, -.24, 0, clean ? "#8a9a90" : "#e8e8e8"), cyl(.032, .032, .1, .26, -.24, .68, clean ? "#3fae6a" : "#c8402e"),
    box(1, 1, .01, 0, 0, 0, "#3b3a33")]);
  site.coal = [coal(false), coal(true)];
  const steel = clean => merge([
    box(.7, .26, .16, -.1, -.25, 0, clean ? "#5e7a6c" : "#5c5650"), box(.7, .27, .03, -.1, -.25, .16, clean ? "#7fd39a" : "#8c4a2e"),
    box(.5, .22, .12, -.2, .15, 0, "#5f6368"), cyl(.11, .08, .5, .25, .12, 0, clean ? "#6b8f7d" : "#4a4440", 12),
    cyl(.03, .03, .62, .4, -.3, 0, clean ? "#cfe8d8" : "#d9d2c8"), cyl(.03, .03, .55, .32, -.36, 0, clean ? "#cfe8d8" : "#d9d2c8"),
    box(1, 1, .01, 0, 0, 0, "#3a3631")]);
  site.steel = [steel(false), steel(true)];
  const cement = clean => merge([
    box(.16, .16, .62, .25, .1, 0, clean ? "#c9d6cf" : "#bdb6aa"), box(.17, .17, .05, .25, .1, .62, clean ? "#3fae6a" : "#8a8276"),
    cylX(.06, .7, -.1, -.15, .1, clean ? "#a9b8ae" : "#9a9184", 10),
    cyl(.09, .09, .34, -.3, .2, 0, "#d8d3c8"), cyl(.09, .09, .34, -.1, .25, 0, "#d8d3c8"), cyl(.025, .025, .5, .36, -.3, 0, "#d9d2c8"),
    box(1, 1, .01, 0, 0, 0, "#6d675b")]);
  site.cement = [cement(false), cement(true)];
  const refinery = clean => merge([
    ...[[-.3, -.25], [-.05, -.3], [-.32, .02], [-.08, .0]].map(([x, y]) => cyl(.1, .1, .12, x, y, 0, clean ? "#dfe8e3" : "#e1e1dc", 14)),
    cyl(.035, .03, .6, .2, .15, 0, "#9aa0a6"), cyl(.05, .04, .48, .3, -.05, 0, "#b0b5ba"), cyl(.03, .025, .4, .1, .3, 0, "#9aa0a6"),
    cyl(.015, .015, .7, .38, .32, 0, clean ? "#3fae6a" : "#c8402e", 6), box(.36, .14, .05, .22, .12, .25, "#6c7278"),
    box(1, 1, .01, 0, 0, 0, "#3a3b3d")]);
  site.refinery = [refinery(false), refinery(true)];
  const mine = clean => merge([
    lathe([[.48, 0], [.44, .03], [.36, .03], [.33, .06], [.24, .06], [.21, .08], [.12, .08], [.1, .09], [0, .09]], 0, 0, 0, clean ? "#8a8a5e" : "#8f6a4a", 20),
    lathe([[.3, .09], [.29, .1], [0, .1]], 0, 0, 0, clean ? "#4d7a52" : "#5c4330", 20),
    ...[-1, 1].map(k => { const g = new THREE.BoxGeometry(.03, .03, .3); g.rotateY(k * .32); g.translate(.38 + k * .05, .32, .14); return paint(g, "#4a4f55"); }),
    (() => { const g = new THREE.TorusGeometry(.045, .012, 6, 14); g.rotateX(Math.PI / 2); g.translate(.38, .32, .29); return paint(g, "#c8402e"); })(),
    box(.16, .12, .08, .3, .2, 0, "#6a5040"),
    box(.22, .1, .1, -.3, .38, 0, "#d9a13b"), box(.06, .1, .06, -.42, .38, .02, "#3a3f45")]);
  site.mine = [mine(false), mine(true)];
  const ev = () => merge([
    box(.9, .55, .14, 0, -.05, 0, "#e9eef1"), box(.92, .57, .02, 0, -.05, .14, "#3cc77a"),
    ...[-.3, -.1, .1, .3].map(x => box(.16, .4, .015, x, -.05, .16, "#1f3a66")),
    box(.3, .18, .08, -.25, .35, 0, "#cfd8dc"), cyl(.012, .012, .3, .38, .35, 0, "#e8f4f8", 6),
    box(1, 1, .01, 0, 0, 0, "#3c4146")]);
  site.ev = [ev(), ev()];

  // trees (height 1)
  const tree = {};
  tree.pine = merge([cyl(.05, .04, .25, 0, 0, 0, "#6b4a2b", 5), cone(.32, .45, 0, 0, .18, "#1f7a43"), cone(.25, .38, 0, 0, .42, "#24894b"), cone(.17, .3, 0, 0, .66, "#2b9a55")]);
  tree.leaf = merge([cyl(.06, .045, .4, 0, 0, 0, "#6b4a2b", 5), ico(.3, 0, 0, .58, "#2fa85a", 0, .9), ico(.2, .14, .08, .74, "#3cbf66", 0), ico(.18, -.13, -.06, .68, "#27944c", 0)]);
  const roots = []; for (let i = 0; i < 6; i++){ const a = i / 6 * TAU; const g = new THREE.TorusGeometry(.13, .018, 4, 8, Math.PI); g.rotateX(Math.PI / 2); g.rotateZ(a); g.translate(Math.cos(a) * .1, Math.sin(a) * .1, 0); roots.push(paint(g, "#5a3f26")); }
  tree.mangrove = merge([...roots, cyl(.045, .04, .3, 0, 0, .08, "#5a3f26", 5), ico(.3, 0, 0, .55, "#2e8f57", 0, .7), ico(.2, .16, 0, .6, "#37a463", 0, .8)]);
  return {car, site, tree};
}

/* ---------------- instanced meshes ---------------- */
class Inst {
  constructor(parent, geo, mat, max, color){
    this.m = new THREE.InstancedMesh(geo, mat, max); this.m.count = 0; this.m.frustumCulled = false; this.max = max; this.n = 0;
    if (color) this.m.setColorAt(0, new THREE.Color(1, 1, 1));
    parent.add(this.m);
  }
  begin(){ this.n = 0; }
  add(mx, col){ if (this.n >= this.max) return; this.m.setMatrixAt(this.n, mx); if (col && this.m.instanceColor) this.m.setColorAt(this.n, col); this.n++; }
  end(){ this.m.count = this.n; this.m.visible = this.n > 0; if (this.n){ this.m.instanceMatrix.needsUpdate = true; if (this.m.instanceColor) this.m.instanceColor.needsUpdate = true; } }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, "ZYX"), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
/* world matrix: map point (x, y) at height z (map units), turned to heading (radians in the map, y down) */
function mat(x, y, z, heading, sx, sy, sz, rx = 0, ry = 0){ _e.set(rx, ry, -heading); _q.setFromEuler(_e); _p.set(x, -y, z); _s.set(sx, sy, sz); return _m.compose(_p, _q, _s); }

/* ---------------- particles: smoke, flames, dust, snow, rain ---------------- */
function puffTex(kind){
  const N = 128, cv = document.createElement("canvas"); cv.width = cv.height = N; const g = cv.getContext("2d");
  if (kind === "streak"){ const gr = g.createLinearGradient(0, 0, 0, N); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(N * .46, 0, N * .08, N); }
  else if (kind === "flame"){ const gr = g.createRadialGradient(N / 2, N * .6, 0, N / 2, N * .55, N / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.35, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(N / 2, N * .55, N * .32, N * .45, 0, 0, TAU); g.fill(); }
  else {   // a soft, slightly lumpy puff
    for (let i = 0; i < 9; i++){ const a = i / 9 * TAU, r = i ? N * .17 : N * .26, x = N / 2 + (i ? Math.cos(a) * N * .18 : 0), y = N / 2 + (i ? Math.sin(a) * N * .18 : 0);
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 1.5); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, N, N); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const PART_VS = `attribute float aSize; attribute vec4 aCol; uniform float uDpr; varying vec4 vCol;
void main(){ vCol = aCol; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uDpr; }`;
const PART_FS = `uniform sampler2D uTex; varying vec4 vCol; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vCol.rgb, vCol.a * t.a); if (gl_FragColor.a < .004) discard; }`;
class Parts {
  constructor(parent, max, tex, additive, order){
    this.max = max; this.list = [];
    const g = this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.size = new Float32Array(max); this.col = new Float32Array(max * 4);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aCol", new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({uniforms:{uTex:{value:tex}, uDpr:{value:1}}, vertexShader:PART_VS, fragmentShader:PART_FS, transparent:true, depthWrite:false,
      blending:additive ? THREE.AdditiveBlending : THREE.NormalBlending});
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = order; parent.add(this.pts);
  }
  /* p: x, y (map), z (map units up), vx, vy, vz (map units / s), life (s), s0, s1 (px), c0, c1 [r,g,b,a] */
  emit(p){ if (this.list.length < this.max){ p.age = 0; this.list.push(p); } }
  update(dt, dpr){
    this.mat.uniforms.uDpr.value = dpr;
    let n = 0; const keep = [];
    for (const p of this.list){
      p.age += dt; if (p.age >= p.life) continue; keep.push(p);
      p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt);
      const f = p.age / p.life, a = f < .15 ? f / .15 : 1;
      this.pos[n * 3] = p.x; this.pos[n * 3 + 1] = -p.y; this.pos[n * 3 + 2] = p.z;
      this.size[n] = Math.min(220, p.s0 + (p.s1 - p.s0) * f);
      for (let k = 0; k < 3; k++) this.col[n * 4 + k] = p.c0[k] + (p.c1[k] - p.c0[k]) * f;
      this.col[n * 4 + 3] = (p.c0[3] + (p.c1[3] - p.c0[3]) * f) * a;
      n++;
    }
    this.list = keep;
    this.geo.setDrawRange(0, n);
    for (const k of ["position", "aSize", "aCol"]) this.geo.attributes[k].needsUpdate = true;
    this.pts.visible = n > 0;
    return n;
  }
}

/* ---------------- ground pictures (flood water, burn scars, cracked ground, heat, salt water, snow) ---------------- */
/* vW: local coordinates (map units from the picture's centre, plus a small per-picture offset). Kept small on purpose:
   the hash below loses precision on big numbers (world coordinates run to 2400) and the noise turned into blocks. */
const DECAL_VS = `varying vec2 vUv; varying vec2 vW; void main(){ vUv = uv; vW = position.xy + uOff; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const DECAL_FS = `uniform sampler2D uMask, uNoise; uniform int uType; uniform float uL, uB, uT, uA, uFront, uScar; uniform vec4 uFade;
varying vec2 vUv; varying vec2 vW;
float h(vec2 p){ p = fract(p * vec2(.1031, .1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }   // sin-free hash (stable on mobile GPUs)
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
void main(){
  vec4 m = texture2D(uMask, vUv); float land = m.r, inner = m.g;
  float n = texture2D(uNoise, vUv).r + (vn(vW * 1.7) - .5) * .035 + (vn(vW * 4.1) - .5) * .015;   // smooth large shapes + fine ragged detail up close
  float r = length(vUv - .5) * 2.;
  float fall = uType == 5 ? 1. : smoothstep(1., .62, r + (n - .5) * .4);
  float k = land * fall; if (k < .01) discard;
  vec3 c = vec3(0.); float a = 0.;
  if (uType == 0){   // flood: muddy water fills the low ground first (near rivers and the coast), with ripples
    float t = n * .72 + (1. - inner) * .28;
    float w = smoothstep(uL, uL - .05, t);
    float rip = vn(vW * .22 + vec2(uT * .35, uT * .18)), rip2 = vn(vW * .6 - vec2(uT * .6, 0.));
    c = mix(vec3(.30, .30, .25), vec3(.42, .52, .55), .2 + .5 * rip) + vec3(.28) * smoothstep(.8, .96, rip2);
    float edge = smoothstep(uL - .05, uL - .012, t) * w; c = mix(c, vec3(.78, .72, .58), edge * .8);
    a = w * .93;
  } else if (uType == 1){   // wildfire: a glowing front moves out across the land, leaving charcoal behind
    float burnt = smoothstep(uB, uB - .025, n);
    float fl = vn(vW * .5 + vec2(0., -uT * 2.5)), fl2 = vn(vW * 1.3 + vec2(uT * 1.7, 0.));
    c = mix(vec3(.09, .075, .065), vec3(.22, .11, .05), .35 * fl * uFront); a = burnt * .88 * uScar;
    float glow = burnt * uFront * smoothstep(.55, .9, fl2) * .35; c = mix(c, vec3(.9, .3, .05), glow);
    float front = (1. - smoothstep(0., .03 + .015 * fl, abs(n - uB))) * uFront;
    c = mix(c, mix(vec3(1., .38, .05), vec3(1., .86, .4), fl), front); a = max(a, front * (.8 + .2 * fl));
  } else if (uType == 2){   // drought: dry, cracked ground
    vec2 p = vW * .55, i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(float(x), float(y)); vec2 o = vec2(h(i + g), h(i + g + 17.3)); float d = length(g + o - f); if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    float crack = 1. - smoothstep(0., .07, d2 - d1);
    c = mix(vec3(.76, .60, .36), vec3(.30, .20, .12), crack);
    a = uL * (.48 + .42 * crack) * smoothstep(.15, .5, n * .7 + inner * .3);
  } else if (uType == 3){   // heatwave: the ground glows, the glow shimmers
    float sh = vn(vW * .18 + vec2(uT * .25, -uT * .4));
    c = mix(vec3(1., .42, .12), vec3(1., .72, .25), sh); a = uL * (.30 + .22 * sh) * (.8 + .2 * sin(uT * 2.2));
  } else if (uType == 4){   // salt water creeping in from the coast, a white salt crust at its edge
    float d = inner + (n - .5) * .18, lim = .5 + uL * .42;
    float w = smoothstep(lim, lim - .04, d);
    float edge = (1. - smoothstep(0., .025, abs(d - lim))) * step(.05, uL);
    float rip = vn(vW * .35 + vec2(uT * .25, 0.));
    c = mix(vec3(.36, .64, .60), vec3(.52, .78, .72), rip); c = mix(c, vec3(.94, .96, .92), edge);
    a = max(w * .78, edge * .9);
  } else {   // snow cover
    float pat = vn(vW * .07) * .55 + vn(vW * .3) * .3 + vn(vW * 1.1) * .15;
    // every edge of the box fades out raggedly (uFade = how far in, per side: left, right, top, bottom), so no straight
    // line shows; neighbouring boxes overlap where one fades out and the next fades in
    float e = (pat - .5) * .16;
    float lat = smoothstep(.0, .75, vUv.y + (pat - .5) * .5);
    float side = smoothstep(0., uFade.x, vUv.x + e * uFade.x * 4.) * smoothstep(0., uFade.y, 1. - vUv.x + e * uFade.y * 4.);
    float top = smoothstep(0., uFade.z, 1. - vUv.y + e * uFade.z * 3.);
    c = mix(vec3(.80, .86, .94), vec3(.98, .99, 1.), pat);
    a = uL * smoothstep(.3, .7, pat * .8 + lat * .55 + inner * .25) * lat * side * top * .55;
  }
  gl_FragColor = vec4(c, a * k * uA);
}`;

/* the ground picture's data over a box around (cx, cy), half-size Rx × Ry (map units):
   uMask (sharp, up to 1024–2048 px): R = this country's land, G = how far inland (blurred land)
   uNoise (256 px, smooth): the shapes floods, fires and drought follow; the CPU keeps a copy to find the fire front */
function makeMask(M, shapes, cx, cy, Rx, Ry, sd, N = 1024, allLand = shapes){
  const fit = n => Rx >= Ry ? [n, Math.max(32, Math.round(n * Ry / Rx))] : [Math.max(32, Math.round(n * Rx / Ry)), n];
  const [NX, NY] = fit(N), [nx, ny] = fit(256);
  const cv = document.createElement("canvas"); cv.width = NX; cv.height = NY; const g = cv.getContext("2d");
  const kx = NX / (2 * Rx), ky = NY / (2 * Ry);
  g.setTransform(kx, 0, 0, ky, -(cx - Rx) * kx, -(cy - Ry) * ky); g.fillStyle = "#fff";
  for (const sh of shapes) g.fill(sh.path, "evenodd");
  const land = g.getImageData(0, 0, NX, NY).data;
  // G: distance from the SEA (all land around, any country), so a land border never looks like a coast
  const al = document.createElement("canvas"); al.width = NX; al.height = NY; const ag = al.getContext("2d");
  ag.setTransform(kx, 0, 0, ky, -(cx - Rx) * kx, -(cy - Ry) * ky); ag.fillStyle = "#fff"; for (const sh of allLand) ag.fill(sh.path, "evenodd");
  const bl = document.createElement("canvas"); bl.width = NX; bl.height = NY; const b = bl.getContext("2d");
  b.filter = `blur(${Math.round(Math.min(NX, NY) * .045)}px)`; b.drawImage(al, 0, 0);
  const blur = b.getImageData(0, 0, NX, NY).data;
  const data = new Uint8Array(NX * NY * 4);
  for (let y = 0; y < NY; y++){ const row = (NY - 1 - y) * NX; for (let x = 0; x < NX; x++){   // a texture's first row is the bottom (south)
    const i = (y * NX + x) * 4, o = (row + x) * 4;
    data[o] = land[i + 3]; data[o + 1] = blur[i + 3]; data[o + 3] = 255;
  } }
  const tex = new THREE.DataTexture(data, NX, NY, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  // value noise, smooth (bilinear between 256 samples is plenty: the shader adds the fine detail)
  const r = mrng(sd), H = new Float32Array(17 * 17 * 4); for (let i = 0; i < H.length; i++) H[i] = r();
  const vn = (x, y, o) => { const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j), a = (u, v) => H[((((u % 17) + 17) % 17) * 17 + (((v % 17) + 17) % 17)) * 4 + o];
    return (a(i, j) * (1 - fx) + a(i + 1, j) * fx) * (1 - fy) + (a(i, j + 1) * (1 - fx) + a(i + 1, j + 1) * fx) * fy; };
  const nd = new Uint8Array(nx * ny * 4), noise = new Float32Array(nx * ny), landA = new Float32Array(nx * ny);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++){
    const u = x / nx * 4, v = y / ny * 4, n = clamp((.52 * vn(u, v, 0) + .28 * vn(u * 2.1 + 3, v * 2.1, 1) + .14 * vn(u * 4.3, v * 4.3 + 5, 2) + .06 * vn(u * 9, v * 9, 3) - .5) * 1.6 + .5, 0, 1);
    const i = y * nx + x, o = ((ny - 1 - y) * nx + x) * 4;
    nd[o] = nd[o + 1] = nd[o + 2] = n * 255; nd[o + 3] = 255; noise[i] = n;
    const lx = Math.min(NX - 1, Math.round((x + .5) / nx * NX)), ly = Math.min(NY - 1, Math.round((y + .5) / ny * NY));
    landA[i] = land[(ly * NX + lx) * 4 + 3] / 255;
  }
  const ntex = new THREE.DataTexture(nd, nx, ny, THREE.RGBAFormat); ntex.magFilter = ntex.minFilter = THREE.LinearFilter; ntex.needsUpdate = true;
  return {tex, ntex, noise, land:landA, NX:nx, NY:ny, cx, cy, Rx, Ry};
}

/* ---------------- data: rail corridors and industrial sites (lat, lon) ---------------- */
/* base = runs today (2026). Others open as the rail skill I2 rolls out (or when that country's rail build is done). */
const RAIL = [
  // high-speed lines running today
  {c:"CHN", base:1, k:"hsr", t:"bullet", p:[[39.9, 116.4], [36.67, 117.0], [34.26, 117.18], [32.06, 118.8], [31.23, 121.47]]},
  {c:"CHN", base:1, k:"hsr", p:[[39.9, 116.4], [38.04, 114.5], [34.75, 113.62], [30.59, 114.3], [28.23, 112.94], [23.13, 113.26], [22.54, 114.06]]},
  {c:"CHN", base:1, k:"hsr", p:[[31.23, 121.47], [30.27, 120.15], [28.68, 115.86], [28.23, 112.94], [26.65, 106.63], [25.04, 102.71]]},
  {c:"CHN", base:1, k:"hsr", p:[[34.26, 117.18], [34.75, 113.62], [34.34, 108.94], [36.06, 103.83], [43.83, 87.62]]},
  {c:"CHN", base:1, k:"hsr", p:[[39.9, 116.4], [41.8, 123.43], [43.88, 125.32], [45.8, 126.53]]},
  {c:"CHN", base:1, k:"hsr", p:[[30.66, 104.07], [29.56, 106.55], [30.59, 114.3], [31.82, 117.23], [32.06, 118.8]]},
  {c:"JPN", base:1, k:"hsr", t:"bullet", p:[[35.68, 139.77], [35.17, 136.88], [34.69, 135.5], [34.39, 132.46], [33.59, 130.4]]},
  {c:"JPN", base:1, k:"hsr", t:"bullet", p:[[35.68, 139.77], [37.4, 140.38], [38.26, 140.87], [40.82, 140.74]]},
  {c:"KOR", base:1, k:"hsr", p:[[37.55, 126.97], [36.35, 127.38], [35.87, 128.6], [35.11, 129.04]]},
  {c:"TWN", base:1, k:"hsr", t:"bullet", p:[[25.05, 121.52], [24.15, 120.67], [23.0, 120.21], [22.63, 120.3]]},
  {c:"FRA", base:1, k:"hsr", p:[[48.85, 2.35], [46.8, 4.4], [45.76, 4.84], [43.3, 5.37]]},
  {c:"FRA", base:1, k:"hsr", p:[[48.85, 2.35], [47.39, .69], [44.84, -.58]]},
  {c:"FRA", base:1, k:"hsr", p:[[51.5, -.12], [51.0, 1.85], [50.63, 3.06], [48.85, 2.35], [48.58, 7.75]]},
  {c:"ESP", base:1, k:"hsr", p:[[40.42, -3.7], [41.65, -.88], [41.39, 2.17]]},
  {c:"ESP", base:1, k:"hsr", p:[[40.42, -3.7], [37.88, -4.78], [37.39, -5.98]]},
  {c:"ESP", base:1, k:"hsr", p:[[40.42, -3.7], [39.47, -.38]]},
  {c:"DEU", base:1, k:"hsr", p:[[53.55, 10.0], [52.52, 13.4], [51.34, 12.37], [49.45, 11.08], [48.14, 11.58]]},
  {c:"DEU", base:1, k:"hsr", p:[[50.94, 6.96], [50.11, 8.68], [48.78, 9.18], [48.14, 11.58]]},
  {c:"ITA", base:1, k:"hsr", p:[[45.07, 7.69], [45.46, 9.19], [44.49, 11.34], [43.77, 11.25], [41.9, 12.5], [40.85, 14.27]]},
  {c:"RUS", base:1, k:"hsr", p:[[55.75, 37.62], [56.86, 35.9], [58.52, 31.27], [59.93, 30.33]]},
  {c:"TUR", base:1, k:"hsr", p:[[39.93, 32.86], [39.78, 30.52], [40.77, 29.92], [41.01, 28.98]]},
  {c:"MAR", base:1, k:"hsr", p:[[35.77, -5.8], [34.26, -6.58], [33.57, -7.59]]},
  {c:"SAU", base:1, k:"hsr", p:[[21.42, 39.83], [21.49, 39.19], [24.47, 39.61]]},
  {c:"USA", base:1, k:"hsr", p:[[42.36, -71.06], [41.76, -72.68], [40.71, -74.0], [39.95, -75.17], [38.9, -77.04]]},
  {c:"IDN", base:1, k:"hsr", p:[[-6.2, 106.85], [-6.91, 107.6]]},
  {c:"LAO", base:1, k:"hsr", p:[[17.97, 102.6], [19.89, 102.13], [21.0, 101.4], [22.0, 100.8], [25.04, 102.71]]},
  // new high-speed lines (open with the rail skill)
  {c:"THA", k:"hsr", p:[[13.75, 100.5], [14.35, 100.57], [14.97, 102.1], [16.43, 102.83], [17.41, 102.79], [17.88, 102.74], [17.97, 102.6]]},
  {c:"THA", k:"hsr", p:[[13.75, 100.5], [15.7, 100.12], [16.82, 100.26], [18.79, 98.98]]},
  {c:"THA", k:"hsr", p:[[13.75, 100.5], [13.36, 100.98], [12.68, 101.27]]},
  {c:"IND", k:"hsr", t:"bullet", p:[[19.08, 72.88], [21.17, 72.83], [22.31, 73.18], [23.02, 72.57]]},
  {c:"IND", k:"hsr", p:[[28.61, 77.21], [27.18, 78.01], [26.45, 80.33], [25.32, 82.97]]},
  {c:"IND", k:"hsr", p:[[13.08, 80.27], [12.97, 77.59], [12.3, 76.64]]},
  {c:"USA", k:"hsr", p:[[37.77, -122.42], [37.34, -121.89], [36.74, -119.79], [35.37, -119.02], [34.05, -118.24]]},
  {c:"USA", k:"hsr", p:[[32.78, -96.8], [30.63, -96.33], [29.76, -95.37]]},
  {c:"USA", k:"hsr", p:[[34.05, -118.24], [34.1, -117.3], [34.9, -117.0], [36.17, -115.14]]},
  {c:"IDN", k:"hsr", p:[[-6.91, 107.6], [-6.97, 110.42], [-7.26, 112.75]]},
  {c:"VNM", k:"hsr", p:[[21.03, 105.85], [18.68, 105.68], [16.46, 107.59], [16.05, 108.2], [13.78, 109.22], [10.78, 106.7]]},
  {c:"MYS", k:"hsr", p:[[3.14, 101.69], [2.19, 102.25], [1.46, 103.76], [1.35, 103.82]]},
  {c:"EGY", k:"hsr", p:[[31.2, 29.92], [30.04, 31.24], [28.1, 30.75], [25.69, 32.64]]},
  {c:"BRA", k:"hsr", p:[[-22.9, -43.2], [-22.91, -45.0], [-23.55, -46.63], [-22.91, -47.06]]},
  {c:"AUS", k:"hsr", p:[[-33.87, 151.2], [-34.75, 149.72], [-35.28, 149.13], [-36.08, 146.92], [-37.81, 144.96]]},
  {c:"GBR", k:"hsr", p:[[51.5, -.12], [52.48, -1.9], [53.48, -2.24]]},
  {c:"CAN", k:"hsr", p:[[43.65, -79.38], [44.23, -76.49], [45.42, -75.7], [45.5, -73.57], [46.81, -71.21]]},
  {c:"TUR", k:"hsr", p:[[39.93, 32.86], [37.87, 32.48], [38.42, 27.14]]},
  {c:"POL", k:"hsr", p:[[52.23, 21.0], [51.76, 19.46], [51.11, 17.03]]},
  {c:"NGA", k:"hsr", p:[[6.52, 3.38], [7.38, 3.9], [9.08, 7.53], [12.0, 8.52]]},
  {c:"PHL", k:"hsr", p:[[14.6, 120.98], [15.15, 120.59], [15.49, 120.6]]},
  {c:"MEX", k:"hsr", p:[[19.43, -99.13], [20.59, -100.39], [20.67, -103.35]]},
  {c:"ARE", k:"hsr", p:[[24.47, 54.37], [25.2, 55.27], [25.35, 55.4]]},
  // freight (diesel until the line is electrified)
  {c:"USA", base:1, k:"fr", ore:0, p:[[34.05, -118.24], [35.11, -111.65], [35.08, -106.65], [35.22, -101.83], [35.47, -97.52], [37.69, -97.34], [38.63, -90.2], [41.88, -87.63]]},
  {c:"USA", base:1, k:"fr", p:[[47.6, -122.33], [47.66, -117.43], [46.59, -112.04], [46.87, -96.79], [44.98, -93.27], [41.88, -87.63]]},
  {c:"USA", base:1, k:"fr", p:[[41.88, -87.63], [41.5, -81.69], [42.89, -78.88], [42.65, -73.75], [40.71, -74.0]]},
  {c:"USA", base:1, k:"fr", ore:1, p:[[43.66, -105.4], [41.14, -104.82], [40.81, -96.7], [41.26, -95.94], [41.88, -87.63]]},
  {c:"CAN", base:1, k:"fr", p:[[49.28, -123.12], [50.67, -120.33], [51.05, -114.07], [50.45, -104.61], [49.9, -97.14], [48.38, -89.25], [46.49, -80.99], [43.65, -79.38]]},
  {c:"MEX", base:1, k:"fr", p:[[19.43, -99.13], [22.15, -100.98], [25.67, -100.31], [27.48, -99.51]]},
  {c:"RUS", base:1, k:"fr", el:1, p:[[55.75, 37.62], [56.33, 44.0], [58.0, 56.25], [56.84, 60.6], [55.0, 73.37], [55.03, 82.92], [56.01, 92.87], [52.29, 104.3], [51.83, 107.58], [52.03, 113.5], [50.29, 127.53], [48.48, 135.08], [43.12, 131.9]]},
  {c:"MNG", base:1, k:"fr", p:[[51.83, 107.58], [47.92, 106.92], [43.65, 111.98], [40.82, 111.65], [39.9, 116.4]]},
  {c:"KAZ", base:1, k:"fr", p:[[34.34, 108.94], [36.06, 103.83], [43.83, 87.62], [44.2, 80.4], [43.24, 76.89], [43.3, 68.27], [51.18, 71.43], [53.2, 50.15], [55.75, 37.62]]},
  {c:"POL", base:1, k:"fr", el:1, p:[[55.75, 37.62], [54.78, 32.05], [53.9, 27.56], [52.1, 23.66], [52.23, 21.0], [52.41, 16.93], [52.52, 13.4], [52.37, 9.73], [51.43, 6.76]]},
  {c:"NLD", base:1, k:"fr", el:1, p:[[51.92, 4.48], [51.43, 6.76], [50.94, 6.96], [50.0, 8.27], [47.56, 7.59], [46.0, 8.95], [45.46, 9.19], [44.41, 8.93]]},
  {c:"CHN", base:1, k:"fr", el:1, ore:1, p:[[40.09, 113.3], [40.0, 115.5], [39.67, 118.18], [39.93, 119.6]]},
  {c:"CHN", base:1, k:"fr", el:1, p:[[29.56, 106.55], [34.34, 108.94], [38.47, 106.27], [40.65, 109.84]]},
  {c:"IND", base:1, k:"fr", el:1, p:[[28.61, 77.21], [27.18, 78.01], [25.44, 81.85], [24.79, 84.99], [23.8, 86.43], [22.57, 88.36]]},
  {c:"IND", base:1, k:"fr", el:1, p:[[28.61, 77.21], [26.91, 75.79], [24.58, 73.71], [23.02, 72.57], [21.17, 72.83], [19.08, 72.88]]},
  {c:"AUS", base:1, k:"fr", ore:1, p:[[-22.7, 117.8], [-21.7, 118.4], [-20.31, 118.58]]},
  {c:"AUS", base:1, k:"fr", p:[[-31.95, 115.86], [-30.75, 121.47], [-31.2, 131.0], [-32.49, 137.77], [-34.93, 138.6], [-32.24, 148.6], [-33.87, 151.2]]},
  {c:"BRA", base:1, k:"fr", ore:1, p:[[-6.07, -50.2], [-5.53, -47.48], [-4.86, -46.0], [-3.75, -45.0], [-2.53, -44.3]]},
  {c:"BRA", base:1, k:"fr", ore:1, p:[[-19.92, -43.94], [-19.47, -42.53], [-19.86, -41.0], [-20.32, -40.29]]},
  {c:"ZAF", base:1, k:"fr", el:1, ore:1, p:[[-26.2, 28.05], [-26.5, 29.2], [-27.75, 30.0], [-28.78, 32.04]]},
  {c:"TZA", base:1, k:"fr", ore:1, p:[[-12.97, 28.64], [-11.2, 31.0], [-9.3, 33.7], [-7.77, 35.69], [-6.8, 39.28]]},
  {c:"KEN", base:1, k:"fr", p:[[-4.04, 39.67], [-3.4, 38.56], [-1.29, 36.82]]},
  {c:"ETH", base:1, k:"fr", el:1, p:[[9.03, 38.74], [9.59, 41.86], [11.59, 43.15]]},
  {c:"CHL", base:1, k:"fr", ore:1, p:[[-22.3, -68.9], [-23.0, -69.2], [-23.65, -70.4]]},
  {c:"ARG", base:1, k:"fr", p:[[-34.6, -58.38], [-32.95, -60.64], [-31.42, -64.18]]},
  {c:"THA", base:1, k:"fr", p:[[13.75, 100.5], [13.08, 100.92], [12.68, 101.15]]},
];
/* industrial sites (type, lat, lon, region) */
const SITES = [
  ["coal", 40.2, 111.4, "EA"], ["coal", 24.1, 82.67, "SA"], ["coal", 51.27, 19.33, "EU"], ["coal", 51.83, 14.45, "EU"], ["coal", -32.4, 150.9, "SEA"], ["coal", -25.9, 28.9, "MEAF"],
  ["coal", 33.06, -83.8, "NA"], ["coal", -5.89, 106.03, "SEA"], ["coal", 21.6, 87.0, "SA"], ["coal", 36.0, 116.0, "EA"],
  ["steel", 39.63, 118.18, "EA"], ["steel", 36.0, 129.37, "EA"], ["steel", 22.8, 86.2, "SA"], ["steel", 51.45, 6.76, "EU"], ["steel", 41.6, -87.33, "NA"], ["steel", -19.47, -42.53, "SA"], ["steel", 65.58, 22.15, "EU"],
  ["cement", 31.33, 118.38, "EA"], ["cement", 24.88, 74.62, "SA"], ["cement", 14.53, 100.91, "SEA"], ["cement", 29.97, 32.55, "MEAF"], ["cement", 25.75, -100.2, "NA"],
  ["refinery", 22.35, 69.85, "SA"], ["refinery", 26.64, 50.16, "MEAF"], ["refinery", 29.9, -93.93, "NA"], ["refinery", 51.9, 4.2, "EU"], ["refinery", 35.5, 129.38, "EA"],
  ["refinery", 12.68, 101.15, "SEA"], ["refinery", 1.27, 103.69, "SEA"], ["refinery", 6.43, 4.0, "MEAF"], ["refinery", 24.1, 52.73, "MEAF"],
  ["mine", -22.7, 117.8, "SEA"], ["mine", -22.3, -68.9, "SA"], ["mine", -6.07, -50.2, "SA"], ["mine", -10.7, 25.47, "MEAF"], ["mine", 41.77, 109.97, "EA"], ["mine", -2.7, 121.95, "SEA"],
  ["mine", 43.66, -105.4, "NA"], ["mine", 54.0, 86.7, "EU"],
  ["ev", 30.88, 121.79, "EA"], ["ev", 52.4, 13.8, "EU"], ["ev", 30.22, -97.62, "NA"], ["ev", 31.82, 117.23, "EA"], ["ev", 13.37, 101.0, "SEA"], ["ev", 12.98, 80.0, "SA"], ["ev", 35.53, 129.3, "EA"],
];
const SITE_NAME = {coal:{th:"โรงไฟฟ้าถ่านหิน", en:"Coal power plant"}, steel:{th:"โรงถลุงเหล็ก", en:"Steelworks"}, cement:{th:"โรงปูนซีเมนต์", en:"Cement works"},
  refinery:{th:"โรงกลั่นน้ำมัน", en:"Oil refinery"}, mine:{th:"เหมือง", en:"Mine"}, ev:{th:"โรงงานรถ EV", en:"EV factory"}};
/* chimney tops (site units) */
const STACKS = {coal:[[.26, -.24, .8, 1.3], [.22, .2, .5, .5, "steam"], [-.12, .28, .43, .4, "steam"]], steel:[[.4, -.3, .64, 1], [.32, -.36, .57, .8]], cement:[[.36, -.3, .52, .8], [.25, .1, .7, .5]],
  refinery:[[.38, .32, .72, .6, "flare"], [.2, .15, .62, .5]], mine:[[-.1, .1, .1, .5, "dust"]], ev:[]};

/* where each kind of disaster happens in a country (lat, lon); otherwise near the capital */
const HZ_AT = {
  wildfire:{USA:[38.6, -121.5], CAN:[53.5, -118.0], AUS:[-35.8, 148.6], RUS:[61.0, 113.0], BRA:[-9.5, -56.0], GRC:[38.2, 23.4], IDN:[-1.5, 113.0], PRT:[39.8, -8.2], ESP:[39.6, -5.0],
    TUR:[37.0, 30.5], CHL:[-36.8, -72.5], BOL:[-16.5, -61.0], ITA:[40.0, 16.0], DZA:[36.5, 6.0], KAZ:[49.5, 81.0], CHN:[27.5, 101.5], MEX:[19.5, -101.0], ZAF:[-33.6, 22.5]},
  flood:{USA:[30.0, -91.0], CHN:[30.0, 115.5], IND:[25.8, 91.0], BGD:[24.0, 90.2], PAK:[27.5, 68.5], THA:[14.6, 100.4], VNM:[10.5, 105.8], DEU:[50.5, 6.9], NGA:[7.8, 6.7], BRA:[-29.9, -51.6],
    IDN:[-6.4, 107.0], JPN:[34.5, 133.5], PHL:[15.2, 120.7], MMR:[17.5, 95.8], EGY:[30.8, 31.0], AUS:[-27.5, 152.8], ITA:[44.6, 11.6], KEN:[-1.0, 40.0], ZAF:[-29.8, 30.8], MOZ:[-19.8, 34.8]},
  saltwater:{THA:[13.55, 100.6], VNM:[9.8, 106.2], BGD:[22.3, 89.6], EGY:[31.2, 31.0], IDN:[-6.1, 106.9], NLD:[52.0, 4.6], IND:[21.8, 88.4], MMR:[16.4, 95.3], USA:[29.6, -90.5], CHN:[31.5, 121.6], PHL:[14.4, 120.8]},
  drought:{USA:[37.0, -101.0], AUS:[-29.5, 146.0], IND:[18.5, 76.5], CHN:[38.0, 105.0], BRA:[-9.0, -40.5], KEN:[2.0, 38.5], ETH:[7.0, 42.0], SOM:[4.0, 45.0], ZAF:[-30.5, 23.0], ESP:[38.5, -3.0],
    MAR:[32.0, -6.5], ARG:[-34.0, -62.5], MEX:[28.0, -106.0], TUR:[38.5, 33.0], IRN:[32.0, 54.0], PAK:[29.5, 66.5], THA:[15.8, 102.5]},
  heat:{IND:[26.5, 80.0], PAK:[28.0, 69.0], USA:[33.4, -112.0], EGY:[26.0, 32.0], SAU:[24.6, 46.7], IRQ:[32.0, 45.0], ESP:[38.0, -4.5], ITA:[41.0, 14.0], CHN:[31.0, 113.0], THA:[16.0, 101.0], MEX:[25.0, -103.0]},
};
const HZ_R = {flood:[70, 4, 0], wildfire:[62, 12, 1], drought:[95, 7, 2], heat:[85, 2.5, 3], saltwater:[42, 9, 4]};   // zone half-size (map units), months it stays after the strike, shader type
/* how far along each disaster is, t = months since it struck (negative = still coming) */
function hzState(type, t){
  if (type === "flood") return {L:t < 0 ? ss(-1, 0, t) * .32 : t < 1 ? .32 + .5 * ss(0, 1, t) : .82 * (1 - ss(1, 4, t)), A:1};
  if (type === "wildfire") return {B:t < 0 ? ss(-.7, 0, t) * .14 : .14 + .5 * ss(0, 1.6, t), front:t < 1.8 ? ss(-.7, -.5, t) : 1 - ss(1.8, 2.2, t), scar:t < 3 ? 1 : 1 - ss(3, 12, t), A:1};
  if (type === "drought") return {L:t < 0 ? ss(-1, 0, t) * .7 : t < 4 ? .7 + .3 * ss(0, .6, t) : 1 - ss(4, 7, t), A:1};
  if (type === "heat") return {L:t < 0 ? ss(-.6, 0, t) : 1 - ss(1.5, 2.5, t), A:1};
  return {L:t < 0 ? ss(-1, 0, t) * .4 : t < 3 ? .4 + .6 * ss(0, 2, t) : 1 - ss(3, 9, t), A:1};   // salt water
}

/* ======================================================================================================== */
export class World3D {
  constructor(A3){
    this.A3 = A3; this.g = new THREE.Group(); A3.ground.add(this.g);
    this.mod = buildModels();
    const lam = new THREE.MeshLambertMaterial({vertexColors:true});
    this.lam = lam;
    this.shMat = new THREE.MeshBasicMaterial({color:0x000a12, transparent:true, opacity:.28, depthWrite:false});
    const C = this.mod.car, root = this.g;
    const CAP = {hsrMid:400, bulletMid:200, emuMid:200, coach:200, box:500, ore:200, tank:160};
    this.cars = {}; for (const k of ["hsrHead", "hsrMid", "bulletHead", "bulletMid", "emuHead", "emuMid", "coach", "diesel", "electric", "box", "ore", "tank"]) this.cars[k] = new Inst(root, C[k], lam, CAP[k] || 120, k === "box");
    this.carSh = new Inst(root, C.shadow, this.shMat, 1400);
    this.trees = {}; for (const k of ["pine", "leaf", "mangrove"]) this.trees[k] = new Inst(root, this.mod.tree[k], lam, 1400, true);
    this.treeSh = new Inst(root, new THREE.CircleGeometry(.3, 10), this.shMat, 4200);
    this.carSh.m.renderOrder = this.treeSh.m.renderOrder = 3;
    // tracks: ribbons widened in the vertex shader (so their width stays the same on screen at any zoom); a double track,
    // one line for each direction, so trains going opposite ways pass side by side instead of through each other
    this.trackMat = {bedH:this.ribbonMat(0x14181c, .7), bedF:this.ribbonMat(0x14181c, .7), hsr:this.ribbonMat(0xf2c14e, .9), fr:this.ribbonMat(0xb9b2a6, .85)};
    this.tracks = null; this.trackKey = ""; this.openKey = ""; this.open = [];
    this.sites = []; this.siteHits = [];
    this.groves = new Map();
    this.decals = new Map();   // key → {mesh, mask, ...}
    this.noDecal = new Set();
    this.smoke = new Parts(root, 2600, puffTex("puff"), false, 6);
    this.fire = new Parts(root, 1600, puffTex("flame"), true, 7);
    this.snow = new Parts(root, 1400, puffTex("puff"), false, 8);
    this.rain = new Parts(root, 900, puffTex("streak"), false, 8);
    this.t = 0;
  }
  ribbonMat(col, op){
    // uW: half width, uO: one car length (lane offsets are given in car lengths), both in map units
    return new THREE.ShaderMaterial({uniforms:{uW:{value:1}, uO:{value:1}, uCol:{value:new THREE.Color(col)}, uOp:{value:op}},
      vertexShader:`attribute vec2 dir; attribute float side; attribute float lane; uniform float uW, uO; void main(){ vec3 p = position; p.xy += vec2(-dir.y, dir.x) * (side * uW + lane * uO); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader:`uniform vec3 uCol; uniform float uOp; void main(){ gl_FragColor = vec4(uCol, uOp); }`, transparent:true, depthWrite:false});
  }

  /* ---------- the frame ---------- */
  frame(M, dt, now){
    const s = M.scale(), z = M.cam.z;
    this.g.position.set(-M.cam.x * s, M.cam.y * s - M.h / 2 - M.vTop0, 0); this.g.scale.set(s, s, s);
    const run = !!(P.running && P.running()); if (!run) dt = 0;
    this.t += dt;
    this.s = s; this.z = z; this.M = M;
    const q = Gfx.cfg.particles;
    let any = false;
    any = this.drawTrains(M, s, z, dt) || any;
    any = this.drawSites(M, s, z, dt, q) || any;
    any = this.drawTrees(M, s, z) || any;
    any = this.drawHazards(M, s, z, dt, q) || any;
    any = this.drawSnow(M, s, z, dt, q) || any;
    const dpr = this.A3.r.getPixelRatio();
    const np = this.smoke.update(dt, dpr) + this.fire.update(dt, dpr) + this.snow.update(dt, dpr) + this.rain.update(dt, dpr);
    return any || np > 0;
  }

  /* ---------- trains ---------- */
  railOpen(r, i, pins){
    if (r.base) return true;
    if (!S.owned || !S.owned.I2) return false;
    if (pins.some(p => p.done && p.c === r.c)) return true;
    const t0 = pins.length ? Math.min(...pins.map(p => p.t ?? S.tick)) : S.tick;
    return S.tick - t0 >= 4 + (i % 23) * 2;   // the other lines open one by one, every two months
  }
  /* the open lines change at most once a month: worked out again only then */
  openLines(){
    const pins = (S.pins || []).filter(p => p.k === "rail"), key = `${S.tick}|${S.owned && S.owned.I2 ? 1 : 0}|${pins.length}|${pins.filter(p => p.done).length}`;
    if (key !== this.openKey){ this.openKey = key; this.open = []; RAIL.forEach((r, i) => { if (this.railOpen(r, i, pins)) this.open.push(this.route(r)); }); }
    return this.open;
  }
  route(r){
    if (r.pts) return r;
    r.pts = r.p.map(([la, lo]) => ll(la, lo)); r.seg = [0];
    for (let i = 1; i < r.pts.length; i++) r.seg.push(r.seg[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
    r.len = r.seg[r.seg.length - 1] || 1; r.ph = hashStr(r.p.join());
    // the trains on this line: high-speed lines get one train (two on long lines, running opposite ways);
    // freight lines a freight train, and on long lines a passenger train as well (electric where the line is)
    const T = r.t || "hsr";
    const hs = {kind:T, n:5, v:T === "bullet" ? 8 : 7, lane:.15};
    r.trains = r.k === "hsr" ? [hs].concat(r.len > 380 ? [{...hs, half:1}] : [])
      : [{kind:"fr", n:7, v:2.6, lane:.37}].concat(r.len > 300 ? [{kind:"pax", n:4, v:4.4, lane:.13, half:1}] : []);
    return r;
  }
  at(r, d){
    d = clamp(d, 0, r.len); let i = 1; while (i < r.seg.length - 1 && r.seg[i] < d) i++;
    const a = r.pts[i - 1], b = r.pts[i], k = (d - r.seg[i - 1]) / Math.max(1e-6, r.seg[i] - r.seg[i - 1]);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])];
  }
  buildTracks(open){
    if (this.tracks){ for (const m of this.tracks) { this.g.remove(m); m.geometry.dispose(); } }
    const mk = (list, lanes, mat, order) => {
      const pos = [], dir = [], side = [], lane = [], idx = []; let v = 0;
      for (const r of list) for (const ln of lanes(r)){
        const P0 = r.pts;
        for (let i = 0; i < P0.length; i++){
          const a = P0[Math.max(0, i - 1)], b = P0[Math.min(P0.length - 1, i + 1)];
          let dx = b[0] - a[0], dy = -(b[1] - a[1]); const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
          for (const sd of [-1, 1]){ pos.push(P0[i][0], -P0[i][1], .01); dir.push(dx, dy); side.push(sd); lane.push(ln); }
          if (i){ idx.push(v - 2, v - 1, v, v - 1, v + 1, v); }
          v += 2;
        }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("dir", new THREE.Float32BufferAttribute(dir, 2));
      g.setAttribute("side", new THREE.Float32BufferAttribute(side, 1)); g.setAttribute("lane", new THREE.Float32BufferAttribute(lane, 1)); g.setIndex(idx);
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = order; this.g.add(m); return m;
    };
    const hsr = open.filter(r => r.k === "hsr"), fr = open.filter(r => r.k === "fr");
    const rails = r => [...new Set(r.trains.map(t => t.lane))].flatMap(l => [l, -l]);
    this.tracks = [mk(hsr, () => [0], this.trackMat.bedH, 2), mk(fr, () => [0], this.trackMat.bedF, 2), mk(hsr, rails, this.trackMat.hsr, 2), mk(fr, rails, this.trackMat.fr, 2)];
  }
  drawTrains(M, s, z, dt){
    for (const k in this.cars) this.cars[k].begin(); this.carSh.begin();
    const show = z >= 1.1;
    const open = this.openLines();
    const key = open.map(r => r.ph).join(",");
    if (key !== this.trackKey){ this.trackKey = key; this.buildTracks(open); }
    for (const m of this.tracks) m.visible = show;
    if (show){
      const carPx = clamp(5.6 * Math.sqrt(z), 7, 17), Lc = carPx / s, regs = {}; for (const r of S.regions || []) regs[r.id] = r;
      const TM = this.trackMat; for (const k in TM) TM[k].uniforms.uO.value = Lc;
      TM.bedH.uniforms.uW.value = .3 * Lc + .6 / s; TM.bedF.uniforms.uW.value = .52 * Lc + .6 / s; TM.hsr.uniforms.uW.value = .5 / s; TM.fr.uniforms.uW.value = .45 / s;
      const fade = clamp((z - 1.1) / .3, 0, 1); for (const k in TM) TM[k].uniforms.uOp.value = (k.startsWith("bed") ? .6 : .85) * fade;
      const elec = !!(S.owned && S.owned.I2), gap = Lc * 1.03;
      for (const r of open){
        const cc = P.C && P.C(r.c), reg = cc ? regs[cc.reg] : null, green = elec || r.el || (reg && reg.co2 / reg.co2_0 < .45);
        for (const tr of r.trains){
          // where the train is depends only on the clock and the line (never on the zoom), so zooming cannot move it:
          // f runs 0 → 1 → 0, the rear of the train goes from one end of the line to the other and back
          const per = 2 * r.len / tr.v, u = ((this.t + r.ph * per + (tr.half ? per / 2 : 0)) % per) / per;
          // (eased, so it slows into each end station and pulls away again). The middle of the train is placed in map units
          // (the margin m does not depend on the zoom either); the cars are drawn around it at their on-screen size
          const fwd = u < .5, f = sm(fwd ? u * 2 : 2 - u * 2), n = tr.n, tLen = n * gap, m = Math.min(r.len * .2, 10), mid = m + f * (r.len - 2 * m), rear = mid - tLen / 2;
          const pax = tr.kind === "pax" ? (green ? "emu" : "coach") : tr.kind, lane = (fwd ? 1 : -1) * tr.lane * Lc;
          for (let c = 0; c < n; c++){
            // car 0 is the front in the direction of travel
            const d = fwd ? rear + tLen - c * gap - Lc / 2 : rear + c * gap + Lc / 2;
            if (d < 0 || d > r.len) continue;
            let [x, y, a] = this.at(r, d); const hd = fwd ? a : a + Math.PI;
            // the lane: beside the middle of the line, on the side for this direction (matches the rail lines)
            x += Math.sin(a) * lane; y -= Math.cos(a) * lane;
            let kind, flip = 0;
            if (pax === "hsr" || pax === "bullet"){ const end = c === 0 || c === n - 1; kind = pax + (end ? "Head" : "Mid"); if (c === n - 1) flip = Math.PI; }
            else if (pax === "emu"){ const end = c === 0 || c === n - 1; kind = end ? "emuHead" : "emuMid"; if (c === n - 1) flip = Math.PI; }
            else if (pax === "coach") kind = c === 0 ? "diesel" : "coach";
            else kind = c === 0 ? (green ? "electric" : "diesel") : r.ore ? "ore" : c % 4 === 2 ? "tank" : "box";
            this.cars[kind].add(mat(x, y, 0, hd + flip, Lc, Lc * .92, Lc), kind === "box" ? _c.setHSL((hashStr(r.ph + "" + c) * 6 | 0) / 6 * .9, .55, .5) : null);
            this.carSh.add(mat(x + .12 * Lc, y + .18 * Lc, .002, hd, Lc, Lc * .92, Lc));
            // diesel smoke
            if (kind === "diesel" && dt && Math.random() < dt * 3){
              const hx = x - Math.cos(hd) * Lc * .1, hy = y - Math.sin(hd) * Lc * .1;
              this.smoke.emit({x:hx, y:hy, z:Lc * .4, vx:.4 / s, vy:-.2 / s, vz:5 / s, life:1.6, s0:carPx * .35, s1:carPx * 1.1, c0:[.32, .31, .3, .55], c1:[.55, .54, .52, 0]});
            }
          }
        }
      }
    }
    for (const k in this.cars) this.cars[k].end(); this.carSh.end();
    return show && open.length > 0;
  }

  /* ---------- industry ---------- */
  drawSites(M, s, z, dt, q){
    if (!this.sites.length){
      for (const [k, la, lo, reg] of SITES){
        const [x, y] = ll(la, lo), m = new THREE.Mesh(this.mod.site[k][0], this.lam); m.renderOrder = 4;   // off-screen sites are skipped by three
        const sh = new THREE.Mesh(this.siteShGeo || (this.siteShGeo = new THREE.CircleGeometry(.7, 16)), this.shMat); sh.renderOrder = 3;
        this.g.add(sh, m); this.sites.push({k, x, y, reg, m, sh, clean:false, ph:hashStr(k + la + lo)});
      }
    }
    const show = z >= 1.15, regs = {}; for (const r of S.regions || []) regs[r.id] = r;
    const sz = clamp(10 + 6 * Math.sqrt(z), 16, 34), Ls = sz / s, th = S.lang === "th";
    for (const st of this.sites){
      st.m.visible = st.sh.visible = show; if (!show) continue;
      const r = regs[st.reg], k = r ? clamp(r.co2 / r.co2_0, 0, 1.3) : 1;
      const clean = st.k === "ev" || k <= .22 || (st.k === "steel" && S.owned && S.owned.I1 && k < .6) || (st.k === "coal" && k < .35);
      if (clean !== st.clean){ st.clean = clean; st.m.geometry = this.mod.site[st.k][clean ? 1 : 0]; }
      st.m.position.set(st.x, -st.y, 0); st.m.scale.setScalar(Ls); st.m.rotation.set(0, 0, 0);
      st.sh.position.set(st.x + Ls * .12, -st.y - Ls * .12, .001); st.sh.scale.setScalar(Ls);
      // smoke from each stack: as much as the continent still emits
      if (dt && !clean) for (const [sx, sy, sz0, amt, kind] of STACKS[st.k]){
        if (Math.random() > dt * 7 * amt * q * Math.min(1, k + .15)) continue;
        const x = st.x + sx * Ls, y = st.y - sy * Ls, h = sz0 * Ls;
        if (kind === "flare") this.fire.emit({x, y, z:h, vx:0, vy:0, vz:3 / s, life:.5, s0:sz * .25, s1:sz * .12, c0:[1, .55, .15, .9], c1:[1, .3, .05, 0]});
        else if (kind === "steam") this.smoke.emit({x, y, z:h, vx:.8 / s, vy:-.3 / s, vz:6 / s, life:2.2, s0:sz * .35, s1:sz * 1.2, c0:[.92, .93, .94, .5], c1:[1, 1, 1, 0]});
        else if (kind === "dust") this.smoke.emit({x:x + (Math.random() - .5) * Ls * .6, y:y + (Math.random() - .5) * Ls * .6, z:h, vx:1.2 / s, vy:0, vz:2 / s, life:2.4, s0:sz * .3, s1:sz * .9, c0:[.62, .48, .34, .45], c1:[.7, .58, .44, 0]});
        else this.smoke.emit({x, y, z:h, vx:1 / s, vy:-.4 / s, vz:7 / s, life:3, s0:sz * .25, s1:sz * 1.3 * Math.min(1.3, .6 + k * .6), c0:[.36, .34, .33, .6], c1:[.58, .56, .54, 0]});
      }
      // tap → what it is
      const [px, py] = M.toScreenAlt(st.x, st.y, sz * .3); if (px < -40 || py < -40 || px > M.vw + 40 || py > M.vh + 40) continue;
      M.hits.push({id:"site-" + st.ph, x:px - sz * .5, y:py - sz * .6, w:sz, h:sz, fn:() => {
        const nm = L(SITE_NAME[st.k]), regName = r ? L(P.RMETA[st.reg].name) : "";
        const txt = th ? `${nm} · ${regName} · ${clean ? "สะอาดแล้ว" : `ยังปล่อยคาร์บอน ${Math.round(k * 100)}% ของปีเริ่มต้น`}` : `${nm} · ${regName} · ${clean ? "clean now" : `still emitting ${Math.round(k * 100)}% of the start`}`;
        M.info = {x:px, y:py - sz * .6, t:performance.now(), txt}; }});
    }
    return show;
  }

  /* ---------- trees ---------- */
  grove(M, p, pos){
    const gk = `${p.id}:${p.c}:${p.sd}`;   // a new game starts pin ids again at 1
    if (this.groves.has(gk)) return this.groves.get(gk);
    const r = mrng(((p.sd % 9973) + 1) / 9974), mangrove = p.k === "mangrove", N = mangrove ? 16 : 24, R = mangrove ? 7 : 10;
    const shapes = M.shapes.filter(sh => sh.c === p.c), ctx = M.bctx, list = [];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < N * 4 && list.length < N; i++){
      const a = r() * TAU, d = Math.sqrt(r()) * R, x = pos[0] + Math.cos(a) * d, y = pos[1] + Math.sin(a) * d;
      const inside = shapes.some(sh => ctx.isPointInPath(sh.path, x, y, "evenodd"));
      if (!inside && !(mangrove && r() < .5)) continue;
      const kind = mangrove ? "mangrove" : r() < .45 ? "pine" : "leaf";
      list.push({x, y, kind, h:.7 + r() * .6, ph:r() * TAU, col:new THREE.Color().setHSL(.22 + r() * .14, .35, .78 + r() * .18)});
    }
    ctx.restore();
    if (!list.length) list.push({x:pos[0], y:pos[1], kind:mangrove ? "mangrove" : "leaf", h:1, ph:0, col:new THREE.Color(1, 1, 1)});
    if (this.groves.size > 400) this.groves.clear();
    this.groves.set(gk, list); return list;
  }
  drawTrees(M, s, z){
    for (const k in this.trees) this.trees[k].begin(); this.treeSh.begin();
    const pins = (S.pins || []).filter(p => p.done && (p.k === "forest" || p.k === "mangrove"));
    const hPx = clamp(6 * Math.sqrt(z), 7, 18), sway = this.t;
    for (const p of pins){
      const pos = placePin(M, p); if (!pos) continue;
      const grow = clamp((S.tick - (p.t || 0) + (P.monthFrac ? P.monthFrac() : 0)) / 48, .18, 1);
      for (const tr of this.grove(M, p, pos)){
        const H = hPx * tr.h * (.45 + .55 * grow) / s;
        this.trees[tr.kind].add(mat(tr.x, tr.y, 0, 0, H, H, H, Math.sin(sway * 1.3 + tr.ph) * .05, Math.cos(sway * 1.1 + tr.ph) * .04), tr.col);
        this.treeSh.add(mat(tr.x + H * .25, tr.y + H * .3, .001, 0, H * 1.3, H * 1.1, 1));
      }
    }
    for (const k in this.trees) this.trees[k].end(); this.treeSh.end();
    return pins.length > 0;
  }

  /* ---------- disasters ---------- */
  hzPlace(type, cid, M){
    const at = HZ_AT[type] && HZ_AT[type][cid];
    if (at) return ll(at[0], at[1]);
    const cap = P.CAPITALS && P.CAPITALS[cid];
    if (cap && type !== "drought") return ll(cap[0], cap[1]);
    return M.countryPoint(cid);
  }
  decal(M, key, type, cid){
    let d = this.decals.get(key); if (d) return d;
    if (this.noDecal.has(key)) return null;   // a country too small to draw (or not on the map): don't look again every frame
    const pos = this.hzPlace(type, cid, M); if (!pos){ this.noDecal.add(key); return null; }
    const [R, , ty] = HZ_R[type];
    const near = M.shapes.filter(sh => sh.b[2] > pos[0] - R && sh.b[0] < pos[0] + R && sh.b[3] > pos[1] - R && sh.b[1] < pos[1] + R), shapes = near.filter(sh => sh.c === cid);
    if (!shapes.length){ this.noDecal.add(key); return null; }
    const mask = makeMask(M, shapes, pos[0], pos[1], R, R, hashStr(key), 1024, near);
    const mesh = this.decalMesh(mask, ty, pos[0], pos[1], R, R);
    // land cells for the fire front / dust (CPU side)
    const cells = []; for (let i = 0; i < mask.NX * mask.NY; i += 3) if (mask.land[i] > .5){ const x = i % mask.NX, y = (i / mask.NX) | 0, u = x / mask.NX * 2 - 1, v = y / mask.NY * 2 - 1; if (u * u + v * v < .55) cells.push(i); }
    d = {mesh, mask, type, cid, cells, x:pos[0], y:pos[1], R};
    this.decals.set(key, d); return d;
  }
  decalMesh(mask, ty, cx, cy, Rx, Ry){
    const mt = new THREE.ShaderMaterial({uniforms:{uMask:{value:mask.tex}, uNoise:{value:mask.ntex}, uType:{value:ty}, uL:{value:0}, uB:{value:0}, uT:{value:0}, uA:{value:1}, uFront:{value:0}, uScar:{value:1}, uFade:{value:new THREE.Vector4(.1, .1, .1, .1)}, uOff:{value:new THREE.Vector2((hashStr(cx + "," + cy) - .5) * 60, (hashStr(cy + "," + cx) - .5) * 60)}},
      vertexShader:"uniform vec2 uOff; " + DECAL_VS, fragmentShader:DECAL_FS, transparent:true, depthWrite:false});
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * Rx, 2 * Ry), mt); mesh.position.set(cx, -cy, .005); mesh.renderOrder = 1; mesh.frustumCulled = false;
    this.g.add(mesh); return mesh;
  }
  dropDecal(key){ const d = this.decals.get(key); if (!d) return; this.g.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); d.mask.tex.dispose(); d.mask.ntex.dispose(); this.decals.delete(key); }
  hazList(){
    const out = [], now = S.tick + (P.monthFrac ? P.monthFrac() : 0);
    for (const h of S.haz || []) if (HZ_R[h.type] && h.at - now <= 1.05) out.push({key:`${h.type}:${h.c}:${h.at}`, type:h.type, c:h.c, t:now - h.at, sev:h.sev || 1});
    const dmg = (S.stats && S.stats.dmg) || [];
    for (let i = dmg.length - 1; i >= 0; i--){
      const x = dmg[i]; if (now - x.tick > 13) break; if (!HZ_R[x.type]) continue;
      const t = now - x.tick; if (t > HZ_R[x.type][1]) continue;
      out.push({key:`${x.type}:${x.c}:${x.tick}`, type:x.type, c:x.c, t, sev:clamp(x.d, .3, 1.4)});
    }
    return out;
  }
  drawHazards(M, s, z, dt, q){
    const live = new Set(); let any = false;
    for (const h of this.hazList()){
      if (live.has(h.key)) continue; live.add(h.key);
      const d = this.decal(M, h.key, h.type, h.c); if (!d) continue;
      const st = hzState(h.type, h.t), u = d.mesh.material.uniforms;
      u.uL.value = st.L || 0; u.uB.value = st.B || 0; u.uFront.value = st.front || 0; u.uScar.value = st.scar ?? 1; u.uT.value = this.t + d.R; u.uA.value = clamp(.75 + .25 * h.sev, .7, 1);
      d.mesh.visible = true; any = true;
      if (!dt) continue;
      const R = d.R, mk = d.mask, px = clamp(8 * Math.sqrt(z), 8, 22);
      const cellXY = i => { const x = i % mk.NX, y = (i / mk.NX) | 0; return [mk.cx - mk.Rx + (x + .5) / mk.NX * 2 * mk.Rx, mk.cy - mk.Ry + (y + .5) / mk.NY * 2 * mk.Ry]; };
      if (h.type === "wildfire" && st.front > .05){
        // flames along the front, a tall column of smoke drifting downwind
        const B = st.B; let tries = Math.round(160 * q), made = 0;
        while (tries-- > 0 && made < 6 * q * dt * 60){
          const i = d.cells[(Math.random() * d.cells.length) | 0]; if (i == null) break; if (Math.abs(mk.noise[i] - B) > .03) continue;
          const [x, y] = cellXY(i); made++;
          this.fire.emit({x, y, z:0, vx:0, vy:0, vz:(6 + Math.random() * 6) / s, life:.55 + Math.random() * .4, s0:px * (.9 + Math.random() * .6), s1:px * .3, c0:[1, .62, .2, .95 * st.front], c1:[.9, .2, .03, 0]});
          if (Math.random() < .45) this.smoke.emit({x, y, z:px * .4 / s, vx:(4 + Math.random() * 3) / s, vy:-1.5 / s, vz:(12 + Math.random() * 8) / s, life:5 + Math.random() * 3, s0:px * 1.2, s1:px * 6, c0:[.24, .2, .17, .7 * st.front], c1:[.55, .52, .5, 0]});
        }
      } else if (h.type === "flood" && h.t > -1 && h.t < 1.2){
        const n = Math.round(7 * q * dt * 60);
        for (let k = 0; k < n; k++){ const i = d.cells[(Math.random() * d.cells.length) | 0]; if (i == null) break; const [x, y] = cellXY(i);
          this.rain.emit({x, y, z:px * 3 / s, vx:-1 / s, vy:0, vz:-px * 8 / s, life:.38, s0:px * .8, s1:px * .8, c0:[.8, .88, .96, .35], c1:[.8, .88, .96, .15]}); }
      } else if (h.type === "drought" && st.L > .3){
        if (Math.random() < dt * 5 * q){ const i = d.cells[(Math.random() * d.cells.length) | 0]; if (i != null){ const [x, y] = cellXY(i);
          this.smoke.emit({x, y, z:0, vx:5 / s, vy:-1 / s, vz:2 / s, life:3.5, s0:px * .8, s1:px * 3.4, c0:[.7, .55, .36, .4 * st.L], c1:[.78, .66, .48, 0]}); } }
      } else if (h.type === "heat" && st.L > .2){
        const n = Math.round(2 * q * dt * 60);
        for (let k = 0; k < n; k++){ const i = d.cells[(Math.random() * d.cells.length) | 0]; if (i == null) break; const [x, y] = cellXY(i);
          this.fire.emit({x, y, z:0, vx:0, vy:0, vz:px * 1.2 / s, life:2.2, s0:px * 2, s1:px * 3.6, c0:[1, .45, .12, .06 * st.L], c1:[1, .3, .05, 0]}); }
      }
    }
    for (const [key, d] of this.decals) if (!live.has(key)){ if (d.type === "snow") continue; this.dropDecal(key); }
    return any;
  }

  /* ---------- snow in the northern winter ---------- */
  drawSnow(M, s, z, dt, q){
    // [south, north, west, east, fade left, fade right, fade top]: up to 80°N so no edge cuts across the land; Europe and
    // Asia overlap by 10° and cross-fade there
    const SNOW = [[44, 80, -168, -50, .03, .06, .1], [44, 80, -15, 65, .1, .125, .1], [40, 80, 55, 190, .074, .03, .1]];
    const sea = P.seasonOf ? P.seasonOf(S.tick) : null, m = S.tick % 12, frac = P.monthFrac ? P.monthFrac() : 0;
    // 0 in autumn … 1 in deep winter … 0 by spring (Dec · Jan · Feb), a little warmer world = less snow
    const into = m === 11 ? frac : m === 0 ? 1 : m === 1 ? 1 - ss(.3, 1, frac) : 0;
    const L0 = sea && sea.id === "cool" ? into * clamp(1.15 - (S.temp - 1.2) * .35, .45, 1) : 0;
    let any = false;
    SNOW.forEach(([la0, la1, lo0, lo1, fl, fr, ft], i) => {
      const key = "snow:" + i;
      if (L0 <= .01){ const d = this.decals.get(key); if (d) d.mesh.visible = false; return; }
      let d = this.decals.get(key);
      if (!d){
        const [x0, y0] = ll(la1, lo0), [x1, y1] = ll(la0, lo1), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, Rx = (x1 - x0) / 2, Ry = (y1 - y0) / 2;
        const shapes = M.shapes.filter(sh => sh.b[2] > x0 && sh.b[0] < x1 && sh.b[3] > y0 && sh.b[1] < y1);
        const mask = makeMask(M, shapes, cx, cy, Rx, Ry, .37 + i, 1536);
        d = {mesh:this.decalMesh(mask, 5, cx, cy, Rx, Ry), mask, type:"snow", x:cx, y:cy, Rx, Ry}; this.decals.set(key, d);
        d.mesh.material.uniforms.uFade.value.set(fl, fr, ft, .1);
      }
      d.mesh.visible = true; d.mesh.material.uniforms.uL.value = L0; d.mesh.material.uniforms.uT.value = this.t; any = true;
      // falling snow over the part of the area on screen
      if (dt){
        const n = Math.round(6 * q * dt * 60 * L0), px = clamp(3 * Math.sqrt(z), 3, 7);
        for (let k = 0; k < n; k++){
          const u = Math.random() * 2 - 1, v = Math.random() * 2 - 1, x = d.x + u * d.Rx, y = d.y + v * d.Ry;
          if (Math.random() > clamp((1 - Math.abs(u)) / .14, 0, 1) * clamp((1 - Math.abs(v)) / .2, 0, 1)) continue;   // thins out toward the edges of the area
          const [sx, sy] = M.toScreen(x, y); if (sx < -20 || sy < -20 || sx > M.vw + 20 || sy > M.vh + 20) continue;
          this.snow.emit({x, y, z:px * 14 / s, vx:(1.5 + Math.random()) / s, vy:0, vz:-px * 3 / s, life:4.2, s0:px, s1:px * .8, c0:[1, 1, 1, .75], c1:[1, 1, 1, .55]});
        }
      }
    });
    return any;
  }
  hide(){ this.g.visible = false; }
}
