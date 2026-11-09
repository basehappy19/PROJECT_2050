const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.windows3) return;
(P.mods = P.mods || {}).windows3 = 1;
/* =========================================================================
   Screens · 3.3 windows (same designs as the website)
   · Minerals market (design A): one table row per mineral — have (+ raw waiting) · price + change · trend ·
     refining per month (+ build a refinery) · buy 10 / sell 10
   · Approval (design B): one bar split by group size, one row per group (face · % · protest/backing zones ·
     how far to backing), and what each group dislikes — no advice on what to buy
   · Yearly review: score ring, CO₂ against the year's target, a short story line, reward or cost
   Drawn inside the modal frame of 63-modals.js (x, y relative to the window; returns the content height).
   ========================================================================= */
const {Kit, S, t, L, Audio, W, UIM, Screens, IC} = P;
const k = Kit;
const th = () => S.lang === "th";
const FACE = {back:["laugh", "good"], ok:["smile", "muted"], low:["frown", "warn"], angry:["angry", "bad"]};
const title = (l, ic, txt, x, y, extra) => { k.icon(l, ic, x, y + 2, 26); const r = k.text(l, txt, x + 36, y, {font:"disp", size:22}); if (extra) k.text(l, extra[0], x + 46 + r.w, y + 2, {font:"monoB", size:22, color:extra[1]}); return 40; };

/* small trend line */
function spark(l, x, y, w, h, data, col){
  if (!data || data.length < 2) return;
  const lo = Math.min(...data), hi = Math.max(...data), span = hi - lo || 1;
  for (let i = 1; i < data.length; i++){
    const x1 = x + (i - 1) / (data.length - 1) * w, x2 = x + i / (data.length - 1) * w;
    k.line(l, x1, y + h - (data[i - 1] - lo) / span * h, x2, y + h - (data[i] - lo) / span * h, col, {w:1.6});
  }
  k.circle(l, x + w, y + h - (data[data.length - 1] - lo) / span * h, 2.6, col);
}

/* ---------------- minerals market ---------------- */
Screens.mMarket = function(l, pw){
  P.marketInit && P.marketInit();
  const x = 20, w = pw - 40, lot = P.MKT_LOT || 10; let y = 18;
  y += title(l, "$mat-bat", th() ? "ตลาดทรัพยากร" : "Minerals market", x, y);
  const cash = `${IC.ep} ${Math.floor(S.ep)}`, cw = k.textW(cash, {font:"monoB", size:14}) + 20;
  k.rect(l, x + w - 44 - cw, 22, cw, 26, "panel2", {r:13}); k.text(l, cash, x + w - 44 - cw + 10, 26, {font:"monoB", size:14});
  /* 3.7.6 · design 1 (same as the website): raw → refining belt → ready · price with last month's price · trend line
     green (up) / red (down) · the two countries that sent the most · instant buy (dear, gold) / sell */
  const C = {name:x + 14, pipe:x + 214, price:x + 452, trend:x + 572, from:x + 690, btn:x + w - 12};
  const head = [[th() ? "แร่" : "Mineral", C.name], [th() ? "แร่ดิบ → แปรรูป → พร้อมใช้" : "Raw → refining → ready", C.pipe], [th() ? "ราคาตลาด" : "Price", C.price], [th() ? "แนวโน้ม" : "Trend", C.trend], [th() ? "ได้มาจากไหนมากสุด" : "Mostly from", C.from]];
  for (const [s2, cx] of head) k.text(l, s2, cx, y, {size:11.5, color:"muted"});
  y += 20;
  const now = performance.now() / 1000, UP = "#5fd39a", DOWN = "#ff6b5c";
  for (const g of P.MAT_IDS){
    const G = P.MAT[g], pr = P.mktPrice(g), hist = (S.mktHist || {})[g] || [], prev = hist.length > 1 ? hist[hist.length - 2] : pr;
    const chg = prev ? (pr - prev) / prev * 100 : 0, up = chg >= 0, k10 = P.mktLotCost(g, lot), raw = P.rawFor ? P.rawFor(g) : 0, rh = 58;
    W.card(l, x, y, w, rh, {r:12});
    k.rect(l, x, y + 4, 4, rh - 8, G.col, {r:2});
    k.icon(l, G.icon, C.name - 2, y + 12, 32);
    k.text(l, L(G.name), C.name + 38, y + 9, {font:"dispS", size:14, w:150, max:1});
    if (P.refCap){
      const b = (S.refBuild || {})[g], max = P.refLevel(g) >= P.REF_MAX_LV, kc = P.refCost(g);
      const rv = k.text(l, `[[factory]] ${P.refCap(g).toFixed(1)}`, C.name + 38, y + 31, {font:"mono", size:12, color:"muted", iconColor:"muted"});
      if (b) k.text(l, `[[hammer]] ${b}`, C.name + 38 + rv.w + 8, y + 32, {font:"mono", size:11.5, color:"muted", iconColor:"muted"});
      else if (!max) W.hbtn(l, "ref-" + g, C.name + 38 + rv.w + 6, y + 28, "plus", () => { if (P.buildRefinery(g)){ Audio.play("buy"); k.dirty(); } }, {s:24, is:13, color:"accent", disabled:!P.canBuild(g)});
      if (!b && !max && k.isHover(l, "ref-" + g)) k.text(l, `${th() ? "สร้างโรงแปรรูป" : "Build a refinery"} · ${IC.ep} ${kc.ep} · ${IC.pc} ${kc.pc}`, C.name + 38, y + rh - 2, {size:11, color:"accent"});
    }
    // raw · belt (ore moving into the machine while there is raw ore) · ready
    const py = y + rh / 2;
    k.text(l, String(raw), C.pipe, py - 10, {font:"monoB", size:15, color:raw ? "warn" : "muted", w:28, align:"right", a:raw ? 1 : .6});
    const bx = C.pipe + 36, bw2 = 128;
    k.rect(l, bx, py - 9, bw2, 18, "#122329", {r:6});
    for (let i = 8; i < bw2 - 4; i += 16) k.rect(l, bx + i, py - 9, 8, 18, "#183038");
    if (raw) for (let i = 0; i < 4; i++){ const ph = ((now / 2.2) + i / 4) % 1, fa = ph < .12 ? ph / .12 : ph > .85 ? (1 - ph) / .15 : 1; k.rect(l, bx + 2 + ph * (bw2 - 11), py - 3.5, 7, 7, G.col, {r:2, a:fa}); }
    const mx = bx + bw2 + 6, glow = raw ? .5 + .5 * Math.sin(now * 4) : 0;
    k.rect(l, mx, py - 14, 28, 28, "#183038", {r:8, stroke:raw ? G.col : "line", sa:raw ? .6 + .4 * glow : 1});
    k.icon(l, "factory", mx + 6, py - 8, 16, raw ? G.col : "muted");
    k.text(l, String(Math.floor(S.mat[g] || 0)), mx + 36, py - 13, {font:"monoB", size:20});
    // price · last month's price and change
    k.text(l, `${IC.ep} ${pr.toFixed(1)}`, C.price, y + 10, {font:"monoB", size:14});
    if (Math.abs(chg) >= .5) k.text(l, `${prev.toFixed(1)} ${up ? "▲" : "▼"}${Math.abs(chg).toFixed(0)}%`, C.price, y + 32, {font:"monoB", size:12, color:up ? UP : DOWN});
    else k.text(l, th() ? "เท่าเดิม" : "no change", C.price, y + 32, {size:11.5, color:"muted"});
    spark(l, C.trend, y + 16, 100, 26, hist, up ? UP : DOWN);
    // the two countries that sent the most of this mineral
    { const all = P.matTop ? P.matTop(g, 8) : [], tot = all.reduce((s2, q) => s2 + q.n, 0), list = all.filter(q => q.id.length === 3 && P.FLAG2 && P.FLAG2[q.id]).slice(0, 2);
      if (!list.length) k.text(l, th() ? "ในประเทศ" : "Home", C.from, py - 9, {size:12, color:"muted"});
      let fx = C.from; for (const q of list){ k.sprite(l, "UIFlag", P.FLAG2[q.id], fx, py - 8, 21, 16); fx += 25; fx += k.text(l, `${Math.round(q.n / tot * 100)}%`, fx, py - 9, {font:"monoB", size:11.5}).w + 10; } }
    const sl = `${th() ? "ขาย" : "Sell"} ${lot} · +${P.mktSellGain(g, lot)}`, bl = `${th() ? "ซื้อทันที" : "Buy now"} ${lot} · ${IC.ep} ${k10}`;
    const sw = W.btnW(sl, {size:12.5}), bwid = W.btnW(bl, {size:12.5});
    W.btn(l, "sell-" + g, C.btn - sw, y + 13, sl, () => { if (P.mktSell(g, lot)){ Audio.play("buy"); k.dirty(); } }, {kind:"ghost", size:12.5, h:32, disabled:(S.mat[g] || 0) < lot, sound:false});
    W.btn(l, "buy-" + g, C.btn - sw - 6 - bwid, y + 13, bl, () => { if (P.mktBuy(g, lot)){ Audio.play("buy"); k.dirty(); } }, {kind:"goldline", size:12.5, h:32, disabled:S.ep < k10, sound:false});
    y += rh + 6;
  }
  y += 4;
  y += k.text(l, `[[circle-help]] ${th() ? "ตัวเลขสีส้ม = แร่ดิบรอแปรรูป · ตัวเลขใหญ่ = พร้อมใช้ · ซื้อทันทีแพงกว่าซื้อจากประเทศราว 2–3 เท่า (แตะประเทศบนแผนที่เพื่อซื้อ)" : "Orange = raw, waiting to be refined · big number = ready · buying now costs 2–3× more than buying from a country (tap a country on the map)"}`, x, y, {size:12, color:"muted", iconColor:"muted", w}).h;
  return y + 18;
};

/* ---------------- approval ---------------- */
Screens.mPolitics = function(l, pw){
  const x = 20, w = pw - 40; let y = 18;
  const ac = S.appr < 25 ? "bad" : S.appr < 45 ? "warn" : "good";
  y += title(l, "$appr", th() ? "ความนิยม" : "Approval", x, y, [`${S.appr.toFixed(0)}%`, ac]);
  y += k.text(l, th() ? "ใครมีผลกับความนิยมมากแค่ไหน" : "Who counts for how much", x, y, {size:12, color:"muted"}).h + 6;
  // one bar split by group size
  let sx = x;
  P.GROUPS.forEach((G, i) => {
    const gw = w * G.w, last = i === P.GROUPS.length - 1;
    k.rect(l, sx, y, gw, 30, G.color, {r:i === 0 || last ? 10 : 0});
    const lab = `${Math.round(G.w * 100)}%`, lw = k.textW(lab, {font:"dispS", size:13}) + 22;
    k.icon(l, G.icon, sx + gw / 2 - lw / 2, y + 7, 16, "#04201d"); k.text(l, lab, sx + gw / 2 - lw / 2 + 20, y + 5, {font:"dispS", size:13, color:"#04201d"});
    sx += gw;
  });
  y += 40;
  // one row per group
  for (const G of P.GROUPS){
    const g = G.id, v = S.groups[g], st = P.groupState(g), goal = P.groupGoal(g), [face, fc] = FACE[st];
    const back = Math.min(99, Math.max(P.GROUP_BACK, goal.mean + 6)), rh = 50;
    W.card(l, x, y, w, rh, {r:12, stroke:st === "angry" ? "bad" : st === "back" ? "good" : "line", sa:st === "ok" || st === "low" ? 1 : .6});
    k.icon(l, G.icon, x + 14, y + 15, 20, G.color);
    k.text(l, L(G.name), x + 42, y + 14, {font:"dispS", size:15, w:150, max:1});
    k.icon(l, face, x + 200, y + 13, 24, fc);
    k.text(l, `${v.toFixed(0)}%`, x + 234, y + 11, {font:"disp", size:21, color:G.color});
    const h = (S.grpHist || {})[g] || [], d = h.length > 1 ? v - h[Math.max(0, h.length - 13)] : 0;
    if (Math.abs(d) >= 1) k.text(l, `${d > 0 ? "▲" : "▼"}${Math.abs(d).toFixed(0)}`, x + 290, y + 18, {font:"monoB", size:11, color:d > 0 ? "good" : "bad"});
    // bar with the protest zone (left) and the backing zone (right)
    const bx = x + 330, bw2 = w - 330 - 130, byy = y + 21;
    k.rect(l, bx, byy, bw2, 10, "panel", {r:5});
    k.rect(l, bx, byy, bw2 * P.GROUP_ANGRY / 100, 10, "bad", {r:5, a:.22});
    k.rect(l, bx + bw2 * back / 100, byy, bw2 * (1 - back / 100), 10, "good", {r:5, a:.18});
    k.rect(l, bx, byy, Math.max(10, bw2 * v / 100), 10, G.color, {r:5});
    k.rect(l, bx + bw2 * back / 100 - 1, byy - 2, 2, 14, "white");
    const sTxt = st === "back" ? (th() ? "สนับสนุน" : "Backing") : st === "angry" ? `[[megaphone]] ${th() ? "ประท้วง" : "Protest"}` : (th() ? `อีก ${Math.ceil(goal.toBack)}%` : `${Math.ceil(goal.toBack)}% to go`);
    const sCol = st === "back" ? "good" : st === "angry" ? "bad" : "warn", sw = k.textW(sTxt, {font:"dispS", size:13});
    k.text(l, sTxt, x + w - 16 - sw, y + 16, {font:"dispS", size:13, color:sCol, iconColor:sCol});
    y += rh + 7;
  }
  // what each group dislikes
  y += 4;
  const chips = [];
  for (const G of P.GROUPS) for (const s of L(G.hates).split(/\s*[·,]\s*/).filter(Boolean)) chips.push([G, s]);
  let cx = x; k.text(l, `[[frown]] ${th() ? "ไม่ชอบ:" : "Dislikes:"}`, cx, y + 3, {size:12, color:"muted", iconColor:"bad"}); cx += k.textW(`[[frown]] ${th() ? "ไม่ชอบ:" : "Dislikes:"}`, {size:12}) + 8;
  for (const [G, s] of chips){
    const cw = k.textW(s, {size:12}) + 34;
    if (cx + cw > x + w){ cx = x; y += 28; }
    k.rect(l, cx, y, cw, 24, "panel2", {r:12, stroke:G.color, sa:.55});
    k.icon(l, G.icon, cx + 9, y + 5, 13, G.color); k.text(l, s, cx + 26, y + 3, {size:12});
    cx += cw + 6;
  }
  y += 34;
  y += k.text(l, `[[circle-help]] ${th() ? `กลุ่มที่ถึง ${P.GROUP_BACK}% จะสนับสนุนคุณและให้โบนัส · ต่ำกว่า ${P.GROUP_ANGRY}% จะประท้วง` : `A group at ${P.GROUP_BACK}% backs you and gives a bonus · below ${P.GROUP_ANGRY}% it protests`}`, x, y, {size:12, color:"muted", iconColor:"muted", w}).h;
  return y + 18;
};

/* ---------------- yearly review ---------------- */
Screens.mYear = function(l, pw){
  const r = UIM.yearRec; if (!r) return 80;
  const T2 = P.UI2, good = !!r.g, x = 20, w = pw - 40, col = good ? "good" : "bad"; let y = 18;
  k.text(l, P.up(`[[${good ? "trending-up" : "trending-down"}]] ${L(T2.yrTitle)} ${r.y}`), x, y, {font:"mono", size:11.5, color:col, iconColor:col}); y += 20;
  const hh = k.text(l, good ? L(T2.yrGood) : L(T2.yrBad), x, y, {font:"disp", size:22, w:w - 130, lh:1.25}).h;
  // score ring
  const cx = x + w - 52, cy = 64, R = 40;
  k.circle(l, cx, cy, R, "panel2");
  for (let i = 0; i < 60; i++){ if (i / 60 > r.s / 100) break; const a = -Math.PI / 2 + i / 60 * Math.PI * 2; k.circle(l, cx + Math.cos(a) * (R - 5), cy + Math.sin(a) * (R - 5), 4, col); }
  k.circle(l, cx, cy, R - 11, "panel");
  k.text(l, String(r.s), cx - 30, cy - 15, {font:"disp", size:24, w:60, align:"center", color:col});
  k.text(l, "/100", cx - 30, cy + 12, {font:"mono", size:10, w:60, align:"center", color:"muted"});
  y += Math.max(hh, 30) + 12;
  // numbers
  const nums = [[t("co2"), `${r.net.toFixed(1)} Gt`, "fg"], [L(T2.yrTarget), `≤ ${r.tgt.toFixed(1)} Gt`, "fg"], [L(T2.yrCut), `${r.cut > 0 ? "−" : "+"}${Math.abs(r.cut).toFixed(1)} Gt`, r.cut > 0 ? "good" : "bad"]];
  let nx = x;
  for (const [a, b, c] of nums){ k.text(l, a, nx, y, {size:11.5, color:"muted"}); k.text(l, b, nx, y + 16, {font:"monoB", size:16, color:c}); nx += 140; }
  y += 50;
  // story line
  const st = P.yearStory ? P.yearStory(r) : null;
  if (st){
    const sy = y;
    const who = st.who, npc = P.NPC && P.NPC[who], name = who === "news" ? "THE WORLD TIMES" : npc ? L(npc.name) : who === "adv" ? L(P.ADVISOR.name) : "";
    const nh = k.text(l, name, x + 16, y + 12, {font:"dispS", size:13, color:npc ? npc.color : "purple"}).h;
    const th2 = k.text(l, `“${L(st)}”`, x + 16, y + 14 + nh, {size:14, w:w - 32, lh:1.45}).h;
    const ch = nh + th2 + 26; k.rect(l, x, sy, w, ch, "panel2", {r:12, stroke:"line", under:true});
    y += ch + 12;
  }
  // reward / cost
  const parts = [];
  if (r.ep) parts.push(`${IC.ep} +${r.ep}`);
  if (r.pc) parts.push(`${IC.pc} +${r.pc}`);
  if (r.appr) parts.push(`${IC.appr || "[[$appr]]"} ${r.appr > 0 ? "+" : "−"}${Math.abs(r.appr).toFixed(1)}%`);
  k.rect(l, x, y, w, 40, col, {r:10, a:.1, stroke:col, sa:.5});
  k.text(l, `[[${good ? "hand-coins" : "shield-alert"}]] ${good ? L(T2.yrRewardGood) : L(T2.yrRewardBad)}`, x + 12, y + 11, {size:13, color:col, iconColor:col, w:w - 200, max:1});
  const pt = parts.join("   "), pw2 = k.textW(pt, {font:"monoB", size:13});
  k.text(l, pt, x + w - 12 - pw2, y + 11, {font:"monoB", size:13, color:col});
  y += 52;
  const ng = (S.years || []).filter(q => q.g).length;
  k.text(l, `${L(T2.yrGoodYears)} ${ng} / ${(S.years || []).length}`, x, y + 9, {size:12, color:"muted"});
  const nl = `${L(T2.yrNext)} [[chevron-right]]`, nw = W.btnW(nl);
  W.btn(l, "yearnext", x + w - nw, y, nl, () => Screens.closeWin());
  y += 46;
  y += k.text(l, L(T2.yrHow), x, y, {size:11, color:"muted", w, lh:1.35}).h;
  return y + 16;
};
