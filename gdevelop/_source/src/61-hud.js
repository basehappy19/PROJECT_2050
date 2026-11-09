const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.hud) return;
(P.mods = P.mods || {}).hud = 1;
/* =========================================================================
   Screens · HUD (top bar, KPIs, character + abilities, meters, ticker, tab buttons, zoom buttons)
   and the map overlay (region / country labels, hazard warnings, bubble timers, floating texts)
   ========================================================================= */
const {Kit, S, t, L, UI, Audio, W, UIM, Screens, RMETA, IC, MONTHS, HAZARDS, COUNTRY, SHORT, CHAR} = P;
const k = Kit;

/* 3.3 layout (same as the website):
   top-left: one bar with money · policy points · minerals · approval; the ability bar hangs right under it and the
   newest news line grows out of it to the right (fades after a few seconds) · top-right: date, speed, menu
   bottom: zoom (left) · Net Zero + warming, one slim row each (centre) · tabs (right) */
const HUD_Y = 10, KPI_H = 46, KPI_W = 134;
/* 1.1.3: numbers slide to their new value (450 ms), with a short +/− flash so you see what you gained or lost */
const AN = {};
function animNum(key, v){
  let q = AN[key]; const now = performance.now();
  if (!q || q.game !== S.saveId){ q = AN[key] = {from:v, to:v, t0:0, shown:v, d:0, dt:0, game:S.saveId}; }
  if (v !== q.to){ const d = v - q.to; q.from = q.shown; q.to = v; q.t0 = now; if (Math.abs(d) >= 1){ q.d = d; q.dt = now; } }
  const p = Math.min(1, (now - q.t0) / 450), e = 1 - Math.pow(1 - p, 3);
  q.shown = q.from + (q.to - q.from) * e;
  const fa = q.d ? Math.max(0, 1 - (now - q.dt) / 1100) : 0;
  if (p < 1 || fa > 0) Screens._hudAnim = true;
  return {v:q.shown, d:fa > 0 ? q.d : 0, fa, rise:(1 - fa) * 8};
}
Screens.renderHUD = function(l){
  if (this.kind !== "game") return;
  this._hudTips = [];
  const by = HUD_Y; this._goalsBottom = 0;
  /* ---- KPIs ---- */
  const acls = S.appr < 25 ? "bad" : S.appr < 45 ? "warn" : "good";
  Screens._hudAnim = false;
  const aEp = animNum("ep", S.ep), aPc = animNum("pc", S.pc), aAp = animNum("appr", S.appr);
  const sanct = P.sanctionsCost ? P.sanctionsCost() : 0;
  const kpis = [
    {id:"ep", ic:"$money", k:t("ep"), v:String(Math.floor(aEp.v)), an:aEp, s:sanct ? `+${P.epGain()} −${sanct}` : `+${P.epGain()}${t("perMo")}`, c:"fg", tip:t("tipEp"), sc:sanct ? "bad" : "muted"},
    {id:"pc", ic:"$policy", k:t("pc"), v:String(Math.floor(aPc.v)), an:aPc, s:`+${P.pcGain()}${t("perMo")}`, c:"fg", tip:t("tipPc")},
  ];
  if (S.oreOn && P.matTotal){ const aOr = animNum("ore", P.matTotal()); kpis.push({id:"ore", ic:"$ore", k:t("oreLbl"), v:String(Math.round(aOr.v)), an:aOr, s:`+${Math.round(P.oreGain ? P.oreGain() : 0)}${t("perMo")}`, c:"fg", tip:t("tipOre"), fn:() => Screens.openWin("market")}); }
  kpis.push({id:"appr", ic:"$appr", k:t("appr"), v:`${aAp.v.toFixed(0)}%`, an:aAp, meter:S.appr / 100, c:acls, badge:P.angryCount && P.angryCount() ? "!" : null,
    tip:S.groups ? P.GROUPS.map(G => `[[${G.icon}]] ${Math.round(S.groups[G.id])}%`).join("  ") : t("tipAppr"), fn:S.groups ? () => Screens.openWin("politics") : null});
  const bw = KPI_W * kpis.length;
  this._kpiRect = {x:14, y:by, w:bw, h:KPI_H};
  W.glass(l, 14, by, bw, KPI_H, 12);
  kpis.forEach((q, i) => {
    const x = 14 + i * KPI_W, danger = q.id === "appr" && S.appr < 25, hov = q.fn && k.isHover(l, "kpi-" + q.id);
    if (i) k.rect(l, x, by + 9, 1, KPI_H - 18, "line");
    if (hov) k.rect(l, x + 3, by + 3, KPI_W - 6, KPI_H - 6, "accent", {r:9, a:.1});
    if (danger) k.rect(l, x + 3, by + 3, KPI_W - 6, KPI_H - 6, null, {r:9, stroke:"bad"});
    k.icon(l, q.ic, x + 9, by + 11, 24);
    k.text(l, q.k, x + 40, by + 4, {size:10.5, color:"muted", w:KPI_W - 60, max:1});
    const vr = k.text(l, q.v, x + 40, by + 18, {font:"monoB", size:18, color:q.c});
    if (q.meter !== undefined) W.meter(l, x + 44 + vr.w, by + 29, Math.max(18, KPI_W - 66 - vr.w), 4, q.meter, acls);
    else if (q.s) k.text(l, q.s, x + 46 + vr.w, by + 24, {font:"mono", size:10, color:q.sc || "muted", w:KPI_W - 52 - vr.w, max:1});
    if (q.an && q.an.d){ const dd = q.an.d, lab = `${dd > 0 ? "+" : "−"}${Math.abs(Math.round(dd))}`; k.text(l, lab, x + 40 + vr.w + 2, by + 6 - q.an.rise, {font:"monoB", size:11, color:dd > 0 ? "good" : "bad", a:q.an.fa}); }
    if (q.badge){ k.circle(l, x + 32, by + 12, 7, "bad"); k.text(l, q.badge, x + 25, by + 4, {font:"monoB", size:10, color:"#ffffff", w:14, align:"center"}); }
    if (q.fn){ k.icon(l, "chevron-down", x + KPI_W - 18, by + 16, 13, "muted"); k.hit(l, "kpi-" + q.id, x, by, KPI_W, KPI_H, () => { Audio.play("open"); q.fn(); }); }
    else k.hit(l, "kpi-" + q.id, x, by, KPI_W, KPI_H, () => { UIM.kpiTip = UIM.kpiTip === q.id ? null : q.id; k.dirty("HUD"); }, {cursor:false});   // tap (touch) shows what it is
  });
  this._hudTips.push(tl => {   // 3.5: drawn on the Alerts layer (above the HUD), so the ability bar never covers it
    // a value in the top bar: hover (or tap) shows what it is and how to get more
    const tipQ = kpis.find(q => q.tip && (k.isHover(l, "kpi-" + q.id) || UIM.kpiTip === q.id));
    if (tipQ){
      const i = kpis.indexOf(tipQ), tw = 280, tx = Math.min(14 + i * KPI_W, k.W - tw - 14), ty = by + KPI_H + 6;
      const th = 24 + (tipQ.s && !tipQ.meter ? 18 : 0) + k.textH(tipQ.tip, {size:12, w:tw - 24}) + 12 + (k.touch ? 18 : 0);
      k.rect(tl, tx, ty, tw, th, "panel", {r:10, stroke:"line", a:.97, bg:true});
      k.text(tl, tipQ.k, tx + 12, ty + 8, {font:"bodyB", size:13, w:tw - 24, max:1});
      let yy = ty + 28;
      if (tipQ.s && !tipQ.meter){ k.text(tl, tipQ.s, tx + 12, yy, {font:"mono", size:11.5, color:"accent"}); yy += 18; }
      k.text(tl, tipQ.tip, tx + 12, yy, {size:12, color:"muted", w:tw - 24, iconColor:"muted"});
      if (k.touch) k.text(tl, Screens.tapClose(), tx + 12, ty + th - 22, {size:11, color:"muted", w:tw - 24, max:1});   // 3.5
    }
  });
  /* ---- controls (right): date · speed · menu ---- */
  const has3 = P.Net && P.Net.owns("speed3");
  const sp = [{id:"sp0", icon:"pause", on:S.speed === 0, fn:() => P.setSpeed(0)}, {id:"sp1", label:"1×", on:S.speed === 1, fn:() => P.setSpeed(1)}, {id:"sp2", label:"2×", on:S.speed === 2, fn:() => P.setSpeed(2)}];
  if (has3) sp.push({id:"sp3", label:"3×", on:S.speed === 3, fn:() => P.setSpeed(3)});
  const dateW = 112, ctrlW = 10 + dateW + 8 + sp.length * 34 + 8 + 30 + 10, cx0 = (k.W - 14) - ctrlW;
  W.glass(l, cx0, by, ctrlW, KPI_H, 12);
  const se = P.seasonOf ? P.seasonOf() : null;
  k.text(l, `${se ? `[[${se.icon}]] ` : ""}${P.dateStr()}`, cx0 + 10, by + 12, {font:"dispS", size:16, w:dateW, max:1, iconColor:"accent"});
  let cx = cx0 + 10 + dateW + 8;
  cx += W.seg(l, cx, by + 8, sp, {w:34}) + 8;
  W.hbtn(l, "menu", cx, by + 8, "menu", () => Screens.pause());
  /* ---- character + abilities, right under the money bar ---- */
  const ay = by + KPI_H + 6;
  this.abilityBar(l, 14, ay);
  /* ---- the newest news line, attached to the right of the ability bar ---- */
  const lg = S.log[0];
  if (lg){
    const key = S.log.length + ":" + lg.tk;
    if (UIM.newsKey !== key){ UIM.newsKey = key; UIM.newsT = performance.now(); }
    const age = (performance.now() - UIM.newsT) / 1000, a = age < 6 ? 1 : Math.max(0, 1 - (age - 6) / 1.2);
    if (a > 0){
      const nx = 14 + 54 + 8, nw = bw - 54 - 8, col = {tc:"accent", al:"bad", gd:"good", ev:"warn", nw:"fg"}[lg.cls] || "fg";
      k.rect(l, nx, ay, nw, 28, "glass", {a:.9 * a, r:10, stroke:"line", bg:true});
      k.icon(l, "newspaper", nx + 10, ay + 7, 14, "muted", a);
      k.text(l, lg.txt, nx + 30, ay + 5, {size:12.5, color:col, w:nw - 40, max:1, a});
      k.hit(l, "newsline", nx, ay, nw, 28, () => Screens.setTab("news"));
      if (!Screens._newsTimer) Screens._newsTimer = setTimeout(() => { Screens._newsTimer = null; k.dirty("HUD"); }, age < 6 ? (6 - age) * 1000 + 30 : 120);
    }
  }
  /* Continuous World: this season's goals under the news line */
  if (S.world && S.goals && S.goals.length){
    const gx = 14 + 54 + 8, gy = ay + 34, gw = Math.min(300, bw - 62), won = S.goals.filter(g => g.won).length;
    const lines = S.goals.map(g => `${g.won ? "[[circle-check]]" : "[[target]]"} ${P.goalText(g)}`);
    let gh = 30; const hs = lines.map(s2 => k.text(null, s2, 0, 0, {size:12, w:gw - 24, measure:true}).h); gh += hs.reduce((a, b) => a + b + 4, 0) + 6;
    W.glass(l, gx, gy, gw, gh, 10); this._goalsBottom = gy + gh;
    k.text(l, `[[target]] ${P.up(t("goalsTitle"))}`, gx + 12, gy + 8, {font:"mono", size:11, color:"accent", iconColor:"accent"});
    k.text(l, `${won}/${S.goals.length}`, gx + gw - 40, gy + 8, {font:"mono", size:11, color:won === S.goals.length ? "good" : "muted", w:28, align:"right"});
    let yy = gy + 28; lines.forEach((s2, i) => { k.text(l, s2, gx + 12, yy, {size:12, w:gw - 24, color:S.goals[i].won ? "good" : "fg", iconColor:S.goals[i].won ? "good" : "muted"}); yy += hs[i] + 4; });
  }
  if (P.Map.isCountryZoom()){
    const ht = `[[pointer]] ${t("tapCountry")}`, hw = k.textW(ht, {size:11.5}) + 24, hx = (16 + (k.W - 16) - this.drawerWidth()) / 2 - hw / 2;
    k.rect(l, hx, k.H - 90, hw, 24, "bg", {r:12, a:.8, stroke:"line", bg:true});
    k.text(l, ht, hx + 12, k.H - 87, {size:11.5, color:"muted", iconColor:"accent"});
  }
  /* ---- bottom row ---- */
  const ny = k.H - 52, nh = 40, keys = P.hasKeyboard();
  // zoom (left)
  W.glass(l, 14, ny, 3 * 34 + 8, nh, 10);
  W.hbtn(l, "zin", 18, ny + 5, "plus", () => P.Map.zoomBy(1.35));
  W.hbtn(l, "zout", 52, ny + 5, "minus", () => P.Map.zoomBy(1 / 1.35));
  W.hbtn(l, "zhome", 86, ny + 5, "locate-fixed", () => P.Map.resetView());
  // tabs (right)
  const tabs = [["tech", "network", "nbTech", "T"], ["region", "map", "nbRegion", "R"], ["stats", "chart-line", "nbStats", "S"], ["news", "newspaper", "nbNews", "N"]];
  const readyCount = P.SKILLS.filter(n => P.nodeState(n) === "ready" && (P.canAfford ? P.canAfford(n) : true)).length;
  let widths = tabs.map(([id, ic, key]) => { const lab = P.up(t(key)); return 14 + 16 + 6 + k.textW(lab, {font:"dispS", size:13}) + 14 + (id === "tech" && readyCount ? 26 : 0) + (keys ? 20 : 0); });
  // 3.7.3: when the Net Zero bar would be squeezed, the four tabs show icons only (the badge sits on the icon)
  const compact = (k.W - 14 - widths.reduce((a, b) => a + b, 0) - 18) - (14 + 3 * 34 + 18) < 560;
  if (compact) widths = tabs.map(() => 46);
  let nx = (k.W - 14) - widths.reduce((a, b) => a + b, 0) - 6 * (tabs.length - 1);
  const tabsX = nx;
  tabs.forEach(([id, ic, key, kk], i) => {
    const on = id === "tech" ? UIM.modal === "skills" : S.tab === id, hov = k.isHover(l, "tab-" + id), w = widths[i];
    k.rect(l, nx, ny, w, nh, on ? "accent" : "glass", {a:on ? 1 : .9, r:10, stroke:on ? "accent" : hov ? "accent" : "line", bg:true});
    const col = on ? "ink" : "fg";
    k.icon(l, ic, nx + (compact ? 15 : 14), ny + 12, 16, col);
    if (!compact){ const tx = W.runs(l, nx + 36, ny + 10, [[P.up(t(key)), {font:"dispS", size:13, color:col}]]); if (keys && !on) W.key(l, tx + 6, ny + 13, kk); }
    if (compact && id === "tech" && readyCount){ k.circle(l, nx + w - 9, ny + 9, 8, "good"); k.text(l, String(readyCount), nx + w - 17, ny + 2, {font:"mono", size:10, color:"#04130c", w:16, align:"center"}); }
    else if (id === "tech" && readyCount){ const bx2 = nx + w - 14 - 20; k.rect(l, bx2, ny + 11, 20, 18, "good", {r:9}); k.text(l, String(readyCount), bx2, ny + 12, {font:"mono", size:11, color:"#04130c", w:20, align:"center"}); }
    k.hit(l, "tab-" + id, nx, ny, w, nh, () => Screens.setTab(id));
    nx += w + 6;
  });
  // Net Zero + warming (centre, between zoom and tabs)
  const left = 14 + 3 * 34 + 8 + 10, room = tabsX - 10 - left, mw = Math.min(600, room), mx = Math.max(left, k.W / 2 - mw / 2 + Math.min(0, (tabsX - 10) - (k.W / 2 + mw / 2)));
  W.glass(l, mx, ny, mw, nh, 10); this._metersRect = {x:mx, y:ny, w:mw, h:nh};
  const half = (mw - 24 - 18) / 2;
  this.meterRowNZ(l, mx + 12, ny + 11, half);
  this.meterRowT(l, mx + 12 + half + 18, ny + 11, half);
  if (S.started && this.placeBar) this.placeBar(l, (S.world && S.goals && S.goals.length ? this._goalsBottom || 104 : 98) + 8);   // Continuous World: builds waiting to be placed
  k.dirty("Alerts");   // 3.5: the tooltips above are drawn there
};
/* one slim row: title · bar · value (the Net Zero bar fills toward the trophy as CO₂ falls) */
/* 3.5: tooltips collected while drawing the HUD, drawn on the Alerts layer above it */
Screens.drawHudTips = function(l){ if (this.kind === "game") for (const f of this._hudTips || []) f(l); };
Screens.meterRowNZ = function(l, x, y, w){
  const NZ_MAX = 50, net = P.netCO2(), start = 36, pos = v => P.clamp(v / NZ_MAX, 0, 1);
  const cls = net <= 8 ? "good" : net <= 20 ? "warn" : "bad";
  const tr = k.text(l, w < 270 ? "[[flag]]" : `[[flag]] ${t("nzTitle")}`, x, y + 1, {font:"dispS", size:12, max:1});   // narrow: icon only
  const vs = `${net.toFixed(1)}`, vw = k.textW(vs, {font:"monoB", size:15}), uw = k.textW(" Gt", {font:"mono", size:10});
  k.text(l, vs, x + w - vw - uw, y - 1, {font:"monoB", size:15, color:cls}); k.text(l, " Gt", x + w - uw, y + 4, {font:"mono", size:10, color:"muted"});
  const tx = x + tr.w + 10, tw = w - tr.w - vw - uw - 40, ty = y + 5, th = 8;
  if (tw < 30) return;
  k.hgrad(l, tx, ty, tw, th, [[0, "#ff5448"], [.5, "#d9a62b"], [1, "#5fd39a"]], {r:4, a:.17});
  const fw = tw * (1 - pos(net)); if (fw > 1) k.hgrad(l, tx, ty, Math.max(fw, 8), th, [[0, "#e0302a"], [.35, "#e0612f"], [.65, "#d9a62b"], [1, "#1f9e78"]], {r:4, span:tw});
  k.rect(l, tx + tw * (1 - pos(start)) - 1, ty - 3, 2, th + 6, "fg", {a:.4});
  const mx = tx + tw * (1 - pos(net)); k.circle(l, mx, ty + th / 2, 6, "bg"); k.circle(l, mx, ty + th / 2, 4, k.COL[cls]);
  k.icon(l, "trophy", tx + tw + 5, ty - 4, 14, "good");
};
Screens.meterRowT = function(l, x, y, w){
  const cls = S.temp >= 2.5 ? "bad" : S.temp >= 2.0 ? "hot" : S.temp >= 1.5 ? "warn" : "good";
  const tr = k.text(l, w < 270 ? "[[$temp]]" : `[[$temp]] ${t("tTitle")}`, x, y + 1, {font:"dispS", size:12, max:1});
  const vs = `+${S.temp.toFixed(2)}`, vw = k.textW(vs, {font:"monoB", size:15}), uw = k.textW("°C", {font:"mono", size:10});
  k.text(l, vs, x + w - vw - uw, y - 1, {font:"monoB", size:15, color:cls}); k.text(l, "°C", x + w - uw, y + 4, {font:"mono", size:10, color:"muted"});
  const tx = x + tr.w + 10, tw = w - tr.w - vw - uw - 40, ty = y + 5, th = 8;
  if (tw < 30) return;
  [["#5fd39a", .32], ["#f2b441", .34], ["#f07a3c", .4], ["#ff5448", .5]].forEach(([c, a], i) => k.rect(l, tx + tw * i / 4, ty, tw / 4, th, c, {a, r:i === 0 || i === 3 ? 4 : 0}));
  const mx = tx + tw * P.clamp((S.temp - 1.0) / 2.0, 0, 1); k.circle(l, mx, ty + th / 2, 6, "bg"); k.circle(l, mx, ty + th / 2, 4, k.COL[cls]);
  k.icon(l, "triangle-alert", tx + tw + 5, ty - 4, 14, "bad");
};

/* character portrait + ability buttons (left side of the map) */
Screens.abilityBar = function(l, x, y){
  const ch = CHAR[S.char]; if (!ch) return;
  const list = P.abilityList();
  const w = 54, h = 62 + list.length * 48;
  W.glass(l, x, y, w, h, 12);
  W.portrait(l, x + 5, y + 5, 44, S.char);
  k.rect(l, x + 30, y + 37, 22, 15, "bg", {r:4, stroke:ch.color, bg:true});
  k.text(l, String(S.charLv), x + 30, y + 37, {font:"monoB", size:10, color:ch.color, w:22, align:"center"});
  k.hit(l, "charinfo", x, y, w, 54, () => { UIM.abTip = UIM.abTip === "char" ? null : "char"; k.dirty("HUD"); }, {cursor:true});
  let yy = y + 60;
  list.forEach(a => {
    const ready = P.abilityReady(a), cd = S.actCd[a.id] || 0, id = "ab-" + a.id, hov = k.isHover(l, id);
    const lockedLv = a.lock;
    k.rect(l, x + 7, yy, 40, 40, ready ? (hov ? "accent" : "panel2") : "bg", {r:9, stroke:ready ? "accent" : "line", bg:true, a:ready ? 1 : .9});
    k.icon(l, lockedLv ? "lock" : a.icon, x + 17, yy + 10, 20, ready ? (hov ? "ink" : "accent") : "muted", ready ? 1 : .55);
    if (cd > 0){ k.rect(l, x + 7, yy + 40 - 40 * Math.min(1, cd / a.cd), 40, 40 * Math.min(1, cd / a.cd), "bad", {r:4, a:.18}); k.text(l, String(cd), x + 7, yy + 24, {font:"monoB", size:10, color:"warn", w:40, align:"center"}); }
    else if (lockedLv) k.text(l, `Lv${lockedLv}`, x + 7, yy + 26, {font:"mono", size:9, color:"muted", w:40, align:"center"});
    k.hit(l, id, x + 7, yy, 40, 40, () => {
      if (ready){ if (P.useAbility(a.id)) UIM.abTip = null; }
      else { UIM.abTip = UIM.abTip === a.id ? null : a.id; Audio.play("error"); }   // 3.5: a second tap closes it
      k.dirty();
    }, {cursor:true});
    if (hov || UIM.abTip === a.id){ const ty = yy - 4; this._hudTips.push(tl => this.abilityTip(tl, x + w + 8, ty, a)); }
    yy += 48;
  });
  if (UIM.abTip === "char") this._hudTips.push(tl => this.charTip(tl, x + w + 8, y));
};
/* 3.5: on touch screens a tooltip says how to close it */
Screens.tapClose = () => S.lang === "th" ? "แตะที่ไหนก็ได้เพื่อปิด" : "Tap anywhere to close";
Screens.abilityTip = function(l, x, y, a){
  const w = 270; let h = 0;
  const cd = S.actCd[a.id] || 0;
  const note = a.lock ? `${t("unlockAtLv")} ${a.lock}` : cd ? `${t("cooldown")} ${cd} ${t("months")}` : a.target === "country" && !(S.selC && !S.selC.startsWith("R_")) ? t("needCountry") : `${t("cooldownLen")} ${a.cd} ${t("months")}`;
  const draw = (dry) => {
    let yy = y + 8;
    yy += k.text(dry ? null : l, L(a.name), x + 10, yy, {font:"dispS", size:14, w:w - 20, measure:dry}).h;
    yy += k.text(dry ? null : l, L(a.desc), x + 10, yy, {size:12, color:"muted", w:w - 20, lh:1.35, measure:dry}).h + 4;
    yy += k.text(dry ? null : l, note, x + 10, yy, {font:"mono", size:11, color:cd || a.lock ? "warn" : "accent", w:w - 20, measure:dry}).h;
    if (k.touch) yy += 4 + k.text(dry ? null : l, Screens.tapClose(), x + 10, yy + 4, {size:11, color:"muted", w:w - 20, max:1, measure:dry}).h;
    return yy - y + 8;
  };
  h = draw(true);
  k.rect(l, x, y, w, h, "panel", {r:9, stroke:"accent", sa:.6, bg:true}); draw(false);
};
Screens.charTip = function(l, x, y){
  const ch = CHAR[S.char], w = 290; const xp = P.Net ? P.Net.charXp(S.char) : 0;
  const draw = dry => {
    let yy = y + 8;
    yy += k.text(dry ? null : l, `${L(ch.person)} · ${L(ch.name)}`, x + 10, yy, {font:"dispS", size:14, w:w - 20, measure:dry}).h;
    yy += k.text(dry ? null : l, `${t("level")} ${S.charLv} · XP ${xp}`, x + 10, yy, {font:"mono", size:11, color:"accent", w:w - 20, measure:dry}).h + 2;
    yy += k.text(dry ? null : l, `${t("passive")}: ${L(ch.pas)}`, x + 10, yy, {size:12, color:"muted", w:w - 20, lh:1.35, measure:dry}).h;
    if (k.touch) yy += 4 + k.text(dry ? null : l, Screens.tapClose(), x + 10, yy + 4, {size:11, color:"muted", w:w - 20, max:1, measure:dry}).h;
    return yy - y + 8;
  };
  const h = draw(true);
  k.rect(l, x, y, w, h, "panel", {r:9, stroke:ch.color, sa:.7, bg:true}); draw(false);
};

/* Net Zero meter: scale 0 (win, right) … 50 Gt (left). Marker = current net CO₂, ghost tick = 2026 level. */
Screens.meterNZ = function(l, x, y, w){
  const NZ_MAX = 50, net = P.netCO2(), start = 36, prev = S.hist.length > 12 ? S.hist[S.hist.length - 13].net : start;
  const trend = net - prev;
  let proj, projCls;
  if (trend < -0.05){ const yrs = net / -trend, yr = 2026 + (S.tick / 12) + yrs; proj = yr <= 2051 ? `${t("onTrack")} ${Math.floor(yr)}` : t("offTrack"); projCls = yr <= 2051 ? "good" : "bad"; }
  else { proj = t("rising"); projCls = "bad"; }
  const pos = v => P.clamp(v / NZ_MAX, 0, 1);
  const nzCls = net <= 8 ? "good" : net <= 20 ? "warn" : "bad";
  const title = P.up(t("nzTitle"));
  k.text(l, `[[flag]] ${title}`, x, y + 2, {font:"dispS", size:13});
  const vs = net.toFixed(1), vw = k.textW(vs, {font:"monoB", size:21}), uw = k.textW(" Gt", {font:"mono", size:12});
  k.text(l, vs, x + w - vw - uw, y - 4, {font:"monoB", size:21, color:nzCls});
  k.text(l, " Gt", x + w - uw, y + 4, {font:"mono", size:12, color:"muted"});
  const tx = x + 22, tw = w - 48, ty = y + 26, th = 16;
  k.hgrad(l, tx, ty, tw, th, [[0, "#ff5448"], [.5, "#d9a62b"], [1, "#5fd39a"]], {r:8, a:.17});
  const fillW = tw * (1 - pos(net));
  if (fillW > 1) k.hgrad(l, tx, ty, Math.max(fillW, 16), th, [[0, "#e0302a"], [.35, "#e0612f"], [.65, "#d9a62b"], [1, "#1f9e78"]], {r:8, span:tw});
  k.icon(l, "trophy", tx + tw + 6, ty - 1, 18, "good");
  const gx = tx + tw * (1 - pos(start));
  k.rect(l, gx - 1, ty - 3, 2, th + 6, "fg", {a:.45});
  const mx = tx + tw * (1 - pos(net)), mc = k.COL[nzCls];
  k.circle(l, mx, ty + th / 2, 12, mc, {a:.25});
  k.circle(l, mx, ty + th / 2, 9, "bg"); k.circle(l, mx, ty + th / 2, 6, mc);
  const fy = y + 48;
  W.runs(l, x, fy, [[`${t("vs2026")} `, {size:11.5, color:"muted"}], [P.fmt(net - start), {font:"monoB", size:11.5, color:net < start ? "good" : "bad"}],
    [` · ${trend <= 0 ? "▼" : "▲"} `, {size:11.5, color:"muted"}], [P.fmt(trend), {font:"monoB", size:11.5, color:trend <= 0 ? "good" : "bad"}], [`/12${t("perMo").replace("/", "")}`, {size:11.5, color:"muted"}]]);
  const pw = k.textW(proj, {size:11.5});
  k.text(l, proj, x + w - pw, fy, {size:11.5, color:projCls});
};
/* Warming meter: +1.0 → +3.0 °C with coloured danger zones */
Screens.meterT = function(l, x, y, w){
  const monthsLeft = Math.max(0, P.TOTAL_TICKS - S.tick), yearsLeft = monthsLeft / 12;
  const tCls = S.temp >= 2.5 ? "bad" : S.temp >= 2.0 ? "hot" : S.temp >= 1.5 ? "warn" : "good";
  const title = P.up(t("tTitle"));
  k.text(l, `[[thermometer]] ${title}`, x, y + 2, {font:"dispS", size:13});
  const vs = `+${S.temp.toFixed(2)}`, vw = k.textW(vs, {font:"monoB", size:21}), uw = k.textW("°C", {font:"mono", size:12});
  k.text(l, vs, x + w - vw - uw, y - 4, {font:"monoB", size:21, color:tCls});
  k.text(l, "°C", x + w - uw, y + 4, {font:"mono", size:12, color:"muted"});
  const tx = x, tw = w - 26, ty = y + 24, th = 14;
  const zones = [["#5fd39a", .28], ["#f2b441", .3], ["#f07a3c", .35], ["#ff5448", .45]];
  k.rect(l, tx, ty, tw, th, "panel2", {r:7});
  zones.forEach(([c, a], i) => k.rect(l, tx + tw * i / 4, ty, tw / 4, th, c, {a, r:i === 0 || i === 3 ? 7 : 0}));
  ["1.5", "2.0", "2.5"].forEach((s, i) => k.text(l, s, tx + tw * (i + 1) / 4 - 12, ty + th + 1, {font:"mono", size:9.5, color:"muted", w:24, align:"center"}));
  k.icon(l, "triangle-alert", tx + tw + 6, ty - 2, 18, "bad");
  const mx = tx + tw * P.clamp((S.temp - 1.0) / 2.0, 0, 1), mc = k.COL[tCls];
  k.circle(l, mx, ty + th / 2, 12, mc, {a:.25});
  k.circle(l, mx, ty + th / 2, 9, "bg"); k.circle(l, mx, ty + th / 2, 6, mc);
  const fy = y + 48;
  W.runs(l, x, fy, [[`${Math.max(0, 3 - S.temp).toFixed(2)}°C`, {font:"monoB", size:11.5, color:tCls}], [` ${t("toLose")} (3.0°C)`, {size:11.5, color:"muted"}]]);
  const right = [[`${t("left")} `, {size:11.5, color:"muted"}], [String(Math.floor(yearsLeft)), {font:"monoB", size:11.5}], [` ${t("yrs")} ${monthsLeft % 12} ${t("months")}`, {size:11.5, color:"muted"}]];
  W.runs(l, x + w - W.runsW(right), fy, right);
};

/* ---- MapUI layer: region / country labels, hazard warnings, bubble timers, floating texts ---- */
const HZ_COL = {hurricane:"#c3a6ff", typhoon:"#c3a6ff", flood:"#8fd0ff", heat:"#ff8a3c", drought:"#f2c14e", wildfire:"#ff5a4a", saltwater:"#4fd1c5"};
Screens.renderMapUI = function(l){
  const Map = P.Map; if (!Map || !Map.scene) return;
  this._edgeAnim = false;
  if (this.kind === "game" && this.placeGrid) this.placeGrid(l);   // Continuous World: the hex grid under everything else
  if (this.kind === "game" && this.drawSeason) this.drawSeason(l);   // 3.7.4: snow, rain, smoke and heat haze of the season
  if (this.kind === "game" && this.drawRigs) this.drawRigs(l);   // 3.6: oil rigs and their flares
  if (this.kind === "game" && this.drawPins) this.drawPins(l);   // builds pinned on the map
  if (this.kind === "game" && this.drawTrains) this.drawTrains(l);   // 3.6: high-speed trains
  if (this.kind === "game"){
    const ry = 60, rb = k.H - 60, zoomed = Map.isCountryZoom();
    const leftLimit = 74, rightLimit = (k.W - 16) - this.drawerWidth();
    if (!zoomed){
      for (const r of S.regions){
        const [lat, lon] = RMETA[r.id].lab; const [sx, sy] = Map.latlonScreen(lat, lon);
        if (sy < ry || sy > rb || sx < leftLimit || sx > rightLimit) continue;
        const a = L(RMETA[r.id].name), b = `${r.co2.toFixed(1)} Gt`;   // 3.3: continent names, not codes
        const w = k.textW(a, {font:"bodyB", size:11}) + 5 + k.textW(b, {font:"mono", size:11}) + 16 + (S.alli[r.id] ? 18 : 0), h = 21;
        const x = sx - w / 2, y = sy - h / 2, sel = !S.noSel && S.sel === r.id, hov = k.isHover(l, "lab-" + r.id);
        if (sel) k.rect(l, x - 3, y - 3, w + 6, h + 6, "accent", {r:9, a:.22, bg:true});
        k.rect(l, x, y, w, h, "bg", {a:.8, r:7, stroke:sel || hov ? "accent" : "line", bg:true});
        const ex = W.runs(l, x + 8, y + 2, [[a, {font:"bodyB", size:11}]]);
        const ex2 = W.runs(l, ex + 5, y + 2, [[b, {font:"mono", size:11, color:"hot"}]]);
        if (S.alli[r.id]) k.icon(l, "handshake", ex2 + 4, y + 4, 13, "good");
        k.hit(l, "lab-" + r.id, x, y, w, h, () => Screens.selectRegion(r.id, true));
      }
    } else {
      // country labels (major countries in view) with a relation dot
      // 3.7.2: label tiers — main countries always, smaller ones only when zoomed in closer; overlapping labels are skipped
      const zz = Map.cam.z, placed = [];
      for (const c of S.countries.filter(x => !x.rest).sort((a, b) => (S.selC === b.id) - (S.selC === a.id) || COUNTRY[b.id].w - COUNTRY[a.id].w)){
        if (c.rest) continue;
        const pt = P.countryPoint(c.id); if (!pt) continue;
        const [sx, sy] = Map.toScreen(pt[0], pt[1]);
        if (sy < ry || sy > rb || sx < leftLimit || sx > rightLimit) continue;
        const sel0 = S.selC === c.id;
        if (!sel0 && COUNTRY[c.id].w < (zz >= 4 ? 0 : zz >= 3.2 ? 40 : zz >= 2.4 ? 100 : 250)) continue;
        const nm = L(SHORT[c.id] || COUNTRY[c.id].name), sel = sel0;
        const w = k.textW(nm, {font:"bodyB", size:10.5}) + 22, h = 18;
        if (!sel && placed.some(q => Math.abs(q[0] - sx) < (w + q[2]) / 2 + 4 && Math.abs(q[1] - sy) < 20)) continue;
        placed.push([sx, sy, w]);
        const x = sx - w / 2, y = sy - h / 2;
        k.rect(l, x, y, w, h, "bg", {a:sel ? .92 : .66, r:9, stroke:sel ? "accent" : null, bg:true});
        k.circle(l, x + 9, y + 9, 3.5, W.relCol(c.rel));
        k.text(l, nm, x + 16, y + 1, {font:"bodyB", size:10.5, color:sel ? "accent" : "fg"});
        k.hit(l, "cl-" + c.id, x, y, w, h, () => Screens.selectCountry(c.id));
      }
      // 3.8: capitals (gold stars, like the website): only closer in than the country names, and only for countries whose
      // name already shows; the capital's own name comes in closer still
      if (zz >= 2.4 && P.CAPITALS){
        const tier = zz >= 4 ? 0 : zz >= 3.2 ? 40 : 100, names = zz >= 3.2, th = S.lang === "th", capNames = [];
        for (const [id, cp] of Object.entries(P.CAPITALS)){
          const cc = COUNTRY[id]; if (!cc || (cc.w < tier && S.selC !== id)) continue;
          const [sx, sy] = Map.latlonScreen(cp[0], cp[1]);
          if (sy < ry || sy > rb || sx < leftLimit || sx > rightLimit) continue;
          if (placed.some(q => Math.abs(q[0] - sx) < q[2] / 2 + 5 && Math.abs(q[1] - sy) < 14)) continue;   // never under a country's name tag
          k.circle(l, sx, sy, 6, "bg", {a:.75});
          k.icon(l, "star", sx - 5, sy - 5, 10, "gold");
          if (!names) continue;
          const nm = th ? cp[2] : cp[3], nw = k.textW(nm, {size:10});
          if (placed.some(q => sx + 9 < q[0] + q[2] / 2 && sx + 9 + nw > q[0] - q[2] / 2 && Math.abs(q[1] - sy) < 16) || capNames.some(q => sx + 9 < q[0] + q[2] && sx + 9 + nw > q[0] && Math.abs(q[1] - sy) < 13)) continue;   // names that would overlap are left out
          capNames.push([sx + 9, sy, nw]);
          k.text(l, nm, sx + 9, sy - 8, {size:10, color:"#f3e2b0", max:1});
        }
      }
    }
    // 3.8: the stage of each tropical cyclone under it (depression → tropical storm → typhoon / hurricane / cyclone)
    if (P.stormList && P.Life && P.Life.storms) for (const st of P.stormList()){
      const o = P.Life.storms[st.id]; if (!o || !o.m.visible) continue;
      const [sx, sy] = Map.toScreen(o.sx, o.sy + o.D * .42);
      if (sy < ry || sy > rb || sx < leftLimit || sx > rightLimit) continue;
      const nm = L(st.name), tw = k.textW(nm, {font:"bodyB", size:11}) + 14;
      k.rect(l, sx - tw / 2, sy - 1, tw, 19, "bg", {a:.7, r:9, bg:true});
      k.text(l, nm, sx - tw / 2 + 7, sy, {font:"bodyB", size:11, color:st.stage === 2 ? "#ffd2c4" : "fg"});
    }
    // hazard forecasts: pulsing ring + icon + months left; tap = evacuate
    const now = performance.now() / 1000;
    for (const h of S.haz || []){
      const pt = P.countryPoint(h.c); if (!pt) continue;
      const [sx, sy0] = Map.toScreen(pt[0], pt[1]); const sy = sy0 - 26;
      if (sy < ry || sy > rb || sx < leftLimit || sx > rightLimit) continue;
      const Z = HAZARDS[h.type], col = HZ_COL[h.type] || "#ff5a4a", left = Math.max(0, h.at - S.tick);
      const ph = (now * 1.6) % 1;
      k.circle(l, sx, sy, 16 + ph * 16, col, {a:(1 - ph) * .35});
      k.circle(l, sx, sy, 17, "bg", {stroke:col, sw:2, a:.92});
      k.icon(l, Z.icon, sx - 10, sy - 10, 20, col);
      const lab = h.evac ? `[[check]] ${t("evacShort")}` : `${left} ${t("moShort")} · ${t("evacShort")} ${IC.ep}${P.evacCost()}`;
      const lw = k.textW(lab, {font:"mono", size:10}) + 12;
      k.rect(l, sx - lw / 2, sy + 20, lw, 17, h.evac ? "good" : "bg", {a:h.evac ? .9 : .86, r:5, stroke:col, bg:true});
      k.text(l, lab, sx - lw / 2, sy + 21, {font:"mono", size:10, color:h.evac ? "#04130c" : "fg", w:lw, align:"center", iconColor:"#04130c"});
      k.hit(l, "hz-" + h.id, sx - Math.max(22, lw / 2), sy - 20, Math.max(44, lw), 58, () => { if (!h.evac){ if (P.evacuate(h.id)) Map.floatText(sx, sy - 20, t("evacuated"), "good"); } });
    }
    for (const b of S.bubbles){
      const o = Map.bubbles[b.id]; if (!o) continue;
      const [sx, sy] = Map.toScreen(o.getX(), o.getVariables().get("BaseY").getAsNumber());
      if (sy < ry || sy > rb) continue;
      const txt = b.type === "red" ? `${IC.ep}−${P.aidCost()} · ${b.ttl}` : `${b.ttl}`;
      const w = k.textW(txt, {font:"mono", size:10}) + 8;
      k.rect(l, sx - w / 2, sy + 3, w, 16, "bg", {a:.8, r:4, bg:true});
      k.text(l, txt, sx - w / 2, sy + 4, {font:"mono", size:10, w, align:"center"});
    }
    // hazard strike animation
    for (const f of Map.fx){
      const [sx, sy] = Map.toScreen(f.x, f.y), p = f.t / 2.2, Z = HAZARDS[f.type], col = HZ_COL[f.type] || "#ff5a4a";
      const a = p < .8 ? 1 : 1 - (p - .8) / .2;
      // weather over the struck country (web/src/map2d.js weatherFx, lighter)
      { const R = 70 * Math.sqrt(Map.cam.z), wa = p < .15 ? p / .15 : p > .75 ? (1 - p) / .25 : 1, T = f.type, now = performance.now() / 1000, low = P.Gfx && P.Gfx.level === "low";
        f.seed = f.seed || Array.from({length:120}, () => Math.random());
        for (let i = 0; i < 3; i++){ const q = p * 1.6 - i * .18; if (q > 0 && q < 1) k.circle(l, sx, sy, 12 + q * R * 1.4, null, {stroke:col, sw:3 * (1 - q) + .5, sa:(1 - q) * .8}); }
        if (T === "flood" || T === "hurricane" || T === "typhoon"){
          for (let i = 0, n = low ? 20 : 50; i < n; i++){ const rx = sx + (f.seed[i] * 2 - 1) * R, ry = sy - R + ((now * 380 + f.seed[i + 60] * 1000) % (2 * R)); k.line(l, rx, ry, rx - 4, ry + 12, "#aad2ff", {w:1.2, a:wa * .8}); }
          if (T === "flood") k.circle(l, sx, sy + 6, R * .6 * wa, "#3c78c8", {a:.22});
        } else if (T === "heat" || T === "drought"){
          k.circle(l, sx, sy, R * 1.2, T === "heat" ? "#ff7828" : "#e6b450", {a:.28 * wa});
          for (let i = 0; i < 6; i++){ const yy = sy - R * .6 + i * R * .22, pts = []; for (let xx = -R * .7; xx <= R * .7; xx += 8) pts.push(sx + xx, yy + Math.sin(xx * .08 + now * 4 + i) * 3); k.path(l, pts, T === "heat" ? "#ffc88c" : "#e6c88c", {w:1.5, a:wa * .7}); }
        } else if (T === "wildfire"){
          k.circle(l, sx, sy, R, "#ff5a1e", {a:.3 * wa});
          for (let i = 0, n = low ? 18 : 40; i < n; i++){ const q = (now * .7 + f.seed[i]) % 1, ex = sx + (f.seed[i + 50] * 2 - 1) * R * .7 + Math.sin(now * 3 + i) * 6, ey = sy + R * .3 - q * R * 1.2; k.circle(l, ex, ey, 1.5 + (1 - q) * 1.6, (255 << 16) | (Math.round(140 + 100 * (1 - q)) << 8) | 60, {a:(1 - q) * wa}); }
        } else if (T === "saltwater"){
          for (let i = 0; i < 4; i++){ const yy = sy - R * .3 + i * R * .2, pts = []; for (let xx = -R * .8; xx <= R * .8; xx += 6) pts.push(sx + xx, yy + Math.sin(xx * .06 + now * 3 + i) * 5); k.path(l, pts, "#4fd1c5", {w:2, a:wa * .7}); }
        }
      }
      k.circle(l, sx, sy, 20 + p * 70, col, {a:(1 - p) * .25});
      k.circle(l, sx, sy, 10 + p * 40, null, {stroke:col, sw:2, sa:(1 - p) * .9});
      const swing = Math.sin(p * Math.PI * 2) * 36, size = 34 + 10 * Math.sin(p * Math.PI);
      k.icon(l, Z.icon, sx - size / 2 + swing, sy - size / 2 - 6, size, col, a, (f.type === "hurricane" || f.type === "typhoon") ? p * 720 : 0);
    }
  }
  for (const f of Map.floats){
    const p = f.t / 1.2, a = p < .7 ? 1 : 1 - (p - .7) / .3;
    const col = f.color === "good" ? "good" : f.color === "bad" ? "bad" : "accent";
    const w = k.textW(f.txt, {font:"monoB", size:14});
    k.text(l, f.txt, f.x - w / 2, f.y - 18 - p * 40, {font:"monoB", size:14, color:col, a, iconColor:col});
  }
  if (this.kind === "game"){ if (this.edgeArrows) this.edgeArrows(l); if (this.mapHover) this.mapHover(l); }
};
