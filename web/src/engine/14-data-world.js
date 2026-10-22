const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.dataWorld) return;
(P.mods = P.mods || {}).dataWorld = 1;
/* ===== Data · Countries, local weather, country events, characters, story, shop =====
   Country emission weights are approximate real CO₂ figures (Mt, early 2020s) and are only used
   as SHARES inside each game region; the region totals stay the game's own numbers.
   risk = base disaster risk 0–100 · stance = −1 (fossil-friendly) … +1 (green-friendly)
   tags: ind = big industry · vul = climate-vulnerable · rich · fos = fossil exporter · for = forests
         coast = long coastline · arc = Arctic · farm = farming power · tech = technology maker */
const C_ = (id, geo, th, en, reg, w, risk, stance, hz, tags) => ({id, geo, name:{th, en}, reg, w, risk, stance, hz, tags});
const COUNTRIES = [
  // North America
  C_("USA","United States of America","สหรัฐอเมริกา","United States","NA",4900,45,.2,["hurricane","heat","wildfire","drought"],["ind","rich","fos","tech","coast","arc"]),
  C_("CAN","Canada","แคนาดา","Canada","NA",550,30,.5,["wildfire","heat","flood"],["rich","fos","for","arc"]),
  C_("MEX","Mexico","เม็กซิโก","Mexico","NA",480,55,.1,["hurricane","drought","heat"],["ind","fos","coast","farm"]),
  C_("CUB","Cuba","คิวบา","Cuba","NA",25,65,.2,["hurricane","flood"],["vul","coast"]),
  C_("GTM","Guatemala","กัวเตมาลา","Guatemala","NA",20,60,.3,["hurricane","drought"],["vul","farm"]),
  C_("DOM","Dominican Rep.","สาธารณรัฐโดมินิกัน","Dominican Republic","NA",30,60,.3,["hurricane","flood"],["vul","coast"]),
  C_("HTI","Haiti","เฮติ","Haiti","NA",3,80,.3,["hurricane","flood"],["vul","coast"]),
  C_("PAN","Panama","ปานามา","Panama","NA",10,40,.5,["flood","drought"],["coast","for"]),
  C_("CRI","Costa Rica","คอสตาริกา","Costa Rica","NA",8,45,.9,["flood","drought"],["for","coast"]),
  C_("JAM","Jamaica","จาเมกา","Jamaica","NA",7,65,.5,["hurricane","flood"],["vul","coast"]),
  // Europe (and Russia, Turkey)
  C_("RUS","Russia","รัสเซีย","Russia","EU",1800,35,-.6,["wildfire","heat","flood"],["ind","fos","arc","for"]),
  C_("DEU","Germany","เยอรมนี","Germany","EU",600,25,.8,["flood","heat"],["ind","rich","tech"]),
  C_("GBR","United Kingdom","สหราชอาณาจักร","United Kingdom","EU",310,25,.8,["flood","heat"],["rich","coast","tech"]),
  C_("FRA","France","ฝรั่งเศส","France","EU",280,30,.8,["heat","drought","flood"],["rich","tech","farm"]),
  C_("ITA","Italy","อิตาลี","Italy","EU",300,40,.6,["heat","flood","drought"],["ind","rich","coast"]),
  C_("POL","Poland","โปแลนด์","Poland","EU",280,25,0,["flood","drought"],["ind","fos","farm"]),
  C_("ESP","Spain","สเปน","Spain","EU",220,45,.7,["heat","drought","wildfire"],["rich","coast","farm"]),
  C_("TUR","Turkey","ตุรกี","Türkiye","EU",450,45,0,["heat","drought","wildfire","flood"],["ind","coast","farm"]),
  C_("UKR","Ukraine","ยูเครน","Ukraine","EU",130,35,.2,["drought","heat"],["farm","ind"]),
  C_("NLD","Netherlands","เนเธอร์แลนด์","Netherlands","EU",130,40,.9,["flood"],["rich","coast","tech","vul"]),
  C_("SWE","Sweden","สวีเดน","Sweden","EU",35,15,.9,["wildfire"],["rich","for","arc","tech"]),
  C_("NOR","Norway","นอร์เวย์","Norway","EU",40,15,.7,["flood"],["rich","fos","arc","coast"]),
  C_("GRC","Greece","กรีซ","Greece","EU",55,45,.5,["wildfire","heat","drought"],["coast"]),
  C_("PRT","Portugal","โปรตุเกส","Portugal","EU",40,40,.7,["wildfire","drought","heat"],["coast"]),
  C_("BEL","Belgium","เบลเยียม","Belgium","EU",90,30,.7,["flood"],["rich","ind"]),
  C_("CZE","Czechia","เช็กเกีย","Czechia","EU",90,20,.3,["flood","drought"],["ind"]),
  C_("ROU","Romania","โรมาเนีย","Romania","EU",70,35,.3,["flood","drought","heat"],["farm"]),
  C_("CHE","Switzerland","สวิตเซอร์แลนด์","Switzerland","EU",35,20,.8,["flood","heat"],["rich","tech"]),
  C_("AUT","Austria","ออสเตรีย","Austria","EU",60,25,.7,["flood","heat"],["rich","ind"]),
  C_("IRL","Ireland","ไอร์แลนด์","Ireland","EU",35,20,.7,["flood"],["rich","tech","coast"]),
  C_("FIN","Finland","ฟินแลนด์","Finland","EU",40,15,.9,["wildfire"],["rich","for","arc","tech"]),
  C_("DNK","Denmark","เดนมาร์ก","Denmark","EU",28,20,.9,["flood"],["rich","coast","tech"]),
  C_("HUN","Hungary","ฮังการี","Hungary","EU",45,30,.2,["drought","heat"],["farm","ind"]),
  C_("ISL","Iceland","ไอซ์แลนด์","Iceland","EU",3,15,.9,["flood"],["rich","arc"]),
  // East Asia
  C_("CHN","China","จีน","China","EA",11900,50,.2,["typhoon","flood","heat","drought"],["ind","tech","coast","farm"]),
  C_("JPN","Japan","ญี่ปุ่น","Japan","EA",1000,55,.5,["typhoon","flood","heat"],["ind","rich","tech","coast"]),
  C_("KOR","South Korea","เกาหลีใต้","South Korea","EA",600,40,.4,["typhoon","heat","flood"],["ind","rich","tech","coast"]),
  C_("TWN","Taiwan","ไต้หวัน","Taiwan","EA",270,55,.5,["typhoon","flood"],["ind","tech","coast"]),
  C_("KAZ","Kazakhstan","คาซัคสถาน","Kazakhstan","EA",250,35,-.2,["drought","heat"],["fos","farm"]),
  C_("UZB","Uzbekistan","อุซเบกิสถาน","Uzbekistan","EA",130,40,0,["drought","heat"],["fos","farm","vul"]),
  C_("MNG","Mongolia","มองโกเลีย","Mongolia","EA",30,45,-.1,["drought"],["fos","vul"]),
  C_("PRK","North Korea","เกาหลีเหนือ","North Korea","EA",30,55,-.5,["flood","typhoon"],["vul"]),
  // South America
  C_("BRA","Brazil","บราซิล","Brazil","SA",480,50,.4,["drought","flood","wildfire"],["for","farm","fos","coast"]),
  C_("ARG","Argentina","อาร์เจนตินา","Argentina","SA",180,40,.1,["drought","flood","heat"],["farm","fos"]),
  C_("COL","Colombia","โคลอมเบีย","Colombia","SA",90,50,.4,["flood","drought"],["for","fos","vul"]),
  C_("CHL","Chile","ชิลี","Chile","SA",80,45,.6,["wildfire","drought"],["coast","tech"]),
  C_("PER","Peru","เปรู","Peru","SA",60,55,.3,["flood","drought"],["for","vul","coast"]),
  C_("VEN","Venezuela","เวเนซุเอลา","Venezuela","SA",90,45,-.3,["flood","drought"],["fos","for"]),
  C_("ECU","Ecuador","เอกวาดอร์","Ecuador","SA",40,50,.3,["flood"],["for","vul","fos"]),
  C_("BOL","Bolivia","โบลิเวีย","Bolivia","SA",22,50,.2,["drought","flood","wildfire"],["for","fos","vul"]),
  C_("URY","Uruguay","อุรุกวัย","Uruguay","SA",7,30,.7,["drought","flood"],["farm"]),
  // Middle East & Africa
  C_("SAU","Saudi Arabia","ซาอุดีอาระเบีย","Saudi Arabia","MEAF",700,55,-.7,["heat","drought"],["fos","rich"]),
  C_("IRN","Iran","อิหร่าน","Iran","MEAF",800,55,-.5,["heat","drought"],["fos","ind"]),
  C_("ZAF","South Africa","แอฟริกาใต้","South Africa","MEAF",400,50,-.1,["drought","heat","flood"],["ind","fos","coast"]),
  C_("EGY","Egypt","อียิปต์","Egypt","MEAF",250,65,0,["heat","drought","saltwater"],["vul","farm","coast"]),
  C_("ARE","United Arab Emirates","สหรัฐอาหรับเอมิเรตส์","United Arab Emirates","MEAF",220,50,-.3,["heat"],["fos","rich","tech"]),
  C_("IRQ","Iraq","อิรัก","Iraq","MEAF",200,65,-.4,["heat","drought"],["fos","vul"]),
  C_("DZA","Algeria","แอลจีเรีย","Algeria","MEAF",180,55,-.3,["drought","heat","wildfire"],["fos"]),
  C_("NGA","Nigeria","ไนจีเรีย","Nigeria","MEAF",130,75,.1,["flood","heat","drought"],["fos","vul","coast"]),
  C_("ISR","Israel","อิสราเอล","Israel","MEAF",60,40,.4,["heat","drought","wildfire"],["tech","rich"]),
  C_("MAR","Morocco","โมร็อกโก","Morocco","MEAF",70,55,.4,["drought","heat"],["farm","coast"]),
  C_("KEN","Kenya","เคนยา","Kenya","MEAF",20,70,.6,["drought","flood"],["vul","farm"]),
  C_("ETH","Ethiopia","เอธิโอเปีย","Ethiopia","MEAF",20,75,.4,["drought","flood"],["vul","farm"]),
  C_("QAT","Qatar","กาตาร์","Qatar","MEAF",100,50,-.4,["heat"],["fos","rich"]),
  C_("KWT","Kuwait","คูเวต","Kuwait","MEAF",100,50,-.5,["heat"],["fos","rich"]),
  C_("COD","Dem. Rep. Congo","ดีอาร์คองโก","DR Congo","MEAF",5,70,.3,["flood","heat"],["for","vul"]),
  C_("OMN","Oman","โอมาน","Oman","MEAF",90,50,-.4,["heat","drought"],["fos","rich","coast"]),
  C_("JOR","Jordan","จอร์แดน","Jordan","MEAF",25,60,.3,["heat","drought"],["vul"]),
  C_("GHA","Ghana","กานา","Ghana","MEAF",20,60,.4,["flood","drought","heat"],["vul","farm","coast"]),
  C_("TZA","Tanzania","แทนซาเนีย","Tanzania","MEAF",13,65,.4,["drought","flood"],["vul","farm"]),
  C_("AGO","Angola","แองโกลา","Angola","MEAF",25,60,-.2,["drought","flood"],["fos","vul"]),
  C_("MOZ","Mozambique","โมซัมบิก","Mozambique","MEAF",9,80,.4,["flood","drought"],["vul","coast"]),
  C_("MDG","Madagascar","มาดากัสการ์","Madagascar","MEAF",4,75,.4,["drought","flood"],["vul","for","coast"]),
  // South & Southeast Asia, Oceania
  C_("IND","India","อินเดีย","India","SEA",3100,70,.1,["heat","flood","typhoon","drought"],["ind","farm","tech","coast"]),
  C_("IDN","Indonesia","อินโดนีเซีย","Indonesia","SEA",730,65,0,["flood","wildfire","saltwater"],["fos","for","coast","vul"]),
  C_("THA","Thailand","ไทย","Thailand","SEA",270,60,.3,["flood","saltwater","drought","heat"],["ind","farm","coast"]),
  C_("VNM","Vietnam","เวียดนาม","Vietnam","SEA",370,70,.2,["typhoon","flood","saltwater"],["ind","farm","coast","vul"]),
  C_("MYS","Malaysia","มาเลเซีย","Malaysia","SEA",270,45,.2,["flood"],["fos","for","ind"]),
  C_("PHL","Philippines","ฟิลิปปินส์","Philippines","SEA",150,80,.4,["typhoon","flood"],["vul","coast"]),
  C_("PAK","Pakistan","ปากีสถาน","Pakistan","SEA",200,80,0,["flood","heat","drought"],["vul","farm"]),
  C_("BGD","Bangladesh","บังกลาเทศ","Bangladesh","SEA",100,85,.3,["flood","typhoon","saltwater"],["vul","coast","farm"]),
  C_("AUS","Australia","ออสเตรเลีย","Australia","SEA",380,45,.2,["wildfire","drought","heat","flood"],["rich","fos","coast"]),
  C_("NZL","New Zealand","นิวซีแลนด์","New Zealand","SEA",30,30,.7,["flood"],["rich","farm","coast"]),
  C_("MMR","Myanmar","เมียนมา","Myanmar","SEA",40,70,0,["typhoon","flood"],["vul","for"]),
  C_("LKA","Sri Lanka","ศรีลังกา","Sri Lanka","SEA",20,60,.3,["flood","drought"],["vul","coast"]),
  C_("KHM","Cambodia","กัมพูชา","Cambodia","SEA",20,65,.2,["flood","drought"],["vul","farm"]),
  C_("SGP","Singapore","สิงคโปร์","Singapore","SEA",45,30,.5,["heat","flood"],["rich","tech","coast"]),
  C_("LAO","Laos","ลาว","Laos","SEA",20,55,.2,["flood","drought"],["vul","for"]),
  C_("NPL","Nepal","เนปาล","Nepal","SEA",15,70,.4,["flood","drought"],["vul","farm"]),
  C_("BRN","Brunei","บรูไน","Brunei","SEA",9,30,-.2,["flood"],["fos","rich","for"]),
  C_("PNG","Papua New Guinea","ปาปัวนิวกินี","Papua New Guinea","SEA",7,60,.3,["flood","drought"],["vul","for","coast"]),
  C_("FJI","Fiji","ฟิจิ","Fiji","SEA",2,75,.8,["typhoon","flood"],["vul","coast"]),
  /* 1.6: 80 more countries (CO₂ weights in Mt, roughly 2022) */
  // Europe and the Caucasus
  C_("SVK","Slovakia","สโลวาเกีย","Slovakia","EU",33,30,.5,["flood","heat"],["ind"]),
  C_("SVN","Slovenia","สโลวีเนีย","Slovenia","EU",13,30,.6,["flood","heat"],["rich"]),
  C_("SRB","Serbia","เซอร์เบีย","Serbia","EU",45,40,.1,["flood","heat","drought"],["ind","fos"]),
  C_("MNE","Montenegro","มอนเตเนโกร","Montenegro","EU",3,35,.3,["wildfire","flood"],["coast"]),
  C_("MDA","Moldova","มอลโดวา","Moldova","EU",5,45,.4,["drought","flood"],["farm","vul"]),
  C_("MKD","Macedonia","มาซิโดเนียเหนือ","North Macedonia","EU",7,40,.3,["wildfire","heat"],["fos"]),
  C_("LUX","Luxembourg","ลักเซมเบิร์ก","Luxembourg","EU",7,20,.7,["flood"],["rich"]),
  C_("LTU","Lithuania","ลิทัวเนีย","Lithuania","EU",12,30,.6,["flood","heat"],["farm"]),
  C_("LVA","Latvia","ลัตเวีย","Latvia","EU",7,30,.6,["flood"],["for"]),
  C_("EST","Estonia","เอสโตเนีย","Estonia","EU",11,30,.6,["flood","wildfire"],["tech","fos"]),
  C_("GEO","Georgia","จอร์เจีย","Georgia","EU",11,45,.3,["flood","wildfire"],["vul"]),
  C_("CYP","Cyprus","ไซปรัส","Cyprus","EU",7,40,.5,["heat","wildfire","drought"],["coast"]),
  C_("HRV","Croatia","โครเอเชีย","Croatia","EU",16,35,.5,["wildfire","heat","flood"],["coast"]),
  C_("BGR","Bulgaria","บัลแกเรีย","Bulgaria","EU",39,40,.3,["heat","flood","drought"],["fos"]),
  C_("BIH","Bosnia and Herz.","บอสเนียและเฮอร์เซโกวีนา","Bosnia & Herzegovina","EU",22,45,.1,["flood","wildfire"],["fos"]),
  C_("BLR","Belarus","เบลารุส","Belarus","EU",57,35,-.2,["flood","heat"],["ind","fos"]),
  C_("AZE","Azerbaijan","อาเซอร์ไบจาน","Azerbaijan","EU",37,45,-.2,["drought","heat"],["fos"]),
  C_("ARM","Armenia","อาร์มีเนีย","Armenia","EU",7,45,.3,["drought","heat"],["vul"]),
  C_("ALB","Albania","แอลเบเนีย","Albania","EU",4,45,.4,["flood","wildfire"],["coast"]),
  C_("XKX","Kosovo","โคโซโว","Kosovo","EU",8,45,.2,["flood","heat"],["fos"]),
  // Middle East and Africa
  C_("ZWE","Zimbabwe","ซิมบับเว","Zimbabwe","MEAF",10,70,.3,["drought","heat"],["vul","farm"]),
  C_("ZMB","Zambia","แซมเบีย","Zambia","MEAF",7,70,.4,["drought","flood"],["vul","farm"]),
  C_("YEM","Yemen","เยเมน","Yemen","MEAF",10,85,0,["drought","heat","flood"],["vul"]),
  C_("UGA","Uganda","ยูกันดา","Uganda","MEAF",6,70,.4,["flood","drought"],["vul","farm"]),
  C_("TUN","Tunisia","ตูนิเซีย","Tunisia","MEAF",29,60,.3,["drought","heat","wildfire"],["coast"]),
  C_("TGO","Togo","โตโก","Togo","MEAF",3,65,.4,["flood","drought"],["vul","coast"]),
  C_("SYR","Syria","ซีเรีย","Syria","MEAF",27,80,-.1,["drought","heat"],["vul","fos"]),
  C_("SWZ","eSwatini","เอสวาตินี","Eswatini","MEAF",1,65,.3,["drought"],["vul","farm"]),
  C_("SSD","S. Sudan","ซูดานใต้","South Sudan","MEAF",2,90,.2,["flood","drought"],["vul"]),
  C_("SDN","Sudan","ซูดาน","Sudan","MEAF",22,85,.1,["drought","heat","flood"],["vul","farm"]),
  C_("SOM","Somalia","โซมาเลีย","Somalia","MEAF",1,90,.3,["drought","flood"],["vul","coast"]),
  C_("SLE","Sierra Leone","เซียร์ราลีโอน","Sierra Leone","MEAF",1,75,.4,["flood"],["vul","coast"]),
  C_("SEN","Senegal","เซเนกัล","Senegal","MEAF",11,65,.5,["drought","flood","saltwater"],["vul","coast"]),
  C_("RWA","Rwanda","รวันดา","Rwanda","MEAF",1.5,65,.6,["flood","drought"],["vul","farm"]),
  C_("NER","Niger","ไนเจอร์","Niger","MEAF",3,85,.3,["drought","heat","flood"],["vul"]),
  C_("NAM","Namibia","นามิเบีย","Namibia","MEAF",4,60,.4,["drought","heat"],["coast"]),
  C_("MUS","Mauritius","มอริเชียส","Mauritius","MEAF",4,60,.6,["hurricane","flood"],["coast"]),
  C_("MRT","Mauritania","มอริเตเนีย","Mauritania","MEAF",4,75,.2,["drought","heat"],["vul","coast"]),
  C_("MLT","Malta","มอลตา","Malta","MEAF",1.6,35,.6,["heat","drought"],["rich","coast"]),
  C_("MLI","Mali","มาลี","Mali","MEAF",6,85,.2,["drought","heat","flood"],["vul","farm"]),
  C_("MWI","Malawi","มาลาวี","Malawi","MEAF",1.5,75,.5,["flood","drought"],["vul","farm"]),
  C_("LBY","Libya","ลิเบีย","Libya","MEAF",60,60,-.3,["heat","drought","flood"],["fos"]),
  C_("LBR","Liberia","ไลบีเรีย","Liberia","MEAF",1,75,.4,["flood"],["vul","for","coast"]),
  C_("LBN","Lebanon","เลบานอน","Lebanon","MEAF",23,60,.2,["wildfire","heat","drought"],["coast"]),
  C_("PSE","Palestine","ปาเลสไตน์","Palestine","MEAF",3,80,.3,["heat","drought"],["vul"]),
  C_("GIN","Guinea","กินี","Guinea","MEAF",4,70,.3,["flood"],["vul"]),
  C_("GAB","Gabon","กาบอง","Gabon","MEAF",4,55,.5,["flood"],["for","fos"]),
  C_("CIV","Côte d'Ivoire","โกตดิวัวร์","Côte d'Ivoire","MEAF",14,65,.4,["flood","heat"],["farm","coast"]),
  C_("COG","Congo","สาธารณรัฐคองโก","Republic of the Congo","MEAF",3,65,.3,["flood"],["for","fos"]),
  C_("TCD","Chad","ชาด","Chad","MEAF",2,90,.2,["drought","heat","flood"],["vul"]),
  C_("CMR","Cameroon","แคเมอรูน","Cameroon","MEAF",9,65,.3,["flood","drought"],["for","farm"]),
  C_("BFA","Burkina Faso","บูร์กินาฟาโซ","Burkina Faso","MEAF",5,85,.3,["drought","heat"],["vul","farm"]),
  C_("BWA","Botswana","บอตสวานา","Botswana","MEAF",7,60,.4,["drought","heat"],["fos"]),
  C_("BEN","Benin","เบนิน","Benin","MEAF",8,65,.4,["flood","drought"],["vul","coast"]),
  C_("BHR","Bahrain","บาห์เรน","Bahrain","MEAF",36,50,-.4,["heat","saltwater"],["fos","rich","coast"]),
  C_("AFG","Afghanistan","อัฟกานิสถาน","Afghanistan","MEAF",11,85,0,["drought","flood"],["vul"]),
  // North America and the Caribbean
  C_("TTO","Trinidad and Tobago","ตรินิแดดและโตเบโก","Trinidad & Tobago","NA",25,45,0,["hurricane","flood"],["fos","coast"]),
  C_("NIC","Nicaragua","นิการากัว","Nicaragua","NA",6,70,.3,["hurricane","flood","drought"],["vul","farm"]),
  C_("HND","Honduras","ฮอนดูรัส","Honduras","NA",10,75,.3,["hurricane","flood","drought"],["vul","farm"]),
  C_("SLV","El Salvador","เอลซัลวาดอร์","El Salvador","NA",7,70,.4,["hurricane","flood"],["vul"]),
  C_("BLZ","Belize","เบลีซ","Belize","NA",.6,70,.6,["hurricane","flood"],["vul","coast"]),
  C_("BHS","Bahamas","บาฮามาส","Bahamas","NA",2,75,.7,["hurricane","saltwater"],["coast","vul"]),
  C_("BRB","Barbados","บาร์เบโดส","Barbados","NA",1.2,70,.8,["hurricane","saltwater"],["coast","vul"]),
  C_("ATG","Antigua and Barb.","แอนติกาและบาร์บูดา","Antigua & Barbuda","NA",.7,75,.8,["hurricane","saltwater"],["coast","vul"]),
  C_("LCA","Saint Lucia","เซนต์ลูเซีย","Saint Lucia","NA",.4,75,.8,["hurricane","flood"],["coast","vul"]),
  C_("GRD","Grenada","เกรเนดา","Grenada","NA",.3,75,.8,["hurricane","flood"],["coast","vul"]),
  // South America
  C_("PRY","Paraguay","ปารากวัย","Paraguay","SA",8,55,.3,["drought","flood","wildfire"],["farm"]),
  C_("GUY","Guyana","กายอานา","Guyana","SA",3,60,.3,["flood","saltwater"],["for","fos","coast"]),
  C_("SUR","Suriname","ซูรินาม","Suriname","SA",2,60,.5,["flood","saltwater"],["for","coast"]),
  // East and Central Asia
  C_("TKM","Turkmenistan","เติร์กเมนิสถาน","Turkmenistan","EA",80,50,-.4,["drought","heat"],["fos"]),
  C_("TJK","Tajikistan","ทาจิกิสถาน","Tajikistan","EA",10,60,.3,["flood","drought"],["vul"]),
  C_("KGZ","Kyrgyzstan","คีร์กีซสถาน","Kyrgyzstan","EA",11,55,.3,["flood","drought"],["vul"]),
  C_("HKG","Hong Kong","ฮ่องกง","Hong Kong","EA",35,40,.3,["typhoon","flood","heat"],["rich","tech","coast"]),
  C_("MAC","Macao","มาเก๊า","Macao","EA",2,45,.3,["typhoon","flood"],["rich","coast"]),
  // South and Southeast Asia and the Pacific
  C_("BTN","Bhutan","ภูฏาน","Bhutan","SEA",1.5,60,.9,["flood"],["for"]),
  C_("MDV","Maldives","มัลดีฟส์","Maldives","SEA",1.8,90,.9,["saltwater","flood"],["vul","coast"]),
  C_("TLS","Timor-Leste","ติมอร์-เลสเต","Timor-Leste","SEA",.6,75,.6,["drought","flood"],["vul","coast"]),
  C_("SLB","Solomon Is.","หมู่เกาะโซโลมอน","Solomon Islands","SEA",.4,85,.9,["typhoon","saltwater"],["vul","coast"]),
  C_("VUT","Vanuatu","วานูอาตู","Vanuatu","SEA",.2,90,.9,["typhoon","saltwater"],["vul","coast"]),
  C_("PLW","Palau","ปาเลา","Palau","SEA",.2,85,.9,["typhoon","saltwater"],["vul","coast"]),
];

/* the rest of each region (small countries) is one pooled entry, shown as "other countries in the region" */
const REST_W = {NA:20, EU:10, EA:10, SA:5, MEAF:60, SEA:8};   // 1.1: 24 more countries came out of these pools · 1.6: 80 more (what is left are tiny states and territories)
const COUNTRY = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));
const COUNTRY_BY_GEO = Object.fromEntries(COUNTRIES.map(c => [c.geo, c.id]));
/* short names for map labels */
const SHORT = {USA:{th:"สหรัฐฯ",en:"USA"}, GBR:{th:"อังกฤษ",en:"UK"}, ARE:{th:"UAE",en:"UAE"}, COD:{th:"คองโก",en:"DR Congo"}, DOM:{th:"โดมินิกัน",en:"Dominican Rep."}, SAU:{th:"ซาอุฯ",en:"Saudi"}, KOR:{th:"เกาหลีใต้",en:"S. Korea"}, PRK:{th:"เกาหลีเหนือ",en:"N. Korea"}, ZAF:{th:"แอฟริกาใต้",en:"S. Africa"}, NZL:{th:"นิวซีแลนด์",en:"NZ"}};

Object.assign(SHORT, {BIH:{th:"บอสเนียฯ",en:"Bosnia"}, TTO:{th:"ตรินิแดดฯ",en:"Trinidad"}, ATG:{th:"แอนติกาฯ",en:"Antigua"}, SLB:{th:"โซโลมอน",en:"Solomons"}, COG:{th:"คองโก (บราซซาวีล)",en:"Congo"}, MKD:{th:"มาซิโดเนียเหนือ",en:"N. Macedonia"}});   // 1.6
/* ---------------- Local weather (hazards) ---------------- */
const HAZARDS = {
  hurricane:{icon:"tornado",         snd:"storm",  name:{th:"พายุเฮอริเคน",en:"Hurricane"},       ep:18, appr:2.2, vuln:3, co2:0,
    fact:{th:"พายุเฮอริเคนในมหาสมุทรแอตแลนติกมีแนวโน้มแรงขึ้น เพราะผิวน้ำทะเลที่อุ่นขึ้นเป็นพลังงานให้พายุ",en:"Atlantic hurricanes are getting stronger because warmer sea water feeds them energy."}},
  typhoon:  {icon:"cloud-lightning", snd:"storm",  name:{th:"พายุไต้ฝุ่น",en:"Typhoon"},          ep:16, appr:2, vuln:3, co2:0,
    fact:{th:"ไต้ฝุ่นคือพายุหมุนเขตร้อนชนิดเดียวกับเฮอริเคน แต่เกิดในมหาสมุทรแปซิฟิกตะวันตก",en:"A typhoon is the same kind of tropical storm as a hurricane, but in the western Pacific."}},
  flood:    {icon:"cloud-rain-wind", snd:"flood",  name:{th:"น้ำท่วมใหญ่",en:"Major flood"},      ep:14, appr:1.8, vuln:2, co2:0,
    fact:{th:"อากาศที่อุ่นขึ้น 1°C เก็บไอน้ำได้มากขึ้นราว 7% ฝนแต่ละครั้งจึงหนักขึ้น",en:"Air 1°C warmer holds about 7% more water vapour, so downpours get heavier."}},
  heat:     {icon:"thermometer-sun", snd:"heat",   name:{th:"คลื่นความร้อน",en:"Heatwave"},       ep:8,  appr:1.6, vuln:1, co2:.05,
    fact:{th:"คลื่นความร้อนทำให้คนเปิดแอร์พร้อมกัน ความต้องการไฟฟ้าพุ่ง และโรงไฟฟ้าฟอสซิลต้องเดินเครื่องเพิ่ม",en:"Heatwaves make everyone switch on air-con at once, so fossil plants run harder."}},
  drought:  {icon:"sun",             snd:"wind",   name:{th:"ภัยแล้ง",en:"Drought"},              ep:12, appr:1.4, vuln:2, co2:0,
    fact:{th:"ภัยแล้งยาวนานทำให้ผลผลิตเกษตรลดลงและราคาอาหารสูงขึ้นทั่วโลก",en:"Long droughts cut harvests and push up food prices worldwide."}},
  wildfire: {icon:"flame",           snd:"fire",   name:{th:"ไฟป่า",en:"Wildfire"},               ep:10, appr:1.6, vuln:2, co2:.12,
    fact:{th:"ไฟป่าใหญ่ปล่อยคาร์บอนที่ต้นไม้เก็บไว้หลายสิบปีกลับสู่อากาศภายในไม่กี่วัน",en:"Big wildfires release carbon that trees stored for decades in just days."}},
  saltwater:{icon:"waves",           snd:"ocean",  name:{th:"น้ำเค็มรุก",en:"Saltwater intrusion"}, ep:10, appr:1.2, vuln:2, co2:0,
    fact:{th:"เมื่อน้ำทะเลสูงขึ้นและน้ำจืดในแม่น้ำน้อยลง น้ำเค็มจะดันเข้ามาไกลขึ้น ทำลายนาข้าวและน้ำประปา",en:"Rising seas and low rivers let salt water push further inland, ruining rice fields and tap water."}},
};

/* ---------------- Country events (templates) ----------------
   A = the countries that PROPOSE, B = the countries that OBJECT. Each run picks the countries from the
   tagged pools, preferring countries that have had that role less often, so every country gets both roles.
   fx keys as usual, plus relA / relB (relation change) and cA / cB (fraction of those countries' CO₂, e.g. −0.05). */
const CE = (id, poolA, poolB, title, desc, ...options) => ({id, poolA, poolB, title, desc, options});
const CO = (th, en, fx) => ({label:{th, en}, fx});
const CEVENTS = [
  CE("CE_BATTERY",["ind","tech"],["vul","farm","coast"],{th:"นิคมโรงงานแบตเตอรี่ข้ามชาติ",en:"A Cross-Border Battery Factory Complex"},
    {th:"{A} ร่วมกันเสนอสร้างนิคมโรงงานแบตเตอรี่ แต่ {B} คัดค้าน เพราะกังวลเรื่องมลพิษและการแข่งขันทางการค้า",en:"{A} jointly propose a giant battery factory complex, but {B} object over pollution and trade competition."},
    CO("อนุมัติ","Approve it",{ep:30,co2:.3,relA:15,relB:-15}),
    CO("ปฏิเสธ","Reject it",{relA:-20,pc:-10}),
    CO("อนุมัติแบบมีเงื่อนไข: ต้องใช้พลังงานสะอาด","Approve only if it runs on clean power",{ep:-40,co2:.05,relA:5,relB:5})),
  CE("CE_COAL",["ind","fos"],["vul"],{th:"แผนสร้างโรงไฟฟ้าถ่านหินใหม่",en:"New Coal Power Plants"},
    {th:"{A} ต้องการโรงไฟฟ้าถ่านหินเพิ่มเพื่อเร่งเศรษฐกิจ ขณะที่ {B} ซึ่งเสี่ยงภัยพิบัติสูงประท้วงอย่างหนัก",en:"{A} want more coal power to grow their economies, while highly exposed {B} protest loudly."},
    CO("ยอมให้สร้าง","Let them build",{co2:.6,relA:15,relB:-20,appr:-4}),
    CO("ไม่อนุญาต แต่ช่วยทุนโซลาร์แทน","Say no, but fund solar instead",{ep:-60,relA:-5,relB:10,co2:-.1}),
    CO("ตกลงเลิกใช้แบบมีกำหนดเวลา","Agree a phase-out timetable",{pc:-15,co2:.2,relA:5,relB:5,delay:{m:24,fx:{co2:-.5}}})),
  CE("CE_DAM",["ind","farm"],["vul","farm"],{th:"เขื่อนยักษ์บนแม่น้ำนานาชาติ",en:"A Mega-Dam on a Shared River"},
    {th:"{A} อยู่ต้นน้ำและต้องการสร้างเขื่อนพลังน้ำ แต่ {B} ซึ่งอยู่ปลายน้ำกลัวน้ำแล้งและปลาหายไป",en:"Upstream {A} want a hydropower dam; downstream {B} fear drought and vanishing fish."},
    CO("สนับสนุนเขื่อน","Back the dam",{co2:-.2,relA:15,relB:-20,cB:.02}),
    CO("เป็นคนกลางทำสนธิสัญญาแบ่งน้ำ","Broker a water-sharing treaty",{pc:-20,relA:5,relB:10}),
    CO("คัดค้านเขื่อน","Oppose the dam",{relA:-20,relB:10})),
  CE("CE_FOREST",["for","farm"],["rich","tech"],{th:"สัมปทานตัดป่าเพื่อการส่งออก",en:"Logging for Export Farmland"},
    {th:"{A} ต้องการเปิดป่าทำไร่ส่งออกเพื่อหารายได้ แต่ {B} ขู่จะคว่ำบาตรสินค้าที่มาจากการทำลายป่า",en:"{A} want to clear forest for export crops; {B} threaten to boycott goods from deforested land."},
    CO("ปล่อยให้ตัดป่า","Allow the clearing",{co2:.5,tip:3,relA:15,relB:-15}),
    CO("จ่ายค่าตอบแทนให้รักษาป่า","Pay them to keep the forest",{ep:-70,relA:10,relB:5,cA:-.04}),
    CO("สนับสนุนการคว่ำบาตร","Back the boycott",{relA:-20,relB:10,pc:-5,cA:-.06})),
  CE("CE_CBAM",["rich"],["ind","fos"],{th:"สงครามภาษีคาร์บอนชายแดน",en:"A Carbon Border Tax Fight"},
    {th:"{A} จะเก็บภาษีคาร์บอนจากสินค้านำเข้า {B} ขู่ตอบโต้ทางการค้า",en:"{A} plan a carbon tax on imports. {B} threaten trade retaliation."},
    CO("หนุนภาษีคาร์บอน","Support the tax",{relA:10,relB:-15,cB:-.04,pc:-5}),
    CO("ขอให้ชะลอ 5 ปี","Ask for a 5-year delay",{relA:-10,relB:10}),
    CO("ให้รายได้ภาษีกลับไปช่วยผู้ส่งออก","Return the revenue to help exporters go green",{ep:-30,relA:5,relB:5,cB:-.03})),
  CE("CE_REFUGEE",["vul"],["rich"],{th:"ผู้อพยพจากภัยภูมิอากาศ",en:"Climate Refugees"},
    {th:"{A} ขอให้นานาชาติรับผู้อพยพที่บ้านจมน้ำและไร่แห้ง แต่ {B} ไม่ต้องการรับเพิ่ม",en:"{A} ask the world to take in people whose homes flooded or fields dried up; {B} refuse more arrivals."},
    CO("กดดันให้รับผู้อพยพ","Push them to accept refugees",{relA:15,relB:-15,appr:3}),
    CO("ตั้งกองทุนช่วยในพื้นที่แทน","Fund help where people live instead",{ep:-50,relA:10,relB:5}),
    CO("ไม่แทรกแซง","Stay out of it",{relA:-20,appr:-3})),
  CE("CE_SEABED",["tech","ind"],["coast","vul"],{th:"ขุดแร่ใต้ทะเลลึกเพื่อทำแบตเตอรี่",en:"Deep-Sea Mining for Battery Metals"},
    {th:"{A} ต้องการขุดแร่ใต้ทะเลลึกเพื่อผลิตแบตเตอรี่ราคาถูก แต่ {B} กลัวระบบนิเวศทะเลพัง",en:"{A} want to mine the deep seabed for cheap battery metals; {B} fear wrecking the ocean."},
    CO("อนุญาต","Allow it",{disc:{E3:.2},relA:12,relB:-15,tip:2}),
    CO("พักไว้จนกว่าจะมีงานวิจัย","Pause it until the science is in",{relA:-10,relB:12}),
    CO("ให้ทุนรีไซเคิลแบตเตอรี่แทน","Fund battery recycling instead",{ep:-45,relA:5,relB:8})),
  CE("CE_NUKE",["tech","ind"],["vul","farm"],{th:"โรงไฟฟ้านิวเคลียร์ใกล้ชายแดน",en:"A Nuclear Plant Near the Border"},
    {th:"{A} จะสร้างโรงไฟฟ้านิวเคลียร์ใกล้ชายแดน {B} กังวลเรื่องอุบัติเหตุและกากกัมมันตรังสี",en:"{A} will build a nuclear plant near the border. {B} worry about accidents and waste."},
    CO("สนับสนุน","Support it",{cA:-.06,relA:12,relB:-15,appr:-2}),
    CO("ให้ตรวจความปลอดภัยร่วมกัน","Require joint safety inspections",{pc:-12,cA:-.04,relA:5,relB:8}),
    CO("คัดค้าน","Oppose it",{relA:-15,relB:10})),
  CE("CE_ARCTIC",["fos","arc"],["vul","rich"],{th:"ขุดเจาะน้ำมันในอาร์กติก",en:"Arctic Oil Drilling"},
    {th:"น้ำแข็งที่ละลายเปิดทางให้ {A} ขุดเจาะน้ำมันในอาร์กติก {B} เรียกร้องให้ห้าม",en:"Melting ice lets {A} drill for Arctic oil. {B} demand a ban."},
    CO("ปล่อยให้ขุดเจาะ","Let them drill",{co2:.5,ep:20,relA:15,relB:-20,tip:3}),
    CO("ผลักดันข้อห้ามสากล","Push for a global ban",{pc:-25,relA:-20,relB:15}),
    CO("แลกกับการลงทุนพลังงานสะอาด","Trade it for clean-energy investment",{relA:5,relB:-5,cA:-.03,co2:.2})),
  CE("CE_LOSS",["vul"],["rich","fos"],{th:"กองทุนความสูญเสียและความเสียหาย",en:"The Loss and Damage Fund"},
    {th:"{A} เรียกร้องให้ประเทศที่ปล่อยมากจ่ายค่าเสียหายจากภัยภูมิอากาศ แต่ {B} ปฏิเสธ",en:"{A} demand that big emitters pay for climate damage; {B} refuse."},
    CO("บีบให้จ่าย","Make them pay",{relA:15,relB:-15,ep:40,vuln:{T:-5}}),
    CO("ใช้งบ GCT จ่ายส่วนหนึ่ง","Pay part of it from the GCT budget",{ep:-60,relA:15,relB:5}),
    CO("เลื่อนการเจรจา","Postpone the talks",{relA:-15,appr:-3})),
  CE("CE_SOLARWAR",["tech","ind"],["ind","rich"],{th:"สงครามราคาแผงโซลาร์",en:"The Solar Panel Price War"},
    {th:"{A} ขายแผงโซลาร์ราคาถูกมาก {B} ต้องการตั้งกำแพงภาษีเพื่อปกป้องโรงงานของตัวเอง",en:"{A} sell solar panels very cheaply; {B} want tariffs to protect their own factories."},
    CO("ปล่อยให้แผงราคาถูกไหลเข้า","Let cheap panels flow",{co2:-.4,relA:12,relB:-15}),
    CO("หนุนกำแพงภาษี","Back the tariffs",{relA:-15,relB:12,co2:.1}),
    CO("ตั้งโรงงานร่วมทุน","Set up joint-venture factories",{ep:-40,relA:6,relB:6,co2:-.2})),
  CE("CE_GEOENG",["tech","rich"],["vul","farm"],{th:"ทดลองพ่นละอองบังแดดในชั้นบรรยากาศ",en:"A Sun-Dimming Experiment"},
    {th:"{A} จะทดลองพ่นละอองในชั้นบรรยากาศเพื่อลดความร้อน {B} กลัวว่าฝนมรสุมจะเปลี่ยน",en:"{A} plan to spray particles high in the sky to cool Earth. {B} fear their monsoon rains will shift."},
    CO("อนุมัติการทดลอง","Approve the trial",{temp:-.04,relA:10,relB:-20,vuln:{T:5}}),
    CO("ทดลองเล็ก ๆ ภายใต้การกำกับดูแล","A small, supervised trial",{pc:-15,temp:-.01,relA:5,relB:-5}),
    CO("ห้ามทดลอง","Ban it",{relA:-15,relB:12})),
  CE("CE_MARINE",["coast","rich"],["coast","farm"],{th:"เขตคุ้มครองทะเลขนาดใหญ่",en:"A Huge Marine Reserve"},
    {th:"{A} เสนอเขตคุ้มครองทะเลขนาดใหญ่เพื่อฟื้นฟูปลาและปะการัง {B} ซึ่งพึ่งพาการประมงคัดค้าน",en:"{A} propose a vast marine reserve to restore fish and coral. Fishing nations {B} object."},
    CO("ประกาศเขตคุ้มครอง","Declare the reserve",{tip:-3,relA:12,relB:-15,appr:2}),
    CO("ประกาศพร้อมเงินชดเชยชาวประมง","Declare it and compensate fishers",{ep:-50,tip:-3,relA:10,relB:5}),
    CO("ไม่ประกาศ","Drop the idea",{relA:-15,relB:10})),
  CE("CE_PALM",["for","farm"],["rich"],{th:"ขยายไร่ปาล์มทำไบโอดีเซล",en:"Palm Oil for Biodiesel"},
    {th:"{A} จะขยายไร่ปาล์มเพื่อผลิตไบโอดีเซล {B} บอกว่าเป็นการทำลายป่าฝนแบบใหม่",en:"{A} will expand palm plantations for biodiesel. {B} call it deforestation in disguise."},
    CO("หนุนไบโอดีเซล","Back the biodiesel plan",{co2:-.2,tip:2,relA:12,relB:-12}),
    CO("ให้ปลูกเฉพาะบนพื้นที่เสื่อมโทรม","Only on already-degraded land",{pc:-10,co2:-.1,relA:5,relB:5}),
    CO("ห้ามขยายไร่","Block the expansion",{relA:-18,relB:10})),
  CE("CE_DATA",["tech","rich"],["vul","coast"],{th:"ศูนย์ข้อมูล AI ใช้ก๊าซธรรมชาติ",en:"Gas-Powered AI Data Centres"},
    {th:"{A} กำลังสร้างศูนย์ข้อมูล AI ขนาดยักษ์ที่ใช้ไฟจากก๊าซ {B} เรียกร้องให้ใช้พลังงานสะอาด",en:"{A} are building giant AI data centres on gas power. {B} demand clean electricity."},
    CO("ปล่อยไปก่อน เศรษฐกิจโต","Let it run, the economy grows",{co2:.4,ep:25,relA:10,relB:-12}),
    CO("บังคับให้ซื้อไฟสะอาด","Make them buy clean power",{relA:-10,relB:10,cA:-.02}),
    CO("ให้ใช้ความร้อนทิ้งทำระบบทำความร้อนในเมือง","Reuse the waste heat to warm cities",{ep:-30,relA:6,relB:6,co2:.1})),
  CE("CE_RAIL",["rich","tech"],["vul","farm"],{th:"รถไฟความเร็วสูงข้ามประเทศ",en:"A Cross-Border High-Speed Railway"},
    {th:"{A} เสนอรถไฟความเร็วสูงเชื่อมหลายประเทศ {B} กังวลเรื่องหนี้และการเวนคืนที่ดิน",en:"{A} propose a high-speed line across borders. {B} worry about debt and land seizures."},
    CO("ผลักดันโครงการ","Push the project",{co2:-.3,relA:12,relB:-12,pc:-8}),
    CO("ให้ GCT ร่วมจ่ายเพื่อลดหนี้","Co-fund it to cut the debt",{ep:-55,co2:-.3,relA:8,relB:8}),
    CO("พักโครงการ","Shelve it",{relA:-12,relB:6})),
];
/* the example from the planning board: always used the first time this event appears */
const CE_FIXED = {CE_BATTERY:{A:["CHN","KOR","JPN"], B:["THA","USA","IND"]}};

/* ---------------- Characters ---------------- */
const CHARS = [
  {id:"sci", price:0,   icon:"flask-conical", color:"#5fd39a",
   name:{th:"นักวิทยาศาสตร์",en:"The Scientist"}, person:{th:"ดร.ภูผา",en:"Dr. Phupha"},
   pas:{th:"สกิลหมวดพลังงานถูกลง 8%",en:"Energy skills cost 8% less"},
   acts:[{id:"sci1", cd:42, icon:"lightbulb", name:{th:"ค้นพบใหม่",en:"Breakthrough"}, desc:{th:"สกิลถัดไปที่ซื้อจะทยอยผลเสร็จทันที และไม่นับโควตา 3 โครงการ",en:"The next skill you buy rolls out instantly and ignores the 3-project limit"}},
         {id:"sci2", cd:96, lv:5, icon:"flask-round", name:{th:"ทุนวิจัยเร่งด่วน",en:"Research Sprint"}, desc:{th:"สกิลถัดไปที่ซื้อถูกลง 5%",en:"The next skill you buy costs 5% less"}}]},
  {id:"dip", price:249, icon:"handshake", color:"#8fd0ff",
   name:{th:"นักการทูต",en:"The Diplomat"}, person:{th:"ทูตวารี",en:"Ambassador Waree"},
   pas:{th:"มิตรภาพกับทุกประเทศขึ้นเร็วขึ้น 4%",en:"Friendship rises 4% faster"},
   acts:[{id:"dip1", cd:42, icon:"users", name:{th:"ประชุมสุดยอด",en:"Summit"}, desc:{th:"ทุกประเทศในทวีปที่เลือกได้มิตรภาพ +3",en:"Every country in the selected region gets friendship +3"}},
         {id:"dip2", cd:48, lv:5, icon:"heart-handshake", name:{th:"ทูตสันถวไมตรี",en:"Goodwill Tour"}, desc:{th:"ยกเลิกการคว่ำบาตรทั้งหมด และประเทศที่โกรธเรามิตรภาพ +5",en:"Ends every sanction; angry countries' friendship +5"}}]},
  {id:"eco", price:249, icon:"chart-candlestick", color:"#f2b441",
   name:{th:"นักเศรษฐศาสตร์",en:"The Economist"}, person:{th:"คุณธารา",en:"Tara"},
   pas:{th:"รายได้ [[$money]] ต่อเดือน +5% (เลเวล 3: 6%)",en:"[[$money]] monthly income +5% (level 3: 6%)"},
   acts:[{id:"eco1", cd:30, icon:"banknote", name:{th:"พันธบัตรสีเขียว",en:"Green Bonds"}, desc:{th:"ได้ [[$money]] +100 ทันที แล้วผ่อนคืนเดือนละ 8 เป็นเวลา 12 เดือน",en:"[[$money]] +100 now, repaid at 8 a month for 12 months"}},
         {id:"eco2", cd:72, lv:5, icon:"arrow-left-right", name:{th:"ตลาดคาร์บอน",en:"Carbon Market"}, desc:{th:"แลก [[$policy]] 15 เป็น [[$money]] 40",en:"Trade [[$policy]] 15 for [[$money]] 40"}}]},
  {id:"act", price:249, icon:"megaphone", color:"#ff8a7a",
   name:{th:"นักเคลื่อนไหว",en:"The Activist"}, person:{th:"น้องเมฆ",en:"Mek"},
   pas:{th:"ความนิยมลดช้าลง 5% (เลเวล 3: 7%)",en:"Approval falls 5% slower (level 3: 7%)"},
   acts:[{id:"act1", cd:48, icon:"megaphone", name:{th:"รณรงค์ใหญ่",en:"Mass Campaign"}, desc:{th:"ความนิยม +2% ทันที (ก่อนหักกฎความนิยมเพิ่มยาก)",en:"Approval +2% now (before the slower-gain rule)"}},
         {id:"act2", cd:60, lv:5, icon:"sprout", name:{th:"พลังเยาวชน",en:"Youth Power"}, desc:{th:"ความพอใจของคนรุ่นใหม่ +10",en:"Young people's mood +10"}}]},
];
const CHAR = Object.fromEntries(CHARS.map(c => [c.id, c]));
/* XP needed for each level (level 1 at 0 XP … level 10) */
const LEVELS = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700];
const levelOf = xp => { let l = 1; LEVELS.forEach((v, i) => { if (xp >= v) l = i + 1; }); return l; };

/* ---------------- Shop (prices in Terra) ---------------- */
const SHOP = [
  {id:"speed3", price:199, icon:"fast-forward", kind:"unlock", name:{th:"ความเร็ว x3",en:"Speed x3"}, desc:{th:"เพิ่มปุ่มความเร็ว x3 ในเกม (ถาวร)",en:"Adds a x3 speed button (permanent)"}},
  {id:"char_dip", price:249, icon:"handshake", kind:"char", name:{th:"ตัวละคร: นักการทูต",en:"Character: The Diplomat"}},
  {id:"char_eco", price:249, icon:"chart-candlestick", kind:"char", name:{th:"ตัวละคร: นักเศรษฐศาสตร์",en:"Character: The Economist"}},
  {id:"char_act", price:249, icon:"megaphone", kind:"char", name:{th:"ตัวละคร: นักเคลื่อนไหว",en:"Character: The Activist"}},
  {id:"theme_night", price:99, icon:"moon", kind:"theme", name:{th:"ธีมแผนที่กลางคืน",en:"Night map theme"}, desc:{th:"ทะเลสีเข้มและแสงไฟเมือง",en:"Dark seas and city lights"}},
  {id:"theme_paint", price:99, icon:"palette", kind:"theme", name:{th:"ธีมแผนที่ภาพวาด",en:"Painted map theme"}, desc:{th:"สีพาสเทลแบบภาพสีน้ำ",en:"Soft watercolour colours"}},
  {id:"outfit", price:149, icon:"shirt", kind:"outfit", name:{th:"ชุดตัวละครแบบใหม่",en:"New character outfits"}, desc:{th:"ชุดสีใหม่สำหรับตัวละครทุกตัว",en:"A new outfit for every character"}},
  {id:"frame", price:79, icon:"square-dashed", kind:"frame", name:{th:"กรอบโปรไฟล์ทองบน Leaderboard",en:"Gold Leaderboard frame"}, desc:{th:"ชื่อของคุณมีกรอบสีทองในตารางอันดับ",en:"Your name gets a gold frame on the leaderboard"}},
];
const PRICE = {rename:49};

/* ---------------- Story: 3 acts, shown as comic panels ---------------- */
const STORY = [
  {act:1, at:0, title:{th:"องก์ 1 · ตั้งหลัก",en:"Act 1 · Taking Charge"}, panels:[
    {icon:"landmark", bg:"#12324a", who:"adv", say:{th:"ยินดีต้อนรับสู่ GCT ค่ะ ทุกประเทศลงมติให้คุณเป็นผู้นำภารกิจนี้",en:"Welcome to the GCT. Every nation voted for you to lead this mission."}},
    {icon:"thermometer", bg:"#3b2412", who:"adv", say:{th:"โลกร้อนขึ้นแล้ว 1.2°C ถ้าถึง 3°C ระบบธรรมชาติจะพังจนกู้คืนไม่ได้",en:"Earth is already 1.2°C warmer. At 3°C, nature's systems collapse for good."}},
    {icon:"handshake", bg:"#13362b", who:"me", say:{th:"ตอนนี้ทุกประเทศยังเชื่อใจเรา ต้องใช้โอกาสนี้ให้คุ้มที่สุด",en:"The world still trusts us. We have to make the most of it."}},
    {icon:"flag", bg:"#1d2a44", who:"adv", say:{th:"เป้าหมายคือ Net Zero ก่อนสิ้นปี 2050 เริ่มจากสกิลแรกได้เลยค่ะ",en:"The goal: Net Zero before the end of 2050. Start with your first skill."}},
  ]},
  {act:2, at:108, title:{th:"องก์ 2 · แรงต้าน",en:"Act 2 · Pushback"}, panels:[
    {icon:"cloud-lightning", bg:"#2a2140", who:"adv", say:{th:"ปี 2035 แล้ว ภัยพิบัติมาถี่ขึ้นทุกปี หลายประเทศเริ่มโทษกันเอง",en:"It's 2035. Disasters hit more often and countries are blaming each other."}},
    {icon:"megaphone", bg:"#3a1a1a", who:"adv", say:{th:"มีกลุ่มการเมืองพยายามล้มคุณ ถ้าความนิยมเหลือ 0% คุณจะถูกถอดถอน",en:"A political group is trying to bring you down. Hit 0% approval and you're out."}},
    {icon:"shield-check", bg:"#143029", who:"me", say:{th:"เราต้องช่วยประเทศที่เดือดร้อนให้ทัน และทำให้ทุกคนเห็นว่าทางนี้ได้ผล",en:"We must help the countries in trouble fast, and show everyone this works."}},
  ]},
  {act:3, at:228, title:{th:"องก์ 3 · เส้นชัย",en:"Act 3 · The Finish Line"}, panels:[
    {icon:"hourglass", bg:"#2b2a16", who:"adv", say:{th:"ปี 2045 เหลือเวลาอีกแค่ 6 ปี การตัดสินใจจากนี้จะกำหนดว่าโลกจะจบแบบไหน",en:"It's 2045. Six years left. Every choice now decides how this ends."}},
    {icon:"sunrise", bg:"#15344a", who:"me", say:{th:"ไม่ว่าผลจะออกมาอย่างไร เราจะไม่ยอมแพ้จนวันสุดท้าย",en:"Whatever happens, we keep going until the very last day."}},
  ]},
];
const ADVISOR = {name:{th:"ดร.ฟ้าใส · ที่ปรึกษา GCT",en:"Dr. Fasai · GCT Advisor"}};

/* ---------------- Endings ---------------- */
const ENDINGS = {
  win:{img:"end-win", grades:{S:{th:"เกรด S · โลกฟื้นคืน",en:"Grade S · A World Restored"}, A:{th:"เกรด A · ทันเวลา",en:"Grade A · Just in Time"}, B:{th:"เกรด B · ชนะแบบเฉียดฉิว",en:"Grade B · A Narrow Win"}},
    amb:"birds", music:"music-menu.mp3"},
  l1:{img:"end-heat", amb:"fire"},
  l2:{img:"end-vote", amb:"crowd"},
  l3:{img:"end-time", amb:"wind"},
};
const gradeOf = temp => temp < 1.6 ? "S" : temp < 2.0 ? "A" : "B";

/* ---------------- Terra rewards (shown in the UI; the server decides the real amount) ---------------- */
const TERRA = {win:30, l3:12, l2:6, l1:4, bonusMax:15, capGame:45, capHard:67, hardMult:1.5};

Object.assign(P, {COUNTRIES, COUNTRY, COUNTRY_BY_GEO, REST_W, SHORT, HAZARDS, CEVENTS, CE_FIXED, CHARS, CHAR, LEVELS, levelOf, SHOP, PRICE, STORY, ADVISOR, ENDINGS, gradeOf, TERRA});
