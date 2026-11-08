const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.traffic) return;
(P.mods = P.mods || {}).traffic = 1;
/* =========================================================================
   Traffic · 3.x — planes and ships as small 3D models on the 3D map layer (Plague Inc style)
   Same routes and amounts as the website (P.AIR, P.LANES, P.trafficLevels from the shared engine):
   planes climb, cruise and land with a shadow on the ground; ships sail the real sea lanes with a wake;
   a grey trail is carbon, a green one is clean fuel. Closed chokepoints send ships round Africa.
   ========================================================================= */
const {S, Map, toWorld, countryPoint} = P;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MAPW = 1920;
const QTY = {air:9, box:4, oil:3, ore:4};
const OIL_LANES = ["gulfAsia", "gulfEu", "gulfInd", "rusChn"], ORE_LANES = ["chileChn", "ausChn", "braChn", "codChn", "idnChn", "perChn"], BOX_LANES = ["asiaEu", "transPac", "transAtl", "panama"];

/* ---------- routes ---------- */
function resample(pts){ const seg = [0]; for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return {pts, seg, len:seg[seg.length - 1]}; }
function at(path, f){
  const d = clamp(f, 0, 1) * path.len, s = path.seg; let i = 1; while (i < s.length - 1 && s[i] < d) i++;
  const a = path.pts[i - 1], b = path.pts[i], k = (d - s[i - 1]) / Math.max(1e-6, s[i] - s[i - 1]);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}
const cache = new window.Map();
function lanePath(id){
  if (cache.has(id)) return cache.get(id);
  const out = []; let prev = null;
  for (const [lat, lon] of P.LANES[id].pts){
    let [x, y] = toWorld(lat, ((lon + 180) % 360 + 360) % 360 - 180);
    if (prev){ while (x - prev[0] > MAPW / 2) x -= MAPW; while (prev[0] - x > MAPW / 2) x += MAPW; }
    out.push([x, y]); prev = [x, y];
  }
  const r = resample(out); cache.set(id, r); return r;
}
function airPath(a, b){
  const key = a + ">" + b; if (cache.has(key)) return cache.get(key);
  const pa = countryPoint(a), pb0 = countryPoint(b); if (!pa || !pb0) return null;
  const pb = pb0.slice(); if (pb[0] - pa[0] > MAPW / 2) pb[0] -= MAPW; else if (pa[0] - pb[0] > MAPW / 2) pb[0] += MAPW;
  const dist = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]), cx = (pa[0] + pb[0]) / 2, cy = (pa[1] + pb[1]) / 2 - dist * .22;   // bowed toward the pole, like a great circle
  const pts = []; for (let i = 0; i <= 24; i++){ const u = i / 24; pts.push([(1 - u) * (1 - u) * pa[0] + 2 * u * (1 - u) * cx + u * u * pb[0], (1 - u) * (1 - u) * pa[1] + 2 * u * (1 - u) * cy + u * u * pb[1]]); }
  const r = resample(pts); cache.set(key, r); return r;
}

/* ---------- models (built once, cloned) — x = forward, z = up; GDevelop's 3D group flips y ---------- */
let MODELS = null;
function models(){
  if (MODELS) return MODELS;
  const mat = (c, o = {}) => new THREE.MeshLambertMaterial({color:c, transparent:true, opacity:1, ...o});   // transparent so they draw after the map planes (three.js draws opaque things first)
  const white = mat(0xf4f7f9), grey = mat(0x7d8c96), teal = mat(0x3aa6a0), green = mat(0x3fbf86);
  const plane = clean => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.9, .7, 13, 10), white); body.rotation.z = Math.PI / 2; g.add(body);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.9, 10, 8), white); nose.position.x = 6.5; nose.scale.set(1.6, 1, 1); g.add(nose);
    const wingShape = new THREE.Shape(); wingShape.moveTo(2, 0); wingShape.lineTo(-2.5, 8.5); wingShape.lineTo(-4, 8.5); wingShape.lineTo(-2, 0); wingShape.lineTo(-4, -8.5); wingShape.lineTo(-2.5, -8.5); wingShape.closePath();
    const wing = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape, {depth:.3, bevelEnabled:false}), white); wing.position.z = -.3; g.add(wing);
    const tail = new THREE.Shape(); tail.moveTo(-4.5, 0); tail.lineTo(-6.5, 3.4); tail.lineTo(-7.3, 3.4); tail.lineTo(-6.8, 0); tail.lineTo(-7.3, -3.4); tail.lineTo(-6.5, -3.4); tail.closePath();
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(tail, {depth:.2, bevelEnabled:false}), white));
    const fin = new THREE.Mesh(new THREE.BoxGeometry(2.4, .25, 2.6), clean ? green : teal); fin.position.set(-5.8, 0, 1.4); g.add(fin);
    for (const y of [-3.6, 3.6]){ const e = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 2, 8), grey); e.rotation.z = Math.PI / 2; e.position.set(.2, y, -.6); g.add(e); }
    return g;
  };
  const ship = (kind, clean) => {
    const g = new THREE.Group();
    const hullCol = kind === "oil" ? 0xa3392f : kind === "ore" ? 0x7c5b45 : 0x2f5d84;
    const hs = new THREE.Shape(); hs.moveTo(9, 0); hs.quadraticCurveTo(7, -2.2, 4.5, -2.2); hs.lineTo(-8, -2.2); hs.lineTo(-8, 2.2); hs.lineTo(4.5, 2.2); hs.quadraticCurveTo(7, 2.2, 9, 0);
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(hs, {depth:1.4, bevelEnabled:false}), mat(hullCol)));
    const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 3.6, .2), mat(0x9aa6ae)); deck.position.set(-.5, 0, 1.5); g.add(deck);
    if (kind === "box"){
      const cols = [0xe8743b, 0x3fb4ac, 0xe9b949, 0xd8483c, 0x5b7fb5, 0xf0f0f0];
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++){ const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, .9), mat(cols[(i * 3 + j * 5 + k) % cols.length])); c.position.set(-4.6 + i * 1.75, -.8 + j * 1.6, 2.05 + k * .95); g.add(c); }
    } else if (kind === "oil"){
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 11, 6), grey); pipe.rotation.z = Math.PI / 2; pipe.position.set(-.5, 0, 1.9); g.add(pipe);
    } else {
      for (const x of [-3.5, 0, 3.5]){ const pile = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), mat(0xc0703a)); pile.scale.set(1, 1, .55); pile.position.set(x, 0, 1.6); g.add(pile); }
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 2.4), white); bridge.position.set(-6.6, 0, 2.8); g.add(bridge);
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 1.6, 8), mat(kind === "oil" ? 0x2a2a2a : 0xe05a3c)); funnel.rotation.x = Math.PI / 2; funnel.position.set(-7.4, 0, 4.6); g.add(funnel);
    if (clean) for (const x of [-2, 3]){ const sail = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.6, 6), mat(0xf4fbf8)); sail.position.set(x, 0, 4.5); g.add(sail); }
    return g;
  };
  const shadowOf = src => { const s = src.clone(true), m = new THREE.MeshBasicMaterial({color:0x00080e, transparent:true, opacity:.32, depthTest:false, depthWrite:false}); s.traverse(o => { if (o.isMesh) o.material = m; }); s.scale.z = .01; return s; };
  MODELS = {plane, ship, shadowOf};
  return MODELS;
}

/* ---------- the traffic itself ---------- */
const T = {
  list:[], R:null, lights:null,
  reset(){ this.list = []; this.R = null; this.lights = null; },
  init(R){
    this.reset(); this.R = R; if (!R) return;
    const amb = new THREE.AmbientLight(0xffffff, .55), sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(-.6, -.8, 1.6);   // sun from the north-west
    this.lights = [amb, sun]; R.add3DRendererObject(amb); R.add3DRendererObject(sun);
  },
  spawn(kind){
    const tl = P.trafficLevels(), R = Math.random;
    let v;
    if (kind === "air"){
      const [a, b] = P.AIR[Math.floor(R() * P.AIR.length)], fwd = R() < .5, path = airPath(fwd ? a : b, fwd ? b : a); if (!path) return null;
      v = {kind, path, f:0, dur:9 + R() * 6, clean:R() < tl.airClean};
    } else {
      const pool = kind === "oil" ? OIL_LANES : kind === "ore" ? ORE_LANES : BOX_LANES;
      let id = pool[Math.floor(R() * pool.length)];
      if (!P.laneOpen(id)){ if (id === "asiaEu") id = "asiaEuCape"; else return null; }
      v = {kind, lane:id, path:lanePath(id), rev:kind === "box" && R() < .5, f:0, dur:(kind === "ore" ? 34 : 30) + R() * 14, clean:R() < tl.seaClean};
    }
    const M = models();
    v.obj = kind === "air" ? M.plane(v.clean) : M.ship(kind, v.clean);
    v.shadow = M.shadowOf(v.obj);
    const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(14 * 3), 3));
    v.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({color:v.clean ? 0x5fd39a : kind === "air" ? 0xdce2e6 : 0xe1f0fa, transparent:true, opacity:v.clean ? .45 : .4, depthTest:false, depthWrite:false}));
    for (const o of [v.shadow, v.trail, v.obj]){ o.frustumCulled = false; o.traverse(x => { x.frustumCulled = false; }); this.R.add3DRendererObject(o); }
    v.shadow.renderOrder = 40; v.trail.renderOrder = 41; v.obj.traverse(x => { x.renderOrder = 42; });
    return v;
  },
  remove(v){ for (const o of [v.obj, v.shadow, v.trail]) this.R.remove3DRendererObject(o); },
  update(dt){
    if (!this.R || !S.regions || !P.trafficLevels || Map.mode !== "game") return;
    if (P.Gfx && P.Gfx.level === "low"){ if (this.list.length){ for (const v of this.list) this.remove(v); this.list = []; } return; }   // settings: low graphics
    const running = S.started && !S.over && S.speed > 0 && !(P.UIM && P.UIM.modalOpen && P.UIM.modalOpen());
    if (!running) dt = 0;
    const tl = P.trafficLevels(), want = {air:Math.round(QTY.air * tl.air), box:Math.round(QTY.box * tl.sea), oil:Math.round(QTY.oil * tl.oil), ore:Math.round(QTY.ore * tl.ore)};
    for (const k in want){ const have = this.list.filter(v => v.kind === k).length; if (have < want[k] && Math.random() < dt * .8){ const v = this.spawn(k); if (v){ v.f = this.list.length < 4 ? Math.random() * .6 : 0; this.list.push(v); } } }
    const z = Map.cam.z, size = clamp(.9 + .4 * Math.sqrt(z), 1.2, 1.7), cx = Map.cam.x;
    for (const v of this.list){
      v.f += dt / v.dur;
      if (v.kind !== "air" && v.lane && !P.laneOpen(v.lane) && v.lane !== "asiaEuCape") v.f = 1.01;   // a closed route: the ship turns back out of sight
      if (v.f >= 1) continue;
      const f = v.rev ? 1 - v.f : v.f, dir = v.rev ? -1 : 1, [x0, y] = at(v.path, f), [ax, ay] = at(v.path, clamp(f + dir * .004, 0, 1)), [bx, by] = at(v.path, clamp(f - dir * .004, 0, 1));
      // routes cross the date line: use the copy that is over the map (nearest the camera); none → hidden
      const cands = [0, -MAPW, MAPW].filter(o => x0 + o >= -4 && x0 + o <= MAPW + 4).sort((a, b) => Math.abs(cx - x0 - a) - Math.abs(cx - x0 - b));
      const show = cands.length > 0, ox = show ? cands[0] : 0, x = x0 + ox;
      v.obj.visible = v.shadow.visible = v.trail.visible = show; if (!show) continue;
      const ang = Math.atan2(ay - by, ax - bx);
      const air = v.kind === "air", alt = air ? Math.sin(Math.PI * clamp(v.f, 0, 1)) : 0, h = air ? 3 + 26 * alt : 0;
      v.obj.position.set(x, y, h); v.obj.rotation.set(0, 0, ang); v.obj.scale.setScalar(size);
      if (air) v.obj.rotation.x = Math.sin(v.f * 40) * .05;   // a little roll
      v.shadow.position.set(x + h * .35, y + h * .45, .05); v.shadow.rotation.set(0, 0, ang); v.shadow.scale.set(size, size, .01);
      v.shadow.traverse(o => { if (o.material) o.material.opacity = air ? .32 - .18 * alt : .3; });
      // trail: the last stretch of the route behind it
      const pos = v.trail.geometry.attributes.position, step = air ? .06 : .03;
      for (let i = 0; i < 14; i++){ const [tx, ty] = at(v.path, clamp(f - dir * step * i / 13, 0, 1)); const ta = air ? Math.sin(Math.PI * clamp(v.f - step * i / 13, 0, 1)) : 0; pos.setXYZ(i, tx + ox, ty, air ? 3 + 26 * ta : .3); }
      pos.needsUpdate = true;
    }
    for (const v of this.list) if (v.f >= 1) this.remove(v);
    this.list = this.list.filter(v => v.f < 1);
  },
};
P.Traffic = T;
const _init = Map.init; Map.init = function(scene, mode){ _init.call(this, scene, mode); T.init(this.R3); };
const _upd = Map.update; Map.update = function(dt){ _upd.call(this, dt); T.update(dt); };
