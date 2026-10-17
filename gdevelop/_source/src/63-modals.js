const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.modals) return;
(P.mods = P.mods || {}).modals = 1;
/* =========================================================================
   Screens · pop-up windows: intro, dilemma event, end of game, pause, tutorial
   Veil + window frame on layer "Modal"; content (scrollable) on "ModalScroll".
   ========================================================================= */
const TUT_SIZES = /*TUTSIZES*/{};
const {Kit, S, t, L, UI, Audio, W, UIM, Screens, EVENTS, TUT} = P;
const k = Kit;

Screens.renderModal = function(l){
  const kind = UIM.kind();
  l.blocks = !!kind; const sl = k.L("ModalScroll");
  if (!kind){ k.clearSlave("ModalScroll"); return; }
  const pw = kind === "tutorial" ? 720 : 620, px = (1280 - pw) / 2;
  let ch = 0;
  k.slave("ModalScroll", s => {
    if (kind === "event") ch = this.mEvent(s, pw);
    else if (kind === "end") ch = this.mEnd(s, pw);
    else if (kind === "intro") ch = this.mIntro(s, pw);
    else if (kind === "pause") ch = this.mPause(s, pw);
    else if (kind === "tutorial") ch = this.mTutorial(s, pw);
    const ph = Math.min(ch, 690), py = (720 - ph) / 2;
    s.frame(px, py, {x:px, y:py, w:pw, h:ph}, ch);
    this._modalBox = {px, py, pw, ph};
  });
  const {py, ph} = this._modalBox;
  k.rect(l, 0, 0, 1280, 720, "#020609", {a:.62, bg:true});
  const border = kind === "end" ? (S.over === "win" ? "good" : "bad") : "line";
  k.rect(l, px + 4, py + 10, pw, ph, "#000000", {a:.35, r:14, bg:true});
  k.rect(l, px, py, pw, ph, "panel", {r:14, stroke:border, sw:kind === "end" ? 1.5 : 1, bg:true});
  if (sl && sl.content > sl.clip.h){
    const th = Math.max(30, sl.clip.h * sl.clip.h / sl.content), ty = sl.clip.y + (sl.clip.h - th) * (sl.scroll / (sl.content - sl.clip.h));
    k.rect(l, px + pw - 7, ty, 3, th, "line", {r:1.5});
  }
};
const tag = (l, s, x, y, col = "warn") => k.text(l, P.up(s), x, y, {font:"mono", size:11, color:col});
const h3 = (l, s, x, y, w) => k.text(l, s, x, y, {font:"disp", size:23, lh:1.25, w});
const bullets = (l, list, x, y, w, size = 14, gap = 4) => {
  let yy = y;
  for (const it of list){
    k.text(l, "•", x, yy, {size, color:"muted"});
    yy += k.text(l, it, x + 16, yy, {size, w:w - 16}).h + gap;
  }
  return yy - y;
};

/* ---------------- dilemma event ---------------- */
Screens.mEvent = function(l, pw){
  const e = EVENTS.find(x => x.id === S.event); if (!e) return 100;
  const x = 20, w = pw - 40; let y = 18;
  tag(l, t("eventTag"), x, y); y += 18;
  y += h3(l, L(e.title), x, y, w).h + 6;
  y += k.text(l, L(e.desc), x, y, {size:14, w}).h + 10;
  if (e.fact){
    const fy = y;
    k.text(l, `[[lightbulb]] ${t("didYouKnow")}`, x + 10, fy + 7, {font:"bodyB", size:13, color:"warn", iconColor:"warn"});
    const fh = k.text(l, L(e.fact), x + 10, fy + 27, {size:13, color:"muted", w:w - 20}).h;
    W.card(l, x, fy, w, fh + 36, {fill:"panel2", stroke:"panel2", r:8});
    y += fh + 36 + 12;
  }
  const opts = e.options.map((o, i) => ({o, i, ok:P.affordable(o.fx)}));
  const none = opts.every(q => !q.ok);
  if (none) opts.push({o:{label:{th:UI.postpone.th, en:UI.postpone.en}, fx:P.POSTPONE}, i:-1, ok:true});
  for (const {o, i, ok} of opts){
    const id = "opt" + i, hov = ok && k.isHover(l, id), a = ok ? 1 : .45;
    const oy = y;
    const lab = i === -1 ? L(o.label) : `${"ABC"[i]} · ${L(o.label)}`;
    let cy = oy + 11;
    cy += k.text(l, lab, x + 13, cy, {font:"bodyB", size:14.5, w:w - 26, a}).h + 6;
    const chips = P.fxChips(o.fx, e.target).map(c => ({txt:c.txt, kind:c.good ? "good" : "bad"}));
    cy += W.pills(l, x + 13, cy, w - 26, chips.length ? chips : [{txt:"—", kind:""}]);
    if (!ok){ cy += 6; cy += k.text(l, t("cantAfford"), x + 13, cy, {size:12, color:"bad"}).h; }
    cy += 11;
    k.rect(l, x, oy, w, cy - oy, "panel2", {r:10, stroke:hov ? "accent" : "line", under:true, a:ok ? 1 : .6});
    k.hit(l, id, x, oy, w, cy - oy, () => P.chooseOption(i), {disabled:!ok});
    y = cy + 9;
  }
  return y + 10;
};

/* ---------------- end of game ---------------- */
Screens.mEnd = function(l, pw){
  const o = S.over, win = o === "win", x = 20, w = pw - 40; let y = 18;
  tag(l, P.dateStr(), x, y); y += 18;
  y += h3(l, t(win ? "winTitle" : o + "Title"), x, y, w).h + 6;
  y += k.text(l, t(win ? "winBody" : o + "Body"), x, y, {size:14, w}).h + 12;
  const net = P.netCO2();
  const stats = [[t("temp"), `+${S.temp.toFixed(2)}°C`], [t("co2"), `${net.toFixed(1)} Gt`], [t("appr"), `${S.appr.toFixed(0)}%`],
    ["Net Zero", `${Math.round(P.clamp((36 - net) / 36, 0, 1) * 100)}%`], ["Tech", `${Object.keys(S.owned).length}/18`], ["Events", `${S.used.length}`]];
  const cw = (w - 16) / 3, chh = 56;
  stats.forEach(([a, b], i) => {
    const cx = x + (i % 3) * (cw + 8), cy = y + Math.floor(i / 3) * (chh + 8);
    k.rect(l, cx, cy, cw, chh, "panel2", {r:8, bg:true});
    k.text(l, P.up(a), cx + 10, cy + 7, {size:11, color:"muted", w:cw - 20, max:1});
    k.text(l, b, cx + 10, cy + 25, {font:"monoB", size:18});
  });
  y += 2 * (chh + 8) + 10;
  k.text(l, P.up(t("finalScore")), x, y, {size:12, color:"muted"});
  k.text(l, P.score().toLocaleString(), x, y + 16, {font:"disp", size:42, color:"accent", lh:1.1});
  let bx = x + w;
  const wR = k.textW(t("restart"), {font:"dispS", size:14}) + 30, wM = k.textW(t("mainMenu"), {font:"dispS", size:14}) + 30;
  bx -= wR; W.btn(l, "restart", bx, y + 22, t("restart"), () => { P.startGame(S.lang); UIM.modal = null; P.Map.refresh(); });
  bx -= wM + 8; W.btn(l, "tomenu", bx, y + 22, t("mainMenu"), () => Screens.toMenu(), {kind:"ghost"});
  return y + 22 + 36 + 22;
};

/* ---------------- appointment / intro ---------------- */
Screens.mIntro = function(l, pw){
  const x = 20, w = pw - 40; let y = 18;
  tag(l, t("introTag"), x, y); y += 18;
  y += h3(l, t("introTitle"), x, y, w).h + 6;
  y += k.text(l, t("introBody"), x, y, {size:14, w}).h + 10;
  y += bullets(l, UI.introRules[S.lang], x, y, w) + 12;
  const bw = W.btn(l, "start", x, y, t("start"), () => { UIM.modal = null; P.startGame(S.lang); });
  W.btn(l, "introLang", x + bw + 8, y, S.lang === "th" ? "English" : "ภาษาไทย", () => P.setLang(S.lang === "th" ? "en" : "th"), {kind:"ghost"});
  return y + 36 + 20;
};

/* ---------------- pause ---------------- */
Screens.mPause = function(l, pw){
  const x = 20, w = pw - 40; let y = 18;
  tag(l, P.dateStr(), x, y); y += 18;
  y += h3(l, t("pTitle"), x, y, w).h + 8;
  W.btn(l, "resume", x, y, t("pResume"), () => Screens.resume());
  W.langSeg(l, x + w - 80, y + 3);
  y += 36 + 14;
  y += W.vol(l, x, y, w) + 12;
  const saves = P.readSaves();
  if (saves === null){ y += k.text(l, t("noStore"), x, y, {size:12.5, color:"bad", w}).h + 10; }
  else for (const slot of ["s1", "s2", "s3"]){
    const m = saves[slot] && saves[slot].meta, lines = P.slotMetaLines(m);
    const sh = 22 + lines.length * 17 + 8;
    W.card(l, x, y, w, sh, {r:10});
    k.text(l, P.slotName(slot), x + 12, y + 7, {font:"dispS", size:15});
    lines.forEach((s, i) => k.text(l, s, x + 12, y + 28 + i * 17, {font:"mono", size:11.5, color:"muted", w:w - 120, max:1}));
    const bw = k.textW(t("save"), {font:"dispS", size:14}) + 30;
    W.btn(l, "save-" + slot, x + w - 12 - bw, y + (sh - 36) / 2, t("save"), () => {
      Audio.play("save"); P.Ach.unlock("saver");
      UIM.msg = P.writeSlot(slot) ? `${t("saved")} · ${P.slotName(slot)}` : t("noStore"); UIM.err = false; k.dirty();
    }, {kind:"ghost", sound:false});
    y += sh + 7;
  }
  y += 8;
  k.text(l, t("codeTitle"), x, y, {size:12, color:"muted"}); y += 20;
  if (!UIM.codeOut || UIM.codeOutTick !== S.tick){ UIM.codeOut = P.exportCode(); UIM.codeOutTick = S.tick; }
  // the code is shown as text (first lines) — "Copy code" puts the whole code on the clipboard
  k.rect(l, x, y, w, 62, "bg", {r:8, stroke:"line", bg:true});
  k.text(l, UIM.codeOut.slice(0, 360), x + 10, y + 7, {font:"mono", size:11, color:"muted", w:w - 20, max:3, lh:1.45});
  y += 70;
  const cbw = W.btn(l, "copy", x, y, t("codeCopy"), () => {
    const txt = UIM.codeOut;
    const done = ok => { UIM.msg = ok ? t("codeCopied") : t("codeFail"); UIM.err = !ok; k.dirty(); };
    const legacy = () => {               // older browsers: copy through a temporary text box
      try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); done(ok); } catch(e) { done(false); }
    };
    try { navigator.clipboard.writeText(txt).then(() => done(true), legacy); } catch(e) { legacy(); }
  }, {kind:"ghost"});
  if (UIM.msg) k.text(l, UIM.msg, x + cbw + 12, y + 9, {size:12.5, color:UIM.err ? "bad" : "good", w:w - cbw - 12, max:1});
  y += 36 + 16;
  const tw = W.btn(l, "ptut", x, y, `[[graduation-cap]] ${t("tutMenu")}`, () => Screens.openTutorial(0, false), {kind:"ghost"});
  W.btn(l, "pmain", x + tw + 8, y, t("pMain"), () => Screens.toMenu(), {kind:"ghost"});
  return y + 36 + 20;
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
  // dots
  const dw = (n - 1) * 14 + 26; let dx = (pw - dw) / 2;
  for (let d = 0; d < n; d++){ const on = d === i; k.rect(l, dx, y, on ? 20 : 8, 8, on ? "accent" : "line", {r:4}); dx += (on ? 20 : 8) + 6; }
  y += 22;
  W.btn(l, "tskip", x, y, t("tutSkip"), () => Screens.tutAct("skip"), {kind:"ghost"});
  const nl = last ? t("tutDone") : `${t("tutNext")} [[chevron-right]]`;
  const nw = k.textW(nl, {font:"dispS", size:14}) + 30;
  W.btn(l, "tnext", x + w - nw, y, nl, () => Screens.tutAct(last ? "done" : "next"));
  if (i){ const bl = `[[chevron-left]] ${t("tutBack")}`, bw = k.textW(bl, {font:"dispS", size:14}) + 30; W.btn(l, "tback", x + w - nw - 8 - bw, y, bl, () => Screens.tutAct("back"), {kind:"ghost"}); }
  return y + 36 + 20;
};
