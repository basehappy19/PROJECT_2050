const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.v15) return;
(P.mods = P.mods || {}).v15 = 1;
/* =========================================================================
   Version 1.5 · Two new characters and a sixth skill branch, "Food & Water"
   · Ocean scientist (Dr. Nawa): sea-borne disasters hurt less; restores a coast; sea-storm warning
   · City engineer (Kla): city and industry skills roll out faster; speeds up building; tougher cities
   · Food & Water: irrigation, food waste, groundwater, vertical farms, salt-tolerant crops,
     solar desalination, a world food pact and green fertiliser
   Shop prices must match server/api/src/game-rules.js (SHOP, CHARS).
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------- characters ---------------- */
const SEA_HZ = ["hurricane", "typhoon", "flood", "saltwater"];
P.CHARS.push(
  {id:"oce", price:299, icon:"waves", color:"#4fb8e8",
   name:T("นักสมุทรศาสตร์", "The Ocean Scientist"), person:T("ดร.นาวา", "Dr. Nawa"),
   pas:T("พายุ น้ำท่วม และน้ำเค็มรุกเสียหายน้อยลง 15% (เลเวล 3: 25%)", "Storms, floods and saltwater do 15% less damage (level 3: 25%)"),
   acts:[{id:"oce1", cd:24, icon:"shell", target:"country", name:T("ฟื้นฟูชายฝั่ง", "Restore the Coast"), desc:T("ประเทศที่เลือก: CO₂ −8% (ป่าชายเลนและหญ้าทะเลดูดซับ) การปรับตัว +25 และมิตรภาพ +5", "Selected country: CO₂ −8% (mangroves and seagrass), adaptation +25, friendship +5")},
         {id:"oce2", cd:30, lv:5, icon:"radio", name:T("เตือนภัยทะเล", "Sea-Storm Warning"), desc:T("ทุกพยากรณ์พายุ น้ำท่วม และน้ำเค็มรุกตอนนี้ อพยพให้ฟรี", "Every storm, flood and saltwater forecast right now is evacuated for free")}]},
  {id:"eng", price:349, icon:"hard-hat", color:"#ffc24a",
   name:T("วิศวกรเมือง", "The City Engineer"), person:T("คุณกล้า", "Kla"),
   pas:T("สกิลหมวดเมือง อุตสาหกรรม และอาหารกับน้ำ ทยอยผลเร็วขึ้น 25% (เลเวล 3: 30%)", "City, industry and food & water skills roll out 25% faster (level 3: 30%)"),
   acts:[{id:"eng1", cd:30, icon:"construction", name:T("เร่งก่อสร้าง", "Rush the Build"), desc:T("ทุกโครงการที่กำลังทยอยผล เดินหน้าเร็วขึ้นทันที 4 เดือน", "Every project rolling out jumps 4 months ahead now")},
         {id:"eng2", cd:96, lv:5, icon:"shield-check", name:T("เมืองทนภัย", "Hardened Cities"), desc:T("ความเสี่ยงภัยพิบัติทุกทวีป −6%", "Every region's disaster risk −6%")}]},
);
P.CHARS.slice(-2).forEach(c => { P.CHAR[c.id] = c; });
P.SHOP.splice(4, 0,
  {id:"char_oce", price:299, icon:"waves", kind:"char", name:T("ตัวละคร: นักสมุทรศาสตร์", "Character: The Ocean Scientist")},
  {id:"char_eng", price:349, icon:"hard-hat", kind:"char", name:T("ตัวละคร: วิศวกรเมือง", "Character: The City Engineer")});

const lv3 = () => S.charLv >= 3;
P.hzCharMult = type => (S.char === "oce" && SEA_HZ.includes(type) ? (lv3() ? .75 : .85) : 1);
P.rollMult = n => (S.char === "eng" && ["city", "industry", "water"].includes(n.cat) ? (lv3() ? .7 : .75) : 1);

/* move every rollout k months ahead, applying what those months would have done */
function advanceRollouts(k){
  for (const ro of S.rollouts){
    const m = Math.min(k, ro.left);
    for (let i = 0; i < m; i++){
      if (ro.kind === "co2") S.regions.forEach(r => { const d = ro.per[r.id]; if (d) P.setRegionCO2(r, r.co2 + (d / ro.months) * (r.comp / 100) * (0.2 + 0.8 * clamp(r.co2 / r.co2_0, 0, 1))); });
      else S.sink += ro.amt / ro.months;
    }
    ro.left -= m;
    if (ro.left <= 0) P.addLog(`${P.L(P.SKILL[ro.id].name)} — ${P.t("logRollDone")}`, "tc");
  }
  S.rollouts = S.rollouts.filter(ro => ro.left > 0);
}
P.extraAbility = (id, c) => {
  switch (id){
    case "oce1": if (!c || c.rest) return false; P.addCountryCO2(c, -0.08 * c.co2); c.adapt = clamp(c.adapt + 25, 0, 100); P.changeRel(c.id, 5); S.stats.help[c.id] = (S.stats.help[c.id] || 0) + 1; return true;
    case "oce2": { let n = 0; S.haz.forEach(h => { if (SEA_HZ.includes(h.type) && !h.evac){ h.evac = true; n++; S.stats.evac++; } }); return true; }
    case "eng1": advanceRollouts(4); return true;
    case "eng2": S.regions.forEach(r => { r.vuln = clamp(r.vuln - 6, 0, 100); }); return true;
  }
  return false;
};

/* ---------------- sixth skill branch: Food & Water ---------------- */
P.SKILL_CATS.push({id:"water", icon:"droplets", name:T("อาหารและน้ำ", "Food & Water")});
const W = (id, icon, pos, ep, pc, req, months, name, desc, fx, extra = {}) => ({id, cat:"water", icon, pos, ep, pc, req, months, name, desc, fx, type:"passive", ...extra});
const WATER = [
  W("W1", "sprout", [0, 1], 45, 10, [], 6, T("ชลประทานน้ำหยด", "Drip Irrigation"),
    T("ภัยแล้งเสียหายน้อยลง 30% ความเสี่ยงภัย MEAF −5% และความนิยม +2%", "Droughts do 30% less damage, MEAF risk −5%, approval +2%"), {vuln:{MEAF:-5}, appr:2}, {resp:{drought:.3}}),
  W("W2", "recycle", [1, 0], 70, 15, ["W1"], 12, T("ลดขยะอาหาร", "Cut Food Waste"),
    T("CO₂ โลก −0.8 Gt (อาหารที่ทิ้งปล่อยก๊าซราว 8% ของโลก) และความนิยม +2%", "Global CO₂ −0.8 Gt (wasted food makes about 8% of emissions), approval +2%"), {co2:-0.8, appr:2}),
  W("W3", "droplet", [1, 2], 80, 15, ["W1"], 12, T("เติมน้ำใต้ดิน", "Groundwater Recharge"),
    T("ภัยแล้งเสียหายน้อยลงอีก 25% น้ำท่วมน้อยลง 15% และความเสี่ยงภัยทุกทวีป −3%", "Droughts a further 25% less, floods 15% less, every region's risk −3%"), {vulnAll:-3}, {resp:{drought:.25, flood:.15}}),
  W("W4", "building", [2, 0], 120, 25, ["W2"], 18, T("ฟาร์มแนวตั้งในเมือง", "Vertical City Farms"),
    T("CO₂ โลก −0.6 Gt (ขนส่งอาหารน้อยลง) และรายได้ [[$money]] +2/เดือน", "Global CO₂ −0.6 Gt (less food transport) and [[$money]] +2/mo"), {co2:-0.6, epInc:2}, {ore:20}),
  W("W5", "wheat", [2, 1], 70, 15, ["W2", "W3"], 12, T("เกษตรทนเค็ม", "Salt-Tolerant Farming"),
    T("น้ำเค็มรุกเสียหายน้อยลง 40% ความเสี่ยงภัย SEA −6% และความนิยม +2%", "Saltwater does 40% less damage, SEA risk −6%, approval +2%"), {vuln:{SEA:-6}, appr:2}, {resp:{saltwater:.4}}),
  W("W6", "sun", [2, 2], 130, 25, ["W3"], 18, T("โรงกลั่นน้ำทะเลพลังแสงอาทิตย์", "Solar Desalination"),
    T("ภัยแล้งและคลื่นความร้อนเสียหายน้อยลง 25% ความเสี่ยงภัย MEAF −10% แต่น้ำเกลือเข้มข้นทำร้ายทะเล (อุณหภูมิ +0.01°C)", "Droughts and heatwaves 25% less damage, MEAF risk −10%, but the brine harms the sea (+0.01°C)"),
    {vuln:{MEAF:-10}, tip:2.5}, {resp:{drought:.25, heat:.25}, trade:1, ore:30}),
  W("W7", "handshake", [3, 1], 140, 40, ["W4", "W5"], 0, T("ข้อตกลงความมั่นคงทางอาหารโลก", "World Food Security Pact"),
    T("มิตรภาพทุกประเทศ +6 ทำตามแผนทุกทวีป +4% และความนิยม +3%", "Every country friendship +6, every region on-plan +4%, approval +3%"), {relAll:6, compAll:4, appr:3}),
  W("W8", "flask-conical", [3, 2], 110, 25, ["W6"], 18, T("ปุ๋ยไนโตรเจนสีเขียว", "Green Fertiliser"),
    T("CO₂ โลก −0.9 Gt (ผลิตแอมโมเนียด้วยไฮโดรเจนสีเขียว) แต่ปุ๋ยแพงขึ้น: ความนิยม −2%", "Global CO₂ −0.9 Gt (ammonia from green hydrogen), but dearer fertiliser: approval −2%"), {co2:-0.9, appr:-2}, {trade:1, ore:25}),
];
WATER.forEach(n => { if (!P.SKILL[n.id]){ P.SKILLS.push(n); P.SKILL[n.id] = n; if (P.NODE_ICON) P.NODE_ICON[n.id] = n.icon; } });
// minerals the new skills use (28-market.js)
Object.assign(P.RECIPE || {}, {W4:{si:.5, cu:.5}, W6:{si:.6, cu:.4}, W8:{bat:.3, cu:.7}});

/* the "Full Tree" achievement now counts every branch */
const fullTree = P.ACH.find(a => a.id === "allTech"); if (fullTree) fullTree.d = T("ปลดล็อกครบทุกสกิลในเกมเดียว", "Unlock every skill in one game");
P.ACH.push({id:"branchW", icon:"droplets", t:T("น้ำและอาหารมั่นคง", "Food & Water Secure"), d:T("ปลดล็อกสกิลหมวดอาหารและน้ำครบในเกมเดียว", "Unlock every Food & Water skill in one game")});
