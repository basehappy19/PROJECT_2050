/* 1.2 (in-game 1.7) · The in-game map's bottom layer drawn on the GPU (WebGL 2 through three.js).
   What it draws (same look as the Canvas 2D version in map2d.js):
     space backdrop · map outline glow · satellite photo · region heat colours · country borders ·
     selected region / country · warming haze
   Everything is built once as GPU geometry; moving and zooming only changes the camera, and a change of colour
   only changes a material, so nothing is redrawn on the CPU.
   Lines keep the same on-screen width at every zoom (each segment is a small quad, widened in the vertex shader).
   The labels, bubbles, hazards and effects stay on the 2D canvas above (sharp text, correct Thai).
   If the device has no WebGL 2, createMapGL returns null and map2d.js keeps drawing with Canvas 2D. */
import * as THREE from "three";
import {MAP} from "./geo.js";

const ORDER = {edge:1, glow:2, photo:3, tint:4, borderDark:5, borderLight:6, selFill:7, selGlow:8, selLine:9, cFill:10, cGlow:11, cLine:12, haze:13};

/* ---------- geometry helpers ---------- */
function inRing(r, x, y){
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2){
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/* rings of one shape → triangles (a ring inside an odd number of other rings is a hole, like "evenodd") */
function triangulate(rings, pos){
  const depth = rings.map((r, i) => rings.reduce((n, o, k) => n + (k !== i && inRing(o, r[0], r[1]) ? 1 : 0), 0));
  const v2 = r => { const a = []; for (let i = 0; i < r.length; i += 2) a.push(new THREE.Vector2(r[i], r[i + 1])); if (a.length > 2 && a[0].equals(a[a.length - 1])) a.pop(); return a; };
  rings.forEach((r, i) => {
    if (depth[i] % 2) return;
    const outer = v2(r); if (outer.length < 3) return;
    const holes = rings.filter((h, k) => depth[k] % 2 && depth[k] === depth[i] + 1 && inRing(r, h[0], h[1])).map(v2).filter(h => h.length >= 3);
    let tris; try { tris = THREE.ShapeUtils.triangulateShape(outer, holes); } catch (e){ return; }
    const all = outer.concat(...holes);
    for (const t of tris) for (const k of t){ pos.push(all[k].x, all[k].y, 0); }
  });
}
function meshOf(pos, mat, order){
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.Mesh(g, mat); m.renderOrder = order; m.frustumCulled = false; return m;
}
const flat = (color, opacity) => new THREE.MeshBasicMaterial({color, transparent:true, opacity, depthTest:false, depthWrite:false, side:THREE.DoubleSide});

/* ---------- lines with a fixed width in screen pixels ---------- */
const LINE_VS = `
attribute vec2 corner; attribute vec2 a; attribute vec2 b;
uniform vec2 res; uniform float width;
void main(){
  vec4 ca = projectionMatrix * modelViewMatrix * vec4(a, 0.0, 1.0);
  vec4 cb = projectionMatrix * modelViewMatrix * vec4(b, 0.0, 1.0);
  vec2 sa = ca.xy / ca.w * res * 0.5, sb = cb.xy / cb.w * res * 0.5;
  vec2 d = sb - sa; float len = length(d); vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0); vec2 nrm = vec2(-dir.y, dir.x);
  float hw = width * 0.5;
  vec2 p = mix(sa, sb, corner.x) + nrm * corner.y * hw + dir * (corner.x * 2.0 - 1.0) * hw * 0.5;
  gl_Position = vec4(p / (res * 0.5), 0.0, 1.0);
}`;
const LINE_FS = `uniform vec3 color; uniform float opacity;
void main(){
  gl_FragColor = vec4(color, opacity);
  #include <colorspace_fragment>
}`;
function lineMat(color, opacity, width){
  return new THREE.ShaderMaterial({vertexShader:LINE_VS, fragmentShader:LINE_FS, transparent:true, depthTest:false, depthWrite:false,
    uniforms:{color:{value:new THREE.Color(color)}, opacity:{value:opacity}, width:{value:width}, res:{value:new THREE.Vector2(1, 1)}}});
}
/* every segment of the rings as one instance of a 4-corner quad */
function linesOf(rings, mat, order, closed = true){
  let n = 0; for (const r of rings) n += r.length / 2 - (closed ? 0 : 1);
  const A = new Float32Array(n * 2), B = new Float32Array(n * 2); let k = 0;
  for (const r of rings){
    const m = r.length / 2;
    for (let i = 0; i < m - (closed ? 0 : 1); i++){
      const j = (i + 1) % m;
      A[k * 2] = r[i * 2]; A[k * 2 + 1] = r[i * 2 + 1]; B[k * 2] = r[j * 2]; B[k * 2 + 1] = r[j * 2 + 1]; k++;
    }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0], 3));   // unused by the shader, needed by three
  g.setAttribute("corner", new THREE.Float32BufferAttribute([0, -1, 1, -1, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.setAttribute("a", new THREE.InstancedBufferAttribute(A, 2)); g.setAttribute("b", new THREE.InstancedBufferAttribute(B, 2));
  g.instanceCount = k;
  const m = new THREE.Mesh(g, mat); m.renderOrder = order; m.frustumCulled = false; return m;
}

/* a GPU that is really the CPU (SwiftShader, llvmpipe…) */
function softwareGL(gl){
  try { const ext = gl.getExtension("WEBGL_debug_renderer_info"), name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); return /swiftshader|llvmpipe|software|softpipe|basic render/i.test(String(name)); } catch (e){ return false; }
}
export function createMapGL(canvas, allowSoftware = false){   // allowSoftware: tests in a browser without a GPU
  try {
    // failIfMajorPerformanceCaveat: no WebGL when the browser would draw it in software (slower than Canvas 2D)
    const r = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:"high-performance", stencil:false, depth:false, failIfMajorPerformanceCaveat:!allowSoftware});
    if (!r.capabilities.isWebGL2 || (!allowSoftware && softwareGL(r.getContext()))) { r.dispose(); r.forceContextLoss(); return null; }
    return new MapGL(r, canvas);
  } catch (e){ return null; }
}

class MapGL {
  constructor(renderer, canvas){
    this.r = renderer; this.canvas = canvas; this.r.autoClear = false; this.r.setClearColor(0x050a12, 1);
    this.scene = new THREE.Scene(); this.cam = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
    this.bg = new THREE.Scene(); this.bgCam = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
    this.lines = []; this.w = 1; this.h = 1; this.dpr = 1;
    this.selKey = null; this.cKey = null; this.cache = new Map();
    this.lost = false;
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); this.lost = true; if (this.onLost) this.onLost(); }, false);
  }
  addLine(rings, color, opacity, width, order, closed){ const mat = lineMat(color, opacity, width); const m = linesOf(rings, mat, order, closed); m.userData.w = width; this.lines.push(m); return m; }
  /* the world: shapes from map2d.js ({rings, r, c}), the outline points, region ids */
  build(shapes, edgePts, regionIds){
    // outline of the map (Robinson edge): dark fill, three soft glows, the photo inside it
    const edgePos = []; triangulate([edgePts], edgePos);
    this.edgeMesh = meshOf(edgePos, flat(0x08202a, 1), ORDER.edge); this.scene.add(this.edgeMesh);
    for (const [w, a] of [[16, .05], [8, .08], [3, .14]]) this.scene.add(this.addLine([edgePts], 0x4fd1c5, a, w, ORDER.glow, true));
    const uv = []; for (let i = 0; i < edgePos.length; i += 3) uv.push(edgePos[i] / MAP.W, 1 - edgePos[i + 1] / MAP.H);
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.Float32BufferAttribute(edgePos, 3)); pg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    this.photoMat = new THREE.MeshBasicMaterial({transparent:true, depthTest:false, depthWrite:false, side:THREE.DoubleSide});   // transparent like the rest, so renderOrder decides what is on top
    this.photo = new THREE.Mesh(pg, this.photoMat); this.photo.renderOrder = ORDER.photo; this.photo.frustumCulled = false; this.photo.visible = false; this.scene.add(this.photo);
    // region heat colours (one mesh per region, recoloured without rebuilding)
    this.regions = {}; this.regRings = {};
    for (const id of regionIds){
      const pos = [], rings = [];
      for (const sh of shapes) if (sh.r === id){ triangulate(sh.rings, pos); rings.push(...sh.rings); }
      if (!pos.length) continue;
      const m = meshOf(pos, flat(0xffffff, .2), ORDER.tint); this.scene.add(m);
      this.regions[id] = m; this.regRings[id] = rings;
    }
    // borders: dark, then a fine light line on top
    const all = shapes.flatMap(s => s.rings);
    this.bDark = this.addLine(all, 0x04100c, .55, 1.1, ORDER.borderDark, true); this.scene.add(this.bDark);
    this.bLight = this.addLine(all, 0xe6fffa, .16, .6, ORDER.borderLight, true); this.scene.add(this.bLight);
    // warming haze over everything
    this.haze = meshOf([-1e5, -1e5, 0, 1e5, -1e5, 0, 1e5, 1e5, 0, -1e5, -1e5, 0, 1e5, 1e5, 0, -1e5, 1e5, 0], flat(0xff5a28, 0), ORDER.haze); this.haze.visible = false; this.scene.add(this.haze);
    this.shapes = shapes;
  }
  setImage(img){
    if (!img || this.imgSrc === img.src) return;
    this.imgSrc = img.src;
    const max = this.r.capabilities.maxTextureSize;
    let src = img;
    if (img.width > max || img.height > max){ const k = max / Math.max(img.width, img.height), cv = document.createElement("canvas"); cv.width = Math.floor(img.width * k); cv.height = Math.floor(img.height * k); cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); src = cv; }
    const tex = new THREE.Texture(src); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, this.r.capabilities.getMaxAnisotropy()); tex.needsUpdate = true;
    if (this.photoMat.map) this.photoMat.map.dispose();
    this.photoMat.map = tex; this.photoMat.needsUpdate = true; this.photo.visible = true;
  }
  setSpace(canvas){
    if (this.spaceSrc === canvas && this.spaceW === canvas.width) return;
    this.spaceSrc = canvas; this.spaceW = canvas.width;
    if (this.spaceMesh){ this.bg.remove(this.spaceMesh); this.spaceMesh.material.map.dispose(); this.spaceMesh.geometry.dispose(); }
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.PlaneGeometry(canvas.width, canvas.height); g.translate(canvas.width / 2, canvas.height / 2, 0);
    g.scale(1, -1, 1); g.translate(0, canvas.height, 0);   // y down, like the screen
    this.spaceMesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({map:tex, depthTest:false, depthWrite:false, side:THREE.DoubleSide})); this.spaceMesh.frustumCulled = false;
    this.bg.add(this.spaceMesh);
  }
  setSize(w, h, dpr){
    this.w = w; this.h = h; this.dpr = dpr;
    this.r.setPixelRatio(dpr); this.r.setSize(w, h, false);
    this.bgCam.left = 0; this.bgCam.right = w; this.bgCam.top = 0; this.bgCam.bottom = h; this.bgCam.updateProjectionMatrix();
    const res = new THREE.Vector2(w * dpr, h * dpr);
    for (const m of this.lines) m.material.uniforms.res.value.copy(res);
  }
  /* region colours: {id: [r, g, b]} 0–255 and the theme's strength */
  setTints(cols, alpha){
    for (const [id, m] of Object.entries(this.regions)){ const c = cols[id]; if (!c) { m.visible = false; continue; } m.visible = true; m.material.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace); m.material.opacity = alpha; }
  }
  /* selected region (fill + outline) and selected country (shapes list) */
  setSelection(sel, selRGB, zc, cShapes, cKey){
    const key = sel ? sel + (zc ? "z" : "") : null;
    if (key !== this.selKey){
      this.selKey = key;
      for (const o of this.selObjs || []){ this.scene.remove(o); }
      if (this.selFill){ this.selFill.material.dispose(); this.selFill = null; }
      this.selObjs = [];
      if (sel && this.regions[sel]){
        const fill = new THREE.Mesh(this.regions[sel].geometry, flat(0xffffff, .1)); fill.renderOrder = ORDER.selFill; fill.frustumCulled = false; this.selFill = fill;
        const rings = this.regRings[sel];
        const glow = zc ? null : this.cached("rg" + sel, () => linesOf(rings, lineMat(0x4fd1c5, .22, 5), ORDER.selGlow));
        const line = this.cached("rl" + sel + (zc ? "z" : ""), () => linesOf(rings, zc ? lineMat(0x4fd1c5, .55, 1.2) : lineMat(0xa0fff5, .9, 1.6), ORDER.selLine));
        this.selObjs = [fill, glow, line].filter(Boolean); this.selObjs.forEach(o => this.scene.add(o));
      }
    }
    if (this.selFill && selRGB) this.selFill.material.color.setRGB(selRGB[0] / 255, selRGB[1] / 255, selRGB[2] / 255, THREE.SRGBColorSpace);
    if (cKey !== this.cKey){
      this.cKey = cKey;
      for (const o of this.cObjs || []) this.scene.remove(o);
      this.cObjs = [];
      if (cKey && cShapes.length){
        const rings = cShapes.flatMap(s => s.rings);
        const fill = this.cached("cf" + cKey, () => { const pos = []; cShapes.forEach(s => triangulate(s.rings, pos)); return meshOf(pos, flat(0x4fd1c5, .28), ORDER.cFill); });
        const glow = this.cached("cg" + cKey, () => linesOf(rings, lineMat(0x4fd1c5, .35, 6), ORDER.cGlow));
        const line = this.cached("cl" + cKey, () => linesOf(rings, lineMat(0xe6fffb, 1, 2), ORDER.cLine));
        this.cObjs = [fill, glow, line]; this.cObjs.forEach(o => this.scene.add(o));
      }
    }
  }
  cached(k, make){
    let o = this.cache.get(k);
    if (!o){ o = make(); if (o.material.uniforms) { this.lines.push(o); o.material.uniforms.res.value.set(this.w * this.dpr, this.h * this.dpr); } this.cache.set(k, o); }
    return o;
  }
  /* draw: camera (centre x, y in map units, scale s = screen px per map unit), space offset, border strength, haze */
  render(cx, cy, s, spaceOff, bAlpha, warm){
    if (this.lost) return;
    const hw = this.w / 2 / s, hh = this.h / 2 / s, c = this.cam;
    c.left = cx - hw; c.right = cx + hw; c.top = cy - hh; c.bottom = cy + hh; c.updateProjectionMatrix();
    this.bDark.material.uniforms.opacity.value = .55 * bAlpha; this.bLight.material.uniforms.opacity.value = .16 * bAlpha;
    this.haze.visible = warm > 0; this.haze.material.opacity = warm * .12;
    this.r.clear();
    if (this.spaceMesh){ this.spaceMesh.position.set(spaceOff[0], spaceOff[1], 0); this.r.render(this.bg, this.bgCam); }
    this.r.render(this.scene, c);
  }
  dispose(){ try { this.r.dispose(); this.r.forceContextLoss(); } catch (e){} }
}
