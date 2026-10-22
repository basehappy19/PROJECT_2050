const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.dataV11) return;
(P.mods = P.mods || {}).dataV11 = 1;
/* ===== Data · Text strings added in version 1.1 (save slots, progress on every device, friendship, minerals). Merged into P.UI. ===== */
const T = (th, en) => ({th, en});
Object.assign(P.UI, {
  /* save slots */
  autoTag:T("อัตโนมัติ", "auto"), slotThisGame:T("เกมนี้", "This game"),
  slotHelp:T("เกมจะบันทึกอัตโนมัติในช่องของตัวเอง แต่ละช่องเป็นของโหมดเดียว และบันทึกทับเกมของโหมดอื่นไม่ได้", "Each game autosaves into its own slot. A slot belongs to one mode and can't be saved over by a game of another mode."),
  slotCloud:T("ช่องบันทึกทั้ง 3 ช่องเก็บไว้กับบัญชี เปิดเครื่องไหนก็เล่นต่อได้", "All 3 slots are kept with your account, so you can carry on from any device."),
  slotUse:T("ใช้ช่องนี้", "Use this slot"), slotUseOver:T("บันทึกทับช่องนี้", "Replace this slot"),
  slotOtherMode:T("ช่องนี้เป็นเกมของโหมดอื่น บันทึกทับไม่ได้", "This slot holds a game of another mode and can't be saved over"),
  hardNoManual:T("Hard Core บันทึกได้เฉพาะช่องของเกมนี้", "Hard Core can only save in this game's own slot"),
  hardSaves:T("โหมด Hard Core บันทึกอัตโนมัติในช่องของเกมนี้เท่านั้น บันทึกเองหรือย้อนกลับไม่ได้", "Hard Core only autosaves into this game's own slot: no manual saves, no going back"),
  slotDel:T("ลบช่องนี้", "Delete slot"), slotDelSure:T("ยืนยันลบ", "Delete"), slotDeleted:T("ลบแล้ว", "Deleted"),
  slotFullTag:T("ช่องบันทึกเต็ม", "Slots full"), slotFullTitle:T("เลือกช่องบันทึกให้เกมใหม่", "Choose a slot for the new game"),
  slotFullMsg:T("ช่องบันทึกทั้ง 3 ช่องมีเกมอยู่แล้ว เลือกช่องของโหมด {M} เพื่อบันทึกทับ หรือลบช่องของโหมดอื่นก่อน", "All 3 slots hold a game. Pick a {M} slot to replace, or delete a slot of another mode first."),
  slotNoSave:T("เล่นโดยไม่บันทึก", "Play without saving"),
});
Object.assign(P.UI, {
  relLegend:T("[[$heart]] ตัวเลขหลังชื่อประเทศคือ “มิตรภาพ” ของประเทศนั้นกับเรา (−100 ถึง 100) ฝ่ายที่เราเลือกข้างจะชอบเรามากขึ้น อีกฝ่ายจะไม่พอใจ", "[[$heart]] The number after each country is its “friendship” with us (−100 to 100). The side you back will like you more; the other side less."),
});
Object.assign(P.UI, {
  /* news panel */
  nfAll:T("ทั้งหมด", "All"), nfIntel:T("ข่าวกรอง", "Forecasts"), nfDanger:T("ภัย/เตือน", "Warnings"), nfGood:T("ผลงาน", "Progress"), nfDecide:T("การตัดสินใจ", "Decisions"), nfWorld:T("ข่าวโลก", "World news"),
  nfEmpty:T("ยังไม่มีข่าวประเภทนี้", "Nothing here yet"),
  nfIntelNow:T("ข่าวกรองตอนนี้: เสี่ยงภัยสูงที่", "Current forecast: high risk in"),
  nfIntelHelp:T("ภัยพิบัติเกิดที่ทวีปนี้บ่อยกว่าที่อื่นมาก ใช้ “ช่วยเตรียมรับมือภัย” หรือเตรียมเงินไว้อพยพ เหลืออีก", "Disasters hit this continent far more often. Use “Help prepare for disasters” or keep money for evacuations. Time left:"),
  /* yearly report */
  rpTitle:T("รายงานประจำปี", "Yearly report"), rpRead:T("อ่านแล้ว", "Got it"), rpDone:T("อ่านแล้ว รายงานฉบับต่อไปมาเดือนมกราคมหน้า", "Read. The next report comes next January."),
  rpAngry:T("{N} ประเทศไม่ร่วมมือ (มิตรภาพ −30 หรือต่ำกว่า): CO₂ ของเขาจะค่อยๆ เพิ่มขึ้น และอาจคว่ำบาตรเรา ·", "{N} countries won't cooperate (friendship −30 or lower): their CO₂ creeps up and they may sanction us ·"),
  rpSanct:T("กำลังคว่ำบาตรเรา:", "Sanctioning us:"), rpLag:T("ทวีปที่ลด CO₂ ได้น้อยที่สุด:", "Continent furthest behind:"),
  rpAppr:T("ความนิยมต่ำ: ช่วยเหลือผู้ประสบภัย (ฟองสีแดง) และเลือกทางที่ประชาชนรับได้", "Approval is low: help disaster victims (red bubbles) and pick choices people can accept"),
  rpFriends:T("มีประเทศที่เป็นมิตร 40+ เพียง {N} ประเทศ: เจรจาหรือส่งทุนเพื่อทำข้อตกลงทวิภาคีและตั้งพันธมิตร", "Only {N} countries are friendly (40+): negotiate or send funding to make bilateral deals and alliances"),
  /* bilateral */
  bilatReady:T("พร้อมทำข้อตกลง", "Ready"), bilatPick:T("เลือกประเทศคู่ (มิตรภาพ 40+ ทั้งสองฝ่าย)", "Pick a partner (both at friendship 40+)"),
  bilatFxCo2:T("CO₂ −12% ทั้งสองประเทศ ภายใน 2 ปี", "CO₂ −12% in both, over 2 years"), bilatFxMoney:T("เงิน +1 ทุกเดือนจากการค้า", "Money +1 every month from trade"),
  bilatFxRel:T("มิตรภาพ +8 ทั้งคู่", "Friendship +8 for both"), bilatBoth:T("ทั้งสองประเทศภายใน", "in both over"),
  bilatNeedRel2:T("ต้องมีมิตรภาพตั้งแต่ 40 ขึ้นไป (ตอนนี้ {R}) ใช้ “เจรจา” หรือ “ส่งทุนสนับสนุน” ด้านบนเพื่อเพิ่ม", "Needs friendship 40+ (now {R}). Use “Negotiate” or “Send funding” above to raise it."),
  bilatHave:T("มีข้อตกลงแล้วกับ", "Deals signed with"), bilatTip:T("ทำข้อตกลงทวิภาคีได้แล้ว: เลือกประเทศที่มีมิตรภาพ 40+ แล้วดูการ์ด “ข้อตกลงทวิภาคี”", "Bilateral deals are open: select a country with friendship 40+ and look for the “Bilateral agreement” card"),
  /* friendship */
  relHostile:T("ไม่ร่วมมือแล้ว: CO₂ ของประเทศนี้ค่อยๆ เพิ่มขึ้น และอาจคว่ำบาตรเรา", "Not cooperating: its CO₂ creeps up and it may sanction us"),
  relSanct:T("คว่ำบาตรเราอยู่อีก", "Sanctioning us for another"),
  relLow:T("ไม่ไว้ใจเรา: ทำตามแผนในทวีปลดลง ถ้าต่ำถึง −30 จะไม่ร่วมมือ", "Distrusts us: on-plan in this continent drops; at −30 it stops cooperating"),
  /* carbon tariff */
  cact_tariff:T("CO₂ ประเทศนี้ −20% × ทำตามแผน (ได้ผลน้อยลงทุกครั้ง) แต่มิตรภาพ −22 ความนิยม −1% และอาจถูกตอบโต้ด้วยการคว่ำบาตร", "This country's CO₂ −20% × on-plan (less each time), but friendship −22, approval −1%, and it may hit back with sanctions"),
});
{ const a = P.ACTIONS.find(x => x.id === "tariff"); if (a) a.desc = T("CO₂ ทวีป −0.8 Gt × ทำตามแผน (ได้ผลน้อยลงทุกครั้ง) แต่ทำตามแผน −8% มิตรภาพทุกประเทศในทวีป −10 ความนิยม −2% และบางประเทศอาจคว่ำบาตร", "Continent CO₂ −0.8 Gt × on-plan (less each time), but on-plan −8%, every country here friendship −10, approval −2%, and some may sanction us"); }
Object.assign(P.UI, { googleContinue:T("ดำเนินการต่อด้วย Google", "Continue with Google") });
Object.assign(P.UI, { matShortSk:T("ทรัพยากรไม่พอ ขาดอีก", "Not enough resources, short by"), toMarket:T("ไปตลาดทรัพยากร", "Go to the market") });
/* 1.1.3: what each value in the top bar means */
Object.assign(P.UI, {
  tipEp:T("ใช้ซื้อสกิล สั่งการ และช่วยเหลือ ได้ทุกเดือนตามความนิยมและการทำตามแผน และได้มากจากการกดฟองสีเขียว", "Pays for skills, orders and aid. Comes every month (more with approval and on-plan) and in bigger amounts from green bubbles."),
  tipPc:T("ใช้ปลดล็อกสกิลและการทูต ได้ทุกเดือนตามการทำตามแผน และจากการอ่านข่าวกรองกับรายงานประจำปี", "Needed for skills and diplomacy. Comes every month with on-plan, and from reading forecasts and the yearly report."),
  tipOre:T("ทรัพยากร 5 กลุ่มที่พลังงานสะอาดต้องใช้ ได้จากประเทศที่เป็นมิตร ฟองสีส้ม การสั่งซื้อ และตลาดทรัพยากร (กดเพื่อเปิดตลาด)", "The 5 mineral groups clean energy needs: from friendly countries, orange bubbles, purchase orders and the market (tap to open it)."),
  tipAppr:T("ถ้าลดถึง 0% จะถูกถอดถอน ลดเมื่อภัยพิบัติ การตัดสินใจที่คนไม่ชอบ และโลกร้อนขึ้น เพิ่มเมื่อช่วยผู้ประสบภัย (ฟองสีแดง)", "At 0% you are voted out. Falls with disasters, unpopular choices and a hotter world; rises when you help disaster victims (red bubbles)."),
  tipNZ:T("CO₂ สุทธิของโลกต่อปี ลดให้ถึง 0 ก่อนสิ้นปี 2050 เพื่อชนะ", "The world's net CO₂ per year. Bring it to 0 before the end of 2050 to win."),
  tipTemp:T("โลกร้อนขึ้นกี่องศาจากยุคก่อนอุตสาหกรรม ถึง +3.0°C แพ้ ยิ่งร้อนภัยพิบัติยิ่งบ่อยและแรง", "How much warmer the world is than before industry. At +3.0°C you lose; the hotter, the more and worse the disasters."),
});
Object.assign(P.UI, {
  updReady:T("มีเกมเวอร์ชันใหม่แล้ว", "A new version of the game is ready"), updNow:T("อัปเดตเลย (บันทึกเกมให้ก่อน)", "Update now (saves first)"), updLater:T("ภายหลัง", "Later"),
});
/* 1.8: weekly missions and the season pass */
Object.assign(P.UI, {
  mSeason:T("ซีซั่นและภารกิจ", "Season & missions"), seasonLogin:T("เข้าสู่ระบบเพื่อรับภารกิจรายสัปดาห์และรางวัลซีซั่น", "Sign in to get weekly missions and season rewards"),
  seasonWeekly:T("ภารกิจสัปดาห์นี้", "This week's missions"), seasonEnds:T("รีเซ็ต", "resets"), seasonPass:T("รางวัลซีซั่น", "Season rewards"),
  seasonXp:T("XP ซีซั่น", "Season XP"), seasonHow:T("ทุกเกมที่เล่นจบได้ XP ซีซั่น (ชนะ คะแนนสูง และโหมด Hard Core ได้มากขึ้น) ภารกิจที่รับรางวัลแล้วก็ได้ XP ด้วย", "Every finished game gives season XP (more for wins, high scores and Hard Core); claimed missions give XP too."),
  seasonClaim:T("รับ", "Claim"), seasonGot:T("ได้รับรางวัลแล้ว", "Reward claimed"), seasonDone:T("รับแล้ว", "Claimed"),
  seasonTill:T("ถึง", "until"), seasonTier:T("ขั้น", "Tier"), seasonLocked:T("ยังไม่ถึง", "Not yet"),
  err_not_reached:T("ยังไม่ถึงขั้นนี้", "You haven't reached this tier yet"), err_already_claimed:T("รับรางวัลนี้ไปแล้ว", "Already claimed"), err_not_done:T("ภารกิจยังไม่สำเร็จ", "Mission not finished yet"),
  err_bad_mission:T("ภารกิจนี้ไม่ใช่ของสัปดาห์นี้", "That mission isn't this week's"), err_bad_tier:T("ไม่มีขั้นนี้", "No such tier"),
});

