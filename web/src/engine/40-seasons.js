const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.seasons) return;
(P.mods = P.mods || {}).seasons = 1;
/* =========================================================================
   3.7.3 · Seasons that matter (they used to change only where disasters strike)
   · Energy by season: solar makes more in the hot season and less under monsoon clouds; wind is strongest in the
     storm season and in winter. Batteries (E3) halve the dip. Shown as a seasonal swing in world CO₂ (S.seasCO2,
     added to gross CO₂ each month, not stored in the regions).
   · Summer power peak: air-conditioning pushes CO₂ up in the hot season and the northern summer, and power cuts
     cost approval — unless Demand Response (E9) is owned.
   · Farming by season: each monsoon brings a good harvest (money) or floods / drought (approval, an aid bubble);
     Drought-Proof Crops (A3) and Low-Methane Rice (A1) improve the odds, a hotter world worsens them.
   · Seasons get harsher as the world warms (seasonPower): hazard season weights, the power peak and the farming
     odds all scale with it.
   · Season report: when a season ends it gets a grade A–F (CO₂, approval, disaster damage, aid) and A–B pay a reward.
   (The seasonal look of the map is drawn in life.js drawSeason.)
   ========================================================================= */
const {S} = P;
const T = (th, en) => ({th, en});
const L = o => P.L(o);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hook = (name, ...a) => (P.H && P.H[name] ? P.H[name](...a) : undefined);
const has = id => !!(S.owned && S.owned[id]);

/* 1 = today's seasons; up to ~1.9 at +2.7°C */
const seasonPower = () => 1 + clamp(S.temp - 1.2, 0, 1.5) * 0.6;

/* idea 7: seasons get harsher with warming — the hazard weights move further from 1 */
const _sw = P.seasonWeight;
if (_sw) P.seasonWeight = (type, cid) => { const w = _sw(type, cid); return Math.max(.1, 1 + (w - 1) * seasonPower()); };

const TXT = {
  report:T("สรุปฤดู", "Season report"), next:T("ฤดูนี้", "Now"), reward:T("รางวัล", "Reward"),
  tip:{
    cool:T("ลมแรง กังหันลมผลิตไฟได้ดี · คลื่นหนาวทำให้ใช้พลังงานมาก", "Strong winds: wind farms do well · cold snaps use more energy"),
    hot:T("แดดจัด โซลาร์ผลิตได้มาก · ไฟฟ้าพีคจากแอร์ · ฤดูไฟป่าและหมอกควัน", "Strong sun: solar does well · air-conditioning peak · fire and haze season"),
    monsoon:T("เมฆฝนบังแดด โซลาร์ผลิตน้อย · ผลผลิตเกษตรขึ้นกับฝน · น้ำท่วมในเอเชีย", "Rain clouds: solar makes less · the harvest depends on the rain · floods in Asia"),
    storm:T("พายุเฮอริเคนและไต้ฝุ่นบ่อย · ลมแรง กังหันลมผลิตไฟได้ดี", "Hurricanes and typhoons · strong winds: wind farms do well"),
  },
  peak:T("[[plug-zap]] ไฟฟ้าพีคหน้าร้อน: แอร์ทำให้ไฟตกและไฟดับ ความนิยมลดลง (สกิล “ระบบลดการใช้ไฟช่วงพีก” ช่วยได้)", "[[plug-zap]] Summer power peak: air-conditioning causes brownouts and blackouts, approval falls (the Demand Response skill helps)"),
  peakOk:T("[[plug-zap]] ไฟฟ้าพีคหน้าร้อน: ระบบลดการใช้ไฟช่วงพีกรับมือได้ ไม่มีไฟดับ", "[[plug-zap]] Summer power peak: Demand Response handles it, no blackouts"),
  good:T("[[wheat]] ฝนดี ผลผลิตเกษตรล้นตลาด", "[[wheat]] Good rains: a bumper harvest"),
  flood:T("[[cloud-rain]] มรสุมหนักเกินไป นาข้าวจมน้ำ", "[[cloud-rain]] Too much monsoon rain: rice fields flooded"),
  dry:T("[[sun]] ฝนทิ้งช่วง ภัยแล้งทำให้พืชผลเสียหาย", "[[sun]] The rains failed: drought ruins crops"),
  normal:T("[[wheat]] ฤดูเพาะปลูกปกติ", "[[wheat]] An ordinary growing season"),
  solarUp:T("แดดจัด โซลาร์ผลิตไฟได้มาก", "Strong sun, solar makes more"), solarDown:T("เมฆฝนบังแดด โซลาร์ผลิตไฟลดลง", "Rain clouds, solar makes less"),
  windUp:T("ลมแรง กังหันลมผลิตไฟได้มาก", "Strong winds, wind farms make more"),
};

/* idea 2 + 3: this month's seasonal CO₂ swing (Gt; + = more CO₂) */
function seasonCO2(id){
  const k = seasonPower(), E2 = has("E2") ? 1 : 0, E7 = has("E7") ? 1 : 0, dip = has("E3") ? .5 : 1;
  let v = 0;
  if (id === "hot") v += -.25 * E2 - .1 * E7;   // strong sun
  if (id === "monsoon") v += (.2 * E2 + .1 * E7) * dip;   // clouds
  if (id === "storm") v += -.2 * E2;   // strong wind
  if (id === "cool") v += -.1 * E2;   // wind
  // 3.7.7: air-conditioning / heating no longer add CO₂ every month (it dragged approval down through the whole game);
  // the summer peak now only costs a little approval (seasonsTick)
  return +v.toFixed(3);
}

/* idea 4: the harvest, decided once a year in the middle of the monsoon */
function harvest(){
  const k = seasonPower() - 1;
  const pGood = clamp(.5 - k * .5 + (has("A3") ? .15 : 0) + (has("A1") ? .05 : 0), .1, .8);
  const pBad = clamp(.15 + k * .55 - (has("A3") ? .1 : 0), .05, .7);
  const r = P.rand();
  if (r < pGood){
    const g = SR.harvest + Math.round(SR.harvestR * P.rand()); S.ep += g; S.appr = clamp(S.appr + 1, 0, 100);   // 3.7.7: a good harvest also pleases people if (P.ledgerTag) P.ledgerTag("harvest", g, 0);
    P.addLog(`${L(TXT.good)} · ${P.IC.ep} +${g} · ${L(T("ความนิยม", "Approval"))} +1%`, "gd"); hook("toast", {icon:"wheat", title:L(TXT.good).replace(/\[\[[^\]]+\]\]\s*/, ""), msg:`${P.IC.ep} +${g}`});
    return;
  }
  if (r < pGood + pBad){
    const flood = P.rand() < .55, a0 = S.appr; S.appr = clamp(S.appr - 1 * seasonPower(), 0, 100);   // 3.7.7: was −3
    const pool = S.countries.filter(c => !c.rest && ["SEA", "SA", "MEAF", "EA"].includes(c.reg) && P.COUNTRY[c.id] && (P.COUNTRY[c.id].tags || []).some(x => x === "farm" || x === "vul"));
    const c = pool[Math.floor(P.rand() * pool.length)];
    if (c) S.bubbles.push({id:++S.bubId, type:"red", reg:c.reg, cid:c.id, hz:flood ? "flood" : "drought", ttl:5});
    const txt = flood ? TXT.flood : TXT.dry;
    P.addLog(`${L(txt)}${c ? " · " + P.cname(c.id) : ""} · ${L(T("ความนิยม", "Approval"))} ${(S.appr - a0).toFixed(1)}%`, "al");
    hook("toast", {icon:flood ? "cloud-rain" : "sun", title:L(txt).replace(/\[\[[^\]]+\]\]\s*/, ""), msg:c ? `${P.cname(c.id)} · ${L(T("แตะฟองสีแดงเพื่อช่วยเหลือ", "Tap the red bubble to send aid"))}` : ""});
    hook("sfx", "warn");
    return;
  }
  P.addLog(L(TXT.normal), "ev");
}

/* idea 8: a grade for the season that just ended */
const baseNet = () => P.netCO2() - (S.seasCO2 || 0);   // without the seasonal swing, so a season is graded on real progress
function snap(){ return {tick:S.tick, net:baseNet(), appr:S.appr, dmg:(S.stats.dmg || []).length, aid:S.stats.aid || 0, evac:S.stats.evac || 0, sid:P.seasonOf(S.tick).id}; }
function grade(a){
  const net = baseNet(), hits = (S.stats.dmg || []).slice(a.dmg), dN = a.net - net, dA = S.appr - a.appr;
  let pts = 0;
  pts += dN > .4 ? 3 : dN > .1 ? 2 : dN > -.25 ? 1 : 0;
  pts += dA >= 0 ? 2 : dA > -3 ? 1 : 0;
  const avgD = hits.length ? hits.reduce((s, h) => s + h.d, 0) / hits.length : 0;
  pts += !hits.length || avgD < .45 ? 2 : avgD < .8 ? 1 : 0;
  pts += (S.stats.aid || 0) > a.aid || (S.stats.evac || 0) > a.evac ? 1 : 0;
  const g = pts >= 7 ? "A" : pts >= 5 ? "B" : pts >= 4 ? "C" : pts >= 2 ? "D" : "F";
  return {g, pts, dN, dA, hits:hits.length};
}
/* the numbers a season can give or take (P.SEASON_RULES, so the bot test can try others) */
/* 2.1.3: rewards were A 40 money + 10 policy points, B 20 + 5, four times a year — about +160 money and +40 points a
   year for a good player, which made every game a win (the bot test did not load this file then; it does now) */
const SR = P.SEASON_RULES = {A:{ep:15, pc:3}, B:{ep:6, pc:1}, harvest:25, harvestR:10, peak:.06};
const REWARD = {get A(){ return SR.A; }, get B(){ return SR.B; }, C:null, D:null, F:null};

function seasonsTick(){
  if (!S.started || S.training) return;
  const m = S.tick % 12, sea = P.seasonOf(S.tick);
  S.seasCO2 = seasonCO2(sea.id);
  // summer peak: approval
  if (sea.id === "hot" && !has("E9")) S.appr = clamp(S.appr - SR.peak * seasonPower(), 0, 100);   // 3.7.7: was −.35 a month (+ June): too harsh, players lost on approval
  if (m === 6) harvest();
  // a new season starts (months 2, 5, 8, 11)
  if (m % 3 === 2){
    const prev = S.seaSnap;
    let head = "", msg = `${L(TXT.next)}: ${L(sea.name)} · ${L(TXT.tip[sea.id])}`;
    if (prev && S.tick - prev.tick >= 2){
      const r = grade(prev), rw = REWARD[r.g], pname = L((P.SEASONS.find(s => s.id === prev.sid) || sea).name);
      if (rw){ S.ep += rw.ep; S.pc += rw.pc; if (P.ledgerTag) P.ledgerTag("season", rw.ep, rw.pc); }
      S.seaGrades = (S.seaGrades || []).concat(r.g).slice(-40);
      head = `${L(TXT.report)} ${pname}: ${r.g}`;
      const rwTxt = rw ? ` · ${L(TXT.reward)} ${P.IC.ep} +${rw.ep}${rw.pc ? ` ${P.IC.pc} +${rw.pc}` : ""}` : "";
      P.addLog(`[[award]] ${head} (CO₂ ${r.dN >= 0 ? "−" : "+"}${Math.abs(r.dN).toFixed(1)} Gt · ${L(T("ความนิยม", "approval"))} ${r.dA >= 0 ? "+" : ""}${r.dA.toFixed(1)}% · ${L(T("ภัยพิบัติ", "disasters"))} ${r.hits})${rwTxt}`, r.g <= "B" ? "gd" : r.g === "C" ? "ev" : "al");
      msg = `${rw ? `${L(TXT.reward)} +${rw.ep}${rw.pc ? ` · +${rw.pc}` : ""} · ` : ""}${msg}`;
      hook("sfx", r.g <= "B" ? "done" : "tick");
    }
    S.seaSnap = snap();
    if (sea.id === "hot") P.addLog(L(has("E9") ? TXT.peakOk : TXT.peak), has("E9") ? "gd" : "al");
    hook("toast", {id:"season", icon:sea.icon, title:head || L(sea.name), msg, grade:head ? head.slice(-1) : null});
  }
}
/* what the season does to energy right now, for the HUD (short lines) */
function seasonInfo(){
  const sea = P.seasonOf(S.tick), out = [];
  if (has("E2") && sea.id === "hot") out.push(TXT.solarUp);
  if (has("E2") && sea.id === "monsoon") out.push(TXT.solarDown);
  if (has("E2") && (sea.id === "storm" || sea.id === "cool")) out.push(TXT.windUp);
  return {sea, tip:TXT.tip[sea.id], co2:S.seasCO2 || 0, power:seasonPower(), lines:out};
}

const _v1 = P.v1Tick;
P.v1Tick = () => { if (_v1) _v1(); seasonsTick(); };
Object.assign(P, {seasonPower, seasonCO2, seasonsTick, seasonInfo, SEASON_TXT:TXT});
