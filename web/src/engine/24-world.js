const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.world) return;
(P.mods = P.mods || {}).world = 1;
/* =========================================================================
   Version 1.0 · The living world
   · Builds pinned on the map: every skill that builds something puts icons in real, suitable countries
     (under construction while the skill rolls out, then working).
   · Traffic: planes, cargo ships, tankers and ore carriers on real routes and sea lanes. Like the planes
     in Plague Inc., they carry something between countries — here carbon (their trails) and green technology
     (a leaf, from countries that already use it), which helps the next country switch faster.
   · Seasons change where disasters strike (monsoon, hurricane season, summer heat, fire season).
   · Continuous World: a mode with no end year, season goals and a yearly climate summit (COP).
   ========================================================================= */
const {S, COUNTRY, SKILL} = P;
const T = (th, en) => ({th, en});
const L = o => P.L(o);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hook = (name, ...a) => (P.H && P.H[name] ? P.H[name](...a) : undefined);

/* ---------------- routes (country ids; drawn between the countries' map points) ---------------- */
const AIR = [["USA", "GBR"], ["USA", "JPN"], ["USA", "CHN"], ["USA", "MEX"], ["USA", "BRA"], ["USA", "DEU"], ["CAN", "GBR"], ["USA", "KOR"],
  ["GBR", "IND"], ["DEU", "CHN"], ["FRA", "USA"], ["ARE", "GBR"], ["ARE", "IND"], ["ARE", "THA"], ["THA", "JPN"], ["THA", "CHN"], ["CHN", "AUS"],
  ["JPN", "AUS"], ["IND", "THA"], ["TUR", "DEU"], ["EGY", "SAU"], ["ZAF", "GBR"], ["KEN", "ARE"], ["BRA", "PRT"], ["ARG", "ESP"], ["RUS", "CHN"],
  ["IDN", "AUS"], ["VNM", "KOR"], ["NGA", "GBR"], ["QAT", "FRA"], ["SAU", "IND"], ["CHL", "ESP"], ["PHL", "JPN"], ["MYS", "CHN"], ["COL", "USA"], ["ETH", "CHN"]];
/* sea lanes as [lat, lon] waypoints through the real chokepoints; kind: box = containers, oil = tankers, ore = ore carriers */
const LANES = {
  asiaEu:{kind:"box", a:"CHN", b:"NLD", via:"suez", pts:[[31.2, 122.6], [24, 119.6], [12, 112], [1.3, 104.2], [4, 99.5], [6, 94], [5.6, 81], [11, 62], [12.4, 45.5], [12.6, 43.4], [20, 38.5], [29.9, 32.6], [33, 28], [36.5, 14], [36, -5.6], [40, -10.6], [46, -7], [49.8, -3], [52, 3.9]]},
  asiaEuCape:{kind:"box", a:"CHN", b:"NLD", pts:[[31.2, 122.6], [24, 119.6], [12, 112], [1.3, 104.2], [-6.5, 105.5], [-12, 90], [-25, 60], [-35.5, 20], [-25, 5], [0, -12], [20, -20], [36, -11], [46, -7], [49.8, -3], [52, 3.9]]},
  transPac:{kind:"box", a:"CHN", b:"USA", pts:[[31.2, 122.6], [33, 136], [38, 150], [42, 170], [42, 190], [38, 215], [33.7, 241.7]]},
  transAtl:{kind:"box", a:"NLD", b:"USA", pts:[[52, 3.9], [49.8, -3], [49, -12], [45, -35], [41, -60], [40.4, -73.8]]},
  panama:{kind:"box", a:"USA", b:"JPN", via:"panama", pts:[[40.4, -73.8], [30, -75], [20, -74], [12, -78], [9.3, -79.9], [6, -82], [10, -110], [25, -150], [33, -190], [34.5, -220]]},
  gulfAsia:{kind:"oil", a:"SAU", b:"JPN", via:"hormuz", pts:[[26.8, 50.3], [26.4, 56.4], [23, 61], [10, 72], [5.6, 81], [6, 94], [4, 99.5], [1.3, 104.2], [12, 112], [22, 117], [28, 126], [34, 136]]},
  gulfEu:{kind:"oil", a:"SAU", b:"ITA", via:"suez", pts:[[26.8, 50.3], [26.4, 56.4], [21, 60], [12.4, 45.5], [12.6, 43.4], [20, 38.5], [29.9, 32.6], [33, 28], [38, 15]]},
  gulfInd:{kind:"oil", a:"ARE", b:"IND", via:"hormuz", pts:[[25.3, 55.4], [26.4, 56.4], [23, 63], [19, 72.5]]},
  rusChn:{kind:"oil", a:"RUS", b:"CHN", pts:[[43, 132], [38, 128], [35, 126], [31.2, 122.6]]},
  chileChn:{kind:"ore", a:"CHL", b:"CHN", res:"cu", pts:[[-23.6, -70.6], [-20, -90], [-10, -130], [0, -165], [12, -200], [24, -220], [31.2, -237.4]]},
  ausChn:{kind:"ore", a:"AUS", b:"CHN", res:"li", pts:[[-20.3, 118.6], [-12, 116], [-8.8, 115.8], [-2, 118.3], [8, 120], [20, 121], [31.2, 122.6]]},
  braChn:{kind:"ore", a:"BRA", b:"CHN", res:"ree", pts:[[-24, -46], [-30, -25], [-36, 20], [-30, 60], [-12, 95], [-6.5, 105.5], [1.3, 104.2], [12, 112], [22, 116]]},
  codChn:{kind:"ore", a:"COD", b:"CHN", res:"co", pts:[[-6.8, 39.5], [-5, 55], [2, 75], [5.6, 81], [6, 94], [4, 99.5], [1.3, 104.2], [12, 112], [22, 116]]},
  idnChn:{kind:"ore", a:"IDN", b:"CHN", res:"ni", pts:[[-2.8, 122.3], [2, 123], [10, 120], [18, 117], [22.5, 114.5]]},
  perChn:{kind:"ore", a:"PER", b:"CHN", res:"cu", pts:[[-12, -77.3], [-10, -100], [0, -140], [12, -180], [24, -210], [31.2, -237.4]]},
};
/* chokepoints that real events can close: ships reroute (Suez → round Africa) or wait */
const CHOKE = {suez:T("คลองสุเอซ", "Suez Canal"), redsea:T("ทะเลแดง", "Red Sea"), panama:T("คลองปานามา", "Panama Canal"), hormuz:T("ช่องแคบฮอร์มุซ", "Strait of Hormuz"), malacca:T("ช่องแคบมะละกา", "Strait of Malacca")};
const laneOpen = ln => { const v = LANES[ln] && LANES[ln].via, cl = S.closed || {}; if (!v) return true; if (v === "suez" && ((cl.suez || 0) > 0 || (cl.redsea || 0) > 0)) return false; return !((cl[v] || 0) > 0); };

/* ---------------- traffic level (read by the map) ---------------- */
function trafficLevels(){
  const o = S.owned || {}, cut = (S.airCut || 0) > 0;
  const fossil = S.regions ? S.regions.reduce((s, r) => s + r.fossil0 * clamp(r.co2 / r.co2_0, 0, 1.5), 0) / S.regions.length : .7;
  return {
    air:(cut ? .12 : 1) * (o.I2 ? .8 : 1) * (o.P2 ? .92 : 1),
    airClean:clamp((o.I3 ? .55 : 0) + (o.E6 ? .15 : 0) + (o.P2 ? .1 : 0), 0, 1),
    sea:(cut ? .7 : 1),
    seaClean:clamp((o.E6 ? .45 : 0) + (o.I5 ? .1 : 0) + (o.P6 ? .15 : 0), 0, 1),
    oil:clamp(fossil / .7, .05, 1.3) * (o.P6 ? .7 : 1),
    ore:S.oreOn ? 1 : .35,
    rail:o.I2 ? 1 : 0,
  };
}

/* ---------------- green technology (0–100 per country) ---------------- */
function greenInit(){ (S.countries || []).forEach(c => { if (c.green === undefined) c.green = c.rest ? 15 : clamp(Math.round(((COUNTRY[c.id] ? COUNTRY[c.id].stance : 0) + 1) * 14 + 4), 0, 40); }); }
const G = id => (P.C(id) || {}).green || 0;
function addGreen(id, v){ const c = P.C(id); if (c && !c.rest) c.green = clamp((c.green || 0) + v, 0, 100); }
/* once a month: green technology travels along the air routes and sea lanes, and lowers each country's CO₂ a little */
function greenTick(){
  const tl = trafficLevels();
  const spread = (a, b, k) => { const ga = G(a), gb = G(b); if (ga >= 45 && ga > gb) addGreen(b, k * (ga - gb) / 100); if (gb >= 45 && gb > ga) addGreen(a, k * (gb - ga) / 100); };
  AIR.forEach(([a, b]) => spread(a, b, 1.2 * tl.air));
  Object.entries(LANES).forEach(([k, ln]) => { if (laneOpen(k)) spread(ln.a, ln.b, .9 * tl.sea); });
  const clean = ["E2", "E3", "E7", "E4", "E5", "E8", "P4", "E6", "I2", "I5", "R1"].filter(id => S.owned[id]).length;
  S.countries.forEach(c => {
    if (c.rest) return;
    if (clean) c.green = clamp(c.green + clean * .03, 0, 100);
    if (c.green > 0) P.addCountryCO2(c, -c.co2 * c.green / 100 * .0011);
  });
}

/* ---------------- builds pinned on the map ---------------- */
function pickCountries(where, n){
  const list = where.filter(id => COUNTRY[id]);
  // the first ones are the best places; add a little chance so every game looks different
  return list.map((id, i) => ({id, s:(list.length - i) + P.rand() * list.length * .6})).sort((a, b) => b.s - a.s).slice(0, n).map(x => x.id);
}
function placeBuilds(n){
  const b = n.build; if (!b) return;
  S.pins = S.pins || []; S.pinId = S.pinId || 0;
  const add = (k, where, cnt) => pickCountries(where, cnt).forEach(c => S.pins.push({id:++S.pinId, k, c, sk:n.id, sd:Math.floor(P.rand() * 1e6), t:S.tick, done:!n.months}));
  add(b.k, b.where, b.n);
  if (b.k2) add(b.k2, b.where2, b.n);
}
function pinsTick(){ (S.pins || []).forEach(p => { if (!p.done && P.rollProgress(p.sk) === null) p.done = true; }); }

/* ---------------- seasons ---------------- */
const SOUTH = new Set(["AUS", "NZL", "ARG", "CHL", "ZAF", "BRA", "PER"]);
const SEASONS = [
  {id:"cool", icon:"snowflake", name:T("หน้าหนาว (ซีกโลกเหนือ)", "Northern winter"), months:[11, 0, 1]},
  {id:"hot", icon:"sun", name:T("หน้าร้อนในเอเชีย", "Hot season in Asia"), months:[2, 3, 4]},
  {id:"monsoon", icon:"cloud-rain", name:T("มรสุมและหน้าร้อนซีกโลกเหนือ", "Monsoon & northern summer"), months:[5, 6, 7]},
  {id:"storm", icon:"tornado", name:T("ฤดูพายุ", "Storm season"), months:[8, 9, 10]},
];
const seasonOf = (tk = S.tick) => SEASONS.find(s => s.months.includes(tk % 12)) || SEASONS[0];
/* how much more likely a hazard type is now in this country */
function seasonWeight(type, cid){
  const m = S.tick % 12, south = SOUTH.has(cid), summer = south ? (m === 11 || m <= 1) : (m >= 5 && m <= 7);
  const reg = (P.C(cid) || {}).reg;
  if (type === "heat" || type === "wildfire") return summer ? 1.8 : (m >= 2 && m <= 4 && (reg === "SEA" || reg === "MEAF")) ? 1.5 : .7;
  if (type === "drought") return summer ? 1.4 : .9;
  if (type === "flood") return (m >= 5 && m <= 9 && (reg === "SEA" || reg === "EA")) ? 1.8 : .8;
  if (type === "typhoon") return (m >= 6 && m <= 10) ? 2 : .4;
  if (type === "hurricane") return (m >= 7 && m <= 10) ? 2.2 : .3;
  return 1;
}

/* ---------------- Continuous World ---------------- */
const worldUnlocked = () => { const e = (P.AchStore.data.ends || {}); const c = P.Net && P.Net.user && P.Net.user.cleared; return Object.keys(e).some(k => k.startsWith("win")) || !!(c && (c.normal || c.hard)); };
const GOALS = [
  {id:"cut", icon:"$co2", t:T("ลด CO₂ ของ {R} ลง 2% ในฤดูนี้", "Cut {R}'s CO₂ by 2% this season"), make:() => { const r = S.regions.slice().sort((a, b) => b.co2 - a.co2)[Math.floor(P.rand() * 3)]; return {r:r.id, v0:r.co2}; }, done:g => (P.R(g.r).co2 <= g.v0 * .98), reward:{ep:40}},
  {id:"aid", icon:"heart-handshake", t:T("ช่วยเหลือผู้ประสบภัย (ฟองสีแดง) 1 ครั้ง", "Answer one disaster-aid bubble"), make:() => ({v0:S.stats.aid}), done:g => S.stats.aid >= g.v0 + 1, reward:{pc:10}},
  {id:"ore", icon:"$ore", t:T("เก็บทรัพยากรให้ได้ 20 หน่วย", "Collect 20 resources"), make:() => ({v0:Object.values(S.oreFrom || {}).reduce((a, b) => a + b, 0)}), done:g => Object.values(S.oreFrom || {}).reduce((a, b) => a + b, 0) >= g.v0 + 20, reward:{ep:30}},
  {id:"skill", icon:"network", t:T("ปลดล็อกสกิลใหม่ 1 อย่าง", "Unlock one new skill"), make:() => ({v0:Object.keys(S.owned).length}), done:g => Object.keys(S.owned).length >= g.v0 + 1, reward:{ore:15}},
  {id:"friend", icon:"$heart", t:T("ทำให้มิตรภาพกับ {C} ถึง 50", "Get friendship with {C} to 50"), make:() => { const l = S.countries.filter(c => !c.rest && c.rel < 45 && c.rel > -20); const c = l[Math.floor(P.rand() * l.length)] || S.countries[0]; return {c:c.id}; }, done:g => (P.C(g.c) || {}).rel >= 50, reward:{ep:35}},
  {id:"appr", icon:"$appr", t:T("รักษาความนิยมไว้เกิน 50% จนจบฤดู", "Keep approval above 50% all season"), make:() => ({ok:true}), check:g => { if (S.appr < 50) g.ok = false; }, done:g => g.ok && (S.tick % 3 === 2), reward:{pc:8}},
  {id:"green", icon:"leaf", t:T("ทำให้ {C} รับเทคโนโลยีสีเขียวถึง 60%", "Get {C} to 60% green technology"), make:() => { const l = S.countries.filter(c => !c.rest && c.green < 50); const c = l.sort((a, b) => b.co2 - a.co2)[Math.floor(P.rand() * Math.min(6, l.length))] || S.countries[0]; return {c:c.id}; }, done:g => G(g.c) >= 60, reward:{ep:45}},
];
function newGoals(){
  const pool = GOALS.slice(), out = [];
  while (out.length < 2 && pool.length){ const i = Math.floor(P.rand() * pool.length), def = pool.splice(i, 1)[0]; out.push({id:def.id, ...def.make(), won:false}); }
  S.goals = out;
}
function goalText(g){ const d = GOALS.find(x => x.id === g.id); return L(d.t).replace("{R}", g.r ? L(P.RMETA[g.r].name) : "").replace("{C}", g.c ? P.cname(g.c) : ""); }
function goalsTick(){
  if (!S.world) return;
  if (!S.goals || S.tick % 3 === 0) newGoals();
  for (const g of S.goals){
    if (g.won) continue;
    const d = GOALS.find(x => x.id === g.id); if (d.check) d.check(g);
    if (d.done(g)){
      g.won = true; const r = d.reward;
      if (r.ep) S.ep += r.ep; if (r.pc) S.pc += r.pc; if (r.ore){ S.ore = (S.ore || 0) + r.ore; }
      S.goalsWon = (S.goalsWon || 0) + 1;
      P.addLog(`[[target]] ${L(T("ทำเป้าหมายสำเร็จ", "Goal done"))}: ${goalText(g)} · ${r.ep ? `${P.IC.ep} +${r.ep}` : r.pc ? `${P.IC.pc} +${r.pc}` : `${P.IC.ore} +${r.ore}`}`, "gd");
      hook("sfx", "done");
    }
  }
}
/* eras of the Continuous World */
const ERAS = {
  shift:{icon:"zap", name:T("ยุคเปลี่ยนผ่าน", "The Transition"), goal:T("ไปให้ถึง Net Zero", "Reach Net Zero")},
  heal:{icon:"sprout", name:T("ยุคฟื้นฟู", "The Healing"), goal:T("ดึง CO₂ ออกจนอุณหภูมิลดต่ำกว่า +1.5°C", "Pull CO₂ out until warming falls below +1.5°C")},
  thrive:{icon:"sparkles", name:T("ยุครุ่งเรือง", "The Thriving Age"), goal:T("รักษาโลกให้สมดุล ทุกทวีปทำตามแผน 80% ขึ้นไป", "Keep the world in balance, every region 80%+ on-plan")},
};
/* the world mode replaces game over with setbacks you can recover from */
function worldCheck(){
  const net = P.netCO2();
  if (!S.era) S.era = "shift";
  if (S.era === "shift" && net <= 0){
    S.era = "heal"; S.firstNZ = S.firstNZ || S.tick; const gr = P.gradeOf(S.temp);
    const ends = P.AchStore.data.ends = P.AchStore.data.ends || {}; ends["win" + gr] = ends["win" + gr] || Date.now(); P.AchStore.save(); P.Ach.unlock("win");
    P.addLog(`[[sprout]] Net Zero! ${L(T("เข้าสู่", "Entering"))} ${L(ERAS.heal.name)}`, "gd"); hook("toast", {id:"era2", icon:"sprout", title:"Net Zero", msg:L(ERAS.heal.name)}); hook("sfx", "win");
  }
  if (S.era === "heal" && S.temp < 1.5){ S.era = "thrive"; P.addLog(`[[sparkles]] ${L(ERAS.thrive.name)}`, "gd"); hook("toast", {id:"era3", icon:"sparkles", title:L(T("ยุคใหม่", "New era")), msg:L(ERAS.thrive.name)}); hook("sfx", "win"); }
  if (S.temp >= 3.0 && !S.crisis){ S.crisis = true; P.addLog(L(T("[[flame]] โลกร้อนเกิน +3°C: เข้าสู่ภาวะวิกฤต ภัยพิบัติมาถี่ขึ้น 2 เท่าจนกว่าจะลดลงต่ำกว่า +2.8°C", "[[flame]] Over +3°C: climate crisis — disasters come twice as often until warming falls below +2.8°C")), "al"); hook("sfx", "warn"); }
  if (S.crisis && S.temp < 2.8){ S.crisis = false; P.addLog(L(T("[[sun]] พ้นภาวะวิกฤตแล้ว", "[[sun]] The crisis is over")), "gd"); }
  if (S.appr <= 0){
    S.elections = (S.elections || 0) + 1; S.appr = 35; S.pc = Math.floor(S.pc / 2); S.ep = Math.floor(S.ep / 2);
    P.addLog(L(T("[[vote]] ประชาชนไม่พอใจ: เลือกตั้งใหม่ ทีมงานเสียงบและแต้มนโยบายไปครึ่งหนึ่ง แต่ยังทำงานต่อได้", "[[vote]] The public lost faith: a new election halves your money and policy points, but the work goes on")), "al"); hook("sfx", "lose");
  }
}
/* a climate summit every December */
const COP = {id:"COP", snd:"crowd", title:T("การประชุมสุดยอดภูมิอากาศ COP{N}", "Climate summit COP{N}"),
  desc:T("ผู้นำทั่วโลกมาประชุมประจำปี ทุกประเทศรอดูว่าคณะทำงานของเราจะเสนออะไร", "World leaders meet for the yearly summit. Every country is waiting to see what our taskforce proposes."),
  options:[
    {label:T("เสนอเป้าหมายลดก๊าซที่เข้มขึ้น", "Propose tougher cuts"), fx:{pc:-20, comp:{ALL:5}, appr:-2, delay:{m:12, fx:{co2:-.6}}}},
    {label:T("เสนอกองทุนช่วยประเทศเปราะบาง", "Propose a fund for vulnerable countries"), fx:{ep:-60, vuln:{ALL:-4}, relAll:5}},
    {label:T("ออกแถลงการณ์กว้าง ๆ ไม่ผูกมัด", "Issue a vague statement"), fx:{pc:6, appr:-3, tip:1}},
  ]};
function copEvent(){ return {...COP, title:{th:COP.title.th.replace("{N}", 31 + Math.floor(S.tick / 12)), en:COP.title.en.replace("{N}", 31 + Math.floor(S.tick / 12))}}; }

/* ---------------- called by the engine ---------------- */
function v1Init(){
  const st = S;
  if (st.ore === undefined) st.ore = 0;
  if (st.oreOn === undefined) st.oreOn = false;
  st.oreBan = st.oreBan || {}; st.oreFrom = st.oreFrom || {}; st.pins = st.pins || []; st.closed = st.closed || {};
  if (st.airCut === undefined) st.airCut = 0;
  greenInit();
  if (P.impactInit) P.impactInit();
  if (P.world2Init) P.world2Init();
  if (P.marketInit) P.marketInit();
}
function v1Tick(){
  P.oreTick(); greenTick(); pinsTick(); goalsTick(); if (P.world2Tick) P.world2Tick();
  Object.keys(S.closed || {}).forEach(k => { if (S.closed[k] > 0 && --S.closed[k] === 0) P.addLog(`[[ship]] ${L(CHOKE[k])} ${L(T("เปิดให้เรือผ่านได้แล้ว", "is open again"))}`, "gd"); });
  if (S.airCut > 0 && --S.airCut === 0) P.addLog(L(T("[[plane]] เที่ยวบินทั่วโลกกลับมาแล้ว", "[[plane]] Flights are back")), "tc");
}

Object.assign(P, {AIR, LANES, CHOKE, laneOpen, trafficLevels, addGreen, greenInit, placeBuilds, SEASONS, seasonOf, seasonWeight, worldUnlocked, GOALS, goalText, ERAS, worldCheck, copEvent, v1Init, v1Tick});
