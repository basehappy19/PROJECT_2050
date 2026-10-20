/* Home screen · photo-real 3D Earth (three.js)
   NASA Blue Marble (day) + Black Marble (night lights) + cloud layer, sun-lit with a real day/night line,
   ocean glint, atmosphere glow, star field, glowing CO₂ hotspots and cooperation arcs between cities.
   Drag to spin. zoomTo(lat, lon) flies the camera down before the game's 2D map takes over. */
import * as THREE from "three";
import {P} from "./core.js";

const DEG = Math.PI / 180;
const vec = (lat, lon, r = 1) => new THREE.Vector3(Math.cos(lat * DEG) * Math.cos(lon * DEG) * r, Math.sin(lat * DEG) * r, -Math.cos(lat * DEG) * Math.sin(lon * DEG) * r);

const EARTH_VS = `
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const EARTH_FS = `
uniform sampler2D day; uniform sampler2D night; uniform sampler2D water; uniform vec3 sun; uniform float heat;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
  float d = dot(n, sun);
  float dayAmt = smoothstep(-0.12, 0.22, d);
  vec3 dc = texture2D(day, vUv).rgb;
  vec3 nc = texture2D(night, vUv).rgb;
  float w = texture2D(water, vUv).r;
  // light the day side, keep a little ambient on the dark side
  vec3 lit = dc * (0.08 + 1.05 * max(d, 0.0));
  // city lights only on the night side, warm tint
  vec3 lights = pow(nc, vec3(1.6)) * vec3(1.35, 1.1, 0.75) * 2.4;
  vec3 col = mix(lights + dc * 0.035, lit, dayAmt);
  // ocean glint
  vec3 h = normalize(sun + v);
  float spec = pow(max(dot(n, h), 0.0), 60.0) * w * dayAmt;
  col += vec3(1.0, 0.92, 0.78) * spec * 0.55;
  // atmosphere at the rim, warmer when the world is hotter
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 atm = mix(vec3(0.32, 0.62, 1.0), vec3(1.0, 0.55, 0.3), heat);
  col += atm * rim * (0.15 + 0.85 * smoothstep(-0.3, 0.4, d)) * 0.55;
  // golden band along the day / night line
  col += vec3(1.0, 0.45, 0.15) * (1.0 - abs(d) * 6.0) * step(abs(d), 0.16) * 0.08;
  gl_FragColor = vec4(col, 1.0);
}`;
const CLOUD_FS = `
uniform sampler2D map; uniform vec3 sun; uniform float shift; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  float a = texture2D(map, vec2(vUv.x + shift, vUv.y)).r;
  a = smoothstep(0.18, 0.9, a);
  float d = dot(normalize(vN), sun);
  float l = smoothstep(-0.15, 0.35, d);
  gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * (0.12 + 0.95 * l), a * (0.18 + 0.72 * l));
}`;
const ATM_VS = `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const ATM_FS = `
uniform vec3 sun; uniform float heat; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 v = normalize(cameraPosition - vW);
  // back faces: -dot(n, v) goes from ~0.38 at the Earth's edge to 0 at the outer edge of the glow
  float f = pow(clamp(-dot(normalize(vN), v) / 0.38, 0.0, 1.0), 3.0);
  float lit = smoothstep(-0.6, 0.4, dot(normalize(vN), sun));
  vec3 c = mix(vec3(0.3, 0.62, 1.0), vec3(1.0, 0.5, 0.25), heat);
  gl_FragColor = vec4(c, f * (0.15 + 0.85 * lit) * 0.95);
}`;
const ARC_VS = `attribute float t; varying float vT; void main(){ vT = t; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ARC_FS = `
uniform float head; uniform vec3 color; varying float vT;
void main(){
  float d = head - vT;
  float a = d >= 0.0 ? exp(-d * 6.0) : 0.0;
  a *= step(vT, head) * smoothstep(0.0, 0.05, vT) * (1.0 - smoothstep(0.95, 1.0, vT));
  gl_FragColor = vec4(color, a * 0.9);
}`;

function glowTexture(){
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Globe {
  constructor(canvas, {small = false, onReady} = {}){
    this.canvas = canvas; this.small = small;
    const r = this.renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:"high-performance"});
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
    r.setClearColor(0x02070a, 1);
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, .05, 100);
    this.camDist = 4.1; this.camera.position.set(0, 0, this.camDist);
    this.sun = new THREE.Vector3(-0.55, 0.32, 0.78).normalize();
    this.tilt = new THREE.Group(); this.spinG = new THREE.Group(); this.tilt.add(this.spinG); this.scene.add(this.tilt);
    this.tilt.rotation.z = 23.4 * DEG * 0.35;
    const sfx = small ? "-s" : "";
    const loader = new THREE.TextureLoader();
    let pending = 4;
    const done = () => { if (--pending === 0){ this.ready = true; onReady && onReady(); } };
    const tex = (n, srgb = true) => { const t = loader.load(`assets/img/${n}${sfx}.jpg`, done, undefined, done); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy()); return t; };
    const uni = {day:{value:tex("globe-day")}, night:{value:tex("globe-night")}, water:{value:tex("globe-water", false)}, sun:{value:this.sun}, heat:{value:0}};
    this.uni = uni;
    const seg = small ? 96 : 160;
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(1, seg, seg / 2), new THREE.ShaderMaterial({uniforms:uni, vertexShader:EARTH_VS, fragmentShader:EARTH_FS}));
    this.spinG.add(this.earth);
    const cloudTex = tex("globe-clouds", false); cloudTex.wrapS = THREE.RepeatWrapping;
    this.cloudU = {map:{value:cloudTex}, sun:{value:this.sun}, shift:{value:0}};
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, seg, seg / 2), new THREE.ShaderMaterial({uniforms:this.cloudU, vertexShader:EARTH_VS, fragmentShader:CLOUD_FS, transparent:true, depthWrite:false}));
    this.spinG.add(this.clouds);
    this.atm = new THREE.Mesh(new THREE.SphereGeometry(1.08, 96, 48), new THREE.ShaderMaterial({uniforms:{sun:{value:this.sun}, heat:uni.heat}, vertexShader:ATM_VS, fragmentShader:ATM_FS, side:THREE.BackSide, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
    this.scene.add(this.atm);
    this.makeStars(); this.makeHotspots(); this.makeArcs();
    // spin so that Southeast Asia faces the viewer first
    this.spin = (-90 - 100) * DEG; this.vel = 0; this.tiltX = 12 * DEG;
    this.drag = null; this.fly = null; this.offsetX = 0; this.offsetY = 0;
    this.bindInput();
    this.resize(); this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(canvas.parentElement || canvas);
    this.running = false;
    this.clock = new THREE.Clock();
  }
  makeStars(){
    const n = this.small ? 1400 : 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++){
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 40 + Math.random() * 10, s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
      const b = .45 + Math.random() * .55, warm = Math.random();
      col.set([b * (warm > .8 ? 1 : .85), b * .9, b * (warm < .2 ? 1 : .88)], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({size:this.small ? .1 : .085, vertexColors:true, sizeAttenuation:true, transparent:true, opacity:.9, depthWrite:false}));
    this.scene.add(this.stars);
  }
  makeHotspots(){
    const tex = glowTexture(); this.hot = [];
    for (const reg of Object.keys(P.CITIES)) for (const [lat, lon, w] of P.CITIES[reg]){
      const m = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, color:0xff7a3c, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
      m.position.copy(vec(lat, lon, 1.015)); m.userData = {w, ph:Math.random() * 6.28};
      this.spinG.add(m); this.hot.push(m);
    }
  }
  makeArcs(){
    this.arcs = [];
    const cities = Object.values(P.CITIES).flat();
    const mk = () => {
      const a = cities[Math.floor(Math.random() * cities.length)];
      let b = a; while (b === a) b = cities[Math.floor(Math.random() * cities.length)];
      const A = vec(a[0], a[1]), B = vec(b[0], b[1]);
      const ang = A.angleTo(B); if (ang < .3) return null;
      const mid = A.clone().add(B).normalize().multiplyScalar(1 + ang * .22);
      const curve = new THREE.QuadraticBezierCurve3(A.multiplyScalar(1.01), mid, B.multiplyScalar(1.01));
      const pts = curve.getPoints(64), g = new THREE.BufferGeometry().setFromPoints(pts);
      g.setAttribute("t", new THREE.BufferAttribute(new Float32Array(pts.map((_, i) => i / (pts.length - 1))), 1));
      const u = {head:{value:0}, color:{value:new THREE.Color(Math.random() < .5 ? 0x4fd1c5 : 0x5fd39a)}};
      const line = new THREE.Line(g, new THREE.ShaderMaterial({uniforms:u, vertexShader:ARC_VS, fragmentShader:ARC_FS, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
      this.spinG.add(line);
      return {line, u, t:0, speed:.25 + Math.random() * .2};
    };
    this.mkArc = mk;
    for (let i = 0; i < (this.small ? 4 : 7); i++){ const a = mk(); if (a){ a.t = Math.random() * 1.4; this.arcs.push(a); } }
  }
  bindInput(){
    const c = this.canvas;
    c.addEventListener("pointerdown", e => { if (this.fly) return; this.drag = {x:e.clientX, y:e.clientY, t:performance.now()}; this.vel = 0; c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointermove", e => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y, k = 2.6 / Math.max(300, c.clientHeight);
      this.spin += dx * k; this.tiltX = Math.max(-50 * DEG, Math.min(50 * DEG, this.tiltX + dy * k));
      const dt = Math.max(1, performance.now() - this.drag.t); this.vel = dx * k / dt * 16;
      this.drag = {x:e.clientX, y:e.clientY, t:performance.now()};
    });
    const up = () => { this.drag = null; };
    c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
  }
  /* where the globe sits on screen: offset in fractions of the canvas size (menu panel on the left) */
  setFrame(offsetX, offsetY, dist){ this.offsetX = offsetX; this.offsetY = offsetY; if (dist) this.camDist = dist; this.resize(); }
  resize(){
    const c = this.canvas, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.setViewOffset(w, h, -this.offsetX * w, -this.offsetY * h, w, h);
    this.camera.updateProjectionMatrix();
  }
  setHeat(v){ this.uni.heat.value = Math.max(0, Math.min(1, v)); }
  start(){ if (this.running) return; this.running = true; this.clock.getDelta(); const loop = () => { if (!this.running) return; this.frame(); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  stop(){ this.running = false; cancelAnimationFrame(this.raf); }
  /* fly down to a place, then call done() */
  zoomTo(lat, lon, done, ms = 1700){
    let target = -90 * DEG - lon * DEG;
    while (target - this.spin > Math.PI) target -= Math.PI * 2; while (target - this.spin < -Math.PI) target += Math.PI * 2;
    this.fly = {t0:performance.now(), ms, s0:this.spin, s1:target, x0:this.tiltX, x1:lat * DEG, d0:this.camDist, d1:1.55, o0:[this.offsetX, this.offsetY], done};
  }
  frame(){
    const dt = Math.min(.05, this.clock.getDelta()), now = performance.now() / 1000;
    if (this.fly){
      const f = this.fly, p = Math.min(1, (performance.now() - f.t0) / f.ms), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      this.spin = f.s0 + (f.s1 - f.s0) * e; this.tiltX = f.x0 + (f.x1 - f.x0) * e;
      this.camera.position.z = f.d0 + (f.d1 - f.d0) * e;
      this.offsetX = f.o0[0] * (1 - e); this.offsetY = f.o0[1] * (1 - e); this.resize();
      if (p >= 1){ const d = f.done; this.fly = null; d && d(); }
    } else {
      if (!this.drag){ this.vel *= .95; this.spin += this.vel + dt * .045; }
      this.tiltX += (12 * DEG - this.tiltX) * (this.drag ? 0 : dt * .4);
      this.camera.position.z += (this.camDist - this.camera.position.z) * Math.min(1, dt * 3);
    }
    this.spinG.rotation.y = this.spin; this.tilt.rotation.x = this.tiltX;
    this.cloudU.shift.value = (now * .0016) % 1;
    for (const m of this.hot){ const s = (.028 + Math.sqrt(m.userData.w) * .022) * (1 + .25 * Math.sin(now * 2 + m.userData.ph)); m.scale.set(s, s, 1); }
    for (let i = 0; i < this.arcs.length; i++){
      const a = this.arcs[i]; a.t += dt * a.speed; a.u.head.value = a.t;
      if (a.t > 1.6){ this.spinG.remove(a.line); a.line.geometry.dispose(); a.line.material.dispose(); const n = this.mkArc(); if (n) this.arcs[i] = n; else a.t = 0; }
    }
    this.stars.rotation.y = this.spin * .05;
    this.renderer.render(this.scene, this.camera);
  }
  dispose(){ this.stop(); this._ro.disconnect(); this.renderer.dispose(); }
}
