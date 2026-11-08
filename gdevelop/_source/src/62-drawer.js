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
  const dw = this.drawerWidth(), x = 1264 - dw, y = 64, h = 660 - y;   // 3.3: the bottom row is one slim line
  W.panel(l, x, y, dw, h, 10, "panel");
  const titles = {region:S.selC ? "dCountry" : "dRegion", stats:"dStats", news:"dNews"};
  const title = t(titles[S.tab]);
  let tx = x + 14;
  if (S.tab === "region" && S.selC){ W.hbtn(l, "dback", x + 10, y + 7, "arrow-left", () => { Audio.play("click"); S.selC = null; P.Map.focus(S.sel, false); P.changed(); }, {color:"muted"}); tx = x + 48; }
  k.text(l, P.up(title), tx, y + 11, {font:"dispS", size:14});
  if (P.hasKeyboard()) W.key(l, x + dw - 14 - 30 - 34, y + 15, "Esc");
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
Screens.regionButtons = function(l, y, cw){
  const bw = (cw - 10) / 3, bh = 32;
  S.regions.forEach((x, i) => {
    const bx = (i % 3) * (bw + 5), by = y + Math.floor(i / 3) * (bh + 5), on = x.id === S.sel && !S.selC, hov = k.isHover(l, "reg-" + x.id);
    k.rect(l, bx, by, bw, bh, "panel2", {r:7, stroke:on || hov ? "accent" : "line", bg:true});
    k.text(l, x.id, bx + 9, by + 7, {font:"mono", size:12, color:x.id === S.sel ? "accent" : "fg"});
    const c = P.heatRGB(P.regionHeatValue(x)); k.circle(l, bx + bw - 13, by + bh / 2, 4.5, (c[0] << 16) | (c[1] << 8) | c[2]);
    k.hit(l, "reg-" + x.id, bx, by, bw, bh, () => Screens.selectRegion(x.id, true));
  });
  return 2 * (bh + 5) + 8;
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
Screens.orderCards = function(l, y, cw, scope){
  const r = P.R(S.sel);
  for (const a of ACTIONS){
    const cc = scope === "country";
    const c = P.actionCost(a, r, cc), cd = r.cd[a.id] || 0, ok = !cd && S.ep >= c.ep && S.pc >= c.pc;
    const label = cd ? `${t("cooldown")} ${cd}` : [c.ep ? `${IC.ep} ${c.ep}` : "", c.pc ? `${IC.pc} ${c.pc}` : ""].filter(Boolean).join("  ");
    const btnW = Math.ceil(k.textW(label, {font:"dispS", size:14})) + 30;
    const tw = cw - 22 - btnW - 10;
    const h1 = k.text(l, L(a.name), 11, y + 9, {font:"bodyB", size:13.5, w:tw}).h;
    const h2 = k.text(l, cc ? L(UI["cact_" + a.id]) : L(a.desc), 11, y + 9 + h1, {size:11.5, color:"muted", w:tw, max:1}).h;   // 3.3: one line each
    const ch = Math.max(8 + h1 + h2 + 8, 50);
    W.card(l, 0, y, cw, ch);
    W.btn(l, "act-" + a.id, cw - 11 - btnW, y + (ch - 36) / 2, label, () => P.doAction(a.id, scope), {disabled:!ok, kind:ok ? "primary" : "ghost", w:btnW, sound:false});
    y += ch + 7;
  }
  return y;
};

/* ---------------- Region ---------------- */
Screens.paneRegion = function(l, cw){
  const meta = RMETA[S.sel], r = P.R(S.sel);
  let y = this.regionButtons(l, 0, cw);
  y += k.text(l, L(meta.name), 0, y, {font:"dispS", size:17, w:cw}).h + 8;
  y += statGrid(l, y, cw, [[t("co2Now"), `${r.co2.toFixed(2)} Gt`], [t("co2Start"), `${r.co2_0.toFixed(1)} Gt`], [t("compliance"), `${r.comp.toFixed(0)}%`], [t("vuln"), `${r.vuln.toFixed(0)}%`]]) + 6;
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
  // countries in the region
  W.h3(l, t("countriesIn"), 0, y, {w:cw}); y += 22;
  const list = P.regCountries(S.sel).slice().sort((a, b) => b.co2 - a.co2);
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
  y += 10;
  W.h3(l, th3() ? `คำสั่งเฉพาะทวีป ${L(meta.name)}` : `Orders for ${L(meta.name)}`, 0, y, {w:cw}); y += 22;
  return this.orderCards(l, y, cw, "region");
};

/* ---------------- Country ---------------- */
Screens.paneCountry = function(l, cw){
  const c = P.C(S.selC); if (!c){ S.selC = null; return 0; }
  const r = P.R(c.reg), meta = c.rest ? null : COUNTRY[c.id];
  /* 3.3 · design C: name + continent, a friendship ring, one line of numbers, then the orders */
  let y = 0;
  const ringW = c.rest ? 0 : 74;
  y += k.text(l, P.cname(c.id), 0, y, {font:"dispS", size:19, w:cw - ringW}).h;
  y += k.text(l, L(RMETA[c.reg].name) + (S.alli[c.reg] && S.alli[c.reg].members.includes(c.id) ? ` · [[handshake]] ${t("allyMember")}` : ""), 0, y, {size:12, color:"muted", w:cw - ringW, iconColor:"good"}).h + 6;
  if (!c.rest){
    const rc = W.relCol(c.rel), cx = cw - 34, cy = 32, R = 30, fr = (c.rel + 100) / 200;
    k.circle(l, cx, cy, R, "panel2");
    for (let i = 0; i < 48; i++){ if (i / 48 > fr) break; const a = -Math.PI / 2 + i / 48 * Math.PI * 2; k.circle(l, cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4), 3.2, rc); }
    k.circle(l, cx, cy, R - 9, "panel");
    k.text(l, `${c.rel >= 0 ? "+" : ""}${Math.round(c.rel)}`, cx - 24, cy - 13, {font:"monoB", size:15, w:48, align:"center", color:rc});
    k.text(l, t("relation"), cx - 26, cy + 5, {size:9, w:52, align:"center", color:"muted", max:1});
  }
  y = Math.max(y, c.rest ? y : 46);
  const share = c.co2 / (r.co2 || 1);
  y += k.text(l, `[[$co2]] ${c.co2.toFixed(2)} Gt · ${Math.round(share * 100)}% ${th3() ? "ของทวีป" : "of the continent"}${meta ? ` · [[$risk]] ${t("risk")} ${meta.risk}%` : ""}`, 0, y, {font:"mono", size:12, w:cw - ringW, color:"fg"}).h + 8;
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
    W.h3(l, th3() ? `สั่งการกับ ${P.cname(c.id)}` : `Deal with ${P.cname(c.id)}`, 0, y, {w:cw}); y += 22;
    for (const a of P.CACTS){
      if (a.req && !S.owned[a.req]) continue;
      const kk = P.cactCost(a), cd = c.cd[a.id] || 0, ok = P.cactOk(a, c);
      const label = cd ? `${t("cooldown")} ${cd}` : [kk.ep ? `${IC.ep} ${kk.ep}` : "", kk.pc ? `${IC.pc} ${kk.pc}` : ""].filter(Boolean).join("  ");
      const btnW = Math.ceil(k.textW(label, {font:"dispS", size:14})) + 30, tw = cw - 22 - btnW - 10;
      const h1 = k.text(l, `[[${a.icon}]] ${L(a.name)}`, 11, y + 9, {font:"bodyB", size:13.5, w:tw, iconColor:"accent"}).h;
      const h2 = k.text(l, L(a.desc), 11, y + 9 + h1, {size:11.5, color:"muted", w:tw, max:1}).h;
      const ch = Math.max(8 + h1 + h2 + 8, 50);
      W.card(l, 0, y, cw, ch);
      W.btn(l, "ca-" + a.id, cw - 11 - btnW, y + (ch - 36) / 2, label, () => P.countryAction(a.id), {disabled:!ok, kind:ok ? "primary" : "ghost", w:btnW, sound:false});
      y += ch + 7;
    }
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
  y += 6;
  W.h3(l, c.rest ? (th3() ? `คำสั่งเฉพาะทวีป ${L(RMETA[c.reg].name)}` : `Orders for ${L(RMETA[c.reg].name)}`) : (th3() ? `คำสั่งเฉพาะประเทศ ${P.cname(c.id)}` : `Orders for ${P.cname(c.id)} only`), 0, y, {w:cw}); y += 22;
  return this.orderCards(l, y, cw, c.rest ? "region" : "country");
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
  y += 8; W.h3(l, t("topEmitters"), 0, y, {w:cw, size:11.5}); y += 22;
  for (const c of S.countries.filter(x => !x.rest).sort((a, b) => b.co2 - a.co2).slice(0, 8)){
    k.text(l, L(COUNTRY[c.id].name), 0, y, {size:12, w:120, max:1});
    W.meter(l, 124, y + 6, cw - 124 - 64, 8, c.co2 / g, "warn");
    k.text(l, c.co2.toFixed(2), cw - 56, y, {font:"mono", size:12, w:56, align:"right"});
    y += 24;
  }
  y += 6; W.h3(l, S.lang === "th" ? "แถบอุณหภูมิรายเดือน" : "Warming stripes", 0, y, {w:cw, size:11.5}); y += 20;
  k.rect(l, 0, y, cw, 12, "panel2", {r:3});
  const sw = cw / (P.TOTAL_TICKS + 1);
  S.hist.forEach((h, i) => k.rect(l, i * sw, y, sw + 0.4, 12, tempColor(h.temp)));
  y += 22;
  k.text(l, `${t("timePlayed")}: ${P.fmtTime(S.realSec)}`, 0, y, {font:"mono", size:12, color:"muted"}); y += 22;
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
  for (const lg of S.log.slice(0, 80)){
    const hh = k.text(l, lg.txt, 80, y + 5, {size:13, color:COLS[lg.cls] || "fg", w:cw - 80}).h;
    k.text(l, P.dateStr(lg.tk), 0, y + 6, {font:"mono", size:12, color:"muted"});
    y += hh + 10;
    k.line(l, 0, y, cw, y, "line", {dash:3});
  }
  return y;
};
