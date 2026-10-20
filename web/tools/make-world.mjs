/* Builds the 2D map data for the web version:
   • public/data/world.json  — every country outline projected (Robinson, centred on 11°E) into map units, delta-encoded
   • tools/.cache/latlon.f32 — lat/lon of every pixel of the satellite map texture (read by make-textures.py)
   Run: node tools/make-world.mjs */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {feature} from "topojson-client";
import {geoArea, geoCentroid} from "d3-geo";
import {geoRobinson} from "d3-geo-projection";
import {MAP, projection} from "../src/geo.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC = path.resolve(ROOT, "../gdevelop/_source/src");
const topo = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/world-atlas/countries-50m.json"), "utf8"));

const win = {P2050:{}};
new Function("window", fs.readFileSync(path.join(SRC, "14-data-world.js"), "utf8"))(win);
const {COUNTRY_BY_GEO, COUNTRY} = win.P2050;
/* region of every 110m country (from the old map data); smaller 50m-only places take the region of the nearest one */
const g110 = {}; new Function("window", fs.readFileSync(path.join(HERE, "geo110.js"), "utf8"))(g110);
const REG = Object.fromEntries(g110.GEO.map(([r, n]) => [n, r]));

const proj = projection();
const feats = feature(topo, topo.objects.countries).features;
const out = [];
const known = [];
for (const f of feats){
  const name = f.properties.name;
  if (name === "Antarctica" || name === "Fr. S. Antarctic Lands" || name === "Heard I. and McDonald Is." || name === "S. Geo. and the Is.") continue;
  const c = geoCentroid(f);
  known.push({name, c, r:REG[name] && REG[name] !== "X" ? REG[name] : null, f});
}
for (const k of known) if (!k.r){
  let best = null, bd = 1e9;
  for (const o of known) if (o.r){ const d = (o.c[0] - k.c[0]) ** 2 + (o.c[1] - k.c[1]) ** 2; if (d < bd){ bd = d; best = o; } }
  k.r = best ? best.r : "MEAF";
}
const Q = 10;   // 0.1 map units
for (const k of known){
  const rings = [];
  let bestA = 0, label = null;
  const geom = k.f.geometry, polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys){
    for (let ri = 0; ri < poly.length; ri++){
      const ring = poly[ri];
      // project, splitting where the ring crosses the antimeridian of the rotated map (big jumps in x)
      const pts = [];
      let prev = null;
      for (const [lon, lat] of ring){
        const p = proj([lon, Math.max(MAP.latBot - 3, Math.min(MAP.latTop + 3, lat))]); if (!p) continue;
        if (prev && Math.abs(p[0] - prev[0]) > MAP.W * 0.5){ if (pts.length >= 6) rings.push(pts.splice(0)); else pts.length = 0; }
        const x = Math.round(p[0] * Q), y = Math.round(p[1] * Q);
        const n = pts.length; if (n && Math.abs(pts[n - 2] - x) + Math.abs(pts[n - 1] - y) < 3) continue;
        pts.push(x, y); prev = p;
      }
      if (pts.length < 6) continue;
      rings.push(pts);
      if (ri === 0){
        let A = 0, cx = 0, cy = 0;
        for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2){ const cr = pts[j] * pts[i + 1] - pts[i] * pts[j + 1]; A += cr; cx += (pts[j] + pts[i]) * cr; cy += (pts[j + 1] + pts[i + 1]) * cr; }
        if (Math.abs(A) > bestA && A !== 0){ bestA = Math.abs(A); label = [cx / (3 * A) / Q, cy / (3 * A) / Q]; }
      }
    }
  }
  if (!rings.length) continue;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const r of rings) for (let i = 0; i < r.length; i += 2){ x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); }
  if (!label) label = [(x0 + x1) / 2 / Q, (y0 + y1) / 2 / Q];
  // delta-encode
  const enc = rings.map(r => { const o = [r[0], r[1]]; for (let i = 2; i < r.length; i++) o.push(r[i] - r[i - 2]); return o; });
  out.push({n:k.name, c:COUNTRY_BY_GEO[k.name] || null, r:k.r, b:[x0 / Q, y0 / Q, x1 / Q, y1 / Q], l:label.map(v => +v.toFixed(1)), p:enc});
}
// label nudges (centroid of the biggest piece lands badly for a few countries)
const nudge = {USA:[0, 12], CAN:[-20, 40], RUS:[-80, 30], NOR:[-8, 22], IDN:[-30, 4], CHL:[4, -50], MYS:[-50, -6], FRA:[8, 4], GBR:[2, 6]};
for (const g of out) if (g.c && nudge[g.c]){ g.l[0] += nudge[g.c][0]; g.l[1] += nudge[g.c][1]; }
const missing = Object.keys(COUNTRY).filter(id => !out.some(g => g.c === id));
fs.mkdirSync(path.join(ROOT, "../assets/data"), {recursive:true});
fs.writeFileSync(path.join(ROOT, "../assets/data/world.json"), JSON.stringify({map:MAP, shapes:out}));
console.log("shapes", out.length, "countries", out.filter(g => g.c).length, "missing", missing, "bytes", fs.statSync(path.join(ROOT, "../assets/data/world.json")).size);

/* lat/lon for each texture pixel (texture covers the map rectangle 0..W × 0..H) */
fs.mkdirSync(path.join(HERE, ".cache"), {recursive:true});
for (const tw of [4800]){
  const th = Math.round(tw * MAP.H / MAP.W), buf = new Float32Array(tw * th * 2);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++){
    const p = proj.invert([(x + .5) / tw * MAP.W, (y + .5) / th * MAP.H]);
    const i = (y * tw + x) * 2;
    if (!p || !isFinite(p[0]) || Math.abs(p[0] - (MAP.lon0)) > 180.5 + 360){ buf[i] = NaN; buf[i + 1] = NaN; continue; }
    // outside the Robinson outline → NaN
    const back = proj(p);
    if (!back || Math.abs(back[0] - (x + .5) / tw * MAP.W) > 1 || Math.abs(back[1] - (y + .5) / th * MAP.H) > 1){ buf[i] = NaN; buf[i + 1] = NaN; continue; }
    buf[i] = p[0]; buf[i + 1] = p[1];
  }
  fs.writeFileSync(path.join(HERE, `.cache/latlon-${tw}x${th}.f32`), Buffer.from(buf.buffer));
  console.log("latlon grid", tw, th);
}
