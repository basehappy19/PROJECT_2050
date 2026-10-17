const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.drawer) return;
(P.mods = P.mods || {}).drawer = 1;
/* =========================================================================
   Screens · right-hand drawer: Tech tree, Regions, Stats, News
   The drawer frame is drawn on layer "Drawer"; its content scrolls on "DrawerScroll".
   ========================================================================= */
const {Kit, S, t, L, UI, Audio, W, UIM, Screens, NODES, NODE, NODE_ICON, TREE_POS, ACTIONS, RMETA, RESERVE, IC} = P;
const k = Kit;

Screens.renderDrawer = function(l){
  if (this.kind !== "game" || !S.tab){ k.clearSlave("DrawerScroll"); return; }
  const dw = this.drawerWidth(), x = 1264 - dw, y = 64, h = 566 - y;
  W.panel(l, x, y, dw, h, 10, "panel");
  const titles = {tech:"dTech", region:"dRegion", stats:"dStats", news:"dNews"};
  const title = t(titles[S.tab]);
  k.text(l, P.up(title), x + 14, y + 11, {font:"dispS", size:14});
  W.hbtn(l, "dclose", x + dw - 14 - 30, y + 7, "x", () => Screens.closeTab(), {color:"muted"});
  k.line(l, x, y + 44, x + dw, y + 44, "line");
  const clip = {x:x + 1, y:y + 45, w:dw - 2, h:h - 46};
  const cw = dw - 28;
  k.slave("DrawerScroll", sl => {
    let hh = 0;
    if (S.tab === "tech") hh = this.paneTech(sl, cw);
    else if (S.tab === "region") hh = this.paneRegion(sl, cw);
    else if (S.tab === "stats") hh = this.paneStats(sl, cw);
    else hh = this.paneNews(sl, cw);
    sl.frame(x + 14, clip.y + 12, clip, hh + 24);
  });
  // scrollbar
  const sl = k.L("DrawerScroll");
  if (sl && sl.content > clip.h){
    const th = Math.max(30, clip.h * clip.h / sl.content), ty = clip.y + (clip.h - th) * (sl.scroll / (sl.content - clip.h));
    k.rect(l, x + dw - 6, ty, 3, th, "line", {r:1.5});
  }
};

/* ---------------- Tech tree ---------------- */
Screens.paneTech = function(l, cw){
  const n = NODE[S.node], st = P.nodeState(n), c = P.nodeCost(n);
  const full = st === "ready" && P.atCapacity(n);
  const can = st === "ready" && !full && S.ep >= c.ep && S.pc >= c.pc;
  let y = 0;
  // detail card
  const px = 12, iw = cw - px * 2;
  let cy = y + 11;
  k.text(l, n.id, px, cy, {font:"monoB", size:12, color:"accent"}); cy += 18;
  cy += k.text(l, L(n.name), px, cy, {font:"dispS", size:16, w:iw}).h + 2;
  cy += k.text(l, L(n.desc), px, cy, {size:13.5, w:iw}).h + 6;
  const pills = [
    {txt:`${IC.ep} ${c.ep}`, kind:S.ep >= c.ep ? "acc" : "bad"},
    {txt:`${IC.pc} ${c.pc}`, kind:S.pc >= c.pc ? "acc" : "bad"},
    {txt:`${t("needs")}: ${n.req.length ? n.req.join(" + ") : t("none")}`, kind:""},
  ];
  if (n.months) pills.push({txt:`${t("rollout")} ${n.months} ${t("months")}`, kind:""});
  if (P.recentBuys()) pills.push({txt:`[[chart-line]] ${t("rush")} +${P.recentBuys() * 20}%`, kind:"bad"});
  cy += W.pills(l, px, cy, iw, pills) + 10;
  const label = st === "own" ? `[[check]] ${t("owned")}` : t("unlock");
  W.btn(l, "buy", px, cy, label, () => P.buyNode(n.id), {disabled:!can, sound:false}); cy += 36;
  if (full){ cy += 6; cy += k.text(l, t("capFull"), px, cy, {size:12, color:"bad", w:iw}).h; }
  cy += 11;
  W.card(l, 0, y, cw, cy - y, {fill:"bg"});
  y = cy + 14;
  // trees
  for (const cat of [1, 2, 3]){
    W.h3(l, t("cat" + cat), 0, y, {w:cw}); y += 22;
    y += this.tree(l, cat, 0, y, cw) + 14;
  }
  // roll-outs
  const busy = P.busyIds().length;
  const head = `${t("inProgress")} ${busy}/${P.MAX_PROJECTS}`;
  const hx = W.h3(l, head, 0, y).w;
  if (S.stall) k.text(l, ` · ${t("paused")} ${S.stall} ${t("months")}`, hx, y, {font:"dispS", size:12, color:"bad"});
  y += 22;
  for (const ro of S.rollouts){
    k.text(l, ro.id, 0, y, {font:"mono", size:12});
    W.meter(l, 48, y + 7, cw - 48 - 58, 5, 1 - ro.left / ro.months, "accent");
    k.text(l, `${ro.left} ${t("months")}`, cw - 52, y, {font:"mono", size:12, color:"muted", w:52, align:"right"});
    y += 24;
  }
  return y;
};
/* tree: 4 columns × 3 rows, bezier arrows from each requirement (same category) */
Screens.tree = function(l, cat, x0, y0, cw){
  const colW = cw / 4, nodeW = colW - 16, rowH = 86, nodeH = 74, H = rowH * 3 - (rowH - nodeH);
  const nodes = NODES.filter(n => n.cat === cat);
  const ECOL = {own:"good", ready:"accent", locked:"line"};
  // edges first (on the detail painter, under the node text)
  nodes.forEach(n => n.req.filter(q => NODE[q].cat === cat).forEach(q => {
    const [pc, pr] = TREE_POS[q], [cc, cr] = TREE_POS[n.id];
    const x1 = x0 + pc * colW + nodeW, y1 = y0 + pr * rowH + nodeH / 2, x2 = x0 + cc * colW - 4, y2 = y0 + cr * rowH + nodeH / 2, mx = (x1 + x2) / 2;
    const st = S.owned[n.id] ? "own" : S.owned[q] ? "ready" : "locked";
    const col = ECOL[st];
    k.bezier(l, x1, y1, mx, y1, mx, y2, x2 - 4, y2, col, {w:st === "locked" ? 1.3 : 2, dash:st === "locked", a:st === "locked" ? .9 : .85});
    k.poly(l, [x2 - 8, y2 - 5, x2, y2, x2 - 8, y2 + 5], col, {a:.95});
  }));
  for (const n of nodes){
    const [c, r] = TREE_POS[n.id], s = P.nodeState(n), cc = P.nodeCost(n);
    const x = x0 + c * colW, y = y0 + r * rowH;
    const cross = n.req.filter(q => NODE[q].cat !== cat);
    const afford = s === "ready" && S.ep >= cc.ep && S.pc >= cc.pc && !P.atCapacity(n);
    const p = P.rollProgress(n.id), cls = p !== null ? "rolling" : s;
    const sel = S.node === n.id, hov = k.isHover(l, "node-" + n.id);
    const alpha = cls === "locked" ? .6 : 1;
    // background
    if (afford) k.rect(l, x - 3, y - 3, nodeW + 6, nodeH + 6, "accent", {r:10, a:.18, bg:true});
    if (cls === "own") k.hgrad(l, x, y, nodeW, nodeH, [[0, "#1f9e78"], [1, "#2c6b55"]], {a:.75, r:8, bg:true});
    const stroke = sel ? "#ffffff" : cls === "rolling" ? "accent" : cls === "own" ? "good" : cls === "ready" ? "accent" : "line";
    k.rect(l, x, y, nodeW, nodeH, cls === "own" ? null : "panel2", {r:8, stroke, sa:sel ? 1 : cls === "ready" ? .55 : cls === "own" ? .5 : 1, sw:sel ? 2 : afford || hov ? 1.5 : 1, bg:true, a:alpha});
    if (p !== null) k.rect(l, x + 1, y + 1, Math.max(4, (nodeW - 2) * p), nodeH - 2, "accent", {r:7, a:.22});
    const idCol = cls === "rolling" ? "accent" : cls === "own" ? "good" : cls === "ready" ? "accent" : "fg";
    k.icon(l, NODE_ICON[n.id], x + 7, y + 6, 13, idCol, alpha);
    const ix = W.runs(l, x + 24, y + 3, [[n.id, {font:"monoB", size:11, color:idCol, a:alpha}]]);
    if (cross.length) k.text(l, `${t("alsoNeeds")} ${cross.join("+")}`, ix + 5, y + 4, {font:"mono", size:9.5, color:"warn", a:alpha, w:nodeW - (ix - x) - 9, max:1});
    k.text(l, L(n.name), x + 7, y + 20, {size:11, lh:1.3, w:nodeW - 12, max:2, a:alpha});
    const ct = p !== null ? `${Math.round(p * 100)}%` : s === "own" ? `[[check]] ${t("owned")}` : `${IC.ep}${cc.ep} ${IC.pc}${cc.pc}`;
    k.text(l, ct, x + 7, y + nodeH - 19, {font:"mono", size:10, color:p !== null ? "accent" : s === "own" ? "good" : "muted", a:alpha, w:nodeW - 12, max:1});
    k.hit(l, "node-" + n.id, x, y, nodeW, nodeH, () => { Audio.play("click"); S.node = n.id; P.changed(); });
  }
  return H;
};

/* ---------------- Regions ---------------- */
Screens.paneRegion = function(l, cw){
  const meta = RMETA[S.sel], r = P.R(S.sel);
  let y = 0;
  const bw = (cw - 10) / 3, bh = 32;
  S.regions.forEach((x, i) => {
    const bx = (i % 3) * (bw + 5), by = y + Math.floor(i / 3) * (bh + 5), on = x.id === S.sel, hov = k.isHover(l, "reg-" + x.id);
    k.rect(l, bx, by, bw, bh, "panel2", {r:7, stroke:on || hov ? "accent" : "line", bg:true});
    k.text(l, x.id, bx + 9, by + 7, {font:"mono", size:12, color:on ? "accent" : "fg"});
    const c = P.heatRGB(P.regionHeatValue(x)); k.circle(l, bx + bw - 13, by + bh / 2, 4.5, (c[0] << 16) | (c[1] << 8) | c[2]);
    k.hit(l, "reg-" + x.id, bx, by, bw, bh, () => Screens.selectRegion(x.id, true));
  });
  y += 2 * (bh + 5) + 8;
  y += k.text(l, L(meta.name), 0, y, {font:"dispS", size:17, w:cw}).h + 8;
  const stats = [[t("co2Now"), `${r.co2.toFixed(2)} Gt`], [t("co2Start"), `${r.co2_0.toFixed(1)} Gt`], [t("compliance"), `${r.comp.toFixed(0)}%`], [t("vuln"), `${r.vuln.toFixed(0)}%`]];
  const sw = (cw - 6) / 2, sh = 52;
  stats.forEach(([a, b], i) => {
    const sx = (i % 2) * (sw + 6), sy = y + Math.floor(i / 2) * (sh + 6);
    k.rect(l, sx, sy, sw, sh, "panel2", {r:8, bg:true});
    k.text(l, a, sx + 10, sy + 6, {size:10.5, color:"muted", w:sw - 20, max:1});
    k.text(l, b, sx + 10, sy + 22, {font:"monoB", size:16});
  });
  y += 2 * (sh + 6) + 6;
  for (const a of ACTIONS){
    const c = P.actionCost(a, r), cd = r.cd[a.id] || 0, ok = !cd && S.ep >= c.ep && S.pc >= c.pc;
    const label = cd ? `${t("cooldown")} ${cd}` : [c.ep ? `${IC.ep} ${c.ep}` : "", c.pc ? `${IC.pc} ${c.pc}` : ""].filter(Boolean).join("  ");
    const btnW = Math.ceil(k.textW(label, {font:"dispS", size:14})) + 30;
    const tw = cw - 22 - btnW - 10;
    const h1 = k.text(l, L(a.name), 11, y + 9, {font:"bodyB", size:13.5, w:tw}).h;
    const h2 = k.text(l, L(a.desc), 11, y + 9 + h1, {size:12, color:"muted", w:tw}).h;
    const ch = Math.max(9 + h1 + h2 + 9, 56);
    W.card(l, 0, y, cw, ch);
    W.btn(l, "act-" + a.id, cw - 11 - btnW, y + (ch - 36) / 2, label, () => P.doAction(a.id), {disabled:!ok, kind:ok ? "primary" : "ghost", w:btnW, sound:false});
    y += ch + 7;
  }
  return y;
};

/* ---------------- Stats ---------------- */
Screens.paneStats = function(l, cw){
  let y = 0;
  W.h3(l, t("chartCo2"), 0, y, {w:cw, size:11.5}); y += 20;
  this.lineChart(l, 0, y, cw, 150, S.hist.map(h => h.net), {min:-5, max:45, ticks:[0,10,20,30,40], color:"hot", refs:[{v:0, c:"good"}]}); y += 150 + 14;
  W.h3(l, t("chartTemp"), 0, y, {w:cw, size:11.5}); y += 20;
  this.lineChart(l, 0, y, cw, 150, S.hist.map(h => h.temp), {min:1.0, max:3.0, ticks:[1.0,1.5,2.0,2.5,3.0], color:"accent", refs:[{v:1.5, c:"warn"}, {v:2.0, c:"bad"}]}); y += 150 + 14;
  W.h3(l, t("shares"), 0, y, {w:cw, size:11.5}); y += 22;
  const g = P.grossCO2() || 1;
  for (const r of S.regions){
    k.text(l, r.id, 0, y, {font:"mono", size:12});
    W.meter(l, 56, y + 6, cw - 56 - 64, 8, r.co2 / g, "hot");
    k.text(l, r.co2.toFixed(2), cw - 56, y, {font:"mono", size:12, w:56, align:"right"});
    y += 24;
  }
  // warming stripes, one per month
  y += 6; W.h3(l, S.lang === "th" ? "แถบอุณหภูมิรายเดือน" : "Warming stripes", 0, y, {w:cw, size:11.5}); y += 20;
  k.rect(l, 0, y, cw, 12, "panel2", {r:3});
  const sw = cw / (P.TOTAL_TICKS + 1);
  S.hist.forEach((h, i) => k.rect(l, i * sw, y, sw + 0.4, 12, tempColor(h.temp)));
  y += 18;
  return y;
};
const STRIPE = ["#08306b","#2171b5","#6baed6","#c6dbef","#fee0d2","#fc9272","#ef3b2c","#a50f15","#67000d"];
function tempColor(v){
  const x = P.clamp((v - 0.9) / (2.7 - 0.9), 0, 1) * (STRIPE.length - 1), i = Math.floor(x), f = x - i;
  return k.mix(STRIPE[i], STRIPE[Math.min(i + 1, STRIPE.length - 1)], f);
}
Screens.lineChart = function(l, x, y, w, hgt, data, o){
  k.rect(l, x, y, w, hgt, "bg", {r:8, bg:true});
  const pad = {l:34, r:10, t:10, b:20}, Wd = w - pad.l - pad.r, Hd = hgt - pad.t - pad.b, lo = o.min, hi = o.max;
  const sx = i => x + pad.l + i / P.TOTAL_TICKS * Wd, sy = v => y + pad.t + (1 - (P.clamp(v, lo, hi) - lo) / (hi - lo)) * Hd;
  o.ticks.forEach(v => { const yy = sy(v); k.line(l, x + pad.l, yy, x + w - pad.r, yy, "line"); k.text(l, String(v), x + 3, yy - 8, {font:"mono", size:10, color:"muted"}); });
  [2026, 2034, 2042, 2050].forEach(yr => k.text(l, String(yr), sx((yr - 2026) * 12) - 12, y + hgt - 17, {font:"mono", size:10, color:"muted"}));
  (o.refs || []).forEach(rf => k.line(l, x + pad.l, sy(rf.v), x + w - pad.r, sy(rf.v), rf.c, {dash:4}));
  if (data.length < 2) return;
  const base = sy(Math.max(lo, 0)), pts = [];
  data.forEach((v, i) => pts.push(sx(i), sy(v)));
  k.poly(l, [...pts, sx(data.length - 1), base, sx(0), base], o.color, {a:.15});
  k.path(l, pts, o.color, {w:2});
  const li = data.length - 1; k.circle(l, sx(li), sy(data[li]), 4, o.color);
};

/* ---------------- News ---------------- */
Screens.paneNews = function(l, cw){
  let y = 0;
  const COLS = {tc:"accent", al:"bad", gd:"good", ev:"warn", nw:"fg"};
  for (const lg of S.log.slice(0, 60)){
    const hh = k.text(l, lg.txt, 80, y + 5, {size:13, color:COLS[lg.cls] || "fg", w:cw - 80}).h;
    k.text(l, P.dateStr(lg.tk), 0, y + 6, {font:"mono", size:12, color:"muted"});
    y += hh + 10;
    k.line(l, 0, y, cw, y, "line", {dash:3});
  }
  return y;
};
