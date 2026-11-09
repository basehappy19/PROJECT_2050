const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.keys39) return;
(P.mods = P.mods || {}).keys39 = 1;
/* 3.9: keyboard shortcuts on a computer, one list for the "?" window (web + GDevelop) and the keys shown in training.
   [keys, what it does, new in 3.9] */
const T = (th, en) => ({th, en});
P.KEYS = [
  {id:"time", icon:"clock", col:"accent", name:T("เวลา", "Time"), keys:[
    [["Space"], T("หยุด / เดินต่อ", "Pause / resume")],
    [["1", "2", "3"], T("ความเร็ว (ตอนมีเหตุการณ์ = เลือกทาง)", "Speed (during an event: pick an answer)")]]},
  {id:"map", icon:"map", col:"sky", name:T("แผนที่", "Map"), keys:[
    [["←", "↑", "↓", "→"], T("เลื่อนแผนที่", "Move the map"), 1],
    [["+", "−"], T("ซูมเข้า / ออก", "Zoom in / out")],
    [["H"], T("ดูทั้งโลก", "Whole world")],
    [["Q", "E"], T("ทวีปก่อนหน้า / ถัดไป", "Previous / next region"), 1],
    [["A"], T("ไปยังภัยที่กำลังจะมา (กดซ้ำ = ภัยถัดไป)", "Go to the next coming disaster"), 1]]},
  {id:"pane", icon:"menu", col:"purple", name:T("แผงข้อมูล", "Panels"), keys:[
    [["R"], T("แผงทวีป / ประเทศ", "Region / country panel")],
    [["S"], T("แผงสถิติ", "Statistics")],
    [["N"], T("แผงข่าว", "News")],
    [["⌫"], T("ย้อนจากประเทศกลับไปทวีป", "Back from a country to its region"), 1]]},
  {id:"win", icon:"monitor", col:"gold", name:T("หน้าต่าง", "Windows"), keys:[
    [["T"], T("ต้นไม้สกิล", "Skill tree")],
    [["P"], T("ความนิยม (กลุ่มคน 4 กลุ่ม)", "Approval (4 groups)"), 1],
    [["M"], T("ตลาดแร่", "Mineral market"), 1]]},
  {id:"char", icon:"user-round", col:"pink", name:T("ตัวละครและเหตุการณ์", "Character and events"), keys:[
    [["Z", "X", "C"], T("สกิลพิเศษของตัวละคร ปุ่มที่ 1–3", "Character abilities 1–3"), 1],
    [["Enter"], T("ปิดสรุปปีและบทเล่าเรื่อง", "Close the year report and story")]]},
  {id:"etc", icon:"keyboard", col:"muted", name:T("อื่น ๆ", "Other"), keys:[
    [["Esc"], T("ปิดหน้าต่าง หรือหยุดเกม", "Close a window, or pause")],
    [["F"], T("เต็มจอ", "Full screen")],
    [["V"], T("ปิด / เปิดเสียงทั้งหมด", "Sound off / on"), 1],
    [["?"], T("ดูปุ่มลัดทั้งหมด", "All shortcuts"), 1]]},
];
/* keys shown on a training step (computer only) */
P.TRAIN_KEYS = {time:["Space"], skills:["T"], skclose:["Esc"], hazard:["A"], event:["1", "2", "3"], appr:["P"], apprclose:["Esc"], ore:["M"], oreclose:["Esc"], ability:["Z", "X", "C"], year:["Enter"], edge:["A", "←↑↓→"], done:["?"]};
