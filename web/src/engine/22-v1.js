const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.v1) return;
(P.mods = P.mods || {}).v1 = 1;
/* =========================================================================
   Version 1.0 helpers: the named values of the game (one word and one icon each)
   and the effect list of a skill as icon chips (green = helps you, red = hurts you).
   ========================================================================= */
const {RMETA, HAZARDS} = P;
const S = P.S;
const L = o => P.L(o);

/* every value the player sees: name + 3D icon (assets/img/ui/3d/<id>.png) + plain icon for small places */
const STAT = {
  money:{th:"เงิน", en:"Money", icon:"coins"},
  policy:{th:"แต้มนโยบาย", en:"Policy points", icon:"scroll-text"},
  ore:{th:"ทรัพยากร", en:"Resources", icon:"gem"},
  appr:{th:"ความนิยม", en:"Approval", icon:"smile"},
  plan:{th:"ทำตามแผน", en:"On-plan", icon:"circle-check"},
  heart:{th:"มิตรภาพ", en:"Friendship", icon:"heart"},
  risk:{th:"ความเสี่ยงภัย", en:"Disaster risk", icon:"triangle-alert"},
  temp:{th:"อุณหภูมิ", en:"Temperature", icon:"thermometer"},
  co2:{th:"CO₂", en:"CO₂", icon:"cloud"},
  sink:{th:"ดูดซับ CO₂", en:"CO₂ capture", icon:"trees"},
  gem:{th:"เพชร", en:"Gems", icon:"diamond"},
  star:{th:"ดาว", en:"Stars", icon:"star"},
};
const T = (th, en) => ({th, en});
const LBL = {
  co2World:T("CO₂ ทั้งโลก", "World CO₂"), co2Each:T("CO₂ ทุกทวีป (แห่งละ)", "CO₂, every region (each)"), co2In:T("CO₂", "CO₂"),
  sink:T("ดูดซับ CO₂", "CO₂ capture"), appr:T("ความนิยม", "Approval"), planAll:T("ทำตามแผน ทุกทวีป", "On-plan, every region"), planIn:T("ทำตามแผน", "On-plan"),
  riskAll:T("ความเสี่ยงภัยพิบัติ ทุกทวีป", "Disaster risk, every region"), riskIn:T("ความเสี่ยงภัยพิบัติ", "Disaster risk"),
  income:T("รายได้เงิน", "Money income"), growth:T("การปล่อย CO₂ โตช้าลง", "CO₂ growth slows"), temp:T("อุณหภูมิโลก", "Global temperature"),
  p3:T("บังคับทวีปที่ทำตามแผนต่ำกว่า 70% ลด CO₂", "Regions under 70% on-plan must cut CO₂"), hzDmg:T("เสียหาย", "damage"),
  perMo:T("/เดือน", "/mo"), perYr:T("/ปี", "/yr"), ore:T("ทรัพยากร", "Resources"), oreInc:T("รายได้ทรัพยากร", "Resource income"), oreDisc:T("สกิลใช้ทรัพยากรน้อยลง", "Skills need fewer resources"),
};
const fmtN = (v, d = 1) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d).replace(/\.0+$/, "");
const regName = k => (RMETA[k] ? L(RMETA[k].short || RMETA[k].name) : k);

/* chips for a skill's effects: [{stat, icon, label, val, good, up}] */
function skillChips(n){
  const fx = n.fx || {}, out = [], push = (stat, label, val, good, up, icon) => out.push({stat, icon:icon || null, label, val, good, up});
  if (fx.co2) push("co2", L(LBL.co2World), `${fmtN(fx.co2)} Gt`, fx.co2 < 0, fx.co2 > 0);
  if (fx.all) push("co2", L(LBL.co2Each), `${fmtN(fx.all)} Gt`, fx.all < 0, fx.all > 0);
  if (fx.rco2) Object.entries(fx.rco2).forEach(([k, v]) => push("co2", `${L(LBL.co2In)} ${regName(k)}`, `${fmtN(v)} Gt`, v < 0, v > 0));
  if (fx.sink) push("sink", L(LBL.sink), `${fmtN(fx.sink)} Gt${L(LBL.perYr)}`, fx.sink > 0, fx.sink > 0);
  if (fx.damp) push("co2", L(LBL.growth), `−${Math.round(fx.damp * 100)}%`, true, false);
  if (fx.p3) push("co2", L(LBL.p3), `−0.3 Gt${L(LBL.perYr)}`, true, false);
  if (fx.tip) push("temp", L(LBL.temp), `${fmtN(fx.tip * P.TIP_TO_TEMP, 2)}°C`, fx.tip < 0, fx.tip > 0);
  if (fx.appr) push("appr", L(LBL.appr), `${fmtN(fx.appr, 0)}%`, fx.appr > 0, fx.appr > 0);
  if (fx.compAll) push("plan", L(LBL.planAll), `${fmtN(fx.compAll, 0)}%`, fx.compAll > 0, fx.compAll > 0);
  if (fx.comp) Object.entries(fx.comp).forEach(([k, v]) => push("plan", `${L(LBL.planIn)} ${regName(k)}`, `${fmtN(v, 0)}%`, v > 0, v > 0));
  if (fx.vulnAll) push("risk", L(LBL.riskAll), `${fmtN(fx.vulnAll, 0)}%`, fx.vulnAll < 0, fx.vulnAll > 0);
  if (fx.vuln) Object.entries(fx.vuln).forEach(([k, v]) => push("risk", `${L(LBL.riskIn)} ${regName(k)}`, `${fmtN(v, 0)}%`, v < 0, v > 0));
  if (fx.epInc) push("money", L(LBL.income), `${fmtN(fx.epInc, 0)}${L(LBL.perMo)}`, fx.epInc > 0, fx.epInc > 0);
  if (n.resp) Object.entries(n.resp).forEach(([hz, v]) => push("risk", `${L(HAZARDS[hz].name)} ${L(LBL.hzDmg)}`, `−${Math.round(v * 100)}%`, true, false, HAZARDS[hz].icon));
  if (fx.oreInc) push("ore", L(LBL.oreInc), `+${fx.oreInc}${L(LBL.perMo)}`, true, true);
  if (fx.oreDisc) push("ore", L(LBL.oreDisc), `−${Math.round(fx.oreDisc * 100)}%`, true, false);
  return out;
}

/* can the player buy this skill right now? (money, policy points, minerals, free project slot) */
function canAfford(n){ const c = P.nodeCost(n); return S.ep >= c.ep && S.pc >= c.pc && (!P.oreCost || (S.ore || 0) >= P.oreCost(n)) && !P.atCapacity(n); }
Object.assign(P, {STAT, skillChips, fmtN, canAfford});
/* shop price: the server can change prices online (admin page → game settings) */
P.shopPrice = it => { const c = P.Net && P.Net.cfg, p = c && c.prices && Number(c.prices[it.id]); return Number.isFinite(p) && p >= 0 ? p : it.price; };
