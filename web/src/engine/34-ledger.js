const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.ledger) return;
(P.mods = P.mods || {}).ledger = 1;
/* =========================================================================
   Version 1.6 · Where the money and policy points came from and went to, year by year (statistics panel)
   S.ledger = {2026: {income:{ep:[in, out], pc:[in, out]}, skills:{…}, …}, …}
   · Player actions are measured by what they changed (before → after).
   · Inside a month, the engine tags what it can name (income, disasters, sanctions, refinery upkeep, protests…);
     whatever is left over goes to "other".
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en});

/* categories: icon, name, and which side they usually sit on */
const CATS = {
  income:{icon:"landmark", t:T("รายได้ประจำเดือน", "Monthly income")},
  green:{icon:"leaf", t:T("ฟองสีเขียว", "Green bubbles")},
  sell:{icon:"store", t:T("ขายทรัพยากร", "Selling resources")},
  event:{icon:"lightbulb", t:T("เหตุการณ์", "Events")},
  ability:{icon:"sparkles", t:T("สกิลกดใช้", "Abilities")},
  support:{icon:"users", t:T("กลุ่มที่สนับสนุน", "Groups backing you")},
  news:{icon:"newspaper", t:T("ข่าวและรายงาน", "News & reports")},
  skills:{icon:"network", t:T("สกิล", "Skills")},
  orders:{icon:"flag", t:T("คำสั่งทวีปและประเทศ", "Orders")},
  diplo:{icon:"handshake", t:T("การทูต", "Diplomacy")},
  evac:{icon:"siren", t:T("อพยพ", "Evacuations")},
  aid:{icon:"heart-handshake", t:T("ช่วยผู้ประสบภัย", "Disaster aid")},
  buy:{icon:"shopping-cart", t:T("ซื้อทรัพยากร", "Buying resources")},
  refinery:{icon:"factory", t:T("โรงแยกแร่", "Refineries")},
  hazard:{icon:"cloud-lightning", t:T("ความเสียหายจากภัย", "Disaster damage")},
  sanct:{icon:"ban", t:T("ถูกคว่ำบาตร", "Sanctions")},
  protest:{icon:"megaphone", t:T("ประท้วง", "Protests")},
  bond:{icon:"banknote", t:T("ผ่อนพันธบัตร", "Bond repayments")},
  other:{icon:"ellipsis", t:T("อื่น ๆ", "Other")},
};
const year = () => 2026 + Math.floor((S.tick || 0) / 12);
let tagged = null;   // ep / pc already tagged during the current month
function add(cat, ep, pc){
  if (!S.regions || (!ep && !pc)) return;
  const L = S.ledger = S.ledger || {}, y = L[year()] = L[year()] || {}, c = y[cat] = y[cat] || {ep:[0, 0], pc:[0, 0]};
  if (ep > 0) c.ep[0] += ep; else if (ep < 0) c.ep[1] -= ep;
  if (pc > 0) c.pc[0] += pc; else if (pc < 0) c.pc[1] -= pc;
}
P.ledgerTag = (cat, ep, pc) => { add(cat, ep, pc); if (tagged){ tagged.ep += ep || 0; tagged.pc += pc || 0; } };

/* measure a player action by what it changed */
function measure(name, catOf){
  const f = P[name]; if (typeof f !== "function") return;
  P[name] = (...a) => {
    if (!S.regions) return f(...a);
    const cat = typeof catOf === "function" ? catOf(...a) : catOf, e0 = S.ep, p0 = S.pc;
    const outer = tagged; tagged = null;
    const r = f(...a);
    tagged = outer;
    add(cat, S.ep - e0, S.pc - p0);
    return r;
  };
}
measure("buyNode", "skills");
measure("doAction", "orders");
measure("countryAction", aid => (aid === "ore" ? "buy" : "orders"));
measure("bilateral", "diplo");
measure("formAlliance", "diplo");
measure("evacuate", "evac");
measure("popBubble", id => { const b = (S.bubbles || []).find(q => q.id === id); return b && b.type === "green" ? "green" : "aid"; });
measure("mktBuy", "buy");
measure("mktSell", "sell");
measure("chooseOption", "event");
measure("useAbility", "ability");
measure("buildRefinery", "refinery");
measure("readNews", "news");
measure("readReport", "news");

/* a month: what the engine tagged, the rest is "other" */
const _tick = P.tick;
P.tick = () => {
  if (!S.regions) return _tick();
  const e0 = S.ep, p0 = S.pc, y0 = year();
  tagged = {ep:0, pc:0};
  _tick();
  const t = tagged; tagged = null;
  const de = S.ep - e0 - t.ep, dp = S.pc - p0 - t.pc;
  if (Math.abs(de) > .01 || Math.abs(dp) > .01){
    // credit the leftover to the year the month started in (the income above already went to its own year)
    const keep = S.tick; if (year() !== y0) S.tick -= 1; add("other", de, dp); S.tick = keep;
  }
};

/* totals for a period: "year" (this year), "last" (last year) or "all" */
function ledgerSum(period, cur = "ep"){
  const L = S.ledger || {}, y = year(), ys = period === "all" ? Object.keys(L) : [String(period === "last" ? y - 1 : y)];
  const inc = {}, out = {};
  for (const k of ys) for (const [cat, v] of Object.entries(L[k] || {})){
    const [a, b] = v[cur] || [0, 0];
    if (a) inc[cat] = (inc[cat] || 0) + a;
    if (b) out[cat] = (out[cat] || 0) + b;
  }
  const list = o => Object.entries(o).map(([cat, v]) => ({cat, v:Math.round(v)})).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const I = list(inc), O = list(out);
  return {inc:I, out:O, tIn:I.reduce((s, x) => s + x.v, 0), tOut:O.reduce((s, x) => s + x.v, 0)};
}
/* small countries: Mt instead of 0.00 Gt */
const fmtCO2 = g => (Math.abs(g) >= .1 ? `${g.toFixed(2)} Gt` : `${(g * 1000).toFixed(g * 1000 >= 10 ? 0 : 1)} Mt`);
Object.assign(P, {fmtCO2, LEDGER_CATS:CATS, ledgerSum, ledgerYear:year});
