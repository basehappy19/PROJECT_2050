const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.dataV1) return;
(P.mods = P.mods || {}).dataV1 = 1;
/* ===== Data · Text strings added in version 1.0 (graphics settings, resources, traffic, Continuous World,
   update log, admin). Merged into P.UI. ===== */
const T = (th, en) => ({th, en});
Object.assign(P.UI, {
  /* graphics */
  gfxLbl:T("กราฟิก","Graphics"), gfxAuto:T("อัตโนมัติ","Auto"), gfxLow:T("ต่ำ","Low"), gfxMed:T("กลาง","Medium"), gfxHigh:T("สูงสุด","High"),
  gfx_low:T("ตอนนี้: ต่ำ","now: Low"), gfx_medium:T("ตอนนี้: กลาง","now: Medium"), gfx_high:T("ตอนนี้: สูงสุด","now: High"),
  gfxDropped:T("เครื่องนี้เล่นไม่ลื่น เกมลดกราฟิกเป็น “{L}” ให้แล้ว เปลี่ยนได้ที่เมนูหยุดเกม","The game wasn't running smoothly, so graphics were lowered ({L}). Change it in the pause menu."),
});
Object.assign(P.UI, {
  gemsWord:T("เพชร", "Gems"),
  /* minerals and resources */
  oreLbl:T("[[$ore]] แร่", "[[$ore]] Minerals"), resTitle:T("ทรัพยากรของประเทศนี้", "This country's resources"),
  resImporter:T("ประเทศนี้ต้องนำเข้าแร่เกือบทั้งหมดทางเรือ", "This country imports almost all its minerals by ship"),
  oreBanned:T("ระงับส่งออกแร่อยู่อีก", "Mineral exports stopped for another"), oreSends:T("ส่งแร่ให้เรา", "Sends us minerals"),
  oreNeedFriend:T("ยังไม่ส่งแร่ให้เรา: ต้องมีมิตรภาพตั้งแต่ 0 ขึ้นไป (ยิ่งสูงยิ่งได้มาก)", "Not sending us minerals yet: needs friendship 0+ (more when higher)"),
  oreUsed:T("ใช้แร่ไป", "Minerals used"), oreMostFrom:T("ได้จาก", "most from"),
  greenTech:T("เทคโนโลยีสีเขียว", "Green technology"), greenHelp:T("ยิ่งสูง CO₂ ยิ่งลดเองทุกเดือน แพร่ต่อไปยังประเทศที่มีเที่ยวบินและเรือเชื่อมกัน", "The higher it is, the more CO₂ falls by itself each month; it spreads to countries linked by flights and ships"),
  /* Continuous World */
  mWorld:T("โลกต่อเนื่อง", "Continuous World"), mWorldS:T("เล่นได้ไม่จบ มีฤดูกาล เป้าหมาย และการประชุม COP ทุกปี", "No end year: seasons, goals and a COP summit every year"),
  mWorldLock:T("ปลดล็อกเมื่อชนะภารกิจ 2050 ครั้งแรก", "Unlocks after your first Mission 2050 win"),
  playOn:T("เล่นโลกนี้ต่อ", "Keep playing this world"), worldCont:T("เล่นต่อในโหมดโลกต่อเนื่อง: ไม่มีปีสิ้นสุดแล้ว เป้าหมายใหม่คือดึงอุณหภูมิลงต่ำกว่า +1.5°C", "Continuing as a Continuous World: there is no end year now — the new goal is to bring warming below +1.5°C"),
  goalsTitle:T("เป้าหมายฤดูนี้", "Season goals"),
  realNews:T("ข่าวจริง", "Real news"), source:T("แหล่งข้อมูล", "Source"),
  lRes:T("ทรัพยากร", "Resources"), lResHelp:T("ทรัพยากรที่โลกต้องใช้เปลี่ยนไปใช้พลังงานสะอาด และของที่หลายคนไม่รู้ว่าสำคัญ ตัวเลขจากแหล่งข้อมูลจริง", "The resources the world needs for clean energy, and some most people never think about. Figures from real sources."), building:T("กำลังสร้าง", "under construction"),
  /* update log */
  mUpd:T("บันทึกการอัปเดต", "Update log"), updNew:T("มีอะไรใหม่ในเวอร์ชัน", "What's new in version"), updSee:T("ดูทั้งหมด", "See all"),
  updVer:T("เวอร์ชัน", "Version"),
  hardLocked:T("ปลดล็อกเมื่อชนะโหมดปกติ", "Unlocks after a Normal win"), hardLockedMsg:T("ชนะภารกิจ 2050 โหมดปกติก่อน แล้วโหมด Hard Core จะเปิดให้เล่น", "Win Mission 2050 in Normal mode first to open Hard Core"),
  certCondNormal:T("ชนะภารกิจ 2050 โหมดปกติ", "Win Mission 2050 in Normal mode"), certCondHard:T("ชนะภารกิจ 2050 โหมด Hard Core", "Win Mission 2050 in Hard Core"),
  certIssued:T("คุณได้รับประกาศนียบัตรแล้ว ขอได้คนละ 1 ใบ", "You already have your certificate (one per player)"),
  certIssuedBtn:T("ขอประกาศนียบัตรแล้ว", "Certificate already issued"), certNotYet:T("ยังไม่ผ่านเงื่อนไข", "Not eligible yet"),
  certSpecial:T("ผู้ดูแลให้สิทธิ์คุณขอประกาศนียบัตรได้ 1 ครั้ง", "An admin has given you one certificate request"),
  err_already_issued:T("คุณได้รับประกาศนียบัตรแล้ว", "You already have a certificate"),
  gSignedIn:T("เข้าสู่ระบบด้วย Google แล้ว", "Signed in with Google"), gCancel:T("ยกเลิก ใช้บัญชีอื่น", "Cancel, use another account"), gConfirm:T("ใช้ชื่อนี้และเริ่มเล่น", "Use this name and start"),
});
