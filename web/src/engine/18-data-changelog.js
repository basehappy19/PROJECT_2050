const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.changelog) return;
(P.mods = P.mods || {}).changelog = 1;
/* ===== Data · Update log (shown on the main menu). Written for players, not programmers. Newest first. ===== */
const V = (v, date, name, th, en) => ({v, date, name, items:{th, en}});
/* minor updates (1.1.1, 1.1.2, …) sit inside their main version as subs, newest first */
const SUB = (v, date, th, en) => ({v, date, items:{th, en}});
P.CHANGELOG = [
  V("1.5", "2026-10-22", {th:"ซีซั่นแรก", en:"Season One"}, [
    "ภารกิจรายสัปดาห์: ทุกสัปดาห์มี 3 ภารกิจ (ง่าย กลาง ยาก) ทำสำเร็จแล้วกดรับเพชร",
    "รางวัลซีซั่น: ทุกเกมที่เล่นจบได้ XP ซีซั่น สะสมครบแต่ละขั้นรับเพชรและของพิเศษ เช่น กรอบโปรไฟล์ และธีมแผนที่",
    "ดูได้ที่เมนู “ซีซั่นและภารกิจ” (ต้องเข้าสู่ระบบ)",
    "แก้บัคและปรับปรุงประสิทธิภาพ",
  ], [
    "Weekly missions: three each week (easy, medium, hard); finish one and claim gems.",
    "Season rewards: every finished game gives season XP; each tier pays gems and special items such as a profile frame and a map theme.",
    "Find them under “Season & missions” on the menu (sign-in needed).",
    "Bug fixes and performance improvements.",
  ]),
  V("1.4", "2026-10-22", {th:"จากเหมืองสู่โรงงาน", en:"From Mine to Factory"}, [
    "ห่วงโซ่อุปทานแร่: แร่ที่ขุดได้เป็นแร่ดิบ ต้องผ่านโรงแยกแร่ก่อนจึงใช้สร้างสกิลได้",
    "ประเทศที่มีโรงแยกแร่ เช่น จีน อินโดนีเซีย ชิลี ส่งแร่แบบพร้อมใช้ ประเทศอื่นส่งแร่ดิบ",
    "สร้างโรงแยกแร่ของเราเองได้ในตลาดทรัพยากร (แยกได้เร็วขึ้น แต่มีค่าดูแลรายเดือน) และประเทศที่มีโรงแยกแร่ซึ่งเป็นมิตรจะช่วยแยกแร่ให้",
    "แก้บัคและปรับปรุงประสิทธิภาพ",
  ], [
    "The mineral supply chain: dug-up minerals are raw and must go through a refinery before skills can use them.",
    "Countries with refineries, such as China, Indonesia and Chile, send minerals ready to use; others send them raw.",
    "Build our own refineries in the minerals market (faster refining, but a monthly upkeep), and friendly refining countries lend a hand.",
    "Bug fixes and performance improvements.",
  ]),
  V("1.3", "2026-10-22", {th:"เสียงของประชาชน", en:"Voices at Home"}, [
    "การเมืองในประเทศ: ความนิยมแบ่งเป็น 4 กลุ่ม คนเมือง ภาคอุตสาหกรรม เกษตรกร และคนรุ่นใหม่ แต่ละกลุ่มพอใจไม่เท่ากัน",
    "ทุกสกิล ตัวเลือกในเหตุการณ์ และคำสั่ง มีคนได้และคนเสีย ดูสัญลักษณ์ ▲ ▼ ว่ากลุ่มไหนจะพอใจหรือไม่พอใจ",
    "กลุ่มที่สนับสนุนให้โบนัส เช่น อุตสาหกรรมเพิ่มรายได้ คนรุ่นใหม่เพิ่มแต้มนโยบาย กลุ่มที่โกรธมากอาจออกมาประท้วง",
    "กดที่ความนิยมด้านบนเพื่อดูทั้ง 4 กลุ่ม และดูได้ในแท็บสถิติ",
    "แก้บัคและปรับปรุงประสิทธิภาพ",
  ], [
    "Politics at home: approval is now made of four groups (city people, industry, farmers and young people), each with its own mood.",
    "Every skill, event choice and order has winners and losers: the ▲ ▼ marks show which group will be pleased or upset.",
    "Groups that back you give bonuses (industry adds income, young people add policy points); very angry groups may protest.",
    "Tap approval at the top to see all four groups; they are in the statistics tab too.",
    "Bug fixes and performance improvements.",
  ]),
  V("1.2", "2026-10-22", {th:"คนใหม่ ทางเลือกใหม่", en:"New Faces, New Paths"}, [
    "ตัวละครใหม่ 2 คน: ดร.นาวา นักสมุทรศาสตร์ (รับมือพายุ น้ำท่วม และน้ำเค็มรุกได้ดี) และคุณกล้า วิศวกรเมือง (สร้างโครงการได้เร็ว)",
    "หมวดสกิลใหม่ “อาหารและน้ำ” 8 สกิล เช่น ชลประทานน้ำหยด ลดขยะอาหาร โรงกลั่นน้ำทะเลพลังแสงอาทิตย์ และข้อตกลงความมั่นคงทางอาหารโลก",
    "ความสำเร็จใหม่สำหรับหมวดอาหารและน้ำ",
    "ปรับสมดุลตัวละครทุกคนให้ใกล้เคียงกันขึ้น และปรับความยากโดยรวม",
    "แก้บัคและปรับปรุงประสิทธิภาพ",
  ], [
    "Two new characters: Dr. Nawa the Ocean Scientist (handles storms, floods and saltwater well) and Kla the City Engineer (builds projects fast).",
    "A new skill branch, “Food & Water”, with 8 skills such as drip irrigation, cutting food waste, solar desalination and a world food security pact.",
    "A new achievement for the Food & Water branch.",
    "All characters rebalanced to be closer to each other, and the overall difficulty retuned.",
    "Bug fixes and performance improvements.",
  ]),
  V("1.1", "2026-10-22", {th:"โลกที่ต้องคิดหนักขึ้น", en:"A Tougher World"}, [
    "เกมยากขึ้น ต้องวางแผนมากขึ้น: เงินรายเดือนน้อยลงแต่ฟองสีเขียวให้มากขึ้น ความนิยมลดง่ายขึ้น ภัยพิบัติมาบ่อยขึ้นและเกิดหลายที่พร้อมกันได้ และโลกร้อนได้ถึง +3.0°C ถ้าไม่ลดจริงจัง",
    "มิตรภาพมีผลมากขึ้น ประเทศที่ไม่พอใจเราอาจไม่ร่วมมือหรือคว่ำบาตร และภาษีคาร์บอนข้ามแดนใช้พร่ำเพรื่อไม่ได้แล้ว",
    "แร่แบ่งเป็น 5 กลุ่มในทุกโหมด หายากขึ้น มีตลาดแร่โลกให้ซื้อขาย",
    "ความคืบหน้าและช่องบันทึกตามบัญชีไปทุกเครื่อง",
    "ช่องบันทึกแบบใหม่ บอกโหมดชัดเจน บันทึกอัตโนมัติในช่องของเกมเอง และโหลดได้ทุกช่อง",
    "ข้อตกลงทวิภาคีเข้าใจง่ายขึ้น",
    "หน้าข่าวมีข่าวกรอง และหน้าสถิติมีรายงานประจำปี อ่านแล้วได้แต้มนโยบาย",
    "เพิ่มประเทศอีก 24 ประเทศ",
    "ปรับหน้าตาให้อ่านง่ายขึ้น ไอคอนใหม่ และพื้นหลังอวกาศเมื่อซูมออก",
    "แก้บัคและปรับปรุงประสิทธิภาพหลายจุด",
  ], [
    "A tougher game that needs more planning: less money each month but bigger green bubbles, approval is easier to lose, disasters come more often and can hit several places at once, and the world can reach +3.0°C if you don't cut hard.",
    "Friendship matters more: unhappy countries may stop cooperating or sanction you, and the carbon tariff can't be spammed any more.",
    "Minerals come in 5 groups in every mode, are scarcer, and can be traded on a world market.",
    "Your progress and save slots follow your account to every device.",
    "New save slots: each shows its mode, autosaves into the game's own slot, and any slot can be loaded.",
    "Bilateral agreements are easier to understand.",
    "Forecasts in the news and a yearly report in statistics, worth policy points when you read them.",
    "24 more countries.",
    "Easier-to-read screens, new icons, and space behind the map when you zoom out.",
    "Bug fixes and performance improvements.",
  ]),
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
    "โหมด Hard Core เปิดให้เล่นหลังชนะโหมดปกติครั้งแรก",
    "ประกาศนียบัตรแบบใหม่: ต้องชนะทั้งโหมดปกติและ Hard Core ขอได้คนละ 1 ใบ มีผลการเรียนรู้ที่ได้จากเกม และ QR สำหรับตรวจสอบ",
    "ช่องบันทึกเกมแสดงความคืบหน้าเป็นแถบ ดูง่ายว่าไปถึงไหนแล้ว",
    "เข้าสู่ระบบครั้งเดียวอยู่ได้นาน 1 ปี จนกว่าจะกดออกจากระบบเอง",
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
    "Hard Core opens after your first Normal win.",
    "New certificate: win both Normal and Hard Core, one per player, with the learning outcomes from the game and a QR code to check it.",
    "Save slots show your progress as bars, so you can see at a glance how far you are.",
    "Sign in once and stay signed in for a year, until you sign out yourself.",
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
    "บัญชีผู้เล่น ร้านค้า ตารางอันดับ เซฟบนคลาวด์ และประกาศนียบัตร",
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
P.CHANGELOG.find(x => x.v === "1.1").subs = [
  SUB("1.1.6", "2026-10-22", ["หน้าผู้ดูแลมีหน้า “ความยาก” ดูจากเกมจริงว่าผู้เล่นชนะหรือแพ้แบบไหนและแพ้ปีไหน", "แก้บัคเล็กน้อย"],
    ["The admin page has a new “Difficulty” view built from real games: how players win or lose, and in which year.", "Small bug fixes."]),
  SUB("1.1.5", "2026-10-22", ["เกมเวอร์ชันใหม่โหลดเองโดยไม่ต้องรีเฟรช ถ้ากำลังเล่นอยู่จะมีปุ่ม “อัปเดตเลย” (บันทึกเกมให้ก่อน)", "ไอคอนที่เปลี่ยนใหม่แสดงทันทีในครั้งถัดไปที่เปิดเกม"],
    ["New versions load by themselves; during a game an “Update now” button appears (it saves first).", "Changed icons show up the next time you open the game."]),
  SUB("1.1.4", "2026-10-22", ["ตั้งขนาดตัวอักษรได้ 3 ระดับ", "โหมดสีสำหรับคนตาบอดสี (ฟ้า-ส้มแทนเขียว-แดง)"],
    ["Text size setting with 3 levels.", "Colour-blind mode (blue/orange instead of green/red)."]),
  SUB("1.1.3", "2026-10-22", ["ตัวเลขด้านบนเลื่อนขึ้นลงพร้อมบอกว่าได้หรือเสียเท่าไร", "ชี้หรือแตะค่าต่าง ๆ เพื่อดูคำอธิบาย"],
    ["Numbers in the top bar slide to their new value and show what you gained or lost.", "Hover or tap any value to see what it means."]),
  SUB("1.1.2", "2026-10-22", ["ป้ายพยากรณ์ภัยของประเทศที่อยู่ใกล้กันไม่ทับกันแล้ว", "ปุ่มซูมไม่บังชื่อประเทศเวลาเปิดแผงด้านขวา"],
    ["Disaster forecasts of nearby countries no longer cover each other.", "Zoom buttons no longer cover country names when a side panel is open."]),
  SUB("1.1.1", "2026-10-22", [
    "ตลาดแร่แบบใหม่ ราคาขึ้นลงทุกเดือน มีกราฟราคา บอกว่าขาดแร่เท่าไร และกดซื้อเฉพาะที่ขาดได้",
    "ไอคอนแร่แบบ 3 มิติทุกกลุ่ม ดูออกง่าย",
    "ปุ่มเข้าสู่ระบบด้วย Google แบบใหม่",
    "หน้าตรวจสอบประกาศนียบัตรสวยและอ่านง่ายขึ้น",
    "บนมือถือ ปุ่มปิดของหน้าต่างยาว ๆ อยู่ด้านบนเสมอ",
    "แก้บัคและปรับปรุงประสิทธิภาพ",
  ], [
    "A new minerals market: prices move every month, with price charts, how much you're short of, and a button to buy just what's missing.",
    "3D icons for every mineral group, easy to tell apart.",
    "A new “Continue with Google” button.",
    "A cleaner, easier-to-read certificate check page.",
    "On phones, the close button of long windows stays at the top.",
    "Bug fixes and performance improvements.",
  ]),
];
/* the newest version number, counting minor updates */
P.CHANGELOG.find(x => x.v === "1.5").subs = [
  SUB("1.5.3", "2026-10-22", [
    "เกมยากขึ้น: ชนะยากขึ้นในทุกโหมด ต้องวางแผนมากขึ้น",
    "ปรับสมดุลตัวละคร: นักเศรษฐศาสตร์ นักการทูต และนักกิจกรรมแรงน้อยลง",
    "สกิลที่ 2 ของตัวละคร (เลเวล 5) และโบนัสเลเวล 3 อ่อนลงและใช้ได้ห่างขึ้น",
  ], [
    "The game is harder: winning takes more planning in every mode.",
    "Characters rebalanced: the Economist, the Diplomat and the Activist are less strong.",
    "Characters' second abilities (level 5) and level 3 bonuses are weaker and recharge more slowly.",
  ]),
  SUB("1.5.2", "2026-10-22", [
    "แผนที่ในเกมวาดด้วยการ์ดจอ (GPU) เลื่อนและซูมลื่นขึ้น ประหยัดแบตเตอรี่ โดยเฉพาะบน iPad และเครื่องสเปกต่ำ",
    "เครื่องที่ใช้ GPU ไม่ได้ เกมกลับไปวาดแบบเดิมให้เอง และปิดได้ในหน้าตั้งค่า",
    "ปรับสมดุลความยากใหม่หลังเพิ่มระบบการเมืองและห่วงโซ่แร่",
    "เปลี่ยนชื่อ “แร่” เป็น “ทรัพยากร” เช่น ช่องทรัพยากรด้านบน และตลาดทรัพยากรโลก",
    "แก้บัคและปรับปรุงประสิทธิภาพ",
  ], [
    "The in-game map is drawn on the graphics card (GPU): smoother panning and zooming and longer battery life, above all on iPads and slower computers.",
    "Devices without a usable GPU go back to the old renderer by themselves; it can also be turned off in the settings.",
    "Difficulty retuned after the new politics and mineral supply chain.",
    "“Minerals” is now called “Resources”, e.g. the Resources counter at the top and the World resources market.",
    "Bug fixes and performance improvements.",
  ]),
  SUB("1.5.1", "2026-10-22", [
    "เสียงพากย์ภาษาไทย อ่านเนื้อเรื่อง หน้าวิธีเล่น และเหตุการณ์ให้ฟัง ด้วยเสียงไทยของเครื่อง (ถ้าเครื่องมี)",
    "คำบรรยายบนจอตามเสียงที่อ่าน",
    "เปิด/ปิดเสียงพากย์ คำบรรยาย และเลือกความเร็วได้ในหน้าตั้งค่า หรือกดปุ่มลำโพงฟังเฉพาะหน้านั้น",
  ], [
    "Thai narration: the story, the how-to-play pages and events can be read aloud with the device's own voice.",
    "On-screen subtitles follow the voice.",
    "Turn narration and subtitles on or off and pick a speed in the settings, or tap the speaker button to hear just that page.",
  ]),
];
P.VERSION_NAME = P.CHANGELOG[0].subs && P.CHANGELOG[0].subs.length ? P.CHANGELOG[0].subs[0].v : P.CHANGELOG[0].v;
