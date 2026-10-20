// Generates the new art for Project : 2050 (run once after changing the source):
//   • Lucide icons used anywhere in src/*.js (white, tinted in game) + the Terra coin
//   • character portraits (4 roles × 3 outfits + the advisor), ending illustrations, the game logo
//   • countrygeo.json: country outlines projected to world pixels (for borders, taps and labels)
// usage: cd gdevelop/_source/build && npm install && node gen-assets.mjs   (then node make-project.mjs --export)
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");                    // gdevelop/_source (src/, assetgen/)
const OUT = path.resolve(HERE, "../../assets");           // gdevelop/assets
const LUC_DIR = `${HERE}/node_modules/lucide-static/icons`;
const CHROME = process.env.CHROMIUM || undefined;          // optional: path to a Chromium for Playwright
fs.mkdirSync(`${OUT}/portraits`, {recursive:true}); fs.mkdirSync(`${OUT}/endings`, {recursive:true});

/* ---------------- icons: every lucide name that appears as a string in the source ---------------- */
const OLD = JSON.parse(fs.readFileSync(`${ROOT}/assetgen/lucide.json`, "utf8"));   // icons from the first version (e.g. music-off)
const names = new Set([...fs.readdirSync(LUC_DIR).filter(f => f.endsWith(".svg")).map(f => f.slice(0, -4)), ...Object.keys(OLD)]);
const used = new Set();
for (const f of fs.readdirSync(`${ROOT}/src`)){
  const s = fs.readFileSync(`${ROOT}/src/${f}`, "utf8");
  for (const m of s.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) used.add(m[1]);
  for (const m of s.matchAll(/["'`]([a-z][a-z0-9-]*[a-z0-9])["'`]/g)) if (names.has(m[1])) used.add(m[1]);
}
for (const n of ["circle-help", "lock-open", "loader", "check", "x", "circle", "terra"]) used.add(n);
const icons = [...used].filter(n => names.has(n)).sort();
console.log("icons", icons.length, "missing:", [...used].filter(n => !names.has(n) && n !== "terra").join(" "));
const inner = n => fs.existsSync(`${LUC_DIR}/${n}.svg`) ? fs.readFileSync(`${LUC_DIR}/${n}.svg`, "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "") : OLD[n];

/* ---------------- portraits ---------------- */
const SKIN = {sci:"#e9b98f", dip:"#c98e62", eco:"#f1c7a1", act:"#d6a074", adv:"#b8835c"};
const OUTFITS = {
  sci:{base:["#f4f7f8","#4fd1c5"], alt:["#2b3a55","#8fd0ff"], gold:["#f4f7f8","#f2c14e"]},
  dip:{base:["#1d3557","#e63946"], alt:["#3d2b56","#c3a6ff"], gold:["#1d3557","#f2c14e"]},
  eco:{base:["#5b4636","#f2b441"], alt:["#1f5f4f","#5fd39a"], gold:["#2a2a2a","#f2c14e"]},
  act:{base:["#2f9e6f","#ffffff"], alt:["#d94f3d","#ffe2b0"], gold:["#1f3a2e","#f2c14e"]},
  adv:{base:["#3b2e5a","#c3a6ff"]},
};
function portrait(id, outfit){
  const [cloth, acc] = OUTFITS[id][outfit] || OUTFITS[id].base, skin = SKIN[id], gold = outfit === "gold";
  const bg = {sci:"#16483f", dip:"#173a57", eco:"#4a3a16", act:"#4a1f1b", adv:"#2d2147"}[id];
  const hair = {sci:"#2b2b2b", dip:"#1a1210", eco:"#6b3f22", act:"#151515", adv:"#120d0b"}[id];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs><radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${bg}" stop-opacity="1"/><stop offset="1" stop-color="#061015"/></radialGradient>
  <clipPath id="c"><circle cx="128" cy="128" r="126"/></clipPath></defs>
  <g clip-path="url(#c)"><rect width="256" height="256" fill="url(#g)"/>
  <circle cx="128" cy="128" r="118" fill="none" stroke="${acc}" stroke-opacity=".18" stroke-width="10"/>`;
  // back hair (long styles)
  if (id === "dip") s += `<circle cx="128" cy="62" r="22" fill="${hair}"/>`;
  if (id === "adv") s += `<path d="M70 120 Q66 60 128 52 Q190 60 186 120 L190 190 L66 190Z" fill="${hair}"/>`;
  if (id === "eco") s += `<path d="M80 118 Q78 64 128 58 Q178 64 176 118 L178 150 L78 150Z" fill="${hair}"/>`;
  // shoulders / clothes
  s += `<path d="M28 256 Q34 186 128 178 Q222 186 228 256Z" fill="${cloth}"/>`;
  if (id === "sci"){ s += `<path d="M98 182 L128 236 L158 182 L150 180 L128 214 L106 180Z" fill="#2c6b62"/><path d="M60 256 L84 196 L98 256Z M196 256 L172 196 L158 256Z" fill="#d6dde0"/><rect x="164" y="214" width="26" height="8" rx="3" fill="${acc}"/>`; }
  if (id === "dip"){ s += `<path d="M104 182 L128 250 L152 182 L140 180 L128 206 L116 180Z" fill="#f1f1f1"/><path d="M122 196 L134 196 L138 244 L128 254 L118 244Z" fill="${acc}"/><circle cx="172" cy="214" r="9" fill="#4fd1c5"/><path d="M167 210 q5 3 3 8 M175 208 q-2 6 3 9" stroke="#1d6b4f" stroke-width="2.5" fill="none"/>`; }
  if (id === "eco"){ s += `<path d="M100 182 L128 230 L156 182 L146 180 L128 210 L110 180Z" fill="#f5efe6"/><rect x="164" y="206" width="30" height="22" rx="4" fill="#0b1a20"/><path d="M168 224 L176 216 L182 220 L190 210" stroke="${acc}" stroke-width="3" fill="none"/>`; }
  if (id === "act"){ s += `<path d="M90 186 Q128 214 166 186 L160 200 Q128 226 96 200Z" fill="${acc}" fill-opacity=".85"/><path d="M118 214 L118 244 M138 214 L138 244" stroke="${acc}" stroke-width="5"/><circle cx="182" cy="226" r="11" fill="#f2c14e"/><path d="M178 226 l4 4 l7 -9" stroke="#2b1d00" stroke-width="3" fill="none"/>`; }
  if (id === "adv"){ s += `<path d="M100 182 L128 222 L156 182Z" fill="#e7def7"/><rect x="116" y="222" width="24" height="5" rx="2" fill="${acc}"/>`; }
  // neck + head
  s += `<rect x="112" y="150" width="32" height="38" rx="12" fill="${skin}"/><path d="M112 172 Q128 184 144 172 L144 160 L112 160Z" fill="#000" fill-opacity=".12"/>
  <ellipse cx="128" cy="112" rx="44" ry="50" fill="${skin}"/>
  <ellipse cx="84" cy="116" rx="8" ry="12" fill="${skin}"/><ellipse cx="172" cy="116" rx="8" ry="12" fill="${skin}"/>`;
  // hair (front)
  if (id === "sci") s += `<path d="M84 104 Q82 58 128 56 Q176 56 172 104 Q164 80 142 78 Q118 90 92 84 Q86 92 84 104Z" fill="${hair}"/><path d="M90 92 Q100 64 128 62" stroke="#777" stroke-width="3" fill="none" opacity=".5"/>`;
  if (id === "dip") s += `<path d="M84 110 Q80 60 128 60 Q178 60 172 110 Q168 84 150 76 Q120 84 96 80 Q88 92 84 110Z" fill="${hair}"/>`;
  if (id === "eco") s += `<path d="M84 112 Q82 62 128 60 Q176 62 172 112 Q160 82 128 80 Q100 82 84 112Z" fill="${hair}"/>`;
  if (id === "act") s += `<path d="M84 98 Q86 58 130 58 Q172 60 172 98 Q150 84 128 86 Q104 84 84 98Z" fill="${hair}"/><path d="M82 92 Q128 70 174 92 L176 102 Q128 82 80 102Z" fill="${acc === "#ffffff" ? "#f2c14e" : acc}"/>`;
  if (id === "adv") s += `<path d="M84 112 Q82 60 128 58 Q176 60 172 112 Q164 76 128 76 Q96 76 84 112Z" fill="${hair}"/><path d="M80 112 Q78 136 92 140" stroke="#4fd1c5" stroke-width="5" fill="none"/><circle cx="94" cy="142" r="5" fill="#4fd1c5"/>`;
  // face
  s += `<ellipse cx="111" cy="116" rx="5" ry="6" fill="#1b1b1b"/><ellipse cx="145" cy="116" rx="5" ry="6" fill="#1b1b1b"/>
  <circle cx="113" cy="114" r="1.8" fill="#fff"/><circle cx="147" cy="114" r="1.8" fill="#fff"/>
  <path d="M101 104 Q111 98 120 103 M136 103 Q145 98 155 104" stroke="${hair}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M126 122 Q128 132 132 132" stroke="#000" stroke-opacity=".25" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M114 142 Q128 152 142 142" stroke="#7a3b2e" stroke-width="4" fill="none" stroke-linecap="round"/>
  <ellipse cx="100" cy="134" rx="8" ry="5" fill="#ff8a7a" fill-opacity=".25"/><ellipse cx="156" cy="134" rx="8" ry="5" fill="#ff8a7a" fill-opacity=".25"/>`;
  if (id === "sci") s += `<g fill="none" stroke="#1b1b1b" stroke-width="3.5"><circle cx="111" cy="116" r="13"/><circle cx="145" cy="116" r="13"/><path d="M124 116 L132 116"/></g>`;
  if (id === "eco") s += `<g fill="none" stroke="${acc}" stroke-width="3"><rect x="97" y="106" width="28" height="20" rx="6"/><rect x="131" y="106" width="28" height="20" rx="6"/><path d="M125 114 L131 114"/></g>`;
  if (gold) s += `<g transform="translate(196 52)"><path d="M0 -18 L5 -6 L18 -6 L8 2 L12 15 L0 7 L-12 15 L-8 2 L-18 -6 L-5 -6Z" fill="#f2c14e" stroke="#7a5a00" stroke-width="2"/></g><circle cx="128" cy="128" r="122" fill="none" stroke="#f2c14e" stroke-width="6"/>`;
  s += `</g></svg>`;
  return s;
}

/* ---------------- endings (1280×720) ---------------- */
const hills = (y, col, amp = 40, seed = 1) => { let d = `M0 720 L0 ${y}`; for (let x = 0; x <= 1280; x += 80){ d += ` Q${x + 40} ${y - amp * Math.sin((x + seed * 97) / 170)} ${x + 80} ${y + amp * .4 * Math.cos((x + seed * 53) / 120)}`; } return `<path d="${d} L1280 720Z" fill="${col}"/>`; };
const turbine = (x, y, s, col = "#f4f7f8", ang = 0) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-3 0 L3 0 L1.5 -120 L-1.5 -120Z" fill="${col}"/><g transform="translate(0 -120) rotate(${ang})"><path d="M0 0 L4 -2 L2 -62 L-1 -62Z" fill="${col}"/><path d="M0 0 L4 -2 L2 -62 L-1 -62Z" fill="${col}" transform="rotate(120)"/><path d="M0 0 L4 -2 L2 -62 L-1 -62Z" fill="${col}" transform="rotate(240)"/><circle r="5" fill="${col}"/></g></g>`;
const tree = (x, y, s, col = "#1f7a4f", trunk = "#5b3b25") => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="-10" width="8" height="30" fill="${trunk}"/><circle cy="-30" r="26" fill="${col}"/><circle cx="-16" cy="-16" r="18" fill="${col}"/><circle cx="16" cy="-16" r="18" fill="${col}"/></g>`;
const deadTree = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="#2a1508" stroke-width="7" stroke-linecap="round" fill="none"><path d="M0 20 L0 -50 M0 -20 L-22 -44 M0 -34 L18 -60 M-12 -32 L-24 -30"/></g>`;
const panel = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-40 0 L40 0 L30 -26 L-30 -26Z" fill="#1c3c66" stroke="#9fd0ff" stroke-width="2"/><path d="M-20 0 L-15 -26 M0 0 L0 -26 M20 0 L15 -26 M-36 -10 L36 -10" stroke="#9fd0ff" stroke-width="1.5"/><rect x="-3" y="0" width="6" height="16" fill="#8aa"/></g>`;
const city = (base, col, win, seed = 3) => { let s = ""; let x = 0, i = 0; while (x < 1280){ const w = 40 + ((i * 37 + seed * 11) % 50), h = 80 + ((i * 53 + seed * 29) % 190); s += `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${col}"/>`; if (win) for (let yy = base - h + 12; yy < base - 10; yy += 18) for (let xx = x + 8; xx < x + w - 8; xx += 14) if ((xx * 7 + yy * 3 + i) % 5 < 2) s += `<rect x="${xx}" y="${yy}" width="6" height="8" fill="${win}" opacity=".8"/>`; x += w + 6; i++; } return s; };
const birds = (n, col) => { let s = ""; for (let i = 0; i < n; i++){ const x = 300 + i * 70 + (i % 3) * 30, y = 140 + (i * 37) % 90; s += `<path d="M${x - 10} ${y} q10 -9 10 0 q0 -9 10 0" stroke="${col}" stroke-width="3" fill="none"/>`; } return s; };
function ending(kind){
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${{
    S:`<stop offset="0" stop-color="#3fa7e0"/><stop offset=".65" stop-color="#bfe8f5"/><stop offset="1" stop-color="#fff2c9"/>`,
    A:`<stop offset="0" stop-color="#4a8fc4"/><stop offset=".7" stop-color="#cfe2e8"/><stop offset="1" stop-color="#f6e2b8"/>`,
    B:`<stop offset="0" stop-color="#5e5a8a"/><stop offset=".6" stop-color="#e8a072"/><stop offset="1" stop-color="#f6d08a"/>`,
    heat:`<stop offset="0" stop-color="#5a0d0a"/><stop offset=".55" stop-color="#d9481e"/><stop offset="1" stop-color="#ffb04a"/>`,
    vote:`<stop offset="0" stop-color="#140c2a"/><stop offset=".6" stop-color="#4a2a5e"/><stop offset="1" stop-color="#c4566a"/>`,
    time:`<stop offset="0" stop-color="#3b4248"/><stop offset=".6" stop-color="#7d8589"/><stop offset="1" stop-color="#b0a58c"/>`,
  }[kind]}</linearGradient>
  <radialGradient id="sun"><stop offset="0" stop-color="#fff7d6"/><stop offset=".5" stop-color="#ffd76a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd76a" stop-opacity="0"/></radialGradient>
  <radialGradient id="hot"><stop offset="0" stop-color="#fff1c4"/><stop offset=".35" stop-color="#ff9a3c" stop-opacity=".95"/><stop offset="1" stop-color="#ff5a1e" stop-opacity="0"/></radialGradient>
  </defs><rect width="1280" height="720" fill="url(#sky)"/>`;
  if (kind === "S" || kind === "A" || kind === "B"){
    s += `<circle cx="${kind === "B" ? 980 : 1000}" cy="${kind === "B" ? 430 : 210}" r="${kind === "B" ? 190 : 150}" fill="url(#sun)"/>`;
    if (kind === "S") s += `<g fill="none" stroke-width="16" opacity=".55"><path d="M120 560 A520 520 0 0 1 1160 560" stroke="#ff6b6b"/><path d="M136 560 A504 504 0 0 1 1144 560" stroke="#ffd166"/><path d="M152 560 A488 488 0 0 1 1128 560" stroke="#6bd38a"/><path d="M168 560 A472 472 0 0 1 1112 560" stroke="#5aa9e6"/></g>`;
    s += birds(kind === "B" ? 3 : 7, "#2b3a44");
    s += city(520, kind === "B" ? "#8a7d90" : "#a9c6cf", kind === "B" ? null : "#ffffff", 5);
    for (let i = 0; i < 7; i++) s += turbine(120 + i * 170, 470 + (i % 2) * 20, .9 - (i % 3) * .1, "#f7fbfc", i * 25);
    s += hills(520, kind === "B" ? "#8f9a52" : "#5fbf6a", 30, 1);
    s += hills(590, kind === "B" ? "#6f7d3a" : "#2f9e5c", 40, 2);
    for (let i = 0; i < (kind === "S" ? 16 : kind === "A" ? 10 : 5); i++) s += tree(40 + i * 82 + (i % 2) * 20, 640 + (i % 3) * 18, .9 + (i % 4) * .15, i % 2 ? "#1f7a4f" : "#2a8f5a");
    for (let i = 0; i < 5; i++) s += panel(760 + i * 95, 690, 1);
    if (kind === "B") for (let i = 0; i < 4; i++) s += `<ellipse cx="${200 + i * 260}" cy="${650 + (i % 2) * 20}" rx="70" ry="14" fill="#b48a52" opacity=".7"/>`;
    s += hills(690, kind === "B" ? "#55602c" : "#1d6b45", 18, 3);
  } else if (kind === "heat"){
    s += `<circle cx="640" cy="300" r="330" fill="url(#hot)"/>`;
    s += city(470, "#3a120a", null, 7);
    s += `<rect y="470" width="1280" height="250" fill="#8a3a14"/>`;
    for (let i = 0; i < 26; i++){ const x = (i * 97) % 1280, y = 500 + (i * 53) % 200; s += `<path d="M${x} ${y} l30 12 l-12 22 l26 10" stroke="#3a1206" stroke-width="3" fill="none"/>`; }
    for (let i = 0; i < 7; i++) s += deadTree(90 + i * 180, 560 + (i % 2) * 40, 1.1);
    for (let i = 0; i < 6; i++) s += `<path d="M${100 + i * 220} 440 q20 -20 0 -40 q-20 -20 0 -40" stroke="#ffd2a0" stroke-width="3" fill="none" opacity=".35"/>`;
    s += `<g opacity=".8">${[200, 560, 980].map(x => `<path d="M${x} 470 q-30 -60 0 -110 q20 40 40 0 q30 60 -10 110Z" fill="#ff6a2a"/>`).join("")}</g>`;
  } else if (kind === "vote"){
    s += city(520, "#241638", "#ffcf6e", 9);
    s += `<rect y="520" width="1280" height="200" fill="#1a1028"/>`;
    // podium
    s += `<path d="M560 520 L720 520 L700 420 L580 420Z" fill="#3a2a52" stroke="#c3a6ff" stroke-width="3"/><circle cx="640" cy="470" r="18" fill="none" stroke="#c3a6ff" stroke-width="3"/><path d="M700 412 L760 470" stroke="#999" stroke-width="5"/><circle cx="764" cy="474" r="9" fill="#666"/>`;
    // crowd + signs
    for (let i = 0; i < 26; i++){ const x = 20 + i * 50, y = 640 + (i % 3) * 18; s += `<circle cx="${x}" cy="${y - 52}" r="15" fill="#0c0714"/><path d="M${x - 20} 720 Q${x - 18} ${y - 34} ${x} ${y - 34} Q${x + 18} ${y - 34} ${x + 20} 720Z" fill="#0c0714"/>`; if (i % 4 === 1) s += `<rect x="${x - 22}" y="${y - 140}" width="44" height="30" fill="#f2c14e"/><rect x="${x - 2}" y="${y - 110}" width="4" height="40" fill="#0c0714"/><path d="M${x - 14} ${y - 125} l28 0" stroke="#5a1a1a" stroke-width="5"/>`; if (i % 4 === 3) s += `<path d="M${x + 6} ${y - 70} l18 -26" stroke="#0c0714" stroke-width="8" stroke-linecap="round"/>`; }
  } else if (kind === "time"){
    s += city(500, "#4c5256", "#e0d4a0", 4);
    for (let i = 0; i < 5; i++) s += `<rect x="${150 + i * 230}" y="${330 + (i % 2) * 30}" width="34" height="170" fill="#2f3438"/><circle cx="${167 + i * 230}" cy="${300 + (i % 2) * 30}" r="${40 + i * 4}" fill="#6d7174" opacity=".7"/><circle cx="${190 + i * 230}" cy="${260 + (i % 2) * 30}" r="${50 + i * 3}" fill="#878b8c" opacity=".55"/>`;
    s += `<rect y="500" width="1280" height="220" fill="#5d6a4a"/>`;
    for (let i = 0; i < 8; i++) s += tree(70 + i * 160, 640 + (i % 2) * 20, .8, "#4e7a4a", "#4a3626");
    // hourglass
    s += `<g transform="translate(640 330)"><rect x="-90" y="-170" width="180" height="16" rx="6" fill="#d9c79a"/><rect x="-90" y="154" width="180" height="16" rx="6" fill="#d9c79a"/><path d="M-70 -154 L70 -154 Q70 -60 10 0 Q70 60 70 154 L-70 154 Q-70 60 -10 0 Q-70 -60 -70 -154Z" fill="#e8f1f4" fill-opacity=".35" stroke="#e8f1f4" stroke-width="4"/><path d="M-6 0 L6 0 L60 150 L-60 150Z" fill="#d9a441"/><path d="M-30 -100 L30 -100 L4 -6 L-4 -6Z" fill="#d9a441" opacity=".5"/></g>`;
  }
  s += `<rect width="1280" height="720" fill="#000" opacity="${kind === "S" ? 0 : .08}"/></svg>`;
  return s;
}
/* ---------------- logo + Terra coin ---------------- */
const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><defs>
<radialGradient id="o" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#5fd3c8"/><stop offset="1" stop-color="#0d4e5c"/></radialGradient>
<clipPath id="cl"><circle cx="150" cy="150" r="96"/></clipPath></defs>
<circle cx="150" cy="150" r="140" fill="#061015"/><circle cx="150" cy="150" r="128" fill="none" stroke="#4fd1c5" stroke-width="8"/>
<circle cx="150" cy="150" r="96" fill="url(#o)"/>
<g clip-path="url(#cl)" fill="#2f9e6f"><path d="M70 110 q30 -30 60 -10 q20 10 10 30 q-20 10 -10 30 q10 30 -20 40 q-30 0 -40 -30 q-20 -30 0 -60Z"/><path d="M170 80 q40 0 60 30 q10 30 -20 30 q-20 0 -30 20 q-10 20 -30 0 q-10 -30 0 -50 q5 -25 20 -30Z"/><path d="M180 190 q30 0 40 20 q-10 30 -40 30 q-20 -20 0 -50Z"/></g>
<path d="M196 70 Q246 70 246 120 Q196 124 188 96 Q186 78 196 70Z" fill="#9be89a" stroke="#0c3a26" stroke-width="5"/><path d="M190 100 Q214 92 240 76" stroke="#0c3a26" stroke-width="4" fill="none"/>
<path id="arc" d="M58 150 A92 92 0 0 0 242 150" fill="none"/>
<text font-family="Arial Black, Arial" font-weight="900" font-size="34" fill="#e6f0ee" letter-spacing="6"><textPath href="#arc" startOffset="50%" text-anchor="middle">2050</textPath></text>
</svg>`;
const terra = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><radialGradient id="t" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#7fe3d8"/><stop offset="1" stop-color="#147a7a"/></radialGradient><clipPath id="tc"><circle cx="32" cy="32" r="24"/></clipPath></defs>
<circle cx="32" cy="32" r="30" fill="#f2c14e"/><circle cx="32" cy="32" r="27" fill="#b8860b"/><circle cx="32" cy="32" r="24" fill="url(#t)"/>
<g clip-path="url(#tc)" fill="#3fbf6f"><path d="M12 26 q8 -10 18 -4 q4 6 -2 10 q-4 6 0 12 q-4 6 -10 2 q-8 -8 -6 -20Z"/><path d="M36 16 q12 0 16 10 q-4 6 -10 4 q-6 4 -8 -2 q-2 -8 2 -12Z"/><path d="M40 38 q8 0 10 6 q-4 8 -12 6 q-2 -8 2 -12Z"/></g>
<path d="M44 6 Q58 6 58 20 Q46 20 43 13 Q42 8 44 6Z" fill="#9be89a" stroke="#0c3a26" stroke-width="2"/></svg>`;

/* ---------------- country outlines → world px ---------------- */
function countryGeo(){
  const META = JSON.parse(fs.readFileSync(`${ROOT}/assetgen/mapmeta.json`, "utf8")).meta;
  const win = {}; new Function("window", fs.readFileSync(`${ROOT}/assetgen/geo.js`, "utf8"))(win);
  const P = {}; const fakeWin = {P2050:P};
  for (const f of ["14-data-world.js"]) new Function("window", fs.readFileSync(`${ROOT}/src/${f}`, "utf8"))(fakeWin);
  const byGeo = P.COUNTRY_BY_GEO;
  const ROB = [[1.0000,0.0000],[0.9986,0.0620],[0.9954,0.1240],[0.9900,0.1860],[0.9822,0.2480],[0.9730,0.3100],[0.9600,0.3720],[0.9427,0.4340],[0.9216,0.4958],[0.8962,0.5571],[0.8679,0.6176],[0.8350,0.6769],[0.7986,0.7346],[0.7597,0.7903],[0.7186,0.8435],[0.6732,0.8936],[0.6213,0.9394],[0.5722,0.9761],[0.5322,1.0000]];
  const MAP_TOP = 84;
  const proj = (lat, l) => { lat = Math.max(META.LAT_BOT, Math.min(META.LAT_TOP, lat)); const a = Math.min(90, Math.abs(lat)) / 5, i = Math.min(17, Math.floor(a)), f = a - i; const X = ROB[i][0] + (ROB[i+1][0] - ROB[i][0]) * f, Y = ROB[i][1] + (ROB[i+1][1] - ROB[i][1]) * f; return [(0.8487 * X * l * Math.PI / 180 + META.XR) * META.U / META.SS, MAP_TOP + (META.YT - 1.3523 * Y * Math.sign(lat)) * META.U / META.SS]; };
  const out = [];
  for (const [reg, name, polys] of win.GEO){
    if (reg === "X") continue;
    const rings = []; let best = null, bestA = 0;
    for (const poly of polys) for (const ring of poly){
      const pts = []; let prev = null;
      for (let i = 0; i < ring.length; i += 2){
        let l = ring[i] / 10 - META.LON0; const lat = ring[i + 1] / 10;
        while (l <= -180) l += 360; while (l > 180) l -= 360;
        if (prev !== null){ while (l - prev > 180) l -= 360; while (l - prev < -180) l += 360; }
        prev = l;
        const [x, y] = proj(lat, Math.max(-180, Math.min(180, l)));
        const lx = pts[pts.length - 2], ly = pts[pts.length - 1];
        if (pts.length && Math.abs(lx - x) + Math.abs(ly - y) < 0.8) continue;
        pts.push(+x.toFixed(1), +y.toFixed(1));
      }
      if (pts.length < 6) continue;
      rings.push(pts);
      let A = 0, cx = 0, cy = 0; for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2){ const c = pts[j] * pts[i + 1] - pts[i] * pts[j + 1]; A += c; cx += (pts[j] + pts[i]) * c; cy += (pts[j + 1] + pts[i + 1]) * c; }
      if (Math.abs(A) > bestA){ bestA = Math.abs(A); best = [cx / (3 * A), cy / (3 * A)]; }
    }
    if (!rings.length) continue;
    const xs = rings.flatMap(r => r.filter((_, i) => i % 2 === 0)), ys = rings.flatMap(r => r.filter((_, i) => i % 2 === 1));
    out.push({g:name, c:byGeo[name] || null, r:reg, p:rings, b:[Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], cx:+best[0].toFixed(1), cy:+best[1].toFixed(1)});
  }
  // a few label nudges (centroid of the biggest piece lands badly)
  const nudge = {USA:[0, 10], CAN:[-20, 30], RUS:[-60, 20], NOR:[-6, 18], IDN:[-30, 4], CHL:[4, -40], MYS:[-40, -6]};
  for (const g of out) if (g.c && nudge[g.c]){ g.cx += nudge[g.c][0]; g.cy += nudge[g.c][1]; }
  const missing = P.COUNTRIES.filter(c => !out.some(g => g.c === c.id)).map(c => c.id);
  console.log("countries with outlines:", out.filter(g => g.c).length, "/", P.COUNTRIES.length, "missing:", missing.join(" "), "total shapes:", out.length);
  fs.writeFileSync(`${ROOT}/assetgen/countrygeo.json`, JSON.stringify(out));
}

/* ---------------- render everything ---------------- */
countryGeo();
const browser = await chromium.launch(CHROME ? {executablePath:CHROME} : {});
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");
async function render(svg, w, h, file, type = "png", quality = .9){
  const data = await page.evaluate(async ([svg, w, h, type, quality]) => {
    const im = new Image(); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await im.decode();
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(im, 0, 0, w, h);
    return c.toDataURL(type === "jpg" ? "image/jpeg" : "image/png", quality);
  }, [svg, w, h, type, quality]);
  fs.writeFileSync(file, Buffer.from(data.split(",")[1], "base64"));
}
for (const n of icons){
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner(n)}</svg>`;
  await render(svg, 64, 64, `${OUT}/icons/${n}.png`);
}
await render(terra, 64, 64, `${OUT}/icons/terra.png`);
for (const id of ["sci", "dip", "eco", "act"]) for (const o of ["base", "alt", "gold"]) await render(portrait(id, o), 256, 256, `${OUT}/portraits/${id}-${o}.png`);
await render(portrait("adv", "base"), 256, 256, `${OUT}/portraits/adv.png`);
for (const [k, f] of [["S", "end-win-S"], ["A", "end-win-A"], ["B", "end-win-B"], ["heat", "end-heat"], ["vote", "end-vote"], ["time", "end-time"]]) await render(ending(k), 1280, 720, `${OUT}/endings/${f}.jpg`, "jpg", .86);
await render(logo, 300, 300, `${OUT}/ui/logo.png`);
await browser.close();
// remove icons that are no longer used
const keep = new Set([...icons, "terra"]);
for (const f of fs.readdirSync(`${OUT}/icons`)) if (f.endsWith(".png") && !keep.has(f.slice(0, -4))) fs.unlinkSync(`${OUT}/icons/${f}`);
console.log("done");
