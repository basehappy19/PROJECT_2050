const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.dataSkills) return;
(P.mods = P.mods || {}).dataSkills = 1;
/* ===== Data · Skill tree: 40 skills in 5 categories (Plague Inc style screen) =====
   type: passive (bought once, works all game) · active (bought once, then used with a cooldown)
         target = "country" → the active needs a selected country
   resp: hazard types this skill softens (local weather, see 14-data-world.js)
   pos:  [col, row] on the hex grid of its category (cols 0–4, rows 0–3)
   fx:   same effect keys as before — co2, all, rco2, sink, appr, compAll, comp, vuln, vulnAll, epInc, damp, tip, p3
   Old ids (E1…N6) are kept so the old balance stays the same. */
const SKILL_CATS = [
  {id:"energy",   icon:"zap",        name:{th:"พลังงาน",en:"Energy"}},
  {id:"industry", icon:"factory",    name:{th:"อุตสาหกรรมและคมนาคม",en:"Industry & Transport"}},
  {id:"nature",   icon:"trees",      name:{th:"เกษตรและป่าไม้",en:"Farming & Forests"}},
  {id:"city",     icon:"building-2", name:{th:"เมืองและการปรับตัว",en:"Cities & Adaptation"}},
  {id:"policy",   icon:"landmark",   name:{th:"การทูตและนโยบาย",en:"Diplomacy & Policy"}},
];
const S_ = (id, cat, icon, pos, ep, pc, req, months, name, desc, fx, extra = {}) => ({id, cat, icon, pos, ep, pc, req, months, name, desc, fx, type:"passive", ...extra});
const SKILLS = [
  /* ---------------- Energy ---------------- */
  S_("E1","energy","zap",[0,1],50,10,[],6,{th:"โครงข่ายไฟฟ้าอัจฉริยะ",en:"Smart Grid"},
    {th:"CO₂ โลก −0.8 Gt และสกิลพลังงานสะอาดอื่นได้ผลเพิ่ม 10%",en:"Global CO₂ −0.8 Gt; other clean-energy skills work 10% better"},{co2:-0.8}),
  S_("E2","energy","sun",[1,0],80,15,["E1"],18,{th:"ฟาร์มแสงอาทิตย์และกังหันลม",en:"Solar & Wind Farms"},
    {th:"CO₂ ทุกทวีป −0.4 Gt (รวม −2.4 Gt)",en:"Every region −0.4 Gt (−2.4 Gt total)"},{all:-0.4}),
  S_("E8","energy","flame-kindling",[1,2],70,15,["E1"],12,{th:"พลังงานความร้อนใต้พิภพ",en:"Geothermal Power"},
    {th:"CO₂ ใน NA, SEA และ EA แห่งละ −0.3 Gt",en:"NA, SEA and EA each −0.3 Gt"},{rco2:{NA:-0.3,SEA:-0.3,EA:-0.3}}),
  S_("E3","energy","battery-charging",[2,0],110,20,["E2"],12,{th:"แบตเตอรี่กักเก็บพลังงาน",en:"Battery Storage"},
    {th:"CO₂ โลก −1.5 Gt และการปล่อยโตช้าลง 15%",en:"Global CO₂ −1.5 Gt; emission growth −15%"},{co2:-1.5,damp:.15}),
  S_("E7","energy","sun-medium",[2,1],90,15,["E2"],12,{th:"โซลาร์ลอยน้ำ",en:"Floating Solar"},
    {th:"CO₂ ใน SEA −0.6 Gt และ EA −0.4 Gt ใช้ผิวน้ำเขื่อนแทนพื้นที่เกษตร",en:"SEA −0.6 Gt and EA −0.4 Gt, on reservoirs instead of farmland"},{rco2:{SEA:-0.6,EA:-0.4}}),
  S_("E4","energy","atom",[2,2],140,30,["E8"],24,{th:"โรงไฟฟ้านิวเคลียร์ขนาดเล็ก (SMR)",en:"Small Modular Reactors"},
    {th:"CO₂ โลก −3.0 Gt แต่ความนิยม −5% จากความกังวลเรื่องความปลอดภัย",en:"Global CO₂ −3.0 Gt, but approval −5% over safety fears"},{co2:-3.0,appr:-5},{trade:1}),
  S_("E9","energy","plug-zap",[3,0],60,10,["E3"],0,{th:"ระบบลดการใช้ไฟช่วงพีก",en:"Demand Response"},
    {th:"คลื่นความร้อนเสียหายน้อยลง 50% และการปล่อยโตช้าลง 5%",en:"Heatwaves do 50% less damage; emission growth −5%"},{damp:.05},{resp:{heat:.5}}),
  S_("E5","energy","sparkles",[3,2],250,60,["E4","E3"],36,{th:"โรงไฟฟ้าฟิวชัน",en:"Fusion Power"},
    {th:"CO₂ โลก −6.0 Gt และรายได้ [[$money]] +10/เดือน",en:"Global CO₂ −6.0 Gt and [[$money]] income +10/mo"},{co2:-6.0,epInc:10,damp:.3}),

  /* ---------------- Industry & transport ---------------- */
  S_("I1","industry","anvil",[0,0],60,10,[],12,{th:"เหล็กกล้าคาร์บอนต่ำ",en:"Low-Carbon Steel"},
    {th:"CO₂ ใน EA −0.5, NA −0.2 และ EU −0.2 Gt",en:"EA −0.5, NA −0.2 and EU −0.2 Gt"},{rco2:{EA:-0.5,NA:-0.2,EU:-0.2}}),
  S_("I2","industry","train-front",[0,2],70,15,[],18,{th:"รถไฟความเร็วสูง",en:"High-Speed Rail"},
    {th:"CO₂ โลก −0.9 Gt และความนิยม +2%",en:"Global CO₂ −0.9 Gt, approval +2%"},{co2:-0.9,appr:2}),
  S_("I5","industry","recycle",[1,0],100,20,["I1"],12,{th:"เศรษฐกิจหมุนเวียน",en:"Circular Economy"},
    {th:"CO₂ โลก −1.2 Gt และรายได้ [[$money]] +3/เดือน",en:"Global CO₂ −1.2 Gt and [[$money]] income +3/mo"},{co2:-1.2,epInc:3}),
  S_("I4","industry","wrench",[1,1],50,10,["I1"],0,{th:"ปรับปรุงโรงงานเร่งด่วน",en:"Factory Retrofit Drive"},
    {th:"สกิลกดใช้: CO₂ ของประเทศที่เลือก −15% ทันที แต่มิตรภาพ −5 · พัก 12 เดือน",en:"Active: the selected country's CO₂ −15% now, friendship −5 · 12-month cooldown"},{},{type:"active",target:"country",cd:12}),
  S_("P4","industry","car",[1,2],120,30,["I2"],24,{th:"บังคับขนส่งไฟฟ้า 100%",en:"Zero-Emission Transport Law"},
    {th:"CO₂ โลก −3.2 Gt และการปล่อยภาคขนส่งโตช้าลงถาวร",en:"Global CO₂ −3.2 Gt; permanently damps transport growth"},{co2:-3.2,damp:.25}),
  S_("E6","industry","factory",[2,0],160,35,["I5","E3"],18,{th:"ไฮโดรเจนเขียวในอุตสาหกรรมหนัก",en:"Green Hydrogen Industry"},
    {th:"CO₂ ใน EA และ NA แห่งละ −1.5 Gt",en:"EA and NA each −1.5 Gt"},{rco2:{EA:-1.5,NA:-1.5}}),
  S_("I3","industry","plane",[2,2],90,20,["I2"],18,{th:"เชื้อเพลิงอากาศยานยั่งยืน",en:"Sustainable Aviation Fuel"},
    {th:"CO₂ โลก −0.8 Gt",en:"Global CO₂ −0.8 Gt"},{co2:-0.8}),
  S_("N4","industry","fan",[3,1],180,30,["I5","E3"],24,{th:"โรงงานดักจับคาร์บอนจากอากาศ",en:"Direct Air Capture"},
    {th:"ดักจับ 3.5 Gt/ปี ได้ผลแค่ 60% ถ้ายังไม่มีฟาร์มแสงอาทิตย์และกังหันลม (E2)",en:"Captures 3.5 Gt/yr; only 60% effective without Solar & Wind (E2)"},{sink:3.5}),

  /* ---------------- Farming & forests ---------------- */
  S_("N1","nature","trees",[0,1],50,10,[],24,{th:"มหาโครงการปลูกป่า",en:"Mega-Reforestation"},
    {th:"ดักจับ CO₂ 1.0 Gt/ปี และความนิยม +5%",en:"Captures 1.0 Gt/yr, approval +5%"},{sink:1.0,appr:5}),
  S_("N2","nature","waves",[1,0],70,15,["N1"],18,{th:"ป่าชายเลนและบลูคาร์บอน",en:"Mangroves & Blue Carbon"},
    {th:"ดักจับ 1.2 Gt/ปี, ความเสี่ยงภัย SEA −15% และไต้ฝุ่นกับน้ำเค็มรุกเสียหายน้อยลง 30%",en:"Captures 1.2 Gt/yr, SEA risk −15%; typhoons and saltwater do 30% less damage"},{sink:1.2,vuln:{SEA:-15}},{resp:{typhoon:.3,saltwater:.3}}),
  S_("N3","nature","wheat",[1,2],85,20,["N1"],18,{th:"เกษตรฟื้นฟูบำรุงดิน",en:"Regenerative Farming"},
    {th:"ดักจับ 1.5 Gt/ปี, ความนิยม +3% และความเสี่ยงภัยทุกทวีป −3%",en:"Captures 1.5 Gt/yr, approval +3%, every region's risk −3%"},{sink:1.5,appr:3,vulnAll:-3}),
  S_("N6","nature","fish",[2,0],210,50,["N2"],12,{th:"เติมแร่ธาตุในมหาสมุทร",en:"Ocean Mineralisation"},
    {th:"ดักจับ 4.0 Gt/ปี แต่รบกวนระบบนิเวศทะเล: อุณหภูมิ +0.03°C",en:"Captures 4.0 Gt/yr but disrupts sea life: +0.03°C"},{sink:4.0,tip:8},{trade:1}),
  S_("A1","nature","sprout",[2,1],60,10,["N3"],12,{th:"ข้าวปล่อยมีเทนต่ำ",en:"Low-Methane Rice"},
    {th:"CO₂ ใน SEA −0.5 และ EA −0.3 Gt",en:"SEA −0.5 and EA −0.3 Gt"},{rco2:{SEA:-0.5,EA:-0.3}}),
  S_("N5","nature","shovel",[2,2],95,20,["N3"],12,{th:"ไบโอชาร์ฝังดิน",en:"Biochar"},
    {th:"ดักจับ 1.0 Gt/ปี และผลผลิตเกษตรดีขึ้น (ความนิยม +2%)",en:"Captures 1.0 Gt/yr, better harvests (approval +2%)"},{sink:1.0,appr:2}),
  S_("A2","nature","beef",[3,1],110,25,["A1"],18,{th:"เนื้อสัตว์ทางเลือก",en:"Alternative Protein"},
    {th:"CO₂ โลก −1.0 Gt, รายได้ [[$money]] +2/เดือน แต่ความนิยม −3%",en:"Global CO₂ −1.0 Gt, [[$money]] +2/mo, but approval −3%"},{co2:-1.0,epInc:2,appr:-3},{trade:1}),
  S_("A3","nature","droplets",[3,2],70,15,["N5"],0,{th:"พืชทนแล้ง",en:"Drought-Proof Crops"},
    {th:"ภัยแล้งและไฟป่าเสียหายน้อยลง 50%, ความเสี่ยงภัยทุกทวีป −4%",en:"Droughts and wildfires do 50% less damage; every region's risk −4%"},{vulnAll:-4},{resp:{drought:.5,wildfire:.5}}),

  /* ---------------- Cities & adaptation ---------------- */
  S_("C1","city","radio-tower",[0,0],60,10,[],0,{th:"ระบบเตือนภัยล่วงหน้า",en:"Early Warning System"},
    {th:"เฮอริเคน ไต้ฝุ่น และน้ำท่วมเสียหายน้อยลง 40%, ความเสี่ยงภัยทุกทวีป −5%",en:"Hurricanes, typhoons and floods do 40% less damage; every region's risk −5%"},{vulnAll:-5},{resp:{hurricane:.4,typhoon:.4,flood:.4}}),
  S_("P5","city","building-2",[0,2],100,25,[],18,{th:"มาตรฐานอาคาร Net-Zero",en:"Net-Zero Building Code"},
    {th:"CO₂ โลก −1.8 Gt และประหยัดพลังงานในเมือง",en:"Global CO₂ −1.8 Gt, urban energy savings"},{co2:-1.8,damp:.15}),
  S_("C2","city","droplet",[1,0],90,20,["C1"],12,{th:"เมืองฟองน้ำ",en:"Sponge Cities"},
    {th:"น้ำท่วมเสียหายน้อยลงอีก 50%, ความเสี่ยงภัย SEA −10% และ EA −5%",en:"Floods do a further 50% less damage; SEA risk −10%, EA −5%"},{vuln:{SEA:-10,EA:-5}},{resp:{flood:.5}}),
  S_("C6","city","siren",[1,1],40,10,["C1"],0,{th:"กองบัญชาการอพยพ",en:"Evacuation Command"},
    {th:"สกิลกดใช้: ภัยครั้งถัดไปในประเทศที่เลือกจะอพยพให้ฟรี · พัก 12 เดือน",en:"Active: the next hazard in the selected country is evacuated for free · 12-month cooldown"},{},{type:"active",target:"country",cd:12}),
  S_("C5","city","tree-palm",[1,2],85,15,["P5"],12,{th:"เมืองร่มรื่นลดความร้อน",en:"Cool Green Cities"},
    {th:"คลื่นความร้อนเสียหายน้อยลง 40% และ CO₂ โลก −0.4 Gt",en:"Heatwaves do 40% less damage; global CO₂ −0.4 Gt"},{co2:-0.4},{resp:{heat:.4}}),
  S_("C3","city","umbrella",[2,0],80,20,["C1"],0,{th:"ประกันภัยพิบัติ",en:"Disaster Insurance"},
    {th:"เมื่อเกิดภัยได้ [[$money]] คืน 15 และความนิยมลดเพียงครึ่งเดียว",en:"Each hazard refunds [[$money]] 15 and costs only half the approval"},{},{insure:1}),
  S_("C4","city","brick-wall",[2,1],75,15,["C2"],12,{th:"ประตูกั้นน้ำเค็ม",en:"Saltwater Barriers"},
    {th:"น้ำเค็มรุกเสียหายน้อยลง 60% และความเสี่ยงภัย SEA −8%",en:"Saltwater intrusion does 60% less damage; SEA risk −8%"},{vuln:{SEA:-8}},{resp:{saltwater:.6}}),
  S_("C7","city","shield-check",[3,1],160,40,["C2","C3"],24,{th:"เมกะโปรเจกต์เมืองทนภัย",en:"Resilient Megacities"},
    {th:"ความเสี่ยงภัยทุกทวีป −10% และทำตามแผนทุกทวีป +3%",en:"Every region's risk −10% and on-plan +3%"},{vulnAll:-10,compAll:3}),

  /* ---------------- Diplomacy & policy ---------------- */
  S_("P1","policy","megaphone",[0,1],30,5,[],0,{th:"แคมเปญความรู้ด้านภูมิอากาศ",en:"Climate Literacy Campaign"},
    {th:"ความนิยม +10% และทำตามแผนทุกทวีป +5% (ถาวร)",en:"Approval +10%, every region's on-plan +5% (permanent)"},{appr:10,compAll:5}),
  S_("P2","policy","receipt",[1,0],60,25,["P1"],6,{th:"ภาษีคาร์บอน",en:"Carbon Tax"},
    {th:"CO₂ โลก −2.5 Gt, รายได้ [[$money]] +6/เดือน แต่ความนิยม −8%",en:"Global CO₂ −2.5 Gt, [[$money]] +6/mo, but approval −8%"},{co2:-2.5,appr:-8,epInc:6},{trade:1}),
  S_("D1","policy","hand-coins",[1,1],80,20,["P1"],0,{th:"กองทุนภูมิอากาศโลก",en:"Global Climate Fund"},
    {th:"มิตรภาพกับทุกประเทศขึ้นเร็วขึ้น 20% และการส่งความช่วยเหลือถูกลง 25%",en:"Friendship rise 20% faster; disaster aid costs 25% less"},{},{relBoost:.2,aidDisc:.25}),
  S_("D4","policy","piggy-bank",[1,2],40,10,["P1"],0,{th:"ระดมทุนฉุกเฉิน",en:"Emergency Fundraising"},
    {th:"สกิลกดใช้: ได้ [[$money]] +80 ทันที แต่ความนิยม −4% · พัก 18 เดือน",en:"Active: [[$money]] +80 now, approval −4% · 18-month cooldown"},{},{type:"active",cd:18}),
  S_("P3","policy","scale",[2,0],90,40,["P2"],0,{th:"ภาษีคาร์บอนข้ามพรมแดน",en:"Carbon Border Tax"},
    {th:"ทวีปที่ทำตามแผนต่ำกว่า 70% ถูกบังคับลด CO₂ ปีละ −0.3 Gt ต่อเนื่อง",en:"Regions under 70% on-plan must cut −0.3 Gt/yr, ongoing"},{p3:1}),
  S_("D2","policy","arrow-left-right",[2,1],70,20,["D1"],0,{th:"แลกเปลี่ยนเทคโนโลยี",en:"Technology Exchange"},
    {th:"ปลดล็อกคำสั่ง \"แลกเปลี่ยนเทคโนโลยี\" กับแต่ละประเทศ",en:"Unlocks the \"Share technology\" order for each country"},{}),
  S_("P6","policy","ban",[3,0],150,60,["P3"],12,{th:"เลิกอุดหนุนฟอสซิลทั่วโลก",en:"End Fossil Subsidies"},
    {th:"CO₂ โลก −4.5 Gt แต่ทำตามแผนใน MEAF และ NA −15% ทันที",en:"Global CO₂ −4.5 Gt, but MEAF and NA on-plan −15% at once"},{co2:-4.5,comp:{MEAF:-15,NA:-15},damp:.25},{trade:1}),
  S_("D3","policy","handshake",[3,1],120,40,["D2"],0,{th:"สนธิสัญญาระดับทวีป",en:"Regional Treaties"},
    {th:"ปลดล็อกการตั้งกลุ่มพันธมิตร (ประเทศที่มิตรภาพ 50+ ตั้งแต่ 3 ประเทศในทวีปเดียวกัน)",en:"Unlocks alliances (3+ countries in one region with friendship 50+)"},{}),
];
const SKILL = Object.fromEntries(SKILLS.map(n => [n.id, n]));
const SKILL_TYPE = {passive:{th:"ติดตัวถาวร",en:"Passive"}, active:{th:"กดใช้",en:"Active"}, trade:{th:"ได้อย่างเสียอย่าง",en:"Trade-off"}, resp:{th:"รับมือภัย",en:"Disaster response"}, country:{th:"เลือกประเทศ",en:"Targets a country"}};
/* compatibility names used by the older code */
Object.assign(P, {SKILL_CATS, SKILLS, SKILL, SKILL_TYPE, NODES:SKILLS, NODE:SKILL, NODE_ICON:Object.fromEntries(SKILLS.map(n => [n.id, n.icon]))});
