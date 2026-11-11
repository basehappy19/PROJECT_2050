const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.voices) return;
(P.mods = P.mods || {}).voices = 1;
/* =========================================================================
   3.9 · People talk while you play
   The people of the story (Uncle Thongdee, Fon, Krai and 16 more from around the world) say something when a moment
   touches their lives: a disaster where they live, a skill you bought, approval falling, the world passing 1.5°C, a
   new season, a quiet month. A line shows for a few seconds beside the map (the game does not stop).
   Lines live in 46-…49-voice-*.js as P.VOICE_LINES[who] = [[key, th, en], …]. Keys:
     idle · start (first year) · late (from 2042) · haz:<type> (a disaster anywhere) · home:<type> (in their country)
     buy:<energy|industry|nature|city|policy> · apprLow · apprHigh · t15 · t2 (warming passes 1.5 / 2.0°C)
     down · up (world CO₂ fell / rose over the last year, said in January) · cool · hot · monsoon · storm (season starts)
   Picking is a hash of the month, so it never touches the game's random numbers (balance and the bot tests stay the same).
   Visual / story only: nothing here changes a number in the game.
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en});
const hook = (name, ...a) => (P.H && P.H[name] ? P.H[name](...a) : undefined);

/* the people (Krai, Fon and Uncle Thongdee were already in the story; home = their country, reg = their region) */
P.NPC = Object.assign(P.NPC || {}, {
  ali:{name:T("บังอาลี · ชาวประมงพื้นบ้าน ปัตตานี", "Bang Ali · small-boat fisher, Pattani"), color:"#4fb3d9", home:"THA", reg:"SEA"},
  tala:{name:T("ตาลา · นักเรียนจากตูวาลู", "Tala · a student from Tuvalu"), color:"#5ad1c9", reg:"SEA"},
  ravi:{name:T("ราวี · คนงานโรงงานทอผ้า กานปูร์", "Ravi · textile worker, Kanpur"), color:"#ff9a3c", home:"IND", reg:"SA"},
  jonas:{name:T("โยนัส · คนงานเหมืองลิกไนต์ ลูซาเทีย", "Jonas · lignite miner, Lusatia"), color:"#9aa7b3", home:"DEU", reg:"EU"},
  rahima:{name:T("ราฮิมา · แม่ค้าในตลาด คุลนา", "Rahima · market trader, Khulna"), color:"#e86f9a", home:"BGD", reg:"SA"},
  lekuta:{name:T("เลกูตา · คนเลี้ยงวัวชาวซัมบูรู เคนยา", "Lekuta · Samburu herder, Kenya"), color:"#d9a13b", home:"KEN", reg:"MEAF"},
  maria:{name:T("มาเรีย · นักดับไฟป่า แคลิฟอร์เนีย", "María · wildland firefighter, California"), color:"#ff6b4a", home:"USA", reg:"NA"},
  kaue:{name:T("คาวเอ · ผู้พิทักษ์ป่าแอมะซอน", "Kauê · Amazon forest guardian"), color:"#3fae6a", home:"BRA", reg:"SA"},
  mei:{name:T("เหม่ยหลิน · วิศวกรแบตเตอรี่ เหอเฝย", "Mei Lin · battery engineer, Hefei"), color:"#c3a6ff", home:"CHN", reg:"EA"},
  sofia:{name:T("โซเฟีย · ผู้นำชุมชนทะเลทรายอาตากามา", "Sofía · community leader, Atacama"), color:"#e0b070", home:"CHL", reg:"SA"},
  hiro:{name:T("ฮิโรชิ · อดีตวิศวกรรถไฟชินคันเซ็น", "Hiroshi · retired Shinkansen engineer"), color:"#8fd0ff", home:"JPN", reg:"EA"},
  amina:{name:T("อามีนา · ผู้ก่อตั้งสหกรณ์โซลาร์ ดาการ์", "Aminata · solar co-op founder, Dakar"), color:"#f2c14e", home:"SEN", reg:"MEAF"},
  nils:{name:T("นิลส์ · คนเลี้ยงกวางเรนเดียร์ชาวซามี", "Nils · Sámi reindeer herder"), color:"#b8d8ff", home:"SWE", reg:"EU"},
  khalid:{name:T("คาลิด · วิศวกรน้ำมันที่หันมาทำไฮโดรเจน", "Khalid · oil engineer turned hydrogen"), color:"#e8c27a", home:"ARE", reg:"MEAF"},
  elena:{name:T("เอเลนา · นักวิจัยชั้นดินเยือกแข็ง ยาคุตสค์", "Elena · permafrost researcher, Yakutsk"), color:"#a8c8e8", home:"RUS", reg:"EU"},
  noi:{name:T("ป้าน้อย · แม่ค้าข้าวแกง กรุงเทพฯ", "Auntie Noi · curry-rice vendor, Bangkok"), color:"#ff8fb0", home:"THA", reg:"SEA"},
});
Object.assign(P.NPC.lung, {home:"THA", reg:"SEA"});
Object.assign(P.NPC.fon, {home:"THA", reg:"SEA"});
Object.assign(P.NPC.opp, {reg:"*"});
P.VOICE_LINES = P.VOICE_LINES || {};

const hsh = (...a) => { let h = 2166136261; for (const v of a){ const s = String(v); for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } } return (h >>> 0) / 4294967296; };
const COOL = 2, IDLE = 4, KEEP = 4;   // at most one line every 2 months; a quiet line after 4 quiet months; a moment waits up to 4 months for its turn

function state(){
  // a new game (or an older save without it): start fresh, counting only what happens from now on
  if (!S.vo || S.vo.tk > S.tick) S.vo = {t:-99, tk:S.tick, used:{}, last:{}, pend:[], appr:0, temp:(S.temp >= 1.5 ? 1 : 0) | (S.temp >= 2 ? 2 : 0), owned:null, dmg:((S.stats && S.stats.dmg) || []).length, co2:[]};
  S.vo.tk = S.tick;
  return S.vo;
}
/* which moments happened this month (most important first) */
function moments(V){
  const out = [];
  // disasters that struck this month
  const dmg = (S.stats && S.stats.dmg) || [];
  for (let i = V.dmg; i < dmg.length; i++){ const d = dmg[i]; out.push({k:"home:" + d.type, c:d.c, pr:9}); out.push({k:"haz:" + d.type, c:d.c, pr:6}); }
  V.dmg = dmg.length;
  // warming milestones
  if (S.temp >= 1.5 && !(V.temp & 1)){ V.temp |= 1; out.push({k:"t15", pr:10}); }
  if (S.temp >= 2.0 && !(V.temp & 2)){ V.temp |= 2; out.push({k:"t2", pr:10}); }
  // skills bought since last month
  const owned = Object.keys(S.owned || {}).filter(k => S.owned[k]);
  if (V.owned){ for (const id of owned) if (!V.owned.includes(id) && P.SKILL && P.SKILL[id]) out.push({k:"buy:" + P.SKILL[id].cat, pr:7}); }
  V.owned = owned;
  // approval crossing a line (once until it comes back)
  if (S.appr < 35 && V.appr !== -1){ V.appr = -1; out.push({k:"apprLow", pr:8}); }
  else if (S.appr > 75 && V.appr !== 1){ V.appr = 1; out.push({k:"apprHigh", pr:5}); }
  else if (S.appr >= 40 && S.appr <= 70) V.appr = 0;
  // the year in CO₂, said in January
  const net = (S.regions || []).reduce((a, r) => a + r.co2, 0);
  V.co2.push(+net.toFixed(2)); if (V.co2.length > 13) V.co2.shift();
  if (S.tick % 12 === 0 && V.co2.length >= 13){ const d = V.co2[V.co2.length - 1] - V.co2[0]; if (d < -.4) out.push({k:"down", pr:6}); else if (d > .2) out.push({k:"up", pr:6}); }
  // a new season (every other one, so the seasons don't take every turn)
  if (P.seasonOf){ const s0 = P.seasonOf(S.tick - 1).id, s1 = P.seasonOf(S.tick).id; if (s0 !== s1 && hsh(S.tick, "sea") < .5) out.push({k:s1, pr:3}); }
  const year = 2026 + Math.floor(S.tick / 12);
  if (S.tick <= 12 && !V.pend.some(o => o.k === "start")) out.push({k:"start", pr:2});
  if (year >= 2042 && !V.pend.some(o => o.k === "late")) out.push({k:"late", pr:2});
  // moments wait a few months for their turn (otherwise a disaster in a quiet-down month was never mentioned)
  V.pend = (V.pend || []).filter(m => S.tick - m.t <= KEEP);
  for (const m of out) if (!V.pend.some(o => o.k === m.k && o.c === m.c)) V.pend.push({...m, t:S.tick});
  const now = V.pend.slice();
  now.push({k:"idle", pr:1, t:S.tick});
  return now.sort((a, b) => b.pr - a.pr || b.t - a.t);
}
/* who can say this: home lines only for people who live there (or in that region if they have no country) */
function speakers(m){
  const L = P.VOICE_LINES, out = [];
  for (const who of Object.keys(L)){
    const n = P.NPC[who]; if (!n) continue;
    if (!L[who].some(l => l[0] === m.k)) continue;
    if (m.k.startsWith("home:")){
      const cc = P.C ? P.C(m.c) : null;
      if (n.home ? n.home !== m.c : !(cc && n.reg && cc.reg === n.reg)) continue;
    }
    out.push(who);
  }
  return out;
}
function say(){
  if (!S.started || S.over || S.simple || S.mp || S.training) return;
  const V = state(), list = moments(V);
  const quiet = S.tick - V.t;
  if (quiet < COOL) return;
  for (const m of list){
    if (m.k === "idle" && quiet < IDLE) continue;
    if ((m.k === "start" || m.k === "late") && quiet < IDLE - 1) continue;
    if (m.k.startsWith("haz:") && list.some(x => x.k === "home:" + m.k.slice(4) && speakers(x).length)) continue;   // someone who lives there speaks instead
    const who = speakers(m); if (!who.length) continue;
    // the person who spoke least lately, then a line they haven't said yet
    who.sort((a, b) => (V.last[a] ?? -99) - (V.last[b] ?? -99) || hsh(S.tick, a) - hsh(S.tick, b));
    const w = who[0], lines = P.VOICE_LINES[w].map((l, i) => [l, i]).filter(([l]) => l[0] === m.k);
    const fresh = lines.filter(([, i]) => !V.used[w + i]), pool = fresh.length ? fresh : lines;
    const [line, i] = pool[Math.floor(hsh(S.tick, w, m.k) * pool.length)];
    if (!fresh.length) for (const [, j] of lines) delete V.used[w + j];   // all said: start the set again
    V.used[w + i] = 1; V.last[w] = S.tick; V.t = S.tick;
    V.pend = V.pend.filter(o => o.k !== m.k && !(m.k.startsWith("home:") && o.k === "haz:" + m.k.slice(5) && o.c === m.c) && !(m.k.startsWith("haz:") && o.k === "home:" + m.k.slice(4) && o.c === m.c));
    hook("voice", {who:w, name:P.NPC[w].name, color:P.NPC[w].color, th:line[1], en:line[2], k:m.k, c:m.c || null});
    return;
  }
}
const _tick = P.tick;
P.tick = () => { _tick(); try { say(); } catch (e){ if (typeof console !== "undefined") console.error(e); } };
P.voiceCount = () => Object.fromEntries(Object.entries(P.VOICE_LINES).map(([k, v]) => [k, v.length]));
