/* 2.0 · Characters drawn by hand in code (SVG shapes, no AI): the six leaders, the advisor and the three people of the story.
   Each one has their own face shape, eyes, brows, hair, age, clothes and a background that says what they do.
   Output: assets/img/portraits/{sci,dip,eco,act,oce,eng}-{base,alt,gold}.jpg, adv.jpg, fon.jpg, lung.jpg, opp.jpg (600×640)
   3.9: + the people who speak during the game: ali, tala, ravi, jonas, rahima, lekuta, maria, kaue, mei, sofia, hiro, amina, nils, khalid, elena, noi
   Usage: node tools/make-people.mjs [--out dir] [--sheet sheet.png] [--only sci,fon] */
import {chromium} from "playwright";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg("--out", path.join(HERE, "../../assets/img/portraits"));
const W = 600, H = 640;

/* ---------------- palettes ---------------- */
const SKIN = {
  fair:  {base:"#f1cdb0", shade:"#dba98a", deep:"#c08466", hi:"#fbe3cf", blush:"#ee9f8f", lip:"#c9786f"},
  warm:  {base:"#e5b48f", shade:"#cc9370", deep:"#a96f50", hi:"#f5d0b2", blush:"#e79079", lip:"#b86a5c"},
  tan:   {base:"#d29b72", shade:"#b67d57", deep:"#8f5c3c", hi:"#e8b993", blush:"#d67d64", lip:"#a3594a"},
  brown: {base:"#b77e56", shade:"#9a6340", deep:"#764729", hi:"#cf9a72", blush:"#bf6b52", lip:"#8a4a3a"},
};
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k))); return "#" + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, "0")).join(""); };

/* ---------------- shapes ---------------- */
/* face outline: centre, width, height, jaw (0.6 narrow … 0.95 square), chin roundness */
function faceD(cx, cy, w, h, jaw, chin = .22){
  const hw = w / 2, top = cy - h * .5, bot = cy + h * .5, jx = hw * jaw, jy = cy + h * .3, cw = w * chin;
  return `M${cx},${top}
    C${cx + hw * .62},${top} ${cx + hw},${cy - h * .32} ${cx + hw},${cy - h * .06}
    C${cx + hw},${cy + h * .1} ${cx + jx + 4},${jy - h * .06} ${cx + jx},${jy}
    C${cx + jx - 8},${jy + h * .12} ${cx + cw},${bot} ${cx},${bot}
    C${cx - cw},${bot} ${cx - jx + 8},${jy + h * .12} ${cx - jx},${jy}
    C${cx - jx - 4},${jy - h * .06} ${cx - hw},${cy + h * .1} ${cx - hw},${cy - h * .06}
    C${cx - hw},${cy - h * .32} ${cx - hw * .62},${top} ${cx},${top} Z`;
}
/* one eye: x, y, width, shape {tilt, open, lids, lash, iris colour, bags, look} */
function eye(x, y, w, o, side, id){
  const h = w * (o.open ?? .5), t = (o.tilt ?? 0) * side, lx = x - w / 2, rx = x + w / 2;
  const outerY = y - t * w * .18, innerY = y + t * w * .05;
  const ox = side > 0 ? rx : lx, ix = side > 0 ? lx : rx, oy = outerY, iy = innerY;
  const top = `M${ix},${iy} C${ix + (ox - ix) * .25},${y - h * 1.05} ${ix + (ox - ix) * .75},${y - h * 1.0} ${ox},${oy}`;
  const bot = `C${ix + (ox - ix) * .7},${y + h * .62} ${ix + (ox - ix) * .3},${y + h * .7} ${ix},${iy} Z`;
  const shape = top + " " + bot;
  const ir = w * (o.iris ?? .23), cxI = x + (o.look || 0) * w * .08, cyI = y + h * .05;
  const lid = `M${ix - side * 2},${iy + 1} C${ix + (ox - ix) * .25},${y - h * 1.12} ${ix + (ox - ix) * .75},${y - h * 1.07} ${ox + side * 4},${oy - 2}`;
  return `<g>
    <path d="${shape}" fill="#fbfaf7"/>
    <clipPath id="${id}"><path d="${shape}"/></clipPath>
    <g clip-path="url(#${id})">
      <circle cx="${cxI}" cy="${cyI}" r="${ir}" fill="${o.eyeCol || "#4a2f1f"}"/>
      <circle cx="${cxI}" cy="${cyI}" r="${ir * .55}" fill="#140d09"/>
      <circle cx="${cxI - ir * .35}" cy="${cyI - ir * .4}" r="${ir * .3}" fill="#fff" opacity=".95"/>
      <circle cx="${cxI + ir * .4}" cy="${cyI + ir * .35}" r="${ir * .12}" fill="#fff" opacity=".7"/>
      <path d="M${lx - 4},${y - h * 1.3} L${rx + 4},${y - h * 1.3} L${rx + 4},${y - h * .25} C${x},${y - h * .55} ${x},${y - h * .55} ${lx - 4},${y - h * .25} Z" fill="#000" opacity=".12"/>
    </g>
    <path d="${lid}" fill="none" stroke="${o.lidCol || "#2a1a12"}" stroke-width="${o.lidW || 4.5}" stroke-linecap="round"/>
    ${o.crease ? `<path d="M${ix + (ox - ix) * .22},${y - h * 1.3} C${ix + (ox - ix) * .45},${y - h * 1.62} ${ix + (ox - ix) * .75},${y - h * 1.55} ${ix + (ox - ix) * .92},${y - h * 1.05}" fill="none" stroke="#7a4a35" stroke-width="1.8" opacity=".5"/>` : ""}
    ${o.lash ? `<path d="M${ox + side * 2},${oy - 2} q${side * 6},-2 ${side * 10},-9" stroke="${o.lidCol || "#2a1a12"}" stroke-width="3.2" fill="none" stroke-linecap="round"/>` : ""}
    ${o.lower !== false ? `<path d="M${ix + (ox - ix) * .15},${y + h * .5} C${ix + (ox - ix) * .45},${y + h * .72} ${ix + (ox - ix) * .8},${y + h * .6} ${ox},${oy + 1}" fill="none" stroke="#7a4a35" stroke-width="1.4" opacity=".55"/>` : ""}
    ${o.bags ? `<path d="M${ix + (ox - ix) * .2},${y + h * .95} C${ix + (ox - ix) * .5},${y + h * 1.25} ${ix + (ox - ix) * .85},${y + h * 1.05} ${ox + side * 4},${y + h * .55}" fill="none" stroke="#7a4a35" stroke-width="1.6" opacity=".45"/>` : ""}
    ${o.crow ? `<path d="M${ox + side * 8},${oy - 2} l${side * 10},-4 M${ox + side * 9},${oy + 4} l${side * 11},2" stroke="#7a4a35" stroke-width="1.5" opacity=".45" stroke-linecap="round"/>` : ""}
  </g>`;
}
/* eyebrow: x, y, width, thickness, angle (− = angry … + = worried), arch, colour */
function brow(x, y, w, th, ang, arch, col, side){
  const ix = x - side * w / 2, ox = x + side * w / 2, iy = y + ang * 6, oy = y - ang * 2 + 4;
  const my = y - arch;
  return `<path d="M${ix},${iy} C${ix + (ox - ix) * .35},${my - th * .2} ${ix + (ox - ix) * .7},${my - th * .1} ${ox},${oy} C${ix + (ox - ix) * .7},${my + th * .55} ${ix + (ox - ix) * .35},${my + th * .7} ${ix},${iy + th} Z" fill="${col}"/>`;
}
function mouth(cx, y, w, kind, sk){
  const hw = w / 2;
  if (kind === "grin") return `<path d="M${cx - hw},${y} C${cx - hw * .5},${y + w * .42} ${cx + hw * .5},${y + w * .42} ${cx + hw},${y} C${cx + hw * .45},${y + w * .1} ${cx - hw * .45},${y + w * .1} ${cx - hw},${y} Z" fill="#6b2a24"/>
      <path d="M${cx - hw * .82},${y + 3} C${cx - hw * .4},${y + w * .12} ${cx + hw * .4},${y + w * .12} ${cx + hw * .82},${y + 3} L${cx + hw * .7},${y + w * .13} C${cx + hw * .3},${y + w * .2} ${cx - hw * .3},${y + w * .2} ${cx - hw * .7},${y + w * .13} Z" fill="#fbfaf5"/>
      <path d="M${cx - hw * .45},${y + w * .3} C${cx - hw * .15},${y + w * .36} ${cx + hw * .15},${y + w * .36} ${cx + hw * .45},${y + w * .3} C${cx + hw * .2},${y + w * .24} ${cx - hw * .2},${y + w * .24} ${cx - hw * .45},${y + w * .3} Z" fill="#c7615a"/>
      <path d="M${cx - hw - 3},${y - 2} q-4,4 -2,9 M${cx + hw + 3},${y - 2} q4,4 2,9" stroke="${sk.deep}" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>`;
  if (kind === "smirk") return `<path d="M${cx - hw},${y + 4} C${cx - hw * .3},${y + w * .16} ${cx + hw * .4},${y + w * .1} ${cx + hw},${y - w * .1}" stroke="#6b2a24" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M${cx - hw * .6},${y + w * .2} C${cx - hw * .1},${y + w * .3} ${cx + hw * .4},${y + w * .24} ${cx + hw * .7},${y + w * .1}" stroke="${sk.lip}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`;
  if (kind === "open") return `<path d="M${cx - hw},${y} C${cx - hw * .4},${y + w * .55} ${cx + hw * .4},${y + w * .55} ${cx + hw},${y} C${cx + hw * .4},${y + w * .08} ${cx - hw * .4},${y + w * .08} ${cx - hw},${y} Z" fill="#5e211d"/>
      <path d="M${cx - hw * .75},${y + 2} C${cx - hw * .35},${y + w * .1} ${cx + hw * .35},${y + w * .1} ${cx + hw * .75},${y + 2} L${cx + hw * .62},${y + w * .12} C${cx},${y + w * .17} ${cx},${y + w * .17} ${cx - hw * .62},${y + w * .12} Z" fill="#fbfaf5"/>
      <ellipse cx="${cx}" cy="${y + w * .34}" rx="${hw * .45}" ry="${w * .09}" fill="#c7615a"/>`;
  // smile (closed)
  return `<path d="M${cx - hw},${y} C${cx - hw * .4},${y + w * .3} ${cx + hw * .4},${y + w * .3} ${cx + hw},${y}" stroke="#7a3029" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M${cx - hw * .55},${y + w * .26} C${cx - hw * .2},${y + w * .36} ${cx + hw * .2},${y + w * .36} ${cx + hw * .55},${y + w * .26}" stroke="${sk.lip}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>`;
}
function nose(cx, y, w, sk, kind){
  return `<path d="M${cx + w * .12},${y - w * .9} C${cx + w * .2},${y - w * .4} ${cx + w * .32},${y - w * .1} ${cx + w * .3},${y + w * .05}" stroke="${sk.deep}" stroke-width="2.4" fill="none" opacity=".5" stroke-linecap="round"/>
    <path d="M${cx - w * .42},${y + w * .1} C${cx - w * .3},${y + w * .32} ${cx - w * .1},${y + w * .3} ${cx},${y + w * .34} C${cx + w * .1},${y + w * .3} ${cx + w * .3},${y + w * .32} ${cx + w * .42},${y + w * .1}" stroke="${sk.deep}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>
    <ellipse cx="${cx - w * .2}" cy="${y + w * .2}" rx="${w * .09}" ry="${w * .05}" fill="${sk.deep}" opacity=".6"/><ellipse cx="${cx + w * .2}" cy="${y + w * .2}" rx="${w * .09}" ry="${w * .05}" fill="${sk.deep}" opacity=".6"/>
    ${kind === "wide" ? `<path d="M${cx - w * .48},${y + w * .02} q-6,10 2,16 M${cx + w * .48},${y + w * .02} q6,10 -2,16" stroke="${sk.deep}" stroke-width="2.4" fill="none" opacity=".6"/>` : ""}
    <ellipse cx="${cx - w * .05}" cy="${y - w * .12}" rx="${w * .1}" ry="${w * .2}" fill="${sk.hi}" opacity=".6"/>`;
}
/* shoulders + neck shadow, then the clothes the character adds */
function body(o){
  const sk = SKIN[o.skin], nw = o.neckW || 70;
  return `<path d="M${300 - nw / 2},${o.neckTop || 400} L${300 - nw / 2 - 4},${o.neckBot || 500} L${300 + nw / 2 + 4},${o.neckBot || 500} L${300 + nw / 2},${o.neckTop || 400} Z" fill="${sk.base}"/>
    <path d="M${300 - nw / 2},${o.neckTop || 400} L${300 - nw / 2 - 2},${(o.neckTop || 400) + 60} C${300},${(o.neckTop || 400) + 92} ${300},${(o.neckTop || 400) + 92} ${300 + nw / 2 + 2},${(o.neckTop || 400) + 60} L${300 + nw / 2},${o.neckTop || 400} Z" fill="${sk.shade}"/>
    ${o.clothes}`;
}
const frame = (o, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="${o.bg[0]}"/><stop offset=".6" stop-color="${o.bg[1]}"/><stop offset="1" stop-color="${o.bg[2]}"/></radialGradient>
    <linearGradient id="skinG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${SKIN[o.skin].hi}"/><stop offset=".45" stop-color="${SKIN[o.skin].base}"/><stop offset="1" stop-color="${SKIN[o.skin].shade}"/></linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${o.rim}" stop-opacity="0"/><stop offset="1" stop-color="${o.rim}" stop-opacity=".5"/></linearGradient>
    <radialGradient id="vig" cx=".5" cy=".45" r=".7"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g opacity=".16" stroke="${o.motifCol || "#fff"}" fill="none" stroke-width="2">${o.motif || ""}</g>
  <circle cx="300" cy="300" r="250" fill="${o.rim}" opacity=".07"/>
  ${inner}
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;

/* the whole head: back hair, ears, face, features, front hair, extras */
function head(o){
  const sk = SKIN[o.skin], cx = 300, cy = o.cy || 290, w = o.fw || 230, h = o.fh || 290;
  const e = o.eye || {}, ey = cy + h * (o.eyeY ?? .02), ex = w * (o.eyeX ?? .21), ew = w * (o.eyeW ?? .19);
  const by = ey - h * (o.browY ?? .1);
  const earY = ey + h * .05, earX = w / 2;
  const fd = faceD(cx, cy, w, h, o.jaw ?? .8, o.chin ?? .22);
  return `
    ${o.hairBack || ""}
    <g>
      <path d="M${cx - earX + 6},${earY - 30} C${cx - earX - 26},${earY - 40} ${cx - earX - 30},${earY + 30} ${cx - earX + 4},${earY + 34} Z" fill="${sk.base}"/>
      <path d="M${cx - earX + 2},${earY - 18} C${cx - earX - 14},${earY - 20} ${cx - earX - 16},${earY + 16} ${cx - earX + 2},${earY + 20}" stroke="${sk.deep}" stroke-width="3" fill="none" opacity=".5"/>
      <path d="M${cx + earX - 6},${earY - 30} C${cx + earX + 26},${earY - 40} ${cx + earX + 30},${earY + 30} ${cx + earX - 4},${earY + 34} Z" fill="${sk.shade}"/>
      <path d="M${cx + earX - 2},${earY - 18} C${cx + earX + 14},${earY - 20} ${cx + earX + 16},${earY + 16} ${cx + earX - 2},${earY + 20}" stroke="${sk.deep}" stroke-width="3" fill="none" opacity=".5"/>
      ${o.earrings || ""}
    </g>
    <path d="${fd}" fill="url(#skinG)"/><path d="${fd}" fill="none" stroke="${sk.deep}" stroke-width="2.5" opacity=".35"/>
    <clipPath id="faceclip-${o.id}"><path d="${fd}"/></clipPath>
    <g clip-path="url(#faceclip-${o.id})">
      <path d="M${cx + w * .18},${cy - h * .6} C${cx + w * .55},${cy - h * .2} ${cx + w * .5},${cy + h * .3} ${cx + w * .05},${cy + h * .62} L${cx + w},${cy + h} L${cx + w},${cy - h} Z" fill="${sk.shade}" opacity=".55"/>
      <ellipse cx="${cx - w * .2}" cy="${cy - h * .3}" rx="${w * .22}" ry="${h * .12}" fill="${sk.hi}" opacity=".45"/>
      <ellipse cx="${cx - w * .27}" cy="${ey + h * .15}" rx="${w * .1}" ry="${h * .045}" fill="${sk.blush}" opacity="${o.blush ?? .35}"/>
      <ellipse cx="${cx + w * .27}" cy="${ey + h * .15}" rx="${w * .1}" ry="${h * .045}" fill="${sk.blush}" opacity="${(o.blush ?? .35) * .8}"/>
      ${o.faceExtra || ""}
      ${o.hairShadow ? `<path d="${o.hairShadow}" fill="${sk.deep}" opacity=".35"/>` : ""}
    </g>
    ${eye(cx - ex, ey, ew, e, -1, "el-" + o.id)}${eye(cx + ex, ey, ew, e, 1, "er-" + o.id)}
    ${brow(cx - ex - 2, by, ew * 1.25, o.browTh || 9, o.browAng || 0, o.browArch || 6, o.browCol || o.hairCol, -1)}
    ${brow(cx + ex + 2, by, ew * 1.25, o.browTh || 9, o.browAng || 0, o.browArch || 6, o.browCol || o.hairCol, 1)}
    ${nose(cx, cy + h * (o.noseY ?? .2), w * (o.noseW ?? .13), sk, o.noseKind)}
    ${o.lines || ""}
    ${mouth(cx + (o.mouthX || 0), cy + h * (o.mouthY ?? .31), w * (o.mouthW ?? .2), o.mouth || "smile", sk)}
    ${o.beard || ""}
    ${o.hairFront || ""}
    ${o.extra || ""}`;
}
const person = o => frame(o, `<g transform="translate(300 340) scale(1.08) translate(-300 -340)">${body(o)}${head(o)}${o.top || ""}</g>`);

/* ---------------- clothes helpers ---------------- */
/* shoulders that slope down from the neck to the edge of the picture */
const shoulders = (fill, y = 470, w = 270) => `<path d="M${300 - w},640 L${300 - w + 6},${y + 92} C${300 - w + 14},${y + 46} ${300 - w + 56},${y + 26} ${300 - 120},${y + 8} C${300 - 90},${y} ${300 - 70},${y - 2} ${300 - 50},${y - 2} L${300 + 50},${y - 2} C${300 + 70},${y - 2} ${300 + 90},${y} ${300 + 120},${y + 8} C${300 + w - 56},${y + 26} ${300 + w - 14},${y + 46} ${300 + w - 6},${y + 92} L${300 + w},640 Z" fill="${fill}"/>
  <path d="M${300 - w + 10},${y + 90} C${300 - w + 20},${y + 50} ${300 - w + 60},${y + 30} ${300 - 120},${y + 12}" stroke="#fff" stroke-width="5" fill="none" opacity=".12" stroke-linecap="round"/>`;
const sideShade = (col, y = 470) => `<path d="M${300 + 60},${y} C${300 + 200},${y + 10} ${300 + 262},${y + 70} ${300 + 266},640 L${300 + 150},640 C${300 + 140},${y + 90} ${300 + 110},${y + 30} ${300 + 60},${y} Z" fill="${col}" opacity=".45"/>`;
const GOLD = "#f2c14e";

/* ---------------- the cast ---------------- */
/* Dr. Phupha · the Scientist: friendly, messy hair, round glasses, lab coat over a green shirt, a little stubble */
function sci(out){
  const gold = out === "gold", alt = out === "alt";
  const coat = alt ? "#6f7d4c" : "#f4f7f8", coatS = alt ? "#55623a" : "#cfdade", shirt = alt ? "#9aa3ab" : "#1f7a5f";
  const hairCol = "#1d1714";
  return person({id:"sci-" + out, skin:"warm", bg:gold ? ["#6b5520", "#2e2410", "#0c0904"] : ["#1e7a6c", "#0f3d39", "#051615"], rim:gold ? GOLD : "#7fe0cf",
    motif:`<g transform="translate(300 300)">${[0, 60, 120].map(a => `<ellipse rx="250" ry="90" transform="rotate(${a})"/>`).join("")}<circle r="22"/></g>
      ${Array.from({length:6}, (_, i) => `<path d="M${30 + i * 100},40 l25,-14 25,14 0,29 -25,14 -25,-14z"/>`).join("")}`,
    fw:232, fh:286, jaw:.84, chin:.26, hairCol, eye:{open:.52, tilt:.05, eyeCol:"#3d2618", look:.3}, browTh:9, browAng:-.2, browArch:7, mouth:"grin", mouthW:.24,
    clothes:`${shoulders(coat)}${sideShade(coatS)}
      <path d="M255,470 L300,560 L345,470 Z" fill="${shirt}"/><path d="M262,470 L300,548 L300,640 L230,640 L218,520 Z" fill="${coat}"/><path d="M338,470 L300,548 L300,640 L370,640 L382,520 Z" fill="${coatS}"/>
      <path d="M262,470 L300,548 M338,470 L300,548" stroke="${coatS}" stroke-width="5"/>
      <rect x="386" y="560" width="56" height="64" rx="7" fill="${alt ? "#4b5530" : "#e2ebee"}" stroke="${alt ? "#323920" : "#a8bac0"}" stroke-width="3"/>
      <rect x="396" y="550" width="8" height="34" rx="3" fill="#2f6fd0"/><rect x="410" y="548" width="8" height="36" rx="3" fill="#e0533e"/>
      ${gold ? `<circle cx="220" cy="580" r="13" fill="${GOLD}" stroke="#9c7419" stroke-width="3"/><path d="M214,580 l4,5 8,-10" stroke="#5c430c" stroke-width="3" fill="none"/>` : ""}`,
    hairBack:`<path d="M176,270 C164,170 228,124 302,126 C384,128 438,176 424,272 C414,236 398,214 380,206 L224,206 C204,214 186,236 176,270 Z" fill="${hairCol}"/>`,
    hairFront:`<path d="M180,236 C184,170 236,140 300,142 C370,144 420,176 420,236 C404,212 384,200 362,196 C358,210 346,214 332,206 C330,220 312,226 300,214 C292,228 268,230 262,214 C250,224 230,222 226,206 C206,210 190,220 180,236 Z" fill="${hairCol}"/>
      <path d="M248,160 C268,150 300,148 330,156 M224,180 C240,170 258,166 270,166" stroke="#3a2e28" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M296,128 C300,104 318,96 326,100 C316,110 312,120 314,134 Z" fill="${hairCol}"/>`,
    beard:`<path d="M232,410 C250,440 280,452 300,452 C320,452 350,440 368,410 C352,430 330,440 300,440 C270,440 248,430 232,410 Z" fill="${hairCol}" opacity=".25"/>`,
    extra:`<g fill="none" stroke="${gold ? GOLD : "#2a2522"}" stroke-width="6"><circle cx="252" cy="296" r="31"/><circle cx="348" cy="296" r="31"/><path d="M283,292 Q300,284 317,292 M221,288 L184,280 M379,288 L416,280"/></g>
      <g fill="#fff" opacity=".18"><path d="M232,284 a22,22 0 0 1 18,-14 l4,6 a18,18 0 0 0 -14,12z"/><path d="M328,284 a22,22 0 0 1 18,-14 l4,6 a18,18 0 0 0 -14,12z"/></g>`,
  });
}
/* Ambassador Waree · the Diplomat: elegant, sleek bun, pearl earrings, navy blazer with a scarf and pin, calm closed smile */
function dip(out){
  const gold = out === "gold", alt = out === "alt";
  const jacket = alt ? "#6d3a86" : "#24386a", jacketS = alt ? "#4c2460" : "#16244a", scarf = alt ? "#e7c76a" : "#4fa3d6";
  const hairCol = "#120d0c";
  return person({id:"dip-" + out, skin:"fair", bg:gold ? ["#6b5520", "#2e2410", "#0c0904"] : ["#2f5b98", "#162b52", "#071022"], rim:gold ? GOLD : "#8fd0ff",
    motif:`<g transform="translate(300 290)"><circle r="240"/><ellipse rx="120" ry="240"/><ellipse rx="60" ry="240"/><path d="M-240,0 H240 M-220,-90 H220 M-220,90 H220"/></g>`,
    fw:214, fh:292, jaw:.68, chin:.18, hairCol, eye:{open:.42, tilt:.2, lash:true, crease:true, eyeCol:"#2b1a12", lidW:5}, browTh:7, browAng:.05, browArch:9, mouth:"smile", mouthW:.19, blush:.4,
    earrings:`<circle cx="188" cy="352" r="7" fill="#f6f1e6" stroke="#cfc6b4" stroke-width="2"/><circle cx="412" cy="352" r="7" fill="#f6f1e6" stroke="#cfc6b4" stroke-width="2"/>`,
    clothes:`${shoulders(jacket, 474, 262)}${sideShade(jacketS, 474)}
      <path d="M262,474 L300,600 L338,474 Z" fill="#f2f0ea"/>
      <path d="M258,474 L232,520 L276,560 L300,600 Z" fill="${jacketS}"/><path d="M342,474 L368,520 L324,560 L300,600 Z" fill="${jacketS}"/>
      <path d="M248,478 C270,500 290,512 300,514 C312,512 334,500 352,478 C340,520 322,540 300,546 C278,540 260,520 248,478 Z" fill="${scarf}"/>
      <path d="M300,514 L286,560 L300,552 L314,560 Z" fill="${shade(scarf, .8)}"/>
      <circle cx="226" cy="560" r="10" fill="${gold ? GOLD : "#d9e2ea"}" stroke="#7a8ea3" stroke-width="2"/><path d="M220,560 h12 M226,554 v12" stroke="#7a8ea3" stroke-width="2"/>`,
    hairBack:`<path d="M186,300 C170,190 220,132 300,130 C380,132 430,190 414,300 C404,250 392,226 372,214 L228,214 C208,226 196,250 186,300 Z" fill="${hairCol}"/>
      <circle cx="300" cy="120" r="44" fill="${hairCol}"/><path d="M262,112 C280,96 320,96 338,112" stroke="${gold ? GOLD : "#3a3a48"}" stroke-width="5" fill="none"/>`,
    hairFront:`<path d="M188,252 C186,186 236,148 300,148 C364,148 414,186 412,252 C394,214 360,190 318,186 C300,196 266,206 236,212 C214,220 196,234 188,252 Z" fill="${hairCol}"/>
      <path d="M232,176 C262,160 300,156 340,166" stroke="#3a3436" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`,
  });
}
/* Khun Thara · the Economist: sharp bob, half-rim glasses, green suit, tablet with a chart, confident smile */
function eco(out){
  const gold = out === "gold", alt = out === "alt";
  const jacket = alt ? "#2f4a7a" : "#2f6a4f", jacketS = alt ? "#1f335a" : "#1e4a36";
  const hairCol = "#2b1a14";
  return person({id:"eco-" + out, skin:"tan", bg:gold ? ["#6b5520", "#2e2410", "#0c0904"] : ["#8a6420", "#4a3410", "#1a1106"], rim:gold ? GOLD : "#f2b441",
    motif:`<path d="M40,560 L140,470 L220,500 L320,360 L400,400 L540,200" stroke-width="5"/><path d="M500,200 L540,200 L540,240" stroke-width="5"/>${[60, 160, 260, 360, 460].map(x => `<rect x="${x}" y="${600 - (x % 7 + 3) * 22}" width="40" height="${(x % 7 + 3) * 22}"/>`).join("")}`,
    fw:222, fh:282, jaw:.74, chin:.2, hairCol, eye:{open:.44, tilt:.12, lash:true, eyeCol:"#3a2216", look:-.3}, browTh:8, browAng:-.12, browArch:8, mouth:"smirk", mouthW:.2, blush:.3,
    clothes:`${shoulders(jacket)}${sideShade(jacketS)}
      <path d="M268,470 L300,530 L332,470 Z" fill="#f5efe3"/>
      <path d="M262,470 L240,512 L282,540 L300,600 Z" fill="${jacketS}"/><path d="M338,470 L360,512 L318,540 L300,600 Z" fill="${jacketS}"/>
      <g transform="translate(160 540) rotate(-8)"><rect width="110" height="78" rx="8" fill="#141c22" stroke="#4b5a63" stroke-width="3"/><path d="M14,60 L40,40 L60,48 L94,16" stroke="${gold ? GOLD : "#5fd39a"}" stroke-width="5" fill="none" stroke-linecap="round"/></g>
      <path d="M396,560 l18,0 0,8 -18,0z" fill="${gold ? GOLD : "#f2b441"}"/>`,
    hairBack:`<path d="M168,360 C150,220 206,128 300,128 C394,128 450,220 432,360 C428,330 418,300 404,284 L196,284 C182,300 172,330 168,360 Z" fill="${hairCol}"/>`,
    hairFront:`<path d="M180,300 C172,196 230,144 300,144 C374,144 430,196 420,300 C410,248 388,214 352,198 C330,214 290,224 252,222 C226,226 200,250 180,300 Z" fill="${hairCol}"/>
      <path d="M300,150 C330,170 350,186 356,204" stroke="#4a3228" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`,
    extra:`<g fill="none" stroke="${gold ? GOLD : "#b98a2e"}" stroke-linecap="round"><path d="M212,276 h76 M312,276 h76" stroke-width="8"/><path d="M216,280 C214,304 222,316 250,316 C278,316 286,304 286,280 M314,280 C314,304 322,316 350,316 C378,316 386,304 384,280" stroke-width="3" opacity=".9"/><path d="M286,282 q14,-8 28,0" stroke-width="4"/><path d="M214,280 L190,274 M386,280 L410,274" stroke-width="4"/></g>
      <path d="M226,288 l14,-6" stroke="#fff" stroke-width="3" opacity=".35" stroke-linecap="round"/>`,
  });
}
/* Nong Mek · the Activist: young, short spiky hair, headband, hoodie with a leaf badge, big open laugh */
function act(out){
  const gold = out === "gold", alt = out === "alt";
  const hood = alt ? "#ffcf3a" : "#ff7a5c", hoodS = alt ? "#d9a812" : "#d9533a", band = gold ? GOLD : alt ? "#2f8a5e" : "#e0433e";
  const hairCol = "#141110";
  return person({id:"act-" + out, skin:"brown", bg:gold ? ["#6b5520", "#2e2410", "#0c0904"] : ["#8d3a2c", "#4a1914", "#1a0706"], rim:gold ? GOLD : "#ff9a7a",
    motif:`<g transform="translate(470 170)">${[60, 110, 160, 210].map(r => `<path d="M${-r * .7},${-r * .7} A${r},${r} 0 0 1 ${r * .7},${r * .7}" stroke-width="6"/>`).join("")}</g><path d="M60,520 l40,-120 40,120z M90,470 h20"/>`,
    fw:224, fh:280, jaw:.8, chin:.28, hairCol, eye:{open:.3, tilt:-.02, eyeCol:"#24150c", lidW:5.5, lower:false}, browTh:10, browAng:.1, browArch:9, mouth:"open", mouthW:.27, blush:.4, cy:296,
    clothes:`${shoulders(hood, 466, 276)}${sideShade(hoodS, 466)}
      <path d="M214,470 C230,520 270,546 300,546 C330,546 370,520 386,470 C360,500 330,512 300,512 C270,512 240,500 214,470 Z" fill="${hoodS}"/>
      <path d="M280,520 L276,600 M320,520 L324,600" stroke="#f4f0e8" stroke-width="6" stroke-linecap="round"/><circle cx="276" cy="604" r="6" fill="#f4f0e8"/><circle cx="324" cy="604" r="6" fill="#f4f0e8"/>
      <circle cx="384" cy="584" r="18" fill="${gold ? GOLD : "#5fd39a"}" stroke="${gold ? "#9c7419" : "#2f8a5e"}" stroke-width="4"/><path d="M376,588 q8,-18 18,-8 q-6,12 -18,8z" fill="#f2fff6"/>`,
    hairBack:`<path d="M178,262 C170,180 224,140 300,138 C376,140 432,180 422,262 Z" fill="${hairCol}"/>`,
    hairFront:`<path d="M180,240 L186,176 L204,190 L210,146 L236,170 L248,122 L272,158 L292,110 L312,152 L334,114 L350,160 L374,126 L384,172 L404,150 L408,194 L420,184 L420,240 C392,214 346,204 300,204 C254,204 208,214 180,240 Z" fill="${hairCol}"/>
      <path d="M240,170 L250,140 M290,150 L294,124 M336,154 L340,128" stroke="#3a2e28" stroke-width="4" stroke-linecap="round" opacity=".8"/>`,
    extra:`<path d="M182,224 C230,198 370,198 418,224 L420,250 C370,226 230,226 180,250 Z" fill="${band}"/><path d="M418,228 l28,-10 -6,24 z M420,236 l22,18 -24,4 z" fill="${band}"/><path d="M196,230 C240,212 360,212 404,230" stroke="#fff" stroke-width="3" opacity=".25" fill="none"/>`,
  });
}
/* Dr. Nawa · the Ocean Scientist: wavy shoulder hair, dive goggles pushed up, teal windbreaker, freckles, wide smile */
function oce(out){
  const gold = out === "gold", alt = out === "alt";
  const suit = alt ? "#ff9a4a" : "#1fb3a8", suitS = alt ? "#e0702a" : "#13807a";
  const hairCol = "#2a1812";
  return person({id:"oce-" + out, skin:"tan", bg:gold ? ["#6b5520", "#2e2410", "#0c0904"] : ["#1f73ad", "#0d3b62", "#051a2c"], rim:gold ? GOLD : "#8fd0ff",
    motif:`${[120, 200, 280, 360, 440, 520].map(y => `<path d="M0,${y} C60,${y - 26} 120,${y + 26} 180,${y} S300,${y - 26} 360,${y} S480,${y + 26} 600,${y}" stroke-width="4"/>`).join("")}`,
    fw:220, fh:286, jaw:.72, chin:.22, hairCol, eye:{open:.52, tilt:.08, lash:true, crease:true, eyeCol:"#2b1a10", iris:.25}, browTh:8, browAng:.08, browArch:8, mouth:"grin", mouthW:.23, blush:.45,
    faceExtra:[[-58, 340], [-46, 350], [-64, 356], [58, 340], [46, 350], [64, 356], [-36, 344], [36, 344]].map(([dx, y]) => `<circle cx="${300 + dx}" cy="${y}" r="2.6" fill="#8f5c3c" opacity=".55"/>`).join(""),
    clothes:`${shoulders(suit)}${sideShade(suitS)}
      <path d="M300,476 L300,640" stroke="${suitS}" stroke-width="6"/><path d="M296,476 v164 M304,476 v164" stroke="#e8f8f6" stroke-width="1.5" stroke-dasharray="4 5" opacity=".6"/>
      <path d="M226,470 C250,500 276,510 300,510 C324,510 350,500 374,470 L360,462 C340,480 320,488 300,488 C280,488 260,480 240,462 Z" fill="${suitS}"/>
      ${gold ? `<circle cx="384" cy="572" r="13" fill="${GOLD}" stroke="#9c7419" stroke-width="3"/>` : `<path d="M370,566 q14,-16 28,0 q-14,12 -28,0z M398,566 l10,-7 0,14z" fill="#e8fbff"/>`}`,
    hairBack:`<path d="M168,420 C140,300 160,150 300,136 C440,150 460,300 432,420 C420,450 400,456 392,440 C410,380 400,320 384,286 L216,286 C200,320 190,380 208,440 C200,456 180,450 168,420 Z" fill="${hairCol}"/>`,
    hairFront:`<path d="M184,262 C178,190 230,150 300,150 C370,150 422,190 416,262 C400,226 370,206 330,200 C300,214 262,218 236,214 C212,222 194,240 184,262 Z" fill="${hairCol}"/>
      <path d="M190,300 C176,340 196,380 184,410 M410,300 C424,340 404,380 416,410" stroke="#4a2c22" stroke-width="5" fill="none" opacity=".7"/>`,
    extra:`<g transform="translate(300 176)"><rect x="-96" y="-24" width="84" height="44" rx="18" fill="#bfe9f5" stroke="${gold ? GOLD : suit}" stroke-width="7"/><rect x="12" y="-24" width="84" height="44" rx="18" fill="#bfe9f5" stroke="${gold ? GOLD : suit}" stroke-width="7"/>
      <path d="M-12,-4 h24" stroke="${gold ? GOLD : suit}" stroke-width="7"/><path d="M-84,-12 l18,-6 M24,-12 l18,-6" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>
      <path d="M-96,-6 C-126,-2 -130,20 -122,40 M96,-6 C126,-2 130,20 122,40" stroke="#253238" stroke-width="7" fill="none"/></g>`,
  });
}
/* Khun Kla · the Engineer: older, square jaw, grey stubble, hard hat, hi-vis vest over a blue shirt, kind eyes with crow's feet */
function eng(out){
  const gold = out === "gold", alt = out === "alt";
  const shirt = alt ? "#6b7177" : "#3a6fb8", shirtS = alt ? "#4b5157" : "#28508a", vest = gold ? "#f2c14e" : alt ? "#c6f04a" : "#ff8a1c";
  const hairCol = "#3a3532";
  return person({id:"eng-" + out, skin:"warm", bg:gold ? ["#6b5520", "#2e2410", "#0c0904"] : ["#45556a", "#252f3d", "#0b0f16"], rim:gold ? GOLD : "#ffcc33",
    motif:`${Array.from({length:13}, (_, i) => `<path d="M${i * 50},0 V640"/>`).join("")}${Array.from({length:13}, (_, i) => `<path d="M0,${i * 50} H600"/>`).join("")}<circle cx="470" cy="150" r="70" stroke-width="4"/><path d="M400,150 h140 M470,80 v140" stroke-width="4"/>`,
    fw:246, fh:282, jaw:.94, chin:.32, hairCol, eye:{open:.4, tilt:-.08, eyeCol:"#3a2a1c", crow:true, bags:true}, browTh:12, browAng:.06, browArch:5, browCol:"#4a4440", mouth:"smile", mouthW:.22, blush:.25, cy:296, noseKind:"wide", noseW:.15,
    lines:`<path d="M240,240 C270,232 330,232 360,240 M250,256 C280,250 320,250 350,256" stroke="#a96f50" stroke-width="2" fill="none" opacity=".35"/><path d="M252,380 C246,396 248,410 256,420 M348,380 C354,396 352,410 344,420" stroke="#a96f50" stroke-width="2.4" fill="none" opacity=".45"/>`,
    beard:`<path d="M214,360 C220,420 260,456 300,458 C340,456 380,420 386,360 C376,400 350,430 300,432 C250,430 224,400 214,360 Z" fill="#6a625c" opacity=".55"/><path d="M262,404 C280,396 320,396 338,404 C324,398 276,398 262,404 Z" fill="#6a625c" opacity=".7"/>`,
    clothes:`${shoulders(shirt, 470, 282)}${sideShade(shirtS)}
      <path d="M262,470 L300,520 L338,470 Z" fill="${shirtS}"/>
      <path d="M208,476 L262,470 L286,640 L190,640 C188,580 196,520 208,476 Z" fill="${vest}"/><path d="M392,476 L338,470 L314,640 L410,640 C412,580 404,520 392,476 Z" fill="${shade(vest, .88)}"/>
      <path d="M202,560 L286,566 M398,560 L314,566" stroke="#e8eef0" stroke-width="12"/><path d="M202,560 L286,566 M398,560 L314,566" stroke="#a9b3b8" stroke-width="2" stroke-dasharray="6 6"/>
      <rect x="226" y="508" width="30" height="40" rx="4" fill="#e8eef0" stroke="#7a8287" stroke-width="2"/>`,
    hairBack:`<path d="M182,300 C176,250 196,210 230,196 L370,196 C404,210 424,250 418,300 Z" fill="${hairCol}"/>`,
    hairFront:`<path d="M186,290 C186,260 194,240 208,226 L392,226 C406,240 414,260 414,290 C404,268 392,256 378,252 L222,252 C208,256 196,268 186,290 Z" fill="${hairCol}"/>`,
    top:`<g><path d="M168,232 C168,150 226,104 300,104 C374,104 432,150 432,232 Z" fill="${gold ? GOLD : "#ffcc33"}"/><path d="M168,232 C168,150 226,104 300,104 C374,104 432,150 432,232 Z" fill="none" stroke="${gold ? "#9c7419" : "#c99a12"}" stroke-width="4"/>
      <path d="M150,236 C210,220 390,220 450,236 L452,252 C390,240 210,240 148,252 Z" fill="${gold ? "#d9a628" : "#e5b318"}"/><path d="M296,108 L296,232 M304,108 L304,232" stroke="${gold ? "#9c7419" : "#c99a12"}" stroke-width="5"/>
      <path d="M210,150 C230,130 260,118 290,116" stroke="#fff" stroke-width="7" fill="none" opacity=".45" stroke-linecap="round"/></g>`,
  });
}
/* Dr. Fasai · GCT advisor: neat long hair, headset with a mic, purple blazer, warm reassuring smile */
function adv(){
  const hairCol = "#1a1214";
  return person({id:"adv", skin:"fair", bg:["#5a3b8f", "#2c1b4e", "#0f0820"], rim:"#c3a6ff",
    motif:`${Array.from({length:40}, (_, i) => `<circle cx="${(i * 97) % 600}" cy="${(i * 61) % 640}" r="${3 + (i % 3) * 2}" fill="#fff" stroke="none"/>`).join("")}${Array.from({length:12}, (_, i) => `<path d="M${(i * 97) % 600},${(i * 61) % 640} L${((i + 3) * 97) % 600},${((i + 3) * 61) % 640}"/>`).join("")}`,
    fw:216, fh:290, jaw:.7, chin:.2, hairCol, eye:{open:.46, tilt:.14, lash:true, crease:true, eyeCol:"#2a1a14"}, browTh:7, browAng:.08, browArch:9, mouth:"smile", mouthW:.21, blush:.45,
    clothes:`${shoulders("#5b3a8a")}${sideShade("#3c2460")}<path d="M266,470 L300,540 L334,470 Z" fill="#efe9f5"/><path d="M262,470 L238,516 L282,546 L300,600 Z" fill="#3c2460"/><path d="M338,470 L362,516 L318,546 L300,600 Z" fill="#3c2460"/>
      <rect x="370" y="556" width="40" height="52" rx="5" fill="#efe9f5"/><rect x="378" y="566" width="24" height="6" rx="2" fill="#c3a6ff"/>`,
    hairBack:`<path d="M170,460 C150,320 160,150 300,134 C440,150 450,320 430,460 C410,470 396,460 390,440 C408,360 400,300 386,270 L214,270 C200,300 192,360 210,440 C204,460 190,470 170,460 Z" fill="${hairCol}"/>`,
    hairFront:`<path d="M186,270 C176,196 232,150 300,150 C368,150 424,196 414,270 C396,230 360,208 300,196 C262,206 240,220 222,240 C206,246 194,256 186,270 Z" fill="${hairCol}"/>`,
    extra:`<path d="M176,280 C176,170 424,170 424,280" stroke="#2a2a33" stroke-width="9" fill="none"/><rect x="160" y="270" width="26" height="54" rx="12" fill="#2a2a33"/><rect x="414" y="270" width="26" height="54" rx="12" fill="#2a2a33"/>
      <path d="M172,318 C176,370 220,404 262,404" stroke="#2a2a33" stroke-width="5" fill="none"/><rect x="254" y="396" width="20" height="12" rx="5" fill="#c3a6ff"/>`,
  });
}
/* Fon · mangrove volunteer: young, ponytail, straw hat on her back, faded green volunteer tee, sun-kissed, holding a seedling */
function fon(){
  const hairCol = "#1a110d";
  return person({id:"fon", skin:"tan", bg:["#2f8a62", "#164432", "#061910"], rim:"#9be3a8",
    motif:`${Array.from({length:9}, (_, i) => `<path d="M${30 + i * 70},640 C${40 + i * 70},560 ${10 + i * 70},520 ${50 + i * 70},460"/><path d="M${50 + i * 70},470 c-30,-10 -40,-40 -20,-60 c20,10 26,40 20,60z M${50 + i * 70},470 c30,-14 50,-6 56,16 c-24,8 -46,0 -56,-16z" fill="#fff" stroke="none"/>`).join("")}`,
    fw:214, fh:280, jaw:.74, chin:.24, hairCol, eye:{open:.56, tilt:.04, lash:true, crease:true, eyeCol:"#24150c", look:.2, iris:.26}, browTh:7, browAng:.12, browArch:9, mouth:"grin", mouthW:.22, blush:.55,
    faceExtra:`<path d="M240,300 h120" stroke="#b67d57" stroke-width="0"/>`,
    clothes:`${shoulders("#4f9a6a", 480, 262)}${sideShade("#367a50", 480)}<path d="M246,480 C262,508 282,516 300,516 C318,516 338,508 354,480" stroke="#367a50" stroke-width="8" fill="none"/>
      <text x="300" y="590" text-anchor="middle" font-family="Kanit, sans-serif" font-weight="600" font-size="30" fill="#e8f7ec" opacity=".85">ป่าชายเลน</text>
      <g transform="translate(408 520)"><path d="M0,90 C2,60 -2,30 4,0" stroke="#5b3a1f" stroke-width="6" fill="none"/><path d="M4,10 c-34,-10 -44,-40 -22,-58 c22,12 28,40 22,58z" fill="#7bd38f"/><path d="M4,22 c30,-16 54,-8 60,14 c-26,10 -50,2 -60,-14z" fill="#5fbf78"/>
      <path d="M-26,90 h62 l-8,40 h-46z" fill="#8a5a32"/></g>`,
    hairBack:`<path d="M176,280 C166,190 222,138 300,136 C378,138 434,190 424,280 Z" fill="${hairCol}"/><path d="M396,200 C470,210 480,300 440,350 C430,320 424,280 404,250 Z" fill="${hairCol}"/>`,
    hairFront:`<path d="M184,250 C186,184 238,150 300,150 C362,150 414,184 416,250 C400,214 366,196 326,192 C312,206 286,212 262,206 C236,214 202,228 184,250 Z" fill="${hairCol}"/><circle cx="404" cy="214" r="10" fill="#e0533e"/>`,
  });
}
/* Uncle Thongdee · rice farmer: weathered, deep smile lines, grey stubble, farmer's hat (ngob), indigo shirt, pha khao ma cloth */
function lung(){
  const hairCol = "#3a3330";
  return person({id:"lung", skin:"brown", bg:["#7a8a2a", "#3e4a14", "#141a06"], rim:"#e4f27a",
    motif:`${Array.from({length:10}, (_, i) => `<path d="M${30 + i * 62},640 C${36 + i * 62},560 ${40 + i * 62},500 ${60 + i * 62},440"/>${[0, 1, 2, 3].map(k => `<ellipse cx="${56 + i * 62 + k * 4}" cy="${460 + k * 18}" rx="6" ry="12" fill="#fff" stroke="none" transform="rotate(30 ${56 + i * 62 + k * 4} ${460 + k * 18})"/>`).join("")}`).join("")}`,
    fw:236, fh:284, jaw:.86, chin:.3, hairCol, eye:{open:.34, tilt:-.1, eyeCol:"#2a1a10", crow:true, bags:true}, browTh:9, browAng:.2, browArch:4, browCol:"#5c5450", mouth:"grin", mouthW:.22, blush:.2, cy:300, noseKind:"wide", noseW:.15,
    lines:`<path d="M244,236 C272,228 328,228 356,236 M252,252 C280,246 320,246 348,252" stroke="#764729" stroke-width="2.4" fill="none" opacity=".45"/><path d="M248,382 C238,400 240,418 252,430 M352,382 C362,400 360,418 348,430" stroke="#764729" stroke-width="3" fill="none" opacity=".55"/>`,
    beard:`<path d="M226,380 C236,430 268,458 300,460 C332,458 364,430 374,380 C360,414 336,436 300,438 C264,436 240,414 226,380 Z" fill="#8a827c" opacity=".55"/>`,
    clothes:`${shoulders("#2c3f6a", 476, 270)}${sideShade("#1d2b4c", 476)}<path d="M262,476 L300,530 L338,476" fill="none" stroke="#1d2b4c" stroke-width="7"/>
      <path d="M196,540 C240,520 290,524 316,540 L310,566 C282,552 240,550 196,566 Z" fill="#c8462e"/><path d="M200,548 C240,532 286,534 312,548" stroke="#f2c14e" stroke-width="3" stroke-dasharray="7 8" fill="none"/><path d="M200,558 C240,544 286,546 312,558" stroke="#2c6a3a" stroke-width="3" stroke-dasharray="4 10" fill="none"/>`,
    hairBack:`<path d="M188,290 C182,240 214,212 250,206 L350,206 C386,212 418,240 412,290 Z" fill="${hairCol}"/>`,
    hairFront:`<path d="M186,300 C184,262 192,236 206,222 L222,226 C210,244 204,266 204,300 Z M414,300 C416,262 408,236 394,222 L378,226 C390,244 396,266 396,300 Z" fill="#9c958f"/>`,
    top:`<g><path d="M300,40 L478,214 C430,232 170,232 122,214 Z" fill="#d9b46a"/><path d="M300,40 L478,214 C430,232 170,232 122,214 Z" fill="none" stroke="#9c7a36" stroke-width="3"/>
      ${[-120, -80, -40, 0, 40, 80, 120].map(dx => `<path d="M300,44 L${300 + dx * 1.5},216" stroke="#b8923e" stroke-width="2.5" opacity=".75"/>`).join("")}
      <path d="M160,210 C230,196 370,196 440,210" stroke="#7a1f14" stroke-width="8" fill="none"/><path d="M190,150 C230,120 260,100 290,76" stroke="#fff" stroke-width="6" opacity=".3" fill="none" stroke-linecap="round"/></g>`,
  });
}
/* Krai Silathong · the fossil-fuel lobby: slicked-back silver hair, heavy brows, smirk, dark suit, red tie, gold cufflink, a city of smokestacks behind */
function opp(){
  const hairCol = "#b7b9bd";
  return person({id:"opp", skin:"fair", bg:["#7a2f20", "#3e1610", "#140604"], rim:"#ff8a5a",
    motif:`${[[40, 300], [120, 220], [200, 340], [420, 260], [500, 180], [560, 320]].map(([x, y]) => `<rect x="${x}" y="${y}" width="44" height="${640 - y}"/><path d="M${x + 10},${y} v-40 h24 v40"/><circle cx="${x + 22}" cy="${y - 70}" r="${18 + (x % 3) * 6}" fill="#fff" stroke="none" opacity=".5"/>`).join("")}`,
    fw:240, fh:290, jaw:.9, chin:.3, hairCol, eye:{open:.32, tilt:-.18, eyeCol:"#2a2622", bags:true}, browTh:13, browAng:-.5, browArch:3, browCol:"#7c7e82", mouth:"smirk", mouthW:.22, blush:.15, noseW:.15,
    lines:`<path d="M250,376 C242,394 246,410 256,420" stroke="#c08466" stroke-width="2.6" fill="none" opacity=".5"/><path d="M286,260 l6,14 M314,260 l-6,14" stroke="#c08466" stroke-width="2.4" opacity=".45"/>`,
    clothes:`${shoulders("#1c1f27", 470, 280)}${sideShade("#0e1016")}<path d="M270,470 L300,560 L330,470 Z" fill="#f2f2f0"/>
      <path d="M262,470 L236,520 L284,552 L300,620 Z" fill="#2a2e38"/><path d="M338,470 L364,520 L316,552 L300,620 Z" fill="#2a2e38"/>
      <path d="M300,486 L288,500 L300,600 L312,500 Z" fill="#c8202a"/><path d="M290,486 h20 l-4,16 h-12 z" fill="#a0141e"/>
      <circle cx="232" cy="566" r="9" fill="#f2c14e" stroke="#9c7419" stroke-width="2"/><rect x="352" y="540" width="40" height="6" rx="3" fill="#f2c14e"/>`,
    hairBack:`<path d="M178,300 C166,200 220,130 300,128 C380,130 434,200 422,300 C412,250 400,224 380,212 L220,212 C200,224 188,250 178,300 Z" fill="${hairCol}"/>`,
    hairFront:`<path d="M184,250 C186,176 238,140 300,140 C362,140 414,176 416,250 C404,214 382,196 352,190 C330,184 270,184 248,190 C218,196 196,214 184,250 Z" fill="${hairCol}"/>
      ${[0, 1, 2, 3, 4].map(i => `<path d="M${226 + i * 30},${196 - (i === 2 ? 6 : 0)} C${240 + i * 30},${170 - i * 2} ${270 + i * 26},${156} ${312 + i * 20},${152}" stroke="#8e9095" stroke-width="3" fill="none" opacity=".8"/>`).join("")}`,
  });
}

/* ---------------- 3.9: sixteen more people of the story (they speak during the game, 45-voices.js) ---------------- */
const hairShort = (col, top = 150) => ({hairBack:`<path d="M182,300 C172,220 214,${top + 8} 300,${top} C386,${top + 8} 428,220 418,300 Z" fill="${col}"/>`,
  hairFront:`<path d="M184,262 C182,196 234,${top + 8} 300,${top + 4} C366,${top + 8} 418,196 416,262 C400,226 360,206 300,204 C250,206 206,222 184,262 Z" fill="${col}"/>`});
const hairLong = (col, len = 460) => ({hairBack:`<path d="M170,${len} C146,320 160,150 300,136 C440,150 454,320 430,${len} C414,${len + 16} 398,${len - 6} 392,${len - 30} C410,370 402,316 386,284 L214,284 C198,316 190,370 208,${len - 30} C202,${len - 6} 186,${len + 16} 170,${len} Z" fill="${col}"/>`,
  hairFront:`<path d="M186,268 C178,190 232,150 300,150 C368,150 422,190 414,268 C398,228 364,206 316,200 C290,214 254,218 226,216 C206,226 192,244 186,268 Z" fill="${col}"/>`});
const glasses = (col = "#2a2a33", y = 288) => `<g fill="none" stroke="${col}" stroke-width="6"><rect x="212" y="${y - 26}" width="72" height="52" rx="16"/><rect x="316" y="${y - 26}" width="72" height="52" rx="16"/><path d="M284,${y - 6} h32 M212,${y - 10} l-26,-6 M388,${y - 10} l26,-6"/></g>`;
const tee = (c, cs, y = 474) => `${shoulders(c, y, 268)}${sideShade(cs, y)}<path d="M248,${y} C262,${y + 30} 282,${y + 40} 300,${y + 40} C318,${y + 40} 338,${y + 30} 352,${y}" stroke="${cs}" stroke-width="8" fill="none"/>`;
const collar = (c, cs, inner = "#f2f2ee", y = 470) => `${shoulders(c, y, 274)}${sideShade(cs, y)}<path d="M268,${y} L300,${y + 70} L332,${y} Z" fill="${inner}"/><path d="M262,${y} L240,${y + 44} L290,${y + 60} Z M338,${y} L360,${y + 44} L310,${y + 60} Z" fill="${cs}"/>`;
const waves = `${[140, 230, 320, 410, 500].map(y => `<path d="M0,${y} C70,${y - 24} 130,${y + 24} 200,${y} S330,${y - 24} 400,${y} S530,${y + 24} 600,${y}" stroke-width="4"/>`).join("")}`;
const sunMotif = `<circle cx="470" cy="150" r="60" stroke-width="5"/>${Array.from({length:12}, (_, i) => { const a = i / 12 * Math.PI * 2; return `<path d="M${470 + Math.cos(a) * 78},${150 + Math.sin(a) * 78} L${470 + Math.cos(a) * 104},${150 + Math.sin(a) * 104}" stroke-width="5"/>`; }).join("")}`;

/* Bang Ali · small-boat fisher, Pattani: white kopiah cap, trimmed beard, checked sarong-cloth shirt, the sea behind */
function ali(){
  const hc = "#16110e";
  return person({id:"ali", skin:"brown", bg:["#2f7fa8", "#164a68", "#061826"], rim:"#8fd0ff", motif:waves,
    fw:228, fh:286, jaw:.86, chin:.28, hairCol:hc, eye:{open:.38, tilt:-.04, eyeCol:"#24150c", crow:true}, browTh:10, browAng:.08, browArch:6, mouth:"smile", mouthW:.21, blush:.2, cy:298, noseKind:"wide", noseW:.15,
    beard:`<path d="M222,370 C230,436 266,468 300,470 C334,468 370,436 378,370 C364,412 338,440 300,442 C262,440 236,412 222,370 Z" fill="${hc}" opacity=".85"/><path d="M262,402 C282,394 318,394 338,402 C320,398 280,398 262,402 Z" fill="${hc}"/>`,
    clothes:`${shoulders("#3a5f8a", 474, 272)}${sideShade("#26446a")}${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${40 + i * 70},480 V640" stroke="#7fb2d9" stroke-width="10" opacity=".35"/><path d="M30,${520 + i * 18} H570" stroke="#7fb2d9" stroke-width="6" opacity=".2"/>`).join("")}<path d="M266,474 L300,530 L334,474" fill="none" stroke="#26446a" stroke-width="7"/>`,
    ...hairShort(hc, 168),
    top:`<path d="M196,226 C196,168 240,140 300,140 C360,140 404,168 404,226 Z" fill="#f4f2ec"/><path d="M196,226 C196,168 240,140 300,140 C360,140 404,168 404,226" fill="none" stroke="#c9c4b6" stroke-width="3"/>${[214, 244, 274, 304, 334, 364].map(x => `<path d="M${x},${208} l10,-14 10,14" stroke="#c9c4b6" stroke-width="2.5" fill="none"/>`).join("")}`,
  });
}
/* Tala · a student from Tuvalu: curly hair, a frangipani flower, school polo, the lagoon and palms behind */
function tala(){
  const hc = "#1c120e";
  return person({id:"tala", skin:"brown", bg:["#2bb3a6", "#136a74", "#062530"], rim:"#9be8dc",
    motif:`${waves}<path d="M480,640 C470,520 490,420 520,330" stroke-width="10"/><path d="M520,330 c-60,-10 -90,10 -110,40 M520,330 c40,-40 80,-40 100,-20 M520,330 c-10,-50 10,-80 40,-90 M520,330 c-40,-30 -80,-30 -100,-10" stroke-width="8"/>`,
    fw:212, fh:276, jaw:.74, chin:.26, hairCol:hc, eye:{open:.56, tilt:.04, lash:true, crease:true, eyeCol:"#1f130b", iris:.27}, browTh:7, browAng:.1, browArch:8, mouth:"grin", mouthW:.22, blush:.5, cy:300,
    clothes:`${collar("#2c6fb0", "#1d5088", "#2c6fb0", 480)}<rect x="356" y="540" width="26" height="30" rx="4" fill="#f2c14e"/>`,
    hairBack:`<path d="M160,430 C120,330 150,160 300,140 C450,160 480,330 440,430 C430,456 404,450 398,430 C420,370 410,320 392,290 L208,290 C190,320 180,370 202,430 C196,450 170,456 160,430 Z" fill="${hc}"/>${[[170, 330], [176, 380], [430, 330], [424, 380], [186, 420], [414, 420]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="22" fill="${hc}"/>`).join("")}`,
    hairFront:`<path d="M182,262 C176,196 230,150 300,150 C370,150 424,196 418,262 C396,222 352,204 300,204 C248,204 204,222 182,262 Z" fill="${hc}"/>${[200, 236, 272, 308, 344, 380].map((x, i) => `<circle cx="${x + 12}" cy="${178 - (i % 2) * 10}" r="18" fill="${hc}"/>`).join("")}`,
    extra:`<g transform="translate(410 224)">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-18" rx="13" ry="20" fill="#fff8ee" transform="rotate(${a})"/>`).join("")}<circle r="8" fill="#f2c14e"/></g>`,
  });
}
/* Ravi · textile worker, Kanpur: moustache, short side-parted hair, sweat on the brow, khaki work shirt, threads behind */
function ravi(){
  const hc = "#140f0c";
  return person({id:"ravi", skin:"brown", bg:["#c06a2a", "#6a3210", "#200c04"], rim:"#ffb877",
    motif:`${Array.from({length:14}, (_, i) => `<path d="M${i * 46},0 V640"/>`).join("")}${Array.from({length:7}, (_, i) => `<path d="M0,${80 + i * 90} C150,${60 + i * 90} 450,${100 + i * 90} 600,${80 + i * 90}" stroke-width="3"/>`).join("")}`,
    fw:222, fh:288, jaw:.8, chin:.26, hairCol:hc, eye:{open:.4, tilt:-.06, eyeCol:"#20120a", bags:true}, browTh:11, browAng:.18, browArch:5, mouth:"smile", mouthW:.2, blush:.15, cy:296, noseW:.15,
    beard:`<path d="M248,384 C266,370 288,372 300,378 C312,372 334,370 352,384 C336,392 316,388 300,386 C284,388 264,392 248,384 Z" fill="${hc}"/>`,
    faceExtra:`<circle cx="236" cy="226" r="5" fill="#bfe6ff" opacity=".8"/><circle cx="352" cy="214" r="4" fill="#bfe6ff" opacity=".8"/><circle cx="380" cy="300" r="4.5" fill="#bfe6ff" opacity=".7"/>`,
    clothes:collar("#a8925c", "#7f6c40", "#8e7a4a"),
    hairBack:`<path d="M184,290 C176,214 222,152 300,148 C378,152 424,214 416,290 Z" fill="${hc}"/>`,
    hairFront:`<path d="M186,250 C190,186 240,152 300,152 C360,152 412,186 414,250 C398,216 364,196 320,192 L260,206 C230,210 204,226 186,250 Z" fill="${hc}"/><path d="M262,170 C280,188 300,194 324,192" stroke="#3a2e28" stroke-width="4" fill="none"/>`,
  });
}
/* Jonas · lignite miner, Lusatia: fair stubble, hard hat with a lamp, orange coveralls, the open pit and its excavator behind */
function jonas(){
  const hc = "#b88a4a";
  return person({id:"jonas", skin:"fair", bg:["#5c6670", "#30383f", "#0f1316"], rim:"#ffd27a",
    motif:`<path d="M0,500 L120,430 L260,470 L400,410 L600,460" stroke-width="5"/><path d="M0,560 L160,500 L320,540 L460,490 L600,530" stroke-width="5"/><g transform="translate(440 250)"><circle r="70" stroke-width="5"/>${Array.from({length:10}, (_, i) => `<path d="M0,0 L${Math.cos(i * .63) * 70},${Math.sin(i * .63) * 70}" stroke-width="3"/>`).join("")}</g><path d="M440,320 L360,430 h160 z" stroke-width="5"/>`,
    fw:236, fh:288, jaw:.9, chin:.3, hairCol:hc, eye:{open:.4, tilt:-.04, eyeCol:"#3d6a8a", crow:true}, browTh:10, browAng:.04, browArch:5, browCol:"#9a7038", mouth:"smile", mouthW:.21, blush:.35, cy:298,
    beard:`<path d="M218,360 C224,424 262,458 300,460 C338,458 376,424 382,360 C372,404 344,432 300,434 C256,432 228,404 218,360 Z" fill="#a8813f" opacity=".45"/>`,
    clothes:`${shoulders("#e0702a", 472, 280)}${sideShade("#b85418")}<path d="M220,560 H380" stroke="#e8eef0" stroke-width="14"/><path d="M220,560 H380" stroke="#a9b3b8" stroke-width="2" stroke-dasharray="6 6"/><path d="M266,472 L300,520 L334,472" fill="none" stroke="#b85418" stroke-width="8"/>`,
    ...hairShort(hc, 176),
    top:`<g><path d="M172,234 C172,152 230,108 300,108 C370,108 428,152 428,234 Z" fill="#f4f4f0"/><path d="M154,238 C214,222 386,222 446,238 L448,254 C386,242 214,242 152,254 Z" fill="#d9d9d2"/><rect x="276" y="140" width="48" height="34" rx="8" fill="#3a3f45"/><circle cx="300" cy="157" r="12" fill="#fff6c8"/><path d="M210,150 C230,130 260,120 290,118" stroke="#fff" stroke-width="7" fill="none" opacity=".5" stroke-linecap="round"/></g>`,
  });
}
/* Rahima · market trader, Khulna: a bright orange-and-green orna headscarf, nose stud, green kameez, river boats behind */
function rahima(){
  const hc = "#120c0a";
  return person({id:"rahima", skin:"tan", bg:["#2a8a6a", "#14503c", "#061a12"], rim:"#ffd27a",
    motif:`${waves}${[[120, 300], [420, 360]].map(([x, y]) => `<path d="M${x - 70},${y} Q${x},${y + 40} ${x + 70},${y} Z" stroke-width="5"/><path d="M${x},${y} V${y - 70} L${x + 40},${y - 10}" stroke-width="4"/>`).join("")}`,
    fw:212, fh:282, jaw:.74, chin:.24, hairCol:hc, eye:{open:.5, tilt:.08, lash:true, crease:true, eyeCol:"#1f130b"}, browTh:7, browAng:.1, browArch:8, mouth:"smile", mouthW:.2, blush:.45, cy:300,
    clothes:`${shoulders("#1f8a5a", 476, 266)}${sideShade("#136a42", 476)}<path d="M150,640 C170,540 230,470 300,470 C370,470 430,540 450,640 Z" fill="#ff8a2a" opacity=".92"/><path d="M180,640 C200,560 250,500 300,500" stroke="#ffd27a" stroke-width="5" fill="none" stroke-dasharray="10 8"/>`,
    hairBack:`<path d="M166,470 C140,330 158,140 300,126 C442,140 460,330 434,470 Z" fill="#ff8a2a"/><path d="M190,300 C186,220 230,170 300,166 C370,170 414,220 410,300 Z" fill="${hc}"/>`,
    hairFront:`<path d="M182,262 C186,200 236,174 300,174 C364,174 414,200 418,262 C398,236 356,224 300,224 C244,224 202,236 182,262 Z" fill="${hc}"/>`,
    top:`<path d="M168,330 C152,210 210,130 300,124 C390,130 448,210 432,330 C424,250 380,180 300,176 C220,180 176,250 168,330 Z" fill="#ff8a2a"/><path d="M178,300 C176,214 228,150 300,146 C372,150 424,214 422,300" stroke="#ffd27a" stroke-width="5" fill="none" stroke-dasharray="10 8"/>`,
    extra:`<circle cx="324" cy="364" r="4.5" fill="#f2c14e" stroke="#9c7419" stroke-width="1.5"/>`,
  });
}
/* Lekuta · Samburu herder: close-cropped hair, layers of bright bead necklaces, red shuka over the shoulder, acacia and cattle */
function lekuta(){
  const hc = "#0f0a08";
  return person({id:"lekuta", skin:"brown", bg:["#c0822a", "#6a420e", "#201204"], rim:"#ffd27a",
    motif:`<path d="M80,420 C120,360 220,340 300,350 C380,340 480,360 520,420" stroke-width="6"/><path d="M300,350 V560" stroke-width="10"/><path d="M60,560 H600" stroke-width="4"/>${[[120, 590], [420, 600]].map(([x, y]) => `<path d="M${x},${y} h70 v-24 h-70 z M${x + 70},${y - 24} l14,-12" stroke-width="5"/>`).join("")}`,
    fw:214, fh:296, jaw:.78, chin:.26, hairCol:hc, eye:{open:.42, tilt:.02, eyeCol:"#1a0f08"}, browTh:8, browAng:.06, browArch:6, mouth:"smile", mouthW:.2, blush:.15, cy:296, noseKind:"wide", noseW:.15,
    clothes:`${shoulders("#c8202a", 476, 270)}${sideShade("#9a141e", 476)}<path d="M200,476 L400,640 L340,640 L180,500 Z" fill="#2a3a8a" opacity=".85"/>${["#e8e2d0", "#c8202a", "#2a6ad0", "#f2c14e", "#3fae6a"].map((c, i) => `<path d="M${226 - i * 8},${470 + i * 4} C${250 - i * 4},${512 + i * 12} ${350 + i * 4},${512 + i * 12} ${374 + i * 8},${470 + i * 4}" stroke="${c}" stroke-width="9" fill="none"/>`).join("")}`,
    hairBack:`<path d="M188,280 C182,200 230,150 300,148 C370,150 418,200 412,280 Z" fill="${hc}"/>`,
    hairFront:`<path d="M190,236 C200,180 246,156 300,156 C354,156 400,180 410,236 C390,204 350,192 300,192 C250,192 210,204 190,236 Z" fill="${hc}"/>`,
    earrings:`<circle cx="186" cy="338" r="9" fill="none" stroke="#f2c14e" stroke-width="4"/><circle cx="414" cy="338" r="9" fill="none" stroke="#f2c14e" stroke-width="4"/>`,
  });
}
/* María · wildland firefighter, California: yellow fire helmet with goggles, soot on the cheek, yellow Nomex shirt, flames and pines */
function maria(){
  const hc = "#2a1610";
  return person({id:"maria", skin:"warm", bg:["#c0441e", "#6a1e0a", "#1c0602"], rim:"#ffb877",
    motif:`${[60, 150, 460, 540].map(x => `<path d="M${x},640 V420 M${x - 40},500 L${x},400 L${x + 40},500 Z M${x - 30},440 L${x},370 L${x + 30},440 Z" stroke-width="4"/>`).join("")}<path d="M180,640 C160,560 220,540 210,480 C250,520 260,560 250,640 M380,640 C360,580 410,560 400,500 C440,540 440,590 430,640" stroke-width="5"/>`,
    fw:216, fh:284, jaw:.76, chin:.24, hairCol:hc, eye:{open:.46, tilt:.06, lash:true, crease:true, eyeCol:"#3a2414"}, browTh:8, browAng:.12, browArch:7, mouth:"smile", mouthW:.2, blush:.35, cy:300,
    faceExtra:`<ellipse cx="236" cy="350" rx="26" ry="12" fill="#3a2a22" opacity=".28"/><path d="M350,330 l24,6" stroke="#3a2a22" stroke-width="5" opacity=".25" stroke-linecap="round"/>`,
    clothes:collar("#e8c22a", "#c09a12", "#2a3a4a"),
    hairBack:`<path d="M186,300 C178,230 222,186 300,184 C378,186 422,230 414,300 Z" fill="${hc}"/><path d="M398,300 C430,330 440,380 420,430 C410,400 404,360 392,330 Z" fill="${hc}"/>`,
    hairFront:`<path d="M188,268 C190,226 236,206 300,206 C364,206 410,226 412,268 C392,248 352,240 300,240 C248,240 208,248 188,268 Z" fill="${hc}"/>`,
    top:`<g><path d="M166,244 C166,154 226,108 300,108 C374,108 434,154 434,244 Z" fill="#f2c12a"/><path d="M144,246 C214,226 386,226 456,246 L458,264 C386,250 214,250 142,264 Z" fill="#d9a612"/><path d="M296,112 V240 M304,112 V240" stroke="#c09a12" stroke-width="5"/>
      <rect x="212" y="200" width="78" height="34" rx="14" fill="#3a4a58" stroke="#1a2228" stroke-width="5"/><rect x="310" y="200" width="78" height="34" rx="14" fill="#3a4a58" stroke="#1a2228" stroke-width="5"/><path d="M226,206 l14,-4 M324,206 l14,-4" stroke="#bfe6ff" stroke-width="4" stroke-linecap="round"/></g>`,
  });
}
/* Kauê · Amazon forest guardian: black hair with a fringe, red urucum paint lines, a feather, seed necklace, forest behind */
function kaue(){
  const hc = "#0c0806";
  return person({id:"kaue", skin:"tan", bg:["#2a8a4a", "#124a24", "#04180a"], rim:"#9be3a8",
    motif:`${Array.from({length:10}, (_, i) => `<path d="M${30 + i * 62},640 C${20 + i * 62},520 ${60 + i * 62},420 ${40 + i * 62},300"/><path d="M${40 + i * 62},${360 + (i % 3) * 30} c-40,-6 -56,-30 -44,-56 c30,8 46,30 44,56z M${40 + i * 62},${330 + (i % 2) * 40} c38,-14 60,-4 64,20 c-30,10 -54,0 -64,-20z" fill="#fff" stroke="none"/>`).join("")}`,
    fw:222, fh:282, jaw:.82, chin:.26, hairCol:hc, eye:{open:.38, tilt:.04, eyeCol:"#1a0f08"}, browTh:9, browAng:.08, browArch:5, mouth:"smile", mouthW:.2, blush:.15, cy:300, noseKind:"wide",
    faceExtra:`<path d="M214,322 h52 M214,336 h52 M334,322 h52 M334,336 h52" stroke="#c8302a" stroke-width="5" stroke-linecap="round" opacity=".85"/><path d="M290,180 h20" stroke="#c8302a" stroke-width="6"/>`,
    clothes:`${shoulders("#6a4a2a", 478, 266)}${sideShade("#4a321a", 478)}${Array.from({length:15}, (_, i) => { const a = Math.PI * (.15 + .7 * i / 14); return `<circle cx="${300 - Math.cos(a) * 92}" cy="${470 + Math.sin(a) * 64}" r="${i % 3 ? 7 : 10}" fill="${i % 3 ? "#8a2a1a" : "#f2e6c8"}"/>`; }).join("")}`,
    hairBack:`<path d="M180,330 C168,230 214,150 300,146 C386,150 432,230 420,330 Z" fill="${hc}"/>`,
    hairFront:`<path d="M182,248 C186,184 236,152 300,152 C364,152 414,184 418,248 L182,248 Z" fill="${hc}"/><path d="M190,248 H410" stroke="#000" stroke-width="3" opacity=".3"/>`,
    extra:`<g transform="translate(410 200) rotate(24)"><path d="M0,0 C-10,-50 -6,-100 8,-130 C22,-100 24,-50 12,0 Z" fill="#e8b23a"/><path d="M6,-128 V4" stroke="#8a5a1a" stroke-width="3"/><path d="M8,-130 C16,-110 18,-96 14,-84" stroke="#2a6ad0" stroke-width="8" fill="none"/></g>`,
  });
}
/* Mei Lin · battery engineer, Hefei: short bob, safety glasses, white lab jacket with an ID badge, battery cells behind */
function mei(){
  const hc = "#100c0c";
  return person({id:"mei", skin:"fair", bg:["#5a4aa8", "#2c2266", "#0c0824"], rim:"#c3a6ff",
    motif:`${Array.from({length:6}, (_, i) => `<rect x="${40 + i * 92}" y="${380 + (i % 2) * 40}" width="58" height="150" rx="10"/><rect x="${58 + i * 92}" y="${364 + (i % 2) * 40}" width="22" height="16" rx="3"/><path d="M${69 + i * 92},${430 + (i % 2) * 40} l-10,24 h18 l-10,24" stroke-width="4"/>`).join("")}`,
    fw:210, fh:282, jaw:.72, chin:.22, hairCol:hc, eye:{open:.42, tilt:.12, lash:true, eyeCol:"#1f140f"}, browTh:7, browAng:.06, browArch:7, mouth:"smile", mouthW:.19, blush:.4, cy:298,
    clothes:`${collar("#f2f4f6", "#c9d0d6", "#5a4aa8")}<rect x="346" y="530" width="44" height="56" rx="5" fill="#fff" stroke="#8a93a0" stroke-width="2"/><rect x="354" y="540" width="28" height="16" rx="2" fill="#c3a6ff"/><path d="M368,530 V500" stroke="#5a4aa8" stroke-width="4"/>`,
    hairBack:`<path d="M176,400 C160,300 170,150 300,140 C430,150 440,300 424,400 C410,410 396,404 392,388 C404,330 396,290 384,270 L216,270 C204,290 196,330 208,388 C204,404 190,410 176,400 Z" fill="${hc}"/>`,
    hairFront:`<path d="M184,280 C176,190 232,148 300,148 C368,148 424,190 416,280 C410,244 394,226 380,220 L380,238 C340,224 260,224 220,238 L220,220 C206,226 190,244 184,280 Z" fill="${hc}"/>`,
    extra:glasses("#5a6470", 290) + `<path d="M216,268 H284 M316,268 H384" stroke="#bfe6ff" stroke-width="3" opacity=".7"/>`,
  });
}
/* Sofía · community leader, Atacama: two long braids, a felt hat, a woven aguayo shawl, salt flats and flamingos behind */
function sofia(){
  const hc = "#18100c";
  return person({id:"sofia", skin:"tan", bg:["#c08a5a", "#6a4226", "#1c0e06"], rim:"#ffd2a8",
    motif:`<path d="M0,430 L120,360 L200,400 L320,300 L420,380 L520,330 L600,370" stroke-width="5"/><path d="M0,500 H600" stroke-width="3"/>${[140, 470].map(x => `<path d="M${x},560 V500 C${x},470 ${x + 30},460 ${x + 30},440 C${x + 30},420 ${x + 10},420 ${x + 6},436" stroke-width="5" fill="none"/><ellipse cx="${x + 6}" cy="${500}" rx="26" ry="14" stroke-width="5"/>`).join("")}`,
    fw:216, fh:284, jaw:.8, chin:.26, hairCol:hc, eye:{open:.44, tilt:.04, lash:true, crease:true, eyeCol:"#24150c", crow:true}, browTh:8, browAng:.1, browArch:6, mouth:"smile", mouthW:.2, blush:.45, cy:302, noseKind:"wide",
    clothes:`${shoulders("#7a3a5a", 476, 272)}${sideShade("#5a2442", 476)}${["#e0433e", "#f2c14e", "#2a8a6a", "#2a6ad0", "#e0433e"].map((c, i) => `<path d="M160,${520 + i * 22} C230,${500 + i * 22} 370,${500 + i * 22} 440,${520 + i * 22}" stroke="${c}" stroke-width="12" fill="none"/>`).join("")}`,
    hairBack:`<path d="M184,300 C176,230 222,180 300,178 C378,180 424,230 416,300 Z" fill="${hc}"/><path d="M198,320 C188,420 196,520 212,600 M402,320 C412,420 404,520 388,600" stroke="${hc}" stroke-width="26" stroke-linecap="round" fill="none"/>${[380, 430, 480, 530].map(y => `<path d="M188,${y} l20,8 M412,${y} l-20,8" stroke="#3a2a22" stroke-width="3"/>`).join("")}<circle cx="212" cy="606" r="12" fill="#e0433e"/><circle cx="388" cy="606" r="12" fill="#e0433e"/>`,
    hairFront:`<path d="M188,270 C192,226 240,206 300,206 C360,206 408,226 412,270 C394,250 352,240 300,240 C248,240 206,250 188,270 Z" fill="${hc}"/>`,
    top:`<g><path d="M150,232 C210,214 390,214 450,232 C440,250 160,250 150,232 Z" fill="#4a3428"/><path d="M206,226 C210,160 240,126 300,126 C360,126 390,160 394,226 Z" fill="#5a4032"/><path d="M208,206 C260,196 340,196 392,206 L392,222 C340,212 260,212 208,222 Z" fill="#e0433e"/></g>`,
  });
}
/* Hiroshi · retired Shinkansen engineer: grey swept hair, round glasses, a navy cardigan with a rail pin, a bullet train behind */
function hiro(){
  const hc = "#c9c7c2";
  return person({id:"hiro", skin:"fair", bg:["#2a5a8a", "#14304e", "#061220"], rim:"#8fd0ff",
    motif:`<path d="M-20,470 H460 C520,470 560,440 600,400 V520 H-20 Z" stroke-width="5"/><path d="M0,452 H430" stroke-width="10"/>${Array.from({length:8}, (_, i) => `<rect x="${20 + i * 52}" y="${482}" width="34" height="18" rx="4"/>`).join("")}<path d="M-20,540 H620 M-20,560 H620" stroke-width="3"/>`,
    fw:226, fh:288, jaw:.82, chin:.26, hairCol:hc, eye:{open:.36, tilt:-.04, eyeCol:"#2a1e16", crow:true, bags:true}, browTh:9, browAng:.04, browArch:5, browCol:"#a9a6a0", mouth:"smile", mouthW:.2, blush:.3, cy:298,
    lines:`<path d="M244,236 C272,228 328,228 356,236" stroke="#c08466" stroke-width="2.2" fill="none" opacity=".45"/>`,
    clothes:`${collar("#1f2f4a", "#14203a", "#e8ecef")}<path d="M300,530 V640" stroke="#14203a" stroke-width="3"/>${[560, 600].map(y => `<circle cx="292" cy="${y}" r="5" fill="#c9c7c2"/>`).join("")}<g transform="translate(372 556)"><rect x="-18" y="-8" width="36" height="16" rx="8" fill="#e8ecef"/><rect x="-18" y="-2" width="36" height="4" fill="#2a6ad0"/></g>`,
    hairBack:`<path d="M184,300 C176,226 222,170 300,166 C378,170 424,226 416,300 Z" fill="${hc}"/>`,
    hairFront:`<path d="M186,262 C188,206 236,172 300,170 C352,170 396,186 414,230 C380,206 330,204 290,214 C250,222 210,236 186,262 Z" fill="${hc}"/><path d="M240,196 C280,184 330,186 372,200" stroke="#9c9a95" stroke-width="3" fill="none"/>`,
    extra:`<g fill="none" stroke="#5a4a3a" stroke-width="5"><circle cx="246" cy="292" r="34"/><circle cx="354" cy="292" r="34"/><path d="M280,290 h40 M212,288 l-24,-6 M388,288 l24,-6"/></g>`,
  });
}
/* Aminata · solar co-op founder, Dakar: a tall patterned head wrap, gold hoops, a wax-print top, solar panels and the sun */
function amina(){
  const hc = "#0c0806";
  return person({id:"amina", skin:"brown", bg:["#d08a1e", "#7a4a0a", "#241402"], rim:"#ffd27a",
    motif:`${sunMotif}${Array.from({length:4}, (_, i) => `<path d="M${30 + i * 100},560 l40,-80 h90 l-40,80 z M${50 + i * 100},520 h90 M${75 + i * 100},480 l-20,80 M${110 + i * 100},480 l-20,80" stroke-width="4"/>`).join("")}`,
    fw:212, fh:288, jaw:.74, chin:.24, hairCol:hc, eye:{open:.48, tilt:.1, lash:true, crease:true, eyeCol:"#1a0f08"}, browTh:7, browAng:.1, browArch:8, mouth:"grin", mouthW:.21, blush:.3, cy:304, noseKind:"wide",
    clothes:`${shoulders("#2a6ad0", 478, 266)}${sideShade("#1a4a9a", 478)}${Array.from({length:7}, (_, i) => `<circle cx="${200 + i * 34}" cy="${560 + (i % 2) * 30}" r="14" fill="#f2c14e" opacity=".9"/><circle cx="${200 + i * 34}" cy="${560 + (i % 2) * 30}" r="6" fill="#e0433e"/>`).join("")}`,
    hairBack:`<path d="M190,300 C184,230 230,190 300,188 C370,190 416,230 410,300 Z" fill="${hc}"/>`,
    top:`<g><path d="M180,262 C164,180 200,70 300,60 C400,70 436,180 420,262 C390,232 350,222 300,222 C250,222 210,232 180,262 Z" fill="#e0433e"/>${[0, 1, 2, 3].map(i => `<path d="M${196 + i * 10},${236 - i * 46} C${250},${210 - i * 50} ${350},${210 - i * 50} ${404 - i * 10},${236 - i * 46}" stroke="#f2c14e" stroke-width="10" fill="none"/>`).join("")}<path d="M300,64 C340,90 360,130 350,170" stroke="#9a141e" stroke-width="6" fill="none"/></g>`,
    earrings:`<circle cx="188" cy="352" r="16" fill="none" stroke="#f2c14e" stroke-width="5"/><circle cx="412" cy="352" r="16" fill="none" stroke="#f2c14e" stroke-width="5"/>`,
  });
}
/* Nils · Sámi reindeer herder: the four-winds hat (blue with red and yellow), a gákti collar with ribbon bands, snow and antlers */
function nils(){
  const hc = "#8a6a4a";
  return person({id:"nils", skin:"fair", bg:["#5a7aa8", "#2a3e60", "#0a1222"], rim:"#d8ecff",
    motif:`${Array.from({length:40}, (_, i) => `<circle cx="${(i * 97) % 600}" cy="${(i * 53) % 640}" r="${2 + (i % 3)}" fill="#fff" stroke="none"/>`).join("")}<g transform="translate(470 420)"><path d="M0,0 C-20,-60 -60,-90 -80,-140 M-40,-70 l-40,-10 M-60,-110 l-30,0 M0,0 C20,-60 60,-90 80,-140 M40,-70 l40,-10 M60,-110 l30,0" stroke-width="6"/></g>`,
    fw:228, fh:290, jaw:.86, chin:.28, hairCol:hc, eye:{open:.38, tilt:-.06, eyeCol:"#3a6a8a", crow:true}, browTh:10, browAng:.04, browArch:5, browCol:"#8a6a4a", mouth:"smile", mouthW:.2, blush:.5, cy:304,
    beard:`<path d="M220,370 C228,432 264,464 300,466 C336,464 372,432 380,370 C366,410 338,438 300,440 C262,438 234,410 220,370 Z" fill="${hc}" opacity=".8"/>`,
    clothes:`${shoulders("#2a4ab0", 480, 276)}${sideShade("#1a3088", 480)}<path d="M236,480 C256,516 280,526 300,526 C320,526 344,516 364,480" stroke="#e0433e" stroke-width="16" fill="none"/><path d="M236,480 C256,516 280,526 300,526 C320,526 344,516 364,480" stroke="#f2c14e" stroke-width="5" fill="none" transform="translate(0 12)"/><path d="M180,600 H420" stroke="#e0433e" stroke-width="14"/><path d="M180,616 H420" stroke="#f2c14e" stroke-width="5"/>`,
    ...hairShort(hc, 190),
    top:`<g><path d="M178,244 C178,170 230,140 300,140 C370,140 422,170 422,244 Z" fill="#2a4ab0"/><path d="M174,232 H426 V256 H174 Z" fill="#e0433e"/><path d="M174,244 H426" stroke="#f2c14e" stroke-width="5"/>${[[230, 100], [300, 80], [370, 100], [300, 120]].map(([x, y], i) => `<path d="M${300 + (i - 1.5) * 30},142 L${x},${y} L${x + 30},${y + 8} L${300 + (i - 1.5) * 30 + 26},146 Z" fill="#2a4ab0" stroke="#e0433e" stroke-width="4"/>`).join("")}</g>`,
  });
}
/* Khalid · oil engineer turned hydrogen, Abu Dhabi: white ghutra with a black agal, trimmed beard, white kandura, a refinery and solar towers */
function khalid(){
  const hc = "#16100c";
  return person({id:"khalid", skin:"warm", bg:["#c89a4a", "#7a5420", "#241606"], rim:"#fff0c8",
    motif:`${sunMotif}<path d="M40,640 V440 h30 V640 M90,640 V480 h24 V640 M130,640 V400 h16 V640" stroke-width="5"/><path d="M400,640 V470 M380,470 h40 M520,640 V450 M500,450 h40" stroke-width="5"/>`,
    fw:226, fh:288, jaw:.86, chin:.3, hairCol:hc, eye:{open:.4, tilt:-.02, eyeCol:"#2a1a10"}, browTh:11, browAng:.1, browArch:5, mouth:"smile", mouthW:.2, blush:.2, cy:304, noseW:.15,
    beard:`<path d="M220,360 C228,434 264,470 300,472 C336,470 372,434 380,360 C366,410 338,440 300,442 C262,440 234,410 220,360 Z" fill="${hc}"/><path d="M260,402 C280,392 320,392 340,402 C320,398 280,398 260,402 Z" fill="${hc}"/>`,
    clothes:`${shoulders("#f4f2ec", 478, 276)}${sideShade("#d6d2c6", 478)}<path d="M300,486 V600" stroke="#d6d2c6" stroke-width="4"/><path d="M300,600 C296,610 304,616 300,626" stroke="#c9c4b6" stroke-width="5" fill="none"/>`,
    hairBack:`<path d="M152,620 C130,420 150,200 300,170 C450,200 470,420 448,620 L400,640 C410,520 404,380 390,300 L210,300 C196,380 190,520 200,640 Z" fill="#f4f2ec"/><path d="M152,620 C130,420 150,200 300,170" stroke="#d6d2c6" stroke-width="4" fill="none"/>`,
    top:`<g><path d="M184,282 C176,200 226,150 300,146 C374,150 424,200 416,282 C400,240 360,222 300,222 C240,222 200,240 184,282 Z" fill="#f4f2ec"/><path d="M186,214 C230,190 370,190 414,214 L414,234 C370,212 230,212 186,234 Z" fill="#1a1a1e"/><path d="M188,236 C232,214 368,214 412,236 L412,252 C368,232 232,232 188,252 Z" fill="#2a2a30"/></g>`,
  });
}
/* Elena · permafrost researcher, Yakutsk: fur ushanka, rosy cold cheeks, a parka with a fur hood, the tundra and a borehole sensor */
function elena(){
  const hc = "#c8a070";
  return person({id:"elena", skin:"fair", bg:["#6a8aa8", "#34485e", "#0e161e"], rim:"#e0f0ff",
    motif:`<path d="M0,470 C100,450 200,490 300,470 S500,450 600,480" stroke-width="5"/>${Array.from({length:9}, (_, i) => `<path d="M${20 + i * 68},470 V${400 + (i % 3) * 20} M${10 + i * 68},${420 + (i % 3) * 20} l10,-16 l10,16" stroke-width="4"/>`).join("")}<path d="M480,640 V360 M470,360 h20 M480,400 h30 M480,440 h30" stroke-width="5"/>`,
    fw:214, fh:282, jaw:.74, chin:.24, hairCol:hc, eye:{open:.46, tilt:.06, lash:true, crease:true, eyeCol:"#4a7a9a"}, browTh:7, browAng:.08, browArch:7, browCol:"#a8804a", mouth:"smile", mouthW:.19, blush:.75, cy:306,
    clothes:`${shoulders("#c8402e", 480, 280)}${sideShade("#9a2a1e", 480)}<path d="M170,500 C200,460 250,450 300,450 C350,450 400,460 430,500 C410,540 380,550 300,550 C220,550 190,540 170,500 Z" fill="#d8ccb8"/>${Array.from({length:18}, (_, i) => `<path d="M${180 + i * 14},${500 + Math.sin(i) * 20} l6,-10" stroke="#b8a888" stroke-width="3"/>`).join("")}<path d="M300,550 V640" stroke="#9a2a1e" stroke-width="5"/>`,
    hairBack:`<path d="M190,330 C182,250 226,200 300,198 C374,200 418,250 410,330 Z" fill="${hc}"/>`,
    hairFront:`<path d="M190,280 C196,240 240,222 300,222 C360,222 404,240 410,280 C390,262 350,254 300,254 C250,254 210,262 190,280 Z" fill="${hc}"/>`,
    top:`<g><path d="M176,250 C176,160 230,120 300,120 C370,120 424,160 424,250 Z" fill="#7a5a3a"/><path d="M164,262 C164,220 200,200 300,200 C400,200 436,220 436,262 L436,280 C400,252 200,252 164,280 Z" fill="#a88a68"/>${Array.from({length:24}, (_, i) => `<path d="M${170 + i * 11},${236 + (i % 2) * 6} l4,-12" stroke="#c8ac88" stroke-width="3"/>`).join("")}<path d="M150,262 C130,320 140,380 168,420 C186,400 190,340 180,270 Z M450,262 C470,320 460,380 432,420 C414,400 410,340 420,270 Z" fill="#a88a68"/></g>`,
  });
}

/* Auntie Noi · curry-rice vendor, Bangkok: hair in a bun with a pin, plump cheeks, a pink blouse and a checked apron, a ladle, pots of curry behind */
function noi(){
  const hc = "#1a1210";
  return person({id:"noi", skin:"warm", bg:["#d0507a", "#7a2440", "#240812"], rim:"#ffc8d8",
    motif:`${[90, 250, 410].map(x => `<path d="M${x - 60},470 h120 v-20 h-120 z M${x - 54},470 C${x - 54},540 ${x + 54},540 ${x + 54},470" stroke-width="5"/><path d="M${x - 20},430 c0,-20 16,-20 16,-40 M${x + 14},430 c0,-20 16,-20 16,-40" stroke-width="4"/>`).join("")}`,
    fw:236, fh:280, jaw:.86, chin:.32, hairCol:hc, eye:{open:.36, tilt:.02, lash:true, eyeCol:"#22140c", crow:true}, browTh:7, browAng:.1, browArch:8, mouth:"grin", mouthW:.23, blush:.6, cy:302,
    clothes:`${shoulders("#ff8fb0", 476, 272)}${sideShade("#d8688c", 476)}<path d="M220,500 L380,500 L396,640 L204,640 Z" fill="#f4f2ec"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${220 + i * 40},500 V640" stroke="#3a7ad0" stroke-width="4" opacity=".5"/><path d="M210,${520 + i * 28} H390" stroke="#3a7ad0" stroke-width="4" opacity=".5"/>`).join("")}<path d="M220,500 C240,470 260,470 270,476 M380,500 C360,470 340,470 330,476" stroke="#f4f2ec" stroke-width="10" fill="none"/>
      <g transform="translate(420 560) rotate(-30)"><rect x="-6" y="-100" width="12" height="110" rx="5" fill="#a87a4a"/><ellipse cx="0" cy="20" rx="30" ry="18" fill="#c9c7c2" stroke="#8a8780" stroke-width="3"/></g>`,
    hairBack:`<path d="M184,310 C176,232 222,178 300,174 C378,178 424,232 416,310 Z" fill="${hc}"/><circle cx="300" cy="150" r="46" fill="${hc}"/><path d="M250,140 L352,118" stroke="#f2c14e" stroke-width="6" stroke-linecap="round"/><circle cx="352" cy="118" r="8" fill="#e0433e"/>`,
    hairFront:`<path d="M186,266 C188,206 238,180 300,180 C362,180 412,206 414,266 C394,232 352,214 300,214 C248,214 206,232 186,266 Z" fill="${hc}"/><path d="M232,200 C260,190 290,188 320,190" stroke="#4a3a34" stroke-width="3" fill="none"/>`,
  });
}

let LIST = [];
for (const o of ["base", "alt", "gold"]) LIST.push([`sci-${o}`, sci(o)], [`dip-${o}`, dip(o)], [`eco-${o}`, eco(o)], [`act-${o}`, act(o)], [`oce-${o}`, oce(o)], [`eng-${o}`, eng(o)]);
LIST.push(["adv", adv()], ["opp", opp()], ["fon", fon()], ["lung", lung()]);
for (const [n, f] of Object.entries({ali, tala, ravi, jonas, rahima, lekuta, maria, kaue, mei, sofia, hiro, amina, nils, khalid, elena, noi})) LIST.push([n, f()]);
const only = arg("--only"); if (only){ const k = only.split(","); LIST = LIST.filter(([n]) => k.includes(n.split("-")[0])); }
fs.mkdirSync(OUT, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium"});
const page = await browser.newPage({viewport:{width:W, height:H}, deviceScaleFactor:1});
const FONT = path.join(HERE, "../../assets/fonts/kanit-thai-600.woff2");
for (const [name, svg] of LIST){
  await page.setContent(`<html><head><style>@font-face{font-family:Kanit;src:url('file://${FONT}');font-weight:600}</style></head><body style="margin:0;background:#000">${svg}</body></html>`);
  await page.waitForTimeout(30);
  await page.screenshot({path:path.join(OUT, name + ".jpg"), type:"jpeg", quality:90, clip:{x:0, y:0, width:W, height:H}});
}
const sheet = arg("--sheet");
if (sheet){
  const imgs = LIST.map(([n]) => `<figure style="margin:2px;display:inline-block;text-align:center;color:#ccc;font:12px sans-serif"><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(OUT, n + ".jpg")).toString("base64")}" style="width:240px;height:256px;display:block">${n}</figure>`).join("");
  await page.setViewportSize({width:6 * 246, height:Math.ceil(LIST.length / 6) * 278});
  await page.setContent(`<html><body style="margin:0;background:#222">${imgs}</body></html>`);
  await page.screenshot({path:sheet, fullPage:true});
}
await browser.close();
console.log("people:", LIST.length);
