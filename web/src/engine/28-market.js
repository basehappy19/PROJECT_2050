const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.market) return;
(P.mods = P.mods || {}).market = 1;
/* =========================================================================
   Phase 3 · Full resources (Continuous World only)
   Mission 2050 keeps one "Minerals" value. In Continuous World the minerals split into five groups,
   each with its own stock, its own suppliers and a world market price:
     battery minerals (lithium, cobalt, nickel, graphite) · rare earths (and gallium) · copper ·
     silicon & glass sand · uranium
   · Every clean-energy skill has a recipe (the same total as its mineral cost, split by what it really uses;
     shares follow IEA "minerals used in clean energy technologies").
   · Friendly producers send their own groups each month; orange bubbles and purchase orders give that country's groups.
   · The market: buy any group for money at the current price, or sell spare stock. Buying pushes the price up,
     export bans and price spikes push it up, and it drifts back over time.
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en}), L = o => P.L(o);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const GROUPS = {
  bat:{icon:"$mat-bat", col:"#8fd0ff", res:["li", "co", "ni", "gr"], base:3.5, name:T("แร่แบตเตอรี่", "Battery minerals"), sub:T("ลิเทียม โคบอลต์ นิกเกิล กราไฟต์", "lithium, cobalt, nickel, graphite")},
  ree:{icon:"$mat-ree", col:"#c3a6ff", res:["ree", "ga"], base:4.5, name:T("แร่หายาก", "Rare earths"), sub:T("แม่เหล็กกังหันลมและมอเตอร์", "magnets for turbines and motors")},
  cu:{icon:"$mat-cu", col:"#f0a060", res:["cu"], base:3, name:T("ทองแดง", "Copper"), sub:T("สายไฟ สายส่ง มอเตอร์", "wires, power lines, motors")},
  si:{icon:"$mat-si", col:"#ffe08a", res:["si", "sand"], base:2.5, name:T("ซิลิคอนและทราย", "Silicon & sand"), sub:T("แผงโซลาร์ กระจก คอนกรีต", "solar panels, glass, concrete")},
  u:{icon:"$mat-u", col:"#c8f05a", res:["u"], base:4, name:T("ยูเรเนียม", "Uranium"), sub:T("เชื้อเพลิงนิวเคลียร์", "nuclear fuel")},
};
const GIDS = Object.keys(GROUPS);
/* recipe shares by skill (the rest of a skill's mineral cost is copper, the metal every electric thing needs) */
const RECIPE = {
  E1:{cu:1}, E2:{ree:.3, si:.4, cu:.3}, E8:{cu:.6, si:.4}, E3:{bat:.75, cu:.25}, E7:{si:.6, cu:.4}, E4:{u:.75, cu:.25}, E9:{bat:.5, cu:.5},
  E5:{ree:.4, bat:.3, cu:.3}, I1:{si:.5, cu:.5}, I2:{cu:.6, si:.4}, I4:{cu:1}, P4:{bat:.6, cu:.25, ree:.15}, E6:{bat:.4, cu:.6}, I3:{cu:1},
  N4:{cu:.5, si:.5}, N6:{si:1}, C2:{si:1}, C4:{si:.8, cu:.2}, C5:{si:1}, C7:{si:.5, cu:.5}, P5:{si:.5, cu:.5},
};
const groupOf = r => GIDS.find(g => GROUPS[g].res.includes(r));
const full = () => true;   // 1.1: every mode uses the five mineral groups (was Continuous World only)

function marketInit(){
  if (!full()) return;
  S.mat = S.mat || {bat:0, ree:0, cu:0, si:0, u:0};
  S.mkt = S.mkt || {bat:1, ree:1, cu:1, si:1, u:1};
  // a world continued from Mission 2050 turns its single mineral stock into groups once
  // single-value minerals (a world continued from Mission 2050, or the unlock bonus) are shared out between the groups
  if ((S.ore || 0) >= 1){ const k = S.ore / GIDS.length; GIDS.forEach(g => S.mat[g] += k); S.ore = 0; }
  // 1.5.4: the chart starts with two years of (made-up but realistic) ups and downs instead of a flat line
  const hist = S.mktHist = S.mktHist || {};
  GIDS.forEach(g => {
    if (hist[g] && hist[g].length >= 6) return;
    let v = S.mkt[g], d = 0; const back = [];
    for (let i = 0; i < 24; i++){ d = d * .7 + (Math.random() - .5) * .12; if (Math.random() < .1) d += (Math.random() < .5 ? -1 : 1) * .2; v = clamp(v - d, .6, 1.8); back.push(Math.max(1, Math.round(GROUPS[g].base * v * (P.bal ? P.bal().cost : 1) * 10) / 10)); }
    const old = hist[g] || [], need = 23 - old.length; hist[g] = back.reverse().slice(-need).concat(old.length ? old : [price(g)]);
  });
}
function matCost(n){
  if (!full() || !n.ore) return null;
  const tot = P.oreCostRaw ? P.oreCostRaw(n) : n.ore, mix = RECIPE[n.id] || {cu:1}, out = {};
  let left = tot;
  GIDS.forEach(g => { if (mix[g]){ out[g] = Math.round(tot * mix[g]); left -= out[g]; } });
  if (left) out.cu = (out.cu || 0) + left;
  Object.keys(out).forEach(g => { if (out[g] <= 0) delete out[g]; });
  return out;
}
function matOk(n){ const k = matCost(n); if (!k) return true; return GIDS.every(g => (S.mat[g] || 0) >= (k[g] || 0)); }
function matSpend(n){ const k = matCost(n); if (!k) return; GIDS.forEach(g => { S.mat[g] -= k[g] || 0; S.mkt[g] = clamp(S.mkt[g] + (k[g] || 0) * .002, .5, 3); }); S.oreUsed = (S.oreUsed || 0) + Object.values(k).reduce((a, b) => a + b, 0); }
/* monthly supply per group from friendly producers (same friendship rule as Mission 2050) */
function matSources(){
  const out = [];
  for (const c of S.countries){
    const cr = P.CRES[c.id]; if (!cr || !cr.w || c.rest || (S.oreBan || {})[c.id] > 0) continue;
    const gs = [...new Set(cr.r.map(groupOf).filter(Boolean))]; if (!gs.length) continue;
    const amt = cr.w * P.relFactor(c.rel) * (P.ORE_SRC ?? .035); if (amt <= 0) continue;
    gs.forEach(g => out.push({id:c.id, g, amt:amt / gs.length}));
  }
  return out;
}
function matGain(){
  const by = {bat:0, ree:0, cu:0, si:0, u:0}, base = ((P.ORE_HOME ?? .6) + (S.oreInc || 0)) / GIDS.length;
  GIDS.forEach(g => by[g] += base);
  matSources().forEach(x => by[x.g] += x.amt * ((S.orePrice || 0) > 0 ? .7 : 1));
  return by;
}
/* 1.1: prices move every month: a slow demand cycle, now-and-then market news (a spike or a slump),
   export bans, our own buying (up) and selling (down). The last 24 months are kept for the chart. */
const SHOCK = {
  bat:[T("ความต้องการรถไฟฟ้าทั่วโลกพุ่ง ราคาแร่แบตเตอรี่ขึ้น", "EV demand soars: battery minerals up"), T("เหมืองลิเทียมใหม่เปิดหลายแห่ง ราคาแร่แบตเตอรี่ลง", "New lithium mines open: battery minerals down")],
  ree:[T("ผู้ผลิตรายใหญ่จำกัดการส่งออกแร่หายาก ราคาพุ่ง", "A big producer limits rare-earth exports: prices jump"), T("พบแหล่งแร่หายากใหม่ ราคาลง", "New rare-earth deposits found: prices fall")],
  cu:[T("เหมืองทองแดงใหญ่หยุดชั่วคราว ราคาทองแดงขึ้น", "A giant copper mine stops for a while: copper up"), T("การก่อสร้างทั่วโลกชะลอ ราคาทองแดงลง", "Building slows worldwide: copper down")],
  si:[T("พายุทรายปิดเหมืองทราย ราคาซิลิคอนและทรายขึ้น", "Sand storms close sand mines: silicon & sand up"), T("โรงงานโพลีซิลิคอนผลิตล้นตลาด ราคาลง", "Polysilicon plants overproduce: prices fall")],
  u:[T("หลายประเทศสร้างโรงไฟฟ้านิวเคลียร์เพิ่ม ราคายูเรเนียมขึ้น", "More countries build nuclear plants: uranium up"), T("โรงไฟฟ้านิวเคลียร์เก่าปลดระวาง ราคายูเรเนียมลง", "Old nuclear plants retire: uranium down")],
};
function marketTick(){
  if (!full()) return false;
  marketInit();
  // 1.7: what arrives raw has to go through a refinery first (33-supply.js); the rest is ready to use
  const sp = P.matSplit ? P.matSplit() : {raw:{}, ref:matGain()};
  GIDS.forEach(g => { S.mat[g] += sp.ref[g] || 0; if (sp.raw[g]) S.raw[g] = (S.raw[g] || 0) + sp.raw[g]; });
  if (P.refineTick) P.refineTick();
  const banned = Object.keys(S.oreBan || {}).filter(k => S.oreBan[k] > 0), R = P.rand;
  const dr = S.mktDrift = S.mktDrift || {bat:0, ree:0, cu:0, si:0, u:0}, hist = S.mktHist = S.mktHist || {bat:[], ree:[], cu:[], si:[], u:[]};
  // market news, about once every 3 years per group
  if (R() < .14){
    const g = GIDS[Math.floor(R() * GIDS.length)], up = R() < .55;
    dr[g] = clamp(dr[g] + (up ? .35 : -.28), -.4, .7);
    P.addLog(`[[${up ? "trending-up" : "trending-down"}]] ${L(SHOCK[g][up ? 0 : 1])}`, "in");
  }
  GIDS.forEach(g => {
    dr[g] = clamp(dr[g] * .93 + (R() - .5) * .09, -.4, .7);   // demand cycle that slowly fades
    let target = 1 + dr[g] + ((S.orePrice || 0) > 0 ? .35 : 0);
    banned.forEach(id => { const cr = P.CRES[id]; if (cr && cr.r.some(r => groupOf(r) === g)) target += .12 * cr.w / 2; });
    S.mkt[g] = clamp(S.mkt[g] + (target - S.mkt[g]) * .18 + (R() - .5) * .07, .5, 3);   // 1.5.4: livelier month-to-month moves
    (hist[g] = hist[g] || []).push(price(g)); if (hist[g].length > 24) hist[g].shift();
  });
  return true;
}
const price = g => Math.max(1, Math.round(GROUPS[g].base * S.mkt[g] * (P.bal ? P.bal().cost : 1) * 10) / 10);
const LOT = 10;
/* buying lifts the price, selling lowers it (0.4% / 0.3% per unit) */
const lotCost = (g, n) => Math.ceil(price(g) * n);
function mktBuy(g, n = LOT){ marketInit(); n = Math.max(1, Math.round(n)); const k = lotCost(g, n); if (S.ep < k) return false; S.ep -= k; S.mat[g] += n; S.mkt[g] = clamp(S.mkt[g] + .004 * n, .5, 3); P.changed(); return true; }
const sellGain = (g, n = LOT) => Math.floor(price(g) * n * .7);
function mktSell(g, n = LOT){ marketInit(); if ((S.mat[g] || 0) < n) return false; S.mat[g] -= n; S.ep += sellGain(g, n); S.mkt[g] = clamp(S.mkt[g] - .003 * n, .5, 3); P.changed(); return true; }
/* how much of a group the skills we can buy next are short of (for "buy what's missing") */
function matShort(g){
  if (!S.oreOn) return null;
  const cand = P.SKILLS.filter(n => P.nodeState(n) === "ready" && matCost(n) && (matCost(n)[g] || 0) > (S.mat[g] || 0));
  if (!cand.length) return null;
  const sel = cand.find(n => n.id === S.node) || cand.sort((a, b) => (matCost(a)[g] - S.mat[g]) - (matCost(b)[g] - S.mat[g]))[0];
  return {n:sel, need:Math.ceil(matCost(sel)[g] - (S.mat[g] || 0))};
}
/* what each group is used for (skills not owned yet) */
const matUsers = g => P.SKILLS.filter(n => !S.owned[n.id] && n.ore && (RECIPE[n.id] || {cu:1})[g]);
const matTotal = () => GIDS.reduce((s, g) => s + Math.floor(S.mat ? S.mat[g] || 0 : 0), 0);

/* hook into the light version: in Continuous World the single value is replaced by the groups */
const _oreCost = P.oreCost; P.oreCostRaw = _oreCost;
P.oreCost = n => (full() ? 0 : _oreCost(n));
const _spend = P.spendOre; P.spendOre = n => (full() ? matSpend(n) : _spend(n));
const _tick = P.oreTick; P.oreTick = () => { if (!S.oreOn) return _tick(); if (marketTick()){ const bk = S.ore; _tick(); S.ore = bk; } else _tick(); };
const _pop = P.popOre; P.popOre = b => {
  if (!full()) return _pop(b);
  marketInit(); const cr = P.CRES[b.cid], gs = cr ? [...new Set(cr.r.map(groupOf).filter(Boolean))] : []; const g = gs.length ? gs[Math.floor(P.rand() * gs.length)] : "cu";
  const gain = 5 + Math.round(P.rand() * 3); if (P.arrives) P.arrives(b.cid, g, gain); else S.mat[g] += gain; return gain;
};
const _buy = P.oreBuy; P.oreBuy = c => {
  if (!full()) return _buy(c);
  marketInit(); const gs = [...new Set((P.CRES[c.id] || {r:[]}).r.map(groupOf).filter(Boolean))]; const gain = Math.round(8 + 6 * P.relFactor(c.rel));
  const put = (g, n) => (P.arrives ? P.arrives(c.id, g, n) : (S.mat[g] += n));
  if (!gs.length) { put("cu", gain); return gain; } gs.forEach(g => put(g, Math.round(gain / gs.length))); return gain;
};
const _gain = P.oreGain; P.oreGain = () => (full() && S.oreOn ? Object.values(matGain()).reduce((a, b) => a + b, 0) : _gain());
const _afford = P.canAfford; P.canAfford = n => _afford(n) && matOk(n);

Object.assign(P, {MAT:GROUPS, MAT_IDS:GIDS, RECIPE, matCost, matOk, matSpend, matGain, matSources, marketInit, marketTick, mktPrice:price, MKT_LOT:LOT, mktBuy, mktSell, mktLotCost:lotCost, mktSellGain:sellGain, matShort, matUsers, matTotal, isFullRes:full, groupOf});
