const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.menu) return;
(P.mods = P.mods || {}).menu = 1;
/* =========================================================================
   Screens · loading card, main menu (new game / continue / load / achievements / how to play),
   achievement toasts
   ========================================================================= */
const {Kit, S, t, L, UI, Audio, W, UIM, Screens, ACH} = P;
const k = Kit;

/* ---------------- loading ---------------- */
/* fonts and sound effects are only named in code, so they are loaded here explicitly */
Screens.preloadExtra = function(){
  if (P._extra) return P._extra;
  const g = this.scene.getGame(), fm = g.getFontManager(), sm = g.getSoundManager();
  const fonts = Object.values(Kit.FONT), sounds = [...Audio.SFX.map(n => `sfx-${n}.mp3`), ...Audio.AMB.map(n => `amb-${n}.mp3`)];
  const st = P._extra = {total:fonts.length + sounds.length, done:0, fonts:0};
  const fin = () => { st.done++; };
  fonts.forEach(f => Promise.resolve().then(() => fm.loadResource(f)).catch(() => {}).finally(() => { fin(); st.fonts++; if (st.fonts === fonts.length) Kit.resetFonts(); }));
  sounds.forEach(s => Promise.resolve().then(() => sm.loadResource(s)).catch(() => {}).finally(fin));
  return st;
};
Screens.loaderUpdate = function(dt){
  const g = this.scene.getGame(), ex = this.preloadExtra();
  let p = 1;
  try { p = (g.getSceneLoadingProgress("Menu") + g.getSceneLoadingProgress("Game")) / 2; } catch(e) {}
  if (!(p >= 0)) p = 1;
  p = p * 0.6 + (ex.done / ex.total) * 0.4;
  const shown = this._ldShown || 0, np = Math.min(p, shown + dt * 2.5);   // animate the bar
  if (Math.abs(np - shown) > 0.001){ this._ldShown = np; k.dirty("Loader"); }
  const ready = np >= 0.999;
  if (ready !== this._ldReady){ this._ldReady = ready; k.dirty("Loader"); }
};
Screens.renderLoader = function(l){
  if (!P._extra || P._extra.fonts < Object.keys(Kit.FONT).length) return;   // wait for the fonts
  const w = 440, x = (1280 - w) / 2, y = 250, p = this._ldShown || 0;
  k.text(l, "GLOBAL CLIMATE TASKFORCE · 2026 – 2050", x, y, {font:"mono", size:11, color:"accent", w, align:"center"});
  const parts = [["PROJECT ", {font:"disp", size:52}], [":", {font:"disp", size:52, color:"accent"}], [" 2050", {font:"disp", size:52}]];
  W.runs(l, x + (w - W.runsW(parts)) / 2, y + 22, parts);
  const by = y + 108;
  k.rect(l, x, by, w, 10, "panel2", {r:5});
  if (p > 0.01) k.hgrad(l, x, by, Math.max(10, w * p), 10, [[0, "#1f9e78"], [1, "#8fd0ff"]], {r:5});
  const stage = p < .15 ? t("ldFonts") : p < .35 ? t("ldGlobe") : p < .9 ? t("ldAudio") : p < .999 ? t("ldImg") : t("ldReady");
  k.text(l, p >= .999 ? t("ldReady") : `${t("loading")} · ${stage}`, x, by + 18, {size:12.5, color:"muted"});
  const pct = `${Math.round(p * 100)}%`;
  k.text(l, pct, x + w - k.textW(pct, {font:"mono", size:12.5}), by + 18, {font:"mono", size:12.5, color:"muted"});
  if (this._ldReady){
    const lab = t("enter"), bw = k.textW(lab, {font:"dispS", size:15}) + 40;
    W.btn(l, "enter", x + (w - bw) / 2, by + 52, lab, () => { Audio.play("start"); try { localStorage.setItem("p2050-entered", "1"); } catch(e) {} Screens.goScene("Menu"); }, {w:bw, h:42, size:15, sound:false});
    // the whole screen also works as the button
    k.hit(l, "enterAll", 0, 0, 1280, 720, () => { Audio.play("start"); Screens.goScene("Menu"); }, {cursor:false});
    l.hits.unshift(l.hits.pop());      // keep the real button on top
  }
  k.text(l, t("disclaimer"), 0, 690, {size:11.5, color:"muted", w:1280, align:"center"});
};

/* ---------------- main menu ---------------- */
Screens.renderMenu = function(l){
  if (this.kind !== "menu"){ k.clearSlave("MenuScroll"); return; }
  const sub = UIM.sub, w = sub === "ach" ? 620 : 430, x = 56;
  // dark gradient behind the card so it reads over the map
  k.hgrad(l, 0, 0, w + 140, 720, [[0, "#050b10"], [.7, "#050b10"], [1, "#050b10"]], {a:.0});
  const shade = (this.scene.getObjects("MenuShade") || [])[0];       // gradient sprite placed in the scene
  if (shade) shade.setWidth((w + 200) * k.K);
  let ch = 0;
  k.slave("MenuScroll", s => {
    ch = this.menuCard(s, w);
    const top = Math.max(16, (720 - ch) / 2);
    s.frame(x, top, {x:0, y:0, w:x + w + 40, h:720}, ch + Math.max(0, top - 16));
  });
};
Screens.menuCard = function(l, w){
  const sub = UIM.sub; let y = 0;
  k.text(l, "GLOBAL CLIMATE TASKFORCE · 2026 – 2050", 0, y, {font:"mono", size:11.5, color:"accent"}); y += 22;
  W.runs(l, 0, y, [["PROJECT ", {font:"disp", size:46, lh:1}], [":", {font:"disp", size:46, color:"accent", lh:1}], [" 2050", {font:"disp", size:46, lh:1}]]); y += 46 + 12;
  const tag2 = sub ? (sub === "load" ? t("mLoad") : sub === "ach" ? t("mAch") : t("mHow")) : t("mDesc");
  y += k.text(l, tag2, 0, y, {size:14, color:"muted", w:Math.min(w, 380)}).h + 16;
  const saves = P.readSaves(), auto = saves && saves.auto;
  if (sub === "load"){
    if (saves === null) y += k.text(l, t("noStore"), 0, y, {size:12.5, color:"bad", w}).h + 8;
    else for (const slot of P.SLOTS){
      const m = saves[slot] && saves[slot].meta, lines = P.slotMetaLines(m), sh = 22 + lines.length * 17 + 8;
      W.card(l, 0, y, w, sh, {r:10});
      k.text(l, P.slotName(slot), 12, y + 7, {font:"dispS", size:15});
      lines.forEach((s, i) => k.text(l, s, 12, y + 28 + i * 17, {font:"mono", size:11.5, color:"muted", w:w - 110, max:1}));
      const bw = k.textW(t("load"), {font:"dispS", size:14}) + 30;
      W.btn(l, "load-" + slot, w - 12 - bw, y + (sh - 36) / 2, t("load"), () => { const s2 = P.readSaves(); if (s2 && s2[slot]) Screens.loadSave(s2[slot].S); }, {disabled:!saves[slot]});
      y += sh + 7;
    }
    y += 6;
    k.text(l, t("codePaste"), 0, y, {size:12, color:"muted"}); y += 20;
    const inp = k.input(l, 0, y, w, 70, {readOnly:false, placeholder:"P2050:..."});
    y += 78;
    const bw = W.btn(l, "import", 0, y, t("codeLoad"), () => {
      const o = P.importCode(inp.getString ? inp.getString() : "");
      if (!Screens.loadSave(o)){ UIM.msg = t("codeBad"); UIM.err = true; Audio.play("error"); k.dirty(); }
    }, {kind:"ghost"});
    if (UIM.msg) y += k.text(l, UIM.msg, bw + 12, y + 2, {size:12.5, color:UIM.err ? "bad" : "good", w:w - bw - 12}).h - 30;
    y += 36 + 14;
    W.btn(l, "back", 0, y, t("mBack"), () => { UIM.sub = null; UIM.msg = ""; k.dirty(); const s = k.L("MenuScroll"); if (s) s.scroll = 0; }, {kind:"ghost"}); y += 36;
  } else if (sub === "ach"){
    y += this.achList(l, 0, y, w) + 12;
    W.btn(l, "back", 0, y, t("mBack"), () => { UIM.sub = null; k.dirty(); const s = k.L("MenuScroll"); if (s) s.scroll = 0; }, {kind:"ghost"}); y += 36;
  } else if (sub === "howto"){
    for (const r of [...UI.introRules[S.lang], t("autosaveNote")]){ k.text(l, "•", 0, y, {color:"muted"}); y += k.text(l, r, 16, y, {size:14, w:w - 16}).h + 6; }
    y += 8; W.btn(l, "back", 0, y, t("mBack"), () => { UIM.sub = null; k.dirty(); }, {kind:"ghost"}); y += 36;
  } else {
    const n = P.Ach.count();
    const items = [
      {id:"new", ic:"globe", t1:t("mNew"), t2:t("mNewS"), primary:!auto, fn:() => Screens.newGame()},
      {id:"continue", ic:"play", t1:t("mCont"), t2:auto ? `${P.dateStr(auto.meta.tick)} · ΔT +${auto.meta.temp.toFixed(2)}°C · ${auto.meta.net.toFixed(1)} Gt` : t("mNoSave"), primary:!!auto, dis:!auto, fn:() => { const s2 = P.readSaves(); if (s2 && s2.auto) Screens.loadSave(s2.auto.S); }},
      {id:"loadmenu", ic:"save", t1:t("mLoad"), t2:t("mLoadS"), fn:() => { UIM.sub = "load"; UIM.msg = ""; k.dirty(); }},
      {id:"ach", ic:"trophy", t1:t("mAch"), t2:`${n} / ${ACH.length} · ${Math.round(n / ACH.length * 100)}%`, fn:() => { UIM.sub = "ach"; k.dirty(); }},
      {id:"tutorial", ic:"book-open", t1:t("mHow"), t2:t("mHowS"), fn:() => Screens.openTutorial(0, false)},
    ];
    for (const it of items){
      const hh = 54, hov = !it.dis && k.isHover(l, it.id);
      const fill = it.primary ? (hov ? k.mix("accent", "#ffffff", .2) : "accent") : "panel";
      k.rect(l, 0, y, w, hh, fill, {r:12, a:it.primary ? 1 : .92, stroke:it.primary ? "accent" : hov ? "accent" : "line", bg:true});
      const a = it.dis ? .45 : 1, ink = it.primary ? "ink" : "fg";
      k.icon(l, it.ic, 16, y + (hh - 22) / 2, 22, it.primary ? "ink" : "accent", a);
      k.text(l, it.t1, 54, y + 6, {font:"dispS", size:17, color:ink, a});
      k.text(l, it.t2, 54, y + 30, {font:"mono", size:12, color:it.primary ? "ink" : "muted", a:it.primary ? .75 : a, w:w - 70, max:1});
      k.hit(l, it.id, 0, y, w, hh, () => { Audio.play("click"); it.fn(); }, {disabled:!!it.dis});
      y += hh + 7;
    }
  }
  y += 10;
  // credit
  k.line(l, 0, y, w, y, "line"); y += 12;
  k.text(l, P.up(t("teamK")), 0, y, {font:"mono", size:10.5, color:"muted"}); y += 18;
  y += k.text(l, t("team"), 0, y, {font:"dispS", size:15, lh:1.35, w}).h + 2;
  y += k.text(l, t("disclaimer"), 0, y, {size:12, color:"muted", w}).h + 12;
  y += W.vol(l, 0, y, w) + 10;
  const ft = k.text(l, t("mTag"), 0, y + 6, {size:12, color:"muted", w:w - 96});
  W.langSeg(l, w - 80, y);
  y += Math.max(30, ft.h + 6);
  return y + 10;
};
Screens.achList = function(l, x, y0, w){
  const d = P.AchStore.data, n = P.Ach.count(), pct = Math.round(n / ACH.length * 100);
  let y = y0;
  W.runs(l, x, y, [[String(n), {font:"disp", size:22}], [` / ${ACH.length} · ${pct}%`, {size:13, color:"muted"}]]); y += 32;
  W.meter(l, x, y, w, 5, pct / 100, "accent"); y += 14;
  const cw = (w - 8) / 2, loc = S.lang === "th" ? "th-TH" : "en-GB";
  let col = 0, rowH = 0, rowY = y;
  ACH.forEach((a, i) => {
    const got = d.got[a.id], secret = a.hidden && !got, p = a.prog && !got ? a.prog(d) : null;
    const cx = x + col * (cw + 8), alpha = got ? 1 : .62;
    let ty = rowY + 9;
    ty += k.text(l, secret ? t("achSecret") : L(a.t), cx + 64, ty, {font:"bodyB", size:13.5, w:cw - 74, a:alpha}).h;
    ty += k.text(l, secret ? "???" : L(a.d), cx + 64, ty, {size:12, color:"muted", lh:1.35, w:cw - 74, a:alpha}).h;
    if (got){ ty += k.text(l, `${t("achOn")} ${new Date(got).toLocaleDateString(loc, {dateStyle:"medium"})}`, cx + 64, ty + 1, {font:"mono", size:11, color:"warn"}).h; }
    if (p){ W.meter(l, cx + 64, ty + 4, cw - 74, 5, Math.min(1, p[0] / p[1]), "accent"); ty += 10; ty += k.text(l, `${Math.min(p[0], p[1])} / ${p[1]}`, cx + 64, ty, {font:"mono", size:11, color:"warn", a:alpha}).h; }
    const hh = Math.max(64, ty - rowY + 9);
    a._h = hh; a._x = cx; a._y = rowY;
    rowH = Math.max(rowH, hh);
    // icon box
    if (got) k.hgrad(l, cx + 10, rowY + 10, 44, 44, [[0, "#f2b441"], [1, "#e0612f"]], {r:9});
    else k.rect(l, cx + 10, rowY + 10, 44, 44, "panel2", {r:9, stroke:"line", a:alpha});
    k.icon(l, secret ? "lock" : a.icon, cx + 21, rowY + 21, 22, got ? "#2b1300" : "muted", got ? 1 : alpha);
    col++;
    if (col === 2 || i === ACH.length - 1){
      for (let j = i - col + 1; j <= i; j++){ const b = ACH[j]; k.rect(l, b._x, b._y, cw, rowH, "panel", {r:10, a:.92, stroke:"line", under:true}); }
      rowY += rowH + 8; rowH = 0; col = 0;
    }
  });
  return rowY - y0;
};

/* ---------------- achievement toast ---------------- */
Screens.toastLayerSetup = function(){ UIM.toast = null; UIM.toastT = 0; const l = k.L("Toast"); if (l) l.setOffset(0, 0); };
Screens.toastUpdate = function(dt){
  const l = k.L("Toast"); if (!l) return;
  if (!UIM.toast && UIM.toastQ.length){ UIM.toast = UIM.toastQ.shift(); UIM.toastT = 0; Audio.play("done"); l.dirty = true; }
  if (!UIM.toast) return;
  UIM.toastT += dt;
  const T = UIM.toastT, inT = .35, hold = 4.2, outT = .4;
  let f = T < inT ? T / inT : T < hold ? 1 : Math.max(0, 1 - (T - hold) / outT);
  f = 1 - Math.pow(1 - f, 3);
  l.setOffset((1 - f) * 380, 0); l.setAlpha(f);
  if (T > hold + outT){ UIM.toast = null; l.dirty = true; }
};
Screens.renderToast = function(l){
  const a = UIM.toast; if (!a) return;
  const w = 340, x = 1264 - w, h = 78, y = this.kind === "game" ? 720 - 130 - h - 8 : 720 - 16 - h;
  k.rect(l, x, y, w, h, "panel", {r:12, stroke:"warn", sa:.6, bg:true});
  k.hgrad(l, x + 12, y + 13, 52, 52, [[0, "#f2b441"], [1, "#e0612f"]], {r:10});
  k.icon(l, a.icon, x + 25, y + 26, 26, "#2b1300");
  k.text(l, P.up(t("achUnlocked")), x + 76, y + 10, {size:11, color:"warn"});
  k.text(l, L(a.t), x + 76, y + 26, {font:"dispS", size:16, w:w - 88, max:1});
  k.text(l, L(a.d), x + 76, y + 50, {size:12, color:"muted", w:w - 88, max:1});
};
P.ready = true;
