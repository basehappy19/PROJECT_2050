const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.orders39) return;
(P.mods = P.mods || {}).orders39 = 1;
/* =========================================================================
   3.9 · The country panel, worked out once for the web drawer and the GDevelop drawer
   · orders grouped by what they are for (cut CO₂ / friendship / disaster protection / resources)
   · every effect as a short token computed from the real formulas (20-engine.js countryAction and doAction),
     so "× on-plan" shows as the number you actually get now
   · the minerals a country has, and whether they still need refining
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

P.ORDER_GOALS = [
  {id:"co2", icon:"trending-down", col:"good", name:T("ลด CO₂", "Cut CO₂")},
  {id:"rel", icon:"heart", col:"pink", name:T("มิตรภาพ", "Friendship")},
  {id:"def", icon:"shield", col:"sky", name:T("ป้องกันภัย", "Disaster protection")},
  {id:"res", icon:"package", col:"gold", name:T("ทรัพยากร", "Resources")},
];
/* kind "c" = an order with this country (CACTS) · kind "a" = a regional order aimed at this country (ACTIONS, country scope) */
const GOAL = {c:{ore:"res", talk:"rel", fund:"co2", tech:"co2", shield:"def"}, a:{fund:"co2", diplo:"rel", adapt:"def", tariff:"co2"}};

const num = v => { const a = Math.abs(v); return a >= 10 || a === Math.round(a) ? String(Math.round(a)) : a.toFixed(1); };
const sg = v => (v < 0 ? "−" : "+") + num(v);
/* one token: icon, value, bad?, and a longer line for the tooltip */
const tk = (ic, v, bad, tip) => ({ic, v, bad:!!bad, tip:tip || null});
const rel = v => tk("$heart", sg(v), v < 0, T(`มิตรภาพ ${sg(v)}`, `Friendship ${sg(v)}`));
const co2 = (pct, tip) => tk("$co2", sg(pct) + "%", pct > 0, tip || T(`CO₂ ของประเทศนี้ ${sg(pct)}%`, `This country's CO₂ ${sg(pct)}%`));
const green = v => tk("leaf", sg(v), false, T(`เทคโนโลยีสีเขียว ${sg(v)}`, `Green technology ${sg(v)}`));
const shield = v => tk("shield", sg(v), false, T(`ป้องกันภัย ${sg(v)} (ภัยเสียหายน้อยลง)`, `Disaster protection ${sg(v)} (less damage)`));

/* the mineral groups a country's mines feed, and whether that country refines them itself */
function oreDetail(c){
  const cr = P.CRES && P.CRES[c.id], rf = P.relFactor ? P.relFactor(c.rel) : .3, gain = Math.round(12 + 8 * rf);
  if (!P.groupOf || !P.MAT) return [{g:null, n:gain, ready:true}];
  const gs = [...new Set((cr ? cr.r : []).map(P.groupOf).filter(Boolean))];
  if (!gs.length) return [{g:"cu", n:gain, ready:!!(P.refines && P.refines(c.id, "cu"))}];
  return gs.map(g => ({g, n:Math.round(gain / gs.length), ready:!!(P.refines && P.refines(c.id, g))}));
}
function orderFx(kind, id, c){
  const r = P.R(c.reg), comp = r ? r.comp / 100 : 1;
  if (kind === "c"){
    if (id === "talk") return [rel(10)];
    if (id === "fund") return [rel(20), co2(-8, T("CO₂ ของประเทศนี้ −8% ภายใน 12 เดือน", "This country's CO₂ −8% over 12 months")), green(10)];
    if (id === "tech") return [rel(8), co2(-5), green(15)];
    if (id === "shield") return [shield(20), rel(4)];
    if (id === "ore") return [...oreDetail(c).map(o => o.g ? {...tk(P.MAT[o.g].icon, "+" + o.n, false, T(`${P.L(P.MAT[o.g].name)} +${o.n}${o.ready ? "" : " (ต้องแปรรูป)"}`, `${P.L(P.MAT[o.g].name)} +${o.n}${o.ready ? "" : " (needs refining)"}`)), mat:P.MAT[o.g].name, raw:!o.ready} : tk("$ore", "+" + o.n)), rel(2)];
  } else {
    if (id === "fund") return [co2(-12 * comp, T(`CO₂ ของประเทศนี้ ${sg(-12 * comp)}% (−12% × ความร่วมมือ ${Math.round(comp * 100)}%)`, `This country's CO₂ ${sg(-12 * comp)}% (−12% × on-plan ${Math.round(comp * 100)}%)`)), rel(3)];
    if (id === "diplo") return [rel(12)];
    if (id === "adapt") return [shield(20), rel(4)];
    if (id === "tariff"){
      const k = -20 * Math.pow(.7, c.tar || 0) * comp, out = [co2(k, T(`CO₂ ของประเทศนี้ ${sg(k)}% (ได้ผลน้อยลงทุกครั้งที่ใช้)`, `This country's CO₂ ${sg(k)}% (weaker each time)`)), rel(-22), tk("$appr", "−1%", true, T("ความนิยม −1%", "Approval −1%"))];
      if (c.rel - 22 <= -20) out.push(tk("ban", "", true, T("อาจถูกคว่ำบาตร", "May bring sanctions")));
      return out;
    }
  }
  return null;
}
/* the minerals in a country, for the badges under its numbers */
function countryMinerals(c){
  const cr = P.CRES && P.CRES[c.id]; if (!cr || !P.RES) return [];
  return cr.r.map(k => { const g = P.groupOf ? P.groupOf(k) : null;
    return {k, icon:"$res-" + k, name:P.L(P.RES[k].name).replace(/\s*\(.*\)$/, ""), raw:!!g && !(P.refines && P.refines(c.id, g))}; });
}
/* the orders for one country, grouped by goal: [{goal, items:[{kind, a}]}] */
function countryOrders(){
  const items = [...(P.CACTS || []).filter(a => !a.req || S.owned[a.req]).map(a => ({kind:"c", a})), ...(P.ACTIONS || []).map(a => ({kind:"a", a}))];
  return P.ORDER_GOALS.map(goal => ({goal, items:items.filter(x => (GOAL[x.kind][x.a.id] || "co2") === goal.id)})).filter(x => x.items.length);
}
/* CO₂ in Gt only: 3.05 · 0.45 · 0.025 */
const fmtGt = g => (g >= .1 ? g.toFixed(2) : g >= .001 ? g.toFixed(3) : g.toFixed(4));
Object.assign(P, {orderFx, oreDetail, countryMinerals, countryOrders, fmtGt});
