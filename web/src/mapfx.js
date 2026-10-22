/* Map overlay extras (version 1.0):
   · builds pinned on the map (wind turbines, solar farms, reactors, forests, …), under construction until the skill rolls out
   · traffic: planes, container ships, tankers and ore carriers on real routes; trails show carbon, a leaf shows green technology
   Everything here is drawn on the "fx" canvas in screen pixels; positions come from map units (Robinson). */
import {P, S, L, t, COL} from "./core.js";
import {MAP, ll} from "./geo.js";
import {Gfx} from "./gfx.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

/* ---------- seeded random (stable positions for each pin) ---------- */
const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

/* ---------- 3D icon images for the canvas ---------- */
const imgs = new Map();
export function img3d(name){
  let im = imgs.get(name);
  if (!im){ im = new Image(); im.src = `assets/img/ui/3d/${name}.webp`; imgs.set(name, im); }
  return im.complete && im.naturalWidth ? im : null;
}

/* ---------- where a pin goes: a random point well inside the country (largest piece of it) ---------- */
const pinPos = new Map();
function biggestShape(M, cid){
  const list = M.shapes.filter(s => s.c === cid); if (!list.length) return null;
  return list.reduce((a, b) => ((b.b[2] - b.b[0]) * (b.b[3] - b.b[1]) > (a.b[2] - a.b[0]) * (a.b[3] - a.b[1]) ? b : a));
}
function placePin(M, p){
  if (p.xy) return p.xy;   // placed by hand on the hex grid (Continuous World)
  if (pinPos.has(p.id)) return pinPos.get(p.id);
  const sh = biggestShape(M, p.c); let pos = null;
  if (sh){
    const r = rng(p.sd), ctx = M.bctx, w = sh.b[2] - sh.b[0], h = sh.b[3] - sh.b[1], m = Math.min(w, h) * .08;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < 80 && !pos; i++){
      const x = sh.b[0] + w * (.1 + .8 * r()), y = sh.b[1] + h * (.1 + .8 * r());
      if (ctx.isPointInPath(sh.path, x, y, "evenodd") && ctx.isPointInPath(sh.path, x + m, y, "evenodd") && ctx.isPointInPath(sh.path, x - m, y, "evenodd") && ctx.isPointInPath(sh.path, x, y + m, "evenodd") && ctx.isPointInPath(sh.path, x, y - m, "evenodd")) pos = [x, y];
    }
    ctx.restore();
    if (!pos) pos = sh.l;
  }
  pinPos.set(p.id, pos);
  return pos;
}

/* ---------- little drawings for each kind of build ---------- */
const KIND = {
  wind:{col:"#e8f4f8", name:{th:"ฟาร์มกังหันลม", en:"Wind farm"}}, solar:{col:"#4aa3ff", name:{th:"โซลาร์ฟาร์ม", en:"Solar farm"}},
  floatsolar:{col:"#4aa3ff", name:{th:"โซลาร์ลอยน้ำ", en:"Floating solar"}}, nuclear:{col:"#c8d2d8", name:{th:"โรงไฟฟ้านิวเคลียร์ขนาดเล็ก", en:"Small reactor"}},
  fusion:{col:"#c3a6ff", name:{th:"โรงไฟฟ้าฟิวชัน", en:"Fusion plant"}}, battery:{col:"#5fd39a", name:{th:"แบตเตอรี่กักเก็บไฟ", en:"Grid battery"}},
  grid:{col:"#f2c14e", name:{th:"โครงข่ายไฟฟ้าอัจฉริยะ", en:"Smart grid"}, icon:"utility-pole"}, geo:{col:"#ff9a5c", name:{th:"โรงไฟฟ้าความร้อนใต้พิภพ", en:"Geothermal plant"}, icon:"flame-kindling"},
  h2:{col:"#8fd0ff", name:{th:"โรงงานไฮโดรเจนเขียว", en:"Green hydrogen plant"}, icon:"atom"}, steel:{col:"#b7c7cf", name:{th:"โรงเหล็กคาร์บอนต่ำ", en:"Low-carbon steelworks"}, icon:"anvil"},
  rail:{col:"#f2c14e", name:{th:"รถไฟความเร็วสูง", en:"High-speed rail"}, icon:"train-front"}, ev:{col:"#5fd39a", name:{th:"รถไฟฟ้าทั้งเมือง", en:"Electric transport"}, icon:"car"},
  recycle:{col:"#5fd39a", name:{th:"โรงรีไซเคิล", en:"Recycling plant"}, icon:"recycle"}, dac:{col:"#8fd0ff", name:{th:"โรงดักจับคาร์บอนจากอากาศ", en:"Direct air capture"}, icon:"fan"},
  forest:{col:"#2fbf6a", name:{th:"ป่าปลูกใหม่", en:"New forest"}}, mangrove:{col:"#2fbf6a", name:{th:"ป่าชายเลน", en:"Mangroves"}},
  farm:{col:"#a3d977", name:{th:"เกษตรฟื้นฟูดิน", en:"Regenerative farms"}, icon:"wheat"}, rice:{col:"#a3d977", name:{th:"นาข้าวปล่อยมีเทนต่ำ", en:"Low-methane rice"}, icon:"sprout"},
  biochar:{col:"#8a6a4a", name:{th:"ไบโอชาร์", en:"Biochar"}, icon:"shovel"}, ocean:{col:"#4fd1c5", name:{th:"เติมแร่ธาตุในมหาสมุทร", en:"Ocean minerals"}, icon:"waves"},
  sponge:{col:"#8fd0ff", name:{th:"เมืองฟองน้ำ", en:"Sponge city"}, icon:"droplets"}, seawall:{col:"#4fd1c5", name:{th:"ประตูกั้นน้ำเค็ม", en:"Saltwater barrier"}, icon:"brick-wall"},
  city:{col:"#4fd1c5", name:{th:"เมืองทนภัย", en:"Resilient city"}, icon:"building-2"}, building:{col:"#4fd1c5", name:{th:"อาคาร Net-Zero", en:"Net-Zero buildings"}, icon:"building"},
  saf:{col:"#5fd39a", name:{th:"โรงกลั่นเชื้อเพลิงอากาศยานยั่งยืน", en:"Sustainable jet fuel"}, icon:"plane"}, mine:{col:"#ff9a3c", name:{th:"เหมืองและโรงแยกแร่", en:"Mine & refinery"}, icon:"pickaxe"},
};
P.KIND_NAME = Object.fromEntries(Object.entries(KIND).map(([k, v]) => [k, v.name]));
export const kindName = k => L((KIND[k] || {}).name || {th:k, en:k});

function drawWind(c, x, y, s, now, sd){
  c.strokeStyle = "#eef6f8"; c.lineWidth = Math.max(1.2, s * .09); c.lineCap = "round";
  c.beginPath(); c.moveTo(x, y + s * .55); c.lineTo(x, y - s * .2); c.stroke();
  const a0 = now * 2.6 + sd;
  for (let i = 0; i < 3; i++){ const a = a0 + i * TAU / 3; c.beginPath(); c.moveTo(x, y - s * .2); c.lineTo(x + Math.cos(a) * s * .5, y - s * .2 + Math.sin(a) * s * .5); c.stroke(); }
  c.fillStyle = "#ffffff"; c.beginPath(); c.arc(x, y - s * .2, s * .07, 0, TAU); c.fill();
}
function drawSolar(c, x, y, s, now, floating){
  if (floating){ c.fillStyle = "rgba(79,170,255,.25)"; c.beginPath(); c.ellipse(x, y + s * .28, s * .62, s * .18, 0, 0, TAU); c.fill(); }
  c.save(); c.translate(x, y); c.transform(1, 0, -.35, 1, 0, 0);
  c.fillStyle = "#1f5fae"; c.fillRect(-s * .45, -s * .22, s * .9, s * .44);
  c.strokeStyle = "rgba(190,225,255,.85)"; c.lineWidth = 1; c.strokeRect(-s * .45, -s * .22, s * .9, s * .44);
  c.beginPath(); for (let i = 1; i < 3; i++){ c.moveTo(-s * .45 + s * .3 * i, -s * .22); c.lineTo(-s * .45 + s * .3 * i, s * .22); } c.moveTo(-s * .45, 0); c.lineTo(s * .45, 0); c.stroke();
  const g = (Math.sin(now * 1.3 + x * .01) + 1) / 2; c.fillStyle = `rgba(255,255,255,${.15 + .35 * g})`; c.fillRect(-s * .45 + s * .6 * g, -s * .22, s * .14, s * .44);
  c.restore();
}
function drawNuclear(c, x, y, s, now, fusion){
  if (fusion){ c.strokeStyle = "#c3a6ff"; c.lineWidth = s * .14; c.beginPath(); c.ellipse(x, y, s * .42, s * .2, 0, 0, TAU); c.stroke(); c.fillStyle = `rgba(195,166,255,${.5 + .3 * Math.sin(now * 4)})`; c.beginPath(); c.arc(x, y, s * .12, 0, TAU); c.fill(); return; }
  c.fillStyle = "#c8d2d8"; c.beginPath(); c.moveTo(x - s * .32, y + s * .4); c.quadraticCurveTo(x - s * .16, y, x - s * .24, y - s * .3); c.lineTo(x + s * .24, y - s * .3); c.quadraticCurveTo(x + s * .16, y, x + s * .32, y + s * .4); c.closePath(); c.fill();
  for (let i = 0; i < 3; i++){ const q = (now * .5 + i / 3) % 1; c.fillStyle = `rgba(240,248,255,${.55 * (1 - q)})`; c.beginPath(); c.arc(x + Math.sin(q * 5 + i) * s * .08, y - s * .35 - q * s * .55, s * (.12 + q * .14), 0, TAU); c.fill(); }
}
function drawTrees(c, x, y, s, water){
  if (water){ c.fillStyle = "rgba(79,170,255,.3)"; c.beginPath(); c.ellipse(x, y + s * .32, s * .55, s * .14, 0, 0, TAU); c.fill(); }
  [[-.25, .05, .26, "#1e9a50"], [.22, .08, .24, "#168a43"], [0, -.15, .3, "#2fbf6a"]].forEach(([dx, dy, r, col]) => {
    c.fillStyle = "#6b4a2b"; c.fillRect(x + dx * s - s * .03, y + dy * s + r * s * .6, s * .06, s * .2);
    c.fillStyle = col; c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill();
  });
}
function drawBattery(c, x, y, s, now){
  c.fillStyle = "#123a2a"; c.strokeStyle = "#5fd39a"; c.lineWidth = 1.5;
  c.beginPath(); c.roundRect(x - s * .4, y - s * .22, s * .8, s * .44, s * .08); c.fill(); c.stroke();
  const f = (Math.sin(now * 1.5) + 1) / 2 * .8 + .2; c.fillStyle = "#5fd39a"; c.fillRect(x - s * .34, y - s * .16, s * .68 * f, s * .32);
  c.fillRect(x + s * .4, y - s * .08, s * .07, s * .16);
}
function drawBadge(M, c, x, y, s, k){
  const K = KIND[k] || {col:COL.accent, icon:"circle"};
  c.fillStyle = "rgba(6,16,21,.85)"; c.beginPath(); c.arc(x, y, s * .48, 0, TAU); c.fill();
  c.strokeStyle = K.col; c.lineWidth = 1.6; c.stroke();
  const im = M.iconImg(K.icon || "circle", K.col); if (im) c.drawImage(im, x - s * .3, y - s * .3, s * .6, s * .6);
}
function drawBuilding(c, x, y, s, prog, now){
  // a crane and a progress ring while it is being built
  c.strokeStyle = "#f2c14e"; c.lineWidth = Math.max(1.2, s * .08); c.lineCap = "round";
  c.beginPath(); c.moveTo(x - s * .2, y + s * .45); c.lineTo(x - s * .2, y - s * .4); c.lineTo(x + s * .4, y - s * .4); c.stroke();
  const sw = Math.sin(now * 1.6) * s * .05; c.beginPath(); c.moveTo(x + s * .3 + sw, y - s * .4); c.lineTo(x + s * .3 + sw, y - s * .05); c.stroke();
  c.fillStyle = "#f2c14e"; c.fillRect(x + s * .22 + sw, y - s * .07, s * .16, s * .12);
  c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, s * .62, 0, TAU); c.stroke();
  c.strokeStyle = "#f2c14e"; c.beginPath(); c.arc(x, y, s * .62, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(prog, 0, 1)); c.stroke();
}

/* ---------- pins: called from drawFx ---------- */
/* Continuous World: home base (gold) and ambassadors (flags) */
function drawBases(M, c, vis){
  if (!S.world || !M.shapes.length) return;
  const mark = (id, kind) => {
    const pt = M.countryPoint(id); if (!pt) return;
    const [x, y0] = M.toScreen(pt[0], pt[1]), y = y0 - 26; if (!vis(x, y, 30)) return;
    c.save(); c.translate(x, y);
    if (kind === "hq"){
      c.fillStyle = "rgba(6,16,21,.85)"; c.strokeStyle = "#f2c14e"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = "#f2c14e"; c.beginPath(); for (let i = 0; i < 10; i++){ const r = i % 2 ? 3.2 : 7.2, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill();
    } else {
      c.strokeStyle = "#e6f0ee"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4, 9); c.lineTo(-4, -9); c.stroke();
      c.fillStyle = "#4fd1c5"; c.beginPath(); c.moveTo(-4, -9); c.lineTo(8, -5); c.lineTo(-4, -1); c.closePath(); c.fill();
    }
    c.restore();
    M.hits.push({id:"base-" + kind + id, x:x - 12, y:y - 12, w:24, h:24, fn:() => { M.info = {x, y:y - 14, t:performance.now(), txt:`${P.L(kind === "hq" ? P.W2.hqHere : P.W2.ambHere)} · ${P.cname(id)}`}; }});
  };
  (S.amb || []).forEach(id => mark(id, "amb"));
  if (S.hq) mark(S.hq, "hq");
}
export function drawPins(M, c, now, vis){
  drawBases(M, c, vis);
  const pins = S.pins; if (!pins || !pins.length || !M.shapes.length) return;
  const z = M.cam.z, s = clamp(9 + 6 * Math.sqrt(z), 13, 30), far = z < 1.3, seen = new Set();
  for (const p of pins){
    if (far){ const key = p.c + p.k; if (seen.has(key)) continue; seen.add(key); }
    const pos = placePin(M, p); if (!pos) continue;
    const [x, y] = M.toScreen(pos[0], pos[1]); if (!vis(x, y, 30)) continue;
    const sd = p.sd % 100;
    if (!p.done){ drawBuilding(c, x, y, s, P.rollProgress(p.sk) ?? 1, now); }
    else if (p.k === "wind") drawWind(c, x, y, s, now, sd);
    else if (p.k === "solar" || p.k === "floatsolar") drawSolar(c, x, y, s, now, p.k === "floatsolar");
    else if (p.k === "nuclear" || p.k === "fusion") drawNuclear(c, x, y, s, now, p.k === "fusion");
    else if (p.k === "forest" || p.k === "mangrove") drawTrees(c, x, y, s, p.k === "mangrove");
    else if (p.k === "battery") drawBattery(c, x, y, s, now);
    else drawBadge(M, c, x, y, s, p.k);
    M.hits.push({id:"pin-" + p.id, x:x - s * .5, y:y - s * .5, w:s, h:s, fn:() => { M.info = {x, y:y - s * .6, t:performance.now(), txt:`${kindName(p.k)} · ${P.cname(p.c)}${p.done ? "" : " · " + t("building")}`}; }});
  }
}

/* ---------- traffic ---------- */
/* a route in map units, unwrapped so it never jumps across the map edge (drawn again one map-width left/right) */
function unwrap(pts){
  const out = []; let prev = null;
  for (const [lat, lon] of pts){
    const lonN = ((lon + 180) % 360 + 360) % 360 - 180;
    let [x, y] = ll(lat, lonN);
    if (prev){ while (x - prev[0] > MAP.W / 2) x -= MAP.W; while (prev[0] - x > MAP.W / 2) x += MAP.W; }
    out.push([x, y]); prev = [x, y];
  }
  return out;
}
function resample(pts){
  const seg = [0]; for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return {pts, seg, len:seg[seg.length - 1]};
}
function at(path, f){
  const d = clamp(f, 0, 1) * path.len, s = path.seg; let i = 1; while (i < s.length - 1 && s[i] < d) i++;
  const a = path.pts[i - 1], b = path.pts[i], k = (d - s[i - 1]) / Math.max(1e-6, s[i] - s[i - 1]);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])];
}
const routeCache = new Map();
function airPath(M, a, b){
  const key = "air:" + a + b; if (routeCache.has(key)) return routeCache.get(key);
  const pa = M.countryPoint(a), pb0 = M.countryPoint(b); if (!pa || !pb0) return null;
  let pb = pb0.slice(); if (pb[0] - pa[0] > MAP.W / 2) pb[0] -= MAP.W; else if (pa[0] - pb[0] > MAP.W / 2) pb[0] += MAP.W;
  const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2, dist = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
  const cx = mx, cy = my - dist * .22;   // bow the route towards the pole, like a great circle on this map
  const pts = []; for (let i = 0; i <= 24; i++){ const u = i / 24; pts.push([(1 - u) * (1 - u) * pa[0] + 2 * u * (1 - u) * cx + u * u * pb[0], (1 - u) * (1 - u) * pa[1] + 2 * u * (1 - u) * cy + u * u * pb[1]]); }
  const r = resample(pts); routeCache.set(key, r); return r;
}
function lanePath(id){
  const key = "sea:" + id; if (routeCache.has(key)) return routeCache.get(key);
  const r = resample(unwrap(P.LANES[id].pts)); routeCache.set(key, r); return r;
}
const OIL_LANES = ["gulfAsia", "gulfEu", "gulfInd", "rusChn"], ORE_LANES = ["chileChn", "ausChn", "braChn", "codChn", "idnChn", "perChn"], BOX_LANES = ["asiaEu", "transPac", "transAtl", "panama"];
const QTY = {low:{air:5, box:3, oil:2, ore:2}, medium:{air:9, box:4, oil:3, ore:4}, high:{air:14, box:6, oil:4, ore:6}};

function spawn(M, kind){
  const tl = P.trafficLevels(), R = Math.random;
  if (kind === "air"){
    const [a, b] = P.AIR[Math.floor(R() * P.AIR.length)], fwd = R() < .5, path = airPath(M, fwd ? a : b, fwd ? b : a); if (!path) return null;
    return {kind, from:fwd ? a : b, to:fwd ? b : a, path, f:0, dur:9 + R() * 6, clean:R() < tl.airClean};
  }
  const pool = kind === "oil" ? OIL_LANES : kind === "ore" ? ORE_LANES : BOX_LANES;
  let id = pool[Math.floor(R() * pool.length)];
  if (!P.laneOpen(id)){ if (id === "asiaEu") id = "asiaEuCape"; else return null; }
  const ln = P.LANES[id], fwd = kind === "box" ? R() < .5 : true;
  return {kind, lane:id, from:fwd ? ln.a : ln.b, to:fwd ? ln.b : ln.a, rev:!fwd, path:lanePath(id), f:0, dur:(kind === "ore" ? 34 : 30) + R() * 14, clean:R() < tl.seaClean, res:ln.res};
}
export function drawTraffic(M, c, dt, now, vis){
  if (!S.regions || !M.shapes.length || !P.trafficLevels) return;
  if (!P.running()) dt = 0;   // paused, an event open, a menu open: planes and ships stop where they are
  const tl = P.trafficLevels(), q = QTY[Gfx.level] || QTY.medium;
  const want = {air:Math.round(q.air * tl.air), box:Math.round(q.box * tl.sea), oil:Math.round(q.oil * tl.oil), ore:Math.round(q.ore * tl.ore)};
  const list = M.traffic = M.traffic || [];
  for (const k of Object.keys(want)){ const have = list.filter(v => v.kind === k).length; if (have < want[k] && Math.random() < dt * .8){ const v = spawn(M, k); if (v){ v.f = list.length < 4 ? Math.random() * .6 : 0; list.push(v); } } }
  const s = M.scale(), z = M.cam.z, size = clamp(5 + 2.2 * Math.sqrt(z), 6, 11), W = MAP.W * s;
  for (const v of list){
    v.f += dt / v.dur;
    if (v.kind !== "air" && v.lane && !P.laneOpen(v.lane) && v.lane !== "asiaEuCape") v.f = 1.01;   // a closed route: the ship turns back out of sight
    if (v.f >= 1){ if (v.kind === "air" || v.f < 1.01) arrive(M, v); continue; }
    const f = v.rev ? 1 - v.f : v.f, [wx, wy, ang0] = at(v.path, f), ang = v.rev ? ang0 + Math.PI : ang0;
    const [x0, y] = M.toScreen(wx, wy);
    for (const dx of [0, -W, W]){
      const x = x0 + dx; if (!vis(x, y, 30)) continue;
      const wxc = wx + (dx ? Math.sign(dx) * MAP.W : 0); if (wxc < -10 || wxc > MAP.W + 10) continue;   // only over the map itself, never in the empty space beside it
      // trail: grey smoke (carbon) or a faint green line (clean fuel)
      c.lineCap = "round"; c.lineWidth = v.kind === "air" ? 1.6 : 2.4;
      const n = 10, step = (v.kind === "air" ? .05 : .025);
      for (let i = 1; i <= n; i++){
        const fa = clamp(f - (v.rev ? -1 : 1) * step * (i - 1) / n * 2, 0, 1), fb = clamp(f - (v.rev ? -1 : 1) * step * i / n * 2, 0, 1);
        const [ax, ay] = at(v.path, fa), [bx, by] = at(v.path, fb), [sax, say] = M.toScreen(ax, ay), [sbx, sby] = M.toScreen(bx, by);
        const al = (1 - i / n) * (v.clean ? .35 : .5);
        c.strokeStyle = v.clean ? `rgba(95,211,154,${al})` : v.kind === "air" ? `rgba(200,200,200,${al})` : `rgba(225,240,250,${al * .9})`;
        c.beginPath(); c.moveTo(sax + dx, say); c.lineTo(sbx + dx, sby); c.stroke();
      }
      c.save(); c.translate(x, y); c.rotate(ang);
      if (v.kind === "air"){
        c.fillStyle = v.clean ? "#c8ffe0" : "#f4f8fa";
        c.beginPath(); c.moveTo(size * .9, 0); c.lineTo(-size * .6, -size * .12); c.lineTo(-size * .75, -size * .5); c.lineTo(-size * .9, -size * .5); c.lineTo(-size * .65, 0); c.lineTo(-size * .9, size * .5); c.lineTo(-size * .75, size * .5); c.lineTo(-size * .6, size * .12); c.closePath(); c.fill();
        c.fillRect(-size * .15, -size * .7, size * .22, size * 1.4);
      } else {
        const hull = v.kind === "oil" ? "#7a2a24" : v.kind === "ore" ? "#6b5040" : "#2b4a66";
        c.fillStyle = hull; c.beginPath(); c.moveTo(size * 1.05, 0); c.lineTo(size * .55, -size * .42); c.lineTo(-size * .95, -size * .42); c.lineTo(-size * .95, size * .42); c.lineTo(size * .55, size * .42); c.closePath(); c.fill();
        c.strokeStyle = "rgba(235,248,255,.85)"; c.lineWidth = 1.1; c.stroke();
        if (v.kind === "box"){ ["#f07a3c", "#4fd1c5", "#f2c14e", "#ff5a4a"].forEach((col, i) => { c.fillStyle = col; c.fillRect(-size * .7 + i * size * .32, -size * .22, size * .26, size * .44); }); }
        else if (v.kind === "ore"){ c.fillStyle = (P.RES[v.res] || {}).col || "#ff9a3c"; c.beginPath(); c.arc(-size * .1, 0, size * .22, 0, TAU); c.fill(); }
        else { c.fillStyle = "#c8c8c8"; c.fillRect(-size * .6, -size * .1, size * 1.1, size * .2); }
        if (v.clean){ c.fillStyle = "rgba(230,255,245,.9)"; c.beginPath(); c.moveTo(0, -size * .2); c.lineTo(0, -size * 1.1); c.lineTo(size * .45, -size * .3); c.closePath(); c.fill(); }
      }
      c.restore();
      // green technology on board: from a country that already uses it
      const from = P.C(v.from); if (from && from.green >= 45){ const im = M.iconImg("leaf", COL.good); if (im) c.drawImage(im, x - 5, y - size - 11, 10, 10); }
      if (z >= 1.15) M.hits.push({id:"veh", x:x - 8, y:y - 8, w:16, h:16, fn:() => { M.info = {x, y:y - 12, t:performance.now(), txt:vehText(v)}; }});
    }
  }
  M.traffic = list.filter(v => v.f < 1);
}
function arrive(M, v){
  const from = P.C(v.from); if (!from || from.green < 45) return;
  const pt = M.countryPoint(v.to); if (!pt) return;
  const [x, y] = M.toScreen(pt[0], pt[1]); M.burst(x, y, COL.good);
}
function vehText(v){
  const th = S.lang === "th", A = P.cname(v.from), B = P.cname(v.to);
  if (v.kind === "air") return `${th ? "เที่ยวบิน" : "Flight"} ${A} → ${B}${v.clean ? (th ? " · เชื้อเพลิงยั่งยืน" : " · clean fuel") : ""}`;
  if (v.kind === "oil") return `${th ? "เรือบรรทุกน้ำมัน" : "Oil tanker"} ${A} → ${B}`;
  if (v.kind === "ore") return `${th ? "เรือขน" : "Ore carrier:"} ${L((P.RES[v.res] || {name:{th:"แร่", en:"minerals"}}).name)} ${A} → ${B}`;
  return `${th ? "เรือสินค้า" : "Container ship"} ${A} → ${B}${v.lane === "asiaEuCape" ? (th ? " · อ้อมแอฟริกา" : " · round Africa") : ""}`;
}
/* tooltip for a tapped pin or vehicle */
export function drawInfo(M, c){
  const inf = M.info; if (!inf) return;
  const age = (performance.now() - inf.t) / 1000; if (age > 3.2){ M.info = null; return; }
  M.pill(clamp(inf.x, 90, M.w - 90), inf.y - 16, inf.txt, {h:22, bg:"rgba(6,16,21,.94)", stroke:COL.accent, font:"600 11.5px 'IBM Plex Sans Thai', sans-serif"});
}

/* ---------- 1.7: a more lived-in map ----------
   · capital cities (gold star; the name when zoomed in)
   · smokestacks at the big industrial hubs: they smoke as much as their continent still emits, and stop when it is clean
   · the sea chokepoints ships use (Suez, Bab el-Mandeb, Panama, Hormuz, Malacca), red when an event closes them
   All cheap: a few dozen small shapes per frame, and nothing at the "low" graphics level except the capitals. */
const CHOKE_PT = {suez:[30.6, 32.35], redsea:[12.6, 43.4], panama:[9.1, -79.7], hormuz:[26.6, 56.3], malacca:[2.6, 101.2]};
let capPts = null, hubPts = null, chokePts = null;
export function drawDetail(M, c, now, vis, iconImg){
  if (!S.regions) return;
  const z = M.cam.z, low = Gfx.level === "low", th = S.lang === "th";
  if (!capPts && P.CAPITALS) capPts = Object.entries(P.CAPITALS).map(([id, v]) => ({id, p:ll(v[0], v[1]), th:v[2], en:v[3]}));
  if (!hubPts) hubPts = Object.entries(P.CITIES).flatMap(([reg, list]) => list.map(([lat, lon, w, name], i) => ({reg, w, p:ll(lat, lon), ph:i * 1.7})));
  if (!chokePts) chokePts = Object.entries(CHOKE_PT).map(([k, v]) => ({k, p:ll(v[0], v[1])}));
  // smokestacks (from continent view)
  if (!low && z >= 1.25){
    const regs = {}; for (const r of S.regions) regs[r.id] = r;
    const s = clamp(10 + 6 * Math.sqrt(z), 18, 32);
    for (const h of hubPts){
      const [x, y] = M.toScreen(h.p[0], h.p[1]); if (!vis(x, y, 30)) continue;
      const r = regs[h.reg], k = clamp(r.co2 / r.co2_0, 0, 1.3), on = k > .22;
      const sx = x + 12, sy = y + 8;
      // a small factory: hall + two chimneys (dark outline so it reads on any ground)
      c.lineWidth = 1.6; c.strokeStyle = on ? "rgba(230,236,240,.85)" : "rgba(200,255,220,.9)"; c.fillStyle = on ? "#3c4349" : "#1f5a3c";
      c.beginPath(); c.rect(sx - s * .45, sy - s * .32, s * .7, s * .32); c.rect(sx - s * .05, sy - s * .95, s * .16, s * .63); c.rect(sx + s * .2, sy - s * .75, s * .13, s * .43); c.fill(); c.stroke();
      c.fillStyle = on ? "#c8402e" : "#3fae6a"; c.fillRect(sx - s * .05, sy - s * .95, s * .16, s * .1);
      if (on){ for (let i = 0; i < 4; i++){ const q = (now * .3 + i / 4 + h.ph) % 1, rr = s * (.12 + q * .38) * (.6 + Math.min(1, k) * .5);
        c.fillStyle = `rgba(120,116,112,${(1 - q) * .6 * Math.min(1, k + .2)})`; c.beginPath(); c.arc(sx + .03 * s + q * s * .8, sy - s * .98 - q * s * 1.5, rr, 0, TAU); c.fill(); } }
      else { const im = iconImg("leaf", COL.good); if (im) c.drawImage(im, sx - 2, sy - s * 1.45, 12, 12); }
      M.hits.push({id:"hub-" + h.reg + h.ph, x:sx - s * .5, y:sy - s, w:s, h:s, fn:() => { M.info = {x:sx, y:sy - s, t:performance.now(), txt:on ? (th ? `ย่านอุตสาหกรรม · ${L(P.RMETA[h.reg].name)} ยังปล่อย ${Math.round(k * 100)}% ของปี 2026` : `Industrial hub · ${L(P.RMETA[h.reg].name)} still emits ${Math.round(k * 100)}% of 2026`) : (th ? "ย่านอุตสาหกรรมสะอาดแล้ว" : "This industrial hub is clean now")}; }});
    }
  }
  // chokepoints
  if (!low && z >= 1.1){
    for (const q of chokePts){
      const [x, y] = M.toScreen(q.p[0], q.p[1]); if (!vis(x, y, 20)) continue;
      const closed = ((S.closed || {})[q.k] || 0) > 0, col = closed ? COL.bad : "#8fd0ff";
      c.fillStyle = "rgba(6,16,21,.8)"; c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill(); c.lineWidth = 1.5; c.strokeStyle = col; c.stroke();
      const im = iconImg(closed ? "x" : "anchor", col); if (im) c.drawImage(im, x - 6, y - 6, 12, 12);
      if (closed || z >= 2.2){ const nm = L(P.CHOKE[q.k]); c.font = "600 10px 'IBM Plex Sans Thai', sans-serif"; c.fillStyle = col; c.textAlign = "center"; c.fillText(nm, x, y + 19); c.textAlign = "left"; }
      M.hits.push({id:"ck-" + q.k, x:x - 10, y:y - 10, w:20, h:20, fn:() => { M.info = {x, y:y - 12, t:performance.now(), txt:`${L(P.CHOKE[q.k])}${closed ? " · " + (th ? "ปิดอยู่" : "closed") : ""}`}; }});
    }
  }
  // capitals (country view)
  if (capPts && z >= 1.55){
    const names = z >= 2.5;
    c.font = "500 10px 'IBM Plex Sans Thai', sans-serif"; c.textBaseline = "middle";
    for (const q of capPts){
      const [x, y] = M.toScreen(q.p[0], q.p[1]); if (!vis(x, y, 10)) continue;
      c.fillStyle = "rgba(6,16,21,.75)"; c.beginPath(); c.arc(x, y, 4.2, 0, TAU); c.fill();
      c.fillStyle = COL.gold; star(c, x, y, 3.6);
      if (names){ const nm = th ? q.th : q.en; c.lineWidth = 3; c.strokeStyle = "rgba(6,16,21,.8)"; c.strokeText(nm, x + 7, y); c.fillStyle = "#f3e2b0"; c.fillText(nm, x + 7, y); }
    }
    c.textBaseline = "alphabetic";
  }
}
function star(c, x, y, r){ c.beginPath(); for (let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }

/* ---------- 1.7: status badges over countries (sanctions, not cooperating, export stop, alliance, our base) ---------- */
export function drawStatus(M, c, vis, iconImg){
  if (!S.countries) return;
  const zc = M.cam.z >= 1.55, sanct = S.sanct || {}, ban = S.oreBan || {}, th = S.lang === "th";
  const allied = new Set(Object.values(S.alli || {}).flatMap(a => a.members));
  for (const cc of S.countries){
    if (cc.rest) continue;
    const list = [];
    if (sanct[cc.id] > 0) list.push(["ban", COL.bad, th ? `คว่ำบาตรเรา ${sanct[cc.id]} เดือน` : `Sanctioning us · ${sanct[cc.id]} mo`]);
    else if (ban[cc.id] > 0) list.push(["package-x", COL.warn, th ? `หยุดส่งออกทรัพยากร ${ban[cc.id]} เดือน` : `Exports stopped · ${ban[cc.id]} mo`]);
    if (cc.hostile && !(sanct[cc.id] > 0)) list.push(["angry", "#ff9a3c", th ? "ไม่ร่วมมือ" : "Not cooperating"]);
    if (zc && allied.has(cc.id)) list.push(["handshake", COL.good, th ? "พันธมิตร" : "Alliance member"]);
    if (S.world && S.hq === cc.id) list.push(["landmark", COL.gold, th ? "ฐานบัญชาการ" : "Home base"]);
    if (S.world && (S.amb || []).includes(cc.id)) list.push(["flag", COL.accent, th ? "ทูตของเรา" : "Our ambassador"]);
    if (!list.length) continue;
    const pt = M.countryPoint(cc.id); if (!pt) continue;
    const [x0, y0] = M.toScreen(pt[0], pt[1]); if (!vis(x0, y0, 30)) continue;
    list.forEach(([ic, col, tip], i) => {
      const x = x0 + 16 + i * 21, y = y0 + 12;
      c.fillStyle = "rgba(6,16,21,.92)"; c.beginPath(); c.arc(x, y, 10, 0, TAU); c.fill(); c.lineWidth = 2; c.strokeStyle = col; c.stroke();
      const im = iconImg(ic, col); if (im) c.drawImage(im, x - 7, y - 7, 14, 14);
      M.hits.push({id:"st-" + cc.id + ic, x:x - 11, y:y - 11, w:22, h:22, fn:() => { M.info = {x, y:y - 14, t:performance.now(), txt:`${P.cname(cc.id)} · ${tip}`}; }});
    });
  }
}
