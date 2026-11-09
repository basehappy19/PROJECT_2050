/* 3.5: the ice around the world map.
   Outside the map's Robinson outline there used to be deep space; now the world sits in a sheet of polar ice that
   frosts over the map's edge, so the picture never ends in a hard cut. The texture is drawn once in code (no image file)
   and tiles seamlessly; map2d.js (Canvas 2D) and mapgl.js (WebGL) both use it. */
export const ICE_TILE = 420;   // map units one texture tile covers
export const FROST = 72;       // how far (map units) the frost reaches into the map from its edge

let tile = null;
export function iceCanvas(){
  if (tile) return tile;
  const N = 512, cv = document.createElement("canvas"); cv.width = cv.height = N;
  const g = cv.getContext("2d");
  let seed = 20250; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // every shape is drawn 9 times (shifted by one tile each way) so the tile has no seams
  const wrap = draw => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]){ g.save(); g.translate(dx, dy); draw(); g.restore(); } };
  g.fillStyle = "#c9dfeb"; g.fillRect(0, 0, N, N);
  // large soft patches: bluish older ice and bright fresh snow
  for (let i = 0; i < 60; i++){
    const x = rnd() * N, y = rnd() * N, r = 30 + rnd() * 140, snow = rnd() < .55;
    const col = snow ? `rgba(246,251,255,${.18 + rnd() * .25})` : `rgba(${120 + rnd() * 40 | 0},${170 + rnd() * 30 | 0},${200 + rnd() * 25 | 0},${.12 + rnd() * .18})`;
    wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); });
  }
  // pressure ridges and cracks
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
  // sparkle
  for (let i = 0; i < 900; i++){ const x = rnd() * N, y = rnd() * N; g.fillStyle = `rgba(255,255,255,${.25 + rnd() * .55})`; g.fillRect(x, y, rnd() < .1 ? 1.6 : .9, rnd() < .1 ? 1.6 : .9); }
  tile = cv;
  return cv;
}

/* the map outline (flat list x0,y0,x1,y1…) with each point's outward direction, for the frost band */
export function edgeNormals(pts){
  const n = pts.length / 2, out = new Float32Array(pts.length);
  let cx = 0, cy = 0; for (let i = 0; i < n; i++){ cx += pts[i * 2]; cy += pts[i * 2 + 1]; } cx /= n; cy /= n;
  for (let i = 0; i < n; i++){
    const a = (i - 1 + n) % n, b = (i + 1) % n;
    let tx = pts[b * 2] - pts[a * 2], ty = pts[b * 2 + 1] - pts[a * 2 + 1], l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    let nx = ty, ny = -tx;
    if (nx * (pts[i * 2] - cx) + ny * (pts[i * 2 + 1] - cy) < 0){ nx = -nx; ny = -ny; }   // pointing away from the middle
    out[i * 2] = nx; out[i * 2 + 1] = ny;
  }
  return out;
}
