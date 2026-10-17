const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.kit) return;
(P.mods = P.mods || {}).kit = 1;
/* =========================================================================
   UI toolkit — draws the interface with GDevelop objects:
     UIPainter (Shape painter)  → panels, bars, lines, charts
     UIText    (Text)           → every label (pooled, only re-rendered when its text/style changes)
     UIIcon    (Sprite, 1 animation per Lucide icon)
     TutImage  (Sprite, 1 animation per tutorial screenshot)
   Layout is written in "design units" (1280×720). The game runs at 1920×1080, so K = 1.5.
   Each UI layer redraws only when marked dirty.
   ========================================================================= */
const K = 1.5, W = 1280, Hh = 720;
const COL = {
  bg:"#050b10", glass:"#0a161c", panel:"#0d1a20", panel2:"#13252c", line:"#23404a", fg:"#e0ebe8", muted:"#8ba6a2",
  accent:"#8fd0ff", ink:"#06202e", good:"#5fd39a", warn:"#f2b441", hot:"#f07a3c", bad:"#ff5448",
  purple:"#c3a6ff", cloud:"#b7c7cf", vuln:"#ff8a7a", white:"#ffffff", black:"#000000", gold:"#f2b441",
};
const ICON_COL = {leaf:"good", sprout:"good", landmark:"purple", users:"accent", thermometer:"hot", cloud:"cloud", handshake:"warn", "shield-alert":"vuln", siren:"bad", newspaper:"muted"};
const FONT = {
  body:"PlexThai-Regular", bodyB:"PlexThai-SemiBold", disp:"Chakra-Bold", dispS:"Chakra-SemiBold", mono:"PlexMono-Medium", monoB:"PlexMono-SemiBold",
};
const hexCache = {};
function hexNum(c){ c = COL[c] || c; if (typeof c === "number") return c; return hexCache[c] ?? (hexCache[c] = parseInt(c.slice(1), 16)); }
function rgbStr(c){ const n = hexNum(c); return `${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}`; }
function mix(a, b, f){ const x = hexNum(a), y = hexNum(b); const ch = s => Math.round(((x >> s) & 255) + ((((y >> s) & 255) - ((x >> s) & 255)) * f)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); }

/* ---------- text measurement (Thai-aware line breaking) ---------- */
let game = null;
const mctx = document.createElement("canvas").getContext("2d");
const famCache = {};
function family(fk){
  const res = FONT[fk] || fk; if (famCache[res]) return famCache[res];
  const f = game ? game.getFontManager().getFontFamily(res) : "sans-serif";
  if (f && f !== "Arial") famCache[res] = f;
  return f;
}
const wCache = new Map();
function measure(str, fk, px){
  const key = fk + "|" + px + "|" + str; let w = wCache.get(key);
  if (w === undefined){ mctx.font = `${px}px "${family(fk)}"`; w = mctx.measureText(str).width; if (wCache.size > 20000) wCache.clear(); wCache.set(key, w); }
  return w;
}
const seg = (typeof Intl !== "undefined" && Intl.Segmenter) ? new Intl.Segmenter("th", {granularity:"word"}) : null;
const gseg = (typeof Intl !== "undefined" && Intl.Segmenter) ? new Intl.Segmenter("th", {granularity:"grapheme"}) : null;
function words(s){
  const raw = seg ? Array.from(seg.segment(s), x => x.segment) : s.split(/(\s+)/).filter(Boolean);
  // keep units and closing punctuation with the word before them (no line break before "°C", "%", ")", ",")
  const out = [];
  for (const w of raw){
    if (out.length && /^[°%)\]},.;:!?…·×]/.test(w) && !/\s$/.test(out[out.length - 1])) out[out.length - 1] += w;
    else if (out.length && /[(\[{+−-]$/.test(out[out.length - 1]) && !/^\s/.test(w)) out[out.length - 1] += w;
    else out.push(w);
  }
  return out;
}
function graphemes(s){ return gseg ? Array.from(gseg.segment(s), x => x.segment) : Array.from(s); }
/* Rich text = plain text with [[icon]] tokens. Returns lines of items {t:"s"|"i", v, w}. */
const layoutCache = new Map();
function layout(str, fk, size, maxW){
  str = String(str ?? "");
  const key = fk + "|" + size + "|" + maxW + "|" + str; const hit = layoutCache.get(key); if (hit) return hit;
  const px = size * K, iconW = size * 1.15 * K, gap = size * 0.12 * K, limit = maxW ? maxW * K : Infinity;
  const lines = [];
  for (const para of str.split("\n")){
    let line = [], lw = 0;
    const push = (trim = true) => { while (trim && line.length && line[line.length - 1].t === "s" && /^\s+$/.test(line[line.length - 1].v)){ lw -= line[line.length - 1].w; line.pop(); } lines.push({items:line, w:lw}); line = []; lw = 0; };
    const parts = para.split(/(\[\[[a-z0-9-]+\]\])/).filter(p => p !== "");
    for (const part of parts){
      const m = part.match(/^\[\[([a-z0-9-]+)\]\]$/);
      if (m){
        const w = iconW + gap;
        if (lw + iconW > limit && line.length) push();
        line.push({t:"i", v:m[1], w}); lw += w; continue;
      }
      for (const wd of words(part)){
        const w = measure(wd, fk, px);
        if (lw + w > limit && line.length){
          if (/^\s+$/.test(wd)){ push(); continue; }
          push();
        }
        if (w > limit){                       // a single word wider than the line: break by grapheme
          let chunk = "";
          for (const g of graphemes(wd)){
            const cw = measure(chunk + g, fk, px);
            if (lw + cw > limit && chunk){ line.push({t:"s", v:chunk, w:measure(chunk, fk, px)}); lw += measure(chunk, fk, px); push(); chunk = g; }
            else chunk += g;
          }
          if (chunk){ const cw = measure(chunk, fk, px); line.push({t:"s", v:chunk, w:cw}); lw += cw; }
          continue;
        }
        line.push({t:"s", v:wd, w}); lw += w;
      }
    }
    push(!!maxW);
  }
  // merge adjacent strings so each run is one Text object
  for (const ln of lines){
    const out = [];
    for (const it of ln.items){ const last = out[out.length - 1]; if (it.t === "s" && last && last.t === "s"){ last.v += it.v; last.w += it.w; } else out.push({...it}); }
    ln.items = out; ln.w = out.reduce((s, x) => s + x.w, 0);
    if (out.length && out[out.length - 1].t === "i") ln.w -= gap;
  }
  const res = {lines, w: Math.max(0, ...lines.map(l => l.w)) / K, iconW: iconW / K, gap: gap / K};
  if (layoutCache.size > 4000) layoutCache.clear();
  layoutCache.set(key, res);
  return res;
}

/* ---------- layers ---------- */
class Layer {
  constructor(name){ this.name = name; this.pools = {}; this.idx = {}; this.hits = []; this.dirty = true; this.clip = null; this.scroll = 0; this.content = 0; this.render = null; this.enabled = true; this.blocks = false; this.alpha = 1; this.ox = 0; this.oy = 0; this.baseX = 0; this.baseY = 0; this.master = null; }
  /* shift everything drawn on this layer (used for scrolling panels): moves the layer camera */
  setOffset(x, y){ if (x === this.ox && y === this.oy) return; this.ox = x; this.oy = y; const l = this.scene.getLayer(this.name); l.setCameraX(960 - x * K); l.setCameraY(540 - y * K); }
  /* content origin + clip rectangle (screen design units) for a scrolling panel */
  frame(x, y, clip, content){ this.baseX = x; this.baseY = y; this.clip = clip; this.content = content; const max = Math.max(0, content - clip.h); if (this.scroll > max) this.scroll = max; this.setOffset(x, y - this.scroll); }
  attach(scene){
    this.scene = scene; this.pools = {}; this.idx = {}; this.hits = [];
    this.painter00 = scene.createObject("UIPainter");         // cards drawn after their content (sized afterwards)
    this.painter00.setLayer(this.name); this.painter00.setZOrder(-2); this.painter00.setPosition(0, 0);
    if (this.painter00.setClearBetweenFrames) this.painter00.setClearBetweenFrames(false);
    this.g00 = this.painter00.getRendererObject();
    this.painter0 = scene.createObject("UIPainter");          // backgrounds (buttons, pills, panels)
    this.painter0.setLayer(this.name); this.painter0.setZOrder(-1); this.painter0.setPosition(0, 0);
    if (this.painter0.setClearBetweenFrames) this.painter0.setClearBetweenFrames(false);
    this.g0 = this.painter0.getRendererObject();
    this.painter = scene.createObject("UIPainter");           // details drawn over the backgrounds
    this.painter.setLayer(this.name); this.painter.setZOrder(0); this.painter.setPosition(0, 0);
    if (this.painter.setClearBetweenFrames) this.painter.setClearBetweenFrames(false);
    this.g = this.painter.getRendererObject();
    this.dirty = true;
  }
  obj(type){
    const pool = this.pools[type] || (this.pools[type] = []), i = this.idx[type] || 0;
    this.idx[type] = i + 1;
    let o = pool[i];
    if (!o){
      const go = this.scene.createObject(type); go.setLayer(this.name); go.setZOrder(type === "UIText" ? 20 : 10);
      o = pool[i] = {go, c:{}};
      if (type === "UIText"){ go.setString(" "); }
    }
    if (o.c.hidden !== false){ o.go.hide(false); o.c.hidden = false; }
    return o;
  }
  begin(){ this.g.clear(); this.g0.clear(); this.g00.clear(); this.idx = {}; this.hits = []; this.inputs = 0; }
  end(){
    for (const type in this.pools){ const pool = this.pools[type], n = this.idx[type] || 0; for (let i = n; i < pool.length; i++) if (pool[i].c.hidden !== true){ pool[i].go.hide(true); pool[i].c.hidden = true; pool[i].c.vis = undefined; } }
  }
  setAlpha(a){ if (this.alpha === a) return; this.alpha = a; const l = this.scene.getLayer(this.name); l.getRenderer().getRendererObject().alpha = a; }
}
const Kit = {
  K, W, H:Hh, COL, FONT, ICON_COL, hexNum, rgbStr, mix, layout, measure,
  layers:{}, order:[], scene:null, mouse:{x:0, y:0, down:false, sx:0, sy:0, moved:0, onUI:false}, hover:null, hoverLayer:null, pressHit:null,
  /* call once per scene with the layer names, bottom → top */
  setup(scene, names){
    this.scene = scene; game = scene.getGame(); this.layers = {}; this.order = names.slice(); this.hover = null;
    for (const n of names){ const l = new Layer(n); l.attach(scene); this.layers[n] = l; }
    this.canvas = game.getRenderer().getCanvas ? game.getRenderer().getCanvas() : null;
  },
  L(name){ return this.layers[name]; },
  /* fonts finished loading: forget cached measurements and re-apply font families */
  resetFonts(){
    for (const key in famCache) delete famCache[key];
    wCache.clear(); layoutCache.clear();
    for (const n in this.layers){ const pool = this.layers[n].pools.UIText || []; for (const o of pool) o.c.font = null; }
    this.dirty();
  },
  /* draw into a slave (scrolling) layer from its master's render function */
  slave(name, fn){
    const l = this.layers[name]; if (!l) return;
    l.begin(); try { fn(l); } catch(e){ console.error("UI render", name, e); } l.end(); this._applyClip(l);
  },
  clearSlave(name){ const l = this.layers[name]; if (!l) return; l.begin(); l.end(); l.clip = null; l.content = 0; l.scroll = 0; l.setOffset(0, 0); this._applyClip(l); },
  /* a GDevelop Text input (save codes) placed like any other element */
  input(l, x, y, w, h, o = {}){
    const ob = l.obj("CodeInput"), go = ob.go, c = ob.c;
    if (!c.init){ c.init = 1; go.setInputType && go.setInputType("text area"); go.setFontSize && go.setFontSize(Math.round(11 * K)); }
    if (c.w !== w || c.h !== h){ go.setWidth(w * K); go.setHeight(h * K); c.w = w; c.h = h; }
    if (c.ro !== !!o.readOnly){ go.setReadOnly(!!o.readOnly); c.ro = !!o.readOnly; }
    if (o.placeholder !== undefined && c.ph !== o.placeholder){ go.setPlaceholder(o.placeholder); c.ph = o.placeholder; }
    if (o.value !== undefined && c.val !== o.value){ go.setString(o.value); c.val = o.value; }
    this._pos(ob, x * K, y * K);
    // hide when scrolled outside the clip rectangle
    const cl = l.clip; const vis = !cl || (y + l.oy >= cl.y - 2 && y + h + l.oy <= cl.y + cl.h + 2);
    if (c.vis !== vis){ go.hide(!vis); c.vis = vis; }
    return go;
  },
  dirty(name){ if (name){ const l = this.layers[name]; if (l) l.dirty = true; } else for (const n in this.layers) this.layers[n].dirty = true; },
  /* ---- drawing primitives (design units) ---- */
  rect(l, x, y, w, h, fill, o = {}){
    const g = o.under ? l.g00 : o.bg ? l.g0 : l.g, r = (o.r || 0) * K;
    if (o.stroke) g.lineStyle({width:(o.sw || 1) * K, color:hexNum(o.stroke), alpha:o.sa ?? 1, alignment:1}); else g.lineStyle(0);
    if (fill != null) g.beginFill(hexNum(fill), o.a ?? 1); else g.beginFill(0, 0);
    if (r > 0) g.drawRoundedRect(x * K, y * K, w * K, h * K, Math.min(r, w * K / 2, h * K / 2)); else g.drawRect(x * K, y * K, w * K, h * K);
    g.endFill(); g.lineStyle(0);
  },
  /* horizontal gradient (stops: [[pos, color], ...]) drawn as thin slices, clipped to a rounded bar */
  hgrad(l, x, y, w, h, stops, o = {}){
    const g = o.under ? l.g00 : o.bg ? l.g0 : l.g, n = Math.max(8, Math.round(w / 3)), a = o.a ?? 1, r = o.r || 0;
    const col = f => { for (let i = 0; i < stops.length - 1; i++){ const [p0, c0] = stops[i], [p1, c1] = stops[i + 1]; if (f <= p1) return mix(c0, c1, (f - p0) / Math.max(1e-6, p1 - p0)); } return hexNum(stops[stops.length - 1][1]); };
    const X0 = Math.round(x * K), X1 = Math.round((x + w) * K);
    for (let i = 0; i < n; i++){
      // slice edges on whole pixels so neighbouring slices never overlap (no seams with alpha < 1)
      const p0 = Math.round(X0 + (X1 - X0) * i / n), p1 = Math.round(X0 + (X1 - X0) * (i + 1) / n);
      if (p1 <= p0) continue;
      const x0 = p0 / K, x1 = p1 / K;
      // rounded ends: shrink the slice height near the ends
      let yy = y, hh = h;
      if (r){ const dl = x0 - x + (x1 - x0) / 2, dr = x + w - (x0 + (x1 - x0) / 2); const d = Math.min(dl, dr); if (d < r){ const k = r - Math.sqrt(Math.max(0, r * r - (r - d) * (r - d))); yy = y + k; hh = h - 2 * k; } }
      g.lineStyle(0); g.beginFill(col(Math.min(1, ((i + .5) / n) * w / (o.span || w))), a); g.drawRect(x0 * K, yy * K, (x1 - x0) * K, hh * K); g.endFill();
    }
  },
  circle(l, x, y, r, fill, o = {}){
    const g = l.g;
    if (o.stroke) g.lineStyle({width:(o.sw || 1) * K, color:hexNum(o.stroke), alpha:o.sa ?? 1}); else g.lineStyle(0);
    if (fill != null) g.beginFill(hexNum(fill), o.a ?? 1); else g.beginFill(0, 0);
    g.drawCircle(x * K, y * K, r * K); g.endFill(); g.lineStyle(0);
  },
  line(l, x1, y1, x2, y2, color, o = {}){
    const g = l.g; g.lineStyle({width:(o.w || 1) * K, color:hexNum(color), alpha:o.a ?? 1, cap:"round"});
    if (o.dash){
      const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.floor(len / (o.dash * 2)));
      for (let i = 0; i < n; i++){ const f0 = i / n, f1 = (i + .5) / n; g.moveTo((x1 + (x2 - x1) * f0) * K, (y1 + (y2 - y1) * f0) * K); g.lineTo((x1 + (x2 - x1) * f1) * K, (y1 + (y2 - y1) * f1) * K); }
    } else { g.moveTo(x1 * K, y1 * K); g.lineTo(x2 * K, y2 * K); }
    g.lineStyle(0);
  },
  poly(l, pts, fill, o = {}){
    const g = l.g; if (o.stroke) g.lineStyle({width:(o.sw || 1) * K, color:hexNum(o.stroke), alpha:o.sa ?? 1}); else g.lineStyle(0);
    g.beginFill(hexNum(fill), o.a ?? 1); g.drawPolygon(pts.map(v => v * K)); g.endFill(); g.lineStyle(0);
  },
  path(l, pts, color, o = {}){            // polyline
    const g = l.g; if (pts.length < 4) return;
    g.lineStyle({width:(o.w || 1) * K, color:hexNum(color), alpha:o.a ?? 1, join:"round", cap:"round"});
    g.moveTo(pts[0] * K, pts[1] * K); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] * K, pts[i + 1] * K);
    g.lineStyle(0);
  },
  bezier(l, x1, y1, cx1, cy1, cx2, cy2, x2, y2, color, o = {}){
    const g = l.g;
    if (o.dash){                                   // sample the curve and draw dashes
      const pt = s => { const u = 1 - s; return [u*u*u*x1 + 3*u*u*s*cx1 + 3*u*s*s*cx2 + s*s*s*x2, u*u*u*y1 + 3*u*u*s*cy1 + 3*u*s*s*cy2 + s*s*s*y2]; };
      g.lineStyle({width:(o.w || 1) * K, color:hexNum(color), alpha:o.a ?? 1});
      const N = 40; for (let i = 0; i < N; i += 2){ const a = pt(i / N), b = pt((i + 1) / N); g.moveTo(a[0] * K, a[1] * K); g.lineTo(b[0] * K, b[1] * K); }
      g.lineStyle(0); return;
    }
    g.lineStyle({width:(o.w || 1) * K, color:hexNum(color), alpha:o.a ?? 1});
    g.moveTo(x1 * K, y1 * K); g.bezierCurveTo(cx1 * K, cy1 * K, cx2 * K, cy2 * K, x2 * K, y2 * K); g.lineStyle(0);
  },
  /* ---- text ---- */
  _setText(o, str, fk, size, color, alpha, lhPx, align){
    const go = o.go, c = o.c, px = Math.round(size * K * 100) / 100;
    if (c.font !== fk){ go.setFontName(FONT[fk] || fk); c.font = fk; }
    if (c.size !== px){ go.setCharacterSize(px); c.size = px; if (go.setPadding) go.setPadding(Math.ceil(px * 0.4)); }
    if (c.lh !== lhPx){ go.setLineHeight(lhPx); c.lh = lhPx; }
    if (c.align !== align){ go.setTextAlignment(align); c.align = align; }
    const col = typeof color === "number" ? color : hexNum(color);
    if (c.color !== col){ go.setColor(`${(col >> 16) & 255};${(col >> 8) & 255};${col & 255}`); c.color = col; }
    const a = Math.round(alpha * 255); if (c.alpha !== a){ go.setOpacity(a); c.alpha = a; }
    if (c.str !== str){ go.setString(str); c.str = str; }
  },
  _pos(o, x, y){ const c = o.c; if (c.x !== x || c.y !== y){ o.go.setPosition(x, y); c.x = x; c.y = y; } },
  /* text(layer, "rich [[leaf]] text", x, y, {font, size, color, a, w, align, lh, max}) → {w, h, lines} */
  text(l, str, x, y, o = {}){
    const fk = o.font || "body", size = o.size || 14, color = o.color || "fg", alpha = o.a ?? 1, lh = (o.lh || 1.45) * size;
    let lay = layout(str, fk, size, o.w || 0);
    let lines = lay.lines;
    if (o.max && lines.length > o.max){
      lines = lines.slice(0, o.max).map(l2 => ({...l2, items:l2.items.map(i => ({...i}))}));
      const last = lines[o.max - 1], it = last.items[last.items.length - 1];
      if (it && it.t === "s"){
        let s = it.v; const lim = (o.w || 1e9) * K - (last.w - it.w) - measure("…", fk, size * K);
        while (s.length && measure(s, fk, size * K) > lim) s = graphemes(s).slice(0, -1).join("");
        it.v = s.replace(/\s+$/, "") + "…";
      }
    }
    const h = lines.length * lh, bw = Math.max(0, ...lines.map(q => q.w)) / K;
    if (o.measure) return {w:bw, h, lines:lines.length};
    const colN = hexNum(color), lhPx = lh * K;
    const hasIcon = lines.some(q => q.items.some(i => i.t === "i"));
    const ax = o.align === "center" ? .5 : o.align === "right" ? 1 : 0;
    const boxW = o.w || bw;
    if (!hasIcon){
      const s = lines.map(q => q.items.map(i => i.v).join("")).join("\n");
      if (!s.trim()) return {w:0, h, lines:lines.length};
      const t = l.obj("UIText");
      this._setText(t, s, fk, size, colN, alpha, lhPx, o.align || "left");
      const xx = x + (boxW - bw) * ax;
      this._pos(t, xx * K, y * K);
      return {w:bw, h, lines:lines.length};
    }
    lines.forEach((ln, li) => {
      let cx = x + (boxW - ln.w / K) * ax; const cy = y + li * lh;
      for (const it of ln.items){
        if (it.t === "i"){
          const isz = lay.iconW, ic = o.iconColor || ICON_COL[it.v] || color;
          this.icon(l, it.v, cx, cy + (lh - isz) / 2, isz, ic, alpha);
        } else {
          const t = l.obj("UIText");
          this._setText(t, it.v, fk, size, colN, alpha, lhPx, "left");
          this._pos(t, cx * K, cy * K);
        }
        cx += it.w / K;
      }
    });
    return {w:bw, h, lines:lines.length};
  },
  textW(str, o = {}){ return layout(str, o.font || "body", o.size || 14, 0).w; },
  textH(str, o = {}){ return this.text(null, str, 0, 0, {...o, measure:true}).h; },
  icon(l, name, x, y, size, color = "fg", alpha = 1){
    const o = l.obj("UIIcon"), go = o.go, c = o.c;
    if (c.name !== name){ go.setAnimationName(name); c.name = name; }
    const s = size * K; if (c.s !== s){ go.setWidth(s); go.setHeight(s); c.s = s; }
    const col = hexNum(ICON_COL[color] ? COL[ICON_COL[color]] : color); if (c.col !== col){ go.setColor(`${(col >> 16) & 255};${(col >> 8) & 255};${col & 255}`); c.col = col; }
    const a = Math.round(alpha * 255); if (c.a !== a){ go.setOpacity(a); c.a = a; }
    this._pos(o, x * K, y * K);
  },
  sprite(l, type, anim, x, y, w, h, alpha = 1){
    const o = l.obj(type), go = o.go, c = o.c;
    if (c.anim !== anim){ go.setAnimationName(anim); c.anim = anim; }
    if (c.w !== w || c.h !== h){ go.setWidth(w * K); go.setHeight(h * K); c.w = w; c.h = h; }
    const a = Math.round(alpha * 255); if (c.a !== a){ go.setOpacity(a); c.a = a; }
    this._pos(o, x * K, y * K);
    return go;
  },
  /* ---- interaction ---- */
  hit(l, id, x, y, w, h, fn, o = {}){ l.hits.push({id, x, y, w, h, fn, dis:!!o.disabled, cursor:o.cursor !== false, drag:o.drag || null, layer:l}); },
  isHover(l, id){ return this.hoverLayer === l.name && this.hover === id; },
  isPress(l, id){ return this.mouse.down && this.isHover(l, id) && this.pressHit && this.pressHit.id === id; },
  _find(mx, my){
    for (let i = this.order.length - 1; i >= 0; i--){
      const l = this.layers[this.order[i]]; if (!l || !l.enabled) continue;
      const c = l.clip, lx = mx - l.ox, ly = my - l.oy;
      for (let j = l.hits.length - 1; j >= 0; j--){
        const h = l.hits[j];
        if (lx >= h.x && lx <= h.x + h.w && ly >= h.y && ly <= h.y + h.h){
          if (c && (mx < c.x || mx > c.x + c.w || my < c.y || my > c.y + c.h)) continue;
          return {layer:l, hit:h};
        }
      }
      if (l.blocks) return {layer:l, hit:null};
    }
    return null;
  },
  /* per-frame: pointer, hover, wheel, drag-scroll, redraw dirty layers */
  update(scene){
    const im = scene.getGame().getInputManager();
    const mx = im.getCursorX() / K, my = im.getCursorY() / K, down = im.isMouseButtonPressed(0);
    const m = this.mouse;
    if (down && !m.down){ m.sx = mx; m.sy = my; m.moved = 0; const f = this._find(mx, my); m.onUI = !!f; this.pressHit = f && f.hit; m.scrollL = this._scrollAt(mx, my); m.scroll0 = m.scrollL ? m.scrollL.scroll : 0; }
    if (down) m.moved = Math.max(m.moved, Math.abs(mx - m.sx) + Math.abs(my - m.sy));
    if (down && this.pressHit && this.pressHit.drag){ const h = this.pressHit, l = h.layer; h.drag(Math.max(0, Math.min(1, (mx - l.ox - h.x) / h.w))); this.dirty(l.master || l.name); }
    else if (down && m.scrollL && m.moved > 6){ this.setScroll(m.scrollL, m.scroll0 - (my - m.sy)); }
    m.x = mx; m.y = my; m.down = down;
    const f = this._find(mx, my), hv = f && f.hit && !f.hit.dis ? f.hit.id : null, hl = f && f.hit ? f.layer.name : null;
    if (hv !== this.hover || hl !== this.hoverLayer){
      if (this.hoverLayer && this.layers[this.hoverLayer]) this.layers[this.hoverLayer].dirty = true;
      if (hl) this.layers[hl].dirty = true;
      this.hover = hv; this.hoverLayer = hl;
      if (this.canvas) this.canvas.style.cursor = hv && f.hit.cursor ? "pointer" : "";
    }
    this.overUI = !!f;
    const wheel = im.getMouseWheelDelta ? im.getMouseWheelDelta() : 0;
    this.wheelUsed = false;
    if (wheel){ const sl = this._scrollAt(mx, my); if (sl){ this.setScroll(sl, sl.scroll - wheel * 0.6); this.wheelUsed = true; } else if (f) this.wheelUsed = true; }
    for (const n of this.order){ const l = this.layers[n]; if (l && l.dirty && l.master){ l.dirty = false; this.layers[l.master].dirty = true; } }
    for (const n of this.order){ const l = this.layers[n]; if (l && l.dirty && l.render){ l.dirty = false; l.begin(); try { l.render(l); } catch(e){ console.error("UI render", n, e); } l.end(); this._applyClip(l); } }
  },
  _scrollAt(mx, my){
    for (let i = this.order.length - 1; i >= 0; i--){
      const l = this.layers[this.order[i]]; if (!l || !l.enabled) continue;
      const c = l.clip; if (c && l.content > c.h + 1 && mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) return l;
      if (l.blocks) return null;
    }
    return null;
  },
  setScroll(l, v){ const max = Math.max(0, l.content - (l.clip ? l.clip.h : 0)); const nv = Math.max(0, Math.min(max, v)); if (nv !== l.scroll){ l.scroll = nv; l.setOffset(l.baseX, l.baseY - nv); this.hover = null; this.hoverLayer = null; if (l.master) this.layers[l.master].dirty = true; } },
  _applyClip(l){
    const cont = l.scene.getLayer(l.name).getRenderer().getRendererObject();
    if (!l.clip){ if (cont.mask){ cont.mask = null; } return; }
    const c = l.clip, key = `${c.x},${c.y},${c.w},${c.h}`;
    if (!l.maskG){ l.maskG = new PIXI.Graphics(); }
    if (l.maskKey !== key){ l.maskKey = key; l.maskG.clear(); l.maskG.beginFill(0xffffff, 1); l.maskG.drawRect(c.x * K, c.y * K, c.w * K, c.h * K); l.maskG.endFill(); }
    if (cont.mask !== l.maskG) cont.mask = l.maskG;
  },
  /* mouse released: run the hit under the pointer. Returns true when the UI used the click. */
  release(){
    const m = this.mouse;
    const f = this._find(m.x, m.y);
    const wasDrag = m.moved > 8;
    if (!f) return false;
    if (wasDrag && m.scrollL) return true;
    if (f.hit && !f.hit.dis && f.hit.fn && !f.hit.drag && (!this.pressHit || this.pressHit.id === f.hit.id)){ try { f.hit.fn(); } catch(e){ console.error(e); } this.dirty(); }
    return true;
  },
};
P.Kit = Kit;
