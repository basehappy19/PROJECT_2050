/* 2.0: Training mode — a real game that walks you through every part, one step at a time.
   Each step shines a light on one thing, says what it is, and waits until you really do it.
   The first time a new player presses Play, this runs first (G.newGame); it can be replayed any time from the menu. */
import {useEffect, useState} from "preact/hooks";
import {P, S, UIM, L, bump, ls} from "../core.js";
import {Audio} from "../audio.js";
import {GameMap} from "../map2d.js";
import {Icon, Rich} from "./icon.jsx";
import {Btn} from "./widgets.jsx";
import {ll} from "../geo.js";

const T = (th, en) => ({th, en});
const $ = sel => document.querySelector(sel);
const rectOf = el => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width || r.height ? {x:r.left, y:r.top, w:r.width, h:r.height} : null; };
const mapRect = (pt, dy = 0, r = 30) => { if (!pt || !GameMap.active) return null; const [x, y] = GameMap.toViewport(pt[0], pt[1]); return {x:x - r, y:y + dy - r, w:2 * r, h:2 * r}; };
const BKK = [13.75, 100.5];
const hitRect = pre => { const h = GameMap.hits.find(q => q.id.startsWith(pre)); return h ? {x:h.x - 6, y:h.y - 6, w:h.w + 12, h:h.h + 12} : null; };   // hit boxes are screen pixels (3.2: the overlay is flat)
const ownedHaz = () => (S.haz || [])[0];
const st = () => UIM.train;

/* ---------------- the steps ----------------
   text · target() → a rectangle to light up · hold: the clock stays stopped · setup(): runs once when the step starts
   done(): the step finishes by itself when this turns true · next: a button instead (label) */
export const STEPS = [
  {id:"hello", hold:1, next:T("เริ่มเลย", "Let's start"),
   text:T("ยินดีต้อนรับสู่โหมดฝึกซ้อม! นี่คือเกมจริง ทุกปุ่มกดได้จริง เราจะไปทีละขั้น และเกมจะหยุดรอคุณเสมอ (ราว 8 นาที)", "Welcome to training! This is a real game and every button really works. We'll go one step at a time, and the game always waits for you (about 8 minutes).")},
  {id:"goal", hold:1, next:T("ต่อไป", "Next"), target:() => rectOf($(".meters")),
   text:T("เป้าหมาย: ลด [[$co2]] CO₂ สุทธิของโลก (หลอดซ้าย) ให้ถึง 0 ก่อนสิ้นปี 2050 · ระวังหลอด [[$temp]] อุณหภูมิ (ขวา) ถ้าถึง +3.0°C = แพ้", "The goal: bring the world's [[$co2]] net CO₂ (left bar) to 0 before the end of 2050 · watch the [[$temp]] temperature (right): +3.0°C means game over.")},
  {id:"kpis", hold:1, next:T("ต่อไป", "Next"), target:() => rectOf($(".kpis")),
   text:T("[[$money]] เงิน และ [[$policy]] แต้มนโยบาย เข้ามาทุกเดือน ใช้ซื้อสกิลและสั่งการ · [[$appr]] ความนิยม ห้ามเหลือ 0% ไม่อย่างนั้นจะถูกปลด", "[[$money]] Money and [[$policy]] policy points arrive every month and pay for skills and orders · [[$appr]] approval must never reach 0% or you're removed.")},
  {id:"time", target:() => rectOf($(".ctrls .speed")), setup:() => { S.speed = 0; }, done:() => S.speed > 0,
   text:T("ตอนนี้เวลาหยุดอยู่ กดปุ่ม 1× เพื่อให้เวลาเดิน (หรือกด Space)", "Time is stopped. Press 1× to start the clock (or press Space).")},
  {id:"green", target:() => mapRect(ll(BKK[0], BKK[1]), -22, 30),
   setup:() => { S.bubbles = S.bubbles.filter(b => b.type !== "green"); S.bubbles.push({id:++S.bubId, type:"green", reg:"SEA", lat:BKK[0], lon:BKK[1], ttl:99}); GameMap.focus("SEA", true); if (!S.speed) P.setSpeed(1); },
   done:() => !S.bubbles.some(b => b.type === "green"),
   text:T("ฟองสีเขียว = เงินฟรี! แตะฟองเพื่อเก็บ · เก็บได้เฉพาะตอนเวลาเดินอยู่", "Green bubble = free money! Tap it to collect · bubbles can only be collected while time is running.")},
  {id:"skills", hold:1, target:() => rectOf($("[data-tab=tech]")), setup:() => { P.setSpeed(0); S.ep = Math.max(S.ep, 260); S.pc = Math.max(S.pc, 60); }, done:() => UIM.modal === "skills",
   text:T("สกิลคือวิธีลด CO₂ ระยะยาว · เปิดหน้าสกิล (หรือกด T)", "Skills are how you cut CO₂ for good · open the skill tree (or press T).")},
  {id:"buy", hold:1, target:() => rectOf($(".sk-detail .btn-lg")), setup:() => { S.skillCat = "energy"; S.node = "E1"; bump(); }, done:() => !!S.owned.E1,
   text:() => ({th:`นี่คือสกิลแรก "${P.SKILL.E1.name.th}" ดูผลและราคาแล้วกด "อนุมัติ"`, en:`This is your first skill, "${P.SKILL.E1.name.en}". Check what it does and what it costs, then press "Approve".`})},
  {id:"skclose", hold:1, target:() => rectOf($(".skclose")), done:() => UIM.modal !== "skills",
   text:T("สกิลจะทยอยให้ผลภายในไม่กี่เดือน · ทำพร้อมกันได้ 3 โครงการ · ปิดหน้าสกิล", "A skill rolls out over a few months · 3 projects can run at once · close the skill tree.")},
  {id:"hazard", target:() => hitRect("hz-") || rectOf($(".hzalert")),
   setup:() => { P.setSpeed(0); S.haz = []; P.addHazard(P.C("PHL"), "typhoon"); GameMap.focusCountry("PHL"); S.ep = Math.max(S.ep, 60); },
   done:() => { const h = ownedHaz(); return !!(h && h.evac); },
   text:T("พยากรณ์ภัย! พายุไต้ฝุ่นจะถึงฟิลิปปินส์ใน 3 เดือน · แตะไอคอนบนแผนที่ (หรือปุ่ม \"อพยพ\" ด้านบน) เพื่อสั่งอพยพ ความเสียหายจะลดลงมาก", "Disaster forecast! A typhoon reaches the Philippines in 3 months · tap its icon on the map (or the \"Evacuate\" button at the top) to evacuate; the damage will be much smaller.")},
  {id:"strike", setup:() => { const h = ownedHaz(); if (h) h.at = S.tick + 1; P.setSpeed(2); }, done:() => !(S.haz || []).length,
   text:T("ดีมาก! ปล่อยเวลาให้เดิน แล้วดูพายุมาถึง…", "Well done! Let time run and watch the storm arrive…")},
  {id:"feed", hold:1, next:T("เข้าใจแล้ว", "Got it"), target:() => rectOf($(".lossfeed")), setup:() => { P.setSpeed(0); },
   text:T("ทุกครั้งที่เสียเงินหรือความนิยม จะมีบอกตรงนี้ว่าเสียเพราะอะไร แตะเพื่อดูบนแผนที่ได้", "Every time you lose money or approval, this tells you why. Tap a line to see it on the map.")},
  {id:"red", target:() => { const b = S.bubbles.find(q => q.type === "red"); return b ? mapRect(GameMap.countryPoint(b.cid), -22, 30) : null; },
   setup:() => { S.bubbles.forEach(b => { if (b.type === "red") b.ttl = 99; }); if (!S.bubbles.some(b => b.type === "red")) S.bubbles.push({id:++S.bubId, type:"red", reg:"SEA", cid:"PHL", hz:"typhoon", ttl:99}); S.ep = Math.max(S.ep, 60); P.setSpeed(1); },
   done:() => !S.bubbles.some(b => b.type === "red"),
   text:T("หลังภัยมาถึง จะมีฟองสีแดง = ส่งความช่วยเหลือ (ใช้เงิน) ความนิยมและมิตรภาพจะเพิ่ม ถ้าปล่อยให้หมดเวลาจะเสียความนิยม · แตะฟองสีแดง", "After a disaster a red bubble appears = send aid (costs money); approval and friendship go up. Let it run out and you lose approval · tap the red bubble.")},
  {id:"country", hold:1, target:() => mapRect(GameMap.countryPoint("THA"), 0, 34), setup:() => { P.setSpeed(0); S.tab = null; S.selC = null; GameMap.focus("SEA", true); }, done:() => S.selC === "THA",
   text:T("แตะประเทศไทยบนแผนที่ เพื่อเปิดแผงสั่งการของประเทศ", "Tap Thailand on the map to open its orders.")},
  {id:"talk", hold:1, target:() => rectOf($("[data-cact=talk] .btn")), setup:() => { S.pc = Math.max(S.pc, 20); }, done:() => (P.C("THA").cd.talk || 0) > 0,
   text:T("[[$heart]] มิตรภาพสูง = ประเทศร่วมมือลด CO₂ และทำข้อตกลงได้ · กด \"เจรจา\"", "[[$heart]] High friendship = a country cuts CO₂ with you and can sign deals · press \"Negotiate\".")},
  {id:"event", hold:1, target:() => rectOf($(".modal.event .opts")), corner:1,
   setup:() => { S.tab = null; S.ep = Math.max(S.ep, 80); S.event = "EVT_47"; S.cev = null; S.used.push("EVT_47"); if (P.H.showEvent) P.H.showEvent(); bump(); },
   done:() => !S.event,
   text:T("เหตุการณ์! เกมหยุดรอให้คุณเลือก · ลูกศร ▲▼ บอกผลของแต่ละทาง (เขียว = ดี แดง = เสีย) · อยากดูแผนที่ก่อน กด \"ดูแผนที่ก่อน\" · เลือกได้เลย", "An event! The game waits for your choice · the ▲▼ arrows show what each option does (green good, red bad) · want to check the map first? Press \"Look at the map first\" · go ahead and choose.")},
  {id:"appr", hold:1, target:() => rectOf($("[data-kpi=appr]")), done:() => UIM.modal === "politics" || !!S.simple,
   text:T("ความนิยมมาจากคน 4 กลุ่ม · แตะช่องความนิยมเพื่อดูว่าแต่ละกลุ่มชอบอะไร", "Approval comes from 4 groups of people · tap the approval box to see what each group likes.")},
  {id:"apprclose", hold:1, target:() => rectOf($(".modal.politics .mclose")), done:() => UIM.modal !== "politics",
   text:T("แต่ละกลุ่มชอบนโยบายไม่เหมือนกัน ถ้ากลุ่มไหนไม่พอใจมากจะออกมาประท้วง · ปิดหน้าต่างนี้", "Each group likes different policies; a very angry group protests · close this window.")},
  {id:"ore", hold:1, target:() => rectOf($("[data-kpi=ore]")), done:() => UIM.modal === "market" || !S.oreOn,
   text:T("[[$ore]] ทรัพยากร: สกิลพลังงานสะอาดต้องใช้แร่ · แตะเพื่อเปิดตลาด", "[[$ore]] Resources: clean-energy skills need minerals · tap to open the market.")},
  {id:"oreclose", hold:1, target:() => rectOf($(".modal.market .mclose")), done:() => UIM.modal !== "market",
   text:T("ขาดเมื่อไรซื้อได้ เหลือก็ขายเป็นเงิน ราคาขึ้นลงทุกเดือน · ประเทศที่เป็นมิตรก็ส่งแร่ให้ · ปิดตลาด", "Short? Buy. Spare? Sell for money; prices move every month · friendly countries also send minerals · close the market.")},
  {id:"ability", hold:1, target:() => rectOf($(".abar .abtn")), done:() => Object.values(S.actCd || {}).some(v => v > 0),
   text:T("ปุ่มใต้รูปตัวละครคือสกิลพิเศษของตัวละคร · ลองกดดู (ใช้แล้วต้องรอเวลาพัก)", "The button under your portrait is your character's special skill · try it (it needs time to recharge).")},
  {id:"year", hold:1, next:T("ต่อไป", "Next"), target:() => rectOf($(".bar.nz .ms.yr")) || rectOf($(".meters")),
   text:T("ทุกเดือนมกราคม มีสรุปผลงานปี: ถ้า CO₂ ต่ำกว่าเป้าปีนั้น (ขีดสีทอง) = ปีที่ดี ได้งบเพิ่ม · ไม่ถึง = ปีที่แย่ ความเชื่อมั่นลด · จำนวนปีที่ดีเลือกฉากจบให้คุณ", "Every January you get a year in review: CO₂ below that year's target (the gold mark) = a good year and more funding · above it = a bad year and less trust · your number of good years picks your ending.")},
  {id:"edge", target:() => hitRect("eh-"),
   setup:() => { S.haz = []; P.addHazard(P.C("USA"), "hurricane"); if (UIM.alerts) UIM.alerts = []; GameMap.focusCountry("THA"); P.setSpeed(0); },
   done:() => { const h = ownedHaz(); if (!h) return true; const pt = GameMap.countryPoint(h.c); if (!pt) return true; const [x, y] = GameMap.toViewport(pt[0], pt[1]); return x > 0 && x < GameMap.vw && y > 0 && y < GameMap.vh; },
   text:T("ภัยที่อยู่นอกจอ จะมีลูกศรที่ขอบจอชี้ไปหา · แตะลูกศรเพื่อไปดู (ลากแผนที่ได้ และ UI จะจางลงให้เห็นชัด)", "Disasters off the screen get an arrow at the edge pointing to them · tap the arrow to go there (you can also drag the map; the HUD fades so you can see).")},
  {id:"done", hold:1, final:1, setup:() => { S.haz = []; S.bubbles = []; },
   text:T("เยี่ยมมาก! คุณพร้อมแล้ว · เคล็ดลับ: เก็บฟองเขียวบ่อย ๆ · อพยพก่อนภัยมา · ช่วยฟองแดงให้ทัน · ลงทุนสกิลพลังงานก่อน · ดูสรุปผลงานทุกปี", "Brilliant, you're ready! Tips: collect green bubbles often · evacuate before disasters · answer red bubbles in time · invest in energy skills first · check your year in review.")},
];

/* ---------------- controller ---------------- */
export const Train = {
  trained(){ return ls.get("p2050-trained") === "1" || !!(P.AchStore.data.got || {}).start; },
  markDone(){ ls.set("p2050-trained", "1"); P.AchStore.data.trained = Date.now(); P.AchStore.save(); P.Ach.unlock("tutorial"); },
  enter(i){
    const s = STEPS[i]; if (!s) return;
    UIM.train = {...st(), i, hold:!!s.hold, at:performance.now()};
    if (s.setup) s.setup();
    if (s.hold && S.speed) S.speed = 0;
    bump();
  },
  next(){ const i = st().i + 1; if (i >= STEPS.length) return; Audio.play("done", {vol:.6}); this.enter(i); },
};
/* skip steps that can't happen in this game (e.g. no minerals in Fast mode) */
const skippable = s => (s.id === "apprclose" && !S.groups) || (s.id === "oreclose" && !S.oreOn);

export function Training({onFinish, onQuit}){
  const [, setN] = useState(0);
  const tr = st(), s = tr && STEPS[tr.i];
  useEffect(() => {
    if (!tr) return;
    if (tr.i === 0 && !tr.at) Train.enter(0);
    const id = setInterval(() => {
      const t = st(); if (!t) return; const cur = STEPS[t.i];
      if (cur && !cur.final && performance.now() - t.at > 500){
        if (skippable(cur)) Train.next();
        else if (cur.done && cur.done()) Train.next();
      }
      setN(n => n + 1);   // follow moving targets (map, windows)
    }, 160);
    return () => clearInterval(id);
  }, [!!tr]);
  if (!tr || !s) return null;
  const r = s.target ? s.target() : null, W = window.innerWidth, Hh = window.innerHeight, phone = W < 700;
  const txt = typeof s.text === "function" ? s.text() : s.text;
  // where the card goes: away from the lit-up thing
  let cs = {};
  if (!r) cs = {left:"50%", top:"50%", transform:"translate(-50%,-50%)"};
  else if (s.corner || r.h > Hh * .45) cs = phone ? {left:"8px", right:"8px", top:"8px"} : {right:"16px", bottom:"16px", width:"360px"};
  else {
    const below = r.y + r.h / 2 < Hh * .5, cw = Math.min(380, W - 16), left = Math.max(8, Math.min(W - cw - 8, r.x + r.w / 2 - cw / 2));
    cs = below ? {left:left + "px", top:Math.min(Hh - 190, r.y + r.h + 14) + "px", width:cw + "px"} : {left:left + "px", bottom:Math.min(Hh - 190, Hh - r.y + 14) + "px", width:cw + "px"};
  }
  return <div class="train" aria-live="polite">
    {r ? <div class="tspot" style={{left:r.x - 6 + "px", top:r.y - 6 + "px", width:r.w + 12 + "px", height:r.h + 12 + "px"}}/> : <div class="tdim"/>}
    <div class={"tcard glass-strong " + (s.final ? "final" : "")} style={cs} key={tr.i}>
      <div class="thead"><span class="mono acc small"><Icon n="graduation-cap" size={15}/> {L(P.UI2.trainMenu)} · {tr.i + 1}/{STEPS.length}</span><span class="grow"/>
        {!s.final ? <button type="button" class="tquit" onClick={onQuit}>{S.lang === "th" ? "ออก" : "Quit"}</button> : null}</div>
      <p><Rich t={L(txt)}/></p>
      <div class="tbar"><i style={{width:`${(tr.i + 1) / STEPS.length * 100}%`}}/></div>
      {s.next ? <div class="tfoot"><Btn size="sm" onClick={() => Train.next()}>{`${L(s.next)} [[chevron-right]]`}</Btn></div> : null}
      {s.final ? <div class="tfoot"><Btn kind="ghost" onClick={() => onFinish(false)}>{S.lang === "th" ? "กลับเมนู" : "Main menu"}</Btn><Btn size="lg" onClick={() => onFinish(true)}>{`${S.lang === "th" ? "เล่นเกมจริง" : "Play for real"} [[play]]`}</Btn></div> : null}
      {!s.next && !s.final ? <small class="twait muted"><Icon n="hand" size={14}/> {S.lang === "th" ? "ลองทำตามดูเลย" : "Go ahead and try it"}</small> : null}
    </div>
  </div>;
}
