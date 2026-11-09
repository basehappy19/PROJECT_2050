/* 3.6: a livelier map — drawn on the overlay canvas (map2d.js drawFx), projected through the map's tilt
   · clouds drifting west → east above the planes, each with its shadow on the ground; hurricanes and typhoons spin
     over the countries they are about to hit
   · aurora curtains over the far north (and faintly in the far south), taller and brighter on the night map
   · oil rigs on the big oil fields: the gas flare burns until that country goes green (green ≥ 60), then it goes out
   · high-speed trains running between the nearest big cities wherever a rail build is finished
   (wind / solar farms grow into small fields of turbines and panels in mapfx.js; regrowing forests are a green
   tint on the base map, map2d.js / mapgl.js setForest) */
import {P, S, L, COL} from "./core.js";
import {MAP, ll} from "./geo.js";
import {Gfx} from "./gfx.js";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let seed = 99; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/* ---------- pictures (drawn once) ---------- */
const SPR = {};
function cloudSprite(v, dark){
  const key = v + (dark ? "d" : "");
  if (SPR[key]) return SPR[key];
  const W = 256, H = 168, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"); let sd = 17 + v * 31; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  if (dark) g.filter = "blur(6px)";
  // a cluster of round puffs: lit white on top, a little blue-grey underneath
  const puffs = [];
  for (let i = 0; i < 22; i++){ const t = r(); puffs.push([W * (.18 + .64 * r()), H * (.35 + .3 * r() + .12 * Math.abs(t - .5)), 12 + r() * 30 * (1 - Math.abs(t - .5))]); }
  puffs.sort((a, b) => a[1] - b[1]);
  for (const [x, y, rad] of puffs){
    if (dark){ g.fillStyle = "rgba(0,10,20,.22)"; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); continue; }
    const gr = g.createRadialGradient(x - rad * .25, y - rad * .35, rad * .1, x, y, rad);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.7, "rgba(238,244,250,.95)"); gr.addColorStop(.92, "rgba(196,210,224,.75)"); gr.addColorStop(1, "rgba(196,210,224,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
  return (SPR[key] = cv);
}
function spiralSprite(dark){
  const key = "sp" + (dark ? "d" : "");
  if (SPR[key]) return SPR[key];
  const N = 256, c = N / 2, cv = document.createElement("canvas"); cv.width = cv.height = N;
  const g = cv.getContext("2d");
  if (dark) g.filter = "blur(6px)";
  const base = g.createRadialGradient(c, c, 8, c, c, c);
  base.addColorStop(0, dark ? "rgba(0,10,20,.35)" : "rgba(255,255,255,.2)"); base.addColorStop(.5, dark ? "rgba(0,10,20,.25)" : "rgba(235,242,250,.55)"); base.addColorStop(1, "rgba(235,242,250,0)");
  g.fillStyle = base; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
  g.lineCap = "round";
  for (let arm = 0; arm < 4; arm++){
    for (let t = 0; t < 1; t += .012){
      const a = arm * TAU / 4 + t * 4.2, rr = 10 + t * (c - 14), w = 6 + t * 26;
      g.strokeStyle = dark ? `rgba(0,10,20,${.18 * (1 - t)})` : `rgba(255,255,255,${.5 * (1 - t * .8)})`;
      g.lineWidth = w; g.beginPath(); g.arc(c, c, rr, a, a + .09); g.stroke();
    }
  }
  if (!dark){ g.globalCompositeOperation = "destination-out"; const eye = g.createRadialGradient(c, c, 0, c, c, 12); eye.addColorStop(0, "rgba(0,0,0,1)"); eye.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = eye; g.fillRect(0, 0, N, N); }
  return (SPR[key] = cv);
}

/* where a flat thing of size (wu × hu map units) at map point x, y and height h (screen px) lands on screen */
function box(M, x, y, wu, hu, h){
  const [cx, cy] = M.toScreenAlt(x, y, h), [lx] = M.toScreenAlt(x - wu / 2, y, h), [rx] = M.toScreenAlt(x + wu / 2, y, h);
  const [, ty] = M.toScreenAlt(x, y - hu / 2, h), [, by] = M.toScreenAlt(x, y + hu / 2, h);
  return [cx, cy, Math.abs(rx - lx), Math.abs(by - ty)];
}

/* ---------- clouds and storms ---------- */
const STORM = {hurricane:1, typhoon:1};
function initClouds(M){
  M.clouds = [];
  for (let i = 0; i < 14; i++){
    // mostly over the mid-latitudes and the tropics, like real weather bands
    const band = rnd(), lat = band < .4 ? 38 + rnd() * 24 : band < .7 ? -45 + rnd() * 18 : -8 + rnd() * 20;
    const [x, y] = ll(lat, MAP.lon0 - 180 + rnd() * 360);
    M.clouds.push({x, y, v:i % 6, s:.55 + rnd() * .6, sp:6 + rnd() * 6});
  }
}
export function drawClouds(M, c, dt, now, vis, night){
  if (Gfx.level === "low" || !S.regions) return;
  if (!M.clouds) initClouds(M);
  const z = M.cam.z, h = 34 * Math.sqrt(z), aBase = .5 * clamp(1.45 - z * .2, .45, 1) * (night ? .5 : 1);   // 3.6.1: fainter, so they don't hide the map
  const run = P.running && P.running();
  const items = [];
  for (const q of M.clouds){
    if (run) q.x += q.sp * dt; if (q.x > MAP.W + 220) q.x -= MAP.W + 440;
    items.push({x:q.x, y:q.y, wu:260 * q.s, hu:170 * q.s, img:cloudSprite(q.v), sh:cloudSprite(q.v, true), a:aBase, rot:0});
  }
  for (const hz of S.haz || []){
    if (!STORM[hz.type]) continue;
    const pt = M.countryPoint(hz.c); if (!pt) continue;
    const left = Math.max(0, hz.at - S.tick), north = pt[1] < ll(0, MAP.lon0)[1];
    const size = 190 * (.7 + .3 * (hz.sev || 1));
    items.push({x:pt[0] + 40, y:pt[1] + 10, wu:size, hu:size, img:spiralSprite(), sh:spiralSprite(true), a:.85 * clamp(1.15 - left / 6, .35, 1), rot:(north ? -1 : 1) * now * .9, storm:true});
  }
  for (const it of items){
    for (const ox of [0, -MAP.W, MAP.W]){
      const x = it.x + ox; if (x < -300 || x > MAP.W + 300) continue;
      // shadow on the ground, nudged away from the sun
      const [gx, gy, gw, gh] = box(M, x, it.y, it.wu, it.hu, 0); if (!vis(gx, gy, Math.max(gw, gh))) continue;
      const [cx, cy, w, hh] = box(M, x, it.y, it.wu, it.hu, h);
      c.globalAlpha = it.a * .55;
      drawRot(c, it.sh, gx + h * .22, gy + h * .28, gw, gh, it.rot);
      c.globalAlpha = it.a;
      drawRot(c, it.img, cx, cy, w, hh, it.rot);
    }
  }
  c.globalAlpha = 1;
  return true;
}
function drawRot(c, img, x, y, w, h, rot){
  if (!rot){ c.drawImage(img, x - w / 2, y - h / 2, w, h); return; }
  c.save(); c.translate(x, y); c.scale(1, h / w); c.rotate(rot); c.drawImage(img, -w / 2, -w / 2, w, w); c.restore();
}

/* ---------- aurora ---------- */
export function drawAurora(M, c, now, vis, night){
  if (Gfx.level === "low" || !S.regions) return;
  const z = M.cam.z, H = (44 + 30 * (night ? 1 : .7)) * Math.sqrt(z), base = night ? .75 : .5;
  c.save(); c.globalCompositeOperation = "lighter";
  for (const [lat0, k] of [[67, 1], [-54, .55]]){
    const N = 72, pts = [];
    for (let i = 0; i <= N; i++){
      const lon = MAP.lon0 - 179 + 358 * i / N, lat = lat0 + 2.2 * Math.sin(lon * .07 + now * .25) + 1.2 * Math.sin(lon * .19 - now * .4);
      const [x, y] = ll(lat, lon), hh = H * (.7 + .3 * Math.sin(i * .5 + now * .8)), north = lat0 > 0 ? -1 : 1;
      pts.push({g:M.toScreen(x, y), t:M.toScreenAlt(x, y + north * 22, hh), b:.45 + .55 * Math.max(0, Math.sin(i * .37 + now * 1.1)) * (.6 + .4 * Math.sin(i * .11 - now * .5))});
    }
    for (let i = 0; i < N; i++){
      const a = pts[i], b = pts[i + 1];
      if (!vis(a.g[0], a.g[1], 120) && !vis(b.g[0], b.g[1], 120)) continue;
      const al = base * k * (a.b + b.b) / 2;
      const gr = c.createLinearGradient(a.g[0], a.g[1], a.t[0], a.t[1]);
      gr.addColorStop(0, `rgba(80,255,170,${al})`); gr.addColorStop(.45, `rgba(60,220,190,${al * .55})`); gr.addColorStop(1, `rgba(150,90,255,0)`);
      c.fillStyle = gr; c.beginPath(); c.moveTo(a.g[0], a.g[1]); c.lineTo(b.g[0], b.g[1]); c.lineTo(b.t[0], b.t[1]); c.lineTo(a.t[0], a.t[1]); c.closePath(); c.fill();
    }
  }
  c.restore();
}

/* ---------- oil rigs ---------- */
// big oil fields [country, lat, lon, at sea]
export const OIL_FIELDS = [["NOR", 58.4, 2.3, 1], ["GBR", 57.6, 1.0, 1], ["USA", 27.6, -90.6, 1], ["USA", 70.3, -148.5, 0], ["MEX", 19.6, -92.4, 1], ["CAN", 57.0, -111.6, 0],
  ["VEN", 10.3, -71.6, 1], ["BRA", -22.9, -40.4, 1], ["SAU", 26.6, 50.6, 1], ["ARE", 24.8, 53.4, 1], ["QAT", 25.9, 52.3, 1], ["KWT", 29.2, 47.9, 0], ["IRQ", 30.6, 47.4, 0],
  ["IRN", 29.4, 50.6, 1], ["NGA", 4.3, 5.8, 1], ["AGO", -7.8, 12.0, 1], ["DZA", 31.7, 6.1, 0], ["LBY", 28.4, 19.6, 0], ["RUS", 61.3, 73.4, 0], ["KAZ", 46.4, 51.6, 0],
  ["AZE", 40.2, 50.8, 1], ["CHN", 38.6, 119.6, 1], ["MYS", 5.6, 104.6, 1], ["IDN", -1.2, 117.2, 0]];
export const rigBurning = cid => { const cc = P.C && P.C(cid); return !cc || (cc.green || 0) < 60; };
let rigPts = null;
export function drawRigs(M, c, now, vis){
  if (!S.regions || !P.COUNTRY) return;
  if (!rigPts) rigPts = OIL_FIELDS.filter(f => P.COUNTRY[f[0]]).map(([cid, lat, lon, sea], i) => ({cid, p:ll(lat, lon), sea, ph:i * 1.37}));
  const z = M.cam.z; if (z < 1.12) return;
  const s = clamp(6 + 6 * Math.sqrt(z), 12, 26), low = Gfx.level === "low";
  for (const r of rigPts){
    const [x, y] = M.toScreen(r.p[0], r.p[1]); if (!vis(x, y, 40)) continue;
    const burn = rigBurning(r.cid);
    c.save(); c.translate(x, y); c.lineCap = "round"; c.lineJoin = "round";
    if (r.sea){ c.fillStyle = "rgba(10,30,45,.55)"; c.beginPath(); c.ellipse(0, s * .5, s * .55, s * .14, 0, 0, TAU); c.fill();
      c.strokeStyle = "#5d6a72"; c.lineWidth = 1.4; for (const lx of [-.32, .32]){ c.beginPath(); c.moveTo(lx * s, s * .5); c.lineTo(lx * s * .8, s * .1); c.stroke(); } }
    // deck + derrick (a small lattice tower) + flare boom
    c.fillStyle = burn ? "#4a545b" : "#3b4f47"; c.fillRect(-s * .42, s * .02, s * .84, s * .12);
    c.strokeStyle = burn ? "#cfd6da" : "#9fc9b4"; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-s * .2, s * .02); c.lineTo(-s * .05, -s * .62); c.lineTo(s * .1, s * .02); c.moveTo(-s * .16, -s * .15); c.lineTo(s * .06, -s * .15); c.moveTo(-s * .12, -s * .35); c.lineTo(s * .02, -s * .35); c.stroke();
    c.beginPath(); c.moveTo(s * .3, s * .04); c.lineTo(s * .62, -s * .34); c.stroke();
    if (burn){
      const f = .75 + .25 * Math.sin(now * 13 + r.ph) * Math.sin(now * 7.3 + r.ph * 2), fx = s * .66, fy = -s * .4;
      c.globalCompositeOperation = "lighter";
      const gl = c.createRadialGradient(fx, fy, 0, fx, fy, s * .7 * f); gl.addColorStop(0, "rgba(255,170,60,.55)"); gl.addColorStop(1, "rgba(255,90,20,0)");
      c.fillStyle = gl; c.beginPath(); c.arc(fx, fy, s * .7 * f, 0, TAU); c.fill();
      c.fillStyle = "rgba(255,120,30,.9)"; c.beginPath(); c.ellipse(fx, fy - s * .12 * f, s * .12, s * .26 * f, Math.sin(now * 5 + r.ph) * .2, 0, TAU); c.fill();
      c.fillStyle = "rgba(255,230,140,.95)"; c.beginPath(); c.ellipse(fx, fy - s * .06, s * .06, s * .13 * f, 0, 0, TAU); c.fill();
      c.globalCompositeOperation = "source-over";
      if (!low) for (let i = 0; i < 3; i++){ const q = (now * .35 + i / 3 + r.ph) % 1; c.fillStyle = `rgba(60,64,70,${.45 * (1 - q)})`; c.beginPath(); c.arc(fx + q * s * .5, fy - s * .45 - q * s * .9, s * (.1 + q * .22), 0, TAU); c.fill(); }
    } else {
      c.fillStyle = "#5fd39a"; c.beginPath(); c.arc(s * .62, -s * .34, s * .07, 0, TAU); c.fill();   // capped: a green light
    }
    c.restore();
    M.hits.push({id:"rig-" + r.cid + r.ph, x:x - s * .5, y:y - s * .6, w:s * 1.2, h:s * 1.2, fn:() => { M.info = {x, y:y - s * .8, t:performance.now(), txt:`${L(burn ? {th:"แท่นขุดเจาะน้ำมัน · ยังเผาก๊าซทิ้ง", en:"Oil rig · still flaring gas"} : {th:"แท่นขุดเจาะน้ำมัน · ปิดแล้ว", en:"Oil rig · shut down"})} · ${P.cname(r.cid)}`}; }});
  }
  return rigPts.length > 0;
}

/* ---------- high-speed trains ---------- */
const railCache = new Map();
function railRoute(M, p, pos){
  if (railCache.has(p.id)) return railCache.get(p.id);
  const cc = P.C && P.C(p.c), reg = cc && cc.reg, list = (P.CITIES[reg] || []).map(([lat, lon]) => ll(lat, lon));
  list.sort((a, b) => Math.hypot(a[0] - pos[0], a[1] - pos[1]) - Math.hypot(b[0] - pos[0], b[1] - pos[1]));
  const ends = list.filter(q => Math.hypot(q[0] - pos[0], q[1] - pos[1]) < 260).slice(0, 2);
  const pts = ends.length >= 2 ? [ends[0], pos, ends[1]] : ends.length ? [pos, ends[0]] : [[pos[0] - 40, pos[1] + 10], pos, [pos[0] + 40, pos[1] - 6]];
  const seg = [0]; for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const r = {pts, seg, len:seg[seg.length - 1] || 1}; railCache.set(p.id, r); return r;
}
function along(r, d){
  d = clamp(d, 0, r.len); let i = 1; while (i < r.seg.length - 1 && r.seg[i] < d) i++;
  const a = r.pts[i - 1], b = r.pts[i], k = (d - r.seg[i - 1]) / Math.max(1e-6, r.seg[i] - r.seg[i - 1]);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}
export function drawTrains(M, c, now, vis, pinPos){
  const pins = (S.pins || []).filter(p => p.k === "rail" && p.done); if (!pins.length) return false;
  const z = M.cam.z; if (z < 1.15) return false;
  for (const p of pins){
    const pos = pinPos(M, p); if (!pos) continue;
    const r = railRoute(M, p, pos);
    // track: a dark bed and a light rail line
    const sp = r.pts.map(q => M.toScreen(q[0], q[1]));
    if (!sp.some(q => vis(q[0], q[1], 60))) continue;
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = "rgba(20,24,28,.7)"; c.lineWidth = 3.4; c.beginPath(); sp.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke();
    c.strokeStyle = "rgba(242,193,78,.75)"; c.lineWidth = 1.2; c.setLineDash([5, 3]); c.stroke(); c.setLineDash([]);
    // two trains going opposite ways, back and forth along the line
    for (const [ph, dir] of [[0, 1], [.5, -1]]){
      const u = ((now * 28 / r.len + ph + (p.sd % 100) / 100) % 2), f = u < 1 ? u : 2 - u, fwd = (u < 1 ? 1 : -1) * dir;
      const d = (dir > 0 ? f : 1 - f) * r.len, L1 = clamp(10 / Math.sqrt(z), 4, 9);
      const [hx, hy] = M.toScreen(...along(r, d + L1 * fwd)), [tx, ty] = M.toScreen(...along(r, d - L1 * 2.4 * fwd));
      const ang = Math.atan2(hy - ty, hx - tx), len = Math.hypot(hx - tx, hy - ty);
      c.save(); c.translate(tx, ty); c.rotate(ang);
      c.fillStyle = "rgba(0,8,14,.35)"; c.fillRect(1, -2, len, 5.5);
      c.fillStyle = "#f4f7f8"; c.beginPath(); c.roundRect(0, -2.6, len, 5.2, [1, 2.6, 2.6, 1]); c.fill();
      c.fillStyle = "#2bb3a6"; c.fillRect(0, -.7, len - 2, 1.4);
      c.fillStyle = "#1b3446"; for (let x = 3; x < len - 4; x += len / 3) c.fillRect(x, -2.6, .8, 5.2);
      c.restore();
    }
  }
  return true;
}
