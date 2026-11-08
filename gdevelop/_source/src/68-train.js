const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.train) return;
(P.mods = P.mods || {}).train = 1;
/* =========================================================================
   Screens · Training mode (same steps as the website): a real game that walks you through every part,
   one step at a time. Each step lights up one thing, says what it is, and waits until you really do it.
   Drawn on the "Train" layer (above everything, it only catches its own buttons).
   New players start here the first time they press New game; it can be replayed from the menu.
   ========================================================================= */
const {Kit, S, L, Audio, W, UIM, Screens} = P;
const k = Kit;
const T = (th, en) => ({th, en});
const BKK = [13.75, 100.5];
const ls = {get:n => { try { return localStorage.getItem(n); } catch(e){ return null; } }, set:(n, v) => { try { localStorage.setItem(n, v); } catch(e){} }};

/* where a hit box is on screen (scrolling layers are offset) */
function hitRect(id, pre){
  for (const name of ["Train", "Toast", "ModalScroll", "Modal", "DrawerScroll", "Drawer", "HUD", "MapUI"]){
    const l = k.L(name); if (!l || !l.hits) continue;
    const h = l.hits.find(q => (pre ? q.id.startsWith(id) : q.id === id)); if (h) return {x:h.x + (l.ox || 0), y:h.y + (l.oy || 0), w:h.w, h:h.h};
  }
  return null;
}
const mapRect = (pt, dy = 0, r = 30) => { if (!pt) return null; const [x, y] = P.Map.toScreen(pt[0], pt[1]); return {x:x - r, y:y + dy - r, w:2 * r, h:2 * r}; };
const ownedHaz = () => (S.haz || [])[0];
const mats = () => { if (S.mat) for (const g of P.MAT_IDS || []) S.mat[g] = Math.max(S.mat[g] || 0, 40); };

const STEPS = [
  {id:"hello", hold:1, next:T("เริ่มเลย", "Let's start"),
   text:T("ยินดีต้อนรับสู่โหมดฝึกซ้อม! นี่คือเกมจริง ทุกปุ่มกดได้จริง เราจะไปทีละขั้น และเกมจะหยุดรอคุณเสมอ (ราว 8 นาที)", "Welcome to Training! This is a real game and every button works. We'll go one step at a time and the game always waits for you (about 8 minutes).")},
  {id:"goal", hold:1, next:T("ต่อไป", "Next"), target:() => Screens._metersRect,
   text:T("เป้าหมาย: ลด [[$co2]] CO₂ สุทธิของโลก (หลอดซ้าย) ให้ถึง 0 ก่อนสิ้นปี 2050 · ระวังหลอด [[$temp]] อุณหภูมิ (ขวา) ถ้าถึง +3.0°C = แพ้", "The goal: bring the world's [[$co2]] net CO₂ (left bar) to 0 before the end of 2050 · watch the [[$temp]] warming bar (right): +3.0°C means you lose.")},
  {id:"kpis", hold:1, next:T("ต่อไป", "Next"), target:() => Screens._kpiRect,
   text:T("[[$money]] เงิน และ [[$policy]] แต้มนโยบาย เข้ามาทุกเดือน ใช้ซื้อสกิลและสั่งการ · [[$appr]] ความนิยม ห้ามเหลือ 0% ไม่อย่างนั้นจะถูกปลด", "[[$money]] Money and [[$policy]] policy points come in every month; spend them on skills and orders · never let [[$appr]] approval reach 0% or you're voted out.")},
  {id:"time", target:() => hitRect("sp1"), setup:() => { P.setSpeed(0); }, done:() => S.speed > 0,
   text:T("ตอนนี้เวลาหยุดอยู่ กดปุ่ม 1× เพื่อให้เวลาเดิน (หรือกด Space)", "Time is stopped. Press 1× to start the clock (or press Space).")},
  {id:"green", target:() => { const b = (S.bubbles || []).find(q => q.type === "green" && q.train); return b ? mapRect(P.Map.bubblePoint(b), -28, 30) : null; },
   setup:() => { S.bubbles = S.bubbles.filter(b => b.type !== "green"); S.bubbles.push({id:++S.bubId, type:"green", reg:"SEA", lat:BKK[0], lon:BKK[1], ttl:99, train:1}); P.Map.refresh(); P.Map.focus("SEA", true); if (!S.speed) P.setSpeed(1); },
   done:() => !S.bubbles.some(b => b.type === "green" && b.train),
   text:T("ฟองสีเขียว = เงินฟรี! แตะฟองเพื่อเก็บ · เก็บได้เฉพาะตอนเวลาเดินอยู่", "Green bubble = free money! Tap it to collect · bubbles can only be collected while time is running.")},
  {id:"skills", hold:1, target:() => hitRect("tab-tech"), setup:() => { P.setSpeed(0); S.ep = Math.max(S.ep, 260); S.pc = Math.max(S.pc, 60); mats(); }, done:() => UIM.modal === "skills",
   text:T("สกิลคือวิธีลด CO₂ ระยะยาว · เปิดหน้าสกิล (หรือกด T)", "Skills are how you cut CO₂ for good · open the skill tree (or press T).")},
  {id:"buy", hold:1, target:() => hitRect("buy"), setup:() => { S.skillCat = "energy"; S.node = "E1"; mats(); k.dirty(); }, done:() => !!S.owned.E1,
   text:() => ({th:`นี่คือสกิลแรก "${P.SKILL.E1.name.th}" ดูผลและราคาแล้วกด "ปลดล็อก"`, en:`This is your first skill, "${P.SKILL.E1.name.en}". Check what it does and what it costs, then press "Unlock".`})},
  {id:"skclose", hold:1, target:() => hitRect("sk-close"), done:() => UIM.modal !== "skills",
   text:T("สกิลจะทยอยให้ผลภายในไม่กี่เดือน · ทำพร้อมกันได้ 3 โครงการ · ปิดหน้าสกิล", "A skill rolls out over a few months · 3 projects can run at once · close the skill tree.")},
  {id:"hazard", target:() => hitRect("hz-", true),
   setup:() => { P.setSpeed(0); S.haz = []; P.addHazard(P.C("PHL"), "typhoon"); P.Map.focusCountry("PHL"); S.ep = Math.max(S.ep, 60); k.dirty(); },
   done:() => { const h = ownedHaz(); return !!(h && h.evac); },
   text:T("พยากรณ์ภัย! พายุไต้ฝุ่นจะถึงฟิลิปปินส์ใน 3 เดือน · แตะไอคอนบนแผนที่เพื่อสั่งอพยพ ความเสียหายจะลดลงมาก", "Disaster forecast! A typhoon will hit the Philippines in 3 months · tap its icon on the map to evacuate and cut the damage.")},
  {id:"strike", setup:() => { const h = ownedHaz(); if (h) h.at = S.tick + 1; P.setSpeed(2); }, done:() => !(S.haz || []).length,
   text:T("ดีมาก! ปล่อยเวลาให้เดิน แล้วดูพายุมาถึง… ความเสียหายจะขึ้นเป็นตัวเลขที่ประเทศนั้น", "Well done! Let time run and watch the storm arrive… the damage shows as a number on that country.")},
  {id:"red", target:() => { const b = S.bubbles.find(q => q.type === "red"); return b ? mapRect(P.Map.bubblePoint(b), -28, 30) : null; },
   setup:() => { S.bubbles.forEach(b => { if (b.type === "red") b.ttl = 99; }); if (!S.bubbles.some(b => b.type === "red")) S.bubbles.push({id:++S.bubId, type:"red", reg:"SEA", cid:"PHL", hz:"typhoon", ttl:99}); P.Map.refresh(); S.ep = Math.max(S.ep, 60); P.setSpeed(1); },
   done:() => !S.bubbles.some(b => b.type === "red"),
   text:T("หลังภัยมาถึง จะมีฟองสีแดง = ส่งความช่วยเหลือ (ใช้เงิน) ความนิยมและมิตรภาพจะเพิ่ม ถ้าปล่อยให้หมดเวลาจะเสียความนิยม · แตะฟองแดง", "After a disaster a red bubble appears = send aid (costs money); approval and friendship go up, letting it expire costs approval · tap the red bubble.")},
  {id:"country", hold:1, target:() => mapRect(P.countryPoint("THA"), 0, 34), setup:() => { P.setSpeed(0); S.tab = null; S.selC = null; P.Map.lookAt(...P.countryPoint("THA"), 1.8); k.dirty(); }, done:() => S.selC === "THA",
   text:T("แตะประเทศไทยบนแผนที่ เพื่อเปิดแผงสั่งการของประเทศ", "Tap Thailand on the map to open its orders.")},
  {id:"talk", hold:1, target:() => hitRect("ca-talk"), setup:() => { S.pc = Math.max(S.pc, 20); }, done:() => (P.C("THA").cd.talk || 0) > 0,
   text:T("[[$heart]] มิตรภาพสูง = ประเทศร่วมมือลด CO₂ และทำข้อตกลงได้ · กด \"เจรจา\"", "[[$heart]] High friendship = a country cuts CO₂ with you and can sign deals · press \"Negotiate\".")},
  {id:"event", hold:1, corner:1, setup:() => { S.tab = null; S.ep = Math.max(S.ep, 80); S.event = "EVT_47"; S.cev = null; S.used.push("EVT_47"); if (P.H.showEvent) P.H.showEvent(); k.dirty(); }, done:() => !S.event,
   text:T("เหตุการณ์! เกมหยุดรอให้คุณเลือก · ลูกศร ▲▼ บอกผลของแต่ละทาง (เขียว = ดี แดง = เสีย) · เลือก 1 ทาง", "An event! The game waits for your choice · the ▲▼ arrows show each option's effects (green = good, red = bad) · pick one.")},
  {id:"appr", hold:1, target:() => hitRect("kpi-appr"), done:() => UIM.modal === "politics" || !S.groups,
   text:T("ความนิยมมาจากคน 4 กลุ่ม · แตะช่องความนิยมเพื่อดูแต่ละกลุ่ม", "Approval comes from 4 groups of people · tap the approval box to see each group.")},
  {id:"apprclose", hold:1, target:() => hitRect("mclose"), done:() => UIM.modal !== "politics",
   text:T("แต่ละกลุ่มชอบนโยบายไม่เหมือนกัน ถ้ากลุ่มไหนไม่พอใจมากจะออกมาประท้วง · ปิดหน้าต่างนี้", "Each group likes different policies; a very angry group protests · close this window.")},
  {id:"ore", hold:1, target:() => hitRect("kpi-ore"), done:() => UIM.modal === "market" || !S.oreOn,
   text:T("[[$ore]] ทรัพยากร: สกิลพลังงานสะอาดต้องใช้แร่ · แตะเพื่อเปิดตลาด", "[[$ore]] Resources: clean-energy skills need minerals · tap to open the market.")},
  {id:"oreclose", hold:1, target:() => hitRect("mclose"), done:() => UIM.modal !== "market",
   text:T("ขาดเมื่อไรซื้อได้ เหลือก็ขายเป็นเงิน ราคาขึ้นลงทุกเดือน · ประเทศที่เป็นมิตรก็ส่งแร่ให้ · ปิดตลาด", "Short? Buy. Spare? Sell for money; prices move every month · friendly countries send minerals too · close the market.")},
  {id:"ability", hold:1, target:() => hitRect("ab-", true), done:() => Object.values(S.actCd || {}).some(v => v > 0),
   text:T("ปุ่มใต้รูปตัวละครคือสกิลพิเศษของตัวละคร · ลองกดดู (ใช้แล้วต้องรอเวลาพัก)", "The button under your portrait is your character's special skill · try it (it needs time to recharge).")},
  {id:"year", hold:1, next:T("ต่อไป", "Next"), target:() => Screens._metersRect,
   text:T("ทุกเดือนมกราคม มีสรุปผลงานปี: ถ้า CO₂ ต่ำกว่าเป้าปีนั้น = ปีที่ดี ได้งบเพิ่ม · ไม่ถึง = ปีที่แย่ ความเชื่อมั่นลด", "Every January there's a year in review: CO₂ under that year's target = a good year and more funding · over it = a bad year and less trust.")},
  {id:"done", hold:1, final:1, setup:() => { S.haz = []; S.bubbles = []; P.Map.refresh(); },
   text:T("เยี่ยมมาก! คุณพร้อมแล้ว · เคล็ดลับ: เก็บฟองเขียวบ่อย ๆ · อพยพก่อนภัยมา · ช่วยฟองแดงให้ทัน · ลงทุนสกิลพลังงานก่อน", "Great job, you're ready! Tips: collect green bubbles often · evacuate before disasters · answer red bubbles in time · invest in energy skills first.")},
];
const skippable = s => (s.id === "apprclose" && !S.groups) || (s.id === "oreclose" && !S.oreOn) || (s.id === "ability" && !P.abilityList().length);

const Train = {
  trained(){ return ls.get("p2050-trained") === "1" || !!((P.AchStore && P.AchStore.data.got) || {}).start; },
  markDone(){ ls.set("p2050-trained", "1"); if (P.AchStore){ P.AchStore.data.trained = Date.now(); P.AchStore.save(); } if (P.Ach) P.Ach.unlock("tutorial"); },
  start(){
    P.newGame(S.lang); UIM.screen = "game"; UIM.sub = null; UIM.modal = null;
    UIM.trainPending = true; Screens.goScene("Game");
  },
  /* called once the Game scene is up */
  begin(){
    UIM.trainPending = false; UIM.modal = null;
    P.startGame(S.lang, {mode:"normal", char:"sci", charLv:1, training:true});
    UIM.modal = null; UIM.train = {i:-1}; this.enter(0);
  },
  enter(i){
    const s = STEPS[i]; if (!s) return;
    UIM.train = {i, at:performance.now()};
    if (s.setup) s.setup();
    if (s.hold && S.speed) P.setSpeed(0);
    k.dirty();
  },
  next(){ const i = UIM.train.i + 1; if (i >= STEPS.length) return; Audio.play("done"); this.enter(i); },
  quit(){ UIM.train = null; this.markDone(); Screens.toMenu(); },
  finish(play){ UIM.train = null; this.markDone(); if (play) Screens.newGame(true); else Screens.toMenu(); },
  tick(){
    const tr = UIM.train; if (!tr) return;
    const s = STEPS[tr.i]; if (!s || s.final || performance.now() - tr.at < 500) return;
    if (skippable(s) || (s.done && s.done())) this.next();
  },
};
P.Train = Train;

/* the card and the spotlight */
Screens.renderTrain = function(l){
  const tr = UIM.train; if (!tr || this.kind !== "game") return;
  const s = STEPS[tr.i]; if (!s) return;
  const r = s.target ? s.target() : null;
  if (r){
    const p = 6, x0 = r.x - p, y0 = r.y - p, x1 = r.x + r.w + p, y1 = r.y + r.h + p, a = .42;
    k.rect(l, 0, 0, k.W, Math.max(0, y0), "#020609", {a}); k.rect(l, 0, y1, k.W, k.H - y1, "#020609", {a});
    k.rect(l, 0, y0, Math.max(0, x0), y1 - y0, "#020609", {a}); k.rect(l, x1, y0, k.W - x1, y1 - y0, "#020609", {a});
    k.rect(l, x0, y0, x1 - x0, y1 - y0, null, {r:10, stroke:"accent", sw:2.5});
  }
  const txt = L(typeof s.text === "function" ? s.text() : s.text), cw = 380;
  // card height
  const th = k.text(null, txt, 0, 0, {size:14, w:cw - 32, lh:1.45, measure:true}).h, ch = 44 + th + 18 + (s.next || s.final ? 48 : 26);
  let cx, cy;
  if (!r) { cx = (k.W - cw) / 2; cy = (k.H - ch) / 2; }
  else if (s.corner || r.h > 300){ cx = k.W - cw - 16; cy = k.H - ch - 16; }
  else {
    cx = Math.max(8, Math.min(k.W - cw - 8, r.x + r.w / 2 - cw / 2));
    cy = r.y + r.h / 2 < k.H / 2 ? Math.min(k.H - ch - 8, r.y + r.h + 16) : Math.max(8, r.y - ch - 16);
  }
  k.rect(l, cx + 3, cy + 8, cw, ch, "#000000", {r:14, a:.35});
  k.rect(l, cx, cy, cw, ch, "panel", {r:14, stroke:"accent", sa:.7, bg:true});
  k.hit(l, "tr-card", cx, cy, cw, ch, () => {}, {cursor:false});
  k.text(l, `[[graduation-cap]] ${L(P.UI2.trainMenu)} · ${tr.i + 1}/${STEPS.length}`, cx + 16, cy + 12, {font:"mono", size:11.5, color:"accent", iconColor:"accent"});
  if (!s.final) W.btn(l, "tr-quit", cx + cw - 16 - W.btnW(S.lang === "th" ? "ออก" : "Quit", {size:12, h:26}), cy + 8, S.lang === "th" ? "ออก" : "Quit", () => Train.quit(), {kind:"ghost", size:12, h:26});
  k.text(l, txt, cx + 16, cy + 40, {size:14, w:cw - 32, lh:1.45});
  const by = cy + 44 + th + 10;
  k.rect(l, cx + 16, by, cw - 32, 4, "panel2", {r:2}); k.rect(l, cx + 16, by, (cw - 32) * (tr.i + 1) / STEPS.length, 4, "accent", {r:2});
  if (s.next){ const lab = `${L(s.next)} [[chevron-right]]`; W.btn(l, "tr-next", cx + cw - 16 - W.btnW(lab, {size:13}), by + 12, lab, () => Train.next(), {size:13, h:32}); }
  else if (s.final){
    const pl = `${S.lang === "th" ? "เล่นเกมจริง" : "Play for real"} [[play]]`, ml = S.lang === "th" ? "กลับเมนู" : "Main menu";
    const pw = W.btnW(pl, {size:13}); W.btn(l, "tr-play", cx + cw - 16 - pw, by + 12, pl, () => Train.finish(true), {size:13, h:32});
    W.btn(l, "tr-menu", cx + cw - 16 - pw - 8 - W.btnW(ml, {size:13}), by + 12, ml, () => Train.finish(false), {kind:"ghost", size:13, h:32});
  } else k.text(l, `[[hand]] ${S.lang === "th" ? "ลองทำตามดูเลย" : "Go ahead and try it"}`, cx + 16, by + 10, {size:12, color:"muted", iconColor:"muted"});
};
