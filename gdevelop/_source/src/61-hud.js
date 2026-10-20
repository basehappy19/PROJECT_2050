const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.hud) return;
(P.mods = P.mods || {}).hud = 1;
/* =========================================================================
   Screens · HUD (top bar, KPIs, character + abilities, meters, ticker, tab buttons, zoom buttons)
   and the map overlay (region / country labels, hazard warnings, bubble timers, floating texts)
   ========================================================================= */
const {Kit, S, t, L, UI, Audio, W, UIM, Screens, RMETA, IC, MONTHS, HAZARDS, COUNTRY, SHORT, CHAR} = P;
const k = Kit;

Screens.renderHUD = function(l){
  if (this.kind !== "game") return;
  /* ---- brand ---- */
  const bx = 16, by = 10, bh = 44;
  const p1 = "PROJECT ", p2 = ":", p3 = " 2050";
  const bw = W.runsW([[p1, {font:"logo", size:20}], [p2, {font:"logo", size:20}], [p3, {font:"logo", size:20}]]) + 26;
  W.glass(l, bx, by, bw, bh);
  W.runs(l, bx + 13, by + 7, [[p1, {font:"logo", size:20}], [p2, {font:"logo", size:20, color:"accent"}], [p3, {font:"logo", size:20}]]);
  /* ---- KPIs ---- */
  const acls = S.appr < 25 ? "bad" : S.appr < 45 ? "warn" : "good";
  const kpis = [
    {k:t("ep"), v:String(Math.floor(S.ep)), s:`+${P.epGain()}${t("perMo")}`, c:"fg"},
    {k:t("pc"), v:String(Math.floor(S.pc)), s:`+${P.pcGain()}${t("perMo")}`, c:"fg"},
    {k:t("appr"), v:`${S.appr.toFixed(0)}%`, meter:S.appr / 100, c:acls},
  ];
  let kx = bx + bw + 8;
  const has3 = P.Net && P.Net.owns("speed3");
  const ctrlW = 4 * 30 + 3 * 6 + 8 + 104 + 8 + (has3 ? 136 : 102) + 8 + 80 + 14;
  const cx0 = 1264 - ctrlW;
  const kw = Math.max(112, Math.min(150, (cx0 - 8 - kx) / 3 - 8));
  kpis.forEach((q, i) => {
    const danger = i === 2 && S.appr < 25;
    k.rect(l, kx, by, kw, bh, "glass", {a:.9, r:10, stroke:danger ? "bad" : "line", bg:true});
    k.text(l, P.up(q.k), kx + 10, by + 4, {size:10.5, color:"muted", w:kw - 20, max:1});
    k.text(l, q.v, kx + 10, by + 17, {font:"monoB", size:18, color:q.c});
    if (q.s) k.text(l, q.s, kx + kw - 10 - k.textW(q.s, {font:"mono", size:10.5}), by + 24, {font:"mono", size:10.5, color:"muted"});
    if (q.meter !== undefined){
      const blink = danger && (Date.now() % 1000 < 500);
      W.meter(l, kx + 62, by + 27, kw - 72, 5, q.meter, blink ? "panel2" : acls);
      if (danger && !Screens._blink) Screens._blink = setTimeout(() => { Screens._blink = null; k.dirty("HUD"); }, 520);
    }
    kx += kw + 8;
  });
  /* ---- controls (right) ---- */
  W.glass(l, cx0, by, ctrlW, bh);
  let cx = cx0 + 7; const cy = by + 7;
  const fs = !!(document.fullscreenElement);
  W.hbtn(l, "fs", cx, cy, fs ? "minimize" : "maximize", () => { Audio.play("click"); const g = this.scene.getGame().getRenderer(); try { g.setFullScreen(!fs); } catch(e) {} setTimeout(() => k.dirty(), 300); }); cx += 36;
  W.hbtn(l, "mus", cx, cy, Audio.musicOn ? "music" : "music-off", () => { Audio.toggleMusic(); k.dirty(); }); cx += 36;
  W.hbtn(l, "sfx", cx, cy, Audio.on ? "volume-2" : "volume-x", () => { Audio.toggle(); k.dirty(); }); cx += 36;
  W.hbtn(l, "menu", cx, cy, "menu", () => Screens.pause()); cx += 30 + 8;
  k.text(l, P.dateStr(), cx, by + 8, {font:"dispS", size:18, w:104, align:"center"}); cx += 104 + 8;
  const sp = [
    {id:"sp0", icon:"pause", on:S.speed === 0, fn:() => P.setSpeed(0)},
    {id:"sp1", label:"1×", on:S.speed === 1, fn:() => P.setSpeed(1)},
    {id:"sp2", label:"2×", on:S.speed === 2, fn:() => P.setSpeed(2)},
  ];
  if (has3) sp.push({id:"sp3", label:"3×", on:S.speed === 3, fn:() => P.setSpeed(3)});
  cx += W.seg(l, cx, cy, sp, {w:34}) + 8;
  W.langSeg(l, cx, cy);
  /* ---- character + abilities (left column) ---- */
  this.abilityBar(l, 16, 64);
  /* ---- zoom buttons (right edge, beside the drawer) ---- */
  const zx = 1264 - this.drawerWidth() - (S.tab ? 8 : 0) - 34, zy = 400;
  W.glass(l, zx - 4, zy - 4, 38, 3 * 34 + 6, 9);
  W.hbtn(l, "zin", zx, zy, "plus", () => P.Map.zoomBy(1.3));
  W.hbtn(l, "zout", zx, zy + 34, "minus", () => P.Map.zoomBy(1 / 1.3));
  W.hbtn(l, "zhome", zx, zy + 68, "locate-fixed", () => P.Map.resetView());
  if (P.Map.isCountryZoom()){
    const ht = `[[pointer]] ${t("tapCountry")}`, hw = k.textW(ht, {size:11.5}) + 24, hx = (16 + 1264 - this.drawerWidth()) / 2 - hw / 2;
    k.rect(l, hx, 540, hw, 24, "bg", {r:12, a:.8, stroke:"line", bg:true});
    k.text(l, ht, hx + 12, 543, {size:11.5, color:"muted", iconColor:"accent"});
  }
  /* ---- bottom meters ---- */
  const mbx = 16, mby = 572, mbw = 1248, mbh = 86;
  W.glass(l, mbx, mby, mbw, mbh);
  const half = (mbw - 24 - 40) / 2;
  this.meterNZ(l, mbx + 14, mby + 10, half);
  this.meterT(l, mbx + 14 + half + 40, mby + 10, half);
  /* ---- ticker + tab buttons ---- */
  const ny = 666, nh = 40, keys = P.hasKeyboard();
  const tabs = [["tech", "network", "nbTech", "T"], ["region", "map", "nbRegion", "R"], ["stats", "chart-line", "nbStats", "S"], ["news", "newspaper", "nbNews", "N"]];
  const readyCount = P.SKILLS.filter(n => P.nodeState(n) === "ready" && !P.atCapacity(n) && S.ep >= P.nodeCost(n).ep && S.pc >= P.nodeCost(n).pc).length;
  const widths = tabs.map(([id, ic, key, kk]) => { const lab = P.up(t(key)); return 14 + 16 + 6 + k.textW(lab, {font:"dispS", size:13}) + 14 + (id === "tech" && readyCount ? 26 : 0) + (keys ? 20 : 0); });
  let nx = 1264 - widths.reduce((a, b) => a + b, 0) - 6 * (tabs.length - 1);
  const tickerW = nx - 8 - 16;
  W.glass(l, 16, ny, tickerW, nh);
  const lg = S.log[0];
  if (lg){
    const d = P.dateStr(lg.tk), dw = k.textW(d, {font:"mono", size:12}) + 10;
    k.text(l, d, 28, ny + 11, {font:"mono", size:12, color:"muted"});
    const col = {tc:"accent", al:"bad", gd:"good", ev:"warn", nw:"fg"}[lg.cls] || "fg";
    k.text(l, lg.txt, 28 + dw, ny + 10, {size:13, color:col, w:tickerW - dw - 26, max:1});
  }
  tabs.forEach(([id, ic, key, kk], i) => {
    const on = id === "tech" ? UIM.modal === "skills" : S.tab === id, hov = k.isHover(l, "tab-" + id), w = widths[i];
    k.rect(l, nx, ny, w, nh, on ? "accent" : "glass", {a:on ? 1 : .9, r:10, stroke:on ? "accent" : hov ? "accent" : "line", bg:true});
    const col = on ? "ink" : "fg";
    k.icon(l, ic, nx + 14, ny + 12, 16, col);
    const lab = P.up(t(key));
    const tx = W.runs(l, nx + 36, ny + 10, [[lab, {font:"dispS", size:13, color:col}]]);
    if (keys && !on) W.key(l, tx + 6, ny + 13, kk);
    if (id === "tech" && readyCount){
      const bx2 = nx + w - 14 - 20;
      k.rect(l, bx2, ny + 11, 20, 18, "good", {r:9});
      k.text(l, String(readyCount), bx2, ny + 12, {font:"mono", size:11, color:"#04130c", w:20, align:"center"});
    }
    k.hit(l, "tab-" + id, nx, ny, w, nh, () => Screens.setTab(id));
    nx += w + 6;
  });
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
      else { UIM.abTip = a.id; Audio.play("error"); }
      k.dirty();
    }, {cursor:true});
    if (hov || UIM.abTip === a.id) this.abilityTip(l, x + w + 8, yy - 4, a);
    yy += 48;
  });
  if (UIM.abTip === "char") this.charTip(l, x + w + 8, y);
};
Screens.abilityTip = function(l, x, y, a){
  const w = 270; let h = 0;
  const cd = S.actCd[a.id] || 0;
  const note = a.lock ? `${t("unlockAtLv")} ${a.lock}` : cd ? `${t("cooldown")} ${cd} ${t("months")}` : a.target === "country" && !(S.selC && !S.selC.startsWith("R_")) ? t("needCountry") : `${t("cooldownLen")} ${a.cd} ${t("months")}`;
  const draw = (dry) => {
    let yy = y + 8;
    yy += k.text(dry ? null : l, L(a.name), x + 10, yy, {font:"dispS", size:14, w:w - 20, measure:dry}).h;
    yy += k.text(dry ? null : l, L(a.desc), x + 10, yy, {size:12, color:"muted", w:w - 20, lh:1.35, measure:dry}).h + 4;
    yy += k.text(dry ? null : l, note, x + 10, yy, {font:"mono", size:11, color:cd || a.lock ? "warn" : "accent", w:w - 20, measure:dry}).h;
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
  if (this.kind === "game"){
    const ry = 62, rb = 566, zoomed = Map.isCountryZoom();
    const leftLimit = 74, rightLimit = 1264 - this.drawerWidth();
    if (!zoomed){
      for (const r of S.regions){
        const [lat, lon] = RMETA[r.id].lab; const [sx, sy] = Map.latlonScreen(lat, lon);
        if (sy < ry || sy > rb || sx < leftLimit || sx > rightLimit) continue;
        const a = r.id, b = r.co2.toFixed(1);
        const w = k.textW(a, {font:"monoB", size:11}) + 5 + k.textW(b, {font:"mono", size:11}) + 16 + (S.alli[r.id] ? 18 : 0), h = 21;
        const x = sx - w / 2, y = sy - h / 2, sel = S.sel === r.id, hov = k.isHover(l, "lab-" + r.id);
        if (sel) k.rect(l, x - 3, y - 3, w + 6, h + 6, "accent", {r:9, a:.22, bg:true});
        k.rect(l, x, y, w, h, "bg", {a:.8, r:7, stroke:sel || hov ? "accent" : "line", bg:true});
        const ex = W.runs(l, x + 8, y + 2, [[a, {font:"monoB", size:11}]]);
        const ex2 = W.runs(l, ex + 5, y + 2, [[b, {font:"mono", size:11, color:"hot"}]]);
        if (S.alli[r.id]) k.icon(l, "handshake", ex2 + 4, y + 4, 13, "good");
        k.hit(l, "lab-" + r.id, x, y, w, h, () => Screens.selectRegion(r.id, true));
      }
    } else {
      // country labels (major countries in view) with a relation dot
      for (const c of S.countries){
        if (c.rest) continue;
        const pt = P.countryPoint(c.id); if (!pt) continue;
        const [sx, sy] = Map.toScreen(pt[0], pt[1]);
        if (sy < ry || sy > rb || sx < leftLimit || sx > rightLimit) continue;
        const big = COUNTRY[c.id].w >= 250 || Map.cam.z > 2.2;
        if (!big) continue;
        const nm = L(SHORT[c.id] || COUNTRY[c.id].name), sel = S.selC === c.id;
        const w = k.textW(nm, {font:"bodyB", size:10.5}) + 22, h = 18;
        const x = sx - w / 2, y = sy - h / 2;
        k.rect(l, x, y, w, h, "bg", {a:sel ? .92 : .66, r:9, stroke:sel ? "accent" : null, bg:true});
        k.circle(l, x + 9, y + 9, 3.5, W.relCol(c.rel));
        k.text(l, nm, x + 16, y + 1, {font:"bodyB", size:10.5, color:sel ? "accent" : "fg"});
        k.hit(l, "cl-" + c.id, x, y, w, h, () => Screens.selectCountry(c.id));
      }
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
};
