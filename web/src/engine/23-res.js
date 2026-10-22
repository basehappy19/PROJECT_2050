const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.res) return;
(P.mods = P.mods || {}).res = 1;
/* =========================================================================
   Version 1.0 · Resources (the light version used in the normal game)
   One value, "แร่ / Minerals", stands for all the minerals clean energy needs
   (rare earths, lithium, cobalt, nickel, copper, graphite, …).
   · Minerals come in every month from countries that have them, more when they are friends with us.
   · Clean-energy skills cost minerals as well as money (based on IEA minerals-per-megawatt figures).
   · Orange bubbles over mining countries give minerals; a country order buys them directly.
   · Export bans (real events) cut a country off for a while.
   The other resources (plastic, sand, phosphate, helium, rubber, palm oil, …) appear in events,
   on the country panel and in the learning page, so the normal game stays simple.
   ========================================================================= */
const {S, SKILLS, SKILL, COUNTRY, IC} = P;
const T = (th, en) => ({th, en});
const L = o => P.L(o);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hook = (name, ...a) => (P.H && P.H[name] ? P.H[name](...a) : undefined);
const USGS = "https://pubs.usgs.gov/publication/mcs2026";

/* ---------------- resource types (facts: USGS Mineral Commodity Summaries 2026 unless noted) ---------------- */
const RES = {
  ree:{icon:"magnet", col:"#c3a6ff", name:T("แร่หายาก (Rare Earth)", "Rare earths"), use:T("แม่เหล็กในกังหันลมและมอเตอร์รถไฟฟ้า", "Magnets in wind turbines and EV motors"),
    fact:T("ปี 2025 โลกผลิตแร่หายากราว 390,000 ตัน จีนผลิต 270,000 ตัน (ราว 69%) ส่วนบราซิลมีแหล่งสำรองมากเป็นอันดับ 2 (21 ล้านตัน) แต่ผลิตได้เพียง 2,000 ตัน ไทยผลิตได้ 4,800 ตัน",
      "In 2025 the world mined about 390,000 t of rare earths; China mined 270,000 t (about 69%). Brazil has the 2nd-largest reserves (21 Mt) but mined only 2,000 t; Thailand mined 4,800 t."), src:USGS},
  li:{icon:"battery-full", col:"#8fd0ff", name:T("ลิเทียม", "Lithium"), use:T("แบตเตอรี่รถไฟฟ้าและแบตเตอรี่กักเก็บไฟ", "Batteries for EVs and grid storage"),
    fact:T("ปี 2025 โลกผลิตลิเทียม 290,000 ตัน ออสเตรเลียมากที่สุด 92,000 ตัน ตามด้วยจีน 62,000 และชิลี 56,000 ตัน", "In 2025 the world mined 290,000 t of lithium: Australia 92,000 t, China 62,000 t, Chile 56,000 t."), src:USGS},
  co:{icon:"atom", col:"#5b8cff", name:T("โคบอลต์", "Cobalt"), use:T("แบตเตอรี่", "Batteries"),
    fact:T("คองโก (DRC) ผลิตโคบอลต์ 230,000 ตันจากทั้งโลก 310,000 ตัน (ราว 74%) และสั่งห้ามส่งออกชั่วคราวในเดือนกุมภาพันธ์ 2025 ก่อนเปลี่ยนเป็นโควตา", "DR Congo mined 230,000 t of the world's 310,000 t of cobalt (about 74%) and banned exports for a while in February 2025, then switched to quotas."), src:USGS},
  ni:{icon:"hexagon", col:"#9fe8c8", name:T("นิกเกิล", "Nickel"), use:T("แบตเตอรี่และเหล็กกล้าไร้สนิม", "Batteries and stainless steel"),
    fact:T("อินโดนีเซียผลิตนิกเกิล 2.6 ล้านตันจากทั้งโลก 3.9 ล้านตัน (ราว 2 ใน 3) หลังห้ามส่งออกแร่ดิบตั้งแต่ปี 2020 เพื่อบังคับให้แปรรูปในประเทศ", "Indonesia mined 2.6 Mt of the world's 3.9 Mt of nickel (about two thirds), after banning raw-ore exports in 2020 to force processing at home."), src:USGS},
  cu:{icon:"cable", col:"#f0a060", name:T("ทองแดง", "Copper"), use:T("สายไฟ สายส่ง มอเตอร์ ทุกอย่างที่ใช้ไฟฟ้า", "Wires, power lines, motors — everything electric"),
    fact:T("โลกผลิตทองแดง 23 ล้านตันต่อปี ชิลีมากที่สุด 5.3 ล้านตัน ตามด้วยคองโก 3.2 และเปรู 2.7 ล้านตัน", "The world mines 23 Mt of copper a year: Chile 5.3 Mt, DR Congo 3.2 Mt, Peru 2.7 Mt."), src:USGS},
  gr:{icon:"pencil", col:"#9aa7b0", name:T("กราไฟต์", "Graphite"), use:T("ขั้วแบตเตอรี่ลิเทียมไอออน", "Battery anodes"),
    fact:T("จีนผลิตกราไฟต์ธรรมชาติราว 82% ของโลก (1.4 ล้านตันจาก 1.8 ล้านตัน ปี 2025)", "China produced about 82% of the world's natural graphite (1.4 of 1.8 Mt in 2025)."), src:USGS},
  ga:{icon:"cpu", col:"#b7c7cf", name:T("แกลเลียม", "Gallium"), use:T("ชิป LED และแผงโซลาร์บางชนิด", "Chips, LEDs and some solar cells"),
    fact:T("จีนผลิตแกลเลียมขั้นต้นราว 99% ของโลก คุมการส่งออกตั้งแต่สิงหาคม 2023 และห้ามส่งไปสหรัฐฯ ในเดือนธันวาคม 2024", "China makes about 99% of the world's primary gallium; it controlled exports from August 2023 and banned sales to the US in December 2024."), src:USGS},
  si:{icon:"sun", col:"#8fd0ff", name:T("ซิลิคอนเกรดโซลาร์", "Solar-grade silicon"), use:T("แผงโซลาร์", "Solar panels"),
    fact:T("จีนมีส่วนแบ่งการผลิตเกิน 80% ในทุกขั้นตอนของการผลิตแผงโซลาร์ (IEA 2022)", "China holds over 80% of every stage of solar panel manufacturing (IEA, 2022)."), src:"https://www.iea.org/reports/solar-pv-global-supply-chains"},
  u:{icon:"radiation", col:"#c8f05a", name:T("ยูเรเนียม", "Uranium"), use:T("เชื้อเพลิงโรงไฟฟ้านิวเคลียร์", "Nuclear fuel"),
    fact:T("คาซัคสถานผลิตยูเรเนียมมากที่สุดในโลก ราว 40% (World Nuclear Association)", "Kazakhstan mines the most uranium, about 40% of the world (World Nuclear Association)."), src:"https://world-nuclear.org/information-library/nuclear-fuel-cycle/mining-of-uranium/world-uranium-mining-production"},
  ph:{icon:"sprout", col:"#d9c27a", name:T("ฟอสเฟต", "Phosphate"), use:T("ปุ๋ย (และแบตเตอรี่ LFP)", "Fertiliser (and LFP batteries)"),
    fact:T("โมร็อกโกมีแหล่งฟอสเฟตสำรอง 50,000 ล้านตันจาก 73,000 ล้านตันของโลก (ราว 68%) อาหารของโลกพึ่งปุ๋ยจากแร่นี้", "Morocco holds 50 of the world's 73 billion t of phosphate reserves (about 68%); the world's food depends on fertiliser from it."), src:USGS},
  he:{icon:"orbit", col:"#d6f3ff", name:T("ฮีเลียม", "Helium"), use:T("เครื่อง MRI โรงงานชิป", "MRI scanners, chip factories"),
    fact:T("ฮีเลียมได้มาจากแหล่งก๊าซธรรมชาติ ผู้ผลิตหลักคือสหรัฐฯ และกาตาร์ (63 ล้านลูกบาศก์เมตรในปี 2025) ถ้าปล่อยออกไปแล้วจะลอยหนีออกจากโลก", "Helium comes from natural-gas fields; the main producers are the US and Qatar (63 million m³ in 2025). Once released it escapes into space."), src:USGS},
  sand:{icon:"hourglass", col:"#e8cf95", name:T("ทราย", "Sand"), use:T("คอนกรีต แก้ว และกระจกแผงโซลาร์", "Concrete, glass and solar-panel glass"),
    fact:T("โลกใช้ทรายและกรวดราว 50,000 ล้านตันต่อปี มากเป็นอันดับ 2 รองจากน้ำ ทรายทะเลทรายใช้ทำคอนกรีตไม่ได้เพราะเม็ดกลมเกินไป (UNEP 2022)", "The world uses about 50 billion t of sand and gravel a year — second only to water. Desert sand is too round for concrete (UNEP, 2022)."), src:"https://www.unep.org/news-and-stories/press-release/our-use-sand-brings-us-against-wall-says-unep-report"},
  plastic:{icon:"cup-soda", col:"#7fd8d0", name:T("พลาสติก", "Plastic"), use:T("ของใช้ บรรจุภัณฑ์ และชิ้นส่วนกังหันลม", "Everyday goods, packaging and wind-turbine blades"),
    fact:T("โลกผลิตพลาสติกราว 414 ล้านตันในปี 2023 เกือบทั้งหมดทำจากน้ำมันและก๊าซ การเจรจาสนธิสัญญาพลาสติกโลกที่ปูซาน (2024) ยังตกลงกันไม่ได้", "The world made about 414 Mt of plastic in 2023, almost all from oil and gas. Talks on a global plastics treaty in Busan (2024) ended without a deal."), src:"https://plasticseurope.org/knowledge-hub/plastics-the-fast-facts-2024/"},
  rubber:{icon:"circle-dot", col:"#a3d977", name:T("ยางพารา", "Natural rubber"), use:T("ยางรถยนต์ ถุงมือ", "Tyres, gloves"),
    fact:T("ไทยผลิตยางธรรมชาติมากที่สุดในโลก ราวหนึ่งในสามของทั้งโลก", "Thailand produces the most natural rubber in the world, about a third of the total."), src:"https://www.european-rubber-journal.com/article/2096778/natural-rubber-demand-grows-in-2024-signalling-potential-market-recovery"},
  palm:{icon:"tree-palm", col:"#e0b84a", name:T("น้ำมันปาล์ม", "Palm oil"), use:T("อาหาร เครื่องสำอาง ไบโอดีเซล", "Food, cosmetics, biodiesel"),
    fact:T("อินโดนีเซียและมาเลเซียผลิตน้ำมันปาล์มรวมกันกว่า 80% ของโลก การขยายสวนปาล์มเป็นสาเหตุใหญ่ของการทำลายป่าฝน", "Indonesia and Malaysia make over 80% of the world's palm oil; new plantations are a big cause of rainforest loss."), src:"https://ourworldindata.org/palm-oil"},
  oil:{icon:"fuel", col:"#7a6a5a", name:T("น้ำมันและก๊าซ", "Oil & gas"), use:T("เชื้อเพลิง พลาสติก ปุ๋ย", "Fuel, plastics, fertiliser"),
    fact:T("น้ำมันและก๊าซยังเป็นพลังงานมากกว่าครึ่งหนึ่งของโลก และเป็นวัตถุดิบของพลาสติกและปุ๋ยไนโตรเจน", "Oil and gas still supply over half the world's energy, and are the raw material for plastics and nitrogen fertiliser."), src:"https://www.iea.org/reports/world-energy-outlook-2024"},
  coal:{icon:"mountain", col:"#5a5a5a", name:T("ถ่านหิน", "Coal"), use:T("ไฟฟ้า เหล็กกล้า", "Electricity, steel"),
    fact:T("ถ่านหินปล่อย CO₂ ราว 820 กรัมต่อหน่วยไฟฟ้า (kWh) ตลอดวงจรชีวิต มากกว่าพลังงานลมราว 70 เท่า (IPCC)", "Coal power emits about 820 g CO₂ per kWh over its life cycle — about 70 times more than wind (IPCC)."), src:"https://www.ipcc.ch/report/ar5/wg3/"},
};
/* which countries have what (top producers or reserves), and how much they can send us (ore weight) */
const CRES = {
  CHN:{r:["ree", "gr", "ga", "si", "coal"], w:6}, AUS:{r:["li", "ree", "coal"], w:4}, CHL:{r:["cu", "li"], w:4}, COD:{r:["co", "cu"], w:3},
  IDN:{r:["ni", "palm", "coal"], w:4}, BRA:{r:["ree", "gr"], w:2}, PER:{r:["cu", "ph"], w:2}, ARG:{r:["li", "oil"], w:2},
  USA:{r:["ree", "he", "oil", "cu"], w:2}, RUS:{r:["ni", "oil", "co"], w:2}, PHL:{r:["ni"], w:1}, MMR:{r:["ree"], w:2}, VNM:{r:["ree", "rubber"], w:1},
  THA:{r:["rubber", "ree", "palm"], w:1}, KAZ:{r:["u", "cu"], w:2}, CAN:{r:["ni", "u", "oil"], w:2}, MAR:{r:["ph"], w:1}, MEX:{r:["cu"], w:1},
  POL:{r:["cu", "coal"], w:1}, IND:{r:["coal", "ree"], w:1}, MYS:{r:["palm", "rubber"], w:0}, QAT:{r:["he", "oil"], w:0}, SAU:{r:["oil", "ph"], w:0},
  DZA:{r:["he", "oil"], w:0}, KHM:{r:["sand", "rubber"], w:0}, EGY:{r:["ph", "oil"], w:0}, LKA:{r:["gr"], w:1}, UZB:{r:["u"], w:1}, MNG:{r:["cu", "coal"], w:1},
  ZAF:{r:["coal"], w:1}, IRN:{r:["oil"], w:0}, IRQ:{r:["oil"], w:0}, ARE:{r:["oil"], w:0}, KWT:{r:["oil"], w:0}, NGA:{r:["oil"], w:0}, NOR:{r:["oil"], w:0},
  BOL:{r:["li"], w:2}, MOZ:{r:["gr"], w:1}, MDG:{r:["gr", "ni"], w:1}, TZA:{r:["gr"], w:1}, PNG:{r:["cu", "ni"], w:1}, FIN:{r:["ni", "co"], w:1}, JOR:{r:["ph"], w:1},
  AGO:{r:["oil"], w:0}, OMN:{r:["oil"], w:0}, BRN:{r:["oil"], w:0},
  /* 1.6 */ ZMB:{r:["cu", "co"], w:2}, ZWE:{r:["li", "coal"], w:2}, NAM:{r:["u"], w:2}, NER:{r:["u"], w:1}, SRB:{r:["li"], w:1}, GAB:{r:["oil"], w:0},
  LBY:{r:["oil"], w:0}, BHR:{r:["oil"], w:0}, TKM:{r:["oil"], w:0}, AZE:{r:["oil"], w:0}, TTO:{r:["oil"], w:0}, GUY:{r:["oil"], w:0},
  TUN:{r:["ph"], w:0}, SEN:{r:["ph"], w:0}, TGO:{r:["ph"], w:0}, AFG:{r:["li", "cu"], w:0}, BGR:{r:["cu"], w:0}, MRT:{r:["sand"], w:0},
  VEN:{r:["oil"], w:0}, COL:{r:["coal", "oil"], w:0}, ECU:{r:["oil"], w:0}, TUR:{r:["co"], w:0}, ISR:{r:["ph"], w:0},
};
/* countries that depend on imported minerals (shown on their panel) */
const IMPORTERS = ["JPN", "KOR", "TWN", "DEU", "FRA", "ITA", "GBR", "ESP", "NLD", "BEL"];

/* ---------------- skills: minerals needed (IEA intensities) and what gets built on the map ---------------- */
/* 1.1: minerals are scarcer and more skills need them (each split into mineral groups, see 28-market.js RECIPE) */
const ORE = {E1:15, E2:45, E8:15, E3:60, E7:30, E4:35, E9:10, E5:50, I1:20, I2:25, I4:10, P4:70, E6:40, I3:10, N4:30, N6:20, C2:10, C4:20, C5:10, C7:25, P5:15};
/* build kinds are drawn by the map (wind turbines, solar farms, …); where = preferred countries (real potential) */
const BUILD = {
  E1:{k:"grid", where:["USA", "CHN", "IND", "DEU", "BRA", "JPN"], n:2},
  E2:{k:"wind", where:["CHN", "USA", "DEU", "GBR", "BRA", "IND", "ESP", "ARG", "MAR", "AUS", "TUR", "MEX"], n:5, k2:"solar", where2:["CHN", "IND", "USA", "AUS", "SAU", "ARE", "EGY", "CHL", "MEX", "ESP", "THA", "VNM", "ZAF", "MAR"]},
  E8:{k:"geo", where:["USA", "IDN", "PHL", "TUR", "NZL", "KEN", "MEX", "JPN"], n:3},
  E3:{k:"battery", where:["CHN", "USA", "AUS", "DEU", "GBR", "KOR", "JPN", "IND"], n:3},
  E7:{k:"floatsolar", where:["CHN", "THA", "VNM", "IND", "IDN", "JPN", "KOR"], n:3},
  E4:{k:"nuclear", where:["USA", "FRA", "CHN", "RUS", "KOR", "IND", "CAN", "GBR"], n:3},
  E5:{k:"fusion", where:["FRA", "GBR", "USA", "CHN", "JPN"], n:2},
  E6:{k:"h2", where:["CHN", "DEU", "SAU", "AUS", "USA", "JPN", "KOR", "CHL"], n:3},
  I1:{k:"steel", where:["CHN", "IND", "JPN", "KOR", "DEU", "USA", "SWE", "BRA"], n:2},
  I2:{k:"rail", where:["CHN", "ESP", "FRA", "JPN", "THA", "IDN", "IND", "TUR", "DEU", "USA"], n:4},
  P4:{k:"ev", where:["CHN", "USA", "DEU", "NOR", "GBR", "FRA", "KOR", "JPN", "THA", "IND"], n:4},
  I5:{k:"recycle", where:["DEU", "JPN", "KOR", "NLD", "CHN", "USA"], n:2},
  N4:{k:"dac", where:["USA", "CAN", "NOR", "SAU", "GBR"], n:2},
  N1:{k:"forest", where:["BRA", "COD", "IDN", "CAN", "RUS", "CHN", "IND", "ETH", "KEN", "MEX", "COL", "PER"], n:5},
  N2:{k:"mangrove", where:["IDN", "BRA", "MYS", "PHL", "THA", "BGD", "MEX", "NGA", "VNM"], n:4},
  N3:{k:"farm", where:["IND", "USA", "BRA", "CHN", "ARG", "FRA", "UKR"], n:3},
  N6:{k:"ocean", where:["AUS", "NOR", "JPN", "PHL", "CHL"], n:2},
  A1:{k:"rice", where:["CHN", "IND", "IDN", "BGD", "VNM", "THA", "MMR", "PHL"], n:3},
  N5:{k:"biochar", where:["BRA", "IND", "KEN", "USA", "CHN"], n:2},
  C2:{k:"sponge", where:["CHN", "THA", "IDN", "VNM", "BGD", "IND"], n:2},
  C4:{k:"seawall", where:["NLD", "BGD", "VNM", "THA", "EGY"], n:2},
  C7:{k:"city", where:["CHN", "USA", "IND", "IDN", "JPN", "NGA", "EGY", "BRA"], n:3},
  P5:{k:"building", where:["USA", "DEU", "CHN", "JPN", "GBR", "FRA"], n:2},
  I3:{k:"saf", where:["USA", "GBR", "ARE", "FRA", "BRA", "NLD"], n:2},
  R1:{k:"recycle", where:["CHN", "USA", "KOR", "JPN", "DEU", "IND"], n:2},
  R2:{k:"mine", where:["AUS", "CHL", "BRA", "IDN", "CAN", "USA", "VNM", "THA"], n:3},
};
/* two new skills for minerals */
const S_ = (id, cat, icon, pos, ep, pc, req, months, name, desc, fx, extra = {}) => ({id, cat, icon, pos, ep, pc, req, months, name, desc, fx, type:"passive", ...extra});
const NEW_SKILLS = [
  S_("R1", "industry", "battery-charging", [3, 0], 80, 15, ["I5"], 12, T("รีไซเคิลแบตเตอรี่และแร่", "Battery & Mineral Recycling"),
    T("ได้ทรัพยากร +1 ทุกเดือนจากของเก่า และสกิลที่ใช้ทรัพยากรใช้น้อยลง 20%", "Minerals +1 every month from old products; skills need 20% fewer minerals"), {oreInc:1, oreDisc:.2}),
  S_("R2", "energy", "pickaxe", [3, 1], 90, 20, ["E2"], 12, T("เหมืองและโรงแยกแร่ในประเทศ", "Home Mines & Refineries"),
    T("ได้ทรัพยากร +2 ทุกเดือนโดยไม่พึ่งประเทศอื่น แต่ความนิยม −4% และความเสี่ยงภัยพิบัติทุกทวีป +3% จากมลพิษเหมือง", "Minerals +2 a month without relying on others, but approval −4% and every region's disaster risk +3% from mine pollution"),
    {oreInc:2, appr:-4, vulnAll:3}, {trade:1}),
];
NEW_SKILLS.forEach(n => { if (!SKILL[n.id]){ SKILLS.push(n); SKILL[n.id] = n; } });
SKILLS.forEach(n => { if (ORE[n.id]) n.ore = ORE[n.id]; if (BUILD[n.id]) n.build = BUILD[n.id]; });
if (P.NODE_ICON) NEW_SKILLS.forEach(n => { P.NODE_ICON[n.id] = n.icon; });

/* ---------------- minerals: income, costs, bubbles ---------------- */
const relFactor = rel => rel >= 50 ? 1 : rel >= 20 ? .6 : rel >= 0 ? .3 : 0;
const ORE_HOME = .25, ORE_SRC = .016;   // 1.1: much less free income (was .6 and .035)
/* what each country sends us this month: [{id, amt}] */
function oreSources(){
  const out = [];
  for (const c of S.countries){
    const cr = CRES[c.id]; if (!cr || !cr.w || c.rest) continue;
    if ((S.oreBan || {})[c.id] > 0) continue;
    const amt = cr.w * relFactor(c.rel) * ORE_SRC;
    if (amt > 0) out.push({id:c.id, amt});
  }
  return out;
}
function oreGain(){
  if (!S.oreOn) return 0;
  let g = ORE_HOME + oreSources().reduce((s, x) => s + x.amt, 0) + (S.oreInc || 0);
  if ((S.orePrice || 0) > 0) g *= .7;                // price spike: the market sends less for the same money
  return Math.max(0, Math.round(g * 10) / 10);
}
const oreDisc = () => Math.max(.5, 1 - (S.oreDisc || 0));
function oreCost(n){
  if (!n.ore || !S.oreOn) return 0;
  return Math.round(n.ore * oreDisc() * (S.orePrice > 0 ? 1.3 : 1) * (P.balanceCost ? P.balanceCost() : 1));
}
function oreTick(){
  if (!S.oreOn) return;
  const src = oreSources(), base = ORE_HOME + (S.oreInc || 0), tot = oreGain();
  S.ore = (S.ore || 0) + tot;
  const from = S.oreFrom = S.oreFrom || {};
  src.forEach(x => { from[x.id] = (from[x.id] || 0) + x.amt; });
  from.home = (from.home || 0) + base;
  Object.keys(S.oreBan || {}).forEach(k => { if (S.oreBan[k] > 0 && --S.oreBan[k] === 0){ P.addLog(`[[${"package-open"}]] ${P.cname(k)} ${L(T("กลับมาส่งออกทรัพยากรแล้ว", "is exporting minerals again"))}`, "gd"); } });
  if (S.orePrice > 0) S.orePrice--;
  // orange bubbles over mining countries
  if (!S.bubbles.some(b => b.type === "ore") && P.rand() < .14){
    const list = S.countries.filter(c => CRES[c.id] && CRES[c.id].w && !(S.oreBan || {})[c.id]);
    if (list.length){ const c = list[Math.floor(P.rand() * list.length)]; S.bubbles.push({id:++S.bubId, type:"ore", reg:c.reg, cid:c.id, ttl:4}); hook("sfx", "spawnGreen"); }
  }
}
/* first skill bought → minerals switch on (one step at a time, as planned) */
function unlockOre(){
  if (S.oreOn) return;
  S.oreOn = true; S.ore = (S.ore || 0) + 15;
  P.addLog(L(T("[[$ore]] ปลดล็อกทรัพยากร: พลังงานสะอาดต้องใช้ทรัพยากร 5 กลุ่ม (แร่แบตเตอรี่ แร่หายาก ทองแดง ซิลิคอนและทราย ยูเรเนียม) หาได้จากประเทศที่เป็นมิตร ฟองสีส้ม การสั่งซื้อจากประเทศ และตลาดทรัพยากรโลก (กดที่ช่องทรัพยากรด้านบน)", "[[$ore]] Minerals unlocked: clean energy needs 5 mineral groups (battery minerals, rare earths, copper, silicon & sand, uranium). Get them from friendly countries, orange bubbles, purchase orders and the world market (tap the minerals box at the top)")), "gd");
  hook("toast", {id:"ore", icon:"$ore", title:L(T("ปลดล็อกใหม่", "New")), msg:L(T("ทรัพยากร: ใช้สร้างพลังงานสะอาด", "Minerals: needed for clean energy"))});
}
function spendOre(n){
  const k = oreCost(n); if (!k) return;
  S.ore -= k; S.oreUsed = (S.oreUsed || 0) + k;
}
function popOre(b){
  const gain = 5 + Math.round(P.rand() * 3);
  S.ore = (S.ore || 0) + gain; (S.oreFrom = S.oreFrom || {})[b.cid] = (S.oreFrom[b.cid] || 0) + gain;
  return gain;
}
/* country order: buy minerals from a country that has them */
const ORE_BUY = {id:"ore", icon:"package", ep:30, pc:0, cd:6, name:T("ซื้อทรัพยากรจากประเทศนี้", "Buy resources here"), desc:T("ทรัพยากรที่ประเทศนี้มี +8 ถึง +14 (ยิ่งเป็นมิตรยิ่งได้มาก) และมิตรภาพ +2", "This country's minerals +8 to +14 (more if friendly), friendship +2")};
function oreBuyOk(c){ return !!(S.oreOn && c && !c.rest && CRES[c.id] && CRES[c.id].w && !((S.oreBan || {})[c.id] > 0)); }
function oreBuy(c){
  const gain = Math.round(8 + 6 * relFactor(c.rel));
  S.ore = (S.ore || 0) + gain; (S.oreFrom = S.oreFrom || {})[c.id] = (S.oreFrom[c.id] || 0) + gain;
  return gain;
}
/* end-of-game summary: total used and the biggest supplier */
function oreSummary(){
  const from = S.oreFrom || {}, tot = Object.values(from).reduce((a, b) => a + b, 0);
  const top = Object.entries(from).filter(([k]) => k !== "home").sort((a, b) => b[1] - a[1])[0];
  return {used:Math.round(S.oreUsed || 0), top:top ? top[0] : null, share:top && tot ? Math.round(top[1] / tot * 100) : 0};
}

{ const i = (P.CACTS || []).findIndex(a => a.id === "ore"); if (i >= 0) P.CACTS[i] = ORE_BUY; }
Object.assign(P, {ORE_HOME, ORE_SRC, RES, CRES, IMPORTERS, ORE_BUY, oreSources, oreGain, oreCost, oreTick, unlockOre, spendOre, popOre, oreBuyOk, oreBuy, oreSummary, relFactor});
