const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.changelog) return;
(P.mods = P.mods || {}).changelog = 1;
/* ===== Data · Update log (shown on the main menu). Written for players, not programmers. Newest first. ===== */
const V = (v, date, name, th, en) => ({v, date, name, items:{th, en}});
P.CHANGELOG = [
  V("1.0", "2026-10-21", {th:"โลกที่มีชีวิต", en:"A Living World"}, [
    "เกมเปลี่ยนชื่อเป็น Project Zero พร้อมโลโก้และภาพตัวอย่างเวลาแชร์ลิงก์แบบใหม่",
    "โหมดใหม่ “โลกต่อเนื่อง” เล่นได้ไม่มีวันจบ มีฤดูกาล เป้าหมายรายฤดู และการประชุม COP ทุกปี ปลดล็อกเมื่อชนะภารกิจ 2050 ครั้งแรก และกด “เล่นโลกนี้ต่อ” ตอนชนะได้ทันที",
    "แร่: พลังงานสะอาดต้องใช้แร่ เช่น ลิเทียมและแร่หายาก ได้จากประเทศที่เป็นมิตร ฟองสีส้ม และการสั่งซื้อ ถ้าประเทศผู้ผลิตห้ามส่งออกก็ต้องหาทางอื่น",
    "สิ่งที่สร้างขึ้นบนแผนที่จริง: กังหันลม โซลาร์ฟาร์ม โรงไฟฟ้า ป่าปลูกใหม่ และอีกหลายอย่าง ปักลงในประเทศที่เหมาะ",
    "เครื่องบินและเรือวิ่งไปมาระหว่างประเทศ พาเทคโนโลยีสีเขียวจากประเทศหนึ่งไปอีกประเทศ เรือต้องอ้อมเมื่อคลองหรือช่องแคบถูกปิด",
    "เหตุการณ์จากข่าวจริง 35 เรื่อง บอกปีและแหล่งข่าว และทุกเหตุการณ์มีภาพประกอบของตัวเอง",
    "หน้าความรู้ใหม่ “ทรัพยากร” บอกว่าแร่และวัตถุดิบแต่ละอย่างมาจากไหน ใช้ทำอะไร",
    "หน้าสถิติมี “ผลงานของคุณ”: เทียบโลกของเรากับโลกที่ไม่ได้ทำอะไรเลย ดูว่าการลด CO₂ มาจากส่วนไหน และไทม์ไลน์ช่วงสำคัญ",
    "ในโลกต่อเนื่อง: ตั้งฐานบัญชาการ ส่งทูตไปประจำประเทศได้ 3 คน และสะสมดาวเกียรติยศ",
    "ในโลกต่อเนื่อง แร่แยกเป็น 5 กลุ่ม (แร่แบตเตอรี่ แร่หายาก ทองแดง ซิลิคอนและทราย ยูเรเนียม) แต่ละสกิลใช้สูตรต่างกัน มีตลาดแร่โลกให้ซื้อขาย ราคาขึ้นลงตามการซื้อและการห้ามส่งออก",
    "ในโลกต่อเนื่อง วางกังหันลม โซลาร์ฟาร์ม โรงไฟฟ้าความร้อนใต้พิภพ และโรงไฟฟ้านิวเคลียร์เองบนตารางหกเหลี่ยม ช่องสีเขียวคือที่เหมาะ วางถูกที่ได้ผลมากกว่า",
    "ความสำเร็จใหม่ 7 อย่าง และบทสอนเล่นเพิ่มเรื่องแร่ เครื่องบิน และเรือ",
    "โหมด Hard Core ยากขึ้นจริง: ภัยพิบัติแรงขึ้นและรายได้น้อยลงเล็กน้อย",
    "เปลี่ยนชื่อค่าในเกมให้เข้าใจง่าย: เงิน แต้มนโยบาย แร่ ความนิยม ทำตามแผน มิตรภาพ และเพชร พร้อมไอคอนแบบ 3 มิติ",
    "รายละเอียดสกิลบอกชัดว่าค่าไหนเพิ่มหรือลด เป็นแถวสีเขียว (ผลดี) และสีแดง (ผลเสีย)",
    "เกมยาวขึ้นเป็นราว 45 นาทีที่ความเร็วปกติ มีเวลาคิดมากขึ้น",
    "ตั้งค่ากราฟิกได้ 3 ระดับ และเกมลดระดับให้เองถ้าเครื่องเล่นไม่ลื่น แผนที่ลื่นขึ้นมาก",
    "ฤดูกาลมีผลกับภัยพิบัติ: มรสุม ฤดูพายุ หน้าร้อน และฤดูไฟป่า",
    "เอารหัสเซฟออก ถ้าจะเล่นต่อบนเครื่องอื่นให้ใช้เซฟบนคลาวด์",
  ], [
    "The game is now called Project Zero, with a new logo and a new preview picture for shared links.",
    "New “Continuous World” mode with no end year: seasons, season goals and a yearly COP summit. Unlocks after your first Mission 2050 win; you can also press “Keep playing this world” when you win.",
    "Minerals: clean energy needs minerals such as lithium and rare earths. Get them from friendly countries, orange bubbles and purchase orders — and find another way when a producer bans exports.",
    "What you build appears on the real map: wind turbines, solar farms, power plants, new forests and more, placed in suitable countries.",
    "Planes and ships travel between countries and carry green technology from one to the next. Ships take the long way round when a canal or strait is closed.",
    "35 events from real news, each with its year and source, and every event now has its own picture.",
    "New learning page, “Resources”: where each mineral and raw material comes from and what it is used for.",
    "The statistics panel now shows “Your impact”: your world against a world where nothing was done, where the cuts came from, and a timeline of key moments.",
    "In Continuous World: set a home base, send up to 3 ambassadors, and collect Prestige stars.",
    "In Continuous World, minerals split into 5 groups (battery minerals, rare earths, copper, silicon & sand, uranium); each skill has its own recipe, and a world market lets you buy and sell, with prices that move with demand and export bans.",
    "In Continuous World, place wind farms, solar farms, geothermal and nuclear plants yourself on a hex grid. Green cells are good spots, and good spots cut more CO₂.",
    "7 new achievements, and new tutorial pages about minerals, planes and ships.",
    "Hard Core is properly harder: stronger disasters and slightly less income.",
    "Clearer names for the game's values: Money, Policy points, Minerals, Approval, On-plan, Friendship and Gems, with 3D icons.",
    "Skill details now show exactly what goes up or down, in green (good) and red (bad) rows.",
    "A game now lasts about 45 minutes at normal speed, with more time to think.",
    "Three graphics levels, and the game lowers them itself if your computer struggles. The map is much smoother.",
    "Seasons change the disasters: monsoon, storm season, summer heat and fire season.",
    "Save codes are gone; use cloud saves to continue on another device.",
  ]),
  V("0.9", "2026-10-21", {th:"เว็บเต็มตัว", en:"The Full Web Game"}, [
    "เขียนเกมเวอร์ชันเว็บใหม่ทั้งหมด ภาพคมชัดเต็มจอ",
    "หน้าแรกเป็นลูกโลก 3 มิติ หมุนได้ เข้าเกมแล้วเป็นแผนที่ดาวเทียม 2 มิติ",
    "ตัวละครวาดใหม่ และเพลงเปลี่ยนตามสถานการณ์ในเกม พร้อมเสียงเหตุการณ์และเสียงบรรยากาศมากขึ้น",
  ], [
    "The web version was rewritten from scratch: sharp and full screen.",
    "A 3D globe you can spin on the home screen, and a 2D satellite map in the game.",
    "Newly drawn characters, music that follows what is happening, and many more event and ambient sounds.",
  ]),
  V("0.6 beta", "2026-10-20", {th:"ประเทศ ตัวละคร และบัญชีผู้เล่น", en:"Countries, Characters and Accounts"}, [
    "แผนที่ 67 ประเทศ มีมิตรภาพ ข้อตกลงสองประเทศ พันธมิตร และข้อพิพาทระหว่างประเทศ",
    "ภัยพิบัติท้องถิ่นพร้อมพยากรณ์ล่วงหน้าและการอพยพ",
    "40 สกิลใน 5 หมวด ตัวละคร 4 คนที่มีเลเวล เนื้อเรื่อง 3 องก์ และฉากจบเกรด S/A/B",
    "โหมด Hard Core และ Daily Challenge",
    "บัญชีผู้เล่น ร้านค้า ตารางอันดับ เซฟบนคลาวด์ และเกียรติบัตร",
  ], [
    "A map of 67 countries with friendship, two-country deals, alliances and international disputes.",
    "Local disasters with forecasts and evacuations.",
    "40 skills in 5 categories, 4 characters with levels, a 3-act story and S/A/B endings.",
    "Hard Core mode and the Daily Challenge.",
    "Player accounts, a shop, leaderboards, cloud saves and certificates.",
  ]),
  V("0.5 beta", "2026-10-17", {th:"เวอร์ชัน GDevelop", en:"The GDevelop Version"}, [
    "สร้างเกมเวอร์ชัน GDevelop 5 สำหรับกิจกรรม Garena Academy Game Maker",
  ], [
    "A GDevelop 5 version of the game for the Garena Academy Game Maker activity.",
  ]),
  V("0.4 beta", "2026-10-01", {th:"เล่นได้แม้ไม่มีเน็ต", en:"Play Offline"}, [
    "ติดตั้งเกมเป็นแอปบนมือถือหรือคอม และเล่นได้แม้ไม่มีอินเทอร์เน็ต",
  ], [
    "Install the game as an app on a phone or computer and play without the internet.",
  ]),
  V("0.3.1 beta", "2026-09-30", {th:"ปรับให้เล่นสบายขึ้น", en:"Comfort Update"}, [
    "ปรับระดับเสียงเพลงและเสียงประกอบแยกกันได้",
    "ความสำเร็จ (Achievements) ให้ปลดล็อก",
    "เล่นแนวนอนบนมือถือได้ มีปุ่มเต็มจอ และเกมลื่นขึ้น",
  ], [
    "Separate volume for music and sound effects.",
    "Achievements to unlock.",
    "Landscape play on phones, a full-screen button, and smoother performance.",
  ]),
  V("0.3 beta", "2026-09-30", {th:"152 เหตุการณ์", en:"152 Events"}, [
    "เหตุการณ์ 152 เรื่อง แต่ละเรื่องมี 2–3 ทางเลือกที่ต้องตัดสินใจ",
    "เสียงจริง หน้าโหลด และบทสอนเล่นแบบมีภาพ",
    "ต้นไม้เทคโนโลยีแบบเคลื่อนไหว และ “เงินเฟ้อสีเขียว” เมื่อซื้อโครงการถี่เกินไป",
  ], [
    "152 events, each with 2–3 choices to weigh up.",
    "Real recorded sounds, a loading screen and a picture tutorial.",
    "An animated technology tree, and “Greenflation” when you buy projects too fast.",
  ]),
  V("0.2 alpha", "2026-09-29", {th:"เกมเริ่มท้าทาย", en:"A Real Challenge"}, [
    "เศรษฐกิจในเกมตึงขึ้น เกมยาว 15–30 นาที",
    "ไอคอนทรัพยากร ต้นไม้เทคโนโลยีแบบภาพ และเสียงประกอบ",
    "ฟองบนแผนที่ช้าลงและตัวหนังสือน้อยลง",
  ], [
    "A tighter economy and 15–30 minute games.",
    "Resource icons, a visual technology tree and sound effects.",
    "Slower bubbles on the map and less text.",
  ]),
  V("0.1 alpha", "2026-09-29", {th:"จุดเริ่มต้น", en:"The Beginning"}, [
    "ต้นแบบแรกของเกม: ลูกโลก 3 มิติ เมนูหลัก เซฟและโหลดเกม และแถบข่าว",
    "ไอคอนแอปและภาพตัวอย่างเวลาแชร์ลิงก์",
  ], [
    "The first prototype: a 3D globe, main menu, saving and loading, and a news ticker.",
    "App icons and a preview picture for shared links.",
  ]),
];
P.VERSION_NAME = P.CHANGELOG[0].v;
