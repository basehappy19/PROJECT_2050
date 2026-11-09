/* 3.4: makes every logo picture from assets/img/ui/logo.svg (design "E50", sunrise over the Earth) and the two share cards.
     node tools/brand.mjs
   → favicon.svg · icon-16/32/192/512.png · icon-maskable-512.png · apple-touch-icon.png · assets/img/ui/logo.png
     og-image.png (Thai) · og-image-en.png (English): the real Earth (assets/img/ui/loader-earth.webp) + logo + title, 1200×630
   Needs Playwright (devDependency). */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url)), WEB = path.resolve(HERE, ".."), REPO = path.resolve(WEB, "..");
const {chromium} = createRequire(import.meta.url)("playwright");
const rel = p => path.join(REPO, p);
const svg = fs.readFileSync(rel("assets/img/ui/logo.svg"), "utf8");
/* full-bleed square (no rounded corners, no rim): for iOS and Android "maskable" icons, which cut their own shape */
const bleed = svg.replace('viewBox="22 22 156 156"', 'viewBox="24 24 152 152"').replace(' clip-path="url(#pzTile)"', "").replace(/<rect x="24" y="24" width="152" height="152" rx="38" fill="none"[^>]*\/>\n?/, "");
const b64 = f => fs.readFileSync(rel(f)).toString("base64");
const font = (fam, file, w) => `@font-face{font-family:"${fam}";font-weight:${w};src:url(data:font/woff2;base64,${b64("assets/fonts/" + file)}) format("woff2")}`;
const FONTS = [font("Chakra Petch", "chakra-petch-latin-700.woff2", 700), font("Chakra Petch", "chakra-petch-thai-700.woff2", 700),
  font("Kanit", "kanit-latin-500.woff2", 500), font("Kanit", "kanit-thai-500.woff2", 500), font("Plex Mono", "ibm-plex-mono-latin-600.woff2", 600)].join("\n");

const browser = await chromium.launch();
const page = await browser.newPage({deviceScaleFactor:1});
async function png(markup, size, out, transparent = true){
  await page.setViewportSize({width:size, height:size});
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`);
  await page.screenshot({path:rel(out), omitBackground:transparent, clip:{x:0, y:0, width:size, height:size}});
  console.log(out);
}
fs.writeFileSync(rel("favicon.svg"), svg.replace(' width="512" height="512"', ""));
console.log("favicon.svg");
for (const s of [16, 32, 192, 512]) await png(svg, s, `icon-${s}.png`);
await png(svg, 512, "assets/img/ui/logo.png");
await png(bleed, 512, "icon-maskable-512.png", false);
await png(bleed, 180, "apple-touch-icon.png", false);

/* share cards: the real Earth drawn on a sphere in the page (same maths as src/ui/earth.js), logo and title on the right */
const CARD = {
  th:{out:"og-image.png", kicker:"GLOBAL CLIMATE TASKFORCE · 2026 – 2050", line1:"ภารกิจกู้วิกฤตโลก", line2:"พาโลกถึง Net Zero ก่อนปี 2050", foot:"เกมวางแผนกลยุทธ์ · เล่นฟรีบนเว็บ"},
  en:{out:"og-image-en.png", kicker:"GLOBAL CLIMATE TASKFORCE · 2026 – 2050", line1:"Save the planet", line2:"Reach Net Zero before 2050", foot:"Climate strategy game · free in your browser"},
};
const tex = `data:image/webp;base64,${b64("assets/img/ui/loader-earth.webp")}`;
for (const L of ["th", "en"]){
  const c = CARD[L];
  await page.setViewportSize({width:1200, height:630});
  await page.setContent(`<!doctype html><html lang="${L}"><style>${FONTS}
    html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:radial-gradient(ellipse at 22% 55%,#0b2230 0%,#03090d 55%,#010406 100%);color:#e6f0ee}
    .e{position:absolute;left:-150px;top:-15px;width:660px;height:660px;border-radius:50%;box-shadow:0 0 0 2px rgba(127,240,228,.35),0 0 50px 8px rgba(79,209,197,.3),0 0 140px 30px rgba(79,209,197,.12)}
    .e canvas{width:100%;height:100%;border-radius:50%;display:block}
    .e::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 64% 36%,rgba(255,255,255,.1) 0%,rgba(0,0,0,0) 38%,rgba(0,4,10,.55) 72%,rgba(0,4,10,.92) 100%)}
    .p{position:absolute;left:580px;top:92px;width:560px;display:flex;flex-direction:column;gap:14px}
    .b{display:flex;align-items:center;gap:18px}.b svg{width:96px;height:96px}
    .k{font:600 15px/1.6 "Plex Mono";letter-spacing:.2em;color:#4fd1c5}
    h1{margin:6px 0 0;font:700 78px/1 "Chakra Petch";letter-spacing:.05em}h1 b{color:#4fd1c5}
    .l1{font:500 38px/1.2 Kanit}.l2{font:500 28px/1.3 Kanit;color:#cfe1de}
    .f{margin-top:18px;font:500 20px Kanit;color:#9fb8b4;display:flex;gap:10px;align-items:center}
    .f i{width:10px;height:10px;border-radius:50%;background:#5fd39a;display:inline-block}
    </style><div class="e"><canvas id="c" width="660" height="660"></canvas></div>
    <div class="p"><div class="b">${svg.replace(' width="512" height="512"', "")}<span class="k">${c.kicker.replace(" · ", "<br>")}</span></div>
    <h1>PROJECT <b>ZERO</b></h1><div class="l1">${c.line1}</div><div class="l2">${c.line2}</div><div class="f"><i></i>${c.foot}</div></div>
    <script>
    (async () => {
      const img = new Image(); img.src = ${JSON.stringify(tex)}; await img.decode();
      const W = img.naturalWidth, H = img.naturalHeight, t = document.createElement("canvas"); t.width = W; t.height = H;
      const tx = t.getContext("2d"); tx.drawImage(img, 0, 0); const src = new Uint32Array(tx.getImageData(0, 0, W, H).data.buffer);
      const cv = document.getElementById("c"), N = cv.width, ctx = cv.getContext("2d"), out = ctx.createImageData(N, N), d = new Uint32Array(out.data.buffer);
      const tilt = .32, ct = Math.cos(tilt), st = Math.sin(tilt), off = Math.floor(W * .1);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){
        const nx = (x + .5) / N * 2 - 1, ny = (y + .5) / N * 2 - 1, r2 = nx * nx + ny * ny; if (r2 > 1) continue;
        const z = Math.sqrt(1 - r2), y2 = ny * ct - z * st, z2 = ny * st + z * ct;
        let u = Math.floor((Math.atan2(nx, z2) / (2 * Math.PI) + .5) * W) + off; if (u >= W) u -= W;
        const v = Math.min(H - 1, Math.floor((.5 - Math.asin(Math.max(-1, Math.min(1, -y2))) / Math.PI) * H));
        d[y * N + x] = src[v * W + Math.min(W - 1, u)];
      }
      ctx.putImageData(out, 0, 0); document.title = "done";
    })();
    </script></html>`);
  await page.waitForFunction(() => document.title === "done");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path:rel(c.out)});
  console.log(c.out);
}
await browser.close();
