const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.loading) return;
(P.mods = P.mods || {}).loading = 1;
const T = (th, en) => ({th, en});
/* 3.8: each line of the checklist is picked at random from things in the game, so every visit reads a little different.
   One line per real loading step (fonts → words on screen, data → countries and trade, globe → the planet, clouds → weather) */
P.LD_POOL = {
  fonts:[T("เขียนป้ายชื่อประเทศทั่วโลก", "Writing every country's name tag"), T("ขัดเงาปุ่มสกิลทั้ง 6 สาย", "Polishing six branches of skills"), T("เรียงพาดหัวข่าวโลกประจำวัน", "Sorting today's world headlines"),
    T("พิมพ์รายงานประจำปีให้ผู้นำโลก", "Printing the yearly report for world leaders"), T("ร่างญัตติสำหรับที่ประชุม COP", "Drafting motions for the COP summit"), T("ติดป้ายราคาในตลาดแร่", "Pricing the mineral market")],
  data:[T("วาดเส้นพรมแดน 172 ประเทศ", "Drawing the borders of 172 countries"), T("จัดเส้นทางเรือสินค้าผ่านช่องแคบมะละกา", "Routing cargo ships through the Strait of Malacca"), T("ตั้งตารางเที่ยวบินข้ามทวีป", "Scheduling flights between continents"),
    T("นับ CO₂ ที่แต่ละประเทศปล่อย", "Counting every country's CO₂"), T("ส่งทูตไปเยือนประเทศเพื่อนบ้าน", "Sending envoys to the neighbours"), T("สำรวจแหล่ง Rare Earth", "Surveying Rare Earth deposits"), T("วางรางรถไฟความเร็วสูง", "Laying high-speed rail")],
  globe:[T("ปลูกป่าโกงกางตามชายฝั่ง", "Planting mangroves along the coasts"), T("ติดตั้งกังหันลมกลางทะเล", "Raising wind turbines out at sea"), T("ปูแผงโซลาร์กลางทะเลทราย", "Laying solar panels in the desert"),
    T("วัดอุณหภูมิโลก: +1.2°C", "Reading the world's temperature: +1.2°C"), T("ตรวจระดับน้ำทะเลรอบเกาะแปซิฟิก", "Checking sea level round the Pacific islands"), T("ดับไฟบนแท่นขุดเจาะน้ำมัน", "Putting out flares on the oil rigs")],
  clouds:[T("พยากรณ์พายุไต้ฝุ่นในแปซิฟิก", "Forecasting typhoons in the Pacific"), T("ปล่อยเมฆลอยจากตะวันตกไปตะวันออก", "Letting the clouds drift west to east"), T("ตั้งสถานีเตือนภัยน้ำท่วม", "Setting up flood warning stations"),
    T("เตรียมแผนอพยพหนีคลื่นความร้อน", "Planning heatwave evacuations"), T("จัดฤดูมรสุมให้มาตรงเวลา", "Getting the monsoon to arrive on time"), T("เตรียมหิมะสำหรับฤดูหนาว", "Getting the winter snow ready")],
};
