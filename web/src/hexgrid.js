/* Phase 4 · hex grid for placing builds by hand (Continuous World).
   Cells are ~3° wide, laid out in longitude/latitude and drawn in the map's Robinson projection.
   Each land cell knows its country and a look sampled from the satellite picture (desert, green, snow, coast),
   which P.suitability() turns into a 0…1 score for the kind being placed. Built once, the first time it is needed. */
import {P, S, UIM, L} from "./core.js";
import {MAP, ll} from "./geo.js";
import {Audio} from "./audio.js";

const DLON = 3.2, DLAT = 2.8, R = 1.75;
let cells = null, building = false;

function sampler(M){
  const img = M.img; if (!img) return null;
  const w = 720, h = Math.round(w * MAP.H / MAP.W), cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d", {willReadFrequently:true}); g.drawImage(img, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h).data;
  return (x, y) => { const i = (Math.max(0, Math.min(h - 1, Math.round(y / MAP.H * h))) * w + Math.max(0, Math.min(w - 1, Math.round(x / MAP.W * w)))) * 4; return [data[i], data[i + 1], data[i + 2]]; };
}
const water = ([r, g, b]) => b > r + 12 && b >= g - 6 && r + g + b < 330;
function look(px, nb){
  const [r, g, b] = px, br = (r + g + b) / 3, sat = Math.max(r, g, b) - Math.min(r, g, b);
  const arid = Math.max(0, Math.min(1, (r - b - 12) / 40)) * (br > 90 ? 1 : .5);
  const green = Math.max(0, Math.min(1, (g - r + 8) / 30)) * (br < 150 ? 1 : .5);
  const snow = br > 195 && sat < 30 ? 1 : 0;
  return {arid, green, snow, coast:nb.some(water)};
}
export const hexCells = () => cells;
export function buildCells(M){
  if (cells || building || !M.shapes.length) return cells;
  const smp = sampler(M); if (!smp) return null;
  building = true;
  const ctx = M.bctx; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const out = []; let row = 0;
  for (let lat = MAP.latTop - 6; lat > MAP.latBot + 2; lat -= DLAT, row++){
    for (let lon = MAP.lon0 - 180 + (row % 2 ? DLON / 2 : 0); lon < MAP.lon0 + 180; lon += DLON){
      const [x, y] = ll(lat, lon);
      let sh = null;
      for (const s of M.shapes){ if (!s.c || !P.C(s.c) || P.C(s.c).rest || x < s.b[0] || x > s.b[2] || y < s.b[1] || y > s.b[3]) continue; if (ctx.isPointInPath(s.path, x, y, "evenodd")){ sh = s; break; } }
      if (!sh){ for (const s of M.shapes){ if (s.c || !P.RMETA[s.r] || x < s.b[0] || x > s.b[2] || y < s.b[1] || y > s.b[3]) continue; if (ctx.isPointInPath(s.path, x, y, "evenodd")){ sh = s; break; } } }
      if (!sh) continue;
      const cid = sh.c && P.C(sh.c) && !P.C(sh.c).rest ? sh.c : P.RMETA[sh.r] ? "R_" + sh.r : null; if (!cid || !P.C(cid)) continue;
      const poly = []; for (let k = 0; k < 6; k++){ const a = Math.PI / 6 + k * Math.PI / 3; poly.push(ll(lat + Math.sin(a) * R * .9, lon + Math.cos(a) * R)); }
      const nb = [[0, 2.4], [0, -2.4], [2.2, 0], [-2.2, 0], [1.6, 1.6], [-1.6, -1.6]].map(([a, b]) => { const p = ll(lat + a, lon + b); return smp(p[0], p[1]); });
      out.push({lat, lon, x, y, c:cid, poly, look:look(smp(x, y), nb)});
    }
  }
  ctx.restore(); cells = out; building = false;
  return cells;
}
const col = s => { const r = s < .5 ? 255 : Math.round(255 * (1 - s) * 2), g = s > .5 ? 211 : Math.round(80 + 262 * s); return `rgba(${r},${g},90,`; };
/* draw the grid for the kind being placed and return one hit that covers the screen (nearest cell wins) */
export function drawHex(M, c, vis){
  const k = UIM.placing; if (!k || !S.world || !(S.toPlace || []).some(t => t.k === k)) { if (UIM.placing && !(S.toPlace || []).some(t => t.k === UIM.placing)) UIM.placing = null; return null; }
  const list = buildCells(M); if (!list) return null;
  const shown = [];
  c.lineWidth = 1;
  for (const cell of list){
    const [sx, sy] = M.toScreen(cell.x, cell.y); if (!vis(sx, sy, 40)) continue;
    const s = cell.s = P.suitability(k, cell.lat, cell.look, cell.c);
    c.beginPath(); cell.poly.forEach(([px, py], i) => { const [qx, qy] = M.toScreen(px, py); i ? c.lineTo(qx, qy) : c.moveTo(qx, qy); }); c.closePath();
    c.fillStyle = col(s) + ".34)"; c.fill(); c.strokeStyle = col(s) + ".6)"; c.stroke();
    shown.push({cell, sx, sy});
  }
  return {id:"hex", x:0, y:0, w:M.w, h:M.h, fn:(px, py) => {
    if (px === undefined) return;
    let best = null, bd = 1e9; for (const q of shown){ const d = (q.sx - px) ** 2 + (q.sy - py) ** 2; if (d < bd){ bd = d; best = q; } }
    const lim = Math.max(18, 1.4 * R * (MAP.W / 360) * M.scale()); if (!best || bd > lim * lim) return;
    if (P.placeAt(k, best.cell.c, [best.cell.x, best.cell.y], best.cell.s)){ Audio.play("select"); M.burst && M.burst(best.sx, best.sy, best.cell.s >= .45 ? "#5fd39a" : "#f2b441"); M.dirtyBase = true; }
  }};
}
