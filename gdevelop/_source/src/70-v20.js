const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.gd20) return;
(P.mods = P.mods || {}).gd20 = 1;
/* =========================================================================
   2.0 pieces from the website (web/src/ui/year.jsx, modals.jsx, widgets.jsx):
     · the opening scene of a new game (instead of the act 1 text window)
     · the slot picker when all 3 save slots are taken
     · the year strip (25 squares, 2026 … 2050), the ▲/▼ marks for the four groups at home
     · a typewriter for the story panels
   ========================================================================= */
const {Kit, S, t, L, Audio, W, UIM, Screens} = P;
const k = Kit, H = P.H = P.H || {};
const now = () => performance.now();

/* ---------- widgets ---------- */
/* 25 squares, 2026 … 2050: good · bad · still to come */
W.yearStrip = (l, x, y, w, o = {}) => {
  const ys = S.years || [], by = {}; ys.forEach(q => { by[q.y] = q; });
  const gap = 3, sw = (w - gap * 24) / 25, h = o.big ? 16 : 10;
  for (let i = 0; i < 25; i++){
    const yr = 2026 + i, r = by[yr], cx = x + i * (sw + gap);
    k.rect(l, cx, y, sw, h, r ? (r.g ? "good" : "bad") : "panel2", {r:2.5, a:r ? .9 : 1, stroke:yr === o.cur ? "#ffffff" : null, sw:1.5});
    if (o.big && (i % 6 === 0 || yr === o.cur)) k.text(l, String(yr), cx - 4, y + h + 2, {font:"mono", size:9.5, color:"muted"});
  }
  return h + (o.big ? 16 : 0);
};
/* what a choice, skill or order does to the four groups at home (icons with ▲ / ▼) */
W.groupTiltW = list => (list || []).reduce((s, {v}) => s + 16 + k.textW((v > 0 ? "▲" : "▼").repeat(Math.abs(v) >= 4 ? 2 : 1), {font:"monoB", size:10}) + 8, 0);
W.groupTilt = (l, x, y, list, a = 1) => {
  if (!list || !list.length) return 0;
  let cx = x;
  for (const {g, v} of list){
    const G = P.GROUP[g]; if (!G) continue;
    const ar = (v > 0 ? "▲" : "▼").repeat(Math.abs(v) >= 4 ? 2 : 1), col = v > 0 ? "good" : "bad";
    k.icon(l, G.icon, cx, y + 1, 13, G.color, a);
    k.text(l, ar, cx + 15, y, {font:"monoB", size:10, color:col, a});
    cx += 16 + k.textW(ar, {font:"monoB", size:10}) + 8;
  }
  return cx - x;
};
/* typewriter: how much of a text shows `ms` after it started (two letters every 28 ms, Thai-aware) */
const gseg = (typeof Intl !== "undefined" && Intl.Segmenter) ? new Intl.Segmenter("th", {granularity:"grapheme"}) : null;
const graphemes = s => gseg ? Array.from(gseg.segment(s), q => q.segment) : Array.from(s);
P.typed = (txt, startedAt) => {
  const g = graphemes(String(txt)), n = Math.floor((now() - startedAt) / 28) * 2;
  return n >= g.length ? {s:txt, done:true} : {s:g.slice(0, n).join(""), done:false};
};

/* ---------- the opening scene ---------- */
const INTRO = {
  date:{th:"1 มกราคม 2026", en:"1 January 2026"},
  heads:[
    {icon:"thermometer", th:"โลกร้อนขึ้นแล้ว +1.2°C", en:"The world is already +1.2°C warmer"},
    {icon:"factory", th:"ทั่วโลกปล่อย CO₂ 36,000 ล้านตันต่อปี", en:"36 billion tonnes of CO₂ a year"},
    {icon:"cloud-lightning", th:"พายุ น้ำท่วม ภัยแล้ง มาถี่ขึ้นทุกปี", en:"Storms, floods and droughts every year"},
  ],
  chosen:{th:"ทุกประเทศลงมติเลือกคุณ", en:"Every nation voted for you"},
  role:{th:"ผู้อำนวยการคณะทำงานภูมิอากาศโลก (GCT)", en:"Director of the Global Climate Taskforce"},
  goal:{th:"25 ปี · พาโลกไปถึง Net Zero ก่อนสิ้นปี 2050", en:"25 years · bring the world to Net Zero by the end of 2050"},
  go:{th:"เริ่มภารกิจ", en:"Begin the mission"},
};
const STAGE_AT = [700, 1500, 2300, 3100, 4300, 5600];
Screens.openIntro = function(){ UIM.modal = "intro"; UIM.introAt = now(); UIM.introSt = 0; const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0; k.dirty(); };
Screens.closeIntro = function(){ if (UIM.modal !== "intro") return; UIM.modal = null; Audio.play("start"); P.Map.resetView(); this.afterModal(); k.dirty(); };
/* a yearly review that came while the intro or a story was open waits until it closes */
Screens.afterModal = function(){ if (UIM.yearQ && !UIM.modal){ const r = UIM.yearQ; UIM.yearQ = null; UIM.yearRec = r; this.openWin("year"); } };
/* called every frame while the intro is open: plays the sounds as each line appears */
Screens.introTick = function(){
  const el = now() - (UIM.introAt || 0);
  let st = 0; while (st < STAGE_AT.length && el >= STAGE_AT[st]) st++;
  if (st !== UIM.introSt){
    for (let i = UIM.introSt; i < st; i++){ Audio.play(i < 4 ? "news" : i === 4 ? "whoosh" : "bong", {vol:.5}); if (i === 4) P.Map.resetView(); }
    UIM.introSt = st; k.dirty("Modal");
  }
  if (el < STAGE_AT[STAGE_AT.length - 1] + 500) k.dirty("Modal");   // fades
};
Screens.mIntro = function(l, pw){
  const x = 28, w = pw - 56, st = UIM.introSt || 0, el = now() - (UIM.introAt || 0);
  const fa = i => Math.max(0, Math.min(1, (el - STAGE_AT[i]) / 400));   // fade-in of stage i
  let y = 24;
  k.text(l, P.up(L(INTRO.date)), x, y, {font:"mono", size:12, color:"accent", a:fa(0)}); y += 30;
  INTRO.heads.forEach((h, i) => {
    const a = fa(i + 1);
    k.rect(l, x, y, w, 40, "panel2", {r:10, a:a, bg:true});
    k.icon(l, h.icon, x + 14, y + 9, 22, "hot", a);
    k.text(l, L(h), x + 48, y + 9, {font:"dispS", size:15, w:w - 60, max:1, a});
    y += 48;
  });
  y += 8;
  const a5 = fa(4), ch = P.CHAR[S.char] || P.CHAR.sci, line = P.introLine ? P.introLine() : null;
  W.portrait(l, x, y, 96, S.char || "sci", {a:a5});
  k.text(l, P.up(L(INTRO.chosen)), x + 112, y + 4, {font:"mono", size:11, color:"accent", a:a5});
  k.text(l, L(ch.person), x + 112, y + 20, {font:"disp", size:22, w:w - 112, max:1, a:a5});
  k.text(l, L(INTRO.role), x + 112, y + 52, {size:12.5, color:"muted", w:w - 112, max:1, a:a5});
  let ly = y + 74;
  if (line) ly += k.text(l, `“${L(line)}”`, x + 112, ly, {size:13, w:w - 112, a:a5}).h;
  y = Math.max(y + 104, ly + 8);
  const a6 = fa(5);
  k.rect(l, x, y, w, 46, "accent", {r:12, a:.14 * a6, stroke:"accent", sa:a6, bg:true});
  k.icon(l, "flag", x + 14, y + 12, 22, "accent", a6);
  k.text(l, L(INTRO.goal), x + 48, y + 12, {font:"dispS", size:15, w:w - 60, max:1, a:a6});
  y += 62;
  if (st < 6){ const sl = L(P.UI2.introSkip), sw = W.btnW(sl, {size:13}); W.btn(l, "intro-skip", x + w - sw, y, sl, () => Screens.closeIntro(), {kind:"ghost", size:13, h:32}); y += 32; }
  else { const gl = `${L(INTRO.go)} [[play]]`, gw = W.btnW(gl, {size:16}); W.btn(l, "intro-go", x + w - gw, y, gl, () => Screens.closeIntro(), {size:16, h:42, sound:false}); y += 42; }
  return y + 22;
};

/* ---------- slot picker (all 3 slots taken when a new game starts) ---------- */
Screens.startOrPick = function(o){
  if (o.slot === undefined && !o.training && P.readSaves() !== null && !P.pickSlot(o)){ UIM.pendingStart = o; UIM.modal = "slotpick"; UIM.msg = ""; Audio.play("open"); const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0; k.dirty(); return; }
  this.beginGame(o);
};
Screens.beginGame = function(o){ UIM.msg = ""; UIM.modal = null; UIM.pendingStart = null; P.startGame(S.lang, o); P.Map.resetView && P.Map.resetView(); k.dirty(); };
Screens.mSlotPick = function(l, pw){
  const x = 22, w = pw - 44, saves = P.readSaves() || {}, o = UIM.pendingStart || {};
  let y = 18;
  k.text(l, P.up(`[[save]] ${t("slotFullTag")}`), x, y, {font:"mono", size:11, color:"warn", iconColor:"warn"}); y += 20;
  y += k.text(l, t("slotFullTitle"), x, y, {font:"disp", size:22, w:w - 40}).h + 6;
  y += k.text(l, t("slotFullMsg").replace("{M}", P.modeName(o)), x, y, {size:13, color:"muted", w}).h + 12;
  for (const slot of P.SLOTS){
    const m = saves[slot] && saves[slot].meta, same = !m || P.modeKey(m) === P.modeKey(o), lines = P.slotMetaLines(m), sh = 30 + lines.length * 17 + 8;
    W.card(l, x, y, w, sh, {r:10});
    k.text(l, P.slotName(slot, m), x + 12, y + 7, {font:"dispS", size:15});
    lines.forEach((s, i) => k.text(l, s, x + 12, y + 30 + i * 17, {font:"mono", size:11.5, color:"muted", w:w - 190, max:1}));
    const lab = same ? `[[save]] ${t(m ? "slotUseOver" : "slotUse")}` : `[[trash-2]] ${t("slotDel")}`, bw = W.btnW(lab, {size:13});
    W.btn(l, "sp-" + slot, x + w - 12 - bw, y + (sh - 34) / 2, lab, () => { if (same) Screens.beginGame({...o, slot}); else { P.deleteSlot(slot); k.dirty(); } }, {kind:same ? "primary" : "ghost", size:13, h:34});
    y += sh + 7;
  }
  y += 6;
  W.btn(l, "sp-nosave", x, y, t("slotNoSave"), () => Screens.beginGame({...o, slot:null}), {kind:"ghost", size:13, h:34});
  return y + 34 + 20;
};

/* ---------- engine hooks (2.0 behaviour) ---------- */
const gs0 = H.gameStart;
H.gameStart = () => {
  if (P.Alerts) P.Alerts.reset();
  if (P.Net) P.Net.startRun && P.Net.startRun();
  if (P.Net && P.Net.statStart) P.Net.statStart();
  if (S.training) return;
  Screens.openIntro();   // 2.0: a short opening scene instead of the act 1 text window
};
const yearly0 = H.yearly;
H.yearly = rec => {
  // Fast mode and (web 2.1.6) the years between the 5-year reviews: a line, not a window
  if (S.simple || (P.isReviewYear && !P.isReviewYear(rec.y))){ if (P.Alerts) P.Alerts.addLoss({k:"year", y:rec.y, good:rec.g, ep:rec.ep, pc:rec.pc, appr:rec.appr}); return; }
  const span = (P.yearSpan && P.yearSpan(rec.y)) || rec;
  if (UIM.modal === "story" || UIM.modal === "intro"){ UIM.yearQ = span; return; }
  yearly0(span);
};
