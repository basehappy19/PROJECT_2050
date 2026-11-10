const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.skills) return;
(P.mods = P.mods || {}).skills = 1;
/* =========================================================================
   Screens · Skill screen (full screen, like Plague Inc)
   Left: hexagon grid of the selected category · Right: details of the tapped skill · Bottom: category tabs
   Opening it pauses the game. Close with ✕, Esc, T, or by tapping outside the window.
   Only owned skills and the NEXT skills you can buy are shown; anything further away is "???".
   ========================================================================= */
const {Kit, S, t, L, Audio, W, UIM, Screens, SKILLS, SKILL, SKILL_CATS, SKILL_TYPE, IC, HAZARDS} = P;
const k = Kit;
// 2.1.3: a full-screen page like the website (ui/skills.jsx + .skills-page): header · grid (left) + details (380, right) · category tabs
let GX = 16, GY = 78, GW = 800, GH = 500, DX = 840, DW = 380, OX = 0, OY = 0;
let HEXR = 50, COLW = 168, ROWH = 142, SC = 1;
const hexPts = (cx, cy, r) => { const p = []; for (let i = 0; i < 6; i++){ const a = Math.PI / 180 * (60 * i - 30); p.push(cx + r * Math.cos(a), cy + r * Math.sin(a)); } return p; };
const cx0 = n => 92 + n.pos[0] * 168, cy0 = n => 70 + n.pos[1] * 142 + (n.pos[0] % 2 ? 26 : 0);
const centre = n => [OX + cx0(n) * SC, OY + cy0(n) * SC];
/* "next" = all requirements owned; anything further away is dimmed with a lock (name and picture visible, like web 2.1) */
const visible = n => S.owned[n.id] || n.req.every(q => S.owned[q]);
const typeTags = n => {
  const out = [];
  out.push(n.type === "active" ? "active" : "passive");
  if (n.trade) out.push("trade");
  if (n.resp) out.push("resp");
  if (n.target === "country") out.push("country");
  return out;
};

Screens.renderSkills = function(l){
  k.clearSlave("ModalScroll");
  const cat = S.skillCat || "energy", th = S.lang === "th";
  const HH = 64, CH = 52, nodes = SKILLS.filter(n => n.cat === cat);
  DW = k.W < 1200 ? 330 : 380; GX = 16; GY = HH + 14; DX = k.W - 16 - DW; GW = DX - 16 - GX; GH = k.H - 14 - CH - 14 - GY;
  // fit the category's hexagons in the grid box (web: svg viewBox, xMidYMid meet), leaving room for the rollouts row
  const maxX = Math.max(...nodes.map(cx0)) + 92, maxY = Math.max(...nodes.map(cy0)) + 50 + 44, gh = GH - 16 - 48;
  SC = Math.min(1.25, (GW - 16) / maxX, gh / maxY); HEXR = 50 * SC; COLW = 168 * SC; ROWH = 142 * SC;
  OX = GX + 8 + (GW - 16 - maxX * SC) / 2; OY = GY + 8 + (gh - maxY * SC) / 2;
  // page background (web .skills-page: radial glow at the top over the dark background)
  k.rect(l, 0, 0, k.W, k.H, "bg", {bg:true});
  k.hit(l, "sk-box", 0, 0, k.W, k.H, () => {}, {cursor:false});
  { const g = l.g0; g.lineStyle(0); for (let i = 0; i < 14; i++){ const f = 1 - i / 14; g.beginFill(0x10303a, .07); g.drawEllipse(k.W / 2 * k.K, 0, k.W * .75 * f * k.K, k.H * .9 * f * k.K); g.endFill(); } }
  /* header */
  k.text(l, `[[network]] ${P.up(t("skillsTitle"))}`, 22, 19, {font:"disp", size:21, iconColor:"accent"});
  W.hbtn(l, "sk-close", k.W - 16 - 40, 12, "x", () => Screens.closeSkills(), {s:40, is:22, color:"fg"});
  const busy = P.busyIds().length, res = [];
  res.push([[`${IC.ep} `, {size:14}], [String(Math.floor(S.ep)), {font:"monoB", size:15}]]);
  res.push([[`${IC.pc} `, {size:14}], [String(Math.floor(S.pc)), {font:"monoB", size:15}]]);
  if (S.oreOn) res.push([[`${IC.ore || "[[$ore]]"} `, {size:14}], [String(P.isFullRes && P.isFullRes() ? P.matTotal() : Math.floor(S.ore)), {font:"monoB", size:15}]]);
  res.push([[`[[loader]] ${t("inProgress")} ${busy}/${P.MAX_PROJECTS}`, {size:13, color:busy >= P.MAX_PROJECTS ? "warn" : "muted", iconColor:busy >= P.MAX_PROJECTS ? "warn" : "muted"}]]);
  if (P.recentBuys()) res.push([[`[[chart-line]] ${t("rush")} +${P.recentBuys() * 20}%`, {size:13, color:"bad", iconColor:"bad"}]]);
  if (S.buff.instant) res.push([[`[[lightbulb]] ${t("buffInstant")}`, {size:13, color:"good", iconColor:"good"}]]);
  else if (S.buff.disc) res.push([[`[[flask-round]] ${t("buffDisc")}`, {size:13, color:"good", iconColor:"good"}]]);
  const rw = res.map(parts => parts.reduce((a, [tx, o]) => a + k.textW(tx, {font:o.font || "body", size:o.size}), 0));
  let hx = k.W - 16 - 40 - 22 - rw.reduce((a, b) => a + b, 0) - 18 * (res.length - 1);
  res.forEach((parts, i) => { W.runs(l, hx, 22, parts); hx += rw[i] + 18; });
  k.line(l, 0, HH, k.W, HH, "line");
  /* grid */
  k.rect(l, GX, GY, GW, GH, "#061015", {r:14, a:.6, stroke:"line", bg:true});
  // edges
  for (const n of nodes) for (const q of n.req){
    const qn = SKILL[q]; if (!qn || qn.cat !== cat) continue;
    if (!visible(n) && !S.owned[q]) continue;
    const [x1, y1] = centre(qn), [x2, y2] = centre(n);
    const st = S.owned[n.id] ? "good" : S.owned[q] ? "accent" : "line";
    const ang = Math.atan2(y2 - y1, x2 - x1), r0 = HEXR - 2;
    k.line(l, x1 + Math.cos(ang) * r0, y1 + Math.sin(ang) * r0, x2 - Math.cos(ang) * (r0 + 6), y2 - Math.sin(ang) * (r0 + 6), st, {w:st === "line" ? 1.4 : 2.4, dash:st === "line" ? 5 : 0, a:.9});
    const ax = x2 - Math.cos(ang) * (r0 + 2), ay = y2 - Math.sin(ang) * (r0 + 2);
    k.poly(l, [ax, ay, ax - Math.cos(ang - .45) * 10, ay - Math.sin(ang - .45) * 10, ax - Math.cos(ang + .45) * 10, ay - Math.sin(ang + .45) * 10], st, {a:.95});
  }
  for (const n of nodes){
    const [cx, cy] = centre(n), vis = visible(n), own = !!S.owned[n.id], c = P.nodeCost(n);
    const p = P.rollProgress(n.id), sel = S.node === n.id, id = "hx-" + n.id, hov = k.isHover(l, id);
    const afford = vis && !own && (P.canAfford ? P.canAfford(n) : S.ep >= c.ep && S.pc >= c.pc) && !P.atCapacity(n);
    if (afford) k.poly(l, hexPts(cx, cy, HEXR + 8), "accent", {a:.18});
    const fill = own ? (n.type === "active" ? "#2c5a7a" : "#1f7a5c") : vis ? "panel2" : "bg";
    k.poly(l, hexPts(cx, cy, HEXR), fill, {stroke:own ? "good" : afford ? "accent" : "line", sw:hov ? 2.4 : 1.3, a:vis ? 1 : .65});
    if (p !== null){ k.poly(l, hexPts(cx, cy, HEXR - 5), "accent", {a:.15 + .35 * p}); }
    if (sel){ const q = hexPts(cx, cy, HEXR + 5); k.path(l, [...q, q[0], q[1]], "#ffffff", {w:2.5}); }
    // the skill's 3D picture (web assets/img/ui/3d/sk-<id>.webp): full when owned / buyable, dim when visible, faint when further away
    const is = 50 * SC; k.icon(l, "$sk-" + n.id, cx - is / 2, cy - 33 * SC, is, "#ffffff", own || afford ? 1 : vis ? .7 : .3);
    if (!vis) k.icon(l, "lock", cx - 8 * SC, cy + 13 * SC, 16 * SC, "muted");
    const lab = vis ? (p !== null ? `${Math.round(p * 100)}%` : own ? (n.type === "active" ? (S.actCd[n.id] ? `${S.actCd[n.id]} ${t("moShort")}` : t("ready")) : "✓") : `${c.ep}·${c.pc}`) : "";
    if (lab) k.text(l, lab, cx - HEXR, cy + 25 * SC - 12, {font:"mono", size:12, color:own ? "#e8fff6" : afford ? "accent" : "muted", w:HEXR * 2, align:"center"});
    if (n.type === "active") k.icon(l, "zap", cx + HEXR - 24 * SC, cy - HEXR + 9 * SC, 13, own ? "gold" : "muted");
    if (vis && n.trade) k.icon(l, "scale", cx - HEXR + 11 * SC, cy - HEXR + 9 * SC, 13, "warn");
    if (vis && n.resp) k.icon(l, "shield", cx - HEXR + 11 * SC, cy - HEXR + 9 * SC, 13, "sky");
    // name under the hex (every skill shows its name since web 2.1)
    k.text(l, L(n.name), cx - 80, cy + HEXR + 3, {size:12, lh:1.25, color:vis ? "fg" : "muted", w:160, align:"center", max:2});
    k.hit(l, id, cx - HEXR, cy - HEXR, HEXR * 2, HEXR * 2 + 34, () => { Audio.play("select"); S.node = n.id; k.dirty(); });
  }
  // rollouts in progress (under the grid)
  let ry = GY + GH - 8 - 40;
  if (S.rollouts.length){
    let rx = GX + 10;
    for (const ro of S.rollouts.slice(0, 6)){
      const n = SKILL[ro.id], w = 220;
      k.rect(l, rx, ry, w, 34, "panel2", {r:8, bg:true});
      k.icon(l, n.icon, rx + 8, ry + 9, 16, "accent");
      k.text(l, L(n.name), rx + 30, ry + 3, {size:11, w:w - 40, max:1});
      W.meter(l, rx + 30, ry + 22, w - 90, 4, 1 - ro.left / ro.months, "accent");
      k.text(l, `${ro.left} ${t("moShort")}`, rx + w - 56, ry + 16, {font:"mono", size:10, color:"muted", w:48, align:"right"});
      rx += w + 8; if (rx + w > GX + GW){ break; }
    }
  } else k.text(l, t("noRollouts"), GX + 12, ry + 12, {size:12, color:"muted"});
  /* detail panel */
  this.skillDetail(l, DX, GY, DW, GH);
  /* category tabs */
  const NC = SKILL_CATS.length, ty = k.H - 14 - CH, tw = (k.W - 32 - (NC - 1) * 8) / NC;
  SKILL_CATS.forEach((c, i) => {
    const tx = 16 + i * (tw + 8), on = cat === c.id, id = "cat-" + c.id, hov = k.isHover(l, id);
    const list = SKILLS.filter(n => n.cat === c.id), own = list.filter(n => S.owned[n.id]).length;
    const ready = list.filter(n => !S.owned[n.id] && visible(n) && (P.canAfford ? P.canAfford(n) : true)).length;
    k.rect(l, tx, ty, tw, CH, on ? "accent" : "#061015", {r:10, a:on ? 1 : .6, stroke:on || hov ? "accent" : "line", bg:true});
    k.icon(l, c.icon, tx + 12, ty + 16, 20, on ? "ink" : "accent");
    k.text(l, L(c.name), tx + 42, ty + 7, {font:"dispS", size:13, color:on ? "ink" : "fg", w:tw - 76, max:1});
    k.text(l, `${own}/${list.length}`, tx + 42, ty + 27, {font:"mono", size:12, color:on ? "ink" : "muted"});
    if (ready){ k.rect(l, tx + tw - 32, ty + 16, 22, 20, on ? "ink" : "good", {r:10}); k.text(l, String(ready), tx + tw - 32, ty + 17, {font:"monoB", size:11, color:on ? "accent" : "#04130c", w:22, align:"center"}); }
    k.hit(l, id, tx, ty, tw, CH, () => { Audio.play("click"); S.skillCat = c.id; const first = SKILLS.find(n => n.cat === c.id && !S.owned[n.id] && visible(n)) || SKILLS.find(n => n.cat === c.id); S.node = first.id; k.dirty(); });
  });
};

Screens.skillDetail = function(l, x, y, w, h){
  const n = SKILL[S.node] && SKILL[S.node].cat === (S.skillCat || "energy") ? SKILL[S.node] : SKILLS.find(q => q.cat === (S.skillCat || "energy"));
  k.rect(l, x, y, w, h, "panel2", {r:12, stroke:"line", bg:true});
  const vis = visible(n), own = !!S.owned[n.id], c = P.nodeCost(n), st = P.nodeState(n);
  const px = x + 18, iw = w - 36; let cy = y + 18;
  // web .dicon.d3: the skill's 3D picture on a tinted tile
  k.rect(l, px, cy, 64, 64, own ? "good" : "accent", {r:14, a:own ? .16 : .12});
  k.icon(l, "$sk-" + n.id, px + 4, cy + 4, 56, "#ffffff", vis ? 1 : .45);
  const sdg = vis && P.SDG_OF ? P.SDG_OF[n.cat] || [] : [], sdgW = sdg.length ? sdg.length * 38 : 0;
  sdg.forEach((g, i) => k.icon(l, "$sdg-" + g, px + iw - sdgW + 4 + i * 38, cy, 34, "#ffffff"));
  if (!vis){
    k.text(l, L(n.name), px + 80, cy + 8, {font:"dispS", size:19, w:iw - 80, lh:1.25});
    const req = n.req.filter(q => !S.owned[q]).map(q => L(SKILL[q].name));
    k.text(l, `[[lock]] ${t("hiddenHint")} ${req.join(", ")}`, px, cy + 84, {size:13, color:"muted", w:iw, iconColor:"muted"});
    return;
  }
  const nh = k.text(l, L(n.name), px + 80, cy + 2, {font:"dispS", size:19, w:iw - 80 - sdgW, lh:1.25}).h;
  let tx = px + 80, tyy = cy + Math.max(nh + 6, 34);
  for (const tg of typeTags(n)){ const lab = L(SKILL_TYPE[tg]), kind = tg === "trade" ? "warn" : tg === "active" ? "gold" : tg === "resp" ? "acc" : ""; tx += W.pill(l, tx, tyy, lab, kind) + 5; }
  cy += 76;
  // what it changes: one row per value (web Effects: icon · label · ▲▼ value; green = good for you, red = bad)
  const chips = P.skillChips ? P.skillChips(n) : [];
  for (const c of chips){
    const col = c.good ? "good" : "bad";
    k.rect(l, px, cy, iw, 38, col, {r:10, a:.07, stroke:col, sa:.3});
    k.icon(l, c.icon || "$" + c.stat, px + 7, cy + 6, 26, "sky");
    const vt = String(c.val), vw = k.textW(vt, {font:"monoB", size:14});
    k.text(l, c.label, px + 42, cy + 10, {size:13, w:iw - 42 - vw - 40, max:1});
    k.circle(l, px + iw - 10 - vw - 15, cy + 19, 9, col);
    k.text(l, c.up ? "▲" : "▼", px + iw - 10 - vw - 24, cy + 11, {font:"monoB", size:11, color:c.good ? "#04130c" : "#2a0704", w:18, align:"center"});
    k.text(l, vt, px + iw - 10 - vw, cy + 9, {font:"monoB", size:14, color:col});
    cy += 43;
  }
  if (chips.length) cy += 4;
  cy += k.text(l, L(n.desc), px, cy, {size:13.5, w:iw, lh:1.45, color:"muted"}).h + 10;
  if (n.resp){
    const list = Object.entries(n.resp).map(([hz, v]) => `[[${HAZARDS[hz].icon}]] ${L(HAZARDS[hz].name)} −${Math.round(v * 100)}%`).join("   ");
    cy += k.text(l, list, px, cy, {size:12, color:"sky", w:iw, iconColor:"sky"}).h + 8;
  }
  { const tilt = P.tiltOfSkill ? P.tiltOfSkill(n.id) : null; if (tilt && tilt.length){ k.text(l, t("grpWho"), px, cy, {size:11.5, color:"muted"}); W.groupTilt(l, px + k.textW(t("grpWho"), {size:11.5}) + 10, cy + 1, tilt); cy += 26; } }
  const pills = [];
  if (!own){ pills.push({txt:`${IC.ep} ${c.ep}`, kind:S.ep >= c.ep ? "acc" : "bad"}); pills.push({txt:`${IC.pc} ${c.pc}`, kind:S.pc >= c.pc ? "acc" : "bad"}); }
  // 3.x: minerals this skill needs (from the shared engine), red when short — tap the minerals box to buy more
  const mc = !own && P.matCost ? P.matCost(n) : null;
  if (mc) for (const g of P.MAT_IDS) if (mc[g]) pills.push({txt:`[[$mat-${g}]] ${Math.ceil(mc[g])}`, kind:(S.mat[g] || 0) >= mc[g] ? "acc" : "bad"});
  pills.push({txt:`${t("needs")}: ${n.req.length ? n.req.map(q => L(SKILL[q].name)).join(" + ") : t("none")}`, kind:""});
  if (n.months) pills.push({txt:`${t("rollout")} ${n.months} ${t("months")}`, kind:""});
  if (n.type === "active") pills.push({txt:`${t("cooldownLen")} ${n.cd} ${t("months")}`, kind:"gold"});
  cy += W.pills(l, px, cy, iw, pills) + 14;
  const full = st === "ready" && P.atCapacity(n);
  const can = st === "ready" && !full && (P.canAfford ? P.canAfford(n) && (!P.matOk || P.matOk(n)) : S.ep >= c.ep && S.pc >= c.pc);
  if (!own){
    const lab = `[[lock-open]] ${t("unlock")}`;
    W.btn(l, "buy", px, cy, lab, () => { if (P.buyNode(n.id)) Audio.play("buy"); k.dirty(); }, {disabled:!can, sound:false, h:42, size:15, w:iw});
    cy += 48;
    if (full) cy += k.text(l, t("capFull"), px, cy, {size:12, color:"bad", w:iw}).h + 4;
    else if (st === "locked") cy += k.text(l, t("needReq"), px, cy, {size:12, color:"warn", w:iw}).h + 4;
    else if (!can && S.oreOn && P.matCost && P.matCost(n) && P.matOk && !P.matOk(n)){
      // web .skmat: what is missing (red) + a gold "Go to the market" button, and refining that is on its way
      const mc2 = P.matCost(n), miss = Object.entries(mc2).filter(([g, v]) => (S.mat[g] || 0) < v);
      const txt = `${t("matShortSk")} ${miss.map(([g, v]) => `[[$mat-${g}]] ${Math.ceil(v - (S.mat[g] || 0))}`).join("  ")}`;
      const bl = `[[store]] ${t("toMarket")}`, bw = W.btnW(bl, {size:13}) + 8, tw = Math.min(iw - bw - 10, k.textW(txt, {size:12.5}));
      const th2 = k.text(l, txt, px, cy + 8, {size:12.5, color:"bad", w:iw - bw - 10, iconColor:"#ffffff"}).h;
      W.btn(l, "tomkt", px + Math.max(tw + 10, Math.min(iw - bw, tw + 10)), cy, bl, () => { Screens.closeSkills(); Screens.openWin("market"); }, {kind:"gold", h:34, size:13, w:bw});
      cy += Math.max(38, th2 + 12);
      if (P.rawFor) for (const [g] of miss) if (P.rawFor(g) > 0) cy += k.text(l, `[[$mat-${g}]] ${t("refWaiting").replace("{N}", P.rawFor(g)).replace("{M}", P.monthsToRefine(g))}`, px, cy, {size:11.5, color:"muted", w:iw, iconColor:"#ffffff"}).h + 2;
    }
    else if (!can) cy += k.text(l, t("cantAfford"), px, cy, {size:12, color:"bad", w:iw}).h + 4;
  } else if (n.type === "active"){
    const a = P.abilityList().find(q => q.id === n.id), ready = a && P.abilityReady(a), cd = S.actCd[n.id] || 0;
    const lab = cd ? `${t("cooldown")} ${cd} ${t("months")}` : `[[zap]] ${t("useNow")}`;
    W.btn(l, "use", px, cy, lab, () => { if (P.useAbility(n.id)) k.dirty(); }, {disabled:!ready, kind:"gold", h:42, size:15, w:iw});
    cy += 48;
    if (!cd && n.target === "country" && !(S.selC && !S.selC.startsWith("R_"))) cy += k.text(l, t("needCountry"), px, cy, {size:12, color:"warn", w:iw}).h + 4;
    else if (n.target === "country" && S.selC) cy += k.text(l, `${t("target")}: ${P.cname(S.selC)}`, px, cy, {size:12, color:"muted", w:iw}).h + 4;
  } else {
    const p = P.rollProgress(n.id);
    k.text(l, p !== null ? `[[loader]] ${t("rollingOut")} ${Math.round(p * 100)}%` : `[[check]] ${t("owned")}`, px, cy + 8, {font:"dispS", size:15, color:p !== null ? "accent" : "good", iconColor:p !== null ? "accent" : "good"});
    cy += 40;
  }
  // tip at the bottom
  k.text(l, t("skillTip"), px, y + h - 54, {size:11.5, color:"muted", w:iw, lh:1.35});
};
