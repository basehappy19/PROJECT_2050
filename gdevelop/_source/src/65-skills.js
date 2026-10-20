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
const BX = 36, BY = 26, BW = 1208, BH = 668;           // window
const GX = BX + 24, GY = BY + 74, GW = 720, GH = 470;   // grid area
const DX = GX + GW + 20, DW = BX + BW - 24 - DX;        // detail panel
const HEXR = 50, COLW = 168, ROWH = 128;

const hexPts = (cx, cy, r) => { const p = []; for (let i = 0; i < 6; i++){ const a = Math.PI / 180 * (60 * i - 30); p.push(cx + r * Math.cos(a), cy + r * Math.sin(a)); } return p; };
const centre = n => [GX + 92 + n.pos[0] * COLW, GY + 70 + n.pos[1] * ROWH + (n.pos[0] % 2 ? 26 : 0)];
/* "next" = all requirements owned; anything else that isn't owned stays hidden */
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
  const cat = S.skillCat || "energy";
  k.rect(l, 0, 0, 1280, 720, "#020609", {a:.7, bg:true});
  k.hit(l, "sk-veil", 0, 0, 1280, 720, () => Screens.closeSkills(), {cursor:false});
  k.hit(l, "sk-box", BX, BY, BW, BH, () => {}, {cursor:false});
  k.rect(l, BX + 4, BY + 10, BW, BH, "#000000", {a:.35, r:16, bg:true});
  k.rect(l, BX, BY, BW, BH, "panel", {r:16, stroke:"line", bg:true});
  /* header */
  k.text(l, `[[network]] ${P.up(t("skillsTitle"))}`, BX + 24, BY + 18, {font:"disp", size:22, iconColor:"accent"});
  let hx = BX + 300;
  W.runs(l, hx, BY + 22, [[`${IC.ep} ${Math.floor(S.ep)}`, {font:"monoB", size:16}], [`  +${P.epGain()}${t("perMo")}`, {font:"mono", size:11, color:"muted"}]]);
  hx += 170;
  W.runs(l, hx, BY + 22, [[`${IC.pc} ${Math.floor(S.pc)}`, {font:"monoB", size:16}], [`  +${P.pcGain()}${t("perMo")}`, {font:"mono", size:11, color:"muted"}]]);
  hx += 160;
  const busy = P.busyIds().length;
  k.text(l, `[[loader]] ${t("inProgress")} ${busy}/${P.MAX_PROJECTS}`, hx, BY + 24, {size:12.5, color:busy >= P.MAX_PROJECTS ? "warn" : "muted", iconColor:"muted"});
  if (P.recentBuys()) k.text(l, `[[chart-line]] ${t("rush")} +${P.recentBuys() * 20}%`, hx + 220, BY + 24, {size:12.5, color:"bad", iconColor:"bad"});
  if (S.buff.instant) k.text(l, `[[lightbulb]] ${t("buffInstant")}`, hx + 220, BY + 44, {size:11.5, color:"good", iconColor:"good"});
  else if (S.buff.disc) k.text(l, `[[flask-round]] ${t("buffDisc")}`, hx + 220, BY + 44, {size:11.5, color:"good", iconColor:"good"});
  k.text(l, `[[pause]] ${t("pausedHere")}`, BX + 24, BY + 50, {size:11, color:"muted", iconColor:"muted"});
  if (P.hasKeyboard()){ W.key(l, BX + BW - 60 - 44, BY + 26, "T"); W.key(l, BX + BW - 60 - 22, BY + 26, "Esc"); }
  W.hbtn(l, "sk-close", BX + BW - 54, BY + 16, "x", () => Screens.closeSkills(), {s:36, is:20, color:"fg"});
  k.line(l, BX, BY + 66, BX + BW, BY + 66, "line");
  /* grid */
  k.rect(l, GX, GY, GW, GH, "bg", {r:12, bg:true, a:.7});
  const nodes = SKILLS.filter(n => n.cat === cat);
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
    const afford = vis && !own && S.ep >= c.ep && S.pc >= c.pc && !P.atCapacity(n);
    if (afford) k.poly(l, hexPts(cx, cy, HEXR + 7), "accent", {a:.18});

    const fill = own ? (n.type === "active" ? "#2c5a7a" : "#1f7a5c") : vis ? "panel2" : "bg";
    k.poly(l, hexPts(cx, cy, HEXR), fill, {stroke:own ? "good" : vis ? (afford ? "accent" : "line") : "line", sw:hov ? 2 : 1.3, a:vis ? 1 : .8});
    if (p !== null){ k.poly(l, hexPts(cx, cy, HEXR - 5), "accent", {a:.12 + .25 * p}); }
    if (sel){ const q = hexPts(cx, cy, HEXR + 5); k.path(l, [...q, q[0], q[1]], "#ffffff", {w:2.5}); }
    const icon = vis ? n.icon : "circle-help";
    k.icon(l, icon, cx - 16, cy - 24, 32, own ? "#ffffff" : vis ? (afford ? "accent" : "fg") : "line", vis ? 1 : .7);
    const lab = vis ? (p !== null ? `${Math.round(p * 100)}%` : own ? (n.type === "active" ? (S.actCd[n.id] ? `${S.actCd[n.id]} ${t("moShort")}` : t("ready")) : "[[check]]") : `${c.ep}·${c.pc}`) : "???";
    k.text(l, lab, cx - HEXR, cy + 12, {font:"mono", size:11, color:own ? "#e8fff6" : vis ? (afford ? "accent" : "muted") : "line", w:HEXR * 2, align:"center", iconColor:"#e8fff6"});
    if (n.type === "active") k.icon(l, "zap", cx + HEXR - 22, cy - HEXR + 8, 13, own ? "gold" : "muted");
    if (n.trade) k.icon(l, "scale", cx - HEXR + 10, cy - HEXR + 8, 13, "warn", vis ? 1 : 0);
    if (n.resp) k.icon(l, "shield", cx - HEXR + 10, cy - HEXR + 8, 13, "sky", vis ? 1 : 0);
    // name under the hex
    k.text(l, vis ? L(n.name) : t("hiddenSkill"), cx - 78, cy + HEXR + 4, {size:11.5, lh:1.25, color:vis ? "fg" : "muted", w:156, align:"center", max:2});
    k.hit(l, id, cx - HEXR, cy - HEXR, HEXR * 2, HEXR * 2 + 34, () => { Audio.play("click"); S.node = n.id; k.dirty(); });
  }
  // rollouts in progress (under the grid)
  let ry = GY + GH + 10;
  if (S.rollouts.length){
    let rx = GX;
    for (const ro of S.rollouts.slice(0, 6)){
      const n = SKILL[ro.id], w = 230;
      k.rect(l, rx, ry, w, 34, "panel2", {r:8, bg:true});
      k.icon(l, n.icon, rx + 8, ry + 9, 16, "accent");
      k.text(l, L(n.name), rx + 30, ry + 3, {size:11, w:w - 40, max:1});
      W.meter(l, rx + 30, ry + 22, w - 90, 4, 1 - ro.left / ro.months, "accent");
      k.text(l, `${ro.left} ${t("moShort")}`, rx + w - 56, ry + 16, {font:"mono", size:10, color:"muted", w:48, align:"right"});
      rx += w + 8; if (rx + w > GX + GW){ break; }
    }
  } else k.text(l, t("noRollouts"), GX, ry + 8, {size:12, color:"muted"});
  /* detail panel */
  this.skillDetail(l, DX, GY, DW, GH + 44);
  /* category tabs */
  const ty = BY + BH - 62, tw = (BW - 48 - 4 * 8) / 5;
  SKILL_CATS.forEach((c, i) => {
    const tx = BX + 24 + i * (tw + 8), on = cat === c.id, id = "cat-" + c.id, hov = k.isHover(l, id);
    const list = SKILLS.filter(n => n.cat === c.id), own = list.filter(n => S.owned[n.id]).length;
    const ready = list.filter(n => !S.owned[n.id] && visible(n) && S.ep >= P.nodeCost(n).ep && S.pc >= P.nodeCost(n).pc && !P.atCapacity(n)).length;
    k.rect(l, tx, ty, tw, 46, on ? "accent" : hov ? "panel2" : "bg", {r:10, stroke:on || hov ? "accent" : "line", bg:true});
    k.icon(l, c.icon, tx + 12, ty + 13, 20, on ? "ink" : "accent");
    k.text(l, L(c.name), tx + 40, ty + 4, {font:"dispS", size:13, color:on ? "ink" : "fg", w:tw - 74, max:1});
    k.text(l, `${own}/${list.length}`, tx + 40, ty + 24, {font:"mono", size:11, color:on ? "ink" : "muted"});
    if (ready){ k.rect(l, tx + tw - 32, ty + 13, 22, 20, on ? "ink" : "good", {r:10}); k.text(l, String(ready), tx + tw - 32, ty + 14, {font:"monoB", size:11, color:on ? "accent" : "#04130c", w:22, align:"center"}); }
    k.hit(l, id, tx, ty, tw, 46, () => { Audio.play("click"); S.skillCat = c.id; const first = SKILLS.find(n => n.cat === c.id && !S.owned[n.id] && visible(n)) || SKILLS.find(n => n.cat === c.id); S.node = first.id; k.dirty(); });
  });
};

Screens.skillDetail = function(l, x, y, w, h){
  const n = SKILL[S.node] && SKILL[S.node].cat === (S.skillCat || "energy") ? SKILL[S.node] : SKILLS.find(q => q.cat === (S.skillCat || "energy"));
  k.rect(l, x, y, w, h, "panel2", {r:12, stroke:"line", bg:true});
  const vis = visible(n), own = !!S.owned[n.id], c = P.nodeCost(n), st = P.nodeState(n);
  const px = x + 18, iw = w - 36; let cy = y + 18;
  k.rect(l, px, cy, 64, 64, own ? "good" : vis ? "accent" : "line", {r:14, a:.16});
  k.icon(l, vis ? n.icon : "circle-help", px + 14, cy + 14, 36, own ? "good" : vis ? "accent" : "muted");
  if (!vis){
    k.text(l, t("hiddenSkill"), px + 80, cy + 8, {font:"dispS", size:20, w:iw - 80});
    const req = n.req.filter(q => !S.owned[q]).map(q => S.owned[q] || visible(SKILL[q]) ? L(SKILL[q].name) : "???");
    k.text(l, `${t("hiddenHint")} ${req.join(", ")}`, px, cy + 84, {size:13, color:"muted", w:iw});
    return;
  }
  const nh = k.text(l, L(n.name), px + 80, cy + 2, {font:"dispS", size:19, w:iw - 80, lh:1.25}).h;
  let tx = px + 80, tyy = cy + Math.max(nh + 6, 34);
  for (const tg of typeTags(n)){ const lab = L(SKILL_TYPE[tg]), kind = tg === "trade" ? "warn" : tg === "active" ? "gold" : tg === "resp" ? "acc" : ""; tx += W.pill(l, tx, tyy, lab, kind) + 5; }
  cy += 80;
  cy += k.text(l, L(n.desc), px, cy, {size:14, w:iw, lh:1.45}).h + 10;
  if (n.resp){
    const list = Object.entries(n.resp).map(([hz, v]) => `[[${HAZARDS[hz].icon}]] ${L(HAZARDS[hz].name)} −${Math.round(v * 100)}%`).join("   ");
    cy += k.text(l, list, px, cy, {size:12, color:"sky", w:iw, iconColor:"sky"}).h + 8;
  }
  const pills = [];
  if (!own){ pills.push({txt:`${IC.ep} ${c.ep}`, kind:S.ep >= c.ep ? "acc" : "bad"}); pills.push({txt:`${IC.pc} ${c.pc}`, kind:S.pc >= c.pc ? "acc" : "bad"}); }
  pills.push({txt:`${t("needs")}: ${n.req.length ? n.req.map(q => L(SKILL[q].name)).join(" + ") : t("none")}`, kind:""});
  if (n.months) pills.push({txt:`${t("rollout")} ${n.months} ${t("months")}`, kind:""});
  if (n.type === "active") pills.push({txt:`${t("cooldownLen")} ${n.cd} ${t("months")}`, kind:"gold"});
  cy += W.pills(l, px, cy, iw, pills) + 14;
  const full = st === "ready" && P.atCapacity(n);
  const can = st === "ready" && !full && S.ep >= c.ep && S.pc >= c.pc;
  if (!own){
    const lab = `[[lock-open]] ${t("unlock")}`;
    W.btn(l, "buy", px, cy, lab, () => { if (P.buyNode(n.id)) Audio.play("buy"); k.dirty(); }, {disabled:!can, sound:false, h:42, size:15, w:iw});
    cy += 48;
    if (full) cy += k.text(l, t("capFull"), px, cy, {size:12, color:"bad", w:iw}).h + 4;
    else if (st === "locked") cy += k.text(l, t("needReq"), px, cy, {size:12, color:"warn", w:iw}).h + 4;
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
