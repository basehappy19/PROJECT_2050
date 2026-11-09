/* 3.5: the ice around the world map.
   Outside the map there used to be deep space; now the world sits in a sheet of polar ice.
   3.7: the map is a full rectangle (Plague Inc style) that always fills the screen, so the ice outside is only seen
   at the far corners when the camera tilts. Along the top (Arctic) and bottom (Southern Ocean) of the map lies a thin,
   faint, ragged band of sea ice (polarCanvas) instead of the old thick frost ring. The texture is drawn once in code (no image file)
   and tiles seamlessly; map2d.js (Canvas 2D) and mapgl.js (WebGL) both use it. */
export const ICE_TILE = 420;   // map units one texture tile covers
export const POLAR = 120;      // 3.7: map units the Arctic ice band reaches down from the top edge (the southern one is shorter)
export const POLAR_S = 70;

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

/* 3.7: the band of sea ice along the top of the map: a strip MAP.W wide and POLAR tall (flip it for the bottom).
   Ice texture cut by 2D noise: almost solid at the very top, breaking up into ragged pack ice and loose floes further
   down, then open sea. At most ~75% opaque so the map still shows through. Built once in code. */
let polar = null;
export function polarCanvas(){
  if (polar) return polar;
  const Wc = 4096, Hc = 200, cv = document.createElement("canvas"); cv.width = Wc; cv.height = Hc;
  const g = cv.getContext("2d");
  const pat = g.createPattern(iceCanvas(), "repeat"); pat.setTransform(new DOMMatrix().scale(ICE_TILE / 512 * Wc / 2400 * .3));
  g.fillStyle = pat; g.fillRect(0, 0, Wc, Hc);
  g.fillStyle = "rgba(240,248,255,.55)"; g.fillRect(0, 0, Wc, Hc);   // fresh, bright sea ice over the dark sea
  // value noise from a hash, summed over a few sizes (fbm)
  const hash = (i, j) => { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); };
  const sm = t => t * t * (3 - 2 * t);
  const vn = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
    return (hash(i, j) * (1 - fx) + hash(i + 1, j) * fx) * (1 - fy) + (hash(i, j + 1) * (1 - fx) + hash(i + 1, j + 1) * fx) * fy; };
  const fbm = (x, y) => .5 * vn(x / 150, y / 90) + .27 * vn(x / 52 + 17, y / 40 + 5) + .15 * vn(x / 19 + 41, y / 17 + 9) + .08 * vn(x / 7 + 3, y / 7 + 77);
  // the pack: organic shapes from the noise; where it thins out it breaks into small floes (jittered cells, Worley
  // noise), each one kept or melted, with open water between them, so the edge is ragged like real sea ice
  const C = 13, cell = (i, j) => [(i + hash(i * 1.7 + 3, j * 2.3 + 1)) * C, (j + hash(i * 3.1 + 7, j * 1.3 + 5)) * C];
  const img = g.getImageData(0, 0, Wc, Hc), d = img.data;
  for (let y = 0; y < Hc; y++){
    const v = y / Hc, gj = Math.floor(y / C);
    for (let x = 0; x < Wc; x++){
      const n = fbm(x, y), dens = 1.28 - v * 1.7 + (n - .5) * 1.35, t = dens - .5;   // t > 0: frozen
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
  polar = cv;
  return cv;
}
