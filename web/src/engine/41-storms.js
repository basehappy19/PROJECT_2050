const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.storms) return;
(P.mods = P.mods || {}).storms = 1;
/* =========================================================================
   3.8 · Tropical cyclones you can watch on the map (web: life.js · GDevelop: 74-life.js)
   A hurricane / typhoon forecast is no longer just a marker: the storm forms out at sea three months before it hits,
   drifts toward the coast and grows through the real stages
     tropical depression → tropical storm → typhoon (NW Pacific) / hurricane (Atlantic, NE Pacific) / cyclone (Indian
     Ocean, South Pacific)
   and makes landfall on the month the forecast said. Neighbouring countries hit by the same storm ("wide") share it.
   Only the picture and the names change; the damage rules stay in 20-engine.js.
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FORECAST = 3;
/* where storms come ashore (lat, lon) for big countries; others use their capital */
const LANDFALL = {USA:[29.4, -90.2], MEX:[21.0, -87.2], CHN:[22.0, 114.8], JPN:[33.3, 135.6], KOR:[34.7, 127.6], PRK:[38.6, 125.0], TWN:[22.9, 121.2], IND:[19.6, 86.4],
  VNM:[16.2, 108.4], PHL:[13.2, 124.4], BGD:[21.8, 90.6], MMR:[17.0, 94.4], HKG:[22.2, 114.3], MAC:[22.1, 113.6], CUB:[21.6, -79.6], GTM:[15.8, -88.6], NIC:[13.0, -83.6],
  HND:[15.9, -85.0], SLV:[13.2, -88.8], AUS:[-16.8, 146.2], MUS:[-20.2, 57.6]};
/* names of the stages; the last one depends on the ocean (WMO naming) */
const NAMES = [T("พายุดีเปรสชันเขตร้อน", "Tropical depression"), T("พายุโซนร้อน", "Tropical storm")];
const TOP = {typhoon:T("พายุไต้ฝุ่น", "Typhoon"), hurricane:T("พายุเฮอริเคน", "Hurricane"), cyclone:T("พายุไซโคลน", "Cyclone")};
const basinOf = (lat, lon) => lat < 0 ? "cyclone" : lon <= -20 ? "hurricane" : lon >= 100 ? "typhoon" : "cyclone";
P.STORM_NAMES = {stages:NAMES, top:TOP};
/* one storm per forecast (shared by the countries a wide storm hits) */
P.stormList = function(){
  const out = [];
  for (const h of S.haz || []){
    if (h.type !== "hurricane" && h.type !== "typhoon") continue;
    if (h.wide && (S.haz || []).some(o => !o.wide && o.type === h.type && Math.abs(o.at - h.at) <= 1)) continue;   // the main storm of the group draws it
    const s = P.stormInfo(h); if (s) out.push(s);
  }
  return out;
};
P.stormInfo = function(h){
  const cap = P.CAPITALS && P.CAPITALS[h.c], end = LANDFALL[h.c] || (cap ? [cap[0], cap[1]] : null);
  if (!end) return null;
  const north = end[0] >= 0, basin = basinOf(end[0], end[1]);
  // it forms out at sea, east of the coast and nearer the equator (storms in the tropics drift west and poleward)
  const bay = basin === "cyclone" && north;   // Bay of Bengal / Arabian Sea: they come up from the south
  const start = bay ? [end[0] - 11, end[1] + 3] : [end[0] + (north ? -8 : 8), end[1] + 17];
  const frac = P.monthFrac ? P.monthFrac() : 0;
  const p = clamp((S.tick - (h.at - FORECAST) + frac) / FORECAST, 0, 1);
  // a gentle curve (they bend poleward as they near land)
  const e = p * p * (3 - 2 * p), bend = Math.sin(Math.PI * e) * 2.2 * (north ? 1 : -1);
  const lat = start[0] + (end[0] - start[0]) * e + bend, lon = start[1] + (end[1] - start[1]) * e;
  const stage = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
  return {h, id:h.id, lat, lon, p, k:clamp(.25 + p * .9, 0, 1) * (.85 + .15 * (h.sev || 1)), stage, north, basin, name:stage < 2 ? NAMES[stage] : TOP[basin], months:Math.max(0, h.at - S.tick)};
};

/* ---------- the picture (shared by the website and GDevelop; drawn on a canvas, so only in a browser) ---------- */
/* 3.8: a tropical cyclone seen from a satellite, drawn once per stage (0 depression · 1 tropical storm · 2 typhoon /
   hurricane / cyclone): a dense core, spiral rain bands wound by the spin, ragged noisy edges, a clear eye and a bright
   eyewall at full strength, and shading from the bumps of the cloud tops so it reads as a thick 3D mass.
   Drawn for the northern hemisphere (turning anticlockwise); the south mirrors it. part: "all" | "shadow" */
const SPR = {};
P.stormSprite = function stormSprite(stage, part){
  const key = `st${stage}${part}`;
  if (SPR[key]) return SPR[key];
  if (part === "shadow"){
    const src = stormSprite(stage, "all"), N = src.width, cv = document.createElement("canvas"); cv.width = cv.height = N;
    const g = cv.getContext("2d"); g.filter = "blur(10px) brightness(0)"; g.globalAlpha = .9; g.drawImage(src, 0, 0);
    return (SPR[key] = cv);
  }
  const N = 400, cv = document.createElement("canvas"); cv.width = cv.height = N;
  const g = cv.getContext("2d"), img = g.createImageData(N, N), d = img.data, den = new Float32Array(N * N);
  const hash = (i, j) => { const h = Math.sin(i * 127.1 + j * 311.7 + stage * 17.3) * 43758.5453; return h - Math.floor(h); };
  const sm = t => t * t * (3 - 2 * t), ss = (a, b, x) => sm(clamp((x - a) / (b - a), 0, 1));
  const vn = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
    return (hash(i, j) * (1 - fx) + hash(i + 1, j) * fx) * (1 - fy) + (hash(i, j + 1) * (1 - fx) + hash(i + 1, j + 1) * fx) * fy; };
  const fbm = (x, y) => .5 * vn(x, y) + .25 * vn(x * 2.1 + 5, y * 2.1 + 1) + .14 * vn(x * 4.3 + 9, y * 4.3 + 3) + .07 * vn(x * 8.7, y * 8.7 + 7);
  const tw = [1.2, 2.1, 2.8][stage], core = [.22, .3, .4][stage], arms = [.4, .8, 1][stage], eye = stage === 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){
    const u = (x + .5) / N * 2 - 1, v = (y + .5) / N * 2 - 1, r = Math.hypot(u, v); if (r >= 1){ den[y * N + x] = 0; continue; }
    const th = Math.atan2(v, u), a = tw * Math.log(r + .04);   // the swirl: points further out are turned less
    const ha = -a * .55, ca = Math.cos(ha), sa = Math.sin(ha), su = u * ca - v * sa, sv = u * sa + v * ca;   // half-swirled position (texture follows the spin a little)
    const n = fbm(su * 2.6 + 7, sv * 2.6 + 3), det = .55 * fbm(u * 9 + 2, v * 9 + 11) + .45 * fbm(su * 18 + 4, sv * 18 + 1);
    const arm = .5 + .5 * Math.cos(3 * (th - a) + n * 4.5);
    const band = ss(.34, .9, arm * (.55 + .7 * n)) * ss(1, .45, r) * ss(.06, .26, r);
    const cdo = ss(core * 1.35, core * .4, r + (n - .5) * .22);
    const haze = .32 * ss(1, .55, r) * ss(.35, .7, n);
    let q = Math.max(cdo, band * arms, haze) * (.62 + .55 * det);
    if (stage === 0) q *= .55 + .7 * fbm(u * 2.2 + 3, v * 2.2);   // a loose blob, not yet organised
    if (eye){ q *= ss(.028, .06, r); q += .5 * Math.exp(-Math.pow((r - .075) / .028, 2)); }
    den[y * N + x] = clamp(q, 0, 1.2);
  }
  // shading: light from the upper left on the bumpy cloud tops
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){
    const i = y * N + x, q = den[i], k = i * 4;
    const gx = den[y * N + Math.min(N - 1, x + 1)] - den[y * N + Math.max(0, x - 1)], gy = den[Math.min(N - 1, y + 1) * N + x] - den[Math.max(0, y - 1) * N + x];
    const lit = clamp(.86 + (-gx * .7 - gy * .7) * 4.5, .55, 1.15), thick = clamp(q, 0, 1);
    const l = 168 + 92 * Math.min(1, thick * 1.2);
    d[k] = clamp(l * lit * .97, 0, 255); d[k + 1] = clamp(l * lit * .99, 0, 255); d[k + 2] = clamp(l * lit * 1.03 + 6, 0, 255);
    const al = ss(.04, .62, q) * 255;
    d[k + 3] = al;
  }
  g.putImageData(img, 0, 0);
  return (SPR[key] = cv);
};
