/* Character portraits: hand-made vector illustrations (semi-realistic, soft shading), drawn as SVG and rendered to JPG.
   Output: assets/img/portraits/{sci,dip,eco,act}-{base,alt,gold}.jpg and adv.jpg
   Usage: node tools/make-portraits.mjs [--sheet out.png] */
import {chromium} from "playwright";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "../../assets/img/portraits");
const W = 600, H = 640;

const SKIN = {
  warm:  {base:"#e2b48f", mid:"#d39d77", shade:"#b97d58", deep:"#8f5a3c", hi:"#f3d2b3", blush:"#e88d7a", lip:"#b8615a", lipHi:"#d98278"},
  tan:   {base:"#d6a27b", mid:"#c48b64", shade:"#a96e4a", deep:"#7d4c31", hi:"#ecc3a0", blush:"#de8270", lip:"#a85a50", lipHi:"#c9776b"},
  light: {base:"#ecc6a4", mid:"#ddb08b", shade:"#c58f6a", deep:"#9a6447", hi:"#f8e0c8", blush:"#f09a88", lip:"#c46a68", lipHi:"#e08e88"},
};

function portrait(o){
  const s = SKIN[o.skin || "warm"], male = o.male, id = o.id;
  const cx = 300, hy = 300;                     // face centre
  const fw = male ? 124 : 116, chinY = male ? 478 : 470, jaw = male ? 0.82 : 0.66;
  const g = (n) => `${id}-${n}`;
  // face outline
  const face = `M${cx},${hy - 150}
    C${cx + fw * 0.78},${hy - 150} ${cx + fw + 6},${hy - 95} ${cx + fw + 4},${hy - 5}
    C${cx + fw + 2},${hy + 60} ${cx + fw * jaw + 10},${hy + 120} ${cx + fw * 0.45},${chinY - 18}
    C${cx + 26},${chinY} ${cx - 26},${chinY} ${cx - fw * 0.45},${chinY - 18}
    C${cx - fw * jaw - 10},${hy + 120} ${cx - fw - 2},${hy + 60} ${cx - fw - 4},${hy - 5}
    C${cx - fw - 6},${hy - 95} ${cx - fw * 0.78},${hy - 150} ${cx},${hy - 150} Z`;
  const ey = hy + 18, ex = male ? 48 : 46;
  const eye = (x, flip) => {
    const k = flip ? -1 : 1, w = male ? 27 : 28, h = male ? 11 : 13;
    return `
    <path d="M${x - w},${ey} C${x - w * .5},${ey - h * 1.25} ${x + w * .55},${ey - h * 1.25} ${x + w},${ey + 1} C${x + w * .5},${ey + h * .95} ${x - w * .5},${ey + h * .95} ${x - w},${ey} Z" fill="#fbf6f1"/>
    <clipPath id="${g("ec" + x)}"><path d="M${x - w},${ey} C${x - w * .5},${ey - h * 1.25} ${x + w * .55},${ey - h * 1.25} ${x + w},${ey + 1} C${x + w * .5},${ey + h * .95} ${x - w * .5},${ey + h * .95} ${x - w},${ey} Z"/></clipPath>
    <g clip-path="url(#${g("ec" + x)})">
      <circle cx="${x + k * 1}" cy="${ey + 1}" r="${h + 2}" fill="url(#${g("iris")})"/>
      <circle cx="${x + k * 1}" cy="${ey + 1}" r="${h * .45}" fill="#140b07"/>
      <rect x="${x - w}" y="${ey - h * 1.4}" width="${w * 2}" height="${h * .75}" fill="#000" opacity=".22"/>
    </g>
    <circle cx="${x + k * 1 - 4}" cy="${ey - 4}" r="3.2" fill="#fff" opacity=".95"/>
    <circle cx="${x + k * 1 + 4}" cy="${ey + 4}" r="1.5" fill="#fff" opacity=".6"/>
    <path d="M${x - w - 3},${ey + 1} C${x - w * .5},${ey - h * 1.45} ${x + w * .55},${ey - h * 1.45} ${x + w + 4},${ey - 1}" fill="none" stroke="#2a1810" stroke-width="${male ? 3.4 : 4.2}" stroke-linecap="round"/>
    ${male ? "" : `<path d="M${x + k * (w - 2)},${ey - 3} l${k * 7},-5" stroke="#2a1810" stroke-width="2.4" stroke-linecap="round"/>`}
    <path d="M${x - w * .8},${ey - h * 1.7} C${x - w * .3},${ey - h * 2.2} ${x + w * .4},${ey - h * 2.2} ${x + w * .85},${ey - h * 1.6}" fill="none" stroke="${s.shade}" stroke-width="2" opacity=".55"/>
    <path d="M${x - w * .7},${ey + h * .95} C${x - w * .2},${ey + h * 1.25} ${x + w * .3},${ey + h * 1.25} ${x + w * .75},${ey + h * .85}" fill="none" stroke="${s.shade}" stroke-width="1.6" opacity=".45"/>`;
  };
  const brow = (x, flip) => {
    const k = flip ? -1 : 1, by = ey - (male ? 34 : 38), t = male ? 9 : 6;
    return `<path d="M${x - k * 30},${by + 8} C${x - k * 14},${by - 4} ${x + k * 8},${by - 6} ${x + k * 32},${by + 2} C${x + k * 10},${by + 2 + t * .2} ${x - k * 12},${by + t * .6} ${x - k * 30},${by + 8 + t * .5} Z" fill="${o.brow || o.hair}" opacity=".95"/>`;
  };
  const ny = hy + 78, my = hy + 118;
  const smile = o.smile ?? 1;
  const mouthW = male ? 38 : 35;
  const W2 = mouthW, open = smile >= .8, d = open ? 12 + smile * 9 : 3;
  const lips = `
    <clipPath id="${g("mouth")}"><path d="M${cx - W2},${my} C${cx - W2 * .5},${my + 3} ${cx + W2 * .5},${my + 3} ${cx + W2},${my} C${cx + W2 * .6},${my + d} ${cx - W2 * .6},${my + d} ${cx - W2},${my} Z"/></clipPath>
    ${open ? `<path d="M${cx - W2},${my} C${cx - W2 * .5},${my + 3} ${cx + W2 * .5},${my + 3} ${cx + W2},${my} C${cx + W2 * .6},${my + d} ${cx - W2 * .6},${my + d} ${cx - W2},${my} Z" fill="#4a1d1a"/>
    <g clip-path="url(#${g("mouth")})"><path d="M${cx - W2},${my - 2} L${cx + W2},${my - 2} L${cx + W2},${my + 2} C${cx + W2 * .5},${my + d * .5} ${cx - W2 * .5},${my + d * .5} ${cx - W2},${my + 2} Z" fill="#fbf4ef"/><ellipse cx="${cx}" cy="${my + d}" rx="${W2 * .45}" ry="${d * .35}" fill="#b4504c" opacity=".8"/></g>` : ""}
    <path d="M${cx - W2 - 2},${my} C${cx - W2 * .45},${my - 7} ${cx - 6},${my - 8} ${cx},${my - 5} C${cx + 6},${my - 8} ${cx + W2 * .45},${my - 7} ${cx + W2 + 2},${my} C${cx + W2 * .5},${my - 1} ${cx - W2 * .5},${my - 1} ${cx - W2 - 2},${my} Z" fill="${s.lip}"/>
    <path d="M${cx - W2 * .82},${my + d - 1} C${cx - W2 * .4},${my + d + 11} ${cx + W2 * .4},${my + d + 11} ${cx + W2 * .82},${my + d - 1} C${cx + W2 * .4},${my + d + 3} ${cx - W2 * .4},${my + d + 3} ${cx - W2 * .82},${my + d - 1} Z" fill="url(#${g("lip")})"/>
    <ellipse cx="${cx - 4}" cy="${my + d + 6}" rx="${W2 * .3}" ry="2.4" fill="#fff" opacity=".22"/>
    <path d="M${cx - W2 - 3},${my + 1} c-4,-2 -6,-5 -6,-9 M${cx + W2 + 3},${my + 1} c4,-2 6,-5 6,-9" stroke="${s.deep}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M${cx - W2 - 14},${my - 18} C${cx - W2 - 20},${my - 4} ${cx - W2 - 14},${my + 10} ${cx - W2 - 6},${my + 16} M${cx + W2 + 14},${my - 18} C${cx + W2 + 20},${my - 4} ${cx + W2 + 14},${my + 10} ${cx + W2 + 6},${my + 16}" stroke="${s.shade}" stroke-width="2.4" fill="none" opacity="${(open ? .45 : .25) * (o.age ?? .6)}" stroke-linecap="round"/>`;
  const nose = `
    <path d="M${cx - 8},${ey + 12} C${cx - 10},${ny - 30} ${cx - 14},${ny - 12} ${cx - 18},${ny}" fill="none" stroke="${s.shade}" stroke-width="3" opacity=".35" stroke-linecap="round"/>
    <path d="M${cx - 22},${ny + 2} C${cx - 16},${ny + 12} ${cx - 6},${ny + 10} ${cx},${ny + 12} C${cx + 6},${ny + 10} ${cx + 16},${ny + 12} ${cx + 22},${ny + 2}" fill="none" stroke="${s.deep}" stroke-width="2.6" opacity=".55" stroke-linecap="round"/>
    <ellipse cx="${cx - 11}" cy="${ny + 7}" rx="5" ry="3" fill="${s.deep}" opacity=".55"/><ellipse cx="${cx + 11}" cy="${ny + 7}" rx="5" ry="3" fill="${s.deep}" opacity=".55"/>
    <ellipse cx="${cx + 2}" cy="${ny - 8}" rx="6" ry="9" fill="${s.hi}" opacity=".55"/>`;
  const ears = `
    <path d="M${cx - fw - 2},${ey - 12} C${cx - fw - 30},${ey - 26} ${cx - fw - 32},${ey + 40} ${cx - fw + 4},${ey + 56} Z" fill="${s.mid}"/>
    <path d="M${cx - fw - 4},${ey} C${cx - fw - 20},${ey - 6} ${cx - fw - 20},${ey + 30} ${cx - fw},${ey + 38}" fill="none" stroke="${s.shade}" stroke-width="3" opacity=".6"/>
    <path d="M${cx + fw + 2},${ey - 12} C${cx + fw + 30},${ey - 26} ${cx + fw + 32},${ey + 40} ${cx + fw - 4},${ey + 56} Z" fill="${s.shade}"/>`;
  const neck = `
    <path d="M${cx - 60},${chinY - 60} L${cx - 66},${chinY + 60} C${cx - 20},${chinY + 80} ${cx + 20},${chinY + 80} ${cx + 66},${chinY + 60} L${cx + 60},${chinY - 60} Z" fill="url(#${g("neck")})"/>
    <path d="M${cx - 58},${chinY - 20} C${cx - 20},${chinY + 18} ${cx + 20},${chinY + 18} ${cx + 58},${chinY - 20} L${cx + 56},${chinY + 14} C${cx + 20},${chinY + 40} ${cx - 20},${chinY + 40} ${cx - 56},${chinY + 14} Z" fill="${s.deep}" opacity=".35" filter="url(#${g("soft")})"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="45 70 510 544">
  <defs>
    <radialGradient id="${g("bg")}" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${o.bg[0]}"/><stop offset=".6" stop-color="${o.bg[1]}"/><stop offset="1" stop-color="${o.bg[2]}"/></radialGradient>
    <radialGradient id="${g("skin")}" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="${s.hi}"/><stop offset=".45" stop-color="${s.base}"/><stop offset=".85" stop-color="${s.mid}"/><stop offset="1" stop-color="${s.shade}"/></radialGradient>
    <linearGradient id="${g("side")}" x1="0" x2="1"><stop offset=".55" stop-color="${s.deep}" stop-opacity="0"/><stop offset="1" stop-color="${s.deep}" stop-opacity=".42"/></linearGradient>
    <linearGradient id="${g("neck")}" x1="0" x2="1"><stop offset="0" stop-color="${s.mid}"/><stop offset=".6" stop-color="${s.base}"/><stop offset="1" stop-color="${s.shade}"/></linearGradient>
    <radialGradient id="${g("iris")}" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#8a5a35"/><stop offset=".55" stop-color="#4a2a17"/><stop offset="1" stop-color="#1c0f08"/></radialGradient>
    <linearGradient id="${g("lip")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.lip}"/><stop offset="1" stop-color="${s.lipHi}"/></linearGradient>
    <linearGradient id="${g("hair")}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.hairHi}"/><stop offset=".4" stop-color="${o.hair}"/><stop offset="1" stop-color="${o.hairDark || "#0c0807"}"/></linearGradient>
    <linearGradient id="${g("cloth")}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.cloth[0]}"/><stop offset=".55" stop-color="${o.cloth[1]}"/><stop offset="1" stop-color="${o.cloth[2]}"/></linearGradient>
    <linearGradient id="${g("inner")}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.inner[0]}"/><stop offset="1" stop-color="${o.inner[1]}"/></linearGradient>
    <radialGradient id="${g("rim")}" cx="85%" cy="40%" r="60%"><stop offset="0" stop-color="${o.rim}" stop-opacity=".18"/><stop offset="1" stop-color="${o.rim}" stop-opacity="0"/></radialGradient>
    <filter id="${g("soft")}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="${g("soft2")}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="${g("grain")}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .08 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <filter id="${g("stub")}"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="9"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .07  0 0 0 0 .05  0 0 0 2.2 -1.1"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <clipPath id="${g("faceclip")}"><path d="${face}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${g("bg")})"/>
  ${[...Array(9)].map((_, i) => `<circle cx="${(i * 137 + 40) % W}" cy="${(i * 89 + 60) % 380}" r="${18 + (i * 23) % 40}" fill="${o.bg[0]}" opacity="${.08 + (i % 3) * .04}" filter="url(#${g("soft")})"/>`).join("")}
  ${o.backHair || ""}
  ${neck}
  ${o.body}
  ${o.noEars ? "" : ears}
  <path d="${face}" fill="url(#${g("skin")})"/>
  <path d="${face}" fill="url(#${g("side")})"/>
  <g clip-path="url(#${g("faceclip")})">
    <ellipse cx="${cx - 62}" cy="${ny + 18}" rx="34" ry="20" fill="${s.blush}" opacity="${male ? .18 : .32}" filter="url(#${g("soft")})"/>
    <ellipse cx="${cx + 62}" cy="${ny + 18}" rx="34" ry="20" fill="${s.blush}" opacity="${male ? .15 : .28}" filter="url(#${g("soft")})"/>
    <ellipse cx="${cx - 20}" cy="${hy - 95}" rx="55" ry="30" fill="${s.hi}" opacity=".5" filter="url(#${g("soft")})"/>
    <path d="M${cx + fw - 6},${hy + 10} C${cx + fw - 20},${hy + 80} ${cx + 60},${chinY - 30} ${cx + 20},${chinY - 4}" stroke="${s.deep}" stroke-width="26" fill="none" opacity=".16" filter="url(#${g("soft")})"/>
    <path d="M${cx - fw + 8},${hy + 10} C${cx - fw + 20},${hy + 80} ${cx - 60},${chinY - 30} ${cx - 20},${chinY - 4}" stroke="${s.deep}" stroke-width="18" fill="none" opacity=".08" filter="url(#${g("soft")})"/>
    <ellipse cx="${cx}" cy="${chinY - 26}" rx="26" ry="12" fill="${s.hi}" opacity=".35" filter="url(#${g("soft2")})"/>
    <path d="M${cx - fw},${hy - 150} L${cx + fw},${hy - 150} L${cx + fw},${hy - 60} C${cx + 40},${hy - 40} ${cx - 40},${hy - 40} ${cx - fw},${hy - 60} Z" fill="${s.deep}" opacity=".12" filter="url(#${g("soft")})"/>
    ${o.beard ? `<path d="M${cx - fw + 10},${hy + 50} C${cx - fw + 20},${chinY - 10} ${cx - 30},${chinY + 6} ${cx},${chinY + 6} C${cx + 30},${chinY + 6} ${cx + fw - 20},${chinY - 10} ${cx + fw - 10},${hy + 50} C${cx + 60},${my + 30} ${cx - 60},${my + 30} ${cx - fw + 10},${hy + 50} Z" fill="#3a2a22" opacity=".28" filter="url(#${g("stub")})"/>
      <path d="M${cx - 38},${my - 10} C${cx - 20},${my - 19} ${cx + 20},${my - 19} ${cx + 38},${my - 10} C${cx + 22},${my - 12} ${cx - 22},${my - 12} ${cx - 38},${my - 10} Z" fill="#2a1d17" opacity=".6"/>
      <path d="M${cx - 16},${my + 34} C${cx - 12},${chinY - 4} ${cx + 12},${chinY - 4} ${cx + 16},${my + 34} C${cx + 8},${my + 38} ${cx - 8},${my + 38} ${cx - 16},${my + 34} Z" fill="#2a1d17" opacity=".5"/>` : ""}
  </g>
  <path d="${face}" fill="none" stroke="${s.deep}" stroke-width="1.4" opacity=".35"/>
  ${eye(cx - ex)}${eye(cx + ex, true)}
  ${brow(cx - ex)}${brow(cx + ex, true)}
  ${nose}
  ${lips}
  ${o.frontHair}
  ${o.glasses || ""}
  ${o.extra || ""}
  <rect width="${W}" height="${H}" fill="url(#${g("rim")})"/>
  <rect width="${W}" height="${H}" filter="url(#${g("grain")})" fill="#fff"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <defs><filter id="sheen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter><radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>
</svg>`;
}

/* ---------- shared clothing / hair pieces ---------- */
const shoulders = (fill, extra = "") => `<g transform="translate(0 -22)"><path d="M30,${H + 30} C40,575 120,535 215,520 C245,516 270,540 300,546 C330,540 355,516 385,520 C480,535 560,575 570,${H + 30} Z" fill="${fill}"/>${extra}</g>`;
const glassesRect = (col, lens = .12) => `<g fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round">
  <rect x="216" y="290" width="76" height="52" rx="10"/><rect x="308" y="290" width="76" height="52" rx="10"/>
  <path d="M292,308 C297,300 303,300 308,308"/><path d="M216,304 L178,296"/><path d="M384,304 L422,296"/></g>
  <rect x="219" y="293" width="70" height="46" rx="8" fill="#bfe8ff" opacity="${lens}"/><rect x="311" y="293" width="70" height="46" rx="8" fill="#bfe8ff" opacity="${lens}"/>
  <path d="M228,300 l18,0 l-24,30 z M320,300 l18,0 l-24,30 z" fill="#fff" opacity=".18"/>`;
const glassesRound = (col) => `<g fill="none" stroke="${col}" stroke-width="3.6"><circle cx="254" cy="318" r="33"/><circle cx="346" cy="318" r="33"/><path d="M287,312 C293,304 307,304 313,312"/><path d="M221,312 L184,302"/><path d="M379,312 L416,302"/></g>
  <circle cx="254" cy="318" r="31" fill="#fff3d6" opacity=".1"/><circle cx="346" cy="318" r="31" fill="#fff3d6" opacity=".1"/><path d="M236,300 a28,28 0 0 1 22,-10" stroke="#fff" stroke-width="3" fill="none" opacity=".4"/><path d="M328,300 a28,28 0 0 1 22,-10" stroke="#fff" stroke-width="3" fill="none" opacity=".4"/>`;
const strands = (paths, col = "#ffffff", op = .07) => `<g fill="none" stroke="${col}" stroke-width="7" opacity="${op}" stroke-linecap="round" filter="url(#sheen)">${paths.map(d => `<path d="${d}"/>`).join("")}</g>`;

/* ---------- characters ---------- */
function sci(outfit){
  const id = "sci-" + outfit, gold = outfit === "gold";
  const coat = outfit === "alt" ? ["#7c8a52", "#5d6b3a", "#3c4524"] : ["#ffffff", "#e8eef0", "#b9c6cb"];
  const shirt = outfit === "alt" ? ["#9aa0a6", "#6b7177"] : ["#1f6b55", "#123f33"];
  return portrait({id, male:true, skin:"warm", beard:true, hair:"#1a1210", hairHi:"#4a3a33", brow:"#1a1210",
    bg:gold ? ["#5a4a1a", "#2a2410", "#0d0b06"] : ["#1f6f66", "#0f3a38", "#061615"], rim:gold ? "#f2c14e" : "#5fd39a",
    cloth:coat, inner:shirt,
    body:shoulders(`url(#${id}-cloth)`, `
      <path d="M230,522 L300,640 L370,522 C350,530 330,546 300,550 C270,546 250,530 230,522 Z" fill="url(#${id}-inner)"/>
      <path d="M262,532 L300,600 L338,532 L326,528 L300,572 L274,528 Z" fill="${shirt[0]}" opacity=".9"/>
      <path d="M215,520 L262,532 L300,640 L240,640 L196,560 Z" fill="${coat[1]}"/><path d="M385,520 L338,532 L300,640 L360,640 L404,560 Z" fill="${coat[2]}"/>
      <path d="M215,520 L262,532 L248,575 Z M385,520 L338,532 L352,575 Z" fill="#000" opacity=".08"/>
      ${outfit === "alt" ? `<rect x="390" y="580" width="58" height="40" rx="6" fill="#4b5530"/><path d="M392,590 h54" stroke="#2d331c" stroke-width="3"/>` : `<rect x="392" y="584" width="44" height="56" rx="6" fill="#e9f3f6" stroke="#9fb3ba" stroke-width="2"/><rect x="400" y="596" width="28" height="8" rx="2" fill="#4fd1c5"/><rect x="400" y="610" width="20" height="4" rx="2" fill="#9fb3ba"/>`}
      ${gold ? `<circle cx="250" cy="590" r="11" fill="#f2c14e" stroke="#a0761a" stroke-width="3"/>` : ""}`),
    backHair:`<path d="M168,300 C152,186 218,104 302,102 C388,100 450,184 432,300 C426,270 420,256 414,248 L186,248 C180,256 174,270 168,300 Z" fill="url(#${id}-hair)"/>`,
    frontHair:`<path d="M176,276 C170,184 228,124 304,122 C380,122 434,178 424,272 C418,236 406,212 390,198 C356,214 312,214 280,196 C292,184 300,170 304,150 C282,180 236,196 206,204 C192,222 182,246 176,276 Z" fill="url(#${id}-hair)"/>
      <path d="M176,276 C178,258 182,244 190,232 L196,300 C188,296 180,290 176,276 Z M424,272 C422,256 418,244 410,232 L404,300 C412,296 420,288 424,272 Z" fill="#8c8580" opacity=".35" filter="url(#sheen)"/>
      ${strands(["M240,150 C270,140 320,138 360,152", "M226,176 C266,160 330,160 380,176", "M300,128 C318,150 330,170 336,196"])}`,
    glasses:glassesRect("#1d1d22"),
  });
}
function dip(outfit){
  const id = "dip-" + outfit, gold = outfit === "gold";
  const jacket = outfit === "alt" ? ["#7a3f8f", "#56286a", "#331540"] : ["#2b3f6e", "#1b2b52", "#0e1733"];
  return portrait({id, male:false, skin:"light", hair:"#15100e", hairHi:"#3c2e2a", smile:.7, age:.7,
    bg:gold ? ["#5a4a1a", "#2a2410", "#0d0b06"] : ["#2a4f86", "#14284a", "#070f1e"], rim:gold ? "#f2c14e" : "#8fd0ff",
    cloth:jacket, inner:["#ffffff", "#dfe6ee"],
    backHair:`<path d="M170,300 C152,180 220,104 300,102 C382,102 448,180 430,300 L410,330 L190,330 Z" fill="url(#${id}-hair)"/><ellipse cx="300" cy="104" rx="60" ry="44" fill="url(#${id}-hair)"/><path d="M262,90 C284,78 316,78 338,90" stroke="#fff" stroke-width="2" opacity=".15" fill="none"/>`,
    body:shoulders(`url(#${id}-cloth)`, `
      <path d="M244,524 L300,612 L356,524 C340,532 322,544 300,548 C278,544 260,532 244,524 Z" fill="url(#${id}-inner)"/>
      <path d="M215,520 L258,528 L300,640 L238,640 L192,560 Z" fill="${jacket[1]}"/><path d="M385,520 L342,528 L300,640 L362,640 L408,560 Z" fill="${jacket[2]}"/>
      <path d="M258,528 L272,560 L250,560 Z M342,528 L328,560 L350,560 Z" fill="#000" opacity=".2"/>
      <circle cx="232" cy="586" r="8" fill="${gold ? "#f2c14e" : "#d9e2ea"}" stroke="#7a8ea3" stroke-width="2"/>
      ${outfit === "alt" ? `<path d="M244,524 C262,540 282,548 300,550 C318,548 338,540 356,524" fill="none" stroke="#e7c76a" stroke-width="4"/>` : ""}`),
    frontHair:`<path d="M186,272 C170,170 228,124 300,124 C378,124 432,170 414,272 C408,232 396,200 372,186 C336,206 268,210 230,186 C206,204 194,236 186,272 Z" fill="url(#${id}-hair)"/>
      <path d="M300,128 C270,150 248,170 230,190 C262,182 288,166 300,128 Z" fill="#000" opacity=".25"/>
      ${strands(["M228,170 C250,148 280,134 310,132", "M310,132 C340,138 372,152 392,176", "M206,214 C214,186 226,168 246,152"])}
      <circle cx="${300 - 116}" cy="352" r="7" fill="#f6f1ea" stroke="#cfc6bb" stroke-width="1.5"/><circle cx="${300 + 116}" cy="352" r="7" fill="#e9e2d8" stroke="#cfc6bb" stroke-width="1.5"/>`,
  });
}
function eco(outfit){
  const id = "eco-" + outfit, gold = outfit === "gold";
  const jacket = outfit === "alt" ? ["#2f4a7a", "#1f335a", "#101c36"] : ["#2f6a4f", "#1e4a36", "#0f2a1e"];
  return portrait({id, male:false, skin:"warm", hair:"#1d1411", hairHi:"#5a4033", smile:1, noEars:true, age:.25,
    bg:gold ? ["#5a4a1a", "#2a2410", "#0d0b06"] : ["#8a5f1f", "#4a3210", "#1a1106"], rim:gold ? "#f2c14e" : "#f2b441",
    cloth:jacket, inner:["#f3e7cf", "#d8c6a4"],
    backHair:`<path d="M160,260 C150,150 226,100 300,100 C378,100 452,150 440,260 C450,340 444,420 420,446 C390,440 368,400 366,350 L234,350 C232,400 210,440 180,446 C156,420 150,340 160,260 Z" fill="url(#${id}-hair)"/>`,
    body:shoulders(`url(#${id}-cloth)`, `
      <path d="M248,500 C260,520 280,530 300,532 C320,530 340,520 352,500 L360,640 L240,640 Z" fill="url(#${id}-inner)"/>
      <path d="M252,500 C266,514 284,520 300,522 C316,520 334,514 348,500" fill="none" stroke="#bfae8c" stroke-width="3"/>
      <path d="M215,520 L250,520 L290,640 L234,640 L192,560 Z" fill="${jacket[1]}"/><path d="M385,520 L350,520 L310,640 L366,640 L408,560 Z" fill="${jacket[2]}"/>
      ${gold ? `<path d="M396,568 l14,4 -4,14 -14,-4z" fill="#f2c14e"/>` : `<path d="M398,566 l18,0 0,8 -18,0z" fill="#f2b441"/>`}`),
    frontHair:`<path d="M176,300 C160,180 220,120 300,120 C380,120 444,180 424,300 C418,250 404,214 380,196 C350,222 300,226 262,206 C232,218 204,250 194,300 Z" fill="url(#${id}-hair)"/>
      <path d="M262,206 C286,180 318,160 352,154 C330,176 300,198 262,206 Z" fill="#000" opacity=".22"/>
      ${strands(["M214,190 C236,160 266,140 300,134", "M310,134 C346,140 380,160 400,190", "M188,276 C190,240 200,212 216,192"])}`,
    glasses:glassesRound(gold ? "#f2c14e" : "#c79a3a"),
  });
}
function act(outfit){
  const id = "act-" + outfit, gold = outfit === "gold";
  const hood = outfit === "alt" ? ["#ffd23f", "#e5b318", "#a87f06"] : ["#ff7a64", "#e0533e", "#a8331f"];
  return portrait({id, male:true, skin:"tan", hair:"#140e0c", hairHi:"#3e302b", smile:1.2, age:.15,
    bg:gold ? ["#5a4a1a", "#2a2410", "#0d0b06"] : ["#8a2f2a", "#4a1614", "#1a0706"], rim:gold ? "#f2c14e" : "#ff8a7a",
    cloth:hood, inner:hood,
    backHair:`<path d="M170,290 C156,184 220,104 302,100 C386,98 448,182 430,290 L414,250 L186,250 Z" fill="url(#${id}-hair)"/>`,
    body:shoulders(`url(#${id}-cloth)`, `
      <path d="M200,528 C230,500 266,494 300,494 C334,494 370,500 400,528 C370,548 336,560 300,560 C264,560 230,548 200,528 Z" fill="${hood[2]}" opacity=".85"/>
      <path d="M232,520 C260,540 340,540 368,520" fill="none" stroke="${hood[0]}" stroke-width="10" stroke-linecap="round"/>
      <path d="M276,540 L270,606 M324,540 L330,606" stroke="#f4efe9" stroke-width="4" stroke-linecap="round"/><circle cx="270" cy="610" r="5" fill="#d9d2c9"/><circle cx="330" cy="610" r="5" fill="#d9d2c9"/>
      ${outfit === "alt" ? `<path d="M300,560 L300,640" stroke="#7a5c05" stroke-width="4"/>` : ""}
      ${gold ? `<circle cx="372" cy="592" r="12" fill="#f2c14e" stroke="#a0761a" stroke-width="3"/>` : `<circle cx="372" cy="592" r="12" fill="#5fd39a" stroke="#2f8a5e" stroke-width="3"/><path d="M366,592 q6,-10 12,0 q-6,6 -12,0z" fill="#e8fff2"/>`}`),
    frontHair:`<path d="M182,262 C168,170 226,118 300,116 C374,114 436,166 418,262 C414,236 406,214 394,200 C376,222 352,210 340,196 C322,220 290,214 278,198 C262,222 228,212 212,204 C198,220 190,240 182,262 Z" fill="url(#${id}-hair)"/>
      <path d="M212,204 L198,236 L228,214 Z M278,198 L268,236 L296,206 Z M340,196 L346,232 L360,204 Z" fill="url(#${id}-hair)"/>
      <path d="M182,214 C230,186 370,186 418,214 L420,240 C370,214 230,214 180,240 Z" fill="${gold ? "#f2c14e" : outfit === "alt" ? "#2f8a5e" : "#e0433e"}"/>
      <path d="M182,214 C230,192 370,192 418,214" stroke="#fff" stroke-width="2" opacity=".25" fill="none"/>
      ${strands(["M236,148 C266,132 330,130 370,146", "M300,118 C292,140 288,160 290,182"])}`,
  });
}
/* 1.1 → 1.5: ocean scientist (Dr. Nawa) — wetsuit jacket, dive mask pushed up on the head */
function oce(outfit){
  const id = "oce-" + outfit, gold = outfit === "gold";
  const suit = outfit === "alt" ? ["#ff9a4a", "#e0702a", "#9c4410"] : ["#1fb3a8", "#13807a", "#08433f"];
  return portrait({id, male:false, skin:"tan", hair:"#1a1210", hairHi:"#5a3f30", smile:1, age:.3,
    bg:gold ? ["#5a4a1a", "#2a2410", "#0d0b06"] : ["#1f6fa8", "#0d3a60", "#051a2c"], rim:gold ? "#f2c14e" : "#8fd0ff",
    cloth:suit, inner:["#14232b", "#0b151a"],
    backHair:`<path d="M168,290 C152,180 222,104 302,102 C384,102 450,180 432,290 L420,250 L180,250 Z" fill="url(#${id}-hair)"/>
      <path d="M408,250 C450,270 470,330 452,392 C444,420 428,436 414,430 C430,390 432,330 404,290 Z" fill="url(#${id}-hair)"/>`,
    body:shoulders(`url(#${id}-cloth)`, `
      <path d="M262,500 C276,512 290,516 300,516 C310,516 324,512 338,500 L342,560 L258,560 Z" fill="url(#${id}-inner)"/>
      <path d="M300,516 L300,640" stroke="#0b1418" stroke-width="7"/><path d="M300,516 L300,640" stroke="#c9d6dc" stroke-width="2" stroke-dasharray="6 5"/>
      <rect x="292" y="520" width="16" height="22" rx="4" fill="#c9d6dc"/>
      <path d="M215,520 C240,560 250,600 252,640 M385,520 C360,560 350,600 348,640" stroke="${suit[2]}" stroke-width="10" fill="none" opacity=".7"/>
      <path d="M200,560 C230,548 260,560 270,600" stroke="#0b151a" stroke-width="12" fill="none" opacity=".55"/>
      ${gold ? `<circle cx="384" cy="590" r="12" fill="#f2c14e" stroke="#a0761a" stroke-width="3"/>` : `<path d="M372,584 q12,-14 24,0 q-12,10 -24,0z M396,584 l8,-6 0,12z" fill="#e8fbff"/>`}`),
    frontHair:`<path d="M180,270 C168,176 226,122 302,120 C380,120 436,176 420,270 C414,232 400,206 380,192 C340,214 280,214 240,196 C214,210 192,236 180,270 Z" fill="url(#${id}-hair)"/>
      ${strands(["M226,170 C262,150 330,148 376,168", "M300,124 C312,146 318,168 320,190"])}`,
    extra:`<g transform="translate(0 -6)">
      <path d="M186,196 C220,170 380,170 414,196" stroke="#0b151a" stroke-width="12" fill="none"/>
      <rect x="214" y="150" width="172" height="58" rx="26" fill="#0b151a"/>
      <rect x="226" y="158" width="70" height="42" rx="18" fill="#8fe6ff" opacity=".85"/><rect x="304" y="158" width="70" height="42" rx="18" fill="#8fe6ff" opacity=".85"/>
      <path d="M236,166 l22,0 l-26,28z M314,166 l22,0 l-26,28z" fill="#fff" opacity=".5"/>
      <rect x="214" y="150" width="172" height="58" rx="26" fill="none" stroke="${gold ? "#f2c14e" : suit[0]}" stroke-width="4"/></g>`,
  });
}
/* 1.5: city engineer (Kla) — yellow hard hat, high-visibility vest over a blue shirt */
function eng(outfit){
  const id = "eng-" + outfit, gold = outfit === "gold";
  const shirt = outfit === "alt" ? ["#6b7177", "#4b5157", "#2c3135"] : ["#3a6fb8", "#28508a", "#16305a"];
  const vest = outfit === "alt" ? "#c6f04a" : "#ff8a1c";
  return portrait({id, male:true, skin:"light", hair:"#1a1210", hairHi:"#40322c", smile:.9, age:.45, beard:false,
    bg:gold ? ["#5a4a1a", "#2a2410", "#0d0b06"] : ["#5a6b7a", "#2e3a45", "#10161c"], rim:gold ? "#f2c14e" : "#ffc24a",
    cloth:shirt, inner:shirt,
    backHair:`<path d="M176,280 C164,200 220,150 300,148 C380,148 436,200 424,280 L410,250 L190,250 Z" fill="url(#${id}-hair)"/>`,
    body:shoulders(`url(#${id}-cloth)`, `
      <path d="M262,504 L300,560 L338,504 C326,512 314,516 300,518 C286,516 274,512 262,504 Z" fill="${shirt[2]}"/>
      <path d="M200,528 C214,520 236,516 252,516 L282,640 L214,640 C206,600 200,560 200,528 Z" fill="${vest}"/>
      <path d="M400,528 C386,520 364,516 348,516 L318,640 L386,640 C394,600 400,560 400,528 Z" fill="${vest}"/>
      <path d="M212,580 L268,580 L270,596 L214,596 Z M388,580 L332,580 L330,596 L386,596 Z" fill="#e8eef0" opacity=".95"/>
      <path d="M212,612 L274,612 L276,628 L214,628 Z M388,612 L326,612 L324,628 L386,628 Z" fill="#e8eef0" opacity=".95"/>
      ${gold ? `<circle cx="372" cy="548" r="11" fill="#f2c14e" stroke="#a0761a" stroke-width="3"/>` : `<rect x="356" y="540" width="26" height="18" rx="3" fill="#ffffff"/><rect x="360" y="545" width="18" height="4" fill="#3a6fb8"/>`}`),
    frontHair:`<path d="M186,262 C182,226 196,200 214,190 L386,190 C404,200 418,226 414,262 C408,240 396,226 380,220 L220,220 C204,226 192,240 186,262 Z" fill="url(#${id}-hair)"/>`,
    extra:`<path d="M168,212 C164,140 226,92 300,90 C374,92 436,140 432,212 Z" fill="${gold ? "#f2c14e" : outfit === "alt" ? "#f4f4f2" : "#ffcc1f"}"/>
      <path d="M150,212 C200,200 400,200 450,212 C452,226 446,232 432,232 L168,232 C154,232 148,226 150,212 Z" fill="${gold ? "#d9a520" : outfit === "alt" ? "#d6d6d2" : "#e8b000"}"/>
      <path d="M288,92 L312,92 L316,206 L284,206 Z" fill="#000" opacity=".1"/>
      <path d="M206,150 C226,118 262,100 300,98" stroke="#fff" stroke-width="7" opacity=".35" fill="none" stroke-linecap="round"/>`,
  });
}
function adv(){
  const id = "adv";
  return portrait({id, male:false, skin:"light", hair:"#120d0c", hairHi:"#3b2c29", smile:.9, noEars:true, age:.3,
    bg:["#5a3f8f", "#2c1d4f", "#0e0820"], rim:"#c3a6ff",
    cloth:["#6e4aa8", "#4d3080", "#2c1a4f"], inner:["#ffffff", "#dcd6ea"],
    backHair:`<path d="M170,250 C160,150 230,110 300,110 C372,110 442,150 430,250 L440,560 C400,580 380,560 370,520 L230,520 C220,560 200,580 160,560 Z" fill="url(#${id}-hair)"/>`,
    body:shoulders(`url(#${id}-cloth)`, `
      <path d="M246,522 L300,600 L354,522 C338,530 320,542 300,546 C280,542 262,530 246,522 Z" fill="url(#${id}-inner)"/>
      <path d="M215,520 L256,526 L300,640 L238,640 L192,560 Z" fill="#4d3080"/><path d="M385,520 L344,526 L300,640 L362,640 L408,560 Z" fill="#2c1a4f"/>`),
    frontHair:`<path d="M182,290 C166,180 224,122 300,122 C378,122 436,180 418,290 C410,244 398,210 380,194 C346,200 330,180 320,160 C300,190 256,206 214,206 C198,226 188,256 182,290 Z" fill="url(#${id}-hair)"/>
      ${strands(["M220,190 C250,160 286,140 318,140", "M330,150 C360,160 386,180 402,210", "M190,290 C188,250 196,224 212,206"])}`,
    extra:`<path d="M176,320 C170,250 200,200 240,184" fill="none" stroke="#2a2a33" stroke-width="7" stroke-linecap="round"/>
      <rect x="160" y="300" width="28" height="44" rx="12" fill="#2a2a33"/><rect x="164" y="308" width="8" height="28" rx="4" fill="#4fd1c5"/>
      <path d="M180,338 C196,392 226,420 262,428" fill="none" stroke="#2a2a33" stroke-width="5" stroke-linecap="round"/><circle cx="266" cy="428" r="7" fill="#2a2a33"/>`,
  });
}

let LIST = [];
for (const o of ["base", "alt", "gold"]){ LIST.push([`sci-${o}`, sci(o)], [`dip-${o}`, dip(o)], [`eco-${o}`, eco(o)], [`act-${o}`, act(o)], [`oce-${o}`, oce(o)], [`eng-${o}`, eng(o)]); }
LIST.push(["adv", adv()]);
// --only oce,eng → render just those characters (the others stay byte-for-byte as they are)
const oi = process.argv.indexOf("--only"); if (oi > 0){ const only = process.argv[oi + 1].split(","); LIST = LIST.filter(([n]) => only.includes(n.split("-")[0])); }
fs.mkdirSync(OUT, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium"});
const page = await browser.newPage({viewport:{width:W, height:H}, deviceScaleFactor:1});
for (const [name, svg] of LIST){
  await page.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);
  await page.screenshot({path:path.join(OUT, name + ".jpg"), type:"jpeg", quality:90, clip:{x:0, y:0, width:W, height:H}});
}
const si = process.argv.indexOf("--sheet");
if (si > 0){
  const imgs = LIST.map(([n]) => `<img src="data:image/jpeg;base64,${fs.readFileSync(path.join(OUT, n + ".jpg")).toString("base64")}" style="width:240px;height:256px;margin:2px">`).join("");
  await page.setViewportSize({width:6 * 244, height:Math.ceil(LIST.length / 6) * 260});
  await page.setContent(`<html><body style="margin:0;background:#222;display:flex;flex-wrap:wrap">${imgs}</body></html>`);
  await page.screenshot({path:process.argv[si + 1]});
}
await browser.close();
console.log("portraits:", LIST.length);
