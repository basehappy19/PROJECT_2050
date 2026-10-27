const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.mp) return;
(P.mods = P.mods || {}).mp = 1;
/* =========================================================================
   Version 2.0 · Multiplayer rules, shared by the game server (server/api/src/mp) and the browser
   · Co-op "Joint Taskforce" (2–4): one world and one budget. Four ministries, each acting only in its own field;
     events and region-wide evacuations are decided by a 15-second vote. More players = more disasters.
   · Versus "Regional Race" (2–4): every player runs the same world (same seed) from their own home region;
     the temperature is shared (everyone's emissions warm everyone). Send aid, put a carbon tariff on a bigger
     emitter, or sign a climate pact. First to Net Zero wins; at +3 °C everybody loses.
   The server runs the real engine (it is the referee); the browser only sends actions and shows the state.
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en});

const ROLES = [
  {id:"energy", icon:"zap", color:"#f2b441", name:T("พลังงานและอุตสาหกรรม", "Energy & Industry"),
   does:T("สกิลพลังงานและอุตสาหกรรม · ตลาดทรัพยากร · โรงแยกแร่ · วางโครงการบนแผนที่", "Energy and industry skills · the resources market · refineries · placing builds")},
  {id:"diplo", icon:"handshake", color:"#8fd0ff", name:T("การทูต", "Diplomacy"),
   does:T("เจรจา ส่งทุน แลกเทคโนโลยี · ข้อตกลงและพันธมิตร · สกิลนโยบาย · คำสั่งทวีป", "Negotiate, fund, share technology · deals and alliances · policy skills · continent orders")},
  {id:"disaster", icon:"siren", color:"#ff7a64", name:T("ภัยพิบัติและเมือง", "Disasters & Cities"),
   does:T("อพยพ · ช่วยผู้ประสบภัย (ฟองแดง) · เตรียมรับมือภัย · สกิลเมือง อาหารและน้ำ", "Evacuations · disaster aid (red bubbles) · preparing countries · city, food & water skills")},
  {id:"people", icon:"users", color:"#5fd39a", name:T("ประชาชนและธรรมชาติ", "People & Nature"),
   does:T("สกิลธรรมชาติ · สกิลพิเศษของผู้นำ · ดูแลความนิยม · อ่านข่าวและรายงาน", "Nature skills · the leader's special skills · approval · news and reports")},
];
const ROLE = Object.fromEntries(ROLES.map(r => [r.id, r]));
const CAT_ROLE = {energy:"energy", industry:"energy", policy:"diplo", city:"disaster", water:"disaster", nature:"people"};
/* the engine functions a player may call (all others are refused) */
const ACTS = ["buyNode", "doAction", "countryAction", "bilateral", "formAlliance", "evacuate", "popBubble", "useAbility", "mktBuy", "mktSell", "buildRefinery", "placeAuto", "placeAt", "readNews", "readReport"];
/* which ministry an action belongs to ("any" = everyone) */
function roleFor(fn, args){
  const a = args || [];
  switch (fn){
    case "buyNode": return CAT_ROLE[(P.SKILL[a[0]] || {}).cat] || null;
    case "doAction": return a[0] === "adapt" ? "disaster" : "diplo";
    case "countryAction": return {ore:"energy", talk:"diplo", fund:"diplo", tech:"diplo", shield:"disaster"}[a[0]] || null;
    case "bilateral": case "formAlliance": return "diplo";
    case "evacuate": return "disaster";
    case "popBubble": { const b = (S.bubbles || []).find(q => q.id === a[0]); return b && b.type === "red" ? "disaster" : "any"; }
    case "useAbility": return "people";
    case "mktBuy": case "mktSell": case "buildRefinery": case "placeAuto": case "placeAt": return "energy";
    case "readNews": case "readReport": return "any";
  }
  return null;
}
/* roles for n players: everyone gets one, the rest are shared out (2 players → 2 each, 3 → one player has 2) */
function assignRoles(players, wanted = {}){
  const out = {}, free = ROLES.map(r => r.id);
  players.forEach(p => { const w = wanted[p] || []; out[p] = []; w.forEach(r => { const i = free.indexOf(r); if (i >= 0){ out[p].push(r); free.splice(i, 1); } }); });
  players.forEach(p => { if (!out[p].length && free.length) out[p].push(free.shift()); });
  let k = 0; while (free.length){ out[players[k % players.length]].push(free.shift()); k++; }
  return out;
}
/* more players = a busier world (co-op) */
const coopBalance = n => ({inc:1, cost:1.1, haz:1 + .15 * (n - 1), growth:1 + .02 * (n - 1)});
const VOTE_SEC = 15;

/* ---------------- Versus ---------------- */
const BLOC_BONUS = 10;   // on-plan % in your home region
const VS = {
  aid:{ep:30, gain:30, pc:3, cd:6, icon:"hand-coins", name:T("ส่งเงินช่วยเหลือ", "Send aid"), desc:T("ให้เงิน 30 แก่ผู้เล่นคนนี้ คุณได้แต้มนโยบาย +3 จากความน่าเชื่อถือ", "Give this player 30 money; you get +3 policy points in goodwill")},
  tariff:{pc:15, cd:12, months:6, take:4, gain:2, icon:"ban", name:T("ภาษีคาร์บอนข้ามแดน", "Carbon border tariff"), desc:T("ใช้ได้กับคนที่ปล่อย CO₂ มากกว่าคุณ: เขาเสียเงิน 4/เดือน คุณได้ 2/เดือน นาน 6 เดือน", "Only on someone who emits more than you: they lose 4/mo, you gain 2/mo, for 6 months")},
  pact:{pc:10, cd:24, frac:.04, months:12, icon:"handshake", name:T("ข้อตกลงภูมิอากาศ", "Climate pact"), desc:T("ถ้าเขาตกลง ทั้งสองโลกลด CO₂ ของ 5 ประเทศที่ปล่อยมากที่สุดลง 4% ภายใน 12 เดือน", "If they accept, both worlds cut their 5 biggest emitters by 4% over 12 months")},
};
/* home region: a head start in your own part of the world */
function applyBloc(reg){
  const r = P.R(reg); if (!r) return;
  r.compBase = Math.min(100, r.compBase + BLOC_BONUS); r.comp = Math.min(100, r.comp + BLOC_BONUS);
  S.sel = reg;
}
/* a pact: the 5 biggest emitters of this world cut 4% over 12 months */
function pactCut(){
  const top = S.countries.filter(c => !c.rest).sort((a, b) => b.co2 - a.co2).slice(0, 5);
  top.forEach(c => S.crolls.push({c:c.id, left:VS.pact.months, months:VS.pact.months, frac:-VS.pact.frac}));
}

/* ---------------- talking without typing (school-safe): quick messages and emotes ---------------- */
const QUICK = [
  T("ดีมาก!", "Nice!"), T("ช่วยด้วย!", "Help!"), T("รอแป๊บนะ", "Wait a sec"), T("เงินไม่พอ", "Not enough money"),
  T("อพยพด่วน!", "Evacuate now!"), T("ซื้อสกิลนี้กัน", "Let's buy this skill"), T("ดูแผนที่ตรงนี้", "Look at the map here"), T("ขอบคุณ!", "Thanks!"),
  T("พร้อมแล้ว", "Ready"), T("ไปกันเลย!", "Let's go!"), T("เกมดีมาก", "Good game"), T("ขอโทษ!", "Sorry!"),
];
const EMOTES = ["thumbs-up", "party-popper", "heart", "flame", "laugh", "frown", "hand", "sparkles"];

Object.assign(P.UI, {
  mpTitle:T("เล่นหลายคน", "Multiplayer"),
  mpCoop:T("คณะทำงานร่วม", "Joint Taskforce"), mpCoopD:T("2–4 คน ช่วยกันกู้โลกใบเดียว แบ่งกระทรวง โหวตเหตุการณ์", "2–4 players save one world together: split ministries, vote on events"),
  mpVersus:T("แข่งภูมิภาค", "Regional Race"), mpVersusD:T("2–4 คน แข่งกันถึง Net Zero ก่อน แต่อุณหภูมิโลกใช้ร่วมกัน", "2–4 players race to Net Zero, but share one temperature"),
});
Object.assign(P, {MP:{ROLES, ROLE, CAT_ROLE, ACTS, roleFor, assignRoles, coopBalance, VOTE_SEC, VS, BLOC_BONUS, applyBloc, pactCut, QUICK, EMOTES}});
