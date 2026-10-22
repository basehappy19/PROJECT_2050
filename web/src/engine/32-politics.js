const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.v16) return;
(P.mods = P.mods || {}).v16 = 1;
/* =========================================================================
   Version 1.6 · Politics at home: four groups of people, each with its own satisfaction
   · A group "backs you" at 70%+ and at least 6 points above the average; it is "very angry" below 25%.
   · Industry, farmers, young people and city people. Approval = their weighted average.
   · Every approval change still reaches everyone (the tuned balance is kept), but skills,
     event choices and orders also tilt the groups: a carbon tax angers industry and pleases
     the young, alternative protein angers farmers, and so on (tilts never change the average).
   · Each group matters in its own way:
       industry  → income (up to ±10% compared with the others), money +2/mo when it backs you, strikes when it is angry
       farmers   → soil carbon when they back you, road blockades when angry
       young     → policy points (up to ±10%), +1/mo when they back you, school strikes when angry
       city      → approval +0.1/mo when it backs you, riots when angry
   · Tilts fade slowly towards the average, so a group can be won back.
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en}), L = o => P.L(o);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hook = (name, ...a) => (P.H && P.H[name] ? P.H[name](...a) : undefined);

const GROUPS = [
  {id:"city",  w:.35, icon:"building-2",     color:"#5cc8ff", name:T("คนเมือง", "City people"),
   likes:T("ขนส่งสาธารณะ · เมืองร่มรื่น · ป้องกันน้ำท่วม", "Transit, cooler cities, flood defences"), hates:T("ค่าไฟและค่าเดินทางแพง · ภัยพิบัติในเมือง", "Dearer bills and fares, disasters in cities"),
   good:T("สนับสนุน: ความนิยม +0.1%/เดือน", "Backing you: approval +0.1%/mo"), bad:T("ไม่พอใจมาก: อาจเกิดการประท้วงในเมือง (ความนิยมและเงินลด)", "Very angry: city riots may break out (approval and money fall)")},
  {id:"ind",   w:.25, icon:"factory",        color:"#ffb04a", name:T("ภาคอุตสาหกรรม", "Industry"),
   likes:T("พลังงานราคาถูก · เทคโนโลยีใหม่ · ปกป้องธุรกิจในประเทศ", "Cheap power, new technology, protection at home"), hates:T("ภาษีคาร์บอน · กฎบังคับโรงงาน · เลิกอุดหนุนฟอสซิล", "Carbon taxes, factory rules, ending fossil subsidies"),
   good:T("สนับสนุน: รายได้ +2/เดือน", "Backing you: income +2/mo"), bad:T("ไม่พอใจมาก: อาจนัดหยุดงานและล็อบบี้ (เงินลด ทำตามแผนลด)", "Very angry: strikes and lobbying may follow (money and on-plan fall)")},
  {id:"farm",  w:.20, icon:"tractor",        color:"#9ad35a", name:T("เกษตรกร", "Farmers"),
   likes:T("ชลประทาน · พืชทนแล้ง · เกษตรฟื้นฟู", "Irrigation, hardy crops, regenerative farming"), hates:T("เสียที่ดินทำกิน · ปุ๋ยแพง · เนื้อสัตว์ทางเลือก · ภัยแล้ง", "Losing farmland, dearer fertiliser, alternative meat, droughts"),
   good:T("สนับสนุน: ดินเก็บคาร์บอนเพิ่มทุกเดือน", "Backing you: soils store a little more carbon each month"), bad:T("ไม่พอใจมาก: อาจขับรถไถปิดถนน (เงินและแต้มนโยบายลด)", "Very angry: tractor blockades may follow (money and policy points fall)")},
  {id:"youth", w:.20, icon:"graduation-cap", color:"#c58cff", name:T("คนรุ่นใหม่", "Young people"),
   likes:T("พลังงานสะอาด · ภาษีคาร์บอน · ปลูกป่า · แคมเปญความรู้", "Clean energy, carbon taxes, forests, climate campaigns"), hates:T("เผาฟอสซิลเพิ่ม · ทางเลือกที่เพิ่ม CO₂", "Burning more fossil fuel, choices that raise CO₂"),
   good:T("สนับสนุน: แต้มนโยบาย +1/เดือน", "Backing you: policy points +1/mo"), bad:T("ไม่พอใจมาก: อาจหยุดเรียนประท้วง (แต้มนโยบายลด)", "Very angry: school strikes may follow (policy points fall)")},
];
const GID = GROUPS.map(g => g.id), GW = Object.fromEntries(GROUPS.map(g => [g.id, g.w]));
const GROUP = Object.fromEntries(GROUPS.map(g => [g.id, g]));
const BACK = 70, BACK_GAP = 6, ANGRY = 25, PROTEST_P = .18, PROTEST_CD = 4, DRIFT = .02, TILT_MAX = 8;

/* ---------------- how each skill tilts the groups (before evening out) ---------------- */
const SKILL_TILT = {
  E1:{youth:2, ind:1}, E2:{youth:3, farm:-1, ind:-1}, E8:{youth:2}, E3:{youth:2, ind:1}, E7:{youth:2, farm:1}, E4:{city:-3, youth:-2, ind:3}, E9:{city:-1, ind:1}, E5:{ind:3, youth:3},
  I1:{ind:-3, youth:2}, I2:{city:4, farm:-1}, I5:{ind:2, city:2}, I4:{ind:-5, youth:2}, P4:{city:-3, ind:-2, youth:4}, E6:{ind:2}, I3:{city:-1, farm:2}, N4:{ind:2, youth:-1},
  N1:{farm:-2, youth:4}, N2:{farm:1, youth:2}, N3:{farm:4}, N6:{youth:-3}, A1:{farm:1}, N5:{farm:3}, A2:{farm:-6, youth:3, city:2}, A3:{farm:4},
  C1:{city:2, farm:2}, P5:{ind:-2, city:2}, C2:{city:3}, C6:{city:2}, C5:{city:4}, C3:{farm:3, city:1}, C4:{farm:3}, C7:{city:4, ind:2},
  P1:{youth:5}, P2:{ind:-6, youth:4, city:-2}, D1:{youth:1, city:-1}, D4:{ind:-2, city:-2}, P3:{ind:3, farm:-2}, D2:{ind:2}, P6:{ind:-6, city:-4, farm:-3, youth:6}, D3:{youth:1},
  W1:{farm:4}, W2:{city:2, farm:-1}, W3:{farm:3}, W4:{city:3, farm:-2}, W5:{farm:4}, W6:{city:2}, W7:{farm:3}, W8:{farm:-4, ind:2},
};
const ACT_TILT = {fund:{ind:1, youth:1}, adapt:{city:1, farm:1}, tariff:{ind:2, farm:-2}};
const CACT_TILT = {fund:{city:-1, youth:1}, shield:{youth:1}, tech:{ind:1}};
const ABIL_TILT = {act1:{youth:3}, act2:{youth:1}, eco2:{ind:2}, oce1:{farm:1}, eng2:{city:2}};
const HAZ_GROUP = {drought:"farm", wildfire:"farm", saltwater:"farm", heat:"city", flood:"city", hurricane:"city", typhoon:"city"};

/* event choices: read the words of the choice (and, more weakly, of the event) */
const WORDS = {
  ind:/industr|factor|steel|cement|mining|\bmine|coal|\boil\b|\bgas\b|drill|compan|business|corporat|manufactur|export|refiner|automaker|car ?maker|worker|union|jobs|investor|plant|airline|shipping/i,
  farm:/farm|crop|rice|food|harvest|fertili|livestock|cattle|beef|dairy|irrigat|fish|agri|grain|wheat|palm|rural|land\b|village/i,
  city:/city|cities|urban|transit|metro|\bbus|housing|building|commut|traffic|bill|fare|resident|town|price|cooling|tram|neighbo/i,
  youth:/youth|student|school|young|activist|protest|strike|campaign|educat|universit|generation|influencer/i,
};
const words = o => (o ? `${o.en || ""}` : "");
function eventTilt(opt, ev){
  if (!opt || !opt.fx) return null;
  const fx = opt.fx, out = {}, add = (g, v) => { out[g] = (out[g] || 0) + v; };
  const a = typeof fx.appr === "number" ? fx.appr : 0, co2 = (fx.co2 || 0) + Object.values(fx.rco2 || {}).reduce((s, v) => s + v, 0);
  const lab = words(opt.label), ctx = ev ? words(ev.title) + " " + words(ev.desc) : "";
  const dirty = co2 > .05;
  // the group the choice is about feels its approval change more than the others
  // (but industry does not mind a choice that burns more fossil fuel: it profits from it)
  if (a) for (const g of GID){
    if (g === "ind" && dirty) continue;
    if (WORDS[g].test(lab)) add(g, .6 * a);
    else if (ctx && WORDS[g].test(ctx)) add(g, .3 * a);
  }
  if (dirty){ const k = Math.min(4, 1 + co2); add("ind", k); add("youth", -k); }
  else if (co2 < -.05) add("youth", (fx.ep || 0) < 0 || (fx.pc || 0) < 0 ? 2 : 1.5);
  // a new tax or levy hurts industry (pausing a tax or tax breaks do not)
  if (!dirty && /\btax(es)?\b|\blevy|royalt/i.test(lab) && !/pause|scrap|cut|drop|break|money|relief|credit|refund|exempt/i.test(lab)) add("ind", -2);
  if (/subsid|relief|compensat|aid for|support for|help .*(farmer|worker|famil)/i.test(lab)){ for (const g of GID) if (WORDS[g].test(lab)) add(g, 2); }
  return Object.keys(out).length ? out : null;
}

/* ---------------- state ---------------- */
const mean = () => GID.reduce((s, g) => s + GW[g] * S.groups[g], 0);
function initGroups(){
  if (S.groups && GID.every(g => typeof S.groups[g] === "number")) return;
  const a = typeof S.appr === "number" ? S.appr : 55, off = {city:0, ind:6, farm:2, youth:-10};
  const m = GID.reduce((s, g) => s + GW[g] * off[g], 0);
  S.groups = Object.fromEntries(GID.map(g => [g, clamp(a + off[g] - m, 0, 100)]));
  S.grpCd = {}; S.grpSeen = S.appr; S.soilC = S.soilC || 0;
}
/* move the average by d, spreading it over the groups that are not stuck at 0 or 100 */
function shiftAll(d){
  for (let k = 0; k < 5 && Math.abs(d) > 1e-6; k++){
    const free = GID.filter(g => (d > 0 ? S.groups[g] < 100 : S.groups[g] > 0)); if (!free.length) break;
    const ws = free.reduce((s, g) => s + GW[g], 0), x = d / ws;
    let used = 0;
    for (const g of free){ const b = S.groups[g]; S.groups[g] = clamp(b + x, 0, 100); used += GW[g] * (S.groups[g] - b); }
    d -= used;
  }
}
/* a tilt never changes the average: what one group gains the others lose (weighted) */
function evenOut(t){
  if (!t) return null;
  const o = {}; GID.forEach(g => { o[g] = clamp(t[g] || 0, -TILT_MAX, TILT_MAX); });
  const m = GID.reduce((s, g) => s + GW[g] * o[g], 0); GID.forEach(g => { o[g] -= m; });
  return o;
}
function applyTilt(t){
  const o = evenOut(t); if (!o) return;
  GID.forEach(g => { S.groups[g] = clamp(S.groups[g] + o[g], 0, 100); });
}
/* whatever changed approval outside this file reaches every group equally */
function sync(){
  if (!S.groups) initGroups();
  const d = S.appr - (typeof S.grpSeen === "number" ? S.grpSeen : S.appr);
  if (Math.abs(d) > 1e-9) shiftAll(d);
}
function settle(){ S.appr = clamp(mean(), 0, 100); S.grpSeen = S.appr; }
function withTilt(fn, tiltOf){
  return (...a) => {
    if (!S.regions) return fn(...a);
    sync();
    const t = tiltOf(...a), before = JSON.stringify(S.owned || {}) + (S.event ? 1 : 0) + S.ep + "/" + S.pc;
    const r = fn(...a);
    const after = JSON.stringify(S.owned || {}) + (S.event ? 1 : 0) + S.ep + "/" + S.pc;
    sync();
    if (t && (r !== false) && before !== after) applyTilt(t);
    settle();
    return r;
  };
}

Object.assign(P.UI, {
  tipGroups:T("กดเพื่อดู 4 กลุ่ม", "tap to see the 4 groups"),
  grpWho:T("กลุ่มที่ได้ / เสีย", "Who gains / loses"),
  grpTitle:T("คนในประเทศ", "People at home"),
});

/* ---------------- monthly ---------------- */
const TX = {
  protest:{
    city:T("คนเมืองประท้วงบนท้องถนน", "City people riot in the streets"),
    ind:T("ภาคอุตสาหกรรมนัดหยุดงานและล็อบบี้ต้าน", "Industry strikes and lobbies against you"),
    farm:T("เกษตรกรขับรถไถปิดถนน", "Farmers block the roads with tractors"),
    youth:T("คนรุ่นใหม่หยุดเรียนประท้วง", "Young people walk out of school in protest"),
  },
  back:T("หันมาสนับสนุนนโยบายของคุณ", "now backs your policies"),
  lost:T("ไม่สนับสนุนแล้ว", "no longer backs you"),
  angry:T("ไม่พอใจมาก ระวังการประท้วง", "is very angry: protests may follow"),
};
function protest(g){
  const tx = L(TX.protest[g]), IC = P.IC, e0 = S.ep, p0 = S.pc;
  let fx = "";
  if (g === "city"){ shiftAll(-2); const m = Math.min(S.ep, 5); S.ep -= m; fx = `${IC.appr} −2% · ${IC.ep} −${m}`; }
  if (g === "ind"){ const m = Math.min(S.ep, 10); S.ep -= m; S.regions.forEach(r => { r.comp = clamp(r.comp - 1, 0, 100); }); fx = `${IC.ep} −${m} · ${IC.comp} −1%`; }
  if (g === "farm"){ const m = Math.min(S.ep, 6), q = Math.min(S.pc, 3); S.ep -= m; S.pc -= q; fx = `${IC.ep} −${m} · ${IC.pc} −${q}`; }
  if (g === "youth"){ const q = Math.min(S.pc, 6); S.pc -= q; fx = `${IC.pc} −${q}`; }
  if (P.ledgerTag) P.ledgerTag("protest", S.ep - e0, S.pc - p0);
  S.stats.protests = (S.stats.protests || 0) + 1;
  P.addLog(`[[megaphone]] ${tx} · ${fx}`, "al");
  hook("sfx", "warn"); hook("toast", {id:"prot" + g + S.tick, icon:"megaphone", title:L(T("ประท้วง", "Protest")), msg:L(GROUP[g].name)});
  if (P.timeline) P.timeline("protest", {g});
}
function groupsTick(){
  sync();
  // disasters this month hit the group that lives with them
  const hz = {};
  (S.stats.dmg || []).forEach(x => { if (x.tick === S.tick && HAZ_GROUP[x.type]) hz[HAZ_GROUP[x.type]] = (hz[HAZ_GROUP[x.type]] || 0) - .8 * x.d; });
  if (Object.keys(hz).length) applyTilt(hz);
  // tilts fade towards the average (the average itself does not move)
  const m = mean(); GID.forEach(g => { S.groups[g] += (m - S.groups[g]) * DRIFT; });
  // backing and anger
  S.grpCd = S.grpCd || {}; S.grpFlag = S.grpFlag || {};
  const avg = mean();
  for (const g of GID){
    const v = S.groups[g], f = S.grpFlag[g] || 0;
    if (S.grpCd[g] > 0) S.grpCd[g]--;
    if (isBacking(g, v, avg)){
      if (f !== 1){ S.grpFlag[g] = 1; P.addLog(`[[${GROUP[g].icon}]] ${L(GROUP[g].name)} ${L(TX.back)}`, "gd"); }
      if (g === "ind"){ S.ep += 2; if (P.ledgerTag) P.ledgerTag("support", 2, 0); }
      if (g === "youth"){ S.pc += 1; if (P.ledgerTag) P.ledgerTag("support", 0, 1); }
      if (g === "city") shiftAll(.1);
      if (g === "farm" && S.soilC < .5){ S.soilC += .004; S.sink += .004; }
    } else if (v < ANGRY){
      if (f !== -1){ S.grpFlag[g] = -1; P.addLog(`[[${GROUP[g].icon}]] ${L(GROUP[g].name)} ${L(TX.angry)}`, "al"); }
      if (!(S.grpCd[g] > 0) && P.rand() < PROTEST_P * (1 + (ANGRY - v) / ANGRY)){ protest(g); S.grpCd[g] = PROTEST_CD; }
    } else if (f === 1 || (f === -1 && v > ANGRY + 8)){
      if (f === 1) P.addLog(`[[${GROUP[g].icon}]] ${L(GROUP[g].name)} ${L(TX.lost)}`, "in");
      S.grpFlag[g] = 0;
    }
  }
  settle();
  // the last two years, for the little charts
  const H = S.grpHist = S.grpHist || {};
  GID.forEach(g => { (H[g] = H[g] || []).push(Math.round(S.groups[g] * 10) / 10); if (H[g].length > 24) H[g].shift(); });
}

/* ---------------- hooks into the engine ---------------- */
const _tick = P.tick;
P.tick = () => { if (S.regions && !S.groups) initGroups(); if (S.regions) sync(), settle(); _tick(); if (S.regions && !S.over) groupsTick(); };
P.buyNode = withTilt(P.buyNode, id => SKILL_TILT[id] || null);
P.doAction = withTilt(P.doAction, aid => ACT_TILT[aid] || null);
P.countryAction = withTilt(P.countryAction, aid => CACT_TILT[aid] || null);
P.useAbility = withTilt(P.useAbility, id => ABIL_TILT[id] || null);
P.chooseOption = withTilt(P.chooseOption, i => (i >= 0 && P.currentEvent() ? eventTilt(P.currentEvent().options[i], P.currentEvent()) : null));
const _init = P.v1Init;
P.v1Init = () => { if (_init) _init(); initGroups(); S.grpSeen = S.appr; settle(); };

/* industry sets income, the young set policy points (±10%) */
P.incMult = () => (S.groups ? clamp(1 + .5 * (S.groups.ind - mean()) / 100, .9, 1.1) : 1);   // compared with everyone else
P.pcMult = () => (S.groups ? clamp(1 + .5 * (S.groups.youth - mean()) / 100, .9, 1.1) : 1);

/* for the interface: what a choice / skill / order would do to the groups (after evening out, rounded) */
function preview(t){
  const o = evenOut(t); if (!o) return [];
  return GID.map(g => ({g, v:o[g]})).filter(x => Math.abs(x.v) >= 1.2).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}
const tiltOfSkill = id => preview(SKILL_TILT[id]);
const tiltOfOption = (opt, ev) => preview(eventTilt(opt, ev));
const tiltOfAction = aid => preview(ACT_TILT[aid]);
const isBacking = (g, v, m) => (v >= BACK && v >= m + BACK_GAP) || ((S.grpFlag || {})[g] === 1 && v >= BACK - 8 && v >= m);
const groupState = g => { if (!S.groups) return "ok"; const v = S.groups[g], m = mean(); return v < ANGRY ? "angry" : isBacking(g, v, m) ? "back" : v < 40 ? "low" : "ok"; };
const angryCount = () => (S.groups ? GID.filter(g => S.groups[g] < ANGRY).length : 0);

P.groupTilt = t => { if (!S.groups) return; sync(); applyTilt(t); settle(); };
Object.assign(P, {withGroupTilt:withTilt, groupPreview:preview, GROUPS, GROUP, GID, GROUP_BACK:BACK, GROUP_ANGRY:ANGRY, tiltOfSkill, tiltOfOption, tiltOfAction, groupState, angryCount, eventTilt, groupsTick});
