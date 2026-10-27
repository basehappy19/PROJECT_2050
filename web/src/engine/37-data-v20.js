const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.d20) return;
(P.mods = P.mods || {}).d20 = 1;
/* =========================================================================
   Version 2.0 · data: words for the new screens, the 50 yearly stories and the 12 endings
   · Every January the year that just ended gets a score (0–100). 50+ = a good year (good news),
     under 50 = a bad year (bad news). One story for each year, a good one and a bad one: 25 × 2 = 50.
   · The ending depends on how the game ended (win · removed from office · out of time · +3 °C)
     and on how many good years you had (10 or fewer · 11–20 · 21 or more): 4 × 3 = 12 endings.
   ========================================================================= */
const T = (th, en) => ({th, en});

P.UI2 = {
  // what you lost and why (LossFeed)
  lossEvac:T("อพยพแล้ว ความเสียหายลดลงมาก", "Evacuated: far less damage"),
  lossNoEvac:T("ไม่ได้อพยพ · ครั้งหน้าแตะพยากรณ์ภัยเพื่ออพยพก่อน", "Not evacuated · next time tap the forecast to evacuate first"),
  lossMiss:T("ไม่ได้ส่งความช่วยเหลือ", "Aid not sent"),
  lossMissSub:T("ฟองสีแดงหมดเวลา · ความนิยมและมิตรภาพลดลง", "The red bubble ran out · approval and friendship fall"),
  lossProtest:T("ออกมาประท้วง", "protest"),
  lossProtestSub:T("กลุ่มนี้ไม่พอใจมาก · แตะช่องความนิยมเพื่อดูว่าเขาชอบอะไร", "This group is very angry · tap approval to see what they like"),
  lossUpkeep:T("ค่าใช้จ่ายประจำเดือน", "Monthly costs"),
  lossSanct:T("ถูกคว่ำบาตรโดย", "sanctions from"),
  lossBond:T("ผ่อนพันธบัตร", "bond repayment"),
  lossRefinery:T("ค่าดูแลโรงแยกแร่", "refinery upkeep"),
  lossDelay:T("ผลจากการตัดสินใจก่อนหน้า", "An earlier decision catches up"),
  lossSee:T("แตะเพื่อดูบนแผนที่", "Tap to see it on the map"),
  // disaster forecast cards
  alertTag:T("พยากรณ์ภัย", "Disaster forecast"),
  alertSee:T("ดู", "See"),
  alertEvac:T("อพยพ", "Evacuate"),
  alertMore:T("ภัยอื่นกำลังมา ดูลูกศรขอบจอ", "more on the way: see the arrows at the screen edge"),
  // events
  evMin:T("ดูแผนที่ก่อน", "Look at the map first"),
  evWaiting:T("เหตุการณ์รอคุณตัดสินใจ (เกมหยุดอยู่)", "An event is waiting (the game is paused)"),
  // yearly review
  yrTitle:T("สรุปผลงานปี", "Year in review"),
  yrScore:T("คะแนนปีนี้", "This year's score"),
  yrGood:T("ปีที่ดี", "A good year"),
  yrBad:T("ปีที่แย่", "A bad year"),
  yrTarget:T("เป้าปลายปี", "Year-end target"),
  yrCut:T("ลดได้ปีนี้", "Cut this year"),
  yrNeed:T("ต้องลดให้ได้", "Needed"),
  yrRewardGood:T("ผลงานดี ทั่วโลกเชื่อมั่น: งบประมาณเพิ่ม", "Good results, the world trusts you: more funding"),
  yrRewardBad:T("ผลงานไม่ถึงเป้า: ความเชื่อมั่นลดลง", "Below target: trust falls"),
  yrGoodYears:T("ปีที่ดี", "Good years"),
  yrNext:T("ปีถัดไป", "Next year"),
  yrHow:T("คะแนนมาจาก CO₂ สุทธิเทียบกับเป้าปีนี้ (60%) และสิ่งที่ลดได้ในปีนี้ (40%) · 50 ขึ้นไป = ปีที่ดี", "The score comes from net CO₂ against this year's target (60%) and what you cut this year (40%) · 50+ = a good year"),
  yrMeter:T("เป้าปีนี้", "This year"),
  // fast mode
  fastTag:T("โหมดเร็ว", "Fast mode"),
  // menu / training
  trainMenu:T("โหมดฝึกซ้อม", "Training"),
  trainMenuD:T("ฝึกเล่นทีละขั้น กดจริงทุกอย่าง ราว 8 นาที", "Learn step by step by really playing · about 8 minutes"),
  trainForced:T("ครั้งแรกต้องผ่านโหมดฝึกซ้อมก่อน ใช้เวลาราว 8 นาที แล้วจะเล่นได้ทุกโหมด", "First, a short training game (about 8 minutes). After that every mode is open."),
  trainDone:T("ผ่านการฝึกแล้ว", "Training done"),
  // start
  introSkip:T("ข้าม", "Skip"),
};

/* ---------------- the 50 yearly stories (who: fon · lung · opp · adv · news) ---------------- */
const Y = (who, th, en) => ({who, th, en});
P.YEAR_STORY = {
  2026:{good:Y("fon", "ปีนี้มีอาสามาช่วยปลูกป่าชายเลนเพิ่มเป็นสองเท่าค่ะ หลายคนบอกว่าเห็นข่าวคณะทำงานของคุณแล้วอยากช่วย", "Twice as many volunteers came to plant mangroves this year. Many said they saw your taskforce on the news and wanted to help."),
        bad:Y("opp", "ปีแรกก็ไม่เห็นอะไรเปลี่ยน ผมบอกแล้วว่าแผนนี้เป็นแค่ความฝัน", "A whole year and nothing has changed. I told you this plan was a daydream.")},
  2027:{good:Y("news", "โรงไฟฟ้าแสงอาทิตย์และลมใหม่ทั่วโลกมากกว่าโรงไฟฟ้าถ่านหินใหม่เป็นปีแรก นักลงทุนเริ่มย้ายเงินตามมา", "For the first time the world builds more new solar and wind than new coal power. Investors start moving their money too."),
        bad:Y("lung", "ปุ๋ยแพงขึ้นอีกแล้ว น้ำในคลองก็เริ่มกร่อย ผมยังไม่เห็นว่าการประชุมใหญ่ ๆ ช่วยชาวนาตรงไหน", "Fertiliser costs more again and the canal water is turning brackish. I still can't see how the big meetings help farmers.")},
  2028:{good:Y("adv", "เมืองใหญ่หลายแห่งรายงานว่าฝุ่นควันลดลงเห็นได้ชัด ประชาชนเริ่มรู้สึกถึงผลงานของเราแล้วค่ะ", "Several big cities report clearly cleaner air. People are starting to feel our work in their own lungs."),
        bad:Y("news", "การปล่อยก๊าซโลกพุ่งทำสถิติใหม่ ประเทศใหญ่โทษกันไปมาว่าใครต้องลดก่อน", "Global emissions hit a new record, and the big countries argue over who should cut first.")},
  2029:{good:Y("fon", "เด็ก ๆ ในหมู่บ้านตั้งชมรมเก็บขยะชายหาดเองแล้วค่ะ พวกเขาบอกว่าโตขึ้นอยากทำงานกับคณะทำงานของคุณ", "The village kids started their own beach clean-up club. They say they want to work for your taskforce when they grow up."),
        bad:Y("opp", "คนงานเหมืองของผมยังมีงานทำทุกวัน เห็นไหมว่าโลกยังต้องการถ่านหิน", "My miners still go to work every day. See? The world still needs coal.")},
  2030:{good:Y("news", "ปี 2030: โลกลดก๊าซได้ตามเป้าครั้งแรกในประวัติศาสตร์ ผู้นำหลายประเทศประกาศเพิ่มเป้าหมายของตัวเอง", "2030: for the first time in history the world meets a climate target, and many leaders raise their own goals."),
        bad:Y("adv", "ปี 2030 ผ่านไปแล้ว แต่เรายังห่างเป้ามาก ทุกปีที่ช้าทำให้ปีต่อไปยากขึ้นค่ะ", "2030 has come and gone, and we're far off target. Every slow year makes the next one harder.")},
  2031:{good:Y("lung", "ลูกชายผมกลับมาจากเมือง มาทำนาแบบใหม่ที่ใช้น้ำน้อย แถมได้เงินขายคาร์บอนเครดิตด้วย", "My son came back from the city to farm the new way, with less water, and we even sell carbon credits."),
        bad:Y("lung", "ปีนี้น้ำเค็มรุกเข้ามาอีกสองกิโล เพื่อนบ้านขายนาไปสามแปลงแล้ว", "The salt water pushed two kilometres further this year. Three of my neighbours have sold their fields.")},
  2032:{good:Y("adv", "รถยนต์ไฟฟ้าขายดีกว่ารถน้ำมันในหลายประเทศแล้วค่ะ โรงงานรถเก่าเริ่มเปลี่ยนสายการผลิต", "Electric cars now outsell petrol cars in many countries, and old car plants are switching their lines."),
        bad:Y("opp", "ราคาไฟฟ้าขึ้นอีกแล้ว คนเริ่มถามว่าพลังงานสะอาดของคุณคุ้มจริงหรือ", "Power prices rose again. People are starting to ask if your clean energy is really worth it.")},
  2033:{good:Y("fon", "โรงเรียนในหมู่บ้านไม่ต้องย้ายหนีน้ำเป็นปีที่สามแล้วค่ะ ครูบอกว่าเป็นครั้งแรกในรอบสิบปี", "The village school hasn't had to move away from the water for three years now. The teacher says that's a first in a decade."),
        bad:Y("news", "พายุลูกใหญ่ที่สุดในรอบศตวรรษ ทำให้ผู้คนหลายล้านต้องอพยพ หลายประเทศขอความช่วยเหลือฉุกเฉิน", "The biggest storm in a century forces millions from their homes, and many countries ask for emergency help.")},
  2034:{good:Y("news", "งานสีเขียวทั่วโลกแตะ 100 ล้านตำแหน่ง มากกว่างานในอุตสาหกรรมฟอสซิลทั้งหมดรวมกัน", "Green jobs pass 100 million worldwide, more than all fossil-fuel jobs put together."),
        bad:Y("opp", "สหภาพแรงงานของผมเดินขบวนสามเมือง เพราะงานหายไปเร็วกว่างานใหม่จะมา", "My unions marched in three cities, because the old jobs are vanishing faster than new ones arrive.")},
  2035:{good:Y("adv", "ครึ่งทางของภารกิจแล้วค่ะ ประเทศที่เคยลังเลเริ่มขอเข้าร่วมแผนของเราเอง", "We're halfway through the mission, and countries that used to hold back are asking to join our plan."),
        bad:Y("adv", "ครึ่งทางแล้ว แต่ CO₂ ยังสูงกว่าที่ควรมาก ถ้าไม่เร่งตอนนี้ ปลายทางจะยากมากค่ะ", "We're halfway, but CO₂ is far higher than it should be. If we don't speed up now, the finish will be very hard.")},
  2036:{good:Y("lung", "ข้าวทนเค็มที่ได้มาปลูกได้ดีจริง ๆ ปีนี้ผมได้ข้าวเท่ากับสมัยก่อนน้ำเค็มเข้า", "The salt-tolerant rice really works. This year I harvested as much as before the salt water came."),
        bad:Y("lung", "แล้งหนักสองปีติด อ่างเก็บน้ำแห้งจนเห็นก้น ผมไม่รู้ว่าจะปลูกอะไรได้อีก", "Two years of hard drought. The reservoir is dry to the bottom and I don't know what I can still grow.")},
  2037:{good:Y("news", "ไกรวิทย์ ศิลาทอง ขายหุ้นเหมืองถ่านหินแห่งสุดท้าย \"ตลาดเปลี่ยนเร็วกว่าที่ผมคิด\"", "Krai Silathong sells his last coal mine: \"the market moved faster than I thought.\""),
        bad:Y("opp", "บริษัทของผมเพิ่งได้สัมปทานเหมืองใหม่สองแห่ง ดูเหมือนโลกจะยังไม่พร้อมทิ้งพวกเรา", "My company just won two new mining concessions. It seems the world isn't ready to let us go.")},
  2038:{good:Y("fon", "ป่าชายเลนที่เราปลูกปีแรกสูงเกินหลังคาบ้านแล้วค่ะ ปลากับปูกลับมาเยอะจนชาวประมงยิ้มได้", "The mangroves we planted in year one are taller than the rooftops. The fish and crabs are back and the fishers are smiling."),
        bad:Y("fon", "คลื่นซัดแนวป่าชายเลนที่เพิ่งปลูกหายไปครึ่งหนึ่งค่ะ เราต้องเริ่มใหม่อีกแล้ว", "The waves washed away half of the mangroves we'd just planted. We have to start again.")},
  2039:{good:Y("adv", "ประเทศกำลังพัฒนาหลายประเทศข้ามถ่านหินไปใช้พลังงานสะอาดเลย ด้วยทุนที่เราช่วยหามาค่ะ", "Many developing countries are skipping coal and going straight to clean power, with the funding we helped find."),
        bad:Y("news", "คลื่นความร้อนทำสถิติใหม่ ไฟดับเป็นวงกว้างเพราะทุกบ้านเปิดแอร์พร้อมกัน", "A record heatwave causes wide blackouts as every home turns on the air-con at once.")},
  2040:{good:Y("news", "ปี 2040: CO₂ ของโลกต่ำกว่าครึ่งหนึ่งของปี 2026 นักวิทยาศาสตร์เรียกว่า \"จุดเปลี่ยนที่มนุษย์สร้างเอง\"", "2040: world CO₂ falls below half of 2026. Scientists call it \"a tipping point humans made.\""),
        bad:Y("adv", "ปี 2040 แล้ว เหลือเวลาอีกสิบปี แต่เราเพิ่งไปได้ไม่ถึงครึ่งทางค่ะ", "It's 2040, ten years left, and we're not even halfway yet.")},
  2041:{good:Y("lung", "หลานผมสอบเข้าคณะเกษตรได้ เขาบอกว่าจะกลับมาทำนาที่บ้าน ผมดีใจที่นายังอยู่ให้เขา", "My grandson got into agriculture school. He says he'll come home to farm, and I'm glad there's still a field to come back to."),
        bad:Y("opp", "ประชาชนเหนื่อยกับการเปลี่ยนแปลงแล้ว ผมได้ยินว่าหลายพรรคจะหาเสียงด้วยการยกเลิกแผนของคุณ", "People are tired of change. I hear several parties will campaign on scrapping your plan.")},
  2042:{good:Y("adv", "ระบบเตือนภัยที่เราช่วยสร้าง ช่วยให้คนอพยพทันจากพายุสามลูกติดกัน ไม่มีใครเสียชีวิตเลยค่ะ", "The warning systems we helped build got people out of the way of three storms in a row. Nobody died."),
        bad:Y("news", "น้ำท่วมใหญ่ในหลายประเทศ ค่าเสียหายสูงกว่างบลดก๊าซทั้งปีของโลก", "Major floods in several countries cost more than the whole world's yearly climate budget.")},
  2043:{good:Y("fon", "ฉันได้รับเชิญไปพูดที่การประชุมโลกค่ะ เล่าเรื่องหมู่บ้านที่เกือบหายไป และวันนี้ยังอยู่", "I was invited to speak at the world summit, about a village that almost disappeared and is still here today."),
        bad:Y("fon", "ครอบครัวในหมู่บ้านย้ายออกไปอีกสิบหลังคาเรือนค่ะ บางคนบอกว่าไม่อยากรอให้น้ำมาถึงบ้านอีกแล้ว", "Ten more families left the village. Some say they're not waiting for the water to reach their door again.")},
  2044:{good:Y("news", "โรงงานเหล็กและปูนซีเมนต์สะอาดแห่งแรกเปิดผลิตเต็มกำลัง อุตสาหกรรมที่ลดยากที่สุดเริ่มขยับ", "The first clean steel and cement plants run at full capacity: the hardest industries are finally moving."),
        bad:Y("opp", "อุตสาหกรรมหนักยังต้องใช้ถ่านหิน คุณจะลดตันสุดท้ายได้ยังไง", "Heavy industry still runs on coal. How will you ever cut the last tonnes?")},
  2045:{good:Y("adv", "เหลืออีกห้าปีค่ะ ถ้ารักษาจังหวะนี้ไว้ได้ เราจะถึงเส้นชัยก่อนเวลา", "Five years to go. If we keep this pace, we'll reach the finish line early."),
        bad:Y("adv", "เหลืออีกห้าปี ทุกการตัดสินใจจากนี้ต้องคุ้มที่สุดค่ะ เราผิดพลาดไม่ได้อีกแล้ว", "Five years left. Every decision from now on has to count; we can't afford more mistakes.")},
  2046:{good:Y("lung", "เมื่อก่อนผมคิดว่าโลกร้อนเป็นเรื่องของคนในเมือง วันนี้ผมสอนเพื่อนชาวนาทำนาแบบลดก๊าซ", "I used to think climate change was a city thing. Now I teach other farmers how to grow rice with fewer emissions."),
        bad:Y("lung", "ปีนี้ผมต้องยืมเงินมาซื้อพันธุ์ข้าวอีกแล้ว ถ้าปีหน้ายังเป็นแบบนี้ คงต้องเลิกจริง ๆ", "I had to borrow money for seed again this year. If next year is the same, I'll really have to give up.")},
  2047:{good:Y("news", "ประเทศสุดท้ายในกลุ่ม G20 ประกาศปิดโรงไฟฟ้าถ่านหินแห่งสุดท้าย", "The last G20 country announces the closure of its last coal power plant."),
        bad:Y("news", "ไฟป่าครั้งใหญ่ปล่อยคาร์บอนเท่ากับที่ทั้งทวีปลดได้ในปีนี้", "A huge wildfire releases as much carbon as a whole continent cut this year.")},
  2048:{good:Y("opp", "ผมยอมรับก็ได้ บริษัทพลังงานสะอาดของลูกสาวผมกำไรมากกว่าที่ผมเคยได้จากถ่านหินเสียอีก", "Fine, I admit it: my daughter's clean-energy company makes more than I ever did from coal."),
        bad:Y("opp", "สองปีสุดท้าย คุณจะทำสิ่งที่ทำไม่ได้มายี่สิบปีให้เสร็จทันหรือ", "Two years left. Will you finish now what you couldn't do in twenty?")},
  2049:{good:Y("fon", "เด็กที่เคยเก็บขยะชายหาดกับฉัน ตอนนี้เป็นวิศวกรพลังงานลมแล้วค่ะ อีกปีเดียวเท่านั้น", "The kids who cleaned the beach with me are wind engineers now. Just one more year."),
        bad:Y("adv", "ปีสุดท้ายแล้วค่ะ ไม่ว่าจะเกิดอะไรขึ้น ทุกตันที่ลดได้วันนี้ยังช่วยคนรุ่นหน้าได้", "The final year. Whatever happens, every tonne we cut today still helps the next generation.")},
  2050:{good:Y("news", "ปี 2050: ทั้งโลกจับตาตัวเลขสุดท้าย คณะทำงาน GCT ทำงานจนวันสุดท้ายของปี", "2050: the whole world watches the final numbers as the GCT works to the last day of the year."),
        bad:Y("news", "ปี 2050: นาฬิกาเดินถึงปีสุดท้าย และหลายเป้าหมายยังไม่สำเร็จ", "2050: the clock reaches the final year with many goals still unmet.")},
};

/* ---------------- the 12 endings (how it ended × good years: ≤10 · 11–20 · 21+) ---------------- */
const E = (th, en, bth, ben) => ({title:T(th, en), body:T(bth, ben)});
P.END2 = {
  win:[
    E("ชนะแบบลุ้นจนวินาทีสุดท้าย", "A win down to the wire",
      "คุณทำงานได้ดี แต่ก็ยังมีอุปสรรค หลายปีผลงานไม่ถึงเป้าและความเชื่อมั่นสั่นคลอน แต่สุดท้ายโลกก็ไปถึง Net Zero ได้ งานต่อจากนี้คือรักษาสิ่งที่ได้มาไว้ให้นานที่สุด",
      "You did good work, but the obstacles never let up. Many years missed the target and trust wobbled, yet in the end the world reached Net Zero. The job now is to hold on to what you won."),
    E("ฝ่าฟันจนถึงเส้นชัย", "Through every obstacle",
      "ตลอดเวลาการทำงานของคุณ ถึงแม้จะมีอุปสรรคมาก แต่ก็สามารถฝ่าฟันมาได้ ปีที่ดีมากกว่าปีที่แย่ ประเทศต่าง ๆ เชื่อใจคุณมากขึ้นเรื่อย ๆ และวันนี้โลกได้เห็นแล้วว่าการร่วมมือกันทำได้จริง",
      "Throughout your time in office there were many obstacles, but you pushed through them all. The good years outnumbered the bad, the world trusted you more each year, and today everyone has seen that working together really works."),
    E("ยุคทองของพลังงานสะอาด", "The golden age of clean energy",
      "เกือบทุกปีของคุณคือปีที่ดี ผลงานสม่ำเสมอจนกลายเป็นแบบอย่างของคนทั้งโลก นักเรียนจะได้เรียนเรื่องคณะทำงานของคุณในหนังสือประวัติศาสตร์ ในฐานะทีมที่เปลี่ยนเส้นทางของโลกได้สำเร็จ",
      "Almost every one of your years was a good one. Your steady results became the model for the whole world, and students will read about your taskforce in their history books as the team that changed the planet's course."),
  ],
  l2:[
    E("ถูกปลดเพราะไม่มีผลงาน", "Removed for lack of results",
      "ปีแล้วปีเล่าที่เป้าหมายไม่สำเร็จ ประชาชนหมดความเชื่อมั่น และฝ่ายต้านใช้โอกาสนี้ล้มคุณ แผนลดโลกร้อนถูกพักไว้ และไกรวิทย์เข้ามาคุมนโยบายพลังงานแทน",
      "Year after year the targets were missed. People lost faith and the opposition used it to bring you down. The climate plan is shelved and Krai takes over energy policy."),
    E("ผลงานดี แต่ไม่ได้พาคนไปด้วย", "Good work, but the people were left behind",
      "คุณลดก๊าซได้จริงหลายปี แต่คนในประเทศรู้สึกว่าถูกทิ้งไว้ข้างหลัง ความนิยมหมดลงก่อนงานจะเสร็จ ผู้นำคนใหม่สัญญาว่าจะทำต่อ แต่ช้ากว่าเดิม",
      "You really did cut emissions for many years, but people at home felt left behind. Your approval ran out before the job was done. The new leader promises to continue, only slower."),
    E("ผลงานดีเกือบทุกปี แต่หมดความเชื่อใจในช่วงสุดท้าย", "Great years, lost trust at the end",
      "ตัวเลขของคุณดีเกือบทุกปี แต่ความไม่พอใจที่สะสมไว้ระเบิดออกมาในช่วงท้าย คุณถูกปลดก่อนถึงเส้นชัย ทว่าทีมงานที่คุณสร้างไว้ยังเดินหน้าตามแผนของคุณต่อไป",
      "Your numbers were good almost every year, but the anger that had built up exploded at the end. You were removed before the finish line, yet the team you built carries on with your plan."),
  ],
  l3:[
    E("ช้าเกินไปตั้งแต่ต้น", "Too slow from the start",
      "ปี 2051 มาถึงแล้ว แต่ CO₂ ของโลกยังห่างจากศูนย์มาก ปีที่แย่มีมากกว่าปีที่ดี โลกต้องจ่ายราคาของการเริ่มช้า และภารกิจนี้ต้องส่งต่อให้คนรุ่นต่อไป",
      "2051 has arrived and world CO₂ is still far from zero. The bad years outnumbered the good, the world pays the price of a slow start, and the mission passes to the next generation."),
    E("เกือบแล้ว", "So close",
      "คุณทำได้ดีหลายปี แต่ยังไม่พอจะไปถึง Net Zero ทันปี 2050 ตันสุดท้ายยากที่สุดเสมอ อีกไม่กี่ปีโลกก็จะไปถึง ถ้าทุกคนไม่หยุดเดิน",
      "You had many good years, but not enough to reach Net Zero by 2050. The last tonnes are always the hardest. A few more years and the world will get there, if nobody stops walking."),
    E("ห่างเส้นชัยเพียงก้าวเดียว", "One step short",
      "เกือบทุกปีเป็นปีที่ดี ระบบที่คุณวางไว้กำลังทำงานเต็มที่ แค่ยังไม่ทันปี 2050 นักวิทยาศาสตร์คาดว่าโลกจะถึง Net Zero ภายในไม่กี่ปีจากนี้ เพราะสิ่งที่คุณเริ่มไว้",
      "Almost every year was a good one and the systems you set up are running at full speed; they just didn't finish by 2050. Scientists expect Net Zero within a few years, thanks to what you started."),
  ],
  l1:[
    E("โลกร้อนเกินจะหยุด", "Too hot to stop",
      "โลกร้อนทะลุ 3°C ระบบธรรมชาติพังทลายต่อเนื่อง ปีแล้วปีเล่าที่เป้าหมายไม่สำเร็จจนสายเกินแก้ บทเรียนนี้ต้องไม่เกิดขึ้นกับโลกจริง",
      "Warming broke 3°C and nature's systems collapse one after another. Year after year the targets were missed until it was too late. This lesson must never happen to the real world."),
    E("พยายามแล้ว แต่ไม่ทันจุดเปลี่ยน", "Tried, but too late for the tipping points",
      "คุณมีหลายปีที่ทำได้ดี แต่ความร้อนสะสมทำให้ธรรมชาติเริ่มปล่อยก๊าซเอง ทุกความพยายามช้ากว่าจุดเปลี่ยนไปเพียงก้าวเดียว",
      "You had many good years, but the built-up heat made nature start releasing carbon on its own. Every effort arrived one step behind the tipping points."),
    E("จุดเปลี่ยนที่หยุดไม่ทัน", "Tipping points nobody could stop",
      "แม้เกือบทุกปีจะเป็นปีที่ดี แต่จุดเปลี่ยนของธรรมชาติถูกกระตุ้นไปแล้วตั้งแต่ก่อนคุณเริ่ม ผลงานของคุณช่วยให้โลกร้อนช้าลงมาก และให้เวลาผู้คนได้ปรับตัว",
      "Even though almost every year was a good one, nature's tipping points had been set off before you began. Your work slowed the heating a lot, and gave people time to adapt."),
  ],
};
/* tier: 0 = 10 good years or fewer · 1 = 11–20 · 2 = 21+ */
P.endTier = n => (n <= 10 ? 0 : n <= 20 ? 1 : 2);
