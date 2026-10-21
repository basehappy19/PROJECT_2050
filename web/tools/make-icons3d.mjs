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
  ore(){ const g = new THREE.Group();
    let rg = new THREE.IcosahedronGeometry(.95, 2); rg.deleteAttribute("normal"); rg.deleteAttribute("uv"); rg = mergeVertices(rg); const p = rg.attributes.position;
    for (let i = 0; i < p.count; i++){ const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = 1 + (Math.sin(v.x * 5.1) + Math.sin(v.y * 4.3 + 1) + Math.sin(v.z * 6.2 + 2)) * .06; v.multiplyScalar(k); v.y *= .78; p.setXYZ(i, v.x, v.y, v.z); }
    rg.computeVertexNormals(); g.add(mesh(rg, mat(0x6b5a4c, {roughness:.85, clearcoat:0, flatShading:true})));
    const cr = mat(0xff8a1c, {emissive:0xff5a00, emissiveIntensity:.6, roughness:.15, clearcoat:1});
    [[.2, .7, .15, .55], [-.35, .6, .2, .42], [.05, .78, -.25, .34], [.55, .42, .25, .32]].forEach(([x, y, z, s]) => { const c = mesh(new THREE.OctahedronGeometry(s, 0), cr); c.scale.set(.55, 1.4, .55); c.position.set(x, y, z); c.rotation.set(Math.random() * .6, Math.random() * 3, (x > 0 ? -1 : 1) * .35); g.add(c); });
    g.rotation.set(.15, .5, 0); return g; },
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
  heart(){ const g = new THREE.Group(); const h = mesh(ext(heartShape(), .45, .2), mat(0xff2d63, {roughness:.25, clearcoat:.8})); g.add(h); g.rotation.set(-.15, .45, 0); return g; },
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
  gem(){ const g = new THREE.Group(), m = mat(0x18c8ff, {roughness:.08, metalness:.2, clearcoat:1, flatShading:true});
    const crown = mesh(new THREE.CylinderGeometry(.62, 1, .38, 8, 1), m); crown.position.y = .19; g.add(crown);
    const pav = mesh(new THREE.CylinderGeometry(1, 0, .95, 8, 1), m); pav.position.y = -.47; g.add(pav);
    g.rotation.set(.35, .4, 0); return g; },
  star(){ const g = new THREE.Group(); g.add(mesh(ext(starShape(), .3, .12), mat(0xffc42e, {metalness:.6, roughness:.3, clearcoat:.6}))); g.rotation.set(-.2, .45, 0); return g; },
};

window.renderAll = () => {
  const out = {};
  for (const [id, fn] of Object.entries(MODELS)){
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
const imgs = await page.evaluate(() => window.renderAll());
for (const [id, url] of Object.entries(imgs)) fs.writeFileSync(path.join(OUT, id + ".webp"), Buffer.from(url.split(",")[1], "base64"));
console.log("icons:", Object.keys(imgs).join(" "));
await browser.close(); srv.close();
