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
  bat:{icon:"battery-full", col:"#8fd0ff", res:["li", "co", "ni", "gr"], base:6, name:T("แร่แบตเตอรี่", "Battery minerals"), sub:T("ลิเทียม โคบอลต์ นิกเกิล กราไฟต์", "lithium, cobalt, nickel, graphite")},
  ree:{icon:"magnet", col:"#c3a6ff", res:["ree", "ga"], base:8, name:T("แร่หายาก", "Rare earths"), sub:T("แม่เหล็กกังหันลมและมอเตอร์", "magnets for turbines and motors")},
  cu:{icon:"cable", col:"#f0a060", res:["cu"], base:5, name:T("ทองแดง", "Copper"), sub:T("สายไฟ สายส่ง มอเตอร์", "wires, power lines, motors")},
  si:{icon:"sun", col:"#ffe08a", res:["si", "sand"], base:4, name:T("ซิลิคอนและทราย", "Silicon & sand"), sub:T("แผงโซลาร์ กระจก คอนกรีต", "solar panels, glass, concrete")},
  u:{icon:"radiation", col:"#c8f05a", res:["u"], base:7, name:T("ยูเรเนียม", "Uranium"), sub:T("เชื้อเพลิงนิวเคลียร์", "nuclear fuel")},
};
const GIDS = Object.keys(GROUPS);
/* recipe shares by skill (the rest of a skill's mineral cost is copper, the metal every electric thing needs) */
const RECIPE = {
  E2:{ree:.3, si:.4, cu:.3}, E3:{bat:.7, cu:.3}, E7:{si:.6, cu:.4}, E4:{u:.7, cu:.3}, E5:{ree:.5, cu:.5},
  P4:{bat:.6, cu:.25, ree:.15}, E6:{bat:.35, cu:.65}, C7:{si:.5, cu:.5}, P5:{si:.5, cu:.5},
};
const groupOf = r => GIDS.find(g => GROUPS[g].res.includes(r));
const full = () => !!(S && S.world);

function marketInit(){
  if (!full()) return;
  S.mat = S.mat || {bat:0, ree:0, cu:0, si:0, u:0};
  S.mkt = S.mkt || {bat:1, ree:1, cu:1, si:1, u:1};
  // a world continued from Mission 2050 turns its single mineral stock into groups once
  // single-value minerals (a world continued from Mission 2050, or the unlock bonus) are shared out between the groups
  if ((S.ore || 0) >= 1){ const k = S.ore / GIDS.length; GIDS.forEach(g => S.mat[g] += k); S.ore = 0; }
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
    const amt = cr.w * P.relFactor(c.rel) * .035; if (amt <= 0) continue;
    gs.forEach(g => out.push({id:c.id, g, amt:amt / gs.length * 1.4}));
  }
  return out;
}
function matGain(){
  const by = {bat:0, ree:0, cu:0, si:0, u:0}, base = (.6 + (S.oreInc || 0)) / GIDS.length;
  GIDS.forEach(g => by[g] += base);
  matSources().forEach(x => by[x.g] += x.amt * ((S.orePrice || 0) > 0 ? .7 : 1));
  return by;
}
function marketTick(){
  if (!full()) return false;
  marketInit();
  const by = matGain(); GIDS.forEach(g => { S.mat[g] += by[g]; });
  // prices: export bans lift the groups the banned country supplies; everything drifts back to normal
  const banned = Object.keys(S.oreBan || {}).filter(k => S.oreBan[k] > 0);
  GIDS.forEach(g => {
    let target = 1 + ((S.orePrice || 0) > 0 ? .35 : 0);
    banned.forEach(id => { const cr = P.CRES[id]; if (cr && cr.r.some(r => groupOf(r) === g)) target += .12 * cr.w / 2; });
    S.mkt[g] = clamp(S.mkt[g] + (target - S.mkt[g]) * .08, .5, 3);
  });
  return true;
}
const price = g => Math.max(1, Math.round(GROUPS[g].base * S.mkt[g] * (P.bal ? P.bal().cost : 1)));
const LOT = 10;
function mktBuy(g){ marketInit(); const k = price(g) * LOT; if (S.ep < k) return false; S.ep -= k; S.mat[g] += LOT; S.mkt[g] = clamp(S.mkt[g] + .04, .5, 3); P.changed(); return true; }
function mktSell(g){ marketInit(); if ((S.mat[g] || 0) < LOT) return false; S.mat[g] -= LOT; S.ep += Math.floor(price(g) * LOT * .7); S.mkt[g] = clamp(S.mkt[g] - .03, .5, 3); P.changed(); return true; }
const matTotal = () => GIDS.reduce((s, g) => s + Math.floor(S.mat ? S.mat[g] || 0 : 0), 0);

/* hook into the light version: in Continuous World the single value is replaced by the groups */
const _oreCost = P.oreCost; P.oreCostRaw = _oreCost;
P.oreCost = n => (full() ? 0 : _oreCost(n));
const _spend = P.spendOre; P.spendOre = n => (full() ? matSpend(n) : _spend(n));
const _tick = P.oreTick; P.oreTick = () => { if (!S.oreOn) return _tick(); if (marketTick()){ const bk = S.ore; _tick(); S.ore = bk; } else _tick(); };
const _pop = P.popOre; P.popOre = b => {
  if (!full()) return _pop(b);
  marketInit(); const cr = P.CRES[b.cid], gs = cr ? [...new Set(cr.r.map(groupOf).filter(Boolean))] : []; const g = gs.length ? gs[Math.floor(P.rand() * gs.length)] : "cu";
  const gain = 6 + Math.round(P.rand() * 4); S.mat[g] += gain; return gain;
};
const _buy = P.oreBuy; P.oreBuy = c => {
  if (!full()) return _buy(c);
  marketInit(); const gs = [...new Set((P.CRES[c.id] || {r:[]}).r.map(groupOf).filter(Boolean))]; const gain = Math.round(10 + 6 * P.relFactor(c.rel));
  if (!gs.length) { S.mat.cu += gain; return gain; } gs.forEach(g => S.mat[g] += Math.round(gain / gs.length)); return gain;
};
const _gain = P.oreGain; P.oreGain = () => (full() && S.oreOn ? Object.values(matGain()).reduce((a, b) => a + b, 0) : _gain());
const _afford = P.canAfford; P.canAfford = n => _afford(n) && matOk(n);

Object.assign(P, {MAT:GROUPS, MAT_IDS:GIDS, RECIPE, matCost, matOk, matSpend, matGain, matSources, marketInit, marketTick, mktPrice:price, MKT_LOT:LOT, mktBuy, mktSell, matTotal, isFullRes:full, groupOf});
