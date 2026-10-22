/* Renders the small 3D icons for the game's values (money, policy points, minerals, approval, …) with three.js
   into assets/img/ui/3d/<id>.webp (transparent, rendered at 192 px, saved at 128 px). Usage: node tools/make-icons3d.mjs */
import {chromium} from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), WEB = path.resolve(HERE, ".."), OUT = path.resolve(WEB, "../assets/img/ui/3d");
fs.mkdirSync(OUT, {recursive:true});

const PAGE = `<!doctype html><html><body style="margin:0;background:transparent">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import {RoomEnvironment} from "three/addons/environments/RoomEnvironment.js";
import {mergeVertices} from "three/addons/utils/BufferGeometryUtils.js";
const SZ = 192;
const r = new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true});
r.setPixelRatio(1); r.setSize(SZ, SZ); r.setClearColor(0, 0);
r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .92;
document.body.appendChild(r.domElement);
const pm = new THREE.PMREMGenerator(r), env = pm.fromScene(new RoomEnvironment(), .04).texture;
const mat = (color, o = {}) => new THREE.MeshPhysicalMaterial({color, roughness:.32, metalness:0, clearcoat:.5, clearcoatRoughness:.3, ...o});
const ext = (shape, depth, bevel = .08, o = {}) => { const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled:true, bevelThickness:bevel, bevelSize:bevel * .9, bevelSegments:6, curveSegments:32, ...o}); g.center(); return g; };
const mesh = (g, m) => new THREE.Mesh(g, m);

function leafShape(s = 1){ const sh = new THREE.Shape(); sh.moveTo(0, -1 * s); sh.bezierCurveTo(.9 * s, -.6 * s, .8 * s, .6 * s, 0, 1 * s); sh.bezierCurveTo(-.8 * s, .6 * s, -.9 * s, -.6 * s, 0, -1 * s); return sh; }
function heartShape(){ const sh = new THREE.Shape(); sh.moveTo(0, -.9); sh.bezierCurveTo(-.2, -.65, -1, -.2, -1, .3); sh.bezierCurveTo(-1, .75, -.6, 1, -.3, 1); sh.bezierCurveTo(-.1, 1, 0, .85, 0, .7); sh.bezierCurveTo(0, .85, .1, 1, .3, 1); sh.bezierCurveTo(.6, 1, 1, .75, 1, .3); sh.bezierCurveTo(1, -.2, .2, -.65, 0, -.9); return sh; }
function starShape(n = 5, R = 1, r0 = .45){ const sh = new THREE.Shape(); for (let i = 0; i <= n * 2; i++){ const a = Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r0 : R; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? sh.lineTo(x, y) : sh.moveTo(x, y); } return sh; }
function roundTri(R = 1, k = .22){ const pts = [0, 1, 2].map(i => new THREE.Vector2(Math.cos(Math.PI / 2 + i * 2 * Math.PI / 3) * R, Math.sin(Math.PI / 2 + i * 2 * Math.PI / 3) * R)); const sh = new THREE.Shape();
  for (let i = 0; i < 3; i++){ const a = pts[i], b = pts[(i + 1) % 3], c = pts[(i + 2) % 3]; const p1 = a.clone().lerp(b, k), p2 = b.clone().lerp(a, k), q = b.clone().lerp(c, k); if (!i) sh.moveTo(p1.x, p1.y); sh.lineTo(p2.x, p2.y); sh.quadraticCurveTo(b.x, b.y, q.x, q.y); } return sh; }
function checkShape(){ const sh = new THREE.Shape(); sh.moveTo(-.55, .02); sh.lineTo(-.18, -.36); sh.lineTo(.58, .42); sh.lineTo(.44, .56); sh.lineTo(-.18, -.08); sh.lineTo(-.41, .16); sh.closePath(); return sh; }

const MODELS = {
  money(){ const g = new THREE.Group(), gold = mat(0xffc22e, {metalness:.65, roughness:.3, clearcoat:.5}), gold2 = mat(0xf0a81a, {metalness:.7, roughness:.35});
    const c = mesh(new THREE.CylinderGeometry(1, 1, .24, 72), gold); c.rotation.x = Math.PI / 2; g.add(c);
    const rim = mesh(new THREE.TorusGeometry(.92, .07, 16, 72), gold2); rim.position.z = .12; g.add(rim);
    const lf = mesh(ext(leafShape(.52), .05, .03), mat(0x2fa865, {metalness:.4, roughness:.3})); lf.position.z = .16; lf.rotation.z = -.5; g.add(lf);
    g.rotation.set(-.35, .45, 0); return g; },
  policy(){ const g = new THREE.Group(), paper = mat(0xf4ead0, {roughness:.6, clearcoat:.1}), roll = mat(0x7a4ff0), cap = mat(0xf2c14e, {metalness:1, roughness:.3});
    const sheet = mesh(new THREE.BoxGeometry(1.25, 1.5, .05), paper); g.add(sheet);
    for (const y of [.78, -.78]){ const rr = mesh(new THREE.CylinderGeometry(.16, .16, 1.5, 32), roll); rr.rotation.z = Math.PI / 2; rr.position.set(0, y, .06); g.add(rr);
      for (const x of [.78, -.78]){ const e = mesh(new THREE.SphereGeometry(.13, 20, 16), cap); e.position.set(x, y, .06); g.add(e); } }
    for (let i = 0; i < 4; i++){ const ln = mesh(new THREE.BoxGeometry(.8 - (i % 2) * .25, .05, .02), mat(0x9a8f78, {roughness:.8})); ln.position.set(-.05 - (i % 2) * .12, .36 - i * .2, .04); g.add(ln); }
    const seal = mesh(new THREE.CylinderGeometry(.2, .2, .07, 32), mat(0xe0443a)); seal.rotation.x = Math.PI / 2; seal.position.set(.35, -.42, .07); g.add(seal);
    g.rotation.set(-.25, .4, .12); return g; },
  /* minerals: a dark rock with violet crystal prisms and a copper nugget (1.1: reads as "minerals" even at 30 px, unlike the Gems diamond) */
  ore(){ const g = new THREE.Group();
    let rg = new THREE.IcosahedronGeometry(.78, 1); rg.deleteAttribute("normal"); rg.deleteAttribute("uv"); rg = mergeVertices(rg); const p = rg.attributes.position;
    for (let i = 0; i < p.count; i++){ const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = 1 + (Math.sin(v.x * 4.1) + Math.sin(v.y * 3.3 + 1) + Math.sin(v.z * 5.2 + 2)) * .07; v.multiplyScalar(k); v.y = v.y * .55 - .35; p.setXYZ(i, v.x, v.y, v.z); }
    rg.computeVertexNormals(); g.add(mesh(rg, mat(0x4a4f5c, {roughness:.9, clearcoat:0, flatShading:true})));
    const cr = mat(0xa77bff, {roughness:.08, metalness:.1, clearcoat:1, flatShading:true, emissive:0x3a1a8a, emissiveIntensity:.35});
    const cr2 = mat(0x5fe3ff, {roughness:.08, metalness:.1, clearcoat:1, flatShading:true, emissive:0x0a4a6a, emissiveIntensity:.3});
    const prism = (r, h, m) => { const gg = new THREE.Group(); const body = mesh(new THREE.CylinderGeometry(r, r, h, 6, 1), m); gg.add(body); const tip = mesh(new THREE.ConeGeometry(r, r * 1.5, 6, 1), m); tip.position.y = h / 2 + r * .75; gg.add(tip); return gg; };
    [[-.05, .3, .1, .34, 1.2, 0, cr], [-.5, .1, .0, .25, .8, .5, cr], [.45, .12, .15, .27, .9, -.45, cr2], [.15, .0, .45, .18, .5, -.2, cr2]].forEach(([x, y, z, r, h, rz, m]) => { const c = prism(r, h, m); c.position.set(x, y, z); c.rotation.set(.15, .3, rz); g.add(c); });
    const nug = mesh(new THREE.DodecahedronGeometry(.22, 0), mat(0xd9823b, {metalness:.85, roughness:.3, flatShading:true})); nug.position.set(-.35, -.2, .5); nug.scale.set(1.3, .9, 1.1); g.add(nug);
    g.rotation.set(.12, .35, 0); return g; },
  appr(){ const g = new THREE.Group(), y = mat(0xffc400, {roughness:.3, clearcoat:.8}), dark = mat(0x3b2a12, {roughness:.4});
    g.add(mesh(new THREE.SphereGeometry(1, 64, 48), y));
    for (const x of [-.33, .33]){ const e = mesh(new THREE.CapsuleGeometry(.09, .18, 8, 16), dark); e.position.set(x, .25, .9); g.add(e); }
    const m = mesh(new THREE.TorusGeometry(.48, .075, 16, 48, Math.PI * .9), dark); m.rotation.z = Math.PI + Math.PI * .05; m.position.set(0, -.02, .86); m.rotation.x = -.25; g.add(m);
    for (const x of [-.6, .6]){ const ch = mesh(new THREE.SphereGeometry(.14, 20, 16), mat(0xff8a5c, {transparent:true, opacity:.55, roughness:.5})); ch.position.set(x, -.12, .78); ch.scale.z = .3; g.add(ch); }
    g.rotation.set(-.08, .3, 0); return g; },
  plan(){ const g = new THREE.Group();
    const b = mesh(new THREE.CylinderGeometry(1, 1, .3, 64), mat(0x0fa860, {roughness:.3, clearcoat:.8})); b.rotation.x = Math.PI / 2; g.add(b);
    const ring = mesh(new THREE.TorusGeometry(.98, .07, 16, 64), mat(0x4fe39a, {roughness:.25})); ring.position.z = .15; g.add(ring);
    const ck = mesh(ext(checkShape(), .12, .05), mat(0xffffff, {roughness:.2})); ck.position.z = .2; ck.scale.setScalar(1.15); g.add(ck);
    g.rotation.set(-.3, .45, 0); return g; },
  /* 1.1: a plumper, front-facing heart so it still reads as a heart at 30 px */
  heart(){ const g = new THREE.Group(), sh = new THREE.Shape(), pts = [];
    for (let i = 0; i <= 96; i++){ const t = i / 96 * Math.PI * 2; pts.push(new THREE.Vector2(16 * Math.sin(t) ** 3 / 16, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16)); }
    sh.setFromPoints(pts);
    const h = mesh(ext(sh, .42, .26, {curveSegments:64, bevelSegments:10}), mat(0xff2a55, {roughness:.22, clearcoat:1, clearcoatRoughness:.15, sheen:.3}));
    g.add(h); g.rotation.set(-.12, .2, 0); return g; },
  risk(){ const g = new THREE.Group(); g.add(mesh(ext(roundTri(1.1), .3, .1), mat(0xff7a00, {roughness:.3, clearcoat:.8})));
    const w = mat(0xfff7ee, {roughness:.3}); const bar = mesh(new THREE.CapsuleGeometry(.09, .38, 8, 16), w); bar.position.set(0, .05, .27); g.add(bar);
    const dot = mesh(new THREE.SphereGeometry(.1, 20, 16), w); dot.position.set(0, -.4, .27); g.add(dot); g.position.y = .1; g.rotation.set(-.15, .45, 0); return g; },
  temp(){ const g = new THREE.Group(), glass = mat(0xd8f3ff, {transmission:.85, thickness:.3, roughness:.05, transparent:true, opacity:.55}), red = mat(0xff3b30, {roughness:.25, emissive:0x801010, emissiveIntensity:.25});
    const tube = mesh(new THREE.CapsuleGeometry(.26, 1.5, 16, 32), glass); tube.position.y = .3; g.add(tube);
    const bulb = mesh(new THREE.SphereGeometry(.44, 40, 30), red); bulb.position.y = -.65; g.add(bulb);
    const liq = mesh(new THREE.CylinderGeometry(.13, .13, 1.15, 24), red); liq.position.y = .05; g.add(liq);
    for (let i = 0; i < 4; i++){ const tk = mesh(new THREE.BoxGeometry(.18, .035, .03), mat(0x5b6670)); tk.position.set(.3, .2 + i * .25, .12); g.add(tk); }
    g.rotation.set(0, .35, -.18); return g; },
  co2(){ const g = new THREE.Group(), m = mat(0xaebdcc, {roughness:.6, clearcoat:.2});
    [[-.5, -.1, 0, .5], [.05, .2, 0, .62], [.55, -.08, 0, .46], [0, -.25, .1, .5], [-.95, -.25, -.05, .32], [.95, -.25, -.05, .3]].forEach(([x, y, z, s]) => { const b = mesh(new THREE.SphereGeometry(s, 40, 30), m); b.position.set(x, y, z); g.add(b); });
    const base = mesh(new THREE.CapsuleGeometry(.36, 1.6, 12, 24), m); base.rotation.z = Math.PI / 2; base.position.y = -.38; g.add(base);
    g.scale.setScalar(.95); g.rotation.set(-.1, .35, 0); return g; },
  sink(){ const g = new THREE.Group(), leaf = mat(0x1fb055, {roughness:.5, clearcoat:.3}), leaf2 = mat(0x168a43, {roughness:.55});
    const tr = mesh(new THREE.CylinderGeometry(.13, .18, .8, 16), mat(0x8a5a35, {roughness:.8})); tr.position.y = -.55; g.add(tr);
    [[0, .25, 0, .62, leaf], [-.45, -.05, .05, .45, leaf2], [.45, -.02, .05, .46, leaf2], [0, .65, -.05, .42, leaf]].forEach(([x, y, z, s, m]) => { const b = mesh(new THREE.SphereGeometry(s, 32, 24), m); b.position.set(x, y, z); g.add(b); });
    g.rotation.set(-.05, .3, 0); return g; },
  /* ---- 1.1: the five mineral groups ---- */
  /* battery minerals: a battery cell with a lightning bolt */
  "mat-bat"(){ const g = new THREE.Group(), body = mat(0x2f8cff, {roughness:.25, clearcoat:1}), steel = mat(0xd7dde3, {metalness:.9, roughness:.25}), band = mat(0x0f2f66, {roughness:.4});
    const c = mesh(new THREE.CylinderGeometry(.5, .5, 1.5, 48), body); g.add(c);
    const top = mesh(new THREE.CylinderGeometry(.5, .5, .16, 48), steel); top.position.y = .83; g.add(top);
    const nub = mesh(new THREE.CylinderGeometry(.18, .18, .14, 32), steel); nub.position.y = .98; g.add(nub);
    const bot = mesh(new THREE.CylinderGeometry(.5, .5, .1, 48), steel); bot.position.y = -.8; g.add(bot);
    const bd = mesh(new THREE.CylinderGeometry(.505, .505, .22, 48), band); bd.position.y = -.45; g.add(bd);
    const bolt = new THREE.Shape(); bolt.moveTo(.08, .42); bolt.lineTo(-.2, -.02); bolt.lineTo(-.01, -.02); bolt.lineTo(-.1, -.38); bolt.lineTo(.2, .06); bolt.lineTo(.01, .06); bolt.closePath();
    const bm = mesh(ext(bolt, .06, .02), mat(0xffd84a, {emissive:0x806000, emissiveIntensity:.4, roughness:.3})); bm.position.set(0, .2, .5); g.add(bm);
    g.rotation.set(.12, -.35, -.18); return g; },
  /* rare earths: a horseshoe magnet */
  "mat-ree"(){ const g = new THREE.Group(), red = mat(0xe8324a, {roughness:.25, clearcoat:1}), steel = mat(0xe3e8ee, {metalness:.9, roughness:.2});
    const arc = mesh(new THREE.TorusGeometry(.55, .24, 24, 64, Math.PI), red); arc.rotation.z = 0; arc.position.y = .1; g.add(arc);
    for (const x of [-.55, .55]){ const leg = mesh(new THREE.CylinderGeometry(.24, .24, .55, 32), red); leg.position.set(x, -.17, 0); g.add(leg);
      const tip = mesh(new THREE.CylinderGeometry(.24, .24, .3, 32), steel); tip.position.set(x, -.59, 0); g.add(tip); }
    const spark = mat(0xc3a6ff, {emissive:0x7a4ff0, emissiveIntensity:.8, roughness:.2});
    [[-.3, -.95, .2, .07], [.2, -1.0, .1, .06], [0, -1.12, .25, .05]].forEach(([x, y, z, r]) => { const sp = mesh(new THREE.OctahedronGeometry(r, 0), spark); sp.position.set(x, y, z); g.add(sp); });
    g.rotation.set(.15, -.35, .25); return g; },
  /* copper: a spool of copper wire */
  "mat-cu"(){ const g = new THREE.Group(), cu = mat(0xd9773a, {metalness:.85, roughness:.28, clearcoat:.4}), wood = mat(0x3a4552, {roughness:.6});
    g.add(mesh(new THREE.CylinderGeometry(.3, .3, 1.1, 32), wood));
    for (const y of [-.6, .6]) { const f = mesh(new THREE.CylinderGeometry(.8, .8, .1, 48), wood); f.position.y = y; g.add(f); }
    for (let i = 0; i < 9; i++){ const t = mesh(new THREE.TorusGeometry(.6, .07, 12, 48), cu); t.rotation.x = Math.PI / 2; t.position.y = -.48 + i * .12; g.add(t); }
    const tail = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.55, .3, .25), new THREE.Vector3(.9, .05, .45), new THREE.Vector3(1.0, -.5, .35)]), 20, .06, 10), cu); g.add(tail);
    g.rotation.set(.32, -.4, 0); return g; },
  /* silicon & sand: a solar cell on a little heap of sand */
  "mat-si"(){ const g = new THREE.Group(), sand = mat(0xe8cf95, {roughness:.95, clearcoat:0}), cell = mat(0x1d3f8f, {roughness:.2, metalness:.3, clearcoat:1}), line = mat(0xcfd8e3, {metalness:.8, roughness:.3});
    const heap = mesh(new THREE.ConeGeometry(.95, .55, 48), sand); heap.position.y = -.55; g.add(heap);
    const pn = new THREE.Group();
    pn.add(mesh(new THREE.BoxGeometry(1.25, 1.25, .08), cell));
    const fr = mesh(new THREE.BoxGeometry(1.33, 1.33, .05), line); fr.position.z = -.03; pn.add(fr);
    for (const k of [-.31, 0, .31]){ const a = mesh(new THREE.BoxGeometry(.025, 1.22, .02), line); a.position.set(k, 0, .05); pn.add(a); const b2 = mesh(new THREE.BoxGeometry(1.22, .025, .02), line); b2.position.set(0, k, .05); pn.add(b2); }
    pn.position.set(0, .25, 0); pn.rotation.set(-.35, 0, 0); g.add(pn);
    g.rotation.set(.1, -.45, 0); return g; },
  /* uranium: a glowing green fuel pellet stack in a rod */
  "mat-u"(){ const g = new THREE.Group(), glow = mat(0x7dff5a, {emissive:0x2fbf1a, emissiveIntensity:.9, roughness:.3, clearcoat:.6}), steel = mat(0xc8d0d8, {metalness:.9, roughness:.25}), dark = mat(0x23302a, {roughness:.5});
    for (let i = 0; i < 3; i++){ const pl = mesh(new THREE.CylinderGeometry(.36, .36, .38, 40), glow); pl.position.y = -.45 + i * .42; g.add(pl); }
    for (let i = 0; i < 4; i++){ const r = mesh(new THREE.CylinderGeometry(.38, .38, .04, 40), dark); r.position.y = -.66 + i * .42; g.add(r); }
    const cap = mesh(new THREE.CylinderGeometry(.4, .4, .12, 40), steel); cap.position.y = .66; g.add(cap);
    const sym = new THREE.Group(), y = mat(0xffd400, {roughness:.3});
    for (let k = 0; k < 3; k++){ const sec = mesh(new THREE.CylinderGeometry(.3, .3, .04, 32, 1, false, k * 2 * Math.PI / 3 - .5, 1), y); sec.rotation.x = Math.PI / 2; sym.add(sec); }
    const c0 = mesh(new THREE.CylinderGeometry(.07, .07, .05, 20), dark); c0.rotation.x = Math.PI / 2; sym.add(c0);
    sym.position.set(.42, .15, .3); sym.rotation.y = .6; sym.scale.setScalar(.9); g.add(sym);
    g.rotation.set(.18, -.4, -.12); return g; },
  /* ---------- 1.5.4: one icon per resource (learning page, country panel) ---------- */
  "res-li"(){ const g = new THREE.Group(), m = mat(0xdfe6f2, {metalness:.85, roughness:.22, clearcoat:.6}), tint = mat(0xb9a7ff, {metalness:.6, roughness:.25});
    const ing = mesh(new THREE.BoxGeometry(1.6, .5, .8, 1, 1, 1), m); g.add(ing);
    const top = mesh(new THREE.BoxGeometry(1.3, .12, .55), tint); top.position.y = .3; g.add(top);
    const b = mesh(new THREE.CylinderGeometry(.22, .22, .7, 32), mat(0x2f8cff, {clearcoat:1})); b.position.set(.55, .75, .1); g.add(b);
    const c = mesh(new THREE.CylinderGeometry(.1, .1, .1, 20), m); c.position.set(.55, 1.15, .1); g.add(c);
    g.rotation.set(.35, -.5, 0); return g; },
  "res-co"(){ const g = new THREE.Group(), blue = mat(0x1f4fff, {roughness:.12, clearcoat:1, metalness:.2, emissive:0x0a1a66, emissiveIntensity:.3});
    [[0, 0, 0, .55, 1.3], [-.45, -.15, .1, .38, .9], [.45, -.2, .05, .35, .8], [.15, -.3, .4, .28, .6]].forEach(([x, y, z, r, h]) => { const c = mesh(new THREE.CylinderGeometry(r * .3, r, h, 6), blue); c.position.set(x, y + h / 2 - .5, z); c.rotation.z = x * -.5; g.add(c); });
    const base = mesh(new THREE.DodecahedronGeometry(.6, 0), mat(0x5a5f6a, {roughness:.9, clearcoat:0, flatShading:true})); base.scale.set(1.4, .45, 1); base.position.y = -.65; g.add(base);
    g.rotation.set(.1, -.4, 0); return g; },
  "res-ni"(){ const g = new THREE.Group(), m = mat(0xc9d3c9, {metalness:.9, roughness:.2, clearcoat:.5});
    const hx = new THREE.Shape(); for (let i = 0; i <= 6; i++){ const a = Math.PI / 6 + i * Math.PI / 3; i ? hx.lineTo(Math.cos(a), Math.sin(a)) : hx.moveTo(Math.cos(a), Math.sin(a)); }
    const hole = new THREE.Path(); hole.absarc(0, 0, .45, 0, Math.PI * 2, true); hx.holes.push(hole);
    g.add(mesh(ext(hx, .4, .08), m)); g.rotation.set(-.5, .4, 0); return g; },
  "res-gr"(){ const g = new THREE.Group(), m = mat(0x3b4048, {metalness:.55, roughness:.35, clearcoat:.3});
    const hx = new THREE.Shape(); for (let i = 0; i <= 6; i++){ const a = i * Math.PI / 3; i ? hx.lineTo(Math.cos(a), Math.sin(a)) : hx.moveTo(Math.cos(a), Math.sin(a)); }
    for (let i = 0; i < 4; i++){ const l = mesh(ext(hx, .1, .03), m); l.rotation.x = -Math.PI / 2; l.position.set(i * .05, i * .2 - .3, -i * .04); l.rotation.z = i * .25; g.add(l); }
    const pen = mesh(new THREE.CylinderGeometry(.09, .09, 1.6, 6), mat(0xffc24a, {roughness:.4})); pen.rotation.z = -.9; pen.position.set(.2, .55, .5); g.add(pen);
    const tip = mesh(new THREE.ConeGeometry(.09, .25, 6), m); tip.rotation.z = -.9 + Math.PI; tip.position.set(-.53, .02, .5); g.add(tip);
    g.rotation.set(.35, -.3, 0); return g; },
  "res-ga"(){ const g = new THREE.Group(), m = mat(0xd6dee6, {metalness:1, roughness:.08, clearcoat:1});
    const pts = []; for (let i = 0; i <= 24; i++){ const t = i / 24, y = -1 + 2 * t, r = Math.sin(Math.PI * t) * (1 - t * .55) * .85 + (t > .9 ? 0 : 0); pts.push(new THREE.Vector2(Math.max(.001, r), y)); }
    const d = mesh(new THREE.LatheGeometry(pts, 48), m); g.add(d);
    const pool = mesh(new THREE.CylinderGeometry(.9, .95, .08, 48), m); pool.position.y = -1; pool.scale.z = .6; g.add(pool);
    g.rotation.set(.2, 0, 0); return g; },
  "res-si"(){ const g = new THREE.Group(), wafer = mat(0x5a6aa0, {metalness:.85, roughness:.12, clearcoat:1, iridescence:1, iridescenceIOR:1.4}), line = mat(0xd7dde3, {metalness:.9, roughness:.2});
    const w = mesh(new THREE.CylinderGeometry(1, 1, .08, 64), wafer); g.add(w);
    for (let i = -3; i <= 3; i++){ const a = mesh(new THREE.BoxGeometry(.02, .02, 1.7 * Math.sqrt(1 - (i / 3.6) ** 2)), line); a.position.set(i * .24, .05, 0); g.add(a); const b2 = mesh(new THREE.BoxGeometry(1.7 * Math.sqrt(1 - (i / 3.6) ** 2), .02, .02), line); b2.position.set(0, .05, i * .24); g.add(b2); }
    g.rotation.set(.75, 0, .15); return g; },
  "res-ph"(){ const g = new THREE.Group(), rock = mat(0xd9c27a, {roughness:.85, clearcoat:0, flatShading:true}), leaf = mat(0x37b34a, {roughness:.4, clearcoat:.6});
    const r = mesh(new THREE.DodecahedronGeometry(.85, 0), rock); r.scale.set(1.2, .8, 1); g.add(r);
    const st = mesh(new THREE.CylinderGeometry(.05, .06, .6, 12), leaf); st.position.set(0, .85, .1); g.add(st);
    for (const s of [-1, 1]){ const l = mesh(ext(leafShape(.32), .04, .02), leaf); l.position.set(s * .25, 1.1, .1); l.rotation.z = s * -1.0; g.add(l); }
    g.rotation.set(.2, -.4, 0); return g; },
  "res-he"(){ const g = new THREE.Group(), b = mat(0x7fd8ff, {roughness:.15, clearcoat:1, transmission:.25, thickness:.5});
    const pts = []; for (let i = 0; i <= 30; i++){ const t = i / 30, y = -1.1 + 2.1 * t; const r = Math.sin(Math.PI * Math.pow(t, .8)) * .85; pts.push(new THREE.Vector2(Math.max(.02, r), y)); }
    g.add(mesh(new THREE.LatheGeometry(pts, 48), b));
    const k = mesh(new THREE.ConeGeometry(.1, .15, 16), b); k.position.y = -1.15; k.rotation.x = Math.PI; g.add(k);
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(.15, -1.5, .05), new THREE.Vector3(-.1, -1.8, 0), new THREE.Vector3(.05, -2.1, 0)]), 20, .015, 6), mat(0xffffff)));
    g.rotation.set(0, 0, -.12); return g; },
  "res-sand"(){ const g = new THREE.Group(), sand = mat(0xe8cf95, {roughness:.95, clearcoat:0}), glass = mat(0xd8f3ff, {transmission:.85, roughness:.05, thickness:.3}), wood = mat(0x9a6a3a, {roughness:.6});
    const heap = mesh(new THREE.ConeGeometry(1.1, .7, 48), sand); heap.position.y = -.7; g.add(heap);
    for (const y of [-.25, .95]){ const c = mesh(new THREE.CylinderGeometry(.42, .42, .08, 32), wood); c.position.y = y; g.add(c); }
    const pts = []; for (let i = 0; i <= 20; i++){ const t = i / 20, y = -.2 + 1.1 * t, r = .08 + .3 * Math.abs(Math.cos(Math.PI * t)); pts.push(new THREE.Vector2(r, y)); }
    g.add(mesh(new THREE.LatheGeometry(pts, 32), glass));
    const s2 = mesh(new THREE.ConeGeometry(.3, .25, 32), sand); s2.position.y = -.08; g.add(s2);
    g.rotation.set(.15, -.3, 0); return g; },
  "res-plastic"(){ const g = new THREE.Group(), p = mat(0x7fd8d0, {transmission:.6, roughness:.1, thickness:.6, clearcoat:1}), cap = mat(0x2f8cff, {roughness:.3});
    const pts = [[.0, -1], [.42, -1], [.48, -.9], [.48, .2], [.3, .55], [.16, .7], [.16, .85]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(mesh(new THREE.LatheGeometry(pts, 40), p));
    const c = mesh(new THREE.CylinderGeometry(.19, .19, .2, 24), cap); c.position.y = .95; g.add(c);
    const lab = mesh(new THREE.CylinderGeometry(.485, .485, .4, 40, 1, true), mat(0xffffff, {roughness:.5})); lab.position.y = -.35; g.add(lab);
    g.rotation.set(.1, 0, -.2); return g; },
  "res-rubber"(){ const g = new THREE.Group(), r = mat(0x24282c, {roughness:.75, clearcoat:.1}), hub = mat(0xc8d0d8, {metalness:.85, roughness:.25}), leaf = mat(0x37b34a, {roughness:.4, clearcoat:.6});
    g.add(mesh(new THREE.TorusGeometry(.7, .32, 24, 64), r)); g.add(mesh(new THREE.CylinderGeometry(.42, .42, .25, 32).rotateX(Math.PI / 2), hub));
    const l = mesh(ext(leafShape(.4), .05, .02), leaf); l.position.set(.75, .75, .35); l.rotation.z = -.7; g.add(l);
    g.rotation.set(-.2, .45, 0); return g; },
  "res-palm"(){ const g = new THREE.Group(), oil = mat(0xffb300, {transmission:.35, roughness:.08, clearcoat:1, thickness:.6}), fruit = mat(0xe8452a, {roughness:.3, clearcoat:.8});
    const pts = []; for (let i = 0; i <= 24; i++){ const t = i / 24, a = Math.PI * t; pts.push(new THREE.Vector2(Math.max(.001, Math.sin(a) * (1 - t) * .9 + (t > .97 ? 0 : 0)), -Math.cos(a) * .9 + t * .9)); }
    const d = mesh(new THREE.LatheGeometry(pts, 48), oil); d.position.x = -.25; g.add(d);
    [[.65, -.55, .3], [.95, -.45, 0], [.8, -.75, -.15], [.5, -.8, .1]].forEach(([x, y, z]) => { const f = mesh(new THREE.SphereGeometry(.22, 24, 16), fruit); f.position.set(x, y, z); g.add(f); });
    g.rotation.set(.1, -.2, 0); return g; },
  "res-oil"(){ const g = new THREE.Group(), drum = mat(0x2a3138, {metalness:.6, roughness:.35}), ring = mat(0xe84a2a, {metalness:.4, roughness:.35}), blk = mat(0x111111, {roughness:.05, clearcoat:1, metalness:.3});
    g.add(mesh(new THREE.CylinderGeometry(.6, .6, 1.4, 40), drum));
    for (const y of [-.35, .35]){ const r = mesh(new THREE.TorusGeometry(.6, .04, 10, 48), ring); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
    const pts = []; for (let i = 0; i <= 24; i++){ const t = i / 24, a = Math.PI * t; pts.push(new THREE.Vector2(Math.max(.001, Math.sin(a) * (1 - t) * .55), -Math.cos(a) * .55 + t * .55)); }
    const d = mesh(new THREE.LatheGeometry(pts, 40), blk); d.position.set(.75, .6, .45); g.add(d);
    g.rotation.set(.2, -.4, 0); return g; },
  "res-coal"(){ const g = new THREE.Group(), c = mat(0x2b2b2e, {roughness:.55, metalness:.2, clearcoat:.5, flatShading:true});
    [[0, 0, 0, .7], [-.65, -.3, .2, .45], [.6, -.35, .15, .42], [.1, -.45, .55, .35]].forEach(([x, y, z, r], i) => { const m = mesh(new THREE.DodecahedronGeometry(r, 0), c); m.position.set(x, y, z); m.rotation.set(i, i * 2, i * .5); g.add(m); });
    g.rotation.set(.2, -.3, 0); return g; },
  gem(){ const g = new THREE.Group(), m = mat(0x18c8ff, {roughness:.08, metalness:.2, clearcoat:1, flatShading:true});
    const crown = mesh(new THREE.CylinderGeometry(.62, 1, .38, 8, 1), m); crown.position.y = .19; g.add(crown);
    const pav = mesh(new THREE.CylinderGeometry(1, 0, .95, 8, 1), m); pav.position.y = -.47; g.add(pav);
    g.rotation.set(.35, .4, 0); return g; },
  star(){ const g = new THREE.Group(); g.add(mesh(ext(starShape(), .3, .12), mat(0xffc42e, {metalness:.6, roughness:.3, clearcoat:.6}))); g.rotation.set(-.2, .45, 0); return g; },
};

window.renderAll = () => {
  const out = {};
  for (const [id, fn] of Object.entries(MODELS)){
    if (window.ONLY && window.ONLY.length && !window.ONLY.includes(id)) continue;
    const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = .5;
    const key = new THREE.DirectionalLight(0xfff6e8, 2.4); key.position.set(-2, 3, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fe8ff, .9); rim.position.set(3, 1, -2); scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, .25));
    const obj = fn(); scene.add(obj);
    const box = new THREE.Box3().setFromObject(obj), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    obj.position.sub(c);
    const cam = new THREE.PerspectiveCamera(26, 1, .1, 50), rad = Math.max(sz.x, sz.y) * .5;
    cam.position.set(0, 0, rad / Math.tan(13 * Math.PI / 180) * 1.12 + sz.z * .5); cam.lookAt(0, 0, 0);
    r.render(scene, cam);
    const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g2 = cv.getContext("2d"); g2.imageSmoothingQuality = "high"; g2.drawImage(r.domElement, 0, 0, 128, 128);
    out[id] = cv.toDataURL("image/webp", .9);
  }
  return out;
};
window.ready = true;
</script></body></html>`;

const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/" || p === "/index.html"){ res.writeHead(200, {"Content-Type":"text/html"}); return res.end(PAGE); }
  const f = path.join(WEB, p);
  if (!f.startsWith(WEB) || !fs.existsSync(f)){ res.writeHead(404); return res.end(); }
  res.writeHead(200, {"Content-Type":f.endsWith(".js") ? "text/javascript" : "application/octet-stream"}); fs.createReadStream(f).pipe(res);
}).listen(0);
const browser = await chromium.launch({executablePath:process.env.CHROME || "/opt/pw-browsers/chromium", args:["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]});
const page = await browser.newPage({viewport:{width:400, height:400}});
page.on("console", m => { if (m.type() === "error") console.log("console", m.text()); });
page.on("pageerror", e => console.log("pageerror", e.message));
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => window.ready, null, {timeout:60000});
const imgs = await page.evaluate(only => { window.ONLY = only; return window.renderAll(); }, process.argv.slice(2));   // node tools/make-icons3d.mjs heart ore → only those
for (const [id, url] of Object.entries(imgs)) fs.writeFileSync(path.join(OUT, id + ".webp"), Buffer.from(url.split(",")[1], "base64"));
console.log("icons:", Object.keys(imgs).join(" "));
await browser.close(); srv.close();
