const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.v17b) return;   // ("v17" is taken by 33-supply.js, the old 1.7 plan)
(P.mods = P.mods || {}).v17b = 1;
/* =========================================================================
   Version 1.7 · A story with people in it
   · Every character has a background and their own lines in the three acts.
   · Three people from the world of the game: Mr. Krai (the fossil-fuel lobby, the one pushing back),
     Fon (a mangrove volunteer from the coast of Samut Prakan) and Uncle Thongdee (a rice farmer whose field
     the salt water reached). Short scenes appear when something happens in your game.
   · Milestones on the way to 2050: cut net CO₂ to a target by 2030, 2035, 2040 and 2045.
   · Endings: what happened to the people, a newspaper from the day the game ended, and three things you can
     do in real life, picked from the way you played.
   · The skill tree is laid out so that no arrows cross; each skill branch shows the UN SDGs it serves.
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en}), L = o => P.L(o);
const hook = (name, ...a) => (P.H && P.H[name] ? P.H[name](...a) : undefined);

/* ---------------- skill tree layout: no crossing arrows (found by search, see the 1.7 notes) ---------------- */
const POS = {
  E1:[0, 2], E2:[1, 2], E8:[1, 1], E3:[3, 1], E7:[3, 2], E4:[3, 0], E9:[4, 2], E5:[4, 1], R2:[2, 3],
  I1:[0, 1], I2:[0, 3], I5:[1, 1], I4:[1, 0], P4:[1, 2], E6:[2, 2], I3:[1, 3], N4:[3, 0], R1:[3, 1],
  N1:[0, 1], N2:[1, 0], N3:[1, 1], N6:[2, 0], A1:[2, 2], N5:[2, 1], A2:[3, 2], A3:[3, 1],
  C1:[1, 2], P5:[0, 0], C2:[2, 2], C6:[3, 0], C5:[1, 0], C3:[2, 3], C4:[3, 1], C7:[3, 2],
  P1:[0, 1], P2:[1, 0], D1:[2, 1], D4:[2, 2], P3:[2, 0], D2:[3, 1], P6:[3, 0], D3:[4, 1],
  W1:[0, 1], W2:[1, 1], W3:[1, 0], W4:[2, 2], W5:[2, 1], W6:[3, 0], W7:[3, 1], W8:[4, 0],
};
Object.entries(POS).forEach(([id, p]) => { if (P.SKILL[id]) P.SKILL[id].pos = p; });

/* ---------------- the UN Sustainable Development Goals each skill branch serves ---------------- */
P.SDG_OF = {energy:[7, 13], industry:[9, 12], nature:[15, 14], city:[11], policy:[17], water:[2, 6]};
P.SDG_NAME = {2:T("ขจัดความหิวโหย", "Zero hunger"), 6:T("น้ำสะอาด", "Clean water"), 7:T("พลังงานสะอาด", "Clean energy"), 9:T("อุตสาหกรรมและนวัตกรรม", "Industry & innovation"),
  11:T("เมืองยั่งยืน", "Sustainable cities"), 12:T("ผลิตและบริโภคอย่างยั่งยืน", "Responsible consumption"), 13:T("รับมือการเปลี่ยนแปลงสภาพภูมิอากาศ", "Climate action"),
  14:T("ทรัพยากรทางทะเล", "Life below water"), 15:T("ระบบนิเวศบนบก", "Life on land"), 17:T("ความร่วมมือเพื่อการพัฒนา", "Partnerships")};

/* ---------------- people of the story ---------------- */
P.NPC = {
  opp:{name:T("ไกรวิทย์ ศิลาทอง · ประธานสมาพันธ์พลังงานดั้งเดิม", "Krai Silathong · Legacy Energy Alliance"), color:"#ff7a4a"},
  fon:{name:T("ฝน · อาสาปลูกป่าชายเลน สมุทรปราการ", "Fon · mangrove volunteer, Samut Prakan"), color:"#5fd39a"},
  lung:{name:T("ลุงทองดี · ชาวนา ฉะเชิงเทรา", "Uncle Thongdee · rice farmer, Chachoengsao"), color:"#d9f27a"},
};
/* every character: who they are, and their own lines in the three acts */
const BIO = {
  sci:T("นักวิจัยพลังงานสะอาด เชื่อว่าทุกปัญหามีคำตอบ แต่ยังไม่เคยต้องโน้มน้าวคนทั้งโลก", "A clean-energy researcher who believes every problem has an answer, but has never had to convince the whole world"),
  dip:T("นักการทูต 20 ปี เห็นข้อตกลงโลกร้อนล้มมาแล้วสองครั้ง ครั้งนี้จะไม่ยอมให้ล้มอีก", "A diplomat for 20 years who has watched two climate deals collapse, and won't let a third"),
  eco:T("อดีตนักวิเคราะห์ของบริษัทน้ำมัน รู้ว่าเงินของโลกไหลไปทางไหน และอยากให้มันไหลกลับ", "A former oil-company analyst who knows where the world's money flows, and wants to turn it around"),
  act:T("นักศึกษาที่จัดม็อบโลกร้อนมาตั้งแต่มัธยม ไม่เคยได้เข้าห้องประชุม จนถึงวันนี้", "A student who has led climate marches since school and never got into the meeting room, until today"),
  oce:T("นักสมุทรศาสตร์ หมู่บ้านที่เธอเกิดริมทะเลสมุทรปราการถูกคลื่นกัดเซาะจนหายไปทั้งหมู่บ้าน", "An ocean scientist whose home village on the Samut Prakan coast was swallowed by the sea"),
  eng:T("วิศวกรที่สร้างกำแพงกั้นน้ำมาทั้งชีวิต รู้ดีว่ากำแพงสูงแค่ไหนก็ไม่พอ ถ้าไม่แก้ที่ต้นเหตุ", "An engineer who has built flood walls all his life, and knows no wall is high enough unless the cause is fixed"),
};
P.CHARS.forEach(c => { if (BIO[c.id]) c.bio = BIO[c.id]; });
const LINES = {
  1:{sci:T("ข้อมูลชัดเจนแล้ว เทคโนโลยีก็พร้อม ที่เหลือคือทำให้ทั้งโลกลงมือพร้อมกัน", "The data is clear and the technology is ready. What's left is getting the whole world to move at once."),
     dip:T("ฉันเห็นข้อตกลงล้มมาสองครั้ง เพราะทุกคนรอให้คนอื่นเริ่มก่อน ครั้งนี้เราจะเริ่มก่อนเอง", "I've seen two deals fail because everyone waited for someone else to go first. This time we go first."),
     eco:T("ทุกบาทที่ลงไปกับพลังงานสะอาดวันนี้ ถูกกว่าค่าซ่อมโลกในวันหน้าหลายเท่า", "Every baht spent on clean energy today is far cheaper than repairing the world tomorrow."),
     act:T("ผมเคยถือป้ายประท้วงอยู่หน้าประตูห้องนี้ วันนี้ได้เข้ามานั่งข้างใน จะไม่ทำให้คนข้างนอกผิดหวัง", "I used to hold a placard outside this door. Now I'm inside, and I won't let the people out there down."),
     oce:T("หมู่บ้านที่ฉันเกิดหายไปใต้ทะเลแล้ว ฉันไม่อยากให้ใครต้องเสียบ้านแบบนั้นอีก", "The village I was born in is under the sea now. I don't want anyone else to lose their home like that."),
     eng:T("ผมสร้างกำแพงกั้นน้ำมาทั้งชีวิต แต่กำแพงสูงแค่ไหนก็ไม่พอ ถ้าเราไม่หยุดที่ต้นเหตุ", "I've built flood walls all my life, and no wall is high enough unless we stop the cause.")},
  2:{sci:T("เขาโจมตีด้วยความกลัว เราจะตอบด้วยผลลัพธ์ที่วัดได้", "He attacks with fear. We answer with results you can measure."),
     dip:T("เสียงที่ดังที่สุดไม่ใช่เสียงส่วนใหญ่ ฉันจะคุยกับประเทศที่ยังลังเลทีละประเทศ", "The loudest voice isn't the majority. I'll talk to the undecided countries one by one."),
     eco:T("เขาบอกว่าคนจะตกงาน งั้นเราต้องสร้างงานสีเขียวให้เร็วกว่าที่งานเก่าหายไป", "He says people will lose their jobs. Then we create green jobs faster than the old ones disappear."),
     act:T("เขามีเงิน แต่เรามีคน และคนรุ่นใหม่ทั่วโลกยืนอยู่ข้างเรา", "He has money. We have people, and the young people of the world are on our side."),
     oce:T("ทะเลไม่สนว่าใครชนะการเมือง น้ำขึ้นทุกปีไม่ว่าเราจะเถียงกันแค่ไหน", "The sea doesn't care who wins the politics. It rises every year, however much we argue."),
     eng:T("เมืองที่เราสร้างให้ทนภัยต้องเสร็จก่อนพายุลูกหน้า ไม่มีเวลาให้เถียงกันแล้ว", "The cities we're hardening have to be ready before the next storm. There's no time left to argue.")},
  3:{sci:T("การทดลองครั้งใหญ่ที่สุดของมนุษย์กำลังจะรู้ผล เราต้องทำให้ถึงที่สุด", "Humanity's biggest experiment is about to give its result. We have to see it through."),
     dip:T("หกปีสุดท้าย ทุกลายเซ็นมีค่า ฉันจะไม่ปล่อยให้ใครถอนตัว", "Six years left. Every signature counts, and I won't let anyone walk away."),
     eco:T("บัญชีของโลกใกล้ปิดงวดแล้ว ทุกตันที่ลดได้ตอนนี้คุ้มที่สุด", "The world's books are about to close. Every tonne we cut now is worth the most."),
     act:T("ผมจะไม่ยอมให้คนรุ่นต่อไปต้องถามว่า ทำไมพวกเราไม่ทำอะไรเลย", "I won't let the next generation ask why we did nothing."),
     oce:T("ป่าชายเลนที่ฝนปลูกเริ่มกันคลื่นได้แล้ว อีกนิดเดียวเท่านั้น", "The mangroves Fon planted are already holding back the waves. Just a little further."),
     eng:T("โครงการสุดท้ายต้องเสร็จทันเวลา ผมจะเฝ้าหน้างานเอง", "The last projects must finish in time. I'll be on site myself.")},
};
/* the three acts: the player's lines become their own, Mr. Krai takes over the warning in act 2, Fon closes act 3 */
const A1 = P.STORY.find(a => a.act === 1), A2 = P.STORY.find(a => a.act === 2), A3 = P.STORY.find(a => a.act === 3);
if (A1){ A1.panels[2].say = LINES[1]; }
if (A2){
  A2.panels[1] = {icon:"factory", bg:"#3a1a12", who:"opp", say:T("คุณเปลี่ยนโลกเร็วเกินไป คนของผมตกงานกันทั้งเมือง ถ้าความนิยมของคุณเหลือศูนย์เมื่อไร เวทีนี้จะเป็นของผม", "You're changing the world too fast. My people are losing their jobs. The day your approval hits zero, this stage is mine.")};
  A2.panels[2].say = LINES[2];
}
if (A3){
  A3.panels[1].say = LINES[3];
  A3.panels.push({icon:"sprout", bg:"#13362b", who:"fon", say:T("ต้นโกงกางที่เราปลูกปีแรกสูงกว่าตัวฉันแล้วค่ะ อย่าเพิ่งทิ้งพวกเรานะคะ", "The mangroves we planted in the first year are taller than me now. Please don't give up on us.")});
}

/* ---------------- scenes that happen because of what you do ---------------- */
const SCENES = [
  {act:"s_fon", when:() => S.tick >= 5, panels:[
    {icon:"waves", bg:"#123a44", who:"fon", say:T("สวัสดีค่ะ ฉันชื่อฝน เป็นอาสาปลูกป่าชายเลนที่สมุทรปราการ เสาไฟฟ้าหน้าบ้านเกิดของฉัน ตอนนี้ยืนอยู่กลางทะเลแล้ว", "Hello, I'm Fon. I plant mangroves on the Samut Prakan coast. The power pole in front of the house I grew up in now stands in the sea.")},
    {icon:"school", bg:"#1b2f44", who:"fon", say:T("โรงเรียนในหมู่บ้านย้ายหนีน้ำมาแล้วสามครั้ง ถ้าโลกร้อนกว่านี้ ครั้งหน้าคงไม่มีที่ให้ย้ายแล้วค่ะ", "The village school has moved away from the water three times. If it gets any warmer, there will be nowhere left to move it.")},
    {icon:"heart-handshake", bg:"#13362b", who:"me", say:{oce:T("ฝน... หมู่บ้านนั้นคือบ้านเกิดของฉันเหมือนกัน ฉันสัญญาว่าจะไม่ลืม", "Fon... that village was my home too. I promise I won't forget."), "*":T("ฉันจะจำหมู่บ้านของคุณไว้ ทุกการตัดสินใจจากนี้คือเพื่อคนอย่างคุณ", "I'll remember your village. Every decision from now on is for people like you.")}},
  ]},
  {act:"s_opp", when:() => S.owned.P2 || S.owned.P6 || S.owned.I4 || S.regions.some(r => r.uses.tariff) || S.tick >= 72, panels:[
    {icon:"factory", bg:"#3a1a12", who:"opp", say:T("ผมไกรวิทย์ ศิลาทอง สมาชิกของสมาพันธ์เราจ้างคนทำงานหลายสิบล้านคน ทั้งเหมือง โรงไฟฟ้า และโรงกลั่น", "I'm Krai Silathong. Our alliance employs tens of millions of people in mines, power plants and refineries.")},
    {icon:"megaphone", bg:"#3a1a12", who:"opp", say:T("ถ้าคุณยังตัดถ่านหินกับน้ำมันเร็วแบบนี้ คนพวกนั้นจะตกงาน และผมจะทำให้ทุกคนรู้ว่าเป็นความผิดของใคร", "Keep cutting coal and oil this fast and those people lose their jobs. And I'll make sure everyone knows whose fault it is.")},
    {icon:"shield-alert", bg:"#2a2140", who:"adv", say:T("ระวังนะคะ เขามีเงินทุนมหาศาล ถ้าภาคอุตสาหกรรมไม่พอใจ เขาจะใช้เป็นเครื่องมือโจมตีเรา ดูความพอใจของแต่ละกลุ่มที่ช่องความนิยมด้านบน", "Be careful: he has deep pockets, and if industry turns against us he'll use it. Keep an eye on each group in the approval box at the top.")},
    {icon:"handshake", bg:"#13362b", who:"me", say:T("เราจะพาคนงานไปด้วย ไม่ทิ้งใครไว้ข้างหลัง", "We'll bring the workers with us. Nobody gets left behind.")},
  ]},
  {act:"s_sanct", when:() => Object.values(S.sanct || {}).some(v => v > 0), vars:() => ({C:P.joinNames(Object.keys(S.sanct).filter(k => S.sanct[k] > 0).slice(0, 2))}), panels:[
    {icon:"ban", bg:"#3a1a1a", who:"adv", say:T("{C} คว่ำบาตรการค้ากับเราแล้วค่ะ เราจะเสียเงินทุกเดือน และไม่ได้ทรัพยากรจากที่นั่น", "{C} has put sanctions on us. We lose money every month and get no resources from there.")},
    {icon:"factory", bg:"#3a1a12", who:"opp", say:T("เห็นไหม ผมบอกแล้วว่าโลกไม่ได้อยากเดินตามคุณ", "See? I told you the world doesn't want to follow you.")},
    {icon:"message-circle", bg:"#2a2140", who:"adv", say:T("เจรจาหรือส่งทุนให้ประเทศที่โกรธเรา ให้มิตรภาพกลับมาสูงกว่า −30 แล้วเขาจะกลับมาร่วมมือค่ะ", "Negotiate with or fund the countries that are angry with us. Once friendship is back above −30, they'll cooperate again.")},
  ]},
  {act:"s_protest", when:() => (S.stats.protests || 0) > 0, vars:() => ({G:L(P.GROUP[S.lastProtest || "city"].name)}), panels:[
    {icon:"megaphone", bg:"#3a1a1a", who:"adv", say:T("{G}ออกมาประท้วงแล้วค่ะ", "{G} are out protesting.")},
    {icon:"users", bg:"#2b2a16", who:() => ({farm:"lung", ind:"opp"})[S.lastProtest] || "fon",
     say:() => ({farm:T("นโยบายของคุณดีกับโลก แต่ใครจะดูแลชาวนาอย่างผม ปุ๋ยก็แพง ที่นาก็โดนน้ำเค็ม", "Your policies are good for the planet, but who looks after farmers like me? Fertiliser is dearer and the salt water is in my field."),
       ind:T("คนงานหลายพันคนอยู่หน้าทำเนียบแล้ว นี่แค่เริ่มต้นเท่านั้น", "Thousands of workers are outside your office. This is only the beginning."),
       city:T("ค่าไฟกับค่ารถแพงขึ้น คนในเมืองที่ไม่ได้รวยก็เหนื่อยเหมือนกันนะคะ", "Power bills and bus fares keep rising. City people who aren't rich are struggling too."),
       youth:T("คนรุ่นฉันรอไม่ไหวแล้วค่ะ เราอยากเห็นการเปลี่ยนแปลงที่เร็วกว่านี้", "My generation can't wait any longer. We want change, faster.")})[S.lastProtest || "city"]},
    {icon:"smile", bg:"#2a2140", who:"adv", say:T("แตะช่องความนิยมด้านบน ดูว่ากลุ่มนี้ชอบอะไร แล้วเลือกนโยบายที่ช่วยเขาบ้างค่ะ", "Tap the approval box at the top, see what this group likes, and pick some policies that help them.")},
  ]},
  {act:"s_heat", when:() => S.temp >= 1.5, panels:[
    {icon:"wheat", bg:"#2b2a16", who:"lung", say:T("ผมทองดี ทำนาที่ฉะเชิงเทรามาสี่สิบปี ปีนี้น้ำเค็มขึ้นมาถึงนาผมเป็นครั้งแรก ข้าวตายทั้งแปลง", "I'm Thongdee. I've farmed rice in Chachoengsao for forty years. This year the salt water reached my field for the first time, and the whole crop died.")},
    {icon:"sprout", bg:"#2b2a16", who:"lung", say:T("ลูกชายบอกให้เลิกทำนาไปทำโรงงาน แต่ถ้าทุกคนเลิก แล้วใครจะปลูกข้าวให้คนกิน", "My son says I should quit and work in a factory. But if everyone quits, who grows the rice?")},
    {icon:"thermometer", bg:"#3b2412", who:"adv", say:T("โลกร้อนเกิน 1.5°C แล้วค่ะ จากนี้ภัยจะมาถี่และแรงขึ้น สกิลหมวดอาหารและน้ำช่วยคนอย่างลุงทองดีได้", "We've passed +1.5°C. Disasters will now come more often and hit harder. The Food & Water skills can help people like Uncle Thongdee.")},
  ]},
  {act:"s_half", when:() => P.netCO2() <= 18, panels:[
    {icon:"trees", bg:"#13362b", who:"fon", say:T("ป่าชายเลนที่เราปลูกเริ่มกันคลื่นได้แล้วค่ะ ปีนี้น้ำไม่ท่วมหมู่บ้านเลยสักครั้ง", "The mangroves we planted are holding back the waves. Not one flood in the village this year.")},
    {icon:"factory", bg:"#3a1a12", who:"opp", say:T("อย่าเพิ่งดีใจ ตันสุดท้ายแพงที่สุดเสมอ", "Don't celebrate yet. The last tonnes are always the most expensive.")},
    {icon:"flag", bg:"#1d2a44", who:"me", say:T("ครึ่งทางแล้ว อีกครึ่งยากกว่า แต่เราจะไม่หยุด", "Halfway there. The other half is harder, but we won't stop.")},
  ]},
  {act:"s_ally", when:() => Object.keys(S.alli || {}).length > 0, vars:() => ({R:L(P.RMETA[Object.keys(S.alli)[0]].name)}), panels:[
    {icon:"handshake", bg:"#143029", who:"adv", say:T("พันธมิตรภูมิอากาศกลุ่มแรกเกิดขึ้นแล้วค่ะ ประเทศใน{R}จะลดก๊าซไปด้วยกัน", "The first climate alliance is born: the countries of {R} will cut together.")},
    {icon:"factory", bg:"#3a1a12", who:"opp", say:T("พันธมิตรแตกง่ายกว่าที่คุณคิด รอดูเถอะ", "Alliances break more easily than you think. Just wait.")},
  ]},
];
SCENES.forEach(sc => { if (!P.STORY.some(a => a.act === sc.act)) P.STORY.push({act:sc.act, at:-1, scene:1, title:T("", ""), panels:sc.panels}); });
const SC_TITLE = {s_fon:T("เสียงจากชายฝั่ง", "A voice from the coast"), s_opp:T("ฝ่ายต้าน", "The pushback"), s_sanct:T("ถูกคว่ำบาตร", "Sanctions"), s_protest:T("เสียงประท้วง", "Protest"),
  s_heat:T("เกิน 1.5°C", "Past 1.5°C"), s_half:T("ครึ่งทาง", "Halfway"), s_ally:T("พันธมิตรกลุ่มแรก", "The first alliance")};
P.STORY.forEach(a => { if (SC_TITLE[a.act]) a.title = SC_TITLE[a.act]; });
/* what a panel says / who says it, for this game (lines can depend on the character or on what happened) */
P.panelSay = p => { let s = typeof p.say === "function" ? p.say() : p.say; if (s && !s.th && (s[S.char] || s["*"])) s = s[S.char] || s["*"]; const v = S.sceneVars || {}; return {th:(s.th || "").replace(/\{(\w)\}/g, (m, k) => v[k] ?? m), en:(s.en || "").replace(/\{(\w)\}/g, (m, k) => v[k] ?? m)}; };
P.panelWho = p => (typeof p.who === "function" ? p.who() : p.who);

/* one scene at a time, never in the same month as a new disaster forecast, a story act or an event, and at least 4 months apart */
function sceneTick(){
  if (S.over || S.event || S.world) return;
  if ((P.UIM && P.UIM.modal) || S.haz.some(h => h.at === S.tick + P.FORECAST)) return;
  if (S.tick - (S.lastScene ?? -99) < 4) return;
  const sc = SCENES.find(x => !S.story[x.act] && x.when()); if (!sc) return;
  S.story[sc.act] = 1; S.lastScene = S.tick; S.sceneVars = sc.vars ? sc.vars() : {};
  hook("story", sc.act);
}

/* ---------------- milestones: net CO₂ targets on the way to 2050 ---------------- */
const MS = [{y:2030, tk:60, v:32}, {y:2035, tk:120, v:28}, {y:2040, tk:180, v:22}, {y:2045, tk:240, v:13}];
const MS_REWARD = {ep:25, pc:6};
P.MILESTONES = MS; P.MS_REWARD = MS_REWARD;
function milestoneTick(){
  if (S.world || S.over) return;
  S.ms17 = S.ms17 || {};
  MS.forEach((m, i) => {
    if (S.ms17[i] !== undefined || S.tick < m.tk) return;
    const net = P.netCO2(), hit = net <= m.v;
    S.ms17[i] = hit ? 1 : 0;
    if (hit){ S.ep += MS_REWARD.ep; S.pc += MS_REWARD.pc; if (P.ledgerTag) P.ledgerTag("event", MS_REWARD.ep, MS_REWARD.pc); }
    P.addLog(`[[${hit ? "flag" : "flag-off"}]] ${L(T("เป้าหมายปี", "Target for"))} ${m.y}: CO₂ ≤ ${m.v} Gt · ${L(T("ตอนนี้", "now"))} ${net.toFixed(1)} Gt · ${hit ? L(T("ผ่าน", "reached")) + ` · ${P.IC.ep} +${MS_REWARD.ep} ${P.IC.pc} +${MS_REWARD.pc}` : L(T("ไม่ผ่าน", "missed"))}`, hit ? "gd" : "al");
    hook("toast", {id:"ms" + i, icon:hit ? "flag" : "flag-off", title:`${L(T("เป้าหมายปี", "Target"))} ${m.y}`, msg:hit ? L(T("ผ่านแล้ว! ได้เงินและแต้มนโยบาย", "Reached! Money and policy points")) : `${L(T("ไม่ผ่าน", "Missed"))} · ${net.toFixed(1)} / ${m.v} Gt`});
    hook("sfx", hit ? "done" : "miss");
  });
}
const _tick = P.tick;
P.tick = () => { _tick(); if (S.regions && S.started && !S.over){ milestoneTick(); sceneTick(); } };

/* ---------------- endings: the people, a newspaper, and what you can do in real life ---------------- */
const QUOTE = {
  win:{sci:T("วิทยาศาสตร์บอกว่าเป็นไปได้ และวันนี้เราพิสูจน์แล้ว", "Science said it could be done. Today we proved it."),
       dip:T("ไม่มีประเทศไหนทำได้คนเดียว และวันนี้ไม่มีใครต้องทำคนเดียว", "No country could do it alone, and today none of them had to."),
       eco:T("โลกที่ไม่เผาอนาคตเป็นเชื้อเพลิง คือการลงทุนที่ดีที่สุดที่เคยมีมา", "A world that stopped burning its future is the best investment ever made."),
       act:T("เราเคยตะโกนอยู่ข้างนอก วันนี้เราเปลี่ยนโลกจากข้างใน", "We used to shout from outside. Today we changed the world from within."),
       oce:T("ทะเลยังจำทุกอย่างได้ แต่วันนี้ทะเลเริ่มให้อภัยเราแล้ว", "The sea remembers everything, but today it began to forgive us."),
       eng:T("สิ่งที่เราสร้างจะอยู่ปกป้องคนไปอีกร้อยปี", "What we built will protect people for a hundred years.")},
  l1:{sci:T("ข้อมูลเตือนเราตั้งแต่แรก เราแค่ฟังช้าเกินไป", "The data warned us from the start. We just listened too late."),
      dip:T("เราคุยกันนานเกินไป จนไม่เหลือเวลาให้ลงมือ", "We talked too long and left no time to act."),
      eco:T("ราคาของการรอคอย แพงกว่าทุกโครงการที่เราไม่ได้ทำ", "The price of waiting was higher than every project we skipped."),
      act:T("ขอให้คนรุ่นต่อไปเรียนรู้จากความผิดพลาดของเรา", "May the next generation learn from our mistakes."),
      oce:T("ทะเลขึ้นมาถึงเมืองแล้ว และจะไม่ถอยกลับไปอีก", "The sea has reached the cities, and it won't go back."),
      eng:T("ไม่มีกำแพงไหนสูงพอสำหรับโลกที่ร้อนขนาดนี้", "No wall is high enough for a world this hot.")},
  l2:{sci:T("ความจริงอย่างเดียวไม่พอ ถ้าคนไม่เชื่อใจคนที่พูด", "The truth isn't enough if people don't trust the one telling it."),
      dip:T("ฉันได้ใจโลก แต่เสียใจคนที่บ้าน", "I won the world's trust and lost the trust at home."),
      eco:T("เราลืมคิดว่าใครต้องจ่าย และเขาไม่ยอมจ่ายอีกแล้ว", "We forgot to ask who would pay, and they refused."),
      act:T("ถ้าประชาชนไม่เชื่อมั่น นโยบายที่ดีที่สุดก็ไปต่อไม่ได้", "Without the people's trust, even the best policy goes nowhere."),
      oce:T("ฉันเห็นทะเลชัดเจน แต่มองไม่เห็นคนที่อยู่ข้างหลังฉัน", "I saw the sea so clearly that I missed the people behind me."),
      eng:T("ผมสร้างของได้ แต่สร้างความเชื่อใจไม่ทัน", "I could build things, but not trust, not fast enough.")},
  l3:{sci:T("ใกล้มากแล้ว ครั้งหน้าเราต้องเริ่มเร็วกว่านี้", "So close. Next time we have to start sooner."),
      dip:T("อีกไม่กี่ลายเซ็นเท่านั้น ครั้งหน้าฉันจะไม่รอ", "Just a few signatures short. Next time I won't wait."),
      eco:T("เราลงทุนถูกทาง แต่ช้าไปไม่กี่ปี", "We invested in the right things, just a few years too late."),
      act:T("เกือบแล้ว แต่ 'เกือบ' ยังไม่พอสำหรับโลก", "Almost. But 'almost' isn't enough for the planet."),
      oce:T("ทะเลให้เวลาเรามากกว่านี้ไม่ได้แล้ว", "The sea can't give us any more time."),
      eng:T("โครงการสุดท้ายเสร็จไม่ทันวันสุดท้าย", "The last projects didn't finish before the last day.")},
};
P.endQuote = () => { const q = QUOTE[S.over] || QUOTE.l3; return q[S.char] || q.sci; };
const HEAD = {
  winS:T("โลกถึง Net Zero ขณะยังร้อนไม่ถึง 1.6°C คนรุ่นใหม่ได้โลกที่น่าอยู่คืนมา", "The world reaches Net Zero below 1.6°C: the next generation gets a liveable planet back"),
  winA:T("Net Zero ทันเวลา! โลกเริ่มต้นยุคหลังคาร์บอน", "Net Zero in time! The post-carbon age begins"),
  winB:T("Net Zero แบบเฉียดฉิว ภารกิจต่อไปคือช่วยทุกประเทศปรับตัว", "A narrow Net Zero: the next mission is helping every country adapt"),
  l1:T("โลกร้อนทะลุ 3°C ระบบธรรมชาติพังทลาย", "Warming breaks 3°C: Earth's systems collapse"),
  l2:T("ผู้อำนวยการ GCT ถูกถอดถอน สมาพันธ์พลังงานดั้งเดิมเข้าคุมนโยบาย", "GCT director removed: the Legacy Energy Alliance takes control"),
  l3:T("ปี 2051 มาถึง แต่โลกยังไปไม่ถึง Net Zero", "2051 arrives, and the world is still short of Net Zero"),
};
/* the newspaper: a headline and what happened to the three people */
P.endPaper = () => {
  const o = S.over, win = o === "win", key = win ? "win" + (S.grade || "A") : o;
  const salt = S.owned.W5 || S.owned.C4;
  const people = [
    {who:"fon", t:win ? T("ป่าชายเลนที่สมุทรปราการกลับมากันคลื่นได้ โรงเรียนในหมู่บ้านของฝนไม่ต้องย้ายอีกแล้ว", "The Samut Prakan mangroves hold back the sea again; the school in Fon's village never has to move again")
      : o === "l2" ? T("โครงการปลูกป่าชายเลนถูกตัดงบ ฝนและเพื่อนอาสายังปลูกต่อด้วยเงินของตัวเอง", "The mangrove programme loses its funding; Fon and her friends keep planting with their own money")
      : T("หมู่บ้านชายฝั่งของฝนต้องย้ายเป็นครั้งที่สี่ คราวนี้ทั้งหมู่บ้าน", "Fon's coastal village has to move for the fourth time, all of it this time")},
    {who:"lung", t:salt ? T("ลุงทองดีกลับมาทำนาได้ ด้วยข้าวทนเค็มและประตูกั้นน้ำเค็ม", "Uncle Thongdee farms again, with salt-tolerant rice and saltwater barriers")
      : win ? T("น้ำเค็มหยุดรุกเข้ามา ลุงทองดีสอนหลานทำนาในแปลงเดิม", "The salt water stops spreading; Uncle Thongdee teaches his grandchildren to farm the old field")
      : T("นาของลุงทองดีกลายเป็นบ่อน้ำเค็ม ลูกชายพาไปอยู่ในเมือง", "Uncle Thongdee's field has turned into a saltwater pond; his son takes him to live in the city")},
    {who:"opp", t:win ? T("ไกรวิทย์ประกาศเปลี่ยนบริษัทในเครือเป็นพลังงานสะอาด \"ตลาดเปลี่ยนแล้ว\"", "Krai announces his companies are switching to clean energy: \"the market has moved\"")
      : o === "l2" ? T("ไกรวิทย์ขึ้นเป็นผู้นำนโยบายพลังงานโลกคนใหม่", "Krai becomes the new head of world energy policy")
      : T("ไกรวิทย์ยังขายถ่านหินต่อไป และบอกว่าตัวเองเตือนแล้ว", "Krai keeps selling coal, and says he warned everyone")},
  ];
  return {head:HEAD[key] || HEAD.l3, people, date:P.dateStr()};
};
/* three things you can do in real life, from the branches you used most */
const ACTS = {
  energy:{icon:"plug-zap", t:T("ปิดไฟและถอดปลั๊กเมื่อไม่ใช้ ตั้งแอร์ 26°C ขึ้นไป และเลือกเครื่องใช้ไฟฟ้าประหยัดไฟเบอร์ 5", "Switch off and unplug what you don't use, set air-con to 26°C or more, and choose energy-saving appliances")},
  industry:{icon:"bike", t:T("เดิน ปั่นจักรยาน หรือใช้ขนส่งสาธารณะ ซ่อมของก่อนซื้อใหม่ และแยกขยะรีไซเคิล", "Walk, cycle or take public transport, repair before you replace, and sort your recycling")},
  nature:{icon:"trees", t:T("ร่วมปลูกต้นไม้หรือป่าชายเลนในชุมชน และดูแลต้นไม้ที่ปลูกไว้ให้โต", "Join a tree or mangrove planting in your community, and look after what you plant")},
  city:{icon:"siren", t:T("รู้จักเส้นทางอพยพและจุดปลอดภัยใกล้บ้าน เตรียมกระเป๋าฉุกเฉินไว้ให้พร้อม", "Know the evacuation routes and safe places near home, and keep an emergency bag ready")},
  policy:{icon:"message-circle", t:T("ชวนครอบครัวและเพื่อนคุยเรื่องโลกร้อน ติดตามข่าวจากแหล่งที่เชื่อถือได้", "Talk about climate change with family and friends, and follow news from trustworthy sources")},
  water:{icon:"utensils", t:T("ตักอาหารแต่พอกิน กินให้หมดจาน และใช้น้ำอย่างประหยัด", "Take only the food you will eat, finish your plate, and save water")},
};
P.realActions = () => {
  const cnt = {}; P.SKILL_CATS.forEach(c => { cnt[c.id] = P.SKILLS.filter(n => n.cat === c.id && S.owned[n.id]).length; });
  return Object.keys(ACTS).sort((a, b) => cnt[b] - cnt[a] || Object.keys(ACTS).indexOf(a) - Object.keys(ACTS).indexOf(b)).slice(0, 3).map(k => ACTS[k]);
};

/* ---------------- a short real recording when a skill is approved ---------------- */
P.SKILL_SND = {
  E1:"hum", E2:"wind", E8:"boil", E3:"hum", E7:"river", E4:"lab", E9:"clock", E5:"space", R2:"construction",
  I1:"factory", I2:"train", I5:"factory", I4:"construction", P4:"street", E6:"boil", I3:"air", N4:"hum", R1:"factory",
  N1:"forest", N2:"gulls", N3:"farm", N6:"underwater", A1:"farm", N5:"campfire", A2:"lab", A3:"bees",
  C1:"radio", P5:"construction", C2:"rain", C6:"siren", C5:"birds", C3:"office", C4:"ocean", C7:"city",
  P1:"crowd", P2:"office", D1:"market", D4:"market", P3:"harbor", D2:"keyboard", P6:"crowd", D3:"chimes",
  W1:"river", W2:"market", W3:"river", W4:"bees", W5:"farm", W6:"ocean", W7:"crowd", W8:"lab",
};

/* ---------------- How to play (new pictures and text for 1.7) ---------------- */
const TU = (img, th, en, bth, ben) => ({img, title:T(th, en), body:{th:bth, en:ben}});
P.TUT.splice(0, P.TUT.length,
  TU("n01-goal.jpg", "เป้าหมายของเกม", "Your goal",
    ["ท่านนำคณะทำงานภูมิอากาศโลก (GCT) เริ่มเดือนมกราคม 2026", "ทำให้ [[$co2]] CO₂ สุทธิของโลกเหลือ 0 ก่อนสิ้นปี 2050", "CO₂ สุทธิ = ที่ปล่อยทั้งหมด − ที่ป่าและเทคโนโลยีดูดกลับ · 1 เดือนในเกมผ่านไปทุกไม่กี่วินาที"],
    ["You lead the Global Climate Taskforce (GCT), starting January 2026", "Bring the world's [[$co2]] net CO₂ down to 0 before the end of 2050", "Net CO₂ = everything emitted − what forests and technology take back · a game month passes every few seconds"]),
  TU("n02-meters.jpg", "หลอดชนะ หลอดแพ้ และเป้าหมายรายทาง", "Win and lose meters, milestones",
    ["[[flag]] หลอด Net Zero: จุดยิ่งเข้าใกล้ถ้วย [[trophy]] ยิ่งใกล้ชนะ", "ขีดบนหลอดคือเป้าหมายปี 2030 2035 2040 2045 ผ่านแล้วได้ [[$money]] และ [[$policy]] เพิ่ม", "[[$temp]] หลอดอุณหภูมิ: ถึง +3.0°C = แพ้ ยิ่งร้อนภัยยิ่งถี่"],
    ["[[flag]] Net Zero meter: the closer the dot is to the [[trophy]], the closer you are to winning", "The marks are the 2030, 2035, 2040 and 2045 targets; reach one for extra [[$money]] and [[$policy]]", "[[$temp]] Temperature: +3.0°C means game over; the hotter, the more disasters"]),
  TU("n03-top.jpg", "ค่าด้านบนและตัวละคร", "The top bar and your character",
    ["[[$money]] เงิน และ [[$policy]] แต้มนโยบาย เข้ามาทุกเดือน ใช้ซื้อสกิลและสั่งการ", "[[$ore]] ทรัพยากร: แตะเพื่อเปิดตลาด · [[$appr]] ความนิยม: มาจากคน 4 กลุ่ม แตะเพื่อดู ถ้าเหลือ 0% จะถูกถอดถอน", "ซ้ายบนคือตัวละคร ปุ่มใต้รูปคือสกิลพิเศษ (มีเวลาพัก)"],
    ["[[$money]] Money and [[$policy]] policy points come in every month and pay for skills and orders", "[[$ore]] Resources: tap to open the market · [[$appr]] Approval comes from 4 groups (tap to see); at 0% you're removed", "Top left is your character; the buttons under the portrait are special skills with cooldowns"]),
  TU("n04-map.jpg", "แผนที่ ประเทศ และมิตรภาพ", "Map, countries and friendship",
    ["แตะทวีปเพื่อซูม แตะประเทศเพื่อเปิดแผงสั่งการ · [[$heart]] มิตรภาพสูง = ร่วมมือดี ทำข้อตกลงได้", "ไอคอนบนประเทศบอกสถานะ: [[ban]] คว่ำบาตรเรา · [[angry]] ไม่ร่วมมือ · [[handshake]] พันธมิตร", "[[star]] เมืองหลวง · [[factory]] ย่านอุตสาหกรรม (ควันหยุดเมื่อสะอาด) · [[plane]] [[ship]] พาเทคโนโลยีสีเขียว [[leaf]] ไปประเทศอื่น"],
    ["Tap a continent to zoom, a country to give orders · [[$heart]] high friendship = cooperation and deals", "Icons on a country show its state: [[ban]] sanctioning us · [[angry]] not cooperating · [[handshake]] ally", "[[star]] capitals · [[factory]] industrial hubs (smoke stops when clean) · [[plane]] [[ship]] carry green tech [[leaf]] abroad"]),
  TU("n05-bubbles.jpg", "ภัยพิบัติและฟอง", "Disasters and bubbles",
    ["[[cloud-lightning]] ไอคอนกะพริบ = พยากรณ์ภัย แตะเพื่อสั่งอพยพก่อนภัยมาถึง", "[[$money]] ฟองเขียว = เงินฟรี · [[$heart]] ฟองแดง = ส่งความช่วยเหลือ · [[$ore]] ฟองส้ม = ทรัพยากร", "เก็บฟองได้เฉพาะตอนเวลาเดินอยู่ ถ้าหยุดเกม ฟองจะจางลง"],
    ["[[cloud-lightning]] A pulsing icon = a disaster forecast; tap it to evacuate in time", "[[$money]] Green bubble = free money · [[$heart]] red = send aid · [[$ore]] orange = resources", "Bubbles can only be collected while time is running; paused, they fade"]),
  TU("n06-skills.jpg", "สกิล", "Skills",
    ["50 สกิลใน 6 หมวด เปิดด้วยปุ่ม \"สกิล\" หรือกด T เกมหยุดระหว่างเลือก", "แต่ละหมวดบอกเป้าหมาย SDG ที่เกี่ยวข้อง เห็นเฉพาะสกิลถัดไป ที่ไกลกว่านั้นเป็น ???", "ทยอยผลพร้อมกันได้ 3 โครงการ ซื้อถี่เกินไปจะเจอเงินเฟ้อสีเขียว"],
    ["50 skills in 6 branches; open with \"Skills\" or press T (the game pauses)", "Each branch shows the SDGs it serves; you only see the next skills, further ones are ???", "3 projects roll out at once; buying too fast causes Greenflation"]),
  TU("n07-market.jpg", "ทรัพยากรและตลาด", "Resources and the market",
    ["[[$ore]] สกิลพลังงานสะอาดใช้ทรัพยากร 5 กลุ่ม เช่น แร่แบตเตอรี่ แร่หายาก ทองแดง", "ที่ได้มาบางส่วนเป็นแร่ดิบ ต้องรอแปรรูป สร้าง [[factory]] โรงแยกแร่เพื่อแปรรูปเร็วขึ้น", "ขาดเมื่อไรซื้อในตลาดได้ เหลือก็ขายเป็นเงิน ราคาขึ้นลงทุกเดือน"],
    ["[[$ore]] Clean-energy skills use 5 resource groups, such as battery minerals, rare earths and copper", "Some arrive raw and must be refined; build a [[factory]] refinery to refine faster", "Short? Buy in the market. Spare? Sell for money. Prices move every month"]),
  TU("n08-event.jpg", "เหตุการณ์และการตัดสินใจ", "Events and decisions",
    ["เกมหยุดรอให้เลือก ปุ่มจะกดได้เมื่อแถบเต็ม (กันกดพลาด)", "▲▼ = ค่านั้นขึ้นหรือลง สีเขียวดี สีแดงเสีย · ไอคอนกลุ่มบอกว่าคนกลุ่มไหนชอบหรือไม่ชอบ", "ข้อพิพาทระหว่างประเทศ: ฝ่ายที่เราเลือกจะชอบเรา อีกฝ่ายจะไม่พอใจ"],
    ["The game waits for your choice; the buttons unlock when the bar fills", "▲▼ = a value goes up or down, green good, red bad · group icons show who likes or dislikes it", "International disputes: the side you back likes you more, the other side less"]),
  TU("n09-story.jpg", "เรื่องราวและผู้คน", "The story and its people",
    ["เรื่องเดินเป็น 3 องก์ และมีฉากสั้นตามสิ่งที่เกิดในเกมของคุณ", "ฝน (ชายฝั่งสมุทรปราการ) และลุงทองดี (ชาวนาฉะเชิงเทรา) คือคนที่ได้รับผลกระทบ ส่วนไกรวิทย์คือฝ่ายต้าน", "ตอนจบจะบอกว่าชีวิตของพวกเขาเป็นอย่างไร ตามสิ่งที่คุณทำ"],
    ["The story runs in 3 acts, with short scenes when things happen in your game", "Fon (Samut Prakan coast) and Uncle Thongdee (a Chachoengsao rice farmer) live with the impacts; Krai pushes back", "The ending tells you what became of them, based on what you did"]),
  TU("n10-win.jpg", "วิธีชนะและแพ้", "How to win or lose",
    ["ชนะ: CO₂ สุทธิถึง 0 ก่อนปี 2051 (เกรด S/A/B ตามอุณหภูมิ)", "แพ้: อุณหภูมิถึง +3.0°C, ความนิยมเหลือ 0% หรือหมดเวลา", "ชนะครั้งแรกเปิดโหมดโลกต่อเนื่องและ Hard Core · เข้าสู่ระบบเพื่อรับเพชรและติดอันดับ"],
    ["Win: net CO₂ reaches 0 before 2051 (grade S/A/B by temperature)", "Lose: +3.0°C, 0% approval, or running out of time", "Your first win opens Continuous World and Hard Core · sign in to earn Gems and get ranked"]),
);
