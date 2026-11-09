/* 3.4: the spinning Earth on the loading screen.
   A real satellite picture (assets/img/ui/loader-globe*.webp: the menu globe's day map with its clouds baked in) wrapped
   on a sphere with a 2D canvas.
   3.7: lit exactly like the menu's 3D globe (globe.js: the same sun, dark side and blue atmosphere at the rim), so the
   two look the same and the glide from one to the other doesn't jump:
   the sphere → map lookup is worked out once, then every frame only copies pixels (no WebGL, no per-pixel maths),
   at 30 frames a second and at most ~720×720 pixels, so it stays light on phones. Shading and the glow are CSS. */
export function mountEarth(canvas, {src, px = 640, period = 110, tilt = 0.21, still = false} = {}){
  let stopped = false, raf = 0;
  const api = () => { stopped = true; cancelAnimationFrame(raf); };
  api.lon = () => null;
  const N = Math.max(160, Math.round(px));
  canvas.width = N; canvas.height = N;
  const ctx = canvas.getContext("2d", {alpha:true});
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  const ready = img.decode ? img.decode() : new Promise((ok, no) => { img.onload = ok; img.onerror = no; });
  ready.then(() => {
    if (stopped) return;
    const W = img.naturalWidth, H = img.naturalHeight;
    const tc = document.createElement("canvas"); tc.width = W; tc.height = H;
    const tx = tc.getContext("2d", {willReadFrequently:true}); tx.drawImage(img, 0, 0);
    const tex = new Uint32Array(tx.getImageData(0, 0, W, H).data.buffer);
    /* lookup: for every pixel inside the disc, which map column (u) and row (v·W) it shows */
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const idx = [], uu = [], rr = [];
    for (let y = 0; y < N; y++){
      const ny = (y + .5) / N * 2 - 1;
      for (let x = 0; x < N; x++){
        const nx = (x + .5) / N * 2 - 1, r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const z = Math.sqrt(1 - r2), y2 = ny * ct - z * st, z2 = ny * st + z * ct;
        const lat = Math.asin(Math.max(-1, Math.min(1, -y2))), lon = Math.atan2(nx, z2);
        idx.push(y * N + x);
        uu.push(Math.min(W - 1, Math.floor((lon / (2 * Math.PI) + .5) * W)));
        rr.push(Math.min(H - 1, Math.floor((.5 - lat / Math.PI) * H)) * W);
      }
    }
    const I = Int32Array.from(idx), U = Int32Array.from(uu), R = Int32Array.from(rr), n = I.length;
    const out = ctx.createImageData(N, N), dst = new Uint32Array(out.data.buffer);
    /* light and atmosphere, worked out once (the sun stays put while the Earth turns): globe.js EARTH_FS in 2D.
       shade: black laid over the picture (the picture is the lit colour at full sun); glow: added blue at the rim */
    const shade = document.createElement("canvas"), glow = document.createElement("canvas"); shade.width = shade.height = glow.width = glow.height = N;
    { const sh = shade.getContext("2d").createImageData(N, N), gl = glow.getContext("2d").createImageData(N, N);
      const SX = -.55, SY = .32, SZ = .78, SL = Math.hypot(SX, SY, SZ), sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      for (let y = 0; y < N; y++){
        const ny = (y + .5) / N * 2 - 1;
        for (let x = 0; x < N; x++){
          const nx = (x + .5) / N * 2 - 1, r2 = nx * nx + ny * ny; if (r2 > 1) continue;
          const z = Math.sqrt(1 - r2), d = (SX * nx - SY * ny + SZ * z) / SL, k = (y * N + x) * 4;
          const day = sm(-.12, .22, d), m = ((.08 + 1.05 * Math.max(d, 0)) * day + .035 * (1 - day)) / 1.13;
          sh.data[k + 3] = Math.round(255 * Math.max(0, Math.min(1, 1 - m)));
          const rim = Math.pow(1 - z, 3) * (.15 + .85 * sm(-.3, .4, d)) * .55 * 255;
          gl.data[k] = .32 * rim; gl.data[k + 1] = .62 * rim; gl.data[k + 2] = rim; gl.data[k + 3] = 255;
        }
      }
      shade.getContext("2d").putImageData(sh, 0, 0); glow.getContext("2d").putImageData(gl, 0, 0); }
    const draw = off => {
      for (let i = 0; i < n; i++){ let u = U[i] + off; if (u >= W) u -= W; dst[I[i]] = tex[R[i] + u]; }
      ctx.putImageData(out, 0, 0);
      ctx.drawImage(shade, 0, 0);
      ctx.globalCompositeOperation = "lighter"; ctx.drawImage(glow, 0, 0); ctx.globalCompositeOperation = "source-over";
    };
    const base = Math.floor(W * .1), t0 = performance.now(), step = 1000 / 30;
    let off = base;
    api.lon = () => (((W / 2 + off) % W) / W) * 360 - 180;   // 3.5: the longitude facing the player (the menu globe starts there)   // first frame: Africa, Europe and Asia face the player
    let last = -1e9;
    draw(base);
    canvas.classList.add("on");
    if (still) return;
    const frame = now => {
      if (stopped) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < step) return;
      last = now;
      off = ((base - Math.floor(((now - t0) / 1000 / period) * W)) % W + W) % W; draw(off);   // the surface moves west → east, like the real Earth
    };
    raf = requestAnimationFrame(frame);
  }).catch(() => {});
  return api;
}
