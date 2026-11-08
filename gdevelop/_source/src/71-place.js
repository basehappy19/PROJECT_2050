const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.gdplace) return;
(P.mods = P.mods || {}).gdplace = 1;
/* =========================================================================
   Map extras from the website (web/src/hexgrid.js, ui/hud.jsx PlaceBar, map2d.js drawEdge / hover):
     · Continuous World: builds waiting to be placed by hand — a bar of tokens and a hex grid coloured by suitability
     · arrows at the screen edge for disasters and aid bubbles you can't see
     · pointing at a country shows its name, CO₂ and friendship
   ========================================================================= */
const {Kit, S, t, L, Audio, W, UIM, Screens} = P;
const k = Kit;
const RAW = /*HEXCELLS*/null || [];
const DLON = 3.2, R = 1.75;
const KIND_ICON = {wind:"wind", solar:"sun", floatsolar:"waves", geo:"flame", nuclear:"atom"};
const HZ_COL = {hurricane:"#c3a6ff", typhoon:"#c3a6ff", flood:"#8fd0ff", heat:"#ff8a3c", drought:"#f2b441", wildfire:"#ff5a4a", saltwater:"#4fd1c5"};
let cells = null;
/* land cells with their country (or "R_<region>" for the rest of a continent), built the first time they are needed */
function buildCells(){
  if (cells) return cells;
  const out = [];
  for (const [lat, lon, lk] of RAW){
    const [x, y] = P.toWorld(lat, lon);
    let cid = null;
    const g = P.Map && P.Map.geoAt ? P.Map.geoAt(x, y) : null;
    if (g && g.c && P.C(g.c) && !P.C(g.c).rest) cid = g.c;
    if (!cid){ const reg = P.regionAtWorld(x, y); if (reg && P.C("R_" + reg)) cid = "R_" + reg; }
    if (!cid) continue;
    const poly = []; for (let i = 0; i < 6; i++){ const a = Math.PI / 6 + i * Math.PI / 3; poly.push(P.toWorld(lat + Math.sin(a) * R * .9, lon + Math.cos(a) * R)); }
    out.push({lat, lon, x, y, c:cid, poly, look:{arid:lk.a, green:lk.g, snow:lk.s, coast:!!lk.c}});
  }
  return (cells = out);
}
const sCol = s => { const r = s < .5 ? 255 : Math.round(255 * (1 - s) * 2), g = s > .5 ? 211 : Math.round(80 + 262 * s); return (r << 16) | (g << 8) | 90; };
P.placeKinds = () => (S.toPlace || []).filter(x => x.n > 0);
/* ---- the bar of tokens (HUD layer, under the news line) ---- */
Screens.placeBar = function(l, y = 104){
  const list = P.placeKinds(); if (!list.length || !S.world){ if (UIM.placing) UIM.placing = null; return; }
  const T = P.PLACE_TXT, on = UIM.placing, x = 64;
  const toks = list.map(q => ({q, lab:`[[${KIND_ICON[q.k] || "map-pin"}]] ${L(P.KIND_NAME[q.k])} ×${q.n}`}));
  let w = 16 + toks.reduce((s, q) => s + k.textW(q.lab, {size:12, font:"bodyB"}) + 28, 0);
  w = Math.max(w, 300);
  const h = on ? 128 : 84;
  k.rect(l, x, y, w, h, "glass", {r:12, a:.94, stroke:on ? "warn" : "line", bg:true});
  k.text(l, P.up(`[[map-pin]] ${L(T.bar)}`), x + 12, y + 8, {font:"mono", size:11, color:"warn", iconColor:"warn"});
  let cx = x + 12;
  for (const {q, lab} of toks){
    const tw = k.textW(lab, {size:12, font:"bodyB"}) + 20, id = "ptok-" + q.k, sel = on === q.k, hov = k.isHover(l, id);
    k.rect(l, cx, y + 28, tw, 26, sel ? "accent" : hov ? "panel2" : null, {r:13, stroke:sel || hov ? "accent" : "line", bg:true});
    k.text(l, lab, cx + 10, y + 32, {size:12, font:"bodyB", color:sel ? "ink" : "fg", iconColor:sel ? "ink" : "accent"});
    k.hit(l, id, cx, y + 28, tw, 26, () => { Audio.play("select"); UIM.placing = sel ? null : q.k; k.dirty(); });
    cx += tw + 8;
  }
  let yy = y + 60;
  if (on){
    k.text(l, L(T.pick), x + 12, yy, {size:11.5, color:"muted"}); yy += 18;
    let lx = x + 12;
    for (const [s, lab] of [[.2, T.poor], [.55, T.ok], [.9, T.good]]){ k.rect(l, lx, yy + 4, 12, 10, sCol(s), {r:2}); k.text(l, L(lab), lx + 16, yy, {size:11, color:"muted"}); lx += 22 + k.textW(L(lab), {size:11}) + 10; }
    yy += 20;
    k.text(l, L(T.note), x + 12, yy, {size:9.5, color:"muted", w:w - 24, max:1}); yy += 14;
  }
  const al = L(T.auto), aw = k.textW(al, {size:12, font:"bodyB"});
  k.text(l, al, x + 12, yy - 2, {size:12, font:"bodyB", color:"accent"}); k.hit(l, "pauto", x + 8, yy - 4, aw + 8, 20, () => { UIM.placing = null; P.placeAuto(); Audio.play("done"); k.dirty(); });
  if (on){ const dl = L(T.done); k.text(l, dl, x + 30 + aw, yy - 2, {size:12, font:"bodyB", color:"accent"}); k.hit(l, "pdone", x + 26 + aw, yy - 4, k.textW(dl, {size:12, font:"bodyB"}) + 8, 20, () => { UIM.placing = null; k.dirty(); }); }
};
/* ---- the hex grid (MapUI layer) ---- */
Screens.placeGrid = function(l){
  const kd = UIM.placing; if (!kd || !S.world || !(S.toPlace || []).some(q => q.k === kd && q.n > 0)){ if (UIM.placing && !(S.toPlace || []).some(q => q.k === UIM.placing && q.n > 0)) UIM.placing = null; return; }
  const M = P.Map, list = buildCells(); this._hexShown = [];
  for (const cell of list){
    const [sx, sy] = M.toScreen(cell.x, cell.y); if (sx < -40 || sy < -40 || sx > k.W + 40 || sy > 760) continue;
    const s = cell.s = P.suitability(kd, cell.lat, cell.look, cell.c), col = sCol(s), pts = [];
    for (const [px, py] of cell.poly){ const q = M.toScreen(px, py); pts.push(q[0], q[1]); }
    k.poly(l, pts, col, {a:.34, stroke:col, sa:.6});
    this._hexShown.push({cell, sx, sy});
  }
};
/* a tap on the map while placing: the nearest cell gets the build */
Screens.placeTap = function(mx, my){
  const kd = UIM.placing, shown = this._hexShown || []; if (!kd) return false;
  let best = null, bd = 1e9; for (const q of shown){ const d = (q.sx - mx) ** 2 + (q.sy - my) ** 2; if (d < bd){ bd = d; best = q; } }
  const lim = Math.max(14, 1.4 * R * (1920 / 360) * P.Map.cam.z / Kit.K); if (!best || bd > lim * lim) return true;
  if (P.placeAt(kd, best.cell.c, [best.cell.x, best.cell.y], best.cell.s)){ Audio.play("select"); P.Map.floatText(best.sx, best.sy - 10, best.cell.s >= .7 ? `+${L(P.PLACE_TXT.good)}` : best.cell.s >= .45 ? L(P.PLACE_TXT.ok) : L(P.PLACE_TXT.poor), best.cell.s >= .45 ? "good" : "accent"); k.dirty(); }
  return true;
};
/* ---- arrows at the edge of the screen for disasters and aid bubbles you can't see ---- */
Screens.edgeArrows = function(l){
  if (UIM.placing || UIM.kind()) return;
  const M = P.Map, m = 30, L0 = 74 + m, R0 = (k.W - 16) - this.drawerWidth() - m, T0 = 64 + m + 6, B0 = k.H - 64 - m;
  if (R0 - L0 < 80 || B0 - T0 < 80) return;
  const cx = (L0 + R0) / 2, cy = (T0 + B0) / 2, list = [];
  for (const h of S.haz || []) if (!h.evac){ const pt = P.countryPoint(h.c); if (pt) list.push({pt, col:HZ_COL[h.type] || "#ff5a4a", icon:P.HAZARDS[h.type].icon, id:"eh-" + h.id, c:h.c, n:Math.max(0, h.at - S.tick)}); }
  for (const b of S.bubbles || []) if (b.type === "red"){ const pt = b.cid ? P.countryPoint(b.cid) : null; if (pt) list.push({pt, col:"#ff5a4a", icon:"heart-handshake", id:"eb-" + b.id, c:b.cid, n:b.ttl}); }
  const placed = [], now = performance.now() / 1000;
  for (const q of list){
    const [x, y] = M.toScreen(q.pt[0], q.pt[1]);
    if (x > L0 - m && x < R0 + m && y > T0 - m && y < B0 + m) continue;   // on screen: drawn as usual
    const dx = x - cx, dy = y - cy, kk = Math.min((R0 - cx) / Math.max(1e-6, Math.abs(dx)), (B0 - cy) / Math.max(1e-6, Math.abs(dy)));
    let ex = cx + dx * kk, ey = cy + dy * kk;
    for (let n = 0; n < 5 && placed.some(p => Math.hypot(p[0] - ex, p[1] - ey) < 34); n++){ if (Math.abs(dx) * (B0 - cy) > Math.abs(dy) * (R0 - cx)) ey += 34; else ex += 34; }
    ex = P.clamp(ex, L0, R0); ey = P.clamp(ey, T0, B0); placed.push([ex, ey]);
    const a = Math.atan2(dy, dx), pulse = .5 + .5 * Math.sin(now * 5 + ex);
    k.poly(l, [ex + Math.cos(a) * 25, ey + Math.sin(a) * 25, ex + Math.cos(a + 2.5) * 15, ey + Math.sin(a + 2.5) * 15, ex + Math.cos(a - 2.5) * 15, ey + Math.sin(a - 2.5) * 15], q.col, {a:.85});
    k.circle(l, ex, ey, 15, "#061015", {a:.92, stroke:q.col, sw:2 + pulse});
    k.icon(l, q.icon, ex - 9, ey - 9, 18, q.col);
    k.text(l, String(q.n), ex + 4, ey + 3, {font:"monoB", size:10, color:"#ffffff", w:16, align:"center"});
    k.hit(l, q.id, ex - 18, ey - 18, 36, 36, () => { Audio.play("whoosh", {vol:.3}); M.focusCountry(q.c); });
  }
  if (placed.length) this._edgeAnim = true;
};
/* ---- pointing at a country: name, CO₂ and friendship (mouse only) ---- */
Screens.mapHover = function(l){
  const m = Kit.mouse; if (!P.hasKeyboard() || m.down || Kit.overUI || UIM.kind() || UIM.placing) return;
  const M = P.Map, [wx, wy] = M.toWorldFromScreen(m.x, m.y);
  const g = M.geoAt ? M.geoAt(wx, wy) : null, reg = g ? null : P.regionAtWorld(wx, wy);
  if (!g && !reg) return;
  const cc = g && g.c ? P.C(g.c) : null;
  const name = cc ? L(P.COUNTRY[cc.id].name) : g && g.r && P.RMETA[g.r] ? L(P.RMETA[g.r].name) : reg ? L(P.RMETA[reg].name) : ""; if (!name) return;
  const line2 = cc ? `CO₂ ${cc.co2.toFixed(2)} Gt · ${t("relation")} ${cc.rel >= 0 ? "+" : ""}${Math.round(cc.rel)}` : (g && g.r ? L(P.RMETA[g.r].name) : "");
  const w = Math.max(k.textW(name, {size:12.5, font:"bodyB"}), line2 ? k.textW(line2, {size:11, font:"mono"}) : 0) + 20, h = line2 ? 42 : 26;
  let x = m.x + 16, y = m.y + 14; if (x + w > k.W - 8) x = m.x - w - 12; if (y + h > k.H - 8) y = m.y - h - 10;
  k.rect(l, x, y, w, h, "#061015", {r:8, a:.92, stroke:"accent", sa:.5});
  k.text(l, name, x + 10, y + 4, {size:12.5, font:"bodyB"});
  if (line2) k.text(l, line2, x + 10, y + 23, {font:"mono", size:11, color:cc ? W.relCol(cc.rel) : "muted"});
};

/* ---- country pane extras (web/src/ui/drawer.jsx): warnings, resources and common hazards, Continuous World envoys and home base ---- */
Screens.countryWarn = function(l, y, cw, c){
  if (c.rest) return 0;
  const sanct = (S.sanct || {})[c.id] > 0, out = [];
  if (c.rel <= P.HOSTILE) out.push(`[[angry]] ${t("relHostile")}`);
  if (sanct) out.push(`[[ban]] ${t("relSanct")} ${S.sanct[c.id]} ${t("months")} · ${P.IC.ep} −${P.sanctCost(c)}${t("perMo")}`);
  if (!out.length) return 0;
  const h = out.reduce((s, q) => s + k.textH(q, {size:12, w:cw - 24}) + 2, 0) + 16;
  k.rect(l, 0, y, cw, h, "bad", {r:9, a:.1, stroke:"bad", sa:.5});
  let yy = y + 8; for (const q of out) yy += k.text(l, q, 12, yy, {size:12, color:"bad", w:cw - 24, iconColor:"bad"}).h + 2;
  return h + 8;
};
Screens.countryExtras = function(l, y0, cw, c){
  let y = y0 + 6;
  const meta = c.rest ? null : P.COUNTRY[c.id], th = S.lang === "th";
  // collapsible: resources and common hazards
  const open = !!UIM.cInfo, head = th ? "ทรัพยากรและภัยที่เกิดบ่อย" : "Resources and common hazards";
  k.icon(l, open ? "chevron-down" : "chevron-right", 0, y + 2, 15, "muted"); k.text(l, head, 20, y, {font:"bodyB", size:13, color:"fg"});
  k.hit(l, "cinfo", 0, y - 4, cw, 26, () => { UIM.cInfo = !UIM.cInfo; k.dirty(); }); y += 26;
  if (open){
    const refs = P.refinesList ? P.refinesList(c.id) : [], cr = P.CRES && P.CRES[c.id], imp = (P.IMPORTERS || []).includes(c.id);
    if (cr){
      const tw = (cw - 16) / 3; let i = 0;
      for (const rk of cr.r){
        const R = P.RES[rk]; if (!R) continue; const g = P.groupOf && P.groupOf(rk), ready = g && refs.includes(g);
        const tx = (i % 3) * (tw + 8), ty = y + Math.floor(i / 3) * 92; i++;
        W.card(l, tx, ty, tw, 84, {r:10, stroke:R.col, sa:.5});
        k.icon(l, "$res-" + rk, tx + tw / 2 - 18, ty + 6, 36);
        k.text(l, L(R.name).replace(/\s*\(.*\)$/, ""), tx + 4, ty + 44, {size:11, w:tw - 8, align:"center", max:1});
        if (g) k.text(l, ready ? t("resReady") : t("resRaw"), tx + 4, ty + 62, {font:"mono", size:9.5, color:ready ? "good" : "warn", w:tw - 8, align:"center", max:1});
      }
      y += Math.ceil(i / 3) * 92 + 4;
    }
    if (S.oreOn){
      const ban = (S.oreBan || {})[c.id], src = P.oreSources && P.oreSources().find(q => q.id === c.id);
      const row = (ic, lab, val, col) => { k.icon(l, ic, 0, y + 1, 16, "muted"); k.text(l, lab, 22, y, {size:12, color:"muted", w:cw - 140, max:1}); k.text(l, val, cw - 120, y, {font:"monoB", size:12, color:col, w:120, align:"right", iconColor:col}); y += 22; };
      if (cr && cr.w) row("truck", t("resSends"), ban ? `${t("resBanned")} ${ban} ${t("months")}` : src ? `+${P.matSources().filter(q => q.id === c.id).reduce((a, q) => a + q.amt, 0).toFixed(2)}${t("perMo")}` : `[[$heart]] ${t("resNeed")} 0`, ban ? "bad" : src ? "good" : "warn");
      if (refs.length) row("factory", t("resToll"), c.rel >= P.REF_TOLL_REL && !c.hostile && !ban ? `+${P.REF_TOLL_CAP}${t("perMo")}` : `[[$heart]] ${t("resNeed")} ${P.REF_TOLL_REL}`, c.rel >= P.REF_TOLL_REL && !c.hostile && !ban ? "good" : "warn");
      if (imp){ k.icon(l, "ship", 0, y + 1, 16, "muted"); y += k.text(l, t("resImports"), 22, y, {size:12, color:"muted", w:cw - 22}).h + 4; }
    }
    if (meta && meta.hz){
      y += k.text(l, t("hazardsHere"), 0, y, {size:11.5, color:"muted"}).h + 4;
      let cx = 0;
      for (const hk of meta.hz){ const Z = P.HAZARDS[hk], lab = `[[${Z.icon}]] ${L(Z.name)}`, w = k.textW(lab, {size:11.5}) + 18; if (cx + w > cw){ cx = 0; y += 28; } k.rect(l, cx, y, w, 24, null, {r:12, stroke:"line", bg:true}); k.text(l, lab, cx + 9, y + 3, {size:11.5, iconColor:"warn"}); cx += w + 6; }
      y += 32;
    }
  }
  // Continuous World: envoys and the home base
  if (S.world && !c.rest && P.W2){
    const W2 = P.W2, amb = (S.amb || []).includes(c.id), hq = S.hq === c.id, ka = P.w2cost(P.AMB_COST), kh = P.w2cost(P.HQ_COST);
    y += 6;
    const y1 = y; y += 10;
    k.text(l, `[[flag]] ${L(W2.title)}`, 12, y, {font:"bodyB", size:13, iconColor:"accent"}); y += 24;
    if (hq){ y += k.text(l, `[[landmark]] ${L(W2.hqHere)}`, 12, y, {size:12, color:"good", iconColor:"good"}).h + 4; }
    if (amb){ y += k.text(l, `[[flag]] ${L(W2.ambHere)}`, 12, y, {size:12, color:"good", iconColor:"good"}).h + 4; }
    let bx = 12;
    if (amb) bx += W.btn(l, "amb-rc", bx, y, L(W2.ambRecall), () => P.ambRecall(c.id), {kind:"ghost", size:12.5, h:32}) + 8;
    else bx += W.btn(l, "amb-go", bx, y, `${L(W2.ambSend)} · ${P.IC.pc} ${ka.pc} · ${(S.amb || []).length}/${P.AMB_MAX}`, () => { if (P.ambSend(c.id)) Audio.play("done"); }, {kind:P.ambOk(c) ? "primary" : "ghost", disabled:!P.ambOk(c), size:12.5, h:32, sound:false}) + 8;
    y += 40;
    if (!hq){ W.btn(l, "hq-go", 12, y, S.hqCd > 0 ? `${L(W2.hqWait)} ${S.hqCd} ${t("months")}` : `${L(W2.hqSet)} · ${P.IC.ep} ${kh.ep} ${P.IC.pc} ${kh.pc}`, () => { if (P.moveHQ(c.id)) Audio.play("done"); }, {kind:P.hqOk(c) ? "primary" : "ghost", disabled:!P.hqOk(c), size:12.5, h:32, sound:false}); y += 40; }
    if (!amb && (S.amb || []).length >= P.AMB_MAX){ y += k.text(l, L(W2.ambFull), 12, y, {size:11.5, color:"warn", w:cw - 24}).h + 4; }
    y += k.text(l, L(W2.ambHelp), 12, y, {size:11, color:"muted", w:cw - 24}).h + 4;
    y += 6;
    W.card(l, 0, y1, cw, y - y1, {r:10, stroke:"accent", sa:.4});
  }
  return y - y0;
};

/* ---- builds pinned on the map (web/src/mapfx.js drawPins): wind turbines, solar farms, reactors, forests, … ---- */
const KIND = {
  wind:{col:"#e8f4f8", name:{th:"ฟาร์มกังหันลม", en:"Wind farm"}}, solar:{col:"#4aa3ff", name:{th:"โซลาร์ฟาร์ม", en:"Solar farm"}},
  floatsolar:{col:"#4aa3ff", name:{th:"โซลาร์ลอยน้ำ", en:"Floating solar"}}, nuclear:{col:"#c8d2d8", name:{th:"โรงไฟฟ้านิวเคลียร์ขนาดเล็ก", en:"Small reactor"}},
  fusion:{col:"#c3a6ff", name:{th:"โรงไฟฟ้าฟิวชัน", en:"Fusion plant"}}, battery:{col:"#5fd39a", name:{th:"แบตเตอรี่กักเก็บไฟ", en:"Grid battery"}},
  grid:{col:"#f2c14e", name:{th:"โครงข่ายไฟฟ้าอัจฉริยะ", en:"Smart grid"}, icon:"utility-pole"}, geo:{col:"#ff9a5c", name:{th:"โรงไฟฟ้าความร้อนใต้พิภพ", en:"Geothermal plant"}, icon:"flame-kindling"},
  h2:{col:"#8fd0ff", name:{th:"โรงงานไฮโดรเจนเขียว", en:"Green hydrogen plant"}, icon:"atom"}, steel:{col:"#b7c7cf", name:{th:"โรงเหล็กคาร์บอนต่ำ", en:"Low-carbon steelworks"}, icon:"anvil"},
  rail:{col:"#f2c14e", name:{th:"รถไฟความเร็วสูง", en:"High-speed rail"}, icon:"train-front"}, ev:{col:"#5fd39a", name:{th:"รถไฟฟ้าทั้งเมือง", en:"Electric transport"}, icon:"car"},
  recycle:{col:"#5fd39a", name:{th:"โรงรีไซเคิล", en:"Recycling plant"}, icon:"recycle"}, dac:{col:"#8fd0ff", name:{th:"โรงดักจับคาร์บอนจากอากาศ", en:"Direct air capture"}, icon:"fan"},
  forest:{col:"#2fbf6a", name:{th:"ป่าปลูกใหม่", en:"New forest"}}, mangrove:{col:"#2fbf6a", name:{th:"ป่าชายเลน", en:"Mangroves"}},
  farm:{col:"#a3d977", name:{th:"เกษตรฟื้นฟูดิน", en:"Regenerative farms"}, icon:"wheat"}, rice:{col:"#a3d977", name:{th:"นาข้าวปล่อยมีเทนต่ำ", en:"Low-methane rice"}, icon:"sprout"},
  biochar:{col:"#8a6a4a", name:{th:"ไบโอชาร์", en:"Biochar"}, icon:"shovel"}, ocean:{col:"#4fd1c5", name:{th:"เติมแร่ธาตุในมหาสมุทร", en:"Ocean minerals"}, icon:"waves"},
  sponge:{col:"#8fd0ff", name:{th:"เมืองฟองน้ำ", en:"Sponge city"}, icon:"droplets"}, seawall:{col:"#4fd1c5", name:{th:"ประตูกั้นน้ำเค็ม", en:"Saltwater barrier"}, icon:"brick-wall"},
  city:{col:"#4fd1c5", name:{th:"เมืองทนภัย", en:"Resilient city"}, icon:"building-2"}, building:{col:"#4fd1c5", name:{th:"อาคาร Net-Zero", en:"Net-Zero buildings"}, icon:"building"},
  saf:{col:"#5fd39a", name:{th:"โรงกลั่นเชื้อเพลิงอากาศยานยั่งยืน", en:"Sustainable jet fuel"}, icon:"plane"}, mine:{col:"#ff9a3c", name:{th:"เหมืองและโรงแยกแร่", en:"Mine & refinery"}, icon:"pickaxe"},
};
P.KIND_NAME = P.KIND_NAME || Object.fromEntries(Object.entries(KIND).map(([kk, v]) => [kk, v.name]));
const kindName = kk => L((KIND[kk] || {}).name || {th:kk, en:kk});
const TAU = Math.PI * 2;
function drawWind(l, x, y, s, now, sd){
  k.line(l, x, y + s * .55, x, y - s * .2, "#eef6f8", {w:Math.max(1.2, s * .09)});
  const a0 = now * 2.6 + sd;
  for (let i = 0; i < 3; i++){ const a = a0 + i * TAU / 3; k.line(l, x, y - s * .2, x + Math.cos(a) * s * .5, y - s * .2 + Math.sin(a) * s * .5, "#eef6f8", {w:Math.max(1.2, s * .09)}); }
  k.circle(l, x, y - s * .2, s * .07, "#ffffff");
}
function drawSolar(l, x, y, s, now, floating){
  if (floating) k.circle(l, x, y + s * .28, s * .5, "#4faaff", {a:.22});
  const sk = s * .35 * .44, x0 = x - s * .45, y0 = y - s * .22, w = s * .9, h = s * .44;
  const pts = [x0 + sk, y0, x0 + w + sk, y0, x0 + w - sk * .0, y0 + h, x0, y0 + h];
  k.poly(l, pts, "#1f5fae", {stroke:"#bee1ff", sa:.85});
  for (let i = 1; i < 3; i++) k.line(l, x0 + w / 3 * i + sk, y0, x0 + w / 3 * i, y0 + h, "#bee1ff", {a:.7});
  k.line(l, x0 + sk / 2, y0 + h / 2, x0 + w + sk / 2, y0 + h / 2, "#bee1ff", {a:.7});
  const g = (Math.sin(now * 1.3 + x * .01) + 1) / 2; k.poly(l, [x0 + w * .6 * g + sk, y0, x0 + w * .6 * g + s * .14 + sk, y0, x0 + w * .6 * g + s * .14, y0 + h, x0 + w * .6 * g, y0 + h], "#ffffff", {a:.15 + .35 * g});
}
function drawNuclear(l, x, y, s, now, fusion){
  if (fusion){ k.circle(l, x, y, s * .42, null, {stroke:"#c3a6ff", sw:s * .12}); k.circle(l, x, y, s * .12, "#c3a6ff", {a:.5 + .3 * Math.sin(now * 4)}); return; }
  k.poly(l, [x - s * .32, y + s * .4, x - s * .2, y, x - s * .24, y - s * .3, x + s * .24, y - s * .3, x + s * .2, y, x + s * .32, y + s * .4], "#c8d2d8");
  for (let i = 0; i < 3; i++){ const q = (now * .5 + i / 3) % 1; k.circle(l, x + Math.sin(q * 5 + i) * s * .08, y - s * .35 - q * s * .55, s * (.12 + q * .14), "#f0f8ff", {a:.55 * (1 - q)}); }
}
function drawTrees(l, x, y, s, water){
  if (water) k.circle(l, x, y + s * .32, s * .45, "#4faaff", {a:.3});
  for (const [dx, dy, r, col] of [[-.25, .05, .26, "#1e9a50"], [.22, .08, .24, "#168a43"], [0, -.15, .3, "#2fbf6a"]]){ k.rect(l, x + dx * s - s * .03, y + dy * s + r * s * .6, s * .06, s * .2, "#6b4a2b"); k.circle(l, x + dx * s, y + dy * s, r * s, col); }
}
function drawBattery(l, x, y, s, now){
  k.rect(l, x - s * .4, y - s * .22, s * .8, s * .44, "#123a2a", {r:s * .08, stroke:"#5fd39a", sw:1.5});
  const f = (Math.sin(now * 1.5) + 1) / 2 * .8 + .2; k.rect(l, x - s * .34, y - s * .16, s * .68 * f, s * .32, "#5fd39a");
  k.rect(l, x + s * .4, y - s * .08, s * .07, s * .16, "#5fd39a");
}
function drawBadge(l, x, y, s, kk){
  const K = KIND[kk] || {col:"#4fd1c5", icon:"circle"};
  k.circle(l, x, y, s * .48, "#061015", {a:.85, stroke:K.col, sw:1.6});
  k.icon(l, K.icon || "circle", x - s * .3, y - s * .3, s * .6, K.col);
}
function drawBuilding(l, x, y, s, prog, now){
  const w = Math.max(1.2, s * .08);
  k.line(l, x - s * .2, y + s * .45, x - s * .2, y - s * .4, "#f2c14e", {w}); k.line(l, x - s * .2, y - s * .4, x + s * .4, y - s * .4, "#f2c14e", {w});
  const sw = Math.sin(now * 1.6) * s * .05; k.line(l, x + s * .3 + sw, y - s * .4, x + s * .3 + sw, y - s * .05, "#f2c14e", {w});
  k.rect(l, x + s * .22 + sw, y - s * .07, s * .16, s * .12, "#f2c14e");
  k.circle(l, x, y, s * .62, null, {stroke:"#ffffff", sw:2.5, sa:.18});
  const n = 24, f = P.clamp(prog, 0, 1); for (let i = 0; i < n * f; i++){ const a = -Math.PI / 2 + i / n * TAU; k.circle(l, x + Math.cos(a) * s * .62, y + Math.sin(a) * s * .62, 1.6, "#f2c14e"); }
}
Screens.drawPins = function(l){
  const M = P.Map, now = performance.now() / 1000, vis = (x, y) => x > -30 && y > 40 && x < k.W + 30 && y < k.H - 30;
  let anim = false;
  // Continuous World: home base (gold star) and envoys (flags)
  if (S.world){
    const mark = (id, kind) => {
      const pt = P.countryPoint(id); if (!pt) return;
      const [x, y0] = M.toScreen(pt[0], pt[1]), y = y0 - 26; if (!vis(x, y)) return;
      if (kind === "hq"){ k.circle(l, x, y, 11, "#061015", {a:.85, stroke:"#f2c14e", sw:2}); const st = []; for (let i = 0; i < 10; i++){ const r = i % 2 ? 3.2 : 7.2, a = -Math.PI / 2 + i * Math.PI / 5; st.push(x + Math.cos(a) * r, y + Math.sin(a) * r); } k.poly(l, st, "#f2c14e"); }
      else { k.line(l, x - 4, y + 9, x - 4, y - 9, "#e6f0ee", {w:1.6}); k.poly(l, [x - 4, y - 9, x + 8, y - 5, x - 4, y - 1], "#4fd1c5"); }
      k.hit(l, "base-" + kind + id, x - 12, y - 12, 24, 24, () => { M.info = {x, y:y - 14, t:performance.now(), txt:`${L(kind === "hq" ? P.W2.hqHere : P.W2.ambHere)} · ${P.cname(id)}`}; k.dirty("MapUI"); });
    };
    (S.amb || []).forEach(id => mark(id, "amb")); if (S.hq) mark(S.hq, "hq");
  }
  const pins = S.pins; if (!pins || !pins.length) return;
  const z = M.cam.z, s = P.clamp(9 + 6 * Math.sqrt(z), 13, 30), far = z < 1.3, seen = new Set();
  for (const p of pins){
    if (far){ const key = p.c + p.k; if (seen.has(key)) continue; seen.add(key); }
    const pos = M.pinPoint(p); if (!pos) continue;
    const [x, y] = M.toScreen(pos[0], pos[1]); if (!vis(x, y)) continue;
    const sd = p.sd % 100; anim = true;
    if (!p.done) drawBuilding(l, x, y, s, P.rollProgress(p.sk) ?? 1, now);
    else if (p.k === "wind") drawWind(l, x, y, s, now, sd);
    else if (p.k === "solar" || p.k === "floatsolar") drawSolar(l, x, y, s, now, p.k === "floatsolar");
    else if (p.k === "nuclear" || p.k === "fusion") drawNuclear(l, x, y, s, now, p.k === "fusion");
    else if (p.k === "forest" || p.k === "mangrove") drawTrees(l, x, y, s, p.k === "mangrove");
    else if (p.k === "battery") drawBattery(l, x, y, s, now);
    else drawBadge(l, x, y, s, p.k);
    k.hit(l, "pin-" + p.id, x - s * .5, y - s * .5, s, s, () => { M.info = {x, y:y - s * .6, t:performance.now(), txt:`${kindName(p.k)} · ${P.cname(p.c)}${p.done ? "" : " · " + t("building")}`}; k.dirty("MapUI"); });
  }
  if (anim && !(P.Gfx && P.Gfx.level === "low")) this._edgeAnim = true;   // turbines turn, smoke rises
  // a tapped pin: a small label for 2.5 s
  const inf = M.info;
  if (inf && performance.now() - inf.t < 2500){ const w = k.textW(inf.txt, {size:12, font:"bodyB"}) + 20; k.rect(l, inf.x - w / 2, inf.y - 30, w, 26, "#061015", {r:8, a:.92, stroke:"accent", sa:.5}); k.text(l, inf.txt, inf.x - w / 2, inf.y - 26, {size:12, font:"bodyB", w, align:"center"}); this._edgeAnim = true; }
};
