const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.news) return;
(P.mods = P.mods || {}).news = 1;
/* =========================================================================
   Screens · 4.0 the end of the game as a breaking-news broadcast (like the website's EndModal, ui/modals.jsx)
   · the "TV": live footage of the ending — a looping video per ending (assets/endings/news-<kind>.mp4, recorded from
     the website's animated scenes in ui/endscene.jsx; the first frame is the NewsArt sprite, shown until the video plays)
   · lower third (BREAKING + headline), the grade or how far you got, the character's line typed out
   · headlines from three papers, four numbers, the ending's own story, a news ticker (layer "Train", every frame)
   · "Your story" opens a sheet on ModalScroll (story lines, papers on tall screens, what you can do in real life)
   Laid out on a fixed stage (1280×720 wide, 400×860 tall) scaled to the screen, so nothing ever scrolls.
   A win shows how early you got there (not "Net Zero 100%"); a loss shows how far you got and what is left.
   ========================================================================= */
const {Kit, S, t, L, W, UIM, Screens, Audio, CHAR, ENDINGS} = P;
const k = Kit;
const T = (th, en) => ({th, en});
const NT = {
  live:T("สด", "LIVE"), breaking:T("ข่าวด่วน", "BREAKING"), interview:T("สัมภาษณ์สด", "Live interview"), world:T("พาดหัวจากทั่วโลก", "Headlines around the world"),
  early:T("เร็วกว่ากำหนด", "early"), lastYear:T("ทันในปีสุดท้าย", "in the final year"), yr:T("ปี", "yr"), mo:T("เดือน", "mo"),
  reached:T("ถึงเป้า", "Reached"), temp:T("อุณหภูมิโลก", "Warming"), good:T("ปีที่ดี", "Good years"), cut:T("ลด CO₂ ได้", "CO₂ cut"), perYr:T("Gt/ปี", "Gt/yr"),
  nz:T("ไปถึง Net Zero", "Way to Net Zero"), left:T("CO₂ ยังเหลือ", "CO₂ still left"), appr:T("ความนิยม", "Approval"),
  why:{l1:T("โลกร้อนทะลุ 3°C", "Warming broke 3°C"), l2:T("ความนิยมหมด", "Approval ran out"), l3:T("สิ้นปี 2050 แต่ยังไม่ถึง Net Zero", "End of 2050, still short of Net Zero")},
  story:T("เรื่องของคุณ", "Your story"), papers:T("หนังสือพิมพ์", "Papers"), real:T("สิ่งที่คุณทำได้จริงวันนี้", "What you can do in real life today"),
};
const sceneKind = () => { const o = S.over, tier = P.endTier ? P.endTier(P.goodYears ? P.goodYears() : 0) : 1; return (o === "win" ? "win" : o + "_") + Math.max(0, Math.min(2, tier)); };
const TEXT_SCENES = ["win0", "l2_0", "l2_1", "l2_2", "l3_0", "l3_1"];   // scenes with words in them have an English recording too
const ease = f => 1 - Math.pow(1 - Math.max(0, Math.min(1, f)), 3);

/* ---- the looping video on the NewsArt sprite ---- */
const vids = {};
function videoTexture(name){
  if (vids[name]) return vids[name];
  // the export renames resource files (assets/endings/news-x.mp4 → news-x.mp4): look the file up by the resource's name
  let url = `assets/endings/${name}.mp4`;
  try {
    const g = Screens.scene && Screens.scene.getGame(), gd = g && g.getGameData && g.getGameData();
    const r = gd && gd.resources && (gd.resources.resources || []).find(x => x.name === url); if (r && r.file) url = r.file;
    const rl = g && (g.getResourceLoader ? g.getResourceLoader() : g.getResourcesLoader && g.getResourcesLoader()); if (rl && rl.getFullUrl) url = rl.getFullUrl(url);
  } catch(e){}
  const v = document.createElement("video");
  v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("muted", ""); v.preload = "auto"; v.crossOrigin = "anonymous"; v.src = url;
  const rec = vids[name] = {v, tex:null, ok:false};
  v.addEventListener("canplay", () => { if (!rec.tex){ try { rec.tex = PIXI.Texture.from(v, {resourceOptions:{autoPlay:true, updateFPS:30}}); rec.ok = true; k.dirty("Modal"); } catch(e){ rec.ok = false; } } });
  v.addEventListener("error", () => { rec.ok = false; });
  const p = v.play(); if (p && p.catch) p.catch(() => {});
  return rec;
}
function stopVideos(except){ for (const n in vids) if (n !== except){ try { vids[n].v.pause(); } catch(e){} } }

/* ---- stage: design coordinates → screen ---- */
function stage(){
  const wide = k.W / k.H >= 1.12, sw = wide ? 1280 : 400, sh = wide ? 720 : 860, s = Math.min(k.W / sw, k.H / sh);
  return {wide, s, ox:(k.W - sw * s) / 2, oy:(k.H - sh * s) / 2, sw, sh};
}

Screens.renderNews = function(l){
  const G = stage(), {s, ox, oy, wide} = G, X = v => ox + v * s, Y = v => oy + v * s, Z = v => v * s;
  const o = S.over, win = o === "win", th = S.lang === "th", now = performance.now(), tt = (now - (UIM.endAt || now)) / 1000;
  const nw = P.endNews ? P.endNews() : {papers:[], ticker:[], early:0, nz:0, net:P.netCO2(), date:P.dateStr()};
  const e2 = S.v2 && P.ending2 ? P.ending2() : null, kind = sceneKind(), ng = P.goodYears ? P.goodYears() : 0, ny = (S.years || []).length;
  const im = P.impactSummary ? P.impactSummary() : null;
  const earlyTxt = !win ? "" : nw.early >= 12 ? `${L(NT.early)} ${Math.floor(nw.early / 12)} ${L(NT.yr)}${nw.early % 12 ? ` ${nw.early % 12} ${L(NT.mo)}` : ""}` : L(NT.lastYear);
  const head = win ? `${t("winTitle")} · ${earlyTxt}` : `${t(o + "Title")} · ${L(NT.why[o] || NT.why.l3)}`;
  const quote = `“${L(P.endQuote ? P.endQuote() : T("", ""))}”`;
  k.rect(l, 0, 0, k.W, k.H, "#04070b", {under:true});
  // the TV
  const tv = wide ? {x:28, y:22, w:840, h:473} : {x:12, y:12, w:376, h:236};
  const tx = X(tv.x), ty = Y(tv.y), tw = Z(tv.w), thh = Z(tv.h), on = ease(tt / .5);
  const name = `news-${kind}${!th && TEXT_SCENES.includes(kind) ? "-en" : ""}`;
  let go = null; try { go = k.sprite(l, "NewsArt", `news-${kind}`, tx, ty + thh * (1 - on) / 2, tw, Math.max(1, thh * on)); } catch(e){}
  const rec = videoTexture(name); stopVideos(name);
  if (go && go.getZOrder() !== -1.5) go.setZOrder(-1.5);   // above the backdrop (painter -2), under every panel and text
  if (go && rec.ok && rec.tex){ const spr = go.getRendererObject && go.getRendererObject(); if (spr && spr.texture !== rec.tex){ spr.texture = rec.tex; go.setWidth(tw * k.K); go.setHeight(Math.max(1, thh * on) * k.K); } }
  this._newsVid = rec;
  if (UIM.newsSheet) return this.newsSheet(l, G, nw, im, th);
  // top: LIVE + channel
  const blink = Math.floor(tt / .6) % 2 === 0;
  k.rect(l, tx + Z(12), ty + Z(10), Z(52), Z(22), "#e3262e", {r:Z(4), a:blink ? 1 : .55});
  k.text(l, `● ${L(NT.live)}`, tx + Z(12), ty + Z(12), {font:"dispS", size:Z(12.5), color:"#ffffff", w:Z(52), align:"center", max:1});
  const ch = `GCT NEWS · ${nw.date} · ${t("mode_" + S.mode)}`, cw = k.textW(ch, {font:"mono", size:Z(wide ? 12 : 10)}) + Z(16);
  k.rect(l, tx + Z(70), ty + Z(10), cw, Z(22), "#000000", {r:Z(4), a:.55});
  k.text(l, ch, tx + Z(78), ty + Z(13), {font:"mono", size:Z(wide ? 12 : 10), color:"#e6f0ee", max:1});
  // picture-in-picture: the character
  const pip = wide ? 120 : 64, pa = ease((tt - 1.1) / .5);
  if (pa > 0){ const px = tx + tw - Z(pip + 14), py = ty + Z(10);
    k.rect(l, px - Z(3), py - Z(3), Z(pip + 6), Z(pip + (wide ? 26 : 6)), "#0e1d24", {r:Z(10), stroke:"#ffffff", sw:2, a:pa});
    W.portrait(l, px, py, Z(pip), S.char, {r:Z(8), a:pa});
    if (wide) k.text(l, `${L(NT.interview)} · ${L(CHAR[S.char].person)}`, px, py + Z(pip + 3), {size:Z(11.5), color:"#e6f0ee", w:Z(pip), max:1, a:pa}); }
  // lower third
  const la = ease((tt - .55) / .55), bkS = wide ? 21 : 12, hdS = wide ? 26 : 14.5, l3y = ty + thh - Z(wide ? 84 : 46);
  if (la > 0){
    const bkW = k.textW(L(NT.breaking), {font:"disp", size:Z(bkS)}) + Z(wide ? 32 : 16), bh = Z(wide ? 44 : 26);
    const hdW = Math.min(tw - bkW, k.textW(head, {font:"disp", size:Z(hdS)}) + Z(wide ? 36 : 20)) * la;
    k.rect(l, tx, l3y, bkW * Math.min(1, la * 2), bh, "#e3262e");
    k.text(l, L(NT.breaking), tx, l3y + (bh - Z(bkS) * 1.45) / 2, {font:"disp", size:Z(bkS), color:"#ffffff", w:bkW, align:"center", max:1});
    k.rect(l, tx + bkW, l3y, hdW, bh, "#ffffff", {a:.96});
    if (la > .6) k.text(l, head, tx + bkW + Z(wide ? 18 : 10), l3y + (bh - Z(hdS) * 1.45) / 2, {font:"disp", size:Z(hdS), color:"#0b0f14", w:hdW - Z(wide ? 24 : 14), max:1});
    const chip = win ? L(ENDINGS.win.grades[S.grade || "A"]) : `${L(NT.nz)} ${nw.nz}%`, cS = wide ? 15 : 11.5, cw2 = k.textW(chip, {font:"dispS", size:Z(cS)}) + Z(wide ? 28 : 16), ch2 = Z(wide ? 30 : 20);
    k.rect(l, tx, l3y + bh, cw2, ch2, win ? "gold" : "warn");
    k.text(l, chip, tx, l3y + bh + (ch2 - Z(cS) * 1.45) / 2, {font:"dispS", size:Z(cS), color:"#1a1300", w:cw2, align:"center", max:1});
    if (wide){ const n = Math.floor(Math.max(0, tt - 1.2) * 28), q = [...quote].slice(0, n).join(""), qw = Math.min(tw - cw2, k.textW(quote, {size:Z(15)}) + Z(28));
      k.rect(l, tx + cw2, l3y + bh, qw, ch2, "#0b0f14", {a:.9}); k.text(l, q, tx + cw2 + Z(14), l3y + bh + (ch2 - Z(15) * 1.45) / 2, {size:Z(15), color:"#e6f0ee", w:qw - Z(20), max:1}); }
  }
  // numbers
  const cnt = (v, d = 0, delay = .6) => (v * ease((tt - delay) / 1.1)).toFixed(d);
  const stats = win ? [
    [L(NT.reached), nw.date, "fg"], [L(NT.temp), `+${cnt(S.temp, 2)}°C`, "fg"], [L(NT.good), `${cnt(ng)} / ${ny}`, "good"],
    im && im.saved > .1 ? [L(NT.cut), `${cnt(im.saved, 1)} ${L(NT.perYr)}`, "fg"] : [t("skillsTitle"), `${Object.keys(S.owned).length}/${P.SKILLS.length}`, "fg"],
  ] : [
    [L(NT.nz), `${cnt(nw.nz)}%`, "warn"], [L(NT.left), `${cnt(nw.net, 1)} Gt`, "fg"],
    o === "l2" ? [L(NT.appr), `${Math.max(0, S.appr).toFixed(0)}%`, "bad"] : [L(NT.temp), `+${cnt(S.temp, 2)}°C`, o === "l1" ? "bad" : "fg"],
    [L(NT.good), `${cnt(ng)} / ${ny}`, "fg"],
  ];
  const statBox = (x0, y0, w0, h0) => { const cw3 = (w0 - 8) / 2;
    stats.forEach(([a, b, c], i) => { const sx = X(x0 + (i % 2) * (cw3 + 8)), sy = Y(y0 + Math.floor(i / 2) * (h0 + 8)), al = ease((tt - .9 - i * .12) / .45);
      k.rect(l, sx, sy + Z(8) * (1 - al), Z(cw3), Z(h0), "panel", {r:Z(10), stroke:"line", a:al});
      k.text(l, a, sx + Z(12), sy + Z(6), {size:Z(12), color:"muted", w:Z(cw3 - 20), max:1, a:al});
      k.text(l, b, sx + Z(12), sy + Z(22), {font:"dispS", size:Z(20), color:c, w:Z(cw3 - 20), max:1, a:al}); }); };
  // papers
  const paper = (p, x0, y0, w0, i, fly = true) => {
    const a = fly ? ease((tt - 1.6 - i * .25) / .6) : 1, dx = fly ? (1 - a) * 220 : 0, bg = ["#f4efe3", "#fffdf7", "#f6f3ee"][i] || "#f4efe3";
    const nameFont = p.id === "wt" ? "logo" : "dispS", hs = wide ? 16 : 15;
    const hh = k.textH(p.head, {font:"dispS", size:Z(hs), w:Z(w0 - 24), lh:1.3}), gh = p.gloss ? k.textH(`“${p.gloss}”`, {size:Z(11.5), w:Z(w0 - 24), lh:1.35}) : 0, ph = Z(30) + hh + (gh ? gh + Z(4) : 0) + Z(8);
    const px = X(x0 + dx), py = Y(y0);
    if (p.id === "th") k.rect(l, px, py - Z(5), Z(w0), Z(5), "#c8402e", {a});
    k.rect(l, px, py, Z(w0), ph, bg, {a, r:Z(2)});
    k.text(l, p.name, px + Z(12), py + Z(7), {font:nameFont, size:Z(13.5), color:p.id === "th" ? "#c8402e" : "#1b1a17", max:1, a});
    k.text(l, p.head, px + Z(12), py + Z(26), {font:"dispS", size:Z(hs), color:"#1b1a17", w:Z(w0 - 24), lh:1.3, a});
    if (gh) k.text(l, `“${p.gloss}”`, px + Z(12), py + Z(30) + hh, {size:Z(11.5), color:"#5a564e", w:Z(w0 - 24), lh:1.35, a});
    return ph / s + 10;
  };
  const story = (x0, y0, w0, lines) => {
    const a = ease((tt - 1.3) / .5);
    if (e2){ k.text(l, L(e2.title), X(x0), Y(y0), {font:"dispS", size:Z(19), color:win ? "good" : "#ff9c90", w:Z(w0), max:1, a});
      k.text(l, L(e2.body), X(x0), Y(y0 + 28), {size:Z(14), color:"#c9dbd8", w:Z(w0), lh:1.5, max:lines, a}); }
    else k.text(l, t(win ? "winBody" + (S.grade || "A") : o + "Body"), X(x0), Y(y0), {size:Z(14), color:"#c9dbd8", w:Z(w0), lh:1.5, max:lines, a});
  };
  const moreBtn = (x0, y0, label) => W.btn(l, "nw-more", X(x0), Y(y0), label, () => { Audio.play("page"); UIM.newsSheet = true; const ml = k.L("ModalScroll"); if (ml) ml.scroll = 0; k.dirty(); }, {kind:"ghost", size:Z(14), h:Z(44)});
  // reward + score + buttons
  const rw = UIM.reward;
  const reward = (x0, y0) => { let cx = X(x0); const yy = Y(y0);
    if (!rw) cx += k.text(l, `[[loader]] ${t("rewardWait")}`, cx, yy, {size:Z(13), color:"muted", iconColor:"muted", max:1}).w + Z(12);
    else if (rw.guest) cx += k.text(l, `${t("rewardGuest")} · XP +${rw.xp}`, cx, yy, {size:Z(13), color:"muted", max:1}).w + Z(12);
    else if (rw.error) cx += k.text(l, `${t("rewardFail")} · XP +${rw.xp || 0}`, cx, yy, {size:Z(13), color:"muted", max:1}).w + Z(12);
    else { cx += W.terra(l, cx, yy, `+${rw.terra}`, {size:Z(15), color:"good"}) + Z(12); cx = W.runs(l, cx, yy, [[`XP +${rw.xp}`, {font:"monoB", size:Z(14), color:"accent"}]]) + Z(12);
      if (rw.levelUp) cx += k.text(l, `[[star]] ${t("levelUp")} ${rw.level}`, cx, yy, {size:Z(13), color:"gold", iconColor:"gold"}).w + Z(12); }
    k.text(l, `${t("finalScore")} ${P.score().toLocaleString()}`, cx, yy + Z(1), {font:"mono", size:Z(12.5), color:"muted", max:1}); };
  const buttons = (xr, y0, full) => {
    const bs = {size:Z(15), h:Z(46)}, items = [["tomenu", t("mainMenu"), () => Screens.toMenu(), "ghost"],
      ["restart", t("restart"), () => { stopVideos(); Audio.stopAmb(300); UIM.worldSel = !!S.world; UIM.reward = null; UIM.newsSheet = false; UIM.modal = "charsel"; S.over = null; S.started = false; P.newGame(S.lang, {mode:S.mode, char:S.char}); P.Map.refresh(); k.dirty(); }, win ? "ghost" : "primary"]];
    if (win) items.push(["playon", `[[infinity]] ${t("playOn")}`, () => { stopVideos(); UIM.newsSheet = false; Screens.continueWorld(); }, "gold"]);
    if (full){ const bw = (Z(full) - Z(8) * (items.length - 1)) / items.length; items.forEach(([id, lab, fn, kd], i) => W.btn(l, id, X(xr) + i * (bw + Z(8)), Y(y0), lab, fn, {...bs, kind:kd, w:bw})); return; }
    let bx = X(xr); for (let i = items.length - 1; i >= 0; i--){ const [id, lab, fn, kd] = items[i]; const w0 = W.btnW(lab, bs); bx -= w0; W.btn(l, id, bx, Y(y0), lab, fn, {...bs, kind:kd}); bx -= Z(8); } };
  if (wide){
    k.text(l, L(NT.world), X(888), Y(22), {font:"dispS", size:Z(14), color:"muted", max:1});
    let py = 46; nw.papers.forEach((p, i) => { py += paper(p, 888, py, 364, i); });
    statBox(888, 495 - 2 * 52 - 8, 364, 52);
    story(28, 512, 700, 2);
    moreBtn(740, 516, `${L(NT.story)} ›`);
    reward(28, 668);
    buttons(1252, 654);
  } else {
    story(16, 262, 368, 3);
    // the character's line
    const qy = 352; k.rect(l, X(16), Y(qy), Z(368), Z(58), "panel", {r:Z(12), stroke:"line"}); W.portrait(l, X(26), Y(qy + 9), Z(40), S.char);
    k.text(l, L(CHAR[S.char].person), X(76), Y(qy + 7), {font:"dispS", size:Z(12.5), color:"accent", max:1}); k.text(l, quote, X(76), Y(qy + 25), {size:Z(13), w:Z(300), max:2, lh:1.35});
    if (nw.papers[0]) paper(nw.papers[0], 16, 424, 368, 0, false);
    statBox(16, 548, 368, 52);
    reward(16, 746);
    moreBtn(260, 726, `${L(NT.papers)} · ${L(NT.story)} ›`);
    buttons(16, 778, 368);
  }
  this._newsTicker = {y:Y(wide ? 596 : 704), h:Z(wide ? 40 : 34), s, items:nw.ticker};
  k.clearSlave("ModalScroll");
};
/* the sheet: your story, the papers (tall screens), what you can do in real life */
Screens.newsSheet = function(l, G, nw, im, th){
  const {s, wide} = G, Y = v => G.oy + v * s, Z = v => v * s;
  {
    const sw = wide ? Math.min(k.W - 80, Z(760)) : k.W - Z(24), sx = (k.W - sw) / 2, sy = wide ? Y(56) : Y(12), shh = wide ? Math.min(k.H - sy - 40, Z(600)) : k.H - Y(12) * 2 - Z(0);
    k.rect(l, 0, 0, k.W, k.H, "#020609", {a:.6});
    k.hit(l, "nw-veil", 0, 0, k.W, k.H, () => { Audio.play("close"); UIM.newsSheet = false; k.dirty(); }, {cursor:false});
    let ch = 0;
    k.slave("ModalScroll", sl => {
      const x = 22, w = sw - 44; let y = 18;
      if (!wide){ W.h3(sl, L(NT.world), x, y, {w}); y += 22; nw.papers.forEach((p, i) => { const r = sheetPaper(sl, p, x, y, w, i); y += r + 10; }); y += 4; }
      W.h3(sl, L(NT.story), x, y, {w}); y += 22;
      const lines = [], st = P.endStory();
      if (im && im.saved > .1) lines.push(th ? `[[leaf]] เทียบกับถ้าไม่ทำอะไรเลย คุณช่วยลด CO₂ ได้ ${im.saved.toFixed(1)} Gt ต่อปี และโลกเย็นกว่า ${Math.max(0, im.bauTemp - S.temp).toFixed(2)}°C` : `[[leaf]] Compared with doing nothing, you cut CO₂ by ${im.saved.toFixed(1)} Gt a year and kept the world ${Math.max(0, im.bauTemp - S.temp).toFixed(2)}°C cooler`);
      if (st.best) lines.push(`[[heart-handshake]] ${t("storyBest")}: ${P.cname(st.best)}`);
      if (st.worst) lines.push(`[[${P.HAZARDS[st.worst.type].icon}]] ${t("storyWorst")}: ${L(P.HAZARDS[st.worst.type].name)} · ${P.cname(st.worst.c)} · ${P.dateStr(st.worst.tick)}`);
      st.dec.forEach(d => lines.push(`[[git-branch]] ${L(d.title)} → ${L(d.label)}`));
      { const os = P.oreSummary ? P.oreSummary() : null; if (os && os.used) lines.push(`[[$ore]] ${t("oreUsed")} ${os.used}${os.top ? ` · ${t("oreMostFrom")} ${P.cname(os.top)} ${os.share}%` : ""}`); }
      if (!lines.length) lines.push(t("storyNone"));
      for (const x2 of lines) y += k.text(sl, x2, x, y, {size:13, w, color:"fg", iconColor:"accent"}).h + 4;
      y += 10;
      if (P.realActions){ W.h3(sl, L(NT.real), x, y, {w}); y += 22;
        for (const a of P.realActions()){ const th2 = k.textH(L(a.t), {size:13, w:w - 54, lh:1.45}), rh2 = th2 + 18;
          k.rect(sl, x, y, w, rh2, "good", {r:10, a:.1, stroke:"good", sa:.3}); k.icon(sl, a.icon, x + 11, y + 9, 20, "good"); k.text(sl, L(a.t), x + 40, y + 9, {size:13, w:w - 54, lh:1.45}); y += rh2 + 7; } }
      ch = y + 16;
      sl.frame(sx, sy, {x:sx, y:sy, w:sw, h:Math.min(shh, ch)}, ch);
    });
    const hh = Math.min(shh, ch);
    k.rect(l, sx, sy, sw, hh, "#08141a", {r:14, stroke:"line"});
    k.hit(l, "nw-box", sx, sy, sw, hh, () => {}, {cursor:false});
    W.hbtn(l, "nw-close", sx + sw - 40, sy + 10, "x", () => { Audio.play("close"); UIM.newsSheet = false; k.dirty(); }, {color:"muted"});
  }
};
function sheetPaper(l, p, x, y, w, i){
  const bg = ["#f4efe3", "#fffdf7", "#f6f3ee"][i] || "#f4efe3", hh = k.textH(p.head, {font:"dispS", size:15, w:w - 24, lh:1.3}), gh = p.gloss ? k.textH(`“${p.gloss}”`, {size:11.5, w:w - 24, lh:1.35}) : 0, ph = 30 + hh + (gh ? gh + 4 : 0) + 8;
  k.rect(l, x, y, w, ph, bg, {r:2, bg:true});
  k.text(l, p.name, x + 12, y + 7, {font:p.id === "wt" ? "logo" : "dispS", size:13.5, color:p.id === "th" ? "#c8402e" : "#1b1a17", max:1});
  k.text(l, p.head, x + 12, y + 26, {font:"dispS", size:15, color:"#1b1a17", w:w - 24, lh:1.3});
  if (gh) k.text(l, `“${p.gloss}”`, x + 12, y + 30 + hh, {size:11.5, color:"#5a564e", w:w - 24, lh:1.35});
  return ph;
}
/* the ticker band (layer "Train", redrawn every frame while the end screen shows) */
Screens.renderNewsTicker = function(l){
  const nt = this._newsTicker; if (!nt || !S.over || S.mp || UIM.newsSheet || UIM.kind() !== "end") return;
  const {y, h, s, items} = nt; if (!items || !items.length) return;
  k.rect(l, 0, y, k.W, h, "#e3262e");
  const fs = (h > 36 * s ? 16 : 14) * s, gap = 48 * s, text = items.join("     •     "), tw = k.textW(text, {font:"dispS", size:fs}) + gap;
  // (no "GCT NEWS" box at the left: every text sits above every box on a layer, so the running text would cover it)
  const off = ((performance.now() / 1000) * 60 * s) % tw;
  for (let x = -off; x < k.W; x += tw) k.text(l, text, x, y + (h - fs * 1.45) / 2, {font:"dispS", size:fs, color:"#ffffff", max:1});
};
/* every frame: the video's picture, the opening animation (about 4 s), the LIVE light and the ticker */
Screens.newsTick = function(){
  if (UIM.kind() !== "end" || S.mp){ if (this._newsVid){ stopVideos(); this._newsVid = null; } return; }
  const r = this._newsVid; if (r && r.tex && r.tex.baseTexture && r.tex.baseTexture.resource && r.tex.baseTexture.resource.update) r.tex.baseTexture.resource.update();
  const tt = (performance.now() - (UIM.endAt || 0)) / 1000;
  if (tt < 4.5) k.dirty("Modal"); else { const b = Math.floor(tt / .6); if (b !== this._nwBlink){ this._nwBlink = b; k.dirty("Modal"); } }
  k.dirty("Train");
};
