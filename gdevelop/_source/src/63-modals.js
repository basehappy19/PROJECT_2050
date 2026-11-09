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
const WIDTH = {intro:640, slotpick:620, tutorial:720, charsel:1150, story:800, learn:980, end:640, event:660, pause:680, market:940, politics:860, year:600, keys:860};

Screens.renderModal = function(l){
  const kind = UIM.kind();
  l.blocks = !!kind; const sl = k.L("ModalScroll");
  if (!kind){ k.clearSlave("ModalScroll"); return; }
  if (kind === "skills") return this.renderSkills(l);
  const ce = kind === "event" && P.currentEvent(), pw = Math.min(k.W - 24, ce && ce.country ? 900 : kind === "market" ? 1140 : (WIDTH[kind] || 620));   // 3.7.4: dispute window is wider (VS) · 3.7.6: market too
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
  const closer = {keys:() => Screens.closeKeys(), pause:() => Screens.resume(), learn:() => Screens.closeLearn(), market:() => Screens.closeWin(), politics:() => Screens.closeWin(), year:() => Screens.closeWin(), slotpick:() => { UIM.modal = "charsel"; k.dirty(); }}[kind];
  if (closer){ k.hit(l, "veil", 0, 0, k.W, k.H, () => { Audio.play("close"); closer(); }, {cursor:false}); }
  k.hit(l, "mbox", px, py, pw, ph, () => {}, {cursor:false});
  const border = kind === "end" ? (S.over === "win" ? "good" : "bad") : "line";
  k.rect(l, px + 4, py + 10, pw, ph, "#000000", {a:.35, r:14, bg:true});
  k.rect(l, px, py, pw, ph, "panel", {r:14, stroke:border, sw:kind === "end" ? 1.5 : 1, bg:true, a:kind === "end" ? .94 : 1});
  if (closer){ W.hbtn(l, "mclose", px + pw - 40, py + 10, "x", () => { Audio.play("close"); closer(); }, {color:"muted"}); }
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
Screens.mEvent = function(l, pw){
  const e = P.currentEvent(); if (!e) return 100;
  const x = 22, w = pw - 44; let y = 18;
  const where = e.country ? t("evCountryTag") : e.target ? `${t("eventTag")} · ${L(P.RMETA[e.target].name)}` : `${t("eventTag")} · ${t("global")}`;
  tag(l, `[[${e.country ? "globe" : "siren"}]] ${where}`, x, y, e.country ? "accent" : "warn");
  { const ml = `[[minimize-2]] ${L(P.UI2.evMin)}`, mw = W.btnW(ml, {size:11.5}); W.btn(l, "evmin", x + w - mw, y - 6, ml, () => { UIM.evMin = true; Audio.play("close"); k.dirty(); }, {kind:"ghost", size:11.5, h:26}); }
  y += 26;
  y += h3(l, L(e.title), x, y, w).h + 6;
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
  if (P.hasKeyboard()) k.text(l, t("evKeys"), x + w - 140, y + 4, {font:"mono", size:10.5, color:"muted", w:140, align:"right"});
  y += 28;
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
  if (P.hasKeyboard()) k.text(l, t("evKeys"), x + w - 140, y + 4, {font:"mono", size:10.5, color:"muted", w:140, align:"right"});
  y += 28; W.meter(l, x, y, w, 4, f, locked ? "warn" : "accent"); y += 12;
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
  y += k.text(l, t(win ? "winBody" + (S.grade || "A") : o + "Body"), x, y, {size:14, w}).h + 10;
  // character quote
  const qh = Math.max(56, k.text(null, L(QUOTES[o]), 0, 0, {size:13, w:w - 90, measure:true}).h + 28);
  W.card(l, x, y, w, qh, {fill:"panel2"});
  W.portrait(l, x + 10, y + (qh - 48) / 2, 48, S.char);
  k.text(l, L(CHAR[S.char].person), x + 70, y + 6, {font:"bodyB", size:12, color:CHAR[S.char].color});
  k.text(l, `“${L(QUOTES[o])}”`, x + 70, y + 24, {size:13, w:w - 90, color:"fg"});
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
  // your story
  const st = P.endStory();
  { const ng = (S.years || []).filter(q => q.g).length; if ((S.years || []).length){ k.text(l, `${L(P.UI2.yrGoodYears)} ${ng} / ${(S.years || []).length}`, x, y, {size:12, color:"muted"}); y += 20; y += W.yearStrip(l, x, y, w, {big:true}) + 10; } }
  W.h3(l, t("yourStory"), x, y, {w}); y += 20;
  const lines = [];
  if (st.best) lines.push(`[[heart-handshake]] ${t("storyBest")}: ${P.cname(st.best)}`);
  if (st.worst) lines.push(`[[${HAZARDS[st.worst.type].icon}]] ${t("storyWorst")}: ${L(HAZARDS[st.worst.type].name)} · ${P.cname(st.worst.c)} · ${P.dateStr(st.worst.tick)}`);
  st.dec.forEach(d => lines.push(`[[git-branch]] ${L(d.title)} → ${L(d.label)}`));
  if (!lines.length) lines.push(t("storyNone"));
  for (const s of lines) y += k.text(l, s, x, y, {size:12.5, w, color:"fg", iconColor:"accent"}).h + 3;
  y += 10;
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
  bx -= wR; W.btn(l, "restart", bx, y + 22, t("restart"), () => { Audio.stopAmb(300); UIM.reward = null; UIM.modal = "charsel"; S.over = null; S.started = false; P.newGame(S.lang, {mode:S.mode, char:S.char}); P.Map.refresh(); k.dirty(); });
  bx -= wM + 8; W.btn(l, "tomenu", bx, y + 22, t("mainMenu"), () => Screens.toMenu(), {kind:"ghost"});
  return y + 22 + 36 + 22;
};

/* ---------------- character select + mode ---------------- */
Screens.mCharSel = function(l, pw){
  const x = 24, w = pw - 48; let y = 18;
  tag(l, t("introTag"), x, y, "accent"); y += 18;
  y += h3(l, t("charTitle"), x, y, w).h + 2;
  y += k.text(l, t("charSub"), x, y, {size:13.5, color:"muted", w}).h + 12;
  const sel = UIM.charSel || "sci", cw = (w - 3 * 12) / 4, chH = 330;
  CHARS.forEach((c, i) => {
    const cx = x + i * (cw + 12), owned = P.Net.owns("char_" + c.id), on = sel === c.id, id = "ch-" + c.id, hov = k.isHover(l, id);
    const xp = P.Net.charXp(c.id), lv = P.levelOf(xp), a = owned ? 1 : .55;
    k.rect(l, cx, y, cw, chH, on ? "panel2" : "bg", {r:12, stroke:on ? c.color : hov ? "accent" : "line", sw:on ? 2 : 1, bg:true});
    k.rect(l, cx + 10, y + 10, cw - 20, 150, c.color, {r:10, a:.12});
    k.sprite(l, "Portrait", `${c.id}-${P.outfitOf(c.id)}`, cx + (cw - 150) / 2, y + 10, 150, 150, a);
    if (!owned){ k.rect(l, cx + cw - 46, y + 16, 30, 30, "bg", {r:15, stroke:"line"}); k.icon(l, "lock", cx + cw - 39, y + 23, 16, "muted"); }
    let ty = y + 168;
    ty += k.text(l, L(c.name), cx + 12, ty, {font:"dispS", size:16, w:cw - 24, max:1, a}).h;
    ty += k.text(l, `${L(c.person)} · ${t("level")} ${lv}`, cx + 12, ty, {font:"mono", size:11, color:c.color, w:cw - 24, max:1, a}).h + 2;
    const nx = P.LEVELS[lv] ?? null, pv = P.LEVELS[lv - 1];
    W.meter(l, cx + 12, ty + 2, cw - 24, 4, nx ? (xp - pv) / (nx - pv) : 1, c.color); ty += 12;
    ty += k.text(l, L(c.pas), cx + 12, ty, {size:11.5, color:"muted", w:cw - 24, lh:1.3, a}).h + 4;
    for (const ab of c.acts) ty += k.text(l, `[[${ab.icon}]] ${L(ab.name)}${ab.lv ? ` (Lv${ab.lv})` : ""}`, cx + 12, ty, {size:11.5, w:cw - 24, max:1, a, iconColor:c.color}).h;
    if (!owned) k.text(l, P.Net.user ? `[[$credit]] ${c.price} · ${t("buyInShop")}` : `[[$credit]] ${c.price} · ${t("loginToBuy")}`, cx + 12, y + chH - 24, {font:"mono", size:11, color:"gold", w:cw - 24, max:1, iconColor:"#ffffff"});
    k.hit(l, id, cx, y, cw, chH, () => { Audio.play(owned ? "select" : "error"); if (owned) UIM.charSel = c.id; else UIM.msg = t("charLocked"); k.dirty(); });
  });
  y += chH + 14;
  // mode
  W.h3(l, t("modeTitle"), x, y, {w}); y += 22;
  const modes = UIM.worldSel ? [["normal", "infinity"]] : [["fast", "zap"], ["normal", "globe"], ["hard", "skull"], ["daily", "calendar-check"]];   // 3.x: Fast mode (shared engine)
  const mw = (w - (modes.length - 1) * 10) / modes.length;
  modes.forEach(([m, ic], i) => {
    const mx = x + i * (mw + 10), on = UIM.modeSel === m, id = "md-" + m, hov = k.isHover(l, id);
    const dis = m === "daily" && false;
    k.rect(l, mx, y, mw, 64, on ? "panel2" : "bg", {r:10, stroke:on ? (m === "hard" ? "bad" : "accent") : hov ? "accent" : "line", sw:on ? 2 : 1, bg:true});
    k.icon(l, ic, mx + 12, y + 12, 20, on ? (m === "hard" ? "bad" : "accent") : "muted");
    k.text(l, t("mode_" + m), mx + 42, y + 9, {font:"dispS", size:15});
    k.text(l, t("modeD_" + m), mx + 42, y + 32, {size:11, color:"muted", w:mw - 52, max:2, lh:1.3});
    k.hit(l, id, mx, y, mw, 64, () => { Audio.play("click"); UIM.modeSel = m; k.dirty(); }, {disabled:dis});
  });
  y += 76;
  if (UIM.msg){ k.text(l, UIM.msg, x, y, {size:12.5, color:"warn", w}); }
  const go = () => {
    const ch = UIM.charSel || "sci"; if (!P.Net.owns("char_" + ch)) return;
    UIM.msg = ""; UIM.modal = null;
    Screens.startOrPick({mode:UIM.worldSel ? "normal" : UIM.modeSel, char:ch, charLv:P.levelOf(P.Net.charXp(ch)), seed:UIM.modeSel === "daily" ? P.dailySeed() : undefined, world:!!UIM.worldSel});
  };
  const sl = t("start"), sw = W.btnW(sl, {size:15}) + 20;
  W.btn(l, "start", x + w - sw, y, sl, go, {size:15, w:sw, h:40});
  let bx = x + w - sw - 8;
  const tl = `[[graduation-cap]] ${L(P.UI2.trainMenu)}`, tw2 = W.btnW(tl); bx -= tw2; W.btn(l, "csTut", bx, y + 2, tl, () => P.Train.start(), {kind:"ghost"});
  const ml = t("mainMenu"), mw2 = W.btnW(ml); bx -= mw2 + 8; W.btn(l, "csMenu", bx, y + 2, ml, () => Screens.toMenu(), {kind:"ghost"});
  return y + 40 + 22;
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
  const x = 20, w = pw - 40; let y = 18;
  tag(l, `${P.dateStr()} · ${t("mode_" + S.mode)}`, x, y); y += 18;
  y += h3(l, t("pTitle"), x, y, w - 40).h + 4;
  y += k.text(l, `[[timer]] ${t("timePlayed")} ${P.fmtTime(S.realSec)}`, x, y, {font:"mono", size:12, color:"muted", iconColor:"muted"}).h + 10;
  W.btn(l, "resume", x, y, t("pResume"), () => Screens.resume());
  W.langSeg(l, x + w - 80, y + 3);
  y += 36 + 14;
  y += W.vol(l, x, y, w) + 12;
  { const th = S.lang === "th", G = P.Gfx; k.icon(l, "monitor", x, y + 7, 18, "accent"); k.text(l, t("gfxLbl"), x + 28, y + 6, {size:13.5, w:120, max:1});
    W.seg(l, x + w - 180, y + 1, [["low", "gfxLow"], ["high", "gfxHigh"]].map(([id, key]) => ({id:"pgfx-" + id, label:t(key), on:G.level === id, fn:() => { Audio.play("click"); G.set(id); k.dirty(); }})), {w:90, h:30, font:"body", fontOn:"bodyB", size:12.5}); y += 40; }
  if (W.a11yRows) y += W.a11yRows(l, x, y, w) + 10;
  const saves = P.readSaves();
  if (S.mode === "hard") y += k.text(l, `[[skull]] ${t("hardSaves")}`, x, y, {size:12.5, color:"warn", w, iconColor:"warn"}).h + 8;
  if (saves === null){ y += k.text(l, t("noStore"), x, y, {size:12.5, color:"bad", w}).h + 10; }
  else {
    for (const slot of P.SLOTS) y += this.slotRow(l, x, y, w, slot, saves, true) + 7;
    // 1.5.4: delete every save slot at once (asks first)
    const n = P.SLOTS.filter(q => saves[q] && saves[q].meta).length;
    if (n){
      if (UIM.askClear){
        k.text(l, t("slotClearSure").replace("{N}", n), x, y + 8, {size:12.5, color:"bad", w:w - 220, max:2});
        const dl = `[[trash-2]] ${t("slotDelSure")}`, dw = W.btnW(dl, {size:12.5}), cl = t("cancel"), cw2 = W.btnW(cl, {size:12.5});
        W.btn(l, "clr-yes", x + w - dw - cw2 - 8, y, dl, () => { P.SLOTS.forEach(q => { if (saves[q] && saves[q].meta) P.deleteSlot(q); }); UIM.askClear = false; UIM.msg = t("slotCleared"); UIM.err = false; k.dirty(); }, {kind:"danger", size:12.5, h:32});
        W.btn(l, "clr-no", x + w - cw2, y, cl, () => { UIM.askClear = false; k.dirty(); }, {kind:"ghost", size:12.5, h:32});
      } else W.btn(l, "clr", x, y, `[[trash-2]] ${t("slotClear")}`, () => { UIM.askClear = true; k.dirty(); }, {kind:"ghost", size:12.5, h:32});
      y += 40;
    }
  }
  y += 8;
  if (UIM.msg){ k.text(l, UIM.msg, x, y, {size:12.5, color:UIM.err ? "bad" : "good", w}); y += 24; }
  let bx = x;
  bx += W.btn(l, "ptut", bx, y, `[[graduation-cap]] ${t("tutMenu")}`, () => Screens.openTutorial(0, false), {kind:"ghost"}) + 8;
  bx += W.btn(l, "plearn", bx, y, `[[book-open]] ${t("mLearn")}`, () => Screens.openLearn(), {kind:"ghost"}) + 8;
  if (!k.touch) bx += W.btn(l, "pkeys", bx, y, `[[keyboard]] ${S.lang === "th" ? "ปุ่มลัด" : "Shortcuts"}`, () => Screens.openKeys(), {kind:"ghost"}) + 8;   // 3.9
  y += 44;
  W.btn(l, "pmain", x, y, t("pMain"), () => Screens.toMenu(), {kind:"ghost"});
  if (P.hasKeyboard()) k.text(l, t("keysHelp"), x, y + 46, {font:"mono", size:10.5, color:"muted", w});
  return y + 36 + (P.hasKeyboard() ? 50 : 20);
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
