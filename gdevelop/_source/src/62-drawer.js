const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.drawer) return;
(P.mods = P.mods || {}).drawer = 1;
/* =========================================================================
   Screens · right-hand drawer: Region / Country, Stats, News
   (the skill tree has its own full screen, see 65-skills.js)
   The drawer frame is drawn on layer "Drawer"; its content scrolls on "DrawerScroll".
   Tapping the empty map (or Esc) closes it.
   ========================================================================= */
const th3 = () => P.S.lang === "th";
const {Kit, S, t, L, UI, Audio, W, UIM, Screens, ACTIONS, RMETA, RESERVE, IC, COUNTRY, HAZARDS} = P;
const k = Kit;

Screens.renderDrawer = function(l){
  if (this.kind !== "game" || !S.tab){ k.clearSlave("DrawerScroll"); return; }
  const dw = this.drawerWidth(), x = (k.W - 16) - dw, y = 64, h = k.H - 60 - y;   // 3.3: the bottom row is one slim line
  W.panel(l, x, y, dw, h, 10, "panel");
  const titles = {region:S.selC ? "dCountry" : "dRegion", stats:"dStats", news:"dNews"};
  const title = t(titles[S.tab]);
  let tx = x + 14;
  if (S.tab === "region" && S.selC){ W.hbtn(l, "dback", x + 10, y + 7, "arrow-left", () => { Audio.play("click"); S.selC = null; P.Map.focus(S.sel, false); P.changed(); }, {color:"muted"}); tx = x + 48; }
  k.text(l, P.up(title), tx, y + 11, {font:"dispS", size:14});
  W.hbtn(l, "dclose", x + dw - 14 - 30, y + 7, "x", () => Screens.closeTab(), {color:"muted"});
  k.line(l, x, y + 44, x + dw, y + 44, "line");
  const clip = {x:x + 1, y:y + 45, w:dw - 2, h:h - 46};
  const cw = dw - 28;
  k.slave("DrawerScroll", sl => {
    let hh = 0;
    if (S.tab === "region") hh = S.selC ? this.paneCountry(sl, cw) : this.paneRegion(sl, cw);
    else if (S.tab === "stats") hh = this.paneStats(sl, cw);
    else hh = this.paneNews(sl, cw);
    sl.frame(x + 14, clip.y + 12, clip, hh + 24);
  });
  const sl = k.L("DrawerScroll");
  if (sl && sl.content > clip.h){
    const th = Math.max(30, clip.h * clip.h / sl.content), ty = clip.y + (clip.h - th) * (sl.scroll / (sl.content - clip.h));
    k.rect(l, x + dw - 6, ty, 3, th, "line", {r:1.5});
  }
};

/* region switcher (6 buttons) */
/* 2.1.3: the regions as a row of chips with their short names, like the website (RegionButtons, rowscroll); they wrap
   onto a second line instead of scrolling sideways */
const RSHORT = {NA:{th:"อเมริกาเหนือ", en:"N. America"}, EU:{th:"สหภาพยุโรป", en:"EU"}, EA:{th:"เอเชียตะวันออก", en:"East Asia"},
  SA:{th:"อเมริกาใต้", en:"S. America"}, MEAF:{th:"ตะวันออกกลาง-แอฟริกา", en:"Mid-East & Africa"}, SEA:{th:"เอเชียตะวันออกเฉียงใต้", en:"SE Asia"}};
Screens.regionButtons = function(l, y, cw){
  const bh = 30; let bx = 0, by = y;
  S.regions.forEach(x => {
    const on = x.id === S.sel && !S.selC, hov = k.isHover(l, "reg-" + x.id), nm = L(RSHORT[x.id] || RMETA[x.id].name);
    const bw = k.textW(nm, {size:12.5}) + 20 + 17;
    if (bx > 0 && bx + bw > cw){ bx = 0; by += bh + 6; }
    k.rect(l, bx, by, bw, bh, "panel2", {r:6, stroke:on || hov ? "accent" : "line", bg:true});
    k.text(l, nm, bx + 10, by + 6, {size:12.5, color:on ? "accent" : "fg"});
    const c = P.heatRGB(P.regionHeatValue(x)); k.circle(l, bx + bw - 14, by + bh / 2, 4.5, (c[0] << 16) | (c[1] << 8) | c[2]);
    k.hit(l, "reg-" + x.id, bx, by, bw, bh, () => Screens.selectRegion(x.id, true));
    bx += bw + 6;
  });
  return by - y + bh + 12;
};
/* web fxChips: an order's own description cut into short effect chips (so they always match the game data) */
const FX_IC = [[/มิตรภาพ|friendship/i, "$heart"], [/CO₂/, "$co2"], [/ปรับตัว|adaptation|เสียหาย|damage/i, "shield"], [/ทรัพยากร|mineral/i, "gem"],
  [/ทำตามแผน|on-plan/i, "clipboard-check"], [/ความนิยม|approval/i, "$appr"], [/ความเสี่ยงภัย|เปราะบาง|disaster risk|vulnerab/i, "$risk"], [/คว่ำบาตร|sanction/i, "ban"]];
const plainT = s2 => String(s2).replace(/\[\[[^\]]*\]\]\s*/g, "");
function fxChips(desc){
  const txt = plainT(desc).replace(/\s*\([^)]*\)/g, "")
    .replace(/ทรัพยากรที่ประเทศนี้มี/g, "ทรัพยากร").replace(/ภัยในประเทศนี้/g, "ภัย").replace(/มิตรภาพกับประเทศนี้/g, "มิตรภาพ")
    .replace(/this country's minerals/gi, "Minerals").replace(/ with this country/gi, "").replace(/this country's\s*/gi, "").replace(/\s+/g, " ").trim();
  const parts = txt.split(/\s*(?:,|;|และ|\sand\s|\sbut\s)\s*|(?<=[\d%])\s(?=มิตรภาพ|ความนิยม|ทำตามแผน|CO₂)|\s(?=แต่)/i).map(x => x.replace(/^(แต่|but|and)\s+|^แต่/i, "").trim()).filter(Boolean);
  return parts.slice(0, 5).map(x => {
    const bad = /คว่ำบาตร|sanction|ตอบโต้/i.test(x) || (/CO₂/.test(x) ? /\+\d/.test(x) : (/−|-\d/.test(x) && /มิตรภาพ|ทำตามแผน|ความนิยม|friendship|on-plan|approval/i.test(x)));
    const icon = (FX_IC.find(([re]) => re.test(x)) || [0, "sparkles"])[1];
    return {t:x, bad, icon};
  });
}
/* chips in rows; returns the height (draw = false only measures) */
W.fxChips = (l, x, y, w, desc, a = 1, draw = true) => {
  let cx = x, cy = y;
  for (const c of fxChips(desc)){
    const col = c.bad ? "bad" : "good", tw = k.textW(c.t, {size:11.5}), cw2 = 7 + 13 + 3 + tw + 8;
    if (cx > x && cx + cw2 > x + w){ cx = x; cy += 23; }
    if (draw){ k.rect(l, cx, cy, Math.min(cw2, w), 19, col, {r:10, a:.08 * a, stroke:col, sa:.4 * a});
      k.icon(l, c.icon, cx + 7, cy + 3, 13, col, a); k.text(l, c.t, cx + 23, cy + 1, {size:11.5, color:col, a, w:Math.min(tw + 2, w - 30), max:1}); }
    cx += cw2 + 4;
  }
  return cy - y + 19;
};
const statGrid = (l, y, cw, stats) => {
  const sw = (cw - 6) / 2, sh = 52;
  stats.forEach(([a, b, col], i) => {
    const sx = (i % 2) * (sw + 6), sy = y + Math.floor(i / 2) * (sh + 6);
    k.rect(l, sx, sy, sw, sh, "panel2", {r:8, bg:true});
    k.text(l, a, sx + 10, sy + 6, {size:10.5, color:"muted", w:sw - 20, max:1});
    k.text(l, b, sx + 10, sy + 22, {font:"monoB", size:16, color:col || "fg"});
  });
  return Math.ceil(stats.length / 2) * (sh + 6);
};
/* regional orders; scope = "region" | "country" */
const ACT_IC = {fund:"zap", diplo:"globe", adapt:"shield-plus", tariff:"landmark"};
Screens.orderCards = function(l, y, cw, scope){
  const r = P.R(S.sel);
  for (const a of ACTIONS){
    const cc = scope === "country";
    const c = P.actionCost(a, r, cc), cd = r.cd[a.id] || 0, ok = !cd && S.ep >= c.ep && S.pc >= c.pc, al = ok ? 1 : .7;
    const btnW = 96, tx = 2 + 18 + 9, tw = cw - tx - btnW - 9, desc = cc ? L(UI["cact_" + a.id]) : L(a.desc);
    const h1 = k.textH(L(a.name), {font:"dispS", size:13.5, w:tw});
    const h2 = W.fxChips(null, tx, 0, tw, desc, 1, false);
    const tilt = P.tiltOfAction ? P.tiltOfAction(a.id) : null, h3 = tilt && tilt.length ? 20 : 0;
    const ch = Math.max(8 + h1 + 4 + h2 + (h3 ? 4 + h3 : 0) + 8, 52);
    k.icon(l, a.icon || ACT_IC[a.id] || "megaphone", 2, y + ch / 2 - 9, 18, ok ? "accent" : "muted");
    k.text(l, L(a.name), tx, y + 8, {font:"dispS", size:13.5, w:tw, a:al});
    W.fxChips(l, tx, y + 8 + h1 + 4, tw, desc, al);
    if (h3) W.groupTilt(l, tx, y + 8 + h1 + 4 + h2 + 4, tilt, al);
    W.buyBtn(l, "act-" + a.id, cw - btnW, y + (ch - 40) / 2, c, cd, ok, () => P.doAction(a.id, scope));
    k.line(l, 0, y + ch, cw, y + ch, "line", {a:.6});
    y += ch + 1;
  }
  return y;
};
W.buyBtn = (l, id, x, y, cost, cd, ok, fn) => {
  const w = 96, h = 40, hov = ok && !cd && k.isHover(l, id);
  const price = [cost.ep ? `[[$money]]${cost.ep}` : "", cost.pc ? `[[$policy]]${cost.pc}` : "", cost.ore ? `[[$ore]]${cost.ore}` : ""].filter(Boolean).join(" ");
  if (cd){
    k.rect(l, x, y, w, h, "panel2", {r:10, stroke:"line", bg:true});
    k.text(l, `[[clock]] ${th3() ? `รอ ${cd} เดือน` : `${cd} mo`}`, x, y + 11, {size:12, color:"muted", iconColor:"muted", w, align:"center", max:1});
    k.hit(l, id, x, y, w, h, () => {}, {disabled:true});
    return w;
  }
  if (ok){
    k.rect(l, x, y, w, h, hov ? k.mix("#183038", "accent", .3) : "#183038", {r:10, stroke:"accent", sa:.6, bg:true});
    k.text(l, price, x, y + 10, {font:"monoB", size:14, w, align:"center", max:1});
    k.hit(l, id, x, y, w, h, () => { Audio.play("click"); fn(); });
    return w;
  }
  const se = Math.max(0, Math.ceil((cost.ep || 0) - S.ep)), sp = Math.max(0, Math.ceil((cost.pc || 0) - S.pc));
  k.rect(l, x, y, w, h, "panel2", {r:10, stroke:"line", bg:true});
  if (se || sp){
    k.text(l, price, x, y + 3, {font:"monoB", size:13, color:"muted", w, align:"center", max:1});
    k.text(l, `${th3() ? "ขาด" : "Need"} ${se ? `[[$money]]${se}` : ""}${sp ? ` [[$policy]]${sp}` : ""}`, x, y + 21, {size:10.5, color:"bad", w, align:"center", max:1});
  } else k.text(l, price, x, y + 10, {font:"monoB", size:14, color:"muted", w, align:"center", max:1});
  k.hit(l, id, x, y, w, h, () => {}, {disabled:true});
  return w;
};
/* 3.9: an order's effects as short tokens (icon + number); returns the height used */
W.toks = (l, x, y, w, fx, draw = true) => {
  let cx = 0, cy = 0;
  for (const f of fx){
    const txt = `[[${f.ic}]]${f.mat ? " " + L(f.mat) + " " : ""}${f.v}${f.raw ? " [[factory]]" : ""}`, col = f.mat ? "fg" : f.bad ? "bad" : "good";
    const tw = k.textW(txt, {font:"monoB", size:12}) + 12;
    if (cx && cx + tw > w){ cx = 0; cy += 24; }
    if (draw){ k.rect(l, x + cx, y + cy, tw, 21, col, {r:10, a:.13}); k.text(l, txt, x + cx + 5, y + cy + 2, {font:"monoB", size:12, color:col, iconColor:f.raw ? "warn" : col}); }
    cx += tw + 4;
  }
  return fx.length ? cy + 22 : 0;
};
const GOAL_HEX = {good:"#5fd39a", pink:"#ff7aa8", sky:"#8fd0ff", gold:"#f2c14e"};
/* 3.9 (design 5): every order for one country in one list, grouped by what it is for */
Screens.countryOrders = function(l, y, cw, c){
  const r = P.R(c.reg), bw = 96, tx = 18, tw = cw - tx - bw - 10;
  for (const {goal, items} of P.countryOrders()){
    const col = GOAL_HEX[goal.col] || COL_FALLBACK;
    k.icon(l, goal.icon, 0, y + 3, 15, col);
    k.text(l, L(goal.name), 20, y, {font:"dispS", size:13, color:col}); y += 24;
    items.forEach(({kind, a}, i) => {
      const isC = kind === "c", cost = isC ? P.cactCost(a) : P.actionCost(a, r, true), cd = isC ? (c.cd[a.id] || 0) : (r.cd[a.id] || 0);
      const ok = isC ? P.cactOk(a, c) : !cd && S.ep >= cost.ep && S.pc >= cost.pc;
      const fx = P.orderFx(kind, a.id, c) || [], tilt = !isC && P.tiltOfAction ? P.tiltOfAction(a.id) : null;
      const hint = isC && a.id === "ore" && c.rel < 50 ? (th3() ? "ยิ่งมิตรภาพสูงยิ่งได้มาก สูงสุด 20" : "More when friendlier, up to 20") : "";
      const h1 = k.textH(L(a.name), {font:"bodyB", size:13.5, w:tw}), h2 = W.toks(l, 0, 0, tw, fx, false), h3 = tilt && tilt.length ? 20 : 0, h4 = hint ? 16 : 0;
      const rh = Math.max(48, 8 + h1 + 4 + h2 + h3 + h4 + 6);
      if (i) k.line(l, tx - 4, y, cw, y, "line", {a:.6});
      k.rect(l, 6, y + 4, 2, rh - 8, col, {a:.45});
      k.text(l, L(a.name), tx, y + 7, {font:"bodyB", size:13.5, w:tw, a:ok ? 1 : .72});
      let yy = y + 8 + h1 + 4; W.toks(l, tx, yy, tw, fx); yy += h2;
      if (h3){ W.groupTilt(l, tx, yy + 1, tilt); yy += h3; }
      if (hint) k.text(l, hint, tx, yy, {size:10.5, color:"muted", w:tw, max:1});
      const go = isC ? () => { const before = c.rel; P.countryAction(a.id); if (c.rel > before && Audio.play) Audio.play("relUp"); } : () => P.doAction(a.id, "country");
      W.buyBtn(l, (isC ? "ca-" : "act-") + a.id, cw - bw, y + (rh - 40) / 2, cost, cd, ok, go);
      y += rh;
    });
    y += 8;
  }
  return y;
};
const COL_FALLBACK = "#4fd1c5";

/* ---------------- Region ---------------- */
Screens.paneRegion = function(l, cw){
  const meta = RMETA[S.sel], r = P.R(S.sel);
  let y = this.regionButtons(l, 0, cw);
  y += k.text(l, L(meta.name), 0, y, {font:"disp", size:21, w:cw}).h + 4;
  { const B = {font:"monoB", size:12.5, color:"fg"}, M = {size:12.5, color:"muted"};
    const parts = [[`${t("co2Now")} `, M], [`${r.co2.toFixed(2)} Gt`, B], [` · ${t("compliance")} `, M], [`${r.comp.toFixed(0)}%`, B], [` · ${t("vuln")} `, M], [`${r.vuln.toFixed(0)}%`, B]];
    const tot = parts.reduce((a2, [tx, o]) => a2 + k.textW(tx, o), 0);
    if (tot <= cw){ W.runs(l, 0, y, parts); y += 22; }
    else { W.runs(l, 0, y, parts.slice(0, 4)); W.runs(l, 0, y + 19, [[`${t("vuln")} `, M], parts[5]]); y += 41; }
  }
  y += 6;
  // alliance
  const al = S.alli[S.sel];
  if (al){
    const hh = 12 + k.text(l, `[[handshake]] ${t("allyOn")}`, 12, y + 9, {font:"bodyB", size:13, color:"good", w:cw - 24}).h + k.text(l, P.joinNames(al.members), 12, y + 30, {size:12, color:"muted", w:cw - 24}).h + 10;
    W.card(l, 0, y, cw, hh, {stroke:"good", sa:.5}); y += hh + 8;
  } else if (S.owned.D3){
    const n = P.allyCandidates(S.sel).length, ok = P.canAlly(S.sel);
    const lab = `${IC.pc} ${P.ALLY_COST.pc}`, bw = W.btnW(lab);
    const h1 = k.text(l, `[[handshake]] ${t("allyForm")}`, 12, y + 9, {font:"bodyB", size:13, w:cw - bw - 34}).h;
    const h2 = k.text(l, `${t("allyNeed")} (${n}/3)`, 12, y + 9 + h1, {size:12, color:"muted", w:cw - bw - 34}).h;
    const ch = Math.max(56, h1 + h2 + 18);
    W.card(l, 0, y, cw, ch);
    W.btn(l, "ally", cw - 11 - bw, y + (ch - 36) / 2, lab, () => P.formAlliance(S.sel), {disabled:!ok, kind:ok ? "primary" : "ghost", w:bw});
    y += ch + 8;
  }
  // orders for the whole region first, then the countries (like the website)
  W.h3(l, th3() ? `คำสั่งเฉพาะทวีป${L(meta.name)}` : `Orders for the region of ${L(meta.name)}`, 0, y, {w:cw}); y += 24;
  y = this.orderCards(l, y, cw, "region") + 10;
  const list = P.regCountries(S.sel).slice().sort((a, b) => b.co2 - a.co2);
  W.h3(l, `${th3() ? "ประเทศในทวีป" : "Countries"} (${list.length})`, 0, y, {w:cw}); y += 24;
  const tot = r.co2 || 1;
  for (const c of list){
    const id = "cr-" + c.id, hov = k.isHover(l, id), rh = 38;
    k.rect(l, 0, y, cw, rh, hov ? "panel2" : null, {r:7, stroke:hov ? "accent" : "line", sa:hov ? 1 : .5, bg:true});
    k.text(l, c.rest ? P.cname(c.id) : L(COUNTRY[c.id].name), 10, y + 3, {font:"bodyB", size:12.5, w:cw * .5, max:1});
    k.text(l, `${c.co2.toFixed(2)} Gt · ${Math.round(c.co2 / tot * 100)}%`, 10, y + 20, {font:"mono", size:10.5, color:"muted"});
    if (!c.rest){
      W.relBar(l, cw * .56, y + 16, cw * .3, c.rel);
      k.text(l, String(Math.round(c.rel)), cw * .88, y + 10, {font:"monoB", size:11, color:W.relCol(c.rel), w:cw * .1, align:"right"});
      if (S.haz.some(h => h.c === c.id)) k.icon(l, HAZARDS[S.haz.find(h => h.c === c.id).type].icon, cw * .5, y + 11, 14, "bad");
    }
    k.hit(l, id, 0, y, cw, rh, () => Screens.selectCountry(c.id));
    y += rh + 4;
  }
  return y;
};

/* ---------------- Country ---------------- */
Screens.paneCountry = function(l, cw){
  const c = P.C(S.selC); if (!c){ S.selC = null; return 0; }
  const r = P.R(c.reg), meta = c.rest ? null : COUNTRY[c.id];
  /* 3.3 · design C: name + continent, a friendship ring, one line of numbers, then the orders */
  let y = 0;
  const ringW = c.rest ? 0 : 74;
  { const f2 = !c.rest && P.FLAG2 && P.FLAG2[c.id], fo = f2 ? 48 : 0;   // 3.7.5: the country's flag next to its name
    if (f2){ k.sprite(l, "UIFlag", f2, 0, y + 3, 40, 30); k.rect(l, 0, y + 3, 40, 30, null, {r:4, stroke:"#ffffff", sa:.2}); }
    y += Math.max(f2 ? 36 : 0, k.text(l, P.cname(c.id), fo, y + (f2 ? 4 : 0), {font:"dispS", size:19, w:cw - ringW - fo}).h); }
  y += k.text(l, L(RMETA[c.reg].name) + (S.alli[c.reg] && S.alli[c.reg].members.includes(c.id) ? ` · [[handshake]] ${t("allyMember")}` : ""), 0, y, {size:12, color:"muted", w:cw - ringW, iconColor:"good"}).h + 6;
  if (!c.rest){
    const rc = W.relCol(c.rel), cx = cw - 34, cy = 32, R = 30, fr = (c.rel + 100) / 200;
    k.circle(l, cx, cy, R, "panel2");
    for (let i = 0; i < 48; i++){ if (i / 48 > fr) break; const a = -Math.PI / 2 + i / 48 * Math.PI * 2; k.circle(l, cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4), 3.2, rc); }
    k.circle(l, cx, cy, R - 9, "panel");
    k.text(l, `${c.rel >= 0 ? "+" : ""}${Math.round(c.rel)}`, cx - 24, cy - 13, {font:"monoB", size:15, w:48, align:"center", color:rc});
    k.text(l, t("relation"), cx - 26, cy + 5, {size:9, w:52, align:"center", color:"muted", max:1});
  }
  /* 3.9 (design A1): CO₂ in Gt as the big number, the three numbers that matter, then the minerals (raw ones say so) */
  { const lab = th3() ? "CO₂ ต่อปี" : "CO₂ a year", lw = k.textW(lab, {font:"monoB", size:12}), v = P.fmtGt ? P.fmtGt(c.co2) : c.co2.toFixed(2);
    k.text(l, lab, 0, y + 12, {font:"monoB", size:12, color:"muted"});
    const vw = k.text(l, v, lw + 8, y, {font:"monoB", size:26}).w;
    k.text(l, "Gt", lw + 12 + vw, y + 11, {font:"monoB", size:13, color:"muted"});
    y += 40; }
  y = Math.max(y, c.rest ? y : 70);
  if (!c.rest){
    const bw = (cw - 12) / 3, rc = meta.risk >= 60 ? "bad" : meta.risk >= 35 ? "warn" : "good";
    [[`[[triangle-alert]] ${meta.risk}%`, rc, t("risk")], [`[[shield]] ${Math.round(c.adapt)}`, "sky", th3() ? "ป้องกันภัย" : "Protection"], [`[[leaf]] ${Math.round(c.green || 0)}%`, "good", t("greenTech")]].forEach(([v, col, lab], i) => {
      const bx = i * (bw + 6); k.rect(l, bx, y, bw, 46, "panel2", {r:9, stroke:"line", bg:true});
      k.text(l, v, bx + 8, y + 4, {font:"monoB", size:15, color:col, iconColor:col, w:bw - 12, max:1});
      k.text(l, lab, bx + 8, y + 25, {size:11, color:"muted", w:bw - 12, max:1});
    });
    y += 52;
    const mins = P.countryMinerals ? P.countryMinerals(c) : [];
    if (mins.length){
      const cols = Math.min(3, mins.length), mh = 26;
      for (let i = 0; i < mins.length; i += cols){
        const row = mins.slice(i, i + cols), mw = (cw - (row.length - 1) * 6) / row.length;
        row.forEach((m, j) => {
          const mx = j * (mw + 6);
          k.rect(l, mx, y, mw, mh, "panel2", {r:13, stroke:m.raw ? "warn" : "line", sa:m.raw ? .55 : 1, bg:true});
          k.icon(l, m.icon, mx + 5, y + 4, 18);
          const rw = m.raw ? k.textW(`[[factory]] ${th3() ? "ต้องแปรรูป" : "refine"}`, {font:"bodyB", size:11}) + 8 : 0;
          k.text(l, m.name, mx + 27, y + 4, {size:12, color:m.raw ? "fg" : "muted", w:mw - 32 - rw, max:1});
          if (m.raw) k.text(l, `[[factory]] ${th3() ? "ต้องแปรรูป" : "refine"}`, mx + mw - rw - 2, y + 5, {font:"bodyB", size:11, color:"warn", iconColor:"warn"});
        });
        y += mh + 6;
      }
    }
    y += 4;
  } else y += 4;
  if (this.countryWarn) y += this.countryWarn(l, y, cw, c);
  if (!c.rest && c.rel < 40){   // the next goal: friendship 40 opens a bilateral agreement
    const gh = 30; k.rect(l, 0, y, cw, gh, "accent", {r:9, a:.08, stroke:"accent", sa:.4});
    k.text(l, `[[target]] ${th3() ? `เป้าหมายถัดไป: มิตรภาพ 40 เพื่อปลดล็อก${t("bilatTitle")}` : `Next goal: friendship 40 unlocks ${t("bilatTitle")}`}`, 10, y + 6, {size:12, color:"accent", iconColor:"accent", w:cw - 20, max:1});
    y += gh + 8;
  }
  const hz = S.haz.find(h => h.c === c.id);
  if (hz){
    const Z = HAZARDS[hz.type], left = Math.max(0, hz.at - S.tick);
    const lab = hz.evac ? `[[check]] ${t("evacuated")}` : `${t("evacuate")} · ${IC.ep} ${P.evacCost()}`;
    const bw = W.btnW(lab);
    const h1 = k.text(l, `[[${Z.icon}]] ${t("forecast")}: ${L(Z.name)} · ${left} ${t("months")}`, 12, y + 10, {font:"bodyB", size:13, color:"bad", w:cw - bw - 34, iconColor:"bad"}).h;
    const ch = Math.max(56, h1 + 22);
    W.card(l, 0, y, cw, ch, {stroke:"bad", sa:.6});
    W.btn(l, "evac", cw - 11 - bw, y + (ch - 36) / 2, lab, () => P.evacuate(hz.id), {disabled:hz.evac || S.ep < P.evacCost(), kind:hz.evac ? "ghost" : "danger", w:bw});
    y += ch + 8;
  }
  if (!c.rest){
    y = this.countryOrders(l, y, cw, c);
    // bilateral agreement (3.3: only once friendship reaches 40; the goal line above says how far)
    if (c.rel >= 40){
    y += 4;
    W.h3(l, t("bilatTitle"), 0, y, {w:cw}); y += 20;
    y += k.text(l, `${t("bilatDesc")} · ${IC.ep} ${P.BILAT_COST.ep} ${IC.pc} ${P.BILAT_COST.pc}`, 0, y, {size:12, color:"muted", w:cw}).h + 6;
    {
      const ps = P.bilatPartners().sort((a, b) => b.rel - a.rel).slice(0, 12);
      if (!ps.length) y += k.text(l, t("bilatNone"), 0, y, {size:12, color:"muted", w:cw}).h + 8;
      let cx = 0, rowY = y; const afford = S.ep >= P.BILAT_COST.ep && S.pc >= P.BILAT_COST.pc;
      for (const p of ps){
        const nm = L(COUNTRY[p.id].name), w = k.textW(nm, {size:12}) + 26, id = "bl-" + p.id, hov = afford && k.isHover(l, id);
        if (cx + w > cw){ cx = 0; rowY += 30; }
        k.rect(l, cx, rowY, w, 26, hov ? "accent" : null, {r:13, stroke:afford ? "accent" : "line", a:hov ? .2 : 1, bg:true});
        k.circle(l, cx + 10, rowY + 13, 3.5, W.relCol(p.rel));
        k.text(l, nm, cx + 18, rowY + 4, {size:12, color:afford ? "fg" : "muted"});
        k.hit(l, id, cx, rowY, w, 26, () => P.bilateral(p.id), {disabled:!afford});
        cx += w + 6;
      }
      if (ps.length) y = rowY + 36;
    }
    }
  }
  if (c.rest){
    y += 6;
    W.h3(l, th3() ? `คำสั่งเฉพาะทวีป${L(RMETA[c.reg].name)}` : `Orders for ${L(RMETA[c.reg].name)}`, 0, y, {w:cw}); y += 22;
    y = this.orderCards(l, y, cw, "region");
  }
  return this.countryExtras ? y + this.countryExtras(l, y, cw, c) : y;
};

/* ---------------- Stats ---------------- */
/* 3.7.6 · statistics, design 2 (same as the website): one story to scroll down, no tabs — the year in one line ·
   four numbers · CO₂ chart · what cut CO₂ · where money came from and went · where our minerals came from ·
   "more details" folds the old tabs (money in full, people, temperature, regions, top emitters) */
Screens.paneStats = function(l, cw){
  let y = 0;
  const th = S.lang === "th", g = P.grossCO2() || 1;
  if (S.report && !S.report.read) y += this.reportCard(l, 0, y, cw) + 12;
  { const h = S.hist, a0 = h.length > 12 ? h[h.length - 13].net : (h[0] ? h[0].net : P.netCO2()), d = P.netCO2() - a0;
    const friends = S.countries.filter(c => !c.rest && c.rel >= 40).length, raw = P.MAT_IDS ? P.MAT_IDS.reduce((s2, m) => s2 + (P.rawFor ? P.rawFor(m) : 0), 0) : 0;
    const head = th ? `CO₂ ${d <= 0 ? "ลดลง" : "เพิ่มขึ้น"} ${Math.abs(d).toFixed(1)} Gt ในรอบ 12 เดือน · ความนิยม ${Math.round(S.appr)}%` : `CO₂ ${d <= 0 ? "fell" : "rose"} ${Math.abs(d).toFixed(1)} Gt in 12 months · approval ${Math.round(S.appr)}%`;
    const tips = [];
    if (d > 0) tips.push(th ? "ปลดล็อกสกิลพลังงานสะอาดเพิ่ม" : "unlock more clean-energy skills");
    if (friends < 3) tips.push(th ? "ทำข้อตกลงกับมิตรอีกสักประเทศ" : "make a deal with one more friend");
    if (S.appr < 50) tips.push(th ? "ดูแลความนิยมก่อนออกนโยบายแรง ๆ" : "win back approval before tough policies");
    if (raw > 12) tips.push(th ? "ขยายโรงแปรรูป แร่ดิบค้างเยอะ" : "grow the refinery, raw minerals are piling up");
    const tip = tips.length ? (th ? "ลอง: " : "Try: ") + tips.slice(0, 2).join(" · ") : "";
    const hh = 30 + k.textH(head, {font:"dispS", size:15, w:cw - 24}) + (tip ? k.textH(tip, {size:12.5, w:cw - 24}) + 4 : 0) + 12;
    W.card(l, 0, y, cw, hh, {r:12, stroke:"accent", sa:.45, fill:"panel2"});
    k.text(l, th ? `ปี ${2026 + Math.floor(S.tick / 12)} ในประโยคเดียว` : `${2026 + Math.floor(S.tick / 12)} in one line`, 12, y + 10, {font:"dispS", size:12, color:"accent"});
    const ty = y + 30 + k.text(l, head, 12, y + 28, {font:"dispS", size:15, w:cw - 24}).h + 2;
    if (tip) k.text(l, tip, 12, ty, {size:12.5, color:"muted", w:cw - 24});
    y += hh + 8; }
  { const friends = S.countries.filter(c => !c.rest && c.rel >= 40).length, net = P.netCO2(), qw = (cw - 18) / 4;
    [["$co2", net.toFixed(1), "Gt CO₂", net > 20 ? "bad" : net > 8 ? "warn" : "good"], ["$temp", `+${S.temp.toFixed(2)}`, th ? "°C โลก" : "°C warming", S.temp >= 2 ? "bad" : S.temp >= 1.5 ? "warn" : "good"],
     ["$appr", `${Math.round(S.appr)}%`, th ? "ความนิยม" : "approval", S.appr < 35 ? "bad" : "good"], ["$heart", String(friends), th ? "ประเทศมิตร" : "friends", "accent"]].forEach(([ic, v, lab, c], i) => {
      const x = i * (qw + 6); k.rect(l, x, y, qw, 66, "panel2", {r:10, bg:true});
      k.icon(l, ic, x + qw / 2 - 9, y + 6, 18); k.text(l, v, x, y + 25, {font:"monoB", size:14, color:c, w:qw, align:"center", max:1}); k.text(l, lab, x, y + 45, {size:11, color:"muted", w:qw, align:"center", max:1});
    });
    y += 76; }
  W.h3(l, t("chartCo2"), 0, y, {w:cw, size:11.5}); y += 18;
  k.line(l, 0, y + 8, 18, y + 8, "hot", {w:2}); k.text(l, th ? "โลกของคุณ" : "Your world", 22, y, {size:11, color:"muted"});
  { const lx = 30 + k.textW(th ? "โลกของคุณ" : "Your world", {size:11}); k.line(l, lx, y + 8, lx + 18, y + 8, "muted", {dash:3}); k.text(l, th ? "ถ้าไม่ทำอะไรเลย" : "If nothing was done", lx + 22, y, {size:11, color:"muted"}); }
  y += 20;
  this.lineChart(l, 0, y, cw, 150, S.hist.map(h => h.net), {min:-5, max:60, ticks:[0, 15, 30, 45, 60], color:"hot", refs:[{v:0, c:"good"}], data2:S.bau ? S.bau.hist : null}); y += 150 + 8;
  k.rect(l, 0, y, cw, 10, "panel2", {r:3});
  { const sw = cw / (Math.max(P.TOTAL_TICKS, S.hist.length - 1) + 1); S.hist.forEach((h, i) => k.rect(l, i * sw, y, sw + 0.4, 10, tempColor(h.temp))); }
  y += 20;
  y += this.impactBox(l, cw, y);
  if (P.ledgerSum){
    const d = P.ledgerSum("year", "ep"), COLS = ["#5fd39a", "#8fd0ff", "#4fd1c5", "#c3a6ff"], top = d.inc.slice(0, 4), big = d.out[0], nm = x => L((P.LEDGER_CATS[x.cat] || P.LEDGER_CATS.other).t);
    W.h3(l, th ? "เงินมาจากไหน ไปไหน (ปีนี้)" : "Where money came from and went (this year)", 0, y, {w:cw, size:11.5}); y += 22;
    k.text(l, `${th ? "เข้า" : "In"} +${d.tIn.toLocaleString()}`, 0, y, {font:"monoB", size:13, color:"good"});
    k.text(l, `${th ? "ออก" : "Out"} −${d.tOut.toLocaleString()}`, 0, y, {font:"monoB", size:13, color:"bad", w:cw, align:"right"}); y += 22;
    const parts = [...top.map((x, i) => [x.v, COLS[i]]), ...(d.inc.length > 4 ? [[d.inc.slice(4).reduce((s2, x) => s2 + x.v, 0), "#36606b"]] : []), ...(d.tOut ? [[d.tOut, "#ff6b5c"]] : [])], tot = parts.reduce((s2, q) => s2 + q[0], 0) || 1;
    k.rect(l, 0, y, cw, 12, "panel2", {r:6}); let bx = 0;
    for (const [v, c] of parts){ const bw = Math.max(3, v / tot * (cw - parts.length * 2)); k.rect(l, bx, y, bw, 12, c, {r:3}); bx += bw + 2; }
    y += 18;
    y += k.text(l, top.map(x => `${nm(x)} ${Math.round(x.v / (d.tIn || 1) * 100)}%`).join(" · ") + (big ? ` · ${th ? "รายจ่ายใหญ่สุด" : "biggest cost"}: ${nm(big)}` : ""), 0, y, {size:11.5, color:"muted", w:cw}).h + 14;
  }
  if (S.oreOn && P.matTop){
    W.h3(l, th ? "ทรัพยากรได้มาจากประเทศไหน (ทั้งเกม)" : "Where our minerals came from (whole game)", 0, y, {w:cw, size:11.5}); y += 22;
    const list = P.matTop(null, 6);
    if (!list.length) y += k.text(l, th ? "ยังไม่ได้รับทรัพยากรจากประเทศไหน" : "No minerals received yet", 0, y, {size:12, color:"muted"}).h + 8;
    for (const x of list){
      const id = x.id, isC = id.length === 3, nm = id === "home" ? (th ? "เหมืองในประเทศ" : "Our own mines") : id === "MKT" ? (th ? "ซื้อจากตลาด" : "Bought on the market") : P.cname(id), rh = 50, hid = "mf-" + id, hov = isC && k.isHover(l, hid);
      W.card(l, 0, y, cw, rh, {r:10, fill:"panel2", stroke:hov ? "accent" : "line"});
      if (isC && P.FLAG2 && P.FLAG2[id]) k.sprite(l, "UIFlag", P.FLAG2[id], 10, y + 14, 28, 21);
      else k.icon(l, id === "MKT" ? "store" : "pickaxe", 16, y + 16, 16, id === "MKT" ? "gold" : "muted");
      k.text(l, nm, 48, y + 6, {font:"bodyB", size:13, w:cw - 110, max:1});
      let gx = 48; for (const m of P.MAT_IDS){ const v = x.by[m] || 0; if (v < .5) continue; k.icon(l, P.MAT[m].icon, gx, y + 28, 14); const tw = k.text(l, String(Math.round(v)), gx + 16, y + 27, {font:"mono", size:11}).w; gx += 16 + tw + 10; }
      k.text(l, String(Math.round(x.n)), cw - 60, y + 14, {font:"monoB", size:16, w:50, align:"right"});
      if (isC) k.hit(l, hid, 0, y, cw, rh, () => { Audio.play("click"); Screens.selectCountry(id); });
      y += rh + 6;
    }
    y += 6;
  }
  { const open = !!S.stMore, lab = `[[chevron-${open ? "up" : "down"}]] ${th ? "ดูรายละเอียดเพิ่ม: เงิน · ประชาชน · โลก · อุณหภูมิ" : "More: money · people · world · temperature"}`;
    k.rect(l, 0, y, cw, 1, "line"); y += 8;
    const lh = k.text(l, lab, 0, y + 4, {size:13, color:"accent", iconColor:"accent", w:cw}).h;
    k.hit(l, "st-more", 0, y, cw, lh + 8, () => { Audio.play("click"); S.stMore = !open; P.changed(); });
    y += lh + 16;
    if (open){
      W.h3(l, th ? "การเงิน" : "Money", 0, y, {w:cw, size:11.5}); y += 22;
      y += this.moneyBox(l, cw, y);
      if (S.groups){ W.h3(l, th ? "ประชาชน" : "People", 0, y, {w:cw, size:11.5}); y += 22; }
    if (S.groups){
      const ST = {back:["good", th ? "สนับสนุน" : "Backing you"], ok:["fg", th ? "เฉยๆ" : "Neutral"], low:["warn", th ? "เริ่มไม่พอใจ" : "Unhappy"], angry:["bad", th ? "ไม่พอใจมาก" : "Very angry"]};
      for (const G of P.GROUPS){
        const v = S.groups[G.id], st = P.groupState(G.id), [c, lab] = ST[st], rh = 52;
        W.card(l, 0, y, cw, rh, {r:10, stroke:st === "angry" ? "bad" : st === "back" ? "good" : "line"});
        k.icon(l, G.icon, 12, y + 9, 16, G.color);
        k.text(l, L(G.name), 34, y + 7, {font:"bodyB", size:13, w:cw - 160, max:1});
        k.text(l, lab, cw - 120, y + 8, {size:11.5, color:c, w:66, align:"right", max:1});
        k.text(l, `${v.toFixed(0)}%`, cw - 50, y + 6, {font:"monoB", size:13, w:40, align:"right"});
        const bx = 12, bw = cw - 24, by = y + 34;
        k.rect(l, bx, by, bw, 8, "panel", {r:4});
        k.rect(l, bx, by, bw * v / 100, 8, G.color, {r:4});
        k.rect(l, bx + bw * P.GROUP_ANGRY / 100, by - 2, 1.5, 12, "bad");
        k.rect(l, bx + bw * P.GROUP_BACK / 100, by - 2, 1.5, 12, "good");
        k.hit(l, "grp-" + G.id, 0, y, cw, rh, () => { Audio.play("open"); Screens.openWin("politics"); });
        y += rh + 6;
      }
      y += k.text(l, th ? "แตะเพื่อดูว่าแต่ละกลุ่มชอบและไม่ชอบอะไร" : "Tap to see what each group likes and hates", 0, y, {size:11.5, color:"muted", w:cw}).h + 6;
    }
      W.h3(l, t("chartTemp"), 0, y, {w:cw, size:11.5}); y += 20;
      this.lineChart(l, 0, y, cw, 150, S.hist.map(h => h.temp), {min:1.0, max:3.0, ticks:[1.0, 1.5, 2.0, 2.5, 3.0], color:"accent", refs:[{v:1.5, c:"warn"}, {v:2.0, c:"bad"}]}); y += 150 + 14;
    W.h3(l, t("shares"), 0, y, {w:cw, size:11.5}); y += 22;
    for (const r of S.regions){
      k.text(l, L(P.RMETA[r.id].name), 0, y, {size:12, w:120, max:1});
      W.meter(l, 124, y + 6, cw - 124 - 64, 8, r.co2 / g, "hot");
      k.text(l, r.co2.toFixed(2), cw - 56, y, {font:"mono", size:12, w:56, align:"right"});
      y += 24;
    }
    y += 8; W.h3(l, t("topEmitters"), 0, y, {w:cw, size:11.5}); y += 22;
    for (const c of S.countries.filter(x => !x.rest).sort((a, b) => b.co2 - a.co2).slice(0, 8)){
      k.text(l, L(COUNTRY[c.id].name), 0, y, {size:12, w:120, max:1});
      W.meter(l, 124, y + 6, cw - 124 - 64, 8, c.co2 / g, "warn");
      k.text(l, c.co2.toFixed(2), cw - 56, y, {font:"mono", size:12, w:56, align:"right"});
      y += 24;
    }
      y += 8; k.text(l, `[[timer]] ${P.fmtTime(S.realSec)}`, 0, y, {font:"mono", size:12, color:"muted", iconColor:"muted"}); y += 22;
    }
  }
  return y;
};
/* a row of chips that wraps (filters, tabs inside the panel) */
function chipRow(l, x, y, w, items, o = {}){
  const size = o.size || 12, h = 28; let cx = x, cy = y;
  for (const it of items){
    const iw = Math.ceil(k.textW(it.label, {size, font:"bodyB"})) + 22, hov = k.isHover(l, it.id);
    if (cx + iw > x + w && cx > x){ cx = x; cy += h + 6; }
    k.rect(l, cx, cy, iw, h, it.on ? "accent" : hov ? "panel2" : null, {r:14, stroke:it.on || hov ? "accent" : "line", bg:true});
    k.text(l, it.label, cx + 11, cy + (h - size * 1.45) / 2, {font:"bodyB", size, color:it.on ? "ink" : "fg", iconColor:it.on ? "ink" : "accent"});
    k.hit(l, it.id, cx, cy, iw, h, () => { Audio.play("click"); it.fn(); });
    cx += iw + 6;
  }
  return cy + h - y;
}
/* phase 5: what the player's work changed (CO₂ saved compared with doing nothing, where the cuts came from, timeline) */
Screens.impactBox = function(l, cw, y0){
  if (!P.impactSummary) return 0;
  const im = P.impactSummary(), th = S.lang === "th", tl = (S.tl || []).slice(-12).reverse();
  let y = y0;
  const sub = th ? `ถ้าไม่ทำอะไรเลย ตอนนี้โลกจะปล่อย ${im.bau.toFixed(1)} Gt/ปี และร้อนขึ้นถึง +${im.bauTemp.toFixed(2)}°C (ตอนนี้ +${S.temp.toFixed(2)}°C)` : `Doing nothing, the world would now emit ${im.bau.toFixed(1)} Gt/yr and be +${im.bauTemp.toFixed(2)}°C warmer (now +${S.temp.toFixed(2)}°C)`;
  const sh = k.textH(sub, {size:11.5, w:cw - 24}), ch = 22 + 34 + sh + 12;
  W.card(l, 0, y, cw, ch, {r:12, stroke:"good", sa:.5});
  k.text(l, th ? "CO₂ ที่คุณช่วยลดได้ (เทียบกับถ้าไม่ทำอะไรเลย)" : "CO₂ you prevented (compared with doing nothing)", 12, y + 8, {size:11.5, color:"muted", w:cw - 24, max:1});
  W.runs(l, 12, y + 26, [[`−${im.saved.toFixed(1)} `, {font:"monoB", size:24, color:"good", lh:1.2}], [`Gt/${th ? "ปี" : "yr"}`, {font:"mono", size:12, color:"good"}]]);
  k.text(l, sub, 12, y + 60, {size:11.5, color:"muted", w:cw - 24});
  y += ch + 12;
  W.h3(l, th ? "ส่วนที่ช่วยลด CO₂" : "Where the cuts came from", 0, y, {w:cw, size:11.5}); y += 20;
  for (const x of im.parts){
    k.text(l, `[[${x.icon}]] ${L(x.t)}`, 0, y, {size:12, w:150, max:1, iconColor:x.col});
    W.meter(l, 156, y + 6, cw - 156 - 44, 8, im.total ? x.v / im.total : 0, x.col);
    k.text(l, `${im.total ? Math.round(x.v / im.total * 100) : 0}%`, cw - 40, y, {font:"mono", size:12, w:40, align:"right"});
    y += 24;
  }
  if (tl.length){
    y += 6; W.h3(l, th ? "ไทม์ไลน์" : "Timeline", 0, y, {w:cw, size:11.5}); y += 20;
    for (const e of tl){ const x = P.timelineText(e); if (!x.txt) continue; k.text(l, P.dateStr(e.tk), 0, y + 1, {font:"mono", size:11, color:"muted", w:74, max:1}); y += k.text(l, `[[${x.icon}]] ${x.txt}`, 78, y, {size:12, w:cw - 78, iconColor:x.col}).h + 4; }
  }
  return y - y0 + 10;
};
/* 1.6: where money (or policy points) came from and went */
Screens.moneyBox = function(l, cw, y0){
  if (!P.ledgerSum) return 0;
  const th = S.lang === "th", per = S.mnPer || "year", cur = S.mnCur || "ep", d = P.ledgerSum(per, cur);
  const max = Math.max(1, ...d.inc.map(x => x.v), ...d.out.map(x => x.v)), net = d.tIn - d.tOut, ic = cur === "ep" ? "$money" : "$policy";
  let y = y0;
  const segW = W.seg(l, 0, y, [["year", th ? "ปีนี้" : "This year"], ["last", th ? "ปีที่แล้ว" : "Last year"], ["all", th ? "ทั้งเกม" : "Whole game"]].map(([v, lab]) => ({id:"mp-" + v, label:lab, on:per === v, fn:() => { Audio.play("click"); S.mnPer = v; P.changed(); }})), {w:76, h:28, font:"body", fontOn:"bodyB", size:11.5});
  W.seg(l, cw - 72, y, [{id:"mc-ep", label:"[[$money]]", on:cur === "ep", fn:() => { Audio.play("click"); S.mnCur = "ep"; P.changed(); }}, {id:"mc-pc", label:"[[$policy]]", on:cur === "pc", fn:() => { Audio.play("click"); S.mnCur = "pc"; P.changed(); }}], {w:36, h:28, size:13});
  y += 38;
  const third = (cw - 12) / 3;
  [[th ? "ได้" : "In", `+${d.tIn.toLocaleString()}`, "good"], [th ? "ใช้" : "Out", `−${d.tOut.toLocaleString()}`, "bad"], [th ? "สุทธิ" : "Net", `[[${ic}]]${net >= 0 ? "+" : "−"}${Math.abs(net).toLocaleString()}`, net >= 0 ? "good" : "bad"]].forEach(([lab, v, c], i) => {
    const x = i * (third + 6);
    W.card(l, x, y, third, 50, {r:10});
    k.text(l, lab, x + 10, y + 5, {size:11, color:"muted"});
    k.text(l, v, x + 10, y + 22, {font:"monoB", size:15, color:c, w:third - 16, max:1});
  });
  y += 62;
  const rows = (list, kind) => {
    if (!list.length){ k.text(l, "—", 0, y, {size:12, color:"muted"}); y += 22; return; }
    for (const x of list){
      const C = P.LEDGER_CATS[x.cat] || P.LEDGER_CATS.other;
      k.icon(l, C.icon, 0, y + 1, 16, kind === "in" ? "good" : "bad");
      k.text(l, L(C.t), 24, y, {size:12, w:cw - 24 - 70, max:1});
      k.text(l, `${kind === "in" ? "+" : "−"}${x.v.toLocaleString()}`, cw - 70, y, {font:"mono", size:12, w:70, align:"right"});
      k.rect(l, 24, y + 20, cw - 24, 4, "panel", {r:2});
      k.rect(l, 24, y + 20, (cw - 24) * x.v / max, 4, kind === "in" ? "good" : "bad", {r:2});
      y += 32;
    }
  };
  W.h3(l, th ? "ได้มาจาก" : "Came from", 0, y, {w:cw, size:11.5}); y += 20; rows(d.inc, "in");
  y += 4; W.h3(l, th ? "ใช้ไปกับ" : "Spent on", 0, y, {w:cw, size:11.5}); y += 20; rows(d.out, "out");
  return y - y0;
};
/* 1.1: the yearly report, waiting in the statistics panel every January */
Screens.reportCard = function(l, x, y0, cw){
  const r = S.report; if (!r) return 0;
  const th = S.lang === "th", arrow = v => (v <= 0 ? "▼" : "▲");
  const tips = [];
  if (r.nAngry) tips.push(`[[angry]] ${t("rpAngry").replace("{N}", r.nAngry)} ${P.joinNames(r.angry)}`);
  if (r.sanct.length) tips.push(`[[ban]] ${t("rpSanct")} ${P.joinNames(r.sanct)}`);
  tips.push(`[[map]] ${t("rpLag")} ${L(P.RMETA[r.lag].name)}`);
  if (r.appr < 35) tips.push(`[[$appr]] ${t("rpAppr")}`);
  if (r.friends < 10) tips.push(`[[handshake]] ${t("rpFriends").replace("{N}", r.friends)}`);
  const cells = [[t("co2"), `${r.net.toFixed(1)} Gt ${arrow(r.dNet)}${Math.abs(r.dNet).toFixed(1)}`, r.dNet <= 0 ? "good" : "bad"], [t("temp"), `+${r.temp.toFixed(2)}°C ${arrow(-r.dTemp)}`, r.temp >= 2 ? "bad" : r.temp >= 1.5 ? "warn" : "good"],
                 [t("appr"), `${r.appr.toFixed(0)}%`, r.appr < 35 ? "bad" : "good"], [th ? "ประเทศที่เป็นมิตร (40+)" : "Friendly (40+)", String(r.friends), "fg"]];
  const tipH = tips.reduce((s, tp) => s + k.textH(tp, {size:12, w:cw - 24}) + 4, 0), h = 36 + 2 * 46 + tipH + 52;
  W.card(l, x, y0, cw, h, {r:12, stroke:"accent", sa:.7});
  let y = y0 + 10;
  k.text(l, `[[chart-line]] ${t("rpTitle")} ${r.y}`, x + 12, y, {font:"dispS", size:15, iconColor:"accent"});
  k.text(l, "NEW", x + cw - 52, y + 2, {font:"monoB", size:11, color:"ink"}); k.rect(l, x + cw - 58, y, 44, 20, "warn", {r:10, under:true});
  y += 28;
  const half = (cw - 30) / 2;
  cells.forEach(([lab, v, c], i) => {
    const cx = x + 12 + (i % 2) * (half + 6), cy = y + Math.floor(i / 2) * 46;
    k.text(l, lab, cx, cy, {size:11, color:"muted", w:half, max:1, iconColor:"muted"});
    k.text(l, v, cx, cy + 17, {font:"monoB", size:14, color:c, w:half, max:1});
  });
  y += 2 * 46;
  for (const tp of tips) y += k.text(l, tp, x + 12, y, {size:12, w:cw - 24, color:"muted", iconColor:"muted"}).h + 4;
  y += 6;
  W.btn(l, "rp-read", x + 12, y, `[[check]] ${t("rpRead")} · ${IC.pc} +${r.reward}`, () => { P.readReport(); Audio.play("coin"); k.dirty(); }, {size:13, h:34, sound:false});
  return h;
};
const STRIPE = ["#08306b","#2171b5","#6baed6","#c6dbef","#fee0d2","#fc9272","#ef3b2c","#a50f15","#67000d"];
function tempColor(v){
  const x = P.clamp((v - 0.9) / (2.7 - 0.9), 0, 1) * (STRIPE.length - 1), i = Math.floor(x), f = x - i;
  return k.mix(STRIPE[i], STRIPE[Math.min(i + 1, STRIPE.length - 1)], f);
}
Screens.lineChart = function(l, x, y, w, hgt, data, o){
  k.rect(l, x, y, w, hgt, "bg", {r:8, bg:true});
  const pad = {l:34, r:10, t:10, b:20}, Wd = w - pad.l - pad.r, Hd = hgt - pad.t - pad.b, lo = o.min, hi = o.max;
  const span = Math.max(P.TOTAL_TICKS, data.length - 1, ((o.data2 || []).length) - 1), sx = i => x + pad.l + i / span * Wd, sy = v => y + pad.t + (1 - (P.clamp(v, lo, hi) - lo) / (hi - lo)) * Hd;
  o.ticks.forEach(v => { const yy = sy(v); k.line(l, x + pad.l, yy, x + w - pad.r, yy, "line"); k.text(l, String(v), x + 3, yy - 8, {font:"mono", size:10, color:"muted"}); });
  [2026, 2034, 2042, 2050].forEach(yr => k.text(l, String(yr), sx((yr - 2026) * 12) - 12, y + hgt - 17, {font:"mono", size:10, color:"muted"}));
  (o.refs || []).forEach(rf => k.line(l, x + pad.l, sy(rf.v), x + w - pad.r, sy(rf.v), rf.c, {dash:4}));
  if (data.length < 2) return;
  const base = sy(Math.max(lo, 0)), pts = [];
  data.forEach((v, i) => pts.push(sx(i), sy(v)));
  k.poly(l, [...pts, sx(data.length - 1), base, sx(0), base], o.color, {a:.15});
  k.path(l, pts, o.color, {w:2});
  const li = data.length - 1; k.circle(l, sx(li), sy(data[li]), 4, o.color);
  if (o.data2 && o.data2.length > 1){ for (let i = 3; i < o.data2.length; i += 3){ if ((i / 3) % 2) k.line(l, sx(i - 3), sy(o.data2[i - 3]), sx(i), sy(o.data2[i]), "muted", {w:1.5, a:.8}); } }
};

/* ---------------- News ---------------- */
Screens.paneNews = function(l, cw){
  let y = 0;
  const COLS = {tc:"accent", al:"bad", gd:"good", ev:"warn", nw:"fg", in:"purple"}, f = S.newsF || "all";
  // 1.1: the season forecast is real (one continent gets hit far more often)
  const intel = S.intel && S.tick <= S.intel.until ? S.intel : null;
  if (intel){
    const sub = `${t("nfIntelHelp")} ${intel.until - S.tick} ${t("months")}`, sh = k.textH(sub, {size:11.5, w:cw - 24}), h = 34 + sh + 8;
    W.card(l, 0, y, cw, h, {r:10, stroke:"purple", sa:.7});
    k.text(l, `[[radar]] ${t("nfIntelNow")}: ${L(P.RMETA[intel.reg].name)}`, 12, y + 8, {font:"bodyB", size:13, w:cw - 24, iconColor:"purple"});
    k.text(l, sub, 12, y + 32, {size:11.5, color:"muted", w:cw - 24});
    y += h + 10;
  }
  const NEWS_F = [["all", "list", "nfAll"], ["in", "radar", "nfIntel"], ["al", "siren", "nfDanger"], ["gd", "circle-check", "nfGood"], ["ev", "lightbulb", "nfDecide"], ["nw", "newspaper", "nfWorld"]];
  y += chipRow(l, 0, y, cw, NEWS_F.map(([id, ic, key]) => ({id:"nf-" + id, label:`[[${ic}]] ${t(key)}`, on:f === id, fn:() => { S.newsF = id; P.changed(); }})), {size:11.5}) + 10;
  const list = S.log.filter(lg => f === "all" || lg.cls === f || (f === "gd" && lg.cls === "tc")).slice(0, 80);
  if (!list.length){ k.text(l, t("nfEmpty"), 0, y, {size:12, color:"muted"}); return y + 24; }
  for (const lg of list){
    const hh = k.text(l, lg.txt, 80, y + 5, {size:13, color:COLS[lg.cls] || "fg", w:cw - 80}).h;
    k.text(l, P.dateStr(lg.tk), 0, y + 6, {font:"mono", size:12, color:"muted"});
    y += hh + 10;
    k.line(l, 0, y, cw, y, "line", {dash:3});
  }
  return y;
};
