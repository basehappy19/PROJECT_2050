/* 3.5: planes as small 3D models over the map.
   The map's tilt is a CSS perspective (map2d.js: perspective = persp px, the stage turned by rotateX(tilt) about the
   screen's middle row). This draws the planes with a three.js camera set up the same way, on a screen-sized canvas
   between the map and the overlay, so a plane flying above the map tips back with it: zoomed in you see it from the
   side and, as it climbs out or banks into a turn, its belly. Each plane has a shadow on the ground.
   Only used when the map itself is drawn with WebGL (mapgl.js); otherwise mapfx.js keeps the flat plane pictures. */
import * as THREE from "three";

function buildModels(){
  const white = new THREE.MeshLambertMaterial({color:0xf3f6f8}), belly = new THREE.MeshLambertMaterial({color:0xbcc8d0});
  const teal = new THREE.MeshLambertMaterial({color:0x2bb3a6}), green = new THREE.MeshLambertMaterial({color:0x3cc77a}), grey = new THREE.MeshLambertMaterial({color:0x7d8a93});
  const glass = new THREE.MeshLambertMaterial({color:0x1b3446});
  const wingShape = (span, root, tip, sweep) => { const s = new THREE.Shape(); s.moveTo(root / 2, 0); s.lineTo(root / 2 - sweep, span); s.lineTo(root / 2 - sweep - tip, span); s.lineTo(-root / 2, 0); s.closePath(); return s; };
  const ext = (shape, t) => { const g = new THREE.ExtrudeGeometry(shape, {depth:t, bevelEnabled:false}); g.translate(0, 0, -t / 2); return g; };
  // all sizes in plane lengths (nose at +x .5, tail at −x .5), wings along y, up = +z
  const G = {
    body:(() => { const g = new THREE.CapsuleGeometry(.055, .82, 4, 10); g.rotateZ(Math.PI / 2); return g; })(),
    bellyStrip:(() => { const g = new THREE.BoxGeometry(.8, .07, .03); g.translate(0, 0, -.045); return g; })(),
    stripe:(() => { const g = new THREE.BoxGeometry(.72, .112, .018); g.translate(-.02, 0, .012); return g; })(),
    cockpit:(() => { const g = new THREE.BoxGeometry(.05, .07, .02); g.translate(.4, 0, .035); return g; })(),
    wingR:(() => { const g = ext(wingShape(.46, .2, .06, .12), .018); g.translate(.02, .04, -.02); return g; })(),
    wingL:(() => { const g = ext(wingShape(.46, .2, .06, .12), .018); g.scale(1, -1, 1); g.translate(.02, -.04, -.02); return g; })(),
    stabR:(() => { const g = ext(wingShape(.16, .09, .04, .06), .012); g.translate(-.4, .02, .01); return g; })(),
    stabL:(() => { const g = ext(wingShape(.16, .09, .04, .06), .012); g.scale(1, -1, 1); g.translate(-.4, -.02, .01); return g; })(),
    fin:(() => { const s = new THREE.Shape(); s.moveTo(-.33, 0); s.lineTo(-.43, .17); s.lineTo(-.5, .17); s.lineTo(-.47, 0); s.closePath(); const g = ext(s, .014); g.rotateX(Math.PI / 2); g.translate(0, 0, .03); return g; })(),
    engR:(() => { const g = new THREE.CylinderGeometry(.026, .022, .12, 10); g.rotateZ(Math.PI / 2); g.translate(.07, .17, -.05); return g; })(),
    engL:(() => { const g = new THREE.CylinderGeometry(.026, .022, .12, 10); g.rotateZ(Math.PI / 2); g.translate(.07, -.17, -.05); return g; })(),
  };
  const make = clean => {
    const g = new THREE.Group(), add = (geo, m) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };
    add(G.body, white); add(G.bellyStrip, belly); add(G.stripe, clean ? green : teal); add(G.cockpit, glass);
    add(G.wingR, white); add(G.wingL, white); add(G.stabR, white); add(G.stabL, white); add(G.fin, clean ? green : teal);
    add(G.engR, grey); add(G.engL, grey);
    g.rotation.order = "ZYX";
    return g;
  };
  const shadowMat = new THREE.MeshBasicMaterial({color:0x000a12, transparent:true, opacity:.3, depthTest:false, depthWrite:false});
  const shadow = () => {
    const g = new THREE.Group();
    for (const k of ["body", "wingR", "wingL", "stabR", "stabL"]){ const o = new THREE.Mesh(G[k], shadowMat); g.add(o); }
    g.scale.z = .02; g.renderOrder = 1; g.traverse(o => { o.renderOrder = 1; });
    return g;
  };
  return {make, shadow, shadowMat};
}

export function createAir3D(){
  try {
    const canvas = document.createElement("canvas"); canvas.className = "map-air";
    const r = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:"high-performance", stencil:false});
    r.setClearColor(0x000000, 0); r.outputColorSpace = THREE.SRGBColorSpace;
    return new Air3D(r, canvas);
  } catch (e){ return null; }
}

class Air3D {
  constructor(r, canvas){
    this.r = r; this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(30, 1, 1, 10000);
    this.ground = new THREE.Group(); this.scene.add(this.ground);   // the map plane: turned like the CSS stage
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x51606b, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(-.5, .7, 1.2); this.scene.add(sun);
    this.M = buildModels(); this.pool = []; this.n = 0; this.drawn = false;
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); this.lost = true; }, false);
  }
  setSize(w, h, dpr, persp){
    this.w = w; this.h = h; this.persp = persp;
    this.r.setPixelRatio(dpr); this.r.setSize(w, h, false);
    this.canvas.style.width = w + "px"; this.canvas.style.height = h + "px";
    const c = this.cam; c.fov = 2 * Math.atan(h / 2 / persp) * 180 / Math.PI; c.aspect = w / h; c.near = Math.max(1, persp * .02); c.far = persp * 6;
    c.position.set(0, 0, persp); c.lookAt(0, 0, 0); c.updateProjectionMatrix();
  }
  /* start a frame: the map's tilt (radians) */
  begin(tilt){ this.ground.rotation.x = -tilt; this.n = 0; }
  /* one plane. u, v: stage point relative to the tilt axis (px, v down); h: height above the map (px);
     heading: radians in the map (x right, y down); pitch: nose up (+); roll: right wing down (+); len: length in px */
  plane(u, v, h, heading, pitch, roll, len, clean, sx, sy){
    let p = this.pool[this.n];
    if (!p || p.clean !== clean){
      if (p){ this.ground.remove(p.obj, p.sh); }
      p = this.pool[this.n] = {obj:this.M.make(clean), sh:this.M.shadow(), clean};
      this.ground.add(p.sh, p.obj);
    }
    this.n++;
    const o = p.obj; o.visible = p.sh.visible = true;
    o.position.set(u, -v, h); o.scale.setScalar(len);
    o.rotation.set(roll, -pitch, -heading);   // map y points down, three's up: the heading flips
    // shadow straight below, pushed a little away from the sun
    p.sh.position.set(u + sx * h, -v - sy * h, .2); p.sh.scale.set(len, len, len * .02); p.sh.rotation.set(0, 0, -heading);
  }
  end(alt){
    if (this.lost) return;
    for (let i = this.n; i < this.pool.length; i++){ this.pool[i].obj.visible = this.pool[i].sh.visible = false; }
    if (!this.n && !this.drawn) return;   // nothing now and nothing left on the canvas
    this.M.shadowMat.opacity = alt;
    this.r.render(this.scene, this.cam); this.drawn = this.n > 0;
  }
  clear(){ if (this.drawn){ this.n = 0; this.end(.3); } }
  dispose(){ try { this.r.dispose(); this.r.forceContextLoss(); } catch (e){} }
}
