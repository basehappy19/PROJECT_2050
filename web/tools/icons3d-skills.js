/* 1.7 · 3D icons for every skill (sk-<id>), built from a few shared pieces. This file is pasted into the page of
   make-icons3d.mjs (it runs in the browser with THREE, mat, ext, mesh, leafShape, checkShape and MODELS in scope).
   No back-ticks in here: the page is a template string. */
const C = {steel:0xc8d0d8, dark:0x2b3038, white:0xf4f6f8, green:0x2fb36a, leaf:0x1fb055, leaf2:0x168a43, blue:0x2f8cff, navy:0x1d3f8f, sky:0x8fd0ff,
  yellow:0xffc42e, orange:0xff8a2a, red:0xe8324a, brown:0x8a5a35, sand:0xe8cf95, water:0x3fb8ff, purple:0x8f6bff, gray:0x7a828c, black:0x24282c, teal:0x1fb3a8};
const M_ = (c, o) => mat(c, o || {});
const steel = () => M_(C.steel, {metalness:.85, roughness:.25});
const box = (w, h, d, m) => mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt, rb, h, m, seg) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), m);
const sph = (r, m) => mesh(new THREE.SphereGeometry(r, 32, 24), m);
const at = (o, x, y, z, rx, ry, rz) => { o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); return o; };
const sc = (o, x, y, z) => { o.scale.set(x, y ?? x, z ?? x); return o; };
const grp = (...a) => { const g = new THREE.Group(); a.forEach(o => g.add(o)); return g; };
const tilt = (g, rx, ry, rz) => { g.rotation.set(rx ?? -.2, ry ?? .45, rz || 0); return g; };
function turbine(s){ const g = new THREE.Group(), w = M_(C.white, {roughness:.35});
  g.add(at(cyl(.05, .09, 2, w), 0, -.2)); g.add(at(box(.34, .16, .16, w), .05, .82)); const hub = at(sph(.09, w), -.13, .82);
  g.add(hub); for (let i = 0; i < 3; i++){ const b = box(.08, .95, .03, w); b.geometry.translate(0, .48, 0); g.add(at(b, -.16, .82, .02, 0, 0, i * 2.094 + .3)); }
  g.scale.setScalar(s || 1); return g; }
function panel(s, col){ const g = new THREE.Group(), cell = M_(col || C.navy, {roughness:.18, metalness:.3, clearcoat:1}), ln = steel();
  const p = grp(box(1.3, .8, .06, cell)); for (const k of [-.33, 0, .33]) p.add(at(box(.02, .78, .02, ln), k, 0, .04)); p.add(at(box(1.28, .02, .02, ln), 0, 0, .04));
  p.rotation.x = -.7; g.add(p); g.add(at(cyl(.04, .04, .5, ln), 0, -.45)); g.scale.setScalar(s || 1); return g; }
function tree(s, c1, c2){ const g = new THREE.Group(); g.add(at(cyl(.1, .14, .7, M_(C.brown, {roughness:.8})), 0, -.5));
  [[0, .15, 0, .5, c1 || C.leaf], [-.35, -.1, .05, .36, c2 || C.leaf2], [.35, -.08, .05, .36, c2 || C.leaf2], [0, .5, -.05, .34, c1 || C.leaf]].forEach(([x, y, z, r, c]) => g.add(at(sph(r, M_(c, {roughness:.5})), x, y, z)));
  g.scale.setScalar(s || 1); return g; }
function factory(s, chim){ const g = new THREE.Group(), wall = M_(0xb7c0c8, {roughness:.5}), roof = M_(0x5b6670, {roughness:.5});
  g.add(at(box(1.5, .6, .8, wall), 0, -.3)); for (let i = 0; i < 3; i++){ const r = mesh(new THREE.CylinderGeometry(0, .3, .3, 3), roof); r.rotation.set(0, 0, 0); g.add(at(r, -.5 + i * .5, .15, 0, Math.PI / 2, 0, Math.PI / 2)); }
  if (chim !== false){ g.add(at(cyl(.1, .13, 1, M_(0x9aa4ad)), .55, .35)); g.add(at(cyl(.11, .11, .1, M_(C.red)), .55, .82)); }
  for (let i = 0; i < 3; i++) g.add(at(box(.22, .18, .02, M_(C.sky, {emissive:0x204060, emissiveIntensity:.3})), -.5 + i * .45, -.3, .41));
  g.scale.setScalar(s || 1); return g; }
function building(h, col, s){ const g = new THREE.Group(), w = M_(col || 0xd6dee6, {roughness:.4}), win = M_(C.sky, {emissive:0x1a3a5a, emissiveIntensity:.35, roughness:.2});
  g.add(at(box(.6, h, .6, w), 0, h / 2 - .6)); for (let i = 0; i < Math.floor(h / .3); i++) g.add(at(box(.5, .1, .02, win), 0, -.45 + i * .3, .31));
  g.scale.setScalar(s || 1); return g; }
function drop(s, col){ const pts = []; for (let i = 0; i <= 30; i++){ const t = i / 30, y = -1 + 2 * t, r = t < .6 ? Math.sin(Math.acos((t - .3) / .3 > 1 ? 1 : Math.max(-1, (t - .3) / .3))) * .55 : (1 - t) / .4 * .55 * .9; pts.push(new THREE.Vector2(Math.max(.001, r), y)); }
  const m = mesh(new THREE.LatheGeometry(pts, 40), M_(col || C.water, {roughness:.08, clearcoat:1, transmission:.2, thickness:.5})); m.scale.setScalar((s || 1) * .7); return m; }
function sprout(s){ const g = new THREE.Group(), l = M_(C.green, {roughness:.4, clearcoat:.6});
  g.add(at(cyl(.04, .05, .7, l), 0, -.2)); for (const k of [-1, 1]) g.add(at(mesh(ext(leafShape(.3), .04, .02), l), k * .22, .2, 0, 0, 0, k * -1));
  g.scale.setScalar(s || 1); return g; }
function wheat(s){ const g = new THREE.Group(), y = M_(0xe8b84a, {roughness:.45});
  for (const k of [-.25, 0, .25]){ const st = grp(at(cyl(.025, .03, 1.4, y), 0, -.2)); for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) st.add(sc(at(mesh(new THREE.SphereGeometry(.08, 12, 10), y), sd * .07, .3 + i * .13, 0, 0, 0, sd * .5), .7, 1.4, .7));
    g.add(at(st, k, 0, 0, 0, 0, -k * .6)); }
  g.scale.setScalar(s || 1); return g; }
function globe(s){ const g = new THREE.Group(); g.add(sph(.9, M_(0x2f8cff, {roughness:.3, clearcoat:.8})));
  [[.3, .4, .7, .38], [-.4, -.1, .75, .32], [.1, -.5, .7, .3], [-.2, .55, .6, .25]].forEach(([x, y, z, r]) => { const b = sph(r, M_(C.green, {roughness:.5})); b.position.set(x, y, z); b.scale.z = .35; g.add(b); });
  g.scale.setScalar(s || 1); return g; }
function coin(s){ const g = MODELS.money(); g.rotation.set(0, 0, 0); g.scale.setScalar(s || 1); return g; }
function arrowShape(){ const sh = new THREE.Shape(); sh.moveTo(-.6, -.12); sh.lineTo(.2, -.12); sh.lineTo(.2, -.32); sh.lineTo(.62, 0); sh.lineTo(.2, .32); sh.lineTo(.2, .12); sh.lineTo(-.6, .12); sh.closePath(); return sh; }
function shieldShape(){ const sh = new THREE.Shape(); sh.moveTo(0, .9); sh.bezierCurveTo(.4, .75, .7, .75, .8, .7); sh.bezierCurveTo(.8, .0, .55, -.6, 0, -.95); sh.bezierCurveTo(-.55, -.6, -.8, .0, -.8, .7); sh.bezierCurveTo(-.7, .75, -.4, .75, 0, .9); return sh; }
function bolt(){ const b = new THREE.Shape(); b.moveTo(.12, .6); b.lineTo(-.3, -.03); b.lineTo(-.02, -.03); b.lineTo(-.14, -.55); b.lineTo(.3, .08); b.lineTo(.02, .08); b.closePath(); return mesh(ext(b, .1, .03), M_(0xffd84a, {emissive:0x806000, emissiveIntensity:.4})); }
function flame(col){ const sh = new THREE.Shape(); sh.moveTo(0, -.6); sh.bezierCurveTo(.55, -.6, .6, .1, .2, .7); sh.bezierCurveTo(.2, .3, 0, .25, -.1, .15); sh.bezierCurveTo(-.25, .45, -.15, .55, -.2, .75); sh.bezierCurveTo(-.65, .3, -.6, -.6, 0, -.6); return mesh(ext(sh, .2, .06), M_(col || C.orange, {emissive:0x803000, emissiveIntensity:.5})); }
function car(s){ const g = new THREE.Group(), b = M_(C.teal, {clearcoat:1, roughness:.2}), w = M_(C.black, {roughness:.6}), gl = M_(C.sky, {roughness:.1});
  g.add(at(box(1.5, .35, .7, b), 0, -.1)); g.add(at(box(.8, .3, .62, b), -.05, .2)); g.add(at(box(.7, .22, .64, gl), -.05, .2));
  for (const x of [-.48, .48]) for (const z of [-.36, .36]) g.add(at(cyl(.18, .18, .1, w), x, -.3, z, Math.PI / 2));
  g.scale.setScalar(s || 1); return g; }
function train(s){ const g = new THREE.Group(), b = M_(C.white, {clearcoat:1, roughness:.2}), st = M_(C.red), gl = M_(0x1d2b3a, {roughness:.1});
  const body = mesh(new THREE.CapsuleGeometry(.35, 1.6, 12, 24), b); body.rotation.z = Math.PI / 2; body.scale.y = 1; g.add(body);
  g.add(at(box(1.9, .07, .72, st), 0, -.12)); for (let i = 0; i < 4; i++) g.add(at(box(.24, .16, .02, gl), -.6 + i * .35, .1, .35));
  g.add(at(box(2.2, .06, .5, M_(C.gray)), 0, -.42)); g.scale.setScalar(s || 1); return g; }
function plane(s){ const g = new THREE.Group(), b = M_(C.white, {clearcoat:1, roughness:.2}), a = M_(C.blue);
  const f = mesh(new THREE.CapsuleGeometry(.2, 1.6, 12, 24), b); f.rotation.z = Math.PI / 2; g.add(f);
  g.add(at(box(.5, .05, 1.9, b), .05, 0)); g.add(at(box(.3, .45, .05, a), -.85, .25)); g.add(at(box(.25, .04, .7, b), -.85, .05));
  g.scale.setScalar(s || 1); return g; }
function atom(s, col){ const g = new THREE.Group(); g.add(sph(.25, M_(col || C.orange, {emissive:0x803000, emissiveIntensity:.4})));
  for (let i = 0; i < 3; i++){ const t = mesh(new THREE.TorusGeometry(.8, .045, 12, 64), M_(C.sky, {metalness:.4})); t.rotation.set(Math.PI / 2, i * 1.05, 0); t.rotation.order = "YXZ"; t.rotation.y = i * 1.05; t.scale.y = .38; g.add(t); }
  g.scale.setScalar(s || 1); return g; }
function sunM(s){ const g = new THREE.Group(), y = M_(C.yellow, {emissive:0x806000, emissiveIntensity:.5}); g.add(sph(.45, y));
  for (let i = 0; i < 8; i++){ const c = mesh(new THREE.ConeGeometry(.09, .3, 12), y); const a = i * Math.PI / 4; g.add(at(c, Math.cos(a) * .68, Math.sin(a) * .68, 0, 0, 0, a - Math.PI / 2)); }
  g.scale.setScalar(s || 1); return g; }
function house(s, col){ const g = new THREE.Group(); g.add(at(box(.9, .6, .7, M_(col || 0xf0e6d6, {roughness:.5})), 0, -.3));
  const r = mesh(new THREE.ConeGeometry(.75, .5, 4), M_(C.red, {roughness:.4})); g.add(at(r, 0, .25, 0, 0, Math.PI / 4)); g.scale.setScalar(s || 1); return g; }
function paper(s){ const g = new THREE.Group(); g.add(box(1, 1.3, .05, M_(0xf4ead0, {roughness:.6, clearcoat:.1})));
  for (let i = 0; i < 4; i++) g.add(at(box(.7 - (i % 2) * .2, .05, .02, M_(0x9a8f78)), -.05, .4 - i * .22, .04)); g.scale.setScalar(s || 1); return g; }
function ringSlash(s){ const g = new THREE.Group(), r = M_(C.red, {roughness:.3, clearcoat:.8}); g.add(mesh(new THREE.TorusGeometry(.95, .12, 16, 64), r)); g.add(at(box(1.9, .2, .2, r), 0, 0, .05, 0, 0, -.78)); g.scale.setScalar(s || 1); return g; }
function check(s){ const c = mesh(ext(checkShape(), .12, .05), M_(C.green)); c.scale.setScalar(s || 1); return c; }

const SK = {
  /* energy */
  E1:() => tilt(grp(at(cyl(.06, .08, 1.8, steel()), -.4, 0), at(cyl(.06, .08, 1.8, steel()), .4, 0), at(box(1.2, .08, .08, steel()), 0, .7), at(box(1, .06, .06, steel()), 0, .45),
        at(bolt(), 0, -.1, .2))),
  E2:() => tilt(grp(at(turbine(.9), -.45, .2), at(panel(.75), .45, -.4, .2))),
  E8:() => tilt(grp(at(flame(), 0, .3), at(box(1.6, .35, .9, M_(0x8a6a4a, {roughness:.9})), 0, -.6), at(cyl(.12, .12, .9, steel()), .45, -.2), at(cyl(.12, .12, .9, steel()), -.45, -.2))),
  E3:() => { const g = MODELS["mat-bat"](); return g; },
  E7:() => tilt(grp(at(panel(1), 0, .2), at(cyl(.72, .72, .08, M_(C.water, {roughness:.1, clearcoat:1})), 0, -.45))),
  E4:() => tilt(grp(at(cyl(.45, .6, 1.3, M_(0xd6dee6)), -.3, -.1), at(cyl(.47, .47, .1, M_(C.white)), -.3, .45), at(atom(.62), .35, .55, .45))),
  E9:() => tilt(grp(at(box(.7, .9, .4, M_(C.white, {clearcoat:1})), 0, -.1), at(cyl(.07, .07, .4, steel()), -.15, .55), at(cyl(.07, .07, .4, steel()), .15, .55), at(bolt(), 0, -.1, .25))),
  E5:() => { const g = new THREE.Group(); g.add(mesh(new THREE.TorusGeometry(.75, .3, 24, 64), M_(0xb7c0c8, {metalness:.7, roughness:.3}))); g.add(at(sph(.35, M_(0xc3a6ff, {emissive:0x7a4ff0, emissiveIntensity:1.2})), 0, 0, .15));
        g.add(at(mesh(new THREE.TorusGeometry(.75, .08, 12, 64), M_(0xff5adb, {emissive:0xff2a9a, emissiveIntensity:1})), 0, 0, .05)); return tilt(g, -.5, .3); },
  R2:() => tilt(grp(at(box(.1, 1.3, .1, M_(C.brown)), 0, -.1, 0, 0, 0, -.6), at(mesh(new THREE.TorusGeometry(.55, .09, 12, 32, Math.PI), steel()), .3, .45, 0, 0, 0, -.6 + Math.PI * .1),
        at(mesh(new THREE.DodecahedronGeometry(.35, 0), M_(0xa77bff, {flatShading:true, emissive:0x3a1a8a, emissiveIntensity:.3})), -.45, -.6, .2))),
  /* industry & transport */
  I1:() => { const sh = new THREE.Shape(); sh.moveTo(-.6, -.5); sh.lineTo(.6, -.5); sh.lineTo(.6, -.35); sh.lineTo(.12, -.35); sh.lineTo(.12, .35); sh.lineTo(.6, .35); sh.lineTo(.6, .5); sh.lineTo(-.6, .5); sh.lineTo(-.6, .35); sh.lineTo(-.12, .35); sh.lineTo(-.12, -.35); sh.lineTo(-.6, -.35); sh.closePath();
        return tilt(grp(at(mesh(ext(sh, 1.6, .03), M_(0x9aa7b4, {metalness:.85, roughness:.3})), 0, 0, 0, 0, Math.PI / 2), at(sproutLeaf(), .3, .6, .4)), -.35, .6); },
  I2:() => tilt(train(.9), -.15, .5),
  I5:() => recycle(C.green),
  I4:() => tilt(grp(at(factory(.8), 0, -.1), at(wrench(), .5, .5, .4)), -.15, .4),
  P4:() => tilt(grp(car(.9), at(bolt(), .3, .55, .2)), -.2, .5),
  E6:() => tilt(grp(at(mesh(new THREE.CapsuleGeometry(.35, 1, 12, 24), M_(C.sky, {clearcoat:1, metalness:.3})), -.35, 0), at(factory(.55, true), .45, -.35),
        ...[[-.35, .9, .1], [-.15, 1.1, 0], [-.45, 1.2, .1]].map(([x, y, z]) => at(sph(.09, M_(0xe8f6ff, {roughness:.1, transmission:.5})), x, y, z)))),
  I3:() => tilt(grp(plane(.85), at(sproutLeaf(), .2, .45, .3)), -.25, .4, .15),
  N4:() => { const g = grp(box(1.4, 1, .6, M_(0xd6dee6, {roughness:.4}))); for (const x of [-.35, .35]){ g.add(at(cyl(.27, .27, .05, M_(C.dark)), x, .1, .31, Math.PI / 2)); for (let i = 0; i < 4; i++) g.add(at(box(.5, .06, .02, M_(C.steel, {metalness:.6})), x, .1, .34, 0, 0, i * .785)); }
        g.add(at(cloudBit(), 0, .75, 0)); return tilt(g); },
  R1:() => tilt(grp(at(MODELS["mat-bat"](), -.3, 0, 0, 0, 0, -.2), at(recycle(C.green, .55), .5, -.4, .3))),
  /* farming & forests */
  N1:() => tilt(grp(at(tree(.75), -.35, .05), at(tree(.6), .45, -.15, -.2), at(tree(.5), .05, -.3, .35))),
  N2:() => tilt(grp(at(tree(.75, 0x2a9a6a, 0x1f7a52), 0, .25), ...[-.35, -.15, .15, .35].map(x => at(cyl(.025, .04, .5, M_(C.brown)), x, -.35, 0, 0, 0, x * .6)), at(cyl(.72, .72, .08, M_(C.water, {roughness:.1, clearcoat:1})), 0, -.55))),
  N3:() => tilt(grp(at(box(1.6, .35, 1, M_(0x6a4a2a, {roughness:.9})), 0, -.5), ...[-.5, 0, .5].map(x => at(sprout(.6), x, .05, 0)))),
  N6:() => tilt(grp(at(sc(fish(), 1.35), 0, .25), at(cyl(.72, .72, .08, M_(C.water, {roughness:.1, clearcoat:1})), 0, -.5), ...[[-.5, -.2], [.4, -.1], [0, -.3]].map(([x, y]) => at(mesh(new THREE.OctahedronGeometry(.12, 0), M_(0xd8f3ff, {flatShading:true})), x, y, .3)))),
  A1:() => tilt(grp(at(wheat(1.05), 0, .3), at(cyl(.72, .72, .08, M_(C.water, {roughness:.1, clearcoat:1})), 0, -.6))),
  N5:() => tilt(grp(at(shovel(), .2, .2, 0, 0, 0, -.5), ...[[-.45, -.6, .2], [-.2, -.7, .4], [-.6, -.75, -.1]].map(([x, y, z]) => at(mesh(new THREE.DodecahedronGeometry(.18, 0), M_(0x1a1a1a, {flatShading:true})), x, y, z)))),
  A2:() => { const bun = M_(0xe0a050, {roughness:.5}); return tilt(grp(sc(at(sph(.75, bun), 0, .3), 1, .45, 1), at(cyl(.75, .75, .2, M_(C.green, {roughness:.6})), 0, 0), at(cyl(.8, .8, .06, M_(0x8fd04a)), 0, .12), at(cyl(.72, .72, .25, bun), 0, -.25))); },
  A3:() => tilt(grp(at(sprout(1), 0, -.1), at(drop(.6), .55, .45, .2), at(box(1.4, .2, .8, M_(0xc8a060, {roughness:.95})), 0, -.6))),
  /* cities & adaptation */
  C1:() => { const g = new THREE.Group(), s = steel(); for (const k of [-1, 1]) g.add(at(cyl(.04, .06, 1.6, s), k * .25, -.1, 0, 0, 0, k * -.15)); for (let i = 0; i < 3; i++) g.add(at(box(.5 - i * .12, .04, .04, s), 0, -.6 + i * .45));
        for (let i = 1; i <= 2; i++) g.add(at(mesh(new THREE.TorusGeometry(.3 * i, .04, 8, 32, Math.PI * .7), M_(C.orange, {emissive:0x803000, emissiveIntensity:.5})), 0, .75, 0, 0, 0, Math.PI * .15)); g.add(at(sph(.1, M_(C.red, {emissive:0x801010, emissiveIntensity:.6})), 0, .75)); return tilt(g); },
  P5:() => tilt(grp(at(building(1.6, 0xd6dee6), -.25, 0), at(panel(.45), .35, .75, 0), at(sproutLeaf(), .45, -.35, .4))),
  C2:() => tilt(grp(at(building(1.4, 0xd6dee6, 1), -.3, .1), at(drop(.85), .45, .15), at(cyl(.75, .75, .1, M_(0x5fd39a, {roughness:.6})), 0, -.7))),
  C6:() => tilt(grp(at(mesh(new THREE.SphereGeometry(.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M_(C.red, {emissive:0xa01010, emissiveIntensity:.6, roughness:.2, clearcoat:1})), 0, -.1), at(cyl(.7, .75, .25, M_(C.dark)), 0, -.25))),
  C5:() => tilt(grp(at(building(1.3, 0xd6dee6, .8), -.35, -.05), at(tree(.6), .45, -.1), at(sunM(.35), .2, .8, -.2))),
  C3:() => { const g = new THREE.Group(); g.add(at(mesh(new THREE.SphereGeometry(.9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M_(C.blue, {clearcoat:1, side:THREE.DoubleSide})), 0, .1));
        g.add(at(cyl(.04, .04, 1.2, M_(C.dark)), 0, -.45)); g.add(at(mesh(new THREE.TorusGeometry(.12, .04, 8, 16, Math.PI), M_(C.dark)), -.12, -1.05, 0, 0, 0, Math.PI)); g.add(at(house(.5), .55, -.75, .3)); return tilt(g, -.15); },
  C4:() => tilt(grp(...[-.55, 0, .55].map(x => at(box(.45, 1, .3, M_(0x9aa7b4, {metalness:.5})), x, -.1)), at(box(1.7, .12, .4, M_(C.dark)), 0, .45), at(cyl(.9, .9, .08, M_(C.water, {roughness:.1, clearcoat:1})), 0, -.55, -.3))),
  C7:() => tilt(grp(at(mesh(ext(shieldShape(), .15, .05), M_(C.blue, {clearcoat:1})), 0, .05, -.2), at(building(1.4, 0xf4f6f8, .55), -.2, .1, .1), at(building(1, 0xd6dee6, .55), .2, -.05, .15))),
  /* diplomacy & policy */
  P1:() => tilt(grp(at(mesh(new THREE.ConeGeometry(.5, 1, 32, 1, true), M_(C.orange, {side:THREE.DoubleSide, clearcoat:.8})), .2, 0, 0, 0, 0, Math.PI / 2), at(cyl(.18, .18, .4, M_(C.dark)), -.45, 0, 0, 0, 0, Math.PI / 2), at(box(.12, .5, .12, M_(C.dark)), -.4, -.35))),
  P2:() => tilt(grp(at(paper(.9), -.2, .1), at(coin(.5), .45, -.45, .3), at(cloudBit(), -.2, .65, .2))),
  D1:() => tilt(grp(at(globe(.7), -.2, .2), at(coin(.55), .5, -.5, .3))),
  D4:() => { const pink = M_(0xff8fb0, {roughness:.35, clearcoat:.8}); const g = grp(at(sph(.7, pink), 0, 0)); g.children[0].scale.set(1.15, .9, .9);
        g.add(at(cyl(.2, .22, .2, pink), .85, -.05, 0, 0, 0, Math.PI / 2)); for (const x of [-.4, .4]) g.add(at(cyl(.12, .12, .35, pink), x, -.7, .2)); g.add(at(mesh(new THREE.ConeGeometry(.15, .25, 8), pink), .35, .7, .2));
        g.add(at(coin(.35), 0, .9, 0, Math.PI / 2)); return tilt(g); },
  P3:() => { const g = new THREE.Group(), gd = M_(C.yellow, {metalness:.7, roughness:.3}); g.add(at(cyl(.06, .06, 1.4, gd), 0, -.1)); g.add(at(box(1.6, .06, .06, gd), 0, .55));
        for (const x of [-.7, .7]){ g.add(at(cyl(.3, .3, .05, gd), x, .05)); g.add(at(cyl(.005, .005, .5, gd), x, .3)); } g.add(at(cyl(.4, .5, .1, gd), 0, -.8)); return tilt(g); },
  D2:() => tilt(grp(at(mesh(ext(arrowShape(), .15, .04), M_(C.blue, {clearcoat:1})), 0, .25), at(mesh(ext(arrowShape(), .15, .04), M_(C.green, {clearcoat:1})), 0, -.25, 0, 0, 0, Math.PI))),
  P6:() => tilt(grp(MODELS["res-oil"](), at(ringSlash(.95), 0, 0, .7))),
  D3:() => tilt(grp(MODELS.policy(), at(globe(.35), .45, -.45, .3))),
  /* food & water */
  W1:() => tilt(grp(at(cyl(.08, .08, 1.8, M_(C.dark)), 0, .3, 0, 0, 0, Math.PI / 2), ...[-.5, 0, .5].map(x => at(drop(.22), x, 0, 0)), ...[-.5, 0, .5].map(x => at(sprout(.45), x, -.55)))),
  W2:() => tilt(grp(at(cyl(.75, .6, .12, M_(C.white, {clearcoat:1})), 0, -.3), at(sph(.42, M_(C.red, {clearcoat:1})), -.1, .1), at(sproutLeaf(), -.05, .55, 0), at(recycle(C.green, .5), .55, .35, .3)), -.35),
  W3:() => tilt(grp(at(drop(.7), 0, .35), ...[0, 1, 2].map(i => at(box(1.6, .14, .9, M_([0x8a6a4a, 0xa98a5a, 0x3fb8ff][i], {roughness:.8})), 0, -.4 - i * .17))), -.3),
  W4:() => { const g = grp(at(box(.9, 1.6, .6, M_(0xd6dee6, {transparent:true, opacity:.55, roughness:.1})), 0, 0)); for (let i = 0; i < 4; i++){ g.add(at(box(.85, .05, .55, M_(C.gray)), 0, -.6 + i * .4)); g.add(at(box(.75, .12, .45, M_(C.green, {roughness:.5})), 0, -.52 + i * .4)); } return tilt(g); },
  W5:() => tilt(grp(at(wheat(.8), -.2, .1), ...[[.45, -.5, .2], [.6, -.35, 0], [.35, -.3, -.1]].map(([x, y, z]) => at(box(.18, .18, .18, M_(0xf4f6f8, {clearcoat:1, roughness:.1})), x, y, z, .5, .5)))),
  W6:() => tilt(grp(at(sunM(.6), .4, .6), at(drop(1), -.2, 0), at(cyl(.72, .72, .08, M_(C.water, {roughness:.1, clearcoat:1})), 0, -.7))),
  W7:() => tilt(grp(at(globe(.7), 0, .1), at(wheat(.55), .55, -.35, .3))),
  W8:() => { const sack = M_(0xe8dcc0, {roughness:.85}); return tilt(grp(at(cyl(.5, .6, 1.1, sack), 0, -.1), sc(at(sph(.5, sack), 0, .45), 1, .4, 1), at(sproutLeaf(), 0, -.1, .55), at(drop(.3, 0x5fd39a), .55, .5, .2))); },
};
function sproutLeaf(){ return mesh(ext(leafShape(.28), .05, .02), M_(C.green, {clearcoat:.6})); }
function cloudBit(){ const m = M_(0xaebdcc, {roughness:.6}); return grp(at(sph(.25, m), -.2, 0), at(sph(.3, m), .05, .08), at(sph(.22, m), .3, 0)); }
function fish(){ const f = M_(0xff9a3c, {clearcoat:1, roughness:.2}); const b = sph(.45, f); b.scale.set(1.4, .8, .5); return grp(b, at(mesh(new THREE.ConeGeometry(.3, .4, 3), f), -.75, 0, 0, 0, 0, Math.PI / 2), at(sph(.06, M_(C.black)), .4, .1, .2)); }
function wrench(){ const s = steel(); return grp(at(box(.12, .8, .08, s), 0, -.2, 0, 0, 0, .6), at(mesh(new THREE.TorusGeometry(.18, .07, 10, 24, Math.PI * 1.5), s), -.23, .17, 0, 0, 0, .6)); }
function shovel(){ return grp(at(cyl(.05, .05, 1.4, M_(C.brown)), 0, .3), at(box(.45, .55, .05, steel()), 0, -.55)); }
function recycle(col, s){ const g = new THREE.Group(), m = M_(col, {clearcoat:1});
  for (let i = 0; i < 3; i++){ const a = i * 2.094; const arc = mesh(new THREE.TorusGeometry(.6, .1, 10, 32, 1.6), m); g.add(at(arc, 0, 0, 0, 0, 0, a)); const tip = mesh(new THREE.ConeGeometry(.2, .3, 16), m); g.add(at(tip, Math.cos(a + 1.6) * .6, Math.sin(a + 1.6) * .6, 0, 0, 0, a + 1.6)); }
  g.scale.setScalar(s || 1); return tilt(g, -.2, .3); }
Object.entries(SK).forEach(([id, fn]) => { MODELS["sk-" + id] = fn; });
