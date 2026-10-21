const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.world2) return;
(P.mods = P.mods || {}).world2 = 1;
/* ===== Continuous World extras (phase 6 of the feature plan): home base, ambassadors, Prestige stars.
   Only in Continuous World, so Mission 2050 keeps its short, simple shape. ===== */
const S = P.S, T = (th, en) => ({th, en}), L = o => P.L(o);
const AMB_MAX = 3, AMB_COST = {ep:0, pc:30}, HQ_COST = {ep:120, pc:40}, HQ_CD = 24, PREST_MAX = 5;
const TXT = {
  title:T("ทูตและฐานบัญชาการ", "Ambassadors and home base"),
  ambSend:T("ส่งทูตประจำประเทศนี้", "Send an ambassador here"), ambRecall:T("เรียกทูตกลับ", "Recall the ambassador"),
  ambHelp:T("ทูตทำให้มิตรภาพขึ้นเองทุกเดือน และพาเทคโนโลยีสีเขียวเข้ามาเร็วขึ้น (ส่งได้พร้อมกัน 3 ประเทศ)", "An ambassador raises friendship every month and brings green technology in faster (3 at a time)"),
  ambHere:T("มีทูตของเราอยู่ที่นี่", "Our ambassador is here"), ambFull:T("ทูตครบ 3 คนแล้ว เรียกกลับก่อน 1 คน", "All 3 ambassadors are out; recall one first"),
  hqSet:T("ย้ายฐานบัญชาการมาที่นี่", "Move the home base here"), hqHere:T("ฐานบัญชาการของเรา", "Our home base"),
  hqHelp:T("ฐานบัญชาการ: มิตรภาพไม่ต่ำกว่า 50 ทวีปนี้ทำตามแผนดีขึ้น และได้แต้มนโยบายเพิ่ม", "Home base: friendship never below 50, this region follows the plan better, and you get extra policy points"),
  hqWait:T("ย้ายฐานได้อีกครั้งใน", "Can move again in"),
  prest:T("ดาวเกียรติยศ", "Prestige stars"), prestHelp:T("ได้เมื่อพาโลกต่อเนื่องเข้ายุคใหม่ หรือทำเป้าหมายครบ 10 ข้อ · โลกใหม่ได้เงินเพิ่ม 3% ต่อดาว", "Earned when a Continuous World enters a new era or completes 10 goals · new worlds get 3% more money per star"),
  gotStar:T("ได้ดาวเกียรติยศ", "Prestige star earned"),
};
const prestStore = () => { const d = P.AchStore.data; d.prest = d.prest || 0; return d; };
function prestige(){ return Math.min(PREST_MAX, prestStore().prest); }
function addStar(why){
  const d = prestStore(); d.prest = (d.prest || 0) + 1; P.AchStore.save();
  P.addLog(`[[star]] ${L(TXT.gotStar)} (${why}) · ★ ${d.prest}`, "gd"); if (P.H && P.H.sfx) P.H.sfx("bell");
}
function world2Init(){
  if (!S.world) return;
  S.amb = S.amb || [];
  if (!S.hq){ S.hq = "THA"; S.hqCd = 0; }
  if (S.prest === undefined) S.prest = prestige();
  S.w2 = S.w2 || {eras:{}, goals:0};
}
function ambOk(c){ return !!(S.world && c && !c.rest && !(S.amb || []).includes(c.id) && (S.amb || []).length < AMB_MAX && S.pc >= cost(AMB_COST).pc); }
const cost = k => { const m = P.bal ? P.bal().cost : 1; return {ep:Math.round(k.ep * m), pc:Math.round(k.pc * m)}; };
function ambSend(id){ const c = P.C(id); if (!ambOk(c)) return false; S.pc -= cost(AMB_COST).pc; S.amb.push(id); P.changeRel(id, 5); P.addLog(`[[flag]] ${L(TXT.ambSend)}: ${P.cname(id)}`, "tc"); P.changed(); return true; }
function ambRecall(id){ S.amb = (S.amb || []).filter(x => x !== id); P.changed(); }
function hqOk(c){ return !!(S.world && c && !c.rest && S.hq !== c.id && !(S.hqCd > 0) && S.ep >= cost(HQ_COST).ep && S.pc >= cost(HQ_COST).pc); }
function moveHQ(id){ const c = P.C(id); if (!hqOk(c)) return false; const k = cost(HQ_COST); S.ep -= k.ep; S.pc -= k.pc; S.hq = id; S.hqCd = HQ_CD; P.addLog(`[[landmark]] ${L(TXT.hqSet)}: ${P.cname(id)}`, "tc"); P.changed(); return true; }
function world2Tick(){
  if (!S.world) { S.pcInc = 0; return; }
  world2Init();
  (S.amb || []).forEach(id => { const c = P.C(id); if (!c) return; P.changeRel(id, .8); if (P.addGreen) P.addGreen(id, .25); });
  const hq = S.hq && P.C(S.hq);
  if (hq){ if (hq.rel < 50) hq.rel = 50; const r = P.R(hq.reg); if (r) r.comp = Math.min(100, r.comp + .06); }
  S.pcInc = hq ? .5 : 0;
  if (S.hqCd > 0) S.hqCd--;
  // Prestige: a star for each new era and for every 10 goals
  const w = S.w2;
  if (S.era && S.era !== "shift" && !w.eras[S.era]){ w.eras[S.era] = 1; addStar(L(P.ERAS[S.era].name)); }
  if ((S.goalsWon || 0) >= (w.goals + 1) * 10){ w.goals++; addStar(`${w.goals * 10} ${L(T("เป้าหมาย", "goals"))}`); }
}
Object.assign(P, {W2:TXT, AMB_MAX, AMB_COST, HQ_COST, ambOk, ambSend, ambRecall, hqOk, moveHQ, world2Init, world2Tick, prestige, w2cost:cost});
