const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.earth) return;
(P.mods = P.mods || {}).earth = 1;
/* =========================================================================
   Earth · the map looks like the website's
   · In the game: the website's satellite photo (NASA Blue Marble / Black Marble, Robinson, web/src/map2d.js paintWorld)
     is laid under the region colours, cut to the map's outline. The regions become a light heat tint over the photo,
     and the country borders always show a little (stronger when zoomed in), like the website.
   · On the menu: the website's 3D Earth (web/src/globe.js): day / night with city lights, clouds, ocean glint,
     atmosphere glow, CO₂ hotspots and cooperation arcs between cities. Drag to spin.
   Both are three.js objects on the map layer (the layer is 3D, see 52-map.js). Pictures come from the MapTex object.
   ========================================================================= */
const {S, Kit, clamp} = P;
const Map = P.Map;
const DEG = Math.PI / 180;
const LON0 = 11, LAT_TOP = 84;   // the map is centred on 11°E and starts at 84°N
const imgMgr = () => Map.scene.getGame().getImageManager();
const texOf = (name, srgb) => { const t = imgMgr().getThreeTexture(name); if (t && srgb && t.colorSpace !== THREE.SRGBColorSpace){ t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; } return t; };
const themeName = () => { try { const v = localStorage.getItem("p2050-theme") || ""; return P.Net && v && P.Net.owns("theme_" + v) ? v : ""; } catch(e) { return ""; } };

/* ---------------------------------------------------------------- satellite photo under the map
   3.7: the map is a Miller rectangle (52-map.js toWorld, like the website's geo.js). The picture is a latitude / longitude
   grid whose corners sit where the map puts them, and each corner reads the picture where that place is in the picture.
   Day / night use the Earth's full pictures (latitude / longitude, whole world); the paint theme uses the website's
   Miller map picture. */
const LAT_MAP_BOT = -57;   // this map's lower edge (mapmeta LAT_BOT)
const millerY = lat => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * DEG));
const uvEarth = (lat, lon) => [(lon + 180) / 360, (lat + 90) / 180];   // past 180°E u goes a little over 1: the picture repeats, so no seam
const uvPaint = (lat, lon) => [(lon - LON0) / 360 + .5, 1 - (millerY(LAT_TOP) - millerY(lat)) / (millerY(LAT_TOP) - millerY(LAT_MAP_BOT))];
const Photo = {
  mesh:null, theme:null,
  build(R){
    const NX = 144, NY = 64, pos = [], uvE = [], uvP = [], idx = [];
    for (let j = 0; j <= NY; j++){
      const lat = LAT_TOP - (LAT_TOP - LAT_MAP_BOT) * j / NY;
      for (let i = 0; i <= NX; i++){
        const lon = LON0 - 179.99 + 359.98 * i / NX, [x, y] = P.toWorld(lat, lon);
        pos.push(x, y, 0); uvE.push(...uvEarth(lat, lon)); uvP.push(...uvPaint(lat, lon));
        if (i < NX && j < NY){ const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    this.uvE = new THREE.Float32BufferAttribute(uvE, 2); this.uvP = new THREE.Float32BufferAttribute(uvP, 2);
    g.setAttribute("uv", this.uvE);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({transparent:true, depthTest:false, depthWrite:false, side:THREE.DoubleSide}));
    m.renderOrder = 3; m.frustumCulled = false;   // above the ocean (0), rim (1) and ice (2); under the regions (10)
    R.add3DRendererObject(m); this.mesh = m; this.theme = null; this.setTheme();
    // region heat tint drawn from the country shapes (exactly on the photo, like the website's region paths)
    this.tints = {};
    for (const reg of Object.keys(Map.regions)){
      const fill = [];
      for (const c of P.CGEO) if (c.r === reg) for (const p of c.p){
        const v = []; for (let i = 0; i < p.length; i += 2) v.push(new THREE.Vector2(p[i], p[i + 1]));
        try { for (const t of THREE.ShapeUtils.triangulateShape(v, [])) for (const k of t) fill.push(v[k].x, v[k].y, 0); } catch(e) {}
      }
      if (!fill.length) continue;
      const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(fill, 3));
      const tm = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:.2, depthTest:false, depthWrite:false, side:THREE.DoubleSide}));
      tm.renderOrder = 10; tm.frustumCulled = false; R.add3DRendererObject(tm); this.tints[reg] = tm;
    }
  },
  setTheme(){
    if (!this.mesh) return;
    const th = themeName(); if (th === this.theme) return; this.theme = th;
    const paint = th === "paint", tex = texOf(paint ? "photo/map-paint.jpg" : `photo/earth-${th === "night" ? "night" : "day"}.jpg`, true);
    if (tex){ const w = paint ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; if (tex.wrapS !== w){ tex.wrapS = w; tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true; } }
    this.mesh.geometry.setAttribute("uv", paint ? this.uvP : this.uvE);
    this.mesh.material.map = tex; this.mesh.material.needsUpdate = true;
  },
};

/* ---------------------------------------------------------------- 3.5: ice round the world (like web/src/ice.js)
   Outside the map the world sits in a sheet of polar ice (3.7: only seen at the far corners when the camera tilts, since
   the map now always fills the screen). Along the top (Arctic) and bottom of the map lies a thin, faint, ragged band of
   sea ice. Both textures are drawn once in code. */
const MAPW = P.MAPW || 2174, MAPH = P.MAPH || 1080, MTOP = P.MAP_TOP || 84;
const ICE_TILE = 380, POLAR = 109, POLAR_S = 63;   // in world px (the website's 2400-wide map uses 420 / 120 / 70)
let iceTile = null;
function iceCanvas(){
  if (iceTile) return iceTile;
  const N = 512, cv = document.createElement("canvas"); cv.width = cv.height = N;
  const g = cv.getContext("2d");
  let seed = 20250; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const wrap = draw => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]){ g.save(); g.translate(dx, dy); draw(); g.restore(); } };
  g.fillStyle = "#c9dfeb"; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 60; i++){
    const x = rnd() * N, y = rnd() * N, r = 30 + rnd() * 140, snow = rnd() < .55;
    const col = snow ? `rgba(246,251,255,${.18 + rnd() * .25})` : `rgba(${120 + rnd() * 40 | 0},${170 + rnd() * 30 | 0},${200 + rnd() * 25 | 0},${.12 + rnd() * .18})`;
    wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); });
  }
  g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 0; i < 26; i++){
    const pts = []; let x = rnd() * N, y = rnd() * N, a = rnd() * Math.PI * 2;
    const n = 6 + (rnd() * 14 | 0);
    for (let k = 0; k < n; k++){ pts.push([x, y]); a += (rnd() - .5) * 1.1; const L = 8 + rnd() * 26; x += Math.cos(a) * L; y += Math.sin(a) * L; }
    const w = .6 + rnd() * 1.6, dark = `rgba(96,140,168,${.25 + rnd() * .3})`, lite = `rgba(255,255,255,${.35 + rnd() * .3})`;
    wrap(() => {
      g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px, py) : g.moveTo(px, py));
      g.strokeStyle = dark; g.lineWidth = w; g.stroke();
      g.translate(.8, .8); g.strokeStyle = lite; g.lineWidth = w * .7; g.stroke();
    });
  }
  for (let i = 0; i < 900; i++){ const x = rnd() * N, y = rnd() * N; g.fillStyle = `rgba(255,255,255,${.25 + rnd() * .55})`; g.fillRect(x, y, rnd() < .1 ? 1.6 : .9, rnd() < .1 ? 1.6 : .9); }
  return (iceTile = cv);
}
/* the band of sea ice along the top of the map (web/src/ice.js polarCanvas): ice texture cut by noise, almost solid at
   the very top, breaking up into ragged pack ice and small floes further down, at most ~80% opaque */
let polarCv = null;
function polarCanvas(){
  if (polarCv) return polarCv;
  const Wc = 4096, Hc = 200, cv = document.createElement("canvas"); cv.width = Wc; cv.height = Hc;
  const g = cv.getContext("2d");
  const pat = g.createPattern(iceCanvas(), "repeat"); pat.setTransform(new DOMMatrix().scale(420 / 512 * Wc / 2400 * .3));
  g.fillStyle = pat; g.fillRect(0, 0, Wc, Hc);
  g.fillStyle = "rgba(240,248,255,.55)"; g.fillRect(0, 0, Wc, Hc);
  const hash = (i, j) => { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); };
  const sm = t => t * t * (3 - 2 * t);
  const vn = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
    return (hash(i, j) * (1 - fx) + hash(i + 1, j) * fx) * (1 - fy) + (hash(i, j + 1) * (1 - fx) + hash(i + 1, j + 1) * fx) * fy; };
  const fbm = (x, y) => .5 * vn(x / 150, y / 90) + .27 * vn(x / 52 + 17, y / 40 + 5) + .15 * vn(x / 19 + 41, y / 17 + 9) + .08 * vn(x / 7 + 3, y / 7 + 77);
  const C = 13, cell = (i, j) => [(i + hash(i * 1.7 + 3, j * 2.3 + 1)) * C, (j + hash(i * 3.1 + 7, j * 1.3 + 5)) * C];
  const img = g.getImageData(0, 0, Wc, Hc), d = img.data;
  for (let y = 0; y < Hc; y++){
    const v = y / Hc, gj = Math.floor(y / C);
    for (let x = 0; x < Wc; x++){
      const n = fbm(x, y), dens = 1.28 - v * 1.7 + (n - .5) * 1.35, t = dens - .5;
      let ice = 0, shade = 1;
      if (t > .22) ice = 1;
      else if (t > -.22){
        const gi = Math.floor(x / C); let f1 = 1e9, f2 = 1e9, ci = 0, cj = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++){
          const [px, py] = cell(gi + di, gj + dj), dd = (px - x) * (px - x) + (py - y) * (py - y);
          if (dd < f1){ f2 = f1; f1 = dd; ci = gi + di; cj = gj + dj; } else if (dd < f2) f2 = dd;
        }
        const u = (t + .22) / .44, r = hash(ci * 5.3 + 11, cj * 7.7 + 13), gap = .6 + (1 - u) * 2.2, e = Math.sqrt(f2) - Math.sqrt(f1);
        ice = (r < u * 1.15 ? 1 : 0) * Math.max(0, Math.min(1, (e - gap) / 1.2)); shade = .9 + .16 * r;
      }
      const top = Math.max(0, 1 - v / .05), k = (y * Wc + x) * 4;
      if (shade !== 1){ d[k] = Math.min(255, d[k] * shade); d[k + 1] = Math.min(255, d[k + 1] * shade); d[k + 2] = Math.min(255, d[k + 2] * shade + 6); }
      const a = Math.min(.8, ice * (.4 + .28 * n) + top * .4) * Math.min(1, (1 - v) / .06);
      d[k + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return (polarCv = cv);
}
const Ice = P.Ice = {
  build(R){
    const tex = new THREE.CanvasTexture(iceCanvas()); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    // a big sheet with the map's rectangle cut out
    const W = MAPW, H = MAPH, x0 = 0, y0 = MTOP, x1 = MAPW, y1 = MTOP + MAPH;
    const outer = [[-3 * W, -3 * H], [4 * W, -3 * H], [4 * W, 4 * H], [-3 * W, 4 * H]].map(([x, y]) => new THREE.Vector2(x, y));
    const hole = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => new THREE.Vector2(x, y)), all = outer.concat(hole), pos = [], uv = [];
    for (const t of THREE.ShapeUtils.triangulateShape(outer, [hole])) for (const k of t){ pos.push(all[k].x, all[k].y, 0); uv.push(all[k].x / ICE_TILE, all[k].y / ICE_TILE); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    this.mat = new THREE.MeshBasicMaterial({map:tex, transparent:true, depthTest:false, depthWrite:false, side:THREE.DoubleSide});
    const m = this.mesh = new THREE.Mesh(g, this.mat); m.renderOrder = 2.5; m.frustumCulled = false; R.add3DRendererObject(m);   // over the ocean / rim, under the photo
    // 3.7: sea-ice bands, top and (flipped, mirrored) bottom
    const ptex = new THREE.CanvasTexture(polarCanvas()); ptex.colorSpace = THREE.SRGBColorSpace;
    const bp = [], bu = [];
    const quad = (ax, ay, bx, by, u0, v0, u1, v1) => { bp.push(ax, ay, 0, bx, ay, 0, bx, by, 0, ax, ay, 0, bx, by, 0, ax, by, 0); bu.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1); };
    quad(x0, y0, x1, y0 + POLAR, 0, 1, 1, 0);
    quad(x0, y1, x1, y1 - POLAR_S, 1, 1, 0, 0);
    const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3)); bg.setAttribute("uv", new THREE.Float32BufferAttribute(bu, 2));
    this.frostMat = new THREE.MeshBasicMaterial({map:ptex, transparent:true, depthTest:false, depthWrite:false, side:THREE.DoubleSide});
    const f = this.frost = new THREE.Mesh(bg, this.frostMat); f.renderOrder = 10.4; f.frustumCulled = false; R.add3DRendererObject(f);   // over the photo and region tints, under borders
  },
  /* muted ice (3.6.1), darker on the night map; the sea-ice bands a little dimmer at night */
  tone(night){ if (!this.mat) return; this.mat.color.setHex(night ? 0x3c4a54 : 0x74889a); this.frostMat.color.setHex(night ? 0x8a9aa8 : 0xffffff); this.frostMat.opacity = night ? .75 : 1; },
};

/* ---------------------------------------------------------------- the 3D Earth on the menu (web/src/globe.js) */
const EARTH_VS = `
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const EARTH_FS = `
uniform sampler2D day; uniform sampler2D night; uniform sampler2D water; uniform vec3 sun; uniform float heat;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
  float d = dot(n, sun);
  float dayAmt = smoothstep(-0.12, 0.22, d);
  vec3 dc = texture2D(day, vUv).rgb;
  vec3 nc = texture2D(night, vUv).rgb;
  float w = texture2D(water, vUv).r;
  vec3 lit = dc * (0.08 + 1.05 * max(d, 0.0));
  vec3 lights = pow(nc, vec3(1.6)) * vec3(1.35, 1.1, 0.75) * 2.4;
  vec3 col = mix(lights + dc * 0.035, lit, dayAmt);
  vec3 h = normalize(sun + v);
  float spec = pow(max(dot(n, h), 0.0), 60.0) * w * dayAmt;
  col += vec3(1.0, 0.92, 0.78) * spec * 0.55;
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 atm = mix(vec3(0.32, 0.62, 1.0), vec3(1.0, 0.55, 0.3), heat);
  col += atm * rim * (0.15 + 0.85 * smoothstep(-0.3, 0.4, d)) * 0.55;
  col += vec3(1.0, 0.45, 0.15) * (1.0 - abs(d) * 6.0) * step(abs(d), 0.16) * 0.08;
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(0.4545)), 1.0);   // 3.7.3: linear → sRGB like the website (it was much darker than the loading screen's Earth)
}`;
const CLOUD_FS = `
uniform sampler2D map; uniform vec3 sun; uniform float shift; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  float a = texture2D(map, vec2(vUv.x + shift, vUv.y)).r;
  a = smoothstep(0.18, 0.9, a);
  float d = dot(normalize(vN), sun);
  float l = smoothstep(-0.15, 0.35, d);
  gl_FragColor = vec4(pow(vec3(0.95, 0.97, 1.0) * (0.12 + 0.95 * l), vec3(0.4545)), a * (0.18 + 0.72 * l));
}`;
const ATM_VS = `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const ATM_FS = `
uniform vec3 sun; uniform float heat; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 v = normalize(cameraPosition - vW);
  float f = pow(clamp(-dot(normalize(vN), v) / 0.38, 0.0, 1.0), 3.0);
  float lit = smoothstep(-0.6, 0.4, dot(normalize(vN), sun));
  vec3 c = mix(vec3(0.3, 0.62, 1.0), vec3(1.0, 0.5, 0.25), heat);
  gl_FragColor = vec4(c, f * (0.15 + 0.85 * lit) * 0.95);
}`;
const ARC_VS = `attribute float t; varying float vT; void main(){ vT = t; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ARC_FS = `
uniform float head; uniform vec3 color; varying float vT;
void main(){
  float d = head - vT;
  float a = d >= 0.0 ? exp(-d * 6.0) : 0.0;
  a *= step(vT, head) * smoothstep(0.0, 0.05, vT) * (1.0 - smoothstep(0.95, 1.0, vT));
  gl_FragColor = vec4(color, a * 0.9);
}`;
const vec = (lat, lon, r = 1) => new THREE.Vector3(Math.cos(lat * DEG) * Math.cos(lon * DEG) * r, Math.sin(lat * DEG) * r, -Math.cos(lat * DEG) * Math.sin(lon * DEG) * r);
function glowTexture(){
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const Globe = {
  root:null, R:null,
  build(R){
    this.R = R;
    const low = P.Gfx && P.Gfx.level === "low", seg = low ? 64 : 128;
    // root: placed in world px and scaled to the globe's radius, so everything inside is in the website's units (Earth = 1)
    const root = this.root = new THREE.Group(), tilt = this.tilt = new THREE.Group(), spinG = this.spinG = new THREE.Group();
    tilt.add(spinG); root.add(tilt); tilt.rotation.z = 23.4 * DEG * 0.35;
    this.sun = new THREE.Vector3(-0.55, 0.32, 0.78).normalize();
    const water = texOf("globe/globe-water.jpg", false), clouds = texOf("globe/globe-clouds.jpg", false);
    if (clouds){ clouds.wrapS = THREE.RepeatWrapping; clouds.needsUpdate = true; }
    const uni = this.uni = {day:{value:texOf("globe/globe-day.jpg", true)}, night:{value:texOf("globe/globe-night.jpg", true)}, water:{value:water}, sun:{value:this.sun}, heat:{value:0}};
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, seg, seg / 2), new THREE.ShaderMaterial({uniforms:uni, vertexShader:EARTH_VS, fragmentShader:EARTH_FS}));
    earth.renderOrder = 100; spinG.add(earth);
    this.cloudU = {map:{value:clouds}, sun:{value:this.sun}, shift:{value:0}};
    const cl = this.clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, seg, seg / 2), new THREE.ShaderMaterial({uniforms:this.cloudU, vertexShader:EARTH_VS, fragmentShader:CLOUD_FS, transparent:true, depthWrite:false}));
    cl.renderOrder = 101; spinG.add(cl);   // 3.7: always on, like the loading screen's Earth
    const atm = new THREE.Mesh(new THREE.SphereGeometry(1.08, 96, 48), new THREE.ShaderMaterial({uniforms:{sun:{value:this.sun}, heat:uni.heat}, vertexShader:ATM_VS, fragmentShader:ATM_FS, side:THREE.BackSide, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
    atm.renderOrder = 99; root.add(atm);
    // CO₂ hotspots on the big cities
    const gt = glowTexture(); this.hot = [];
    for (const reg of Object.keys(P.CITIES)) for (const [lat, lon, w] of P.CITIES[reg]){
      const m = new THREE.Sprite(new THREE.SpriteMaterial({map:gt, color:0xff7a3c, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
      m.position.copy(vec(lat, lon, 1.015)); m.userData = {w, ph:Math.random() * 6.28}; m.renderOrder = 102;
      spinG.add(m); this.hot.push(m);
    }
    // cooperation arcs between cities
    const cities = Object.values(P.CITIES).flat(); this.arcs = [];
    this.mkArc = () => {
      const a = cities[Math.floor(Math.random() * cities.length)];
      let b = a; while (b === a) b = cities[Math.floor(Math.random() * cities.length)];
      const A = vec(a[0], a[1]), B = vec(b[0], b[1]), ang = A.angleTo(B); if (ang < .3) return null;
      const mid = A.clone().add(B).normalize().multiplyScalar(1 + ang * .22);
      const pts = new THREE.QuadraticBezierCurve3(A.multiplyScalar(1.01), mid, B.multiplyScalar(1.01)).getPoints(64), g = new THREE.BufferGeometry().setFromPoints(pts);
      g.setAttribute("t", new THREE.BufferAttribute(new Float32Array(pts.map((_, i) => i / (pts.length - 1))), 1));
      const u = {head:{value:0}, color:{value:new THREE.Color(Math.random() < .5 ? 0x4fd1c5 : 0x5fd39a)}};
      const line = new THREE.Line(g, new THREE.ShaderMaterial({uniforms:u, vertexShader:ARC_VS, fragmentShader:ARC_FS, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
      line.renderOrder = 102; line.frustumCulled = false; spinG.add(line);
      return {line, u, t:0, speed:.25 + Math.random() * .2};
    };
    for (let i = 0; i < (low ? 4 : 7); i++){ const a = this.mkArc(); if (a){ a.t = Math.random() * 1.4; this.arcs.push(a); } }
    root.traverse(o => { o.frustumCulled = false; });
    this.spin = (-90 - 100) * DEG; this.vel = 0; this.tiltX = 12 * DEG; this.drag = null; this.fly = null;
    if (P._loaderLon != null){ this.spin = (-90 - P._loaderLon) * DEG; P._loaderLon = null; }   // 3.5: carry on from the loading screen's Earth
    R.add3DRendererObject(root); this.place();
  },
  /* where the globe sits: right of the menu panel on wide screens, centred on narrow ones (like web/src/ui/menu.jsx) */
  place(){
    const dw = Kit.W || 1920, H = Kit.H || 1080, wide = dw >= H * 1.25;   // screen size in design units
    // right edge of the menu panel (64-menu.js; wider for the shop / achievements pages), eased so the globe glides aside
    const want = (P.Screens && P.Screens.menuPanelRight) || 530;
    this.panel = this.panel == null ? want : this.panel + (want - this.panel) * .15; const panel = this.panel;
    const cx = wide ? (panel + dw) / 2 : dw / 2, cy = wide ? H / 2 : H * .3;
    let r = wide ? Math.min(H * .42, (dw - panel) * .44) : Math.min(dw * .42, H * .26);
    if (this.fly) r *= this.fly.r;
    const a = Map.toWorldFromScreen(cx, cy), b = Map.toWorldFromScreen(cx, cy + r), R = Math.max(10, Math.abs(b[1] - a[1]));
    this.root.position.set(a[0], a[1], 0); this.root.scale.set(R, -R, R);   // −R: undo the layer's y flip
    this.screen = {cx, cy, r};
  },
  /* fly down toward a place before the game starts (web: Globe.zoomTo) */
  zoomTo(lat, lon, done, ms = 1300){
    let target = -90 * DEG - lon * DEG;
    while (target - this.spin > Math.PI) target -= Math.PI * 2; while (target - this.spin < -Math.PI) target += Math.PI * 2;
    this.fly = {t0:performance.now(), ms, s0:this.spin, s1:target, x0:this.tiltX, x1:lat * DEG, r:1, done};
  },
  frame(dt){
    if (!this.root) return;
    const now = performance.now() / 1000, m = Kit.mouse;
    if (this.fly){
      const f = this.fly, p = Math.min(1, (performance.now() - f.t0) / f.ms), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      this.spin = f.s0 + (f.s1 - f.s0) * e; this.tiltX = f.x0 + (f.x1 - f.x0) * e; f.r = 1 + e * 1.6;
      if (p >= 1){ const d = f.done; f.done = null; if (d) d(); }
    } else {
      // drag on the globe (not on the menu) to spin it
      const s = this.screen, over = s && Math.hypot(m.x - s.cx, m.y - s.cy) < s.r * 1.1;
      if (m.down && !m.onUI && (this.drag || over)){
        if (this.drag){ const k = 2.6 / Math.max(300, s.r * 2.2), dx = m.x - this.drag.x, dy = m.y - this.drag.y;
          this.spin += dx * k; this.tiltX = clamp(this.tiltX + dy * k, -50 * DEG, 50 * DEG); this.vel = dx * k * Math.min(1, dt * 60); }
        this.drag = {x:m.x, y:m.y};
      } else this.drag = null;
      if (!this.drag){ this.vel *= .95; this.spin += this.vel + dt * .045; this.tiltX += (12 * DEG - this.tiltX) * dt * .4; }
    }
    this.spinG.rotation.y = this.spin; this.tilt.rotation.x = this.tiltX;
    this.cloudU.shift.value = (now * .0016) % 1;
    this.uni.heat.value = S.regions ? clamp((S.temp - 1.2) / 1.6, 0, 1) : 0;
    for (const h of this.hot){ const s = (.028 + Math.sqrt(h.userData.w) * .022) * (1 + .25 * Math.sin(now * 2 + h.userData.ph)); h.scale.set(s, s, 1); }
    for (let i = 0; i < this.arcs.length; i++){
      const a = this.arcs[i]; a.t += dt * a.speed; a.u.head.value = a.t;
      if (a.t > 1.6){ this.spinG.remove(a.line); a.line.geometry.dispose(); a.line.material.dispose(); const n = this.mkArc(); if (n) this.arcs[i] = n; else a.t = 0; }
    }
    this.place();
  },
};

/* ---------------------------------------------------------------- hooks into the map */
const MAP_KINDS = ["Ocean", "MapRim", "ArcticIce", "Region", "RegionLine", "Plume"];
const _init = Map.init;
Map.init = function(scene, mode){
  Photo.mesh = null; Globe.root = null; Ice.mesh = null;
  _init.call(this, scene, mode);
  if (!this.R3) return;
  try {
    if (mode === "menu"){ Globe.build(this.R3); this.globe = Globe; }
    else { Photo.build(this.R3); try { Ice.build(this.R3); } catch(e){ console.warn("ice", e); Ice.mesh = null; } this.globe = null; }
  } catch(e){ console.warn("earth", e); Photo.mesh = null; Globe.root = null; this.globe = null; }
  this.refresh();
};
const _refresh = Map.refresh;
Map.refresh = function(){
  _refresh.call(this);
  if (!this.scene) return;
  if (Globe.root){   // menu: the 3D Earth replaces the flat map
    for (const kind of MAP_KINDS) for (const o of this.scene.getObjects(kind) || []) o.hide(true);
    return;
  }
  if (!Photo.mesh || !S.regions) return;
  Photo.setTheme();
  // the regions become a light heat tint over the photo (web: alpha .2, night .18, paint .26)
  const th = Photo.theme, a = th === "night" ? .18 : th === "paint" ? .26 : .2;
  const sel = this.mode === "game" ? S.sel : null;
  for (const r of S.regions){
    const col = P.heatRGB(P.regionHeatValue(r)), tm = Photo.tints && Photo.tints[r.id], o = this.regions[r.id];
    if (tm){ tm.material.color.setRGB(col[0] / 255, col[1] / 255, col[2] / 255, THREE.SRGBColorSpace); tm.material.opacity = sel === r.id ? a + .12 : a; }
    if (o){ o.setColor(col.join(";")); o.setOpacity(tm ? 0 : Math.round(a * 255)); }   // the sprite stays for game logic only
  }
  if (this.ice) this.ice.hide(true);   // the photo already shows the ice
  if (Ice.mesh){ Ice.tone(th === "night"); if (this.rim) this.rim.hide(true); }   // 3.5: the ice round the map replaces the glowing rim
};
const _update = Map.update;
Map.update = function(dt){
  _update.call(this, dt);
  if (Globe.root) Globe.frame(dt);
  // borders always show a little over the photo, stronger when zoomed in (web: bAlpha)
  if (Photo.mesh && this.borders3) this.borders3.material.opacity = .62 * clamp((this.cam.z - .95) / .7, .3, 1);
};
/* leaving the menu for the game: the Earth turns to Southeast Asia and comes closer first (like the website) */
if (P.Screens && P.Screens.goScene){
  const _go = P.Screens.goScene;
  P.Screens.goScene = function(name){
    if (name === "Game" && Globe.root && Map.mode === "menu" && !Globe.fly && !(P.Gfx && P.Gfx.level === "low")){
      Globe.zoomTo(13.7, 100.5, () => _go.call(this, name), 1100); return;
    }
    return _go.call(this, name);
  };
}
P.Earth = {Photo, Globe};
