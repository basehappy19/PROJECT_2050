const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.modals) return;
(P.mods = P.mods || {}).modals = 1;
/* =========================================================================
   Screens · pop-up windows: character select, story, dilemma event, end of game, pause, tutorial
   Veil + window frame on layer "Modal"; content (scrollable) on "ModalScroll".
   Pause / skills / learning page close when you tap outside the window.
   ========================================================================= */
const TUT_SIZES = /*TUTSIZES*/{};
const {Kit, S, t, L, UI, Audio, W, UIM, Screens, TUT, CHARS, CHAR, STORY, ADVISOR, ENDINGS, HAZARDS, COUNTRY, IC} = P;
const k = Kit;
// widths of the website's windows (style.css --modal-sm 640 · --modal-md 820 · --modal-lg 1160, keys 860)
const WIDTH = {intro:640, slotpick:640, tutorial:820, charsel:1160, story:820, learn:1160, end:640, event:640, pause:1160, market:1160, politics:1160, year:640, keys:860};

Screens.renderModal = function(l){
  const kind = UIM.kind();
  l.blocks = !!kind; const sl = k.L("ModalScroll");
  if (!kind){ k.clearSlave("ModalScroll"); return; }
  if (kind === "skills") return this.renderSkills(l);
  const ce = kind === "event" && P.currentEvent(), pw = Math.min(k.W - 24, ce && ce.country ? 900 : (WIDTH[kind] || 620));   // 3.7.4: dispute window is wider (VS) · 3.7.6: market too
  const px = kind === "end" ? k.W - pw - 40 : (k.W - pw) / 2;
  let ch = 0;
  k.slave("ModalScroll", s => {
    if (kind === "event") ch = this.mEvent(s, pw);
    else if (kind === "end") ch = this.mEnd(s, pw);
    else if (kind === "charsel") ch = this.mCharSel(s, pw);
    else if (kind === "story") ch = this.mStory(s, pw);
    else if (kind === "pause") ch = this.mPause(s, pw);
    else if (kind === "tutorial") ch = this.mTutorial(s, pw);
    else if (kind === "learn") ch = this.mLearn(s, pw);
    else if (kind === "market") ch = this.mMarket(s, pw);
    else if (kind === "politics") ch = this.mPolitics(s, pw);
    else if (kind === "year") ch = this.mYear(s, pw);
    else if (kind === "intro") ch = this.mIntro(s, pw);
    else if (kind === "slotpick") ch = this.mSlotPick(s, pw);
    else if (kind === "keys") ch = this.mKeys(s, pw);
    const ph = Math.min(ch, k.H - 30), py = (k.H - ph) / 2;
    s.frame(px, py, {x:px, y:py, w:pw, h:ph}, ch);
    this._modalBox = {px, py, pw, ph};
  });
  const {py, ph} = this._modalBox;
  if (kind === "end"){
    const e = ENDINGS[S.over] || ENDINGS.l3;
    const art = k.sprite(l, "EndArt", S.over === "win" ? `end-win-${S.grade || "A"}` : e.img, 0, (k.H - Math.max(k.W * 9 / 16, k.H)) / 2, Math.max(k.W, k.H * 16 / 9), Math.max(k.W * 9 / 16, k.H));   // keep 16:9, crop top and bottom on wide screens
    if (art.getZOrder() !== -10) art.setZOrder(-10);   // under the window frame
    k.hgrad(l, 0, 0, k.W, k.H, [[0, "#020609"], [.35, "#020609"], [1, "#020609"]], {a:.0, bg:true});
    k.rect(l, px - 40, 0, pw + 80, k.H, "#020609", {a:.55, bg:true});
  } else k.rect(l, 0, 0, k.W, k.H, "#020609", {a:kind === "story" || kind === "intro" ? .8 : .62, bg:true});
  const closer = {keys:() => Screens.closeKeys(), pause:() => Screens.resume(), learn:() => Screens.closeLearn(), market:() => Screens.closeWin(), politics:() => Screens.closeWin(), year:() => Screens.closeWin(), charsel:() => Screens.toMenu(), slotpick:() => { UIM.modal = "charsel"; k.dirty(); }}[kind];
  if (closer){ k.hit(l, "veil", 0, 0, k.W, k.H, () => { Audio.play("close"); closer(); }, {cursor:false}); }
  k.hit(l, "mbox", px, py, pw, ph, () => {}, {cursor:false});
  const border = kind === "end" ? (S.over === "win" ? "good" : "bad") : kind === "year" && UIM.yearRec ? (UIM.yearRec.g ? "good" : "bad") : "line";
  k.rect(l, px + 4, py + 10, pw, ph, "#000000", {a:.35, r:14, bg:true});
  k.rect(l, px, py, pw, ph, "panel", {r:14, stroke:border, sw:kind === "end" ? 1.5 : 1, bg:true, a:kind === "end" ? .94 : 1});
  if (closer && kind !== "year"){ W.hbtn(l, "mclose", px + pw - 40, py + 10, "x", () => { Audio.play("close"); closer(); }, {color:"muted"}); }
  if (sl && sl.content > sl.clip.h){
    const th = Math.max(30, sl.clip.h * sl.clip.h / sl.content), ty = sl.clip.y + (sl.clip.h - th) * (sl.scroll / (sl.content - sl.clip.h));
    k.rect(l, px + pw - 7, ty, 3, th, "line", {r:1.5});
  }
};
const tag = (l, s, x, y, col = "warn") => k.text(l, P.up(s), x, y, {font:"mono", size:11, color:col, iconColor:col});
const h3 = (l, s, x, y, w, size = 23) => k.text(l, s, x, y, {font:"disp", size, lh:1.25, w});
const bullets = (l, list, x, y, w, size = 14, gap = 4) => {
  let yy = y;
  for (const it of list){
    k.text(l, "•", x, yy, {size, color:"muted"});
    yy += k.text(l, it, x + 16, yy, {size, w:w - 16}).h + gap;
  }
  return yy - y;
};

/* ---------------- dilemma event ----------------
   question on top · short situation · each choice as a card with impact arrows (no exact numbers)
   choices unlock after a 1.5 s countdown so a stray tap can't pick one */
const arrows = (up, mag) => { const n = mag < 1 ? 1 : mag < 2.5 ? 2 : 3; return (up ? "▲" : "▼").repeat(n); };
/* 2.1.3: the event's picture at the top of the window, like the website (.event .hero: 210 px, dark fade at the bottom).
   The pictures are packed in sheets (gen-assets.mjs --events); the sheet's sprite shows just this picture's cell. */
const EVART = /*EVENTART*/null;
Screens.eventArt = function(l, id, x, y, w, h){
  const A = EVART && EVART.map && EVART.map[id]; if (!A) return false;
  let go; try { go = k.sprite(l, "EventArt", `events-${A[0]}`, x, y, w, h); } catch(e){ return false; }
  const spr = go.getRendererObject && go.getRendererObject(); if (!spr || !spr.texture || !spr.texture.baseTexture) return false;
  const cache = this._evTex || (this._evTex = {}), base = spr.texture.baseTexture;
  let tex = cache[id]; if (!tex || tex.baseTexture !== base) tex = cache[id] = new PIXI.Texture(base, new PIXI.Rectangle(A[1] * EVART.w, A[2] * EVART.h, EVART.w, EVART.h));
  if (spr.texture !== tex){ spr.texture = tex; go.setWidth(w * k.K); go.setHeight(h * k.K); }
  return true;
};
Screens.mEvent = function(l, pw){
  const e = P.currentEvent(); if (!e) return 100;
  const x = 22, w = pw - 44; let y = 18;
  const where = e.country ? t("evCountryTag") : e.target ? `${t("eventTag")} · ${L(P.RMETA[e.target].name)}` : `${t("eventTag")} · ${t("global")}`;
  const heroH = k.H < 560 ? 150 : 210, titleH = k.textH(L(e.title), {font:"disp", size:heroH < 200 ? 21 : 26, lh:1.25, w});
  if (this.eventArt(l, e.id, 1, 1, pw - 2, heroH)){
    // tags + title sit at the bottom of the picture
    let hy = heroH - 16 - titleH - 26;
    tag(l, `[[${e.country ? "globe" : "siren"}]] ${where}`, x, hy, e.country ? "accent" : "warn");
    if (e.news) tag(l, `[[newspaper]] ${t("realNews")} ${e.news.y}`, x + k.textW(P.up(`[[siren]] ${where}`), {font:"mono", size:11}) + 18, hy, "good");
    k.text(l, L(e.title), x, heroH - 16 - titleH, {font:"disp", size:heroH < 200 ? 21 : 26, lh:1.25, w});
    y = heroH + 4;
  } else {
    tag(l, `[[${e.country ? "globe" : "siren"}]] ${where}`, x, y, e.country ? "accent" : "warn");
    y += 26;
    y += h3(l, L(e.title), x, y, w).h + 6;
  }
  if (e.country) return vsEvent(l, pw, e, x, y, w);
  if (e.country){
    const row = (lab, ids, col) => {
      let yy = y; k.text(l, lab, x, yy + 3, {font:"bodyB", size:12, color:col}); let cx = x + 92;
      for (const id of ids){
        const c = P.C(id), nm = L(COUNTRY[id].name), cw2 = k.textW(nm, {size:12}) + 52;
        if (cx + cw2 > x + w){ cx = x + 92; yy += 28; }
        k.rect(l, cx, yy, cw2, 24, null, {r:12, stroke:col, sa:.6, bg:true});
        k.circle(l, cx + 11, yy + 12, 3.5, W.relCol(c.rel));
        k.text(l, nm, cx + 19, yy + 3, {size:12});
        k.text(l, String(Math.round(c.rel)), cx + cw2 - 30, yy + 4, {font:"mono", size:10.5, color:W.relCol(c.rel), w:24, align:"right"});
        cx += cw2 + 6;
      }
      y = yy + 30;
    };
    row(t("sideA"), e.A, "good"); row(t("sideB"), e.B, "bad"); y += 2;
  }
  y += k.text(l, L(e.desc), x, y, {size:14, w, color:"muted"}).h + 12;
  // the question + countdown
  const locked = UIM.eventLocked(), f = UIM.eventLockFrac();
  const askW = k.text(l, `[[circle-help]] ${t(e.country ? "evAskCountry" : "evAsk")}`, x, y, {font:"dispS", size:16, color:"fg", iconColor:"accent"}).w;
  if (W.speakBtn) W.speakBtn(l, "ev-say", x + askW + 8, y - 3, `${L(e.title)}. ${L(e.desc)}`);
  { const ml = `[[minimize-2]] ${L(P.UI2.evMin)}`, mw = W.btnW(ml, {size:11.5}); W.btn(l, "evmin", x + w - mw, y - 4, ml, () => { UIM.evMin = true; Audio.play("close"); k.dirty(); }, {kind:"ghost", size:11.5, h:28}); }
  y += 30;
  W.meter(l, x, y, w, 4, f, locked ? "warn" : "accent"); y += 12;
  const hard = S.mode === "hard";
  const opts = e.options.map((o, i) => ({o, i, ok:P.affordable(o.fx)}));
  const none = opts.every(q => !q.ok);
  if (none) opts.push({o:{label:{th:UI.postpone.th, en:UI.postpone.en}, fx:P.POSTPONE}, i:-1, ok:true});
  for (const {o, i, ok} of opts){
    const id = "opt" + i, usable = ok && !locked, hov = usable && k.isHover(l, id), a = !ok ? .45 : locked ? .6 : 1;
    const oy = y;
    let cy = oy + 12;
    const letter = i === -1 ? "!" : "ABC"[i];
    k.rect(l, x + 12, cy, 26, 26, hov ? "accent" : "panel", {r:7, stroke:"accent", sa:.6});
    k.text(l, letter, x + 12, cy + 2, {font:"monoB", size:14, color:hov ? "ink" : "accent", w:26, align:"center", a});
    cy += k.text(l, L(o.label), x + 48, cy + 1, {font:"bodyB", size:15, w:w - 60, a}).h + 8;
    if (!hard){
      const chips = P.fxChips(o.fx, e.target);
      let cx = x + 48;
      for (const c of chips){
        const lab = (c.txt.includes(t("sideA")) ? t("sideA") : c.txt.includes(t("sideB")) ? t("sideB") : "") + (c.txt.includes(t("delayed")) ? " " + t("later") : "");
        const ar = arrows(c.up, c.mag || 1), cw2 = 16 + 4 + (lab ? k.textW(lab, {size:11}) + 4 : 0) + k.textW(ar, {font:"mono", size:11}) + 14;
        if (cx + cw2 > x + w - 12){ cx = x + 48; cy += 26; }
        const col = c.good ? "good" : "bad";
        k.rect(l, cx, cy, cw2, 22, null, {r:11, stroke:col, sa:.45, bg:true});
        k.icon(l, c.icon || "circle", cx + 7, cy + 3, 16, "fg", a);
        let tx = cx + 27; if (lab){ k.text(l, lab, tx, cy + 2, {size:11, color:"muted", a}); tx += k.textW(lab, {size:11}) + 4; }
        k.text(l, ar, tx, cy + 3, {font:"mono", size:11, color:col, a});
        cx += cw2 + 6;
      }
      if (!chips.length) k.text(l, "—", cx, cy, {size:12, color:"muted"});
      cy += 26;
      const tilt = i >= 0 && P.tiltOfOption ? P.tiltOfOption(o, e) : null;   // 1.6: who at home likes / dislikes this choice
      if (tilt && tilt.length){ W.groupTilt(l, x + 48, cy, tilt, a); cy += 20; }
    } else { cy += k.text(l, `[[eye-off]] ${t("hardHidden")}`, x + 48, cy, {size:11.5, color:"muted", iconColor:"muted"}).h + 2; }
    if (!ok){ cy += 2; cy += k.text(l, t("cantAfford"), x + 48, cy, {size:12, color:"bad"}).h; }
    cy += 10;
    k.rect(l, x, oy, w, cy - oy, "panel2", {r:12, stroke:hov ? "accent" : "line", sw:hov ? 1.5 : 1, under:true, a:ok ? 1 : .6});
    k.hit(l, id, x, oy, w, cy - oy, () => { if (!UIM.eventLocked()) P.chooseOption(i); }, {disabled:!usable});
    y = cy + 9;
  }
  return y + 12;
};

/* 3.7.4 · dispute between countries (same as the website): the two sides face each other (VS) with their flags and
   say one line each; no friendship numbers. Each choice says which side will be pleased or upset, then the other effects. */
const MOOD = {up:{th:"พอใจ", en:"pleased"}, down:{th:"ไม่พอใจ", en:"upset"}};
function vsSide(l, x, y, w, lab, ids, say, col, right, draw){
  // returns the height; draws only when draw is true
  let yy = y; const al = right ? "right" : "left";
  if (draw) k.text(l, `[[message-circle]] ${lab}`, x, yy, {font:"dispS", size:15, color:col, iconColor:col, w, align:al});
  yy += 24;
  if (say){
    const bw = Math.min(w, 340), bx = right ? x + w - bw : x, th = k.text(null, `“${L(say)}”`, 0, 0, {size:14.5, w:bw - 28, lh:1.4, measure:true}).h, bh = th + 20;
    if (draw){
      k.rect(l, bx, yy, bw, bh, col, {r:14, a:.12, stroke:col, sa:.45, bg:true});
      const tx = right ? bx + bw - 36 : bx + 24; k.poly ? k.poly(l, [[tx, yy + bh - 1], [tx + 12, yy + bh - 1], [tx + 6, yy + bh + 7]], col, {a:.35}) : null;
      k.text(l, `“${L(say)}”`, bx + 14, yy + 10, {size:14.5, w:bw - 28, lh:1.4});
    }
    yy += bh + 14;
  }
  const fw = 66, n = ids.length, rowN = Math.max(1, Math.floor((w + 8) / (fw + 8)));
  ids.forEach((id, i) => {
    const r = Math.floor(i / rowN), c = i % rowN, inRow = Math.min(rowN, n - r * rowN);
    const fx = right ? x + w - inRow * (fw + 8) + 8 + c * (fw + 8) : x + c * (fw + 8), fy = yy + r * 62;
    if (draw){
      const a2 = P.FLAG2 && P.FLAG2[id];
      if (a2) k.sprite(l, "UIFlag", a2, fx + (fw - 44) / 2, fy, 44, 33); else k.rect(l, fx + (fw - 44) / 2, fy, 44, 33, "panel2", {r:4});
      k.rect(l, fx + (fw - 44) / 2, fy, 44, 33, null, {r:4, stroke:"#ffffff", sa:.2});
      k.text(l, L((P.SHORT && P.SHORT[id]) || COUNTRY[id].name), fx - 4, fy + 37, {size:11.5, w:fw + 8, align:"center", max:2, lh:1.2});
    }
  });
  yy += Math.ceil(n / rowN) * 62;
  return yy - y;
}
function vsEvent(l, pw, e, x, y, w){
  const say = (P.CE_SAY || {})[e.id] || {}, narrow = pw < 640, sw = narrow ? w : (w - 70) / 2;
  if (narrow){
    y += vsSide(l, x, y, w, t("sideA"), e.A, say.A, "good", false, true) + 4;
    k.circle(l, x + w / 2, y + 16, 17, "#061015"); k.circle(l, x + w / 2, y + 16, 17, null, {stroke:"warn", sw:2});
    k.text(l, "VS", x + w / 2 - 17, y + 7, {font:"disp", size:14, color:"warn", w:34, align:"center"}); y += 40;
    y += vsSide(l, x, y, w, t("sideB"), e.B, say.B, "bad", false, true) + 8;
  } else {
    const ha = vsSide(l, x, y, sw, t("sideA"), e.A, say.A, "good", false, false), hb = vsSide(l, x + w - sw, y, sw, t("sideB"), e.B, say.B, "bad", true, false), h = Math.max(ha, hb);
    vsSide(l, x, y, sw, t("sideA"), e.A, say.A, "good", false, true); vsSide(l, x + w - sw, y, sw, t("sideB"), e.B, say.B, "bad", true, true);
    const cx = x + w / 2, cy = y + h / 2;
    k.circle(l, cx, cy, 25, "#061015"); k.circle(l, cx, cy, 25, null, {stroke:"warn", sw:2});
    k.text(l, "VS", cx - 25, cy - 11, {font:"disp", size:17, color:"warn", w:50, align:"center"});
    y += h + 12;
  }
  const locked = UIM.eventLocked(), f = UIM.eventLockFrac();
  const askW = k.text(l, `[[circle-help]] ${t("evAskCountry")}`, x, y, {font:"dispS", size:16, color:"fg", iconColor:"accent"}).w;
  if (W.speakBtn) W.speakBtn(l, "ev-say", x + askW + 8, y - 3, `${L(e.title)}. ${say.A ? L(say.A) : ""} ${say.B ? L(say.B) : ""}`);
  { const ml = `[[minimize-2]] ${L(P.UI2.evMin)}`, mw = W.btnW(ml, {size:11.5}); W.btn(l, "evmin", x + w - mw, y - 4, ml, () => { UIM.evMin = true; Audio.play("close"); k.dirty(); }, {kind:"ghost", size:11.5, h:28}); }
  y += 30; W.meter(l, x, y, w, 4, f, locked ? "warn" : "accent"); y += 12;
  const hard = S.mode === "hard", opts = e.options.map((o, i) => ({o, i, ok:P.affordable(o.fx)}));
  if (opts.every(q => !q.ok)) opts.push({o:{label:{th:UI.postpone.th, en:UI.postpone.en}, fx:P.POSTPONE}, i:-1, ok:true});
  const cols = pw >= 700 ? Math.min(3, opts.length) : 1, gap = 10, cw = (w - gap * (cols - 1)) / cols;
  // one card: letter + label · "side: pleased ▲▲" lines · other effects as chips · group tilt
  const card = (q, cx, cy, draw, hgt) => {
    const {o, i, ok} = q, id = "opt" + i, usable = ok && !locked, hov = draw && usable && k.isHover(l, id), a = !ok ? .45 : locked ? .6 : 1, iw = cw - 24;
    let yy = cy + 12;
    if (draw){ k.rect(l, cx + 12, yy, 26, 26, hov ? "accent" : "panel", {r:7, stroke:"accent", sa:.6}); k.text(l, i === -1 ? "!" : "ABC"[i], cx + 12, yy + 2, {font:"monoB", size:14, color:hov ? "ink" : "accent", w:26, align:"center", a}); }
    yy += Math.max(28, (draw ? k.text(l, L(o.label), cx + 46, yy + 2, {font:"bodyB", size:14.5, w:iw - 34, a}) : k.text(null, L(o.label), 0, 0, {font:"bodyB", size:14.5, w:iw - 34, measure:true})).h + 6);
    if (!hard){
      const chips = P.fxChips(o.fx, e.target), side = c => c.icon === "$heart" ? (c.txt.includes(t("sideA")) ? "A" : c.txt.includes(t("sideB")) ? "B" : null) : null;
      for (const c of chips.filter(side)){
        if (draw){ const lw = k.text(l, side(c) === "A" ? t("sideA") : t("sideB"), cx + 12, yy, {size:12.5, color:"muted", a}).w; k.text(l, `${L(MOOD[c.good ? "up" : "down"])} ${arrows(c.up, c.mag || 1)}`, cx + 18 + lw, yy, {font:"bodyB", size:12.5, color:c.good ? "good" : "bad", a}); }
        yy += 19;
      }
      let qx = cx + 12; yy += 4;
      for (const c of chips.filter(c => !side(c))){
        const lab = c.txt.includes(t("delayed")) ? t("later") : "", ar = arrows(c.up, c.mag || 1), w2 = 16 + 4 + (lab ? k.textW(lab, {size:11}) + 4 : 0) + k.textW(ar, {font:"mono", size:11}) + 14;
        if (qx + w2 > cx + cw - 10){ qx = cx + 12; yy += 26; }
        if (draw){ const col = c.good ? "good" : "bad"; k.rect(l, qx, yy, w2, 22, null, {r:11, stroke:col, sa:.45, bg:true}); k.icon(l, c.icon || "circle", qx + 7, yy + 3, 16, "fg", a); let tx = qx + 27; if (lab){ k.text(l, lab, tx, yy + 2, {size:11, color:"muted", a}); tx += k.textW(lab, {size:11}) + 4; } k.text(l, ar, tx, yy + 3, {font:"mono", size:11, color:col, a}); }
        qx += w2 + 6;
      }
      yy += 28;
      const tilt = i >= 0 && P.tiltOfOption ? P.tiltOfOption(o, e) : null;
      if (tilt && tilt.length){ if (draw) W.groupTilt(l, cx + 12, yy, tilt, a); yy += 20; }
    } else { yy += (draw ? k.text(l, `[[eye-off]] ${t("hardHidden")}`, cx + 12, yy, {size:11.5, color:"muted", iconColor:"muted", w:iw}) : {h:18}).h + 2; }
    if (!ok){ if (draw) k.text(l, t("cantAfford"), cx + 12, yy, {size:12, color:"bad"}); yy += 18; }
    yy += 8;
    const hh = hgt || (yy - cy);
    if (draw){ k.rect(l, cx, cy, cw, hh, "panel2", {r:12, stroke:hov ? "accent" : "line", sw:hov ? 1.5 : 1, under:true, a:ok ? 1 : .6}); k.hit(l, id, cx, cy, cw, hh, () => { if (!UIM.eventLocked()) P.chooseOption(i); }, {disabled:!usable}); }
    return yy - cy;
  };
  for (let r = 0; r < opts.length; r += cols){
    const row = opts.slice(r, r + cols), hgt = Math.max(...row.map(q => card(q, 0, 0, false)));
    row.forEach((q, j) => card(q, x + j * (cw + gap), y, true, hgt));
    y += hgt + gap;
  }
  return y + 12;
}

/* ---------------- end of game ---------------- */
const QUOTES = {
  win:{th:"เราทำได้! แต่การดูแลโลกใบนี้ไม่มีวันจบ",en:"We did it! But looking after this planet never really ends."},
  l1:{th:"เราช้าไป... ขอให้คนรุ่นต่อไปเรียนรู้จากวันนี้",en:"We were too slow... may the next generation learn from today."},
  l2:{th:"ถ้าประชาชนไม่เชื่อมั่น นโยบายที่ดีที่สุดก็ไปต่อไม่ได้",en:"Without the people's trust, even the best policy goes nowhere."},
  l3:{th:"ใกล้แล้ว แต่ยังไม่พอ ครั้งหน้าเราต้องเร็วกว่านี้",en:"Close, but not enough. Next time we have to move faster."},
};
Screens.mEnd = function(l, pw){
  const o = S.over, win = o === "win", x = 22, w = pw - 44; let y = 18;
  tag(l, `${P.dateStr()} · ${t("mode_" + S.mode)}`, x, y, win ? "good" : "bad"); y += 18;
  y += h3(l, t(win ? "winTitle" : o + "Title"), x, y, w, 28).h + 2;
  if (win) y += k.text(l, L(ENDINGS.win.grades[S.grade || "A"]), x, y, {font:"dispS", size:16, color:"gold"}).h + 4;
  // 2.1.3: like the website: the 2.0 ending (title + text + the 25 years) when there is one, then the character's line
  if (S.v2 && P.ending2){
    const e2 = P.ending2(), ng = P.goodYears ? P.goodYears() : (S.years || []).filter(q => q.g).length;
    y += 4 + k.text(l, L(e2.title), x, y + 4, {font:"dispS", size:16, color:win ? "good" : "bad", w}).h + 4;
    y += k.text(l, L(e2.body), x, y, {size:14, w, lh:1.45}).h + 10;
    W.runs(l, x, y, [[`${L(P.UI2.yrGoodYears)} `, {size:12, color:"muted"}], [String(ng), {font:"monoB", size:12, color:"good"}], [` / ${(S.years || []).length}`, {size:12, color:"muted"}]]); y += 20;
    y += W.yearStrip(l, x, y, w, {big:true}) + 12;
  } else y += k.text(l, t(win ? "winBody" + (S.grade || "A") : o + "Body"), x, y, {size:14, w}).h + 10;
  // character quote
  const quote = L(P.endQuote ? P.endQuote() : QUOTES[o]);
  const qh = Math.max(64, k.text(null, `“${quote}”`, 0, 0, {size:13, w:w - 96, measure:true}).h + 32);
  W.card(l, x, y, w, qh, {fill:"panel2"});
  W.portrait(l, x + 12, y + (qh - 56) / 2, 56, S.char);
  k.text(l, L(CHAR[S.char].person), x + 80, y + 8, {font:"bodyB", size:12.5, color:CHAR[S.char].color});
  k.text(l, `“${quote}”`, x + 80, y + 26, {size:13, w:w - 96, color:"fg"});
  y += qh + 10;
  const net = P.netCO2();
  const stats = [[t("temp"), `+${S.temp.toFixed(2)}°C`], [t("co2"), `${net.toFixed(1)} Gt`], [t("appr"), `${S.appr.toFixed(0)}%`],
    ["Net Zero", `${Math.round(P.clamp((36 - net) / 36, 0, 1) * 100)}%`], [t("skillsTitle"), `${Object.keys(S.owned).length}/${P.SKILLS.length}`], [t("timePlayed"), P.fmtTime(S.realSec)]];
  const cw = (w - 16) / 3, chh = 54;
  stats.forEach(([a, b], i) => {
    const cx = x + (i % 3) * (cw + 8), cy = y + Math.floor(i / 3) * (chh + 8);
    k.rect(l, cx, cy, cw, chh, "panel2", {r:8, bg:true});
    k.text(l, P.up(a), cx + 10, cy + 6, {size:11, color:"muted", w:cw - 20, max:1});
    k.text(l, b, cx + 10, cy + 24, {font:"monoB", size:17});
  });
  y += 2 * (chh + 8) + 6;
  // the newspaper of the last day (web .paper: THE WORLD TIMES, a headline, what three people say)
  if (P.endPaper){
    const np = P.endPaper(), px2 = x + 14, pw2 = w - 28, y0 = y;
    let py = y + 12;
    k.text(l, "THE WORLD TIMES", px2, py, {font:"logo", size:15, color:"#1d1a14"});
    k.text(l, np.date, px2, py + 2, {font:"mono", size:11, color:"#5a5346", w:pw2, align:"right"});
    py += 22; k.rect(l, px2, py, pw2, 2, "#1d1a14"); py += 8;
    py += k.text(l, L(np.head), px2, py, {font:"dispS", size:18, color:"#111111", w:pw2, lh:1.35}).h + 8;
    for (const q of np.people){
      const th2 = k.textH(L(q.t), {size:13, w:pw2 - 46, lh:1.4}), rh2 = Math.max(34, th2);
      W.portrait(l, px2, py + (rh2 - 34) / 2, 34, q.who);
      k.text(l, L(q.t), px2 + 44, py + (rh2 - th2) / 2, {size:13, color:"#2a261d", w:pw2 - 46, lh:1.4});
      py += rh2 + 7;
    }
    k.rect(l, x, y0, w, py + 3 - y0, "#f3eee2", {r:10, under:true});
    y = py + 3 + 14;
  }
  // your story
  const st = P.endStory();
  W.h3(l, t("yourStory"), x, y, {w}); y += 20;
  const lines = [];
  if (st.best) lines.push(`[[heart-handshake]] ${t("storyBest")}: ${P.cname(st.best)}`);
  if (st.worst) lines.push(`[[${HAZARDS[st.worst.type].icon}]] ${t("storyWorst")}: ${L(HAZARDS[st.worst.type].name)} · ${P.cname(st.worst.c)} · ${P.dateStr(st.worst.tick)}`);
  st.dec.forEach(d => lines.push(`[[git-branch]] ${L(d.title)} → ${L(d.label)}`));
  { const os = P.oreSummary ? P.oreSummary() : null; if (os && os.used) lines.push(`[[$ore]] ${t("oreUsed")} ${os.used}${os.top ? ` · ${t("oreMostFrom")} ${P.cname(os.top)} ${os.share}%` : ""}`); }
  { const im = P.impactSummary && P.impactSummary(); if (im && im.saved > .1) lines.unshift(S.lang === "th" ? `[[leaf]] เทียบกับถ้าไม่ทำอะไรเลย คุณช่วยลด CO₂ ได้ ${im.saved.toFixed(1)} Gt ต่อปี และโลกเย็นกว่า ${Math.max(0, im.bauTemp - S.temp).toFixed(2)}°C` : `[[leaf]] Compared with doing nothing, you cut CO₂ by ${im.saved.toFixed(1)} Gt a year and the world is ${Math.max(0, im.bauTemp - S.temp).toFixed(2)}°C cooler`); }
  if (!lines.length) lines.push(t("storyNone"));
  for (const s of lines) y += k.text(l, s, x, y, {size:13, w, color:"fg", iconColor:"accent"}).h + 3;
  y += 10;
  // what you can do in real life today (web .reallife)
  if (P.realActions){
    W.h3(l, S.lang === "th" ? "สิ่งที่คุณทำได้จริงวันนี้" : "What you can do in real life today", x, y, {w}); y += 22;
    for (const a of P.realActions()){
      const th2 = k.textH(L(a.t), {size:13, w:w - 54, lh:1.45}), rh2 = th2 + 18;
      k.rect(l, x, y, w, rh2, "good", {r:10, a:.1, stroke:"good", sa:.3});
      k.icon(l, a.icon, x + 11, y + 9, 20, "good");
      k.text(l, L(a.t), x + 40, y + 9, {size:13, w:w - 54, lh:1.45});
      y += rh2 + 7;
    }
    y += 6;
  }
  // reward
  const rw = UIM.reward;
  let rtxt;
  if (!rw) rtxt = `[[loader]] ${t("rewardWait")}`;
  else if (rw.guest) rtxt = `${t("rewardGuest")} · XP +${rw.xp}`;
  else if (rw.error) rtxt = `${t("rewardFail")} · XP +${rw.xp || 0}`;
  else rtxt = null;
  const rh = 50;
  W.card(l, x, y, w, rh, {fill:"bg", stroke:rw && !rw.guest && !rw.error ? "good" : "line"});
  if (rtxt) k.text(l, rtxt, x + 12, y + 14, {size:12.5, color:"muted", w:w - 24, max:2, iconColor:"muted"});
  else {
    let cx = x + 12;
    cx += W.terra(l, cx, y + 13, `+${rw.terra}`, {size:16, color:"good"}) + 12;
    cx = W.runs(l, cx, y + 14, [[`XP +${rw.xp}`, {font:"monoB", size:14, color:"accent"}]]) + 12;
    if (rw.levelUp) k.text(l, `[[star]] ${t("levelUp")} ${rw.level}`, cx, y + 15, {size:13, color:"gold", iconColor:"gold"});
    if (rw.note) k.text(l, rw.note, x + 12, y + 34, {size:10.5, color:"muted", w:w - 24, max:1});
  }
  y += rh + 12;
  k.text(l, P.up(t("finalScore")), x, y, {size:12, color:"muted"});
  k.text(l, P.score().toLocaleString(), x, y + 16, {font:"disp", size:38, color:"accent", lh:1.1});
  let bx = x + w;
  const wR = W.btnW(t("restart")), wM = W.btnW(t("mainMenu"));
  // a win can go on as the same world with no end year (web G.continueWorld)
  if (win){ const pl = `[[infinity]] ${t("playOn")}`, wP = W.btnW(pl); bx -= wP; W.btn(l, "playon", bx, y + 22, pl, () => Screens.continueWorld(), {kind:"gold"}); bx -= 8; }
  bx -= wR; W.btn(l, "restart", bx, y + 22, t("restart"), () => { Audio.stopAmb(300); UIM.worldSel = !!S.world; UIM.reward = null; UIM.modal = "charsel"; S.over = null; S.started = false; P.newGame(S.lang, {mode:S.mode, char:S.char}); P.Map.refresh(); k.dirty(); });
  bx -= wM + 8; W.btn(l, "tomenu", bx, y + 22, t("mainMenu"), () => Screens.toMenu(), {kind:"ghost"});
  return y + 22 + 36 + 22;
};

/* ---------------- character select + mode ---------------- */
Screens.mCharSel = function(l, pw){
  // 2.1.3: laid out like the website's CharSel (ui/modals.jsx): six photo cards in one row, four modes, footer
  const x = 22, w = pw - 44; let y = 20;
  tag(l, t("introTag"), x, y, "accent"); y += 18;
  y += h3(l, t("charTitle"), x, y, w - 50).h + 2;
  y += k.text(l, t("charSub"), x, y, {size:13.5, color:"muted", w}).h + 14;
  const sel = UIM.charSel || "sci", n = CHARS.length, cols = w >= 900 ? n : w >= 560 ? 3 : 2, gap = cols === n ? 10 : 12;
  const cw = (w - gap * (cols - 1)) / cols, ph = Math.round(cw * 4.6 / 4), iw = cw - 20;
  // the cards in a row are the same height (the tallest one)
  const info = c => {
    let h = 26 + 18;   // name + person
    if (c.bio) h += k.textH(L(c.bio), {size:12, w:iw, lh:1.45}) + 6;
    h += 4 + 6 + k.textH(L(c.pas), {size:12, w:iw, lh:1.35}) + 6 + c.acts.length * 18;
    if (!P.Net.owns("char_" + c.id)) h += 20;
    return h + 12;
  };
  const rows = []; for (let i = 0; i < n; i += cols) rows.push(Math.max(...CHARS.slice(i, i + cols).map(info)));
  let ry = y;
  CHARS.forEach((c, i) => {
    const col = i % cols, row = Math.floor(i / cols); if (col === 0 && row) ry += ph - 28 + rows[row - 1] + gap;
    const cx = x + col * (cw + gap), cy = ry, chH = ph - 28 + rows[row];
    const owned = P.Net.owns("char_" + c.id), on = sel === c.id, id = "ch-" + c.id, hov = k.isHover(l, id);
    const xp = P.Net.charXp(c.id), lv = P.levelOf(xp), lift = hov && !on ? -3 : 0, Y = cy + lift;
    k.rect(l, cx, Y, cw, chH, "#061015", {r:14, a:.6, bg:true});
    if (on) k.rect(l, cx - 2, Y - 2, cw + 4, chH + 4, null, {r:16, stroke:c.color, sw:2});
    k.sprite(l, "Portrait", owned ? `card-${c.id}-${P.outfitOf(c.id)}` : `card-${c.id}-locked`, cx + 1, Y + 1, cw - 2, ph);
    k.rect(l, cx, Y, cw, chH, null, {r:14, stroke:on ? c.color : hov ? c.color : "line", sw:on ? 2 : 1});
    // level tag (top left) · lock (top right)
    const lt = `Lv ${lv}`, lw = k.textW(lt, {font:"mono", size:11}) + 14;
    k.rect(l, cx + 10, Y + 10, lw, 20, "#061015", {r:6, a:.85}); k.text(l, lt, cx + 17, Y + 12, {font:"mono", size:11, color:c.color});
    if (!owned){ k.circle(l, cx + cw - 27, Y + 27, 17, "#061015", {a:.85, stroke:"line"}); k.icon(l, "lock", cx + cw - 36, Y + 18, 18, "fg"); }
    let ty = Y + ph - 28;
    ty += k.text(l, L(c.name), cx + 10, ty, {font:"dispS", size:18, w:iw, max:1}).h + 2;
    ty += k.text(l, L(c.person), cx + 10, ty, {font:"mono", size:12, color:c.color, w:iw, max:1}).h + 4;
    if (c.bio) ty += k.text(l, L(c.bio), cx + 10, ty, {size:12, color:"muted", w:iw, lh:1.45}).h + 6;
    const nx = P.LEVELS[lv] ?? null, pv = P.LEVELS[lv - 1];
    W.meter(l, cx + 10, ty, iw, 4, nx ? (xp - pv) / (nx - pv) : 1, c.color); ty += 10;
    ty += k.text(l, L(c.pas), cx + 10, ty, {size:12, color:"muted", w:iw, lh:1.35}).h + 6;
    for (const ab of c.acts) ty += Math.max(18, k.text(l, `[[${ab.icon}]] ${L(ab.name)}${ab.lv ? ` (Lv${ab.lv})` : ""}`, cx + 10, ty, {size:12, w:iw, max:1, iconColor:c.color}).h);
    if (!owned) k.text(l, `[[$credit]] ${P.shopPrice ? P.shopPrice({id:"char_" + c.id, price:c.price}) : c.price}`, cx + 10, ty + 2, {font:"mono", size:12, color:"gold", w:iw, max:1, iconColor:"#ffffff"});
    k.hit(l, id, cx, cy, cw, chH, () => { Audio.play(owned ? "select" : "error"); if (owned){ UIM.charSel = c.id; UIM.msg = ""; } else UIM.msg = t("charLocked"); k.dirty(); });
    if (i === n - 1) y = ry + chH + 16;
  });
  // mode
  W.h3(l, t("modeTitle"), x, y, {w}); y += 24;
  const modes = UIM.worldSel ? [["normal", "infinity"]] : [["fast", "zap"], ["normal", "globe"], ["hard", "skull"], ["daily", "calendar-check"]];   // 3.x: Fast mode (shared engine)
  const mc = w >= 700 ? modes.length : 2, mw = (w - (mc - 1) * 10) / mc, mh = 62;
  modes.forEach(([m, ic], i) => {
    const mx = x + (i % mc) * (mw + 10), my = y + Math.floor(i / mc) * (mh + 10), on = UIM.modeSel === m, id = "md-" + m, hov = k.isHover(l, id);
    const locked = m === "hard" && !UIM.worldSel && P.hardUnlocked && !P.hardUnlocked();
    const oc = !on ? "muted" : m === "hard" ? "bad" : m === "fast" ? "gold" : "accent";
    k.rect(l, mx, my, mw, mh, on ? "panel2" : "#061015", {r:10, a:on ? 1 : .6, stroke:on ? oc : hov && !locked ? "accent" : "line", sw:on ? 2 : 1, bg:true});
    k.icon(l, locked ? "lock" : ic, mx + 14, my + (mh - 22) / 2, 22, oc, locked ? .55 : 1);
    k.text(l, t("mode_" + m), mx + 48, my + 10, {font:"dispS", size:15, a:locked ? .55 : 1});
    k.text(l, locked ? t("hardLocked") : t("modeD_" + m), mx + 48, my + 32, {size:12, color:on ? oc : "muted", w:mw - 58, max:2, lh:1.3, a:locked ? .55 : 1});
    k.hit(l, id, mx, my, mw, mh, () => {
      if (locked){ Audio.play("error"); UIM.msg = t("hardLockedMsg"); UIM.err = true; k.dirty(); return; }
      Audio.play("click"); UIM.modeSel = m; k.dirty(); });
  });
  y += Math.ceil(modes.length / mc) * (mh + 10) + 6;
  if (UIM.msg){ y += k.text(l, UIM.msg, x, y, {size:12.5, color:"warn", w}).h + 6; }
  const go = () => {
    const ch = UIM.charSel || "sci"; if (!P.Net.owns("char_" + ch)) return;
    if (UIM.modeSel === "hard" && !UIM.worldSel && P.hardUnlocked && !P.hardUnlocked()){ UIM.msg = t("hardLockedMsg"); UIM.err = true; Audio.play("error"); k.dirty(); return; }
    UIM.msg = ""; UIM.modal = null;
    Screens.startOrPick({mode:UIM.worldSel ? "normal" : UIM.modeSel, char:ch, charLv:P.levelOf(P.Net.charXp(ch)), seed:UIM.modeSel === "daily" ? P.dailySeed() : undefined, world:!!UIM.worldSel});
  };
  // footer like the website: "How to play" (ghost) on the left, "Start" on the right
  const sl = `${t("start")} [[play]]`, sw = W.btnW(sl, {size:15}) + 24;
  W.btn(l, "start", x + w - sw, y, sl, go, {size:15, w:sw, h:42});
  W.btn(l, "csTut", x, y + 3, `[[graduation-cap]] ${t("tutMenu")}`, () => Screens.openTutorial ? Screens.openTutorial(0, true) : P.Train.start(), {kind:"ghost"});
  return y + 42 + 20;
};

/* ---------------- story (comic panels) ---------------- */
Screens.mStory = function(l, pw){
  const st = STORY.find(a => a.act === UIM.storyAct) || STORY[0];
  const x = 22, w = pw - 44; let y = 18;
  tag(l, `[[book-open]] ${t("storyTag")}`, x, y, "accent"); y += 18;
  y += h3(l, L(st.title), x, y, w).h + 10;
  const n = st.panels.length, cols = 2, gw = (w - 12) / cols, gh = 150;
  const age = Math.min(1, (performance.now() - (UIM.storyT || 0)) / 450);
  st.panels.forEach((p, i) => {
    if (i > UIM.storyI) return;
    const cx = x + (i % cols) * (gw + 12), cy = y + Math.floor(i / cols) * (gh + 12), a = i === UIM.storyI ? age : 1;
    k.rect(l, cx, cy, gw, gh, p.bg, {r:12, stroke:"line", a, bg:true});
    k.icon(l, p.icon, cx + gw - 92, cy + 16, 76, "#ffffff", .16 * a);
    // 2.0: panels can be said by the player, the advisor or one of the story people (P.NPC), and the words can depend on the character
    const w0 = P.panelWho ? P.panelWho(p) : p.who, me = w0 === "me", npc = P.NPC && P.NPC[w0], who = me ? S.char : npc ? w0 : "adv";
    const col = me ? CHAR[S.char].color : npc ? npc.color : "#c3a6ff";
    W.portrait(l, cx + 12, cy + 12, 56, who, {a, ring:col});
    const nm = me ? L(CHAR[S.char].person) : npc ? L(npc.name) : L(ADVISOR.name);
    k.text(l, nm, cx + 78, cy + 14, {font:"bodyB", size:12, color:col, w:gw - 90, max:2, lh:1.25, a});
    // speech bubble (the current panel types itself out)
    const say = L(P.panelSay ? P.panelSay(p) : p.say), cur = i === UIM.storyI;
    const ty = cur && P.typed ? P.typed(say, UIM.storyT || 0) : {s:say, done:true};
    if (cur){ if (ty.done !== UIM.storyTyped){ UIM.storyTyped = ty.done; } if (!ty.done && Math.floor((performance.now() - (UIM.storyT || 0)) / 170) !== UIM._typeBeat){ UIM._typeBeat = Math.floor((performance.now() - (UIM.storyT || 0)) / 170); Audio.play("type", {vol:.35}); } }
    const th2 = k.text(null, say, 0, 0, {size:13.5, w:gw - 40, measure:true}).h;
    const by2 = cy + 76;
    k.rect(l, cx + 12, by2 - 6, gw - 24, Math.min(gh - 76, th2 + 12), "#ffffff", {r:10, a:.94 * a});
    k.poly(l, [cx + 34, by2 - 6, cx + 46, by2 - 6, cx + 38, by2 - 16], "#ffffff", {a:.94 * a});
    k.text(l, ty.s, cx + 20, by2, {size:13.5, color:"#0b1a20", w:gw - 40, a});
  });
  y += Math.ceil((UIM.storyI + 1) / cols) * (gh + 12) + 6;
  const last = UIM.storyI >= n - 1;
  const nl = last ? `${t("storyGo")} [[play]]` : `${t("tutNext")} [[chevron-right]]`, nw = W.btnW(nl);
  W.btn(l, "snext", x + w - nw, y, nl, () => Screens.storyNext());
  const skW = W.btn(l, "sskip", x, y, t("tutSkip"), () => Screens.storySkip(), {kind:"ghost"});
  if (W.speakBtn){ const pp = st.panels[Math.min(UIM.storyI, n - 1)]; W.speakBtn(l, "st-say", x + skW + 8, y + 4, L(P.panelSay ? P.panelSay(pp) : pp.say), P.narrWho ? P.narrWho(pp) : ""); }
  if (P.hasKeyboard()) k.text(l, t("storyKeys"), x + 130, y + 10, {font:"mono", size:10.5, color:"muted"});
  return y + 36 + 20;
};

/* ---------------- one save slot (pause window): save · load · delete (asks first) ----------------
   a game can save over its own slot or one of the same mode, never a game of another mode */
Screens.slotRow = function(l, x, y, w, slot, saves, inGame){
  const s = saves && saves[slot], m = s && s.meta, ok = s && P.validSave(s.S), cur = inGame && S.started && S.saveSlot === slot && m && m.id === S.saveId;
  const canSave = inGame && P.slotFree(slot, saves) && !(S.mode === "hard" && slot !== S.saveSlot);
  const lines = ok || !s ? P.slotMetaLines(ok ? m : null) : [t("oldSave")];
  const note = inGame && m && !canSave && !cur ? (S.mode === "hard" ? t("hardNoManual") : t("slotOtherMode")) : "";
  const sh = 28 + lines.length * 17 + (note ? 18 : 0) + 8;
  W.card(l, x, y, w, sh, {r:10, stroke:cur ? "accent" : null});
  k.text(l, `${P.slotName(slot, m)}${cur ? " ●" : ""}`, x + 12, y + 7, {font:"dispS", size:15, color:cur ? "accent" : "fg", w:w - 290, max:1});
  lines.forEach((q, i) => k.text(l, q, x + 12, y + 28 + i * 17, {font:"mono", size:11.5, color:"muted", w:w - 290, max:1}));
  if (note) k.text(l, note, x + 12, y + 28 + lines.length * 17, {size:11, color:"muted", w:w - 290, max:1});
  // buttons from the right
  let bx = x + w - 12; const by = y + (sh - 32) / 2;
  if (m){
    if (UIM.askDel === slot){
      W.hbtn(l, "sdx-" + slot, bx - 32, by, "x", () => { UIM.askDel = null; k.dirty(); }, {s:32, color:"muted"}); bx -= 40;
      const dl = `[[trash-2]] ${t("slotDelSure")}`, dw = W.btnW(dl, {size:12.5});
      W.btn(l, "sdy-" + slot, bx - dw, by, dl, () => { P.deleteSlot(slot); UIM.askDel = null; UIM.msg = `${t("slotDeleted")} · ${P.slotName(slot)}`; UIM.err = false; k.dirty(); }, {kind:"danger", size:12.5, h:32}); bx -= dw + 8;
    } else { W.hbtn(l, "sd-" + slot, bx - 32, by, "trash-2", () => { UIM.askDel = slot; k.dirty(); }, {s:32, color:"muted"}); bx -= 40; }
  }
  if (ok && !cur && UIM.askDel !== slot){ const ll = `[[folder-open]] ${t("load")}`, lw = W.btnW(ll, {size:12.5}); W.btn(l, "sl-" + slot, bx - lw, by, ll, () => { const s2 = P.readSaves(); if (s2 && s2[slot]) Screens.loadSave(s2[slot].S, slot); }, {kind:inGame ? "ghost" : "primary", size:12.5, h:32}); bx -= lw + 8; }
  if (inGame && UIM.askDel !== slot){
    const sl = `[[save]] ${t("save")}`, sw = W.btnW(sl, {size:12.5});
    W.btn(l, "save-" + slot, bx - sw, by, sl, () => {
      Audio.play("save"); P.Ach.unlock("saver");
      const done = P.writeSlot(slot);
      UIM.msg = done ? `${t("saved")} · ${P.slotName(slot)}` : t("noStore"); UIM.err = !done;
      if (done && P.Net.user) P.Net.cloudSave(slot).then(r => { UIM.msg = r ? `${t("saved")} · ${P.slotName(slot)} · ${t("cloudOk")}` : UIM.msg; k.dirty(); });
      k.dirty();
    }, {kind:"ghost", size:12.5, h:32, disabled:!canSave, sound:false});
  }
  return sh;
};

/* ---------------- pause ---------------- */
Screens.mPause = function(l, pw){
  // 2.1.3: two columns like the website's Pause (ui/modals.jsx): left = date, title, time, Resume and the action tiles;
  // right = the save slots or the settings
  const th = S.lang === "th", tab = UIM.pzTab || "saves", narrow = pw < 760;
  const x = 22, w = pw - 44, sw = narrow ? w : 250, mx = narrow ? x : x + sw + 22, mw = narrow ? w : w - sw - 22;
  let y = 20;
  tag(l, `${P.dateStr()} · ${t("mode_" + S.mode)}`, x, y); y += 20;
  y += h3(l, t("pTitle"), x, y, sw - (narrow ? 40 : 0)).h + 4;
  y += k.text(l, `[[timer]] ${P.fmtTime(S.realSec)}`, x, y, {font:"mono", size:12, color:"muted", iconColor:"muted"}).h + 10;
  W.btn(l, "resume", x, y, `[[play]] ${t("pResume")}`, () => Screens.resume(), {w:sw, h:44, size:15}); y += 44 + 12;
  const acts = [];
  acts.push(["save", th ? "บันทึก" : "Saves", () => { UIM.pzTab = "saves"; k.dirty(); }, tab === "saves"]);
  acts.push(["settings", th ? "ตั้งค่า" : "Settings", () => { UIM.pzTab = "settings"; k.dirty(); }, tab === "settings"]);
  acts.push(["graduation-cap", th ? "วิธีเล่น" : "How to", () => Screens.openTutorial(0, false)]);
  acts.push(["book-open", th ? "เรียนรู้" : "Learn", () => Screens.openLearn()]);
  if (P.hasKeyboard()) acts.push(["keyboard", th ? "ปุ่มลัด" : "Keys", () => Screens.openKeys()]);
  if (Screens.fsOK()) acts.push([Screens.isFull() ? "minimize" : "maximize", th ? "เต็มจอ" : "Full", () => Screens.fullscreen()]);
  acts.push(["log-out", th ? "เมนูหลัก" : "Menu", () => Screens.toMenu()]);
  const cols = narrow ? 3 : 2, aw = (sw - (cols - 1) * 8) / cols, ah = 64;
  acts.forEach(([ic, lab, fn, on], i) => {
    const ax = x + (i % cols) * (aw + 8), ay = y + Math.floor(i / cols) * (ah + 8), id = "pz-" + ic, hov = k.isHover(l, id);
    k.rect(l, ax, ay, aw, ah, on ? "accent" : "panel", {r:10, a:on ? .12 : .7, stroke:on || hov ? "accent" : "line", bg:true});
    k.icon(l, ic, ax + aw / 2 - 10, ay + 12, 20, on ? "accent" : "fg");
    k.text(l, lab, ax, ay + 37, {font:"dispS", size:13, color:on ? "accent" : "fg", w:aw, align:"center", max:1});
    k.hit(l, id, ax, ay, aw, ah, () => { Audio.play("click"); fn(); });
  });
  const sideBottom = y + Math.ceil(acts.length / cols) * (ah + 8);
  // right column
  let my = narrow ? sideBottom + 10 : 50;
  if (tab === "settings"){
    k.icon(l, "languages", mx, my + 6, 18, "accent"); k.text(l, th ? "ภาษา" : "Language", mx + 28, my + 5, {size:13.5});
    W.langSeg(l, mx + mw - 80, my + 2); my += 40;
    my += W.vol(l, mx, my, mw) + 12;
    { const G = P.Gfx; k.icon(l, "monitor", mx, my + 7, 18, "accent"); k.text(l, t("gfxLbl"), mx + 28, my + 6, {size:13.5, w:120, max:1});
      W.seg(l, mx + mw - 180, my + 1, [["low", "gfxLow"], ["high", "gfxHigh"]].map(([id, key]) => ({id:"pgfx-" + id, label:t(key), on:G.level === id, fn:() => { Audio.play("click"); G.set(id); k.dirty(); }})), {w:90, h:30, font:"body", fontOn:"bodyB", size:12.5}); my += 40; }
    if (W.a11yRows) my += W.a11yRows(l, mx, my, mw) + 10;
  } else {
    const saves = P.readSaves();
    if (S.mode === "hard") my += k.text(l, `[[skull]] ${t("hardSaves")}`, mx, my, {size:12.5, color:"warn", w:mw, iconColor:"warn"}).h + 8;
    if (saves === null){ my += k.text(l, t("noStore"), mx, my, {size:12.5, color:"bad", w:mw}).h + 10; }
    else {
      for (const slot of P.SLOTS) my += this.slotRow(l, mx, my, mw, slot, saves, true) + 10;
      // 1.5.4: delete every save slot at once (asks first) — on the right, like the website
      const n = P.SLOTS.filter(q => saves[q] && saves[q].meta).length;
      if (n){
        if (UIM.askClear){
          k.text(l, t("slotClearSure").replace("{N}", n), mx, my + 8, {size:12.5, color:"bad", w:mw - 220, max:2});
          const dl = `[[trash-2]] ${t("slotDelSure")}`, dw = W.btnW(dl, {size:12.5}), cl = t("cancel"), cw2 = W.btnW(cl, {size:12.5});
          W.btn(l, "clr-yes", mx + mw - dw - cw2 - 8, my, dl, () => { P.SLOTS.forEach(q => { if (saves[q] && saves[q].meta) P.deleteSlot(q); }); UIM.askClear = false; UIM.msg = t("slotCleared"); UIM.err = false; k.dirty(); }, {kind:"danger", size:12.5, h:32});
          W.btn(l, "clr-no", mx + mw - cw2, my, cl, () => { UIM.askClear = false; k.dirty(); }, {kind:"ghost", size:12.5, h:32});
        } else { const cl = `[[trash-2]] ${t("slotClear")}`; W.btn(l, "clr", mx + mw - W.btnW(cl, {size:12.5}), my, cl, () => { UIM.askClear = true; k.dirty(); }, {kind:"ghost", size:12.5, h:32}); }
        my += 40;
      }
    }
  }
  if (UIM.msg){ my += k.text(l, UIM.msg, mx, my, {size:12.5, color:UIM.err ? "bad" : "good", w:mw}).h + 8; }
  return Math.max(sideBottom, my) + 14;
};

/* ---------------- tutorial (real screenshots) ---------------- */
Screens.mTutorial = function(l, pw){
  const n = TUT.length, i = UIM.tutI, st = TUT[i], last = i === n - 1;
  const anim = st.img.replace(/\.(jpg|png)$/, "");
  const sz = TUT_SIZES[anim] || [16, 9];
  const boxH = 300, maxW = pw;
  let iw = maxW, ih = iw * sz[1] / sz[0]; if (ih > boxH){ ih = boxH; iw = ih * sz[0] / sz[1]; }
  k.rect(l, 0, 0, pw, boxH, "#000000", {r:14, bg:true});
  k.sprite(l, "TutImage", anim, (pw - iw) / 2, (boxH - ih) / 2, iw, ih);
  k.line(l, 0, boxH, pw, boxH, "line");
  const x = 20, w = pw - 40; let y = boxH + 14;
  k.text(l, `${i + 1} / ${n}`, x, y, {font:"mono", size:11, color:"accent"}); y += 18;
  y += h3(l, L(st.title), x, y, w).h + 6;
  y += bullets(l, st.body[S.lang], x, y, w, 14.5, 5) + 8;
  const dw = (n - 1) * 14 + 26; let dx = (pw - dw) / 2;
  for (let d = 0; d < n; d++){ const on = d === i; k.rect(l, dx, y, on ? 20 : 8, 8, on ? "accent" : "line", {r:4}); dx += (on ? 20 : 8) + 6; }
  y += 22;
  const tsW = W.btn(l, "tskip", x, y, t("tutSkip"), () => Screens.tutAct("skip"), {kind:"ghost"});
  if (W.speakBtn) W.speakBtn(l, "tut-say", x + tsW + 8, y + 4, `${L(st.title)}. ${st.body[S.lang].join(" ")}`, "adv");
  const nl = last ? t("tutDone") : `${t("tutNext")} [[chevron-right]]`;
  const nw = W.btnW(nl);
  W.btn(l, "tnext", x + w - nw, y, nl, () => Screens.tutAct(last ? "done" : "next"));
  if (i){ const bl = `[[chevron-left]] ${t("tutBack")}`, bw = W.btnW(bl); W.btn(l, "tback", x + w - nw - 8 - bw, y, bl, () => Screens.tutAct("back"), {kind:"ghost"}); }
  return y + 36 + 20;
};

/* 3.9: every keyboard shortcut (the same list as the website, engine/44-keys.js) */
const KCOL = {accent:"accent", sky:"sky", purple:"purple", gold:"gold", pink:"#ff7aa8", muted:"muted"};
Screens.kbd = (l, key, x, y, draw = true) => {
  const w = Math.max(24, k.textW(key, {font:"monoB", size:12}) + 12);
  if (draw){ k.rect(l, x, y, w, 24, "#1d3640", {r:6, stroke:"#36606b", bg:true}); k.rect(l, x + 1, y + 21, w - 2, 3, "#36606b", {r:2}); k.text(l, key, x, y + 3, {font:"monoB", size:12, w, align:"center"}); }
  return w;
};
Screens.mKeys = function(l, pw){
  const x = 20, w = pw - 40; let y = 18;
  y += h3(l, `[[keyboard]] ${S.lang === "th" ? "ปุ่มลัด" : "Keyboard shortcuts"}`, x, y, w - 40).h + 12;
  const cols = w >= 760 ? 3 : 2, gw = (w - (cols - 1) * 10) / cols;
  const heights = P.KEYS.map(g => 34 + g.keys.reduce((s2, [ks, what]) => s2 + Math.max(28, k.textH(L(what), {size:12.5, w:gw - 24 - ks.reduce((a, q) => a + Screens.kbd(null, q, 0, 0, false) + 3, 0) - 8}) + 6), 0) + 8);
  for (let r = 0; r < P.KEYS.length; r += cols){
    const rowH = Math.max(...heights.slice(r, r + cols));
    P.KEYS.slice(r, r + cols).forEach((g, j) => {
      const gx = x + j * (gw + 10), col = KCOL[g.col] || "accent";
      k.rect(l, gx, y, gw, rowH, "panel2", {r:12, stroke:"line", bg:true});
      k.icon(l, g.icon, gx + 12, y + 11, 16, col);
      k.text(l, L(g.name), gx + 34, y + 8, {font:"dispS", size:14, color:col});
      let yy = y + 34;
      for (const [ks, what] of g.keys){
        let kx = gx + 12; for (const q of ks) kx += Screens.kbd(l, q, kx, yy) + 3;
        const tw = gw - (kx - gx) - 16, th2 = k.text(l, L(what), kx + 5, yy + 3, {size:12.5, w:tw}).h;
        yy += Math.max(28, th2 + 6);
      }
    });
    y += rowH + 10;
  }
  return y + 10;
};

/* 2.1.3: after a win, keep playing the same world with no end year (like web G.continueWorld) */
Screens.continueWorld = function(){
  if (S.over !== "win") return;
  S.world = true; S.worldStart = S.tick; S.over = null; S.era = "heal"; S.firstNZ = S.firstNZ || S.tick; UIM.reward = null; UIM.modal = null;
  if (P.addLog) P.addLog(`[[sprout]] ${t("worldCont")}`, "gd");
  P.autosave(); Audio.stopAmb(400); if (Audio.setMood) Audio.setMood("calm", true); if (P.Ach) P.Ach.unlock("world1");
  P.Map.refresh && P.Map.refresh(); k.dirty();
};
