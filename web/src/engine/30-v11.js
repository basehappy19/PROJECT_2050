const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.v11) return;
(P.mods = P.mods || {}).v11 = 1;
/* =========================================================================
   Version 1.1 · Friendship has teeth, news and statistics are worth reading
   · Hostile countries (friendship −30 or lower) stop cooperating: their CO₂ creeps back up,
     and they may put trade sanctions on us (money every month, no minerals from them).
   · A carbon tariff or other pressure can make a country hit back straight away.
   · Every 6 months the news brings a season forecast: which continent will be hit hardest
     (it is real: disasters really lean there). Reading new forecasts gives policy points.
   · Every January a yearly report waits in the statistics panel: where we stand, who is angry,
     what to do next — reading it gives policy points.
   ========================================================================= */
const S = P.S, T = (th, en) => ({th, en}), L = o => P.L(o);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hook = (name, ...a) => (P.H && P.H[name] ? P.H[name](...a) : undefined);
const IC = () => P.IC;

const HOSTILE = -30;                  // at or below this a country stops cooperating
const SANCT_MONTHS = 6;
const sanctCost = c => Math.max(2, Math.round(2 + Math.log10(P.COUNTRY[c.id].w + 1) * 1.5));   // money per month
const TX = {
  sanct:T("คว่ำบาตรการค้ากับเรา", "puts trade sanctions on us"),
  sanctEnd:T("ยกเลิกการคว่ำบาตรแล้ว", "lifts its sanctions"),
  hostile:T("ไม่ร่วมมือแล้ว: CO₂ ของประเทศนี้จะค่อยๆ เพิ่มขึ้น และอาจคว่ำบาตรเรา", "stops cooperating: its CO₂ will creep up and it may sanction us"),
  intel:T("ข่าวกรองฤดูกาล", "Season forecast"),
  intelTxt:T("6 เดือนข้างหน้า {R} เสี่ยงภัยพิบัติสูงกว่าที่อื่นมาก ({H}) ช่วยเตรียมรับมือภัยหรือเก็บเงินไว้อพยพ", "For the next 6 months {R} faces far more disasters than anywhere else ({H}). Help them prepare or keep money for evacuations."),
  readNews:T("อ่านข่าวกรองใหม่", "Read new forecasts"),
  report:T("รายงานประจำปี", "Yearly report"),
};
P.TX11 = TX;

/* a country we pushed may hit back now (k = how hard we pushed) */
function retaliate(c, k){
  if (!c || c.rest || c.rel > -20 || (S.sanct || {})[c.id] > 0) return false;
  const p = k * (0.4 + clamp((-c.rel - 20) / 80, 0, 1) * 0.6);
  if (P.rand() >= p) return false;
  sanction(c); return true;
}
function sanction(c){
  (S.sanct = S.sanct || {})[c.id] = SANCT_MONTHS;
  (S.oreBan = S.oreBan || {})[c.id] = Math.max(S.oreBan[c.id] || 0, SANCT_MONTHS);
  P.addLog(`[[ban]] ${P.cname(c.id)} ${L(TX.sanct)} · ${IC().ep} −${sanctCost(c)}${P.t("perMo")} · ${IC().ore} ✕ · ${SANCT_MONTHS} ${P.t("months")}`, "al");
  hook("sfx", "warn"); hook("toast", {id:"sanct" + c.id + S.tick, icon:"ban", title:L(T("ถูกคว่ำบาตร", "Sanctions")), msg:P.cname(c.id)});
  if (P.timeline) P.timeline("sanct", {c:c.id});
}
/* money lost to sanctions this month (shown next to income) */
const sanctionsCost = () => Object.keys(S.sanct || {}).filter(k => S.sanct[k] > 0).reduce((s, k) => { const c = P.C(k); return s + (c ? sanctCost(c) : 0); }, 0);

function hostilityTick(){
  for (const c of S.countries){
    if (c.rest) continue;
    if (c.rel <= HOSTILE){
      const k = clamp((-c.rel + HOSTILE) / 70, 0, 1);
      // not cooperating: emissions creep back towards where they started
      if (c.co2 < c.co2_0 * 1.15) P.addCountryCO2(c, c.co2_0 * 0.0016 * (0.5 + k));
      if (!c.hostile){ c.hostile = 1; P.addLog(`[[angry]] ${P.cname(c.id)} ${L(TX.hostile)}`, "in"); }
      if (!((S.sanct || {})[c.id] > 0) && P.rand() < 0.035 * (1 + k * 2)) sanction(c);
    } else if (c.hostile && c.rel > HOSTILE + 10) c.hostile = 0;
  }
  // sanctions cost money every month and slowly wear off
  for (const k of Object.keys(S.sanct || {})){
    if (!(S.sanct[k] > 0)) continue;
    const c = P.C(k); if (c) S.ep = Math.max(0, S.ep - sanctCost(c));
    if (--S.sanct[k] === 0) P.addLog(`[[handshake]] ${P.cname(k)} ${L(TX.sanctEnd)}`, "gd");
  }
  // the border carbon tax (skill P3) annoys continents that are behind the plan
  if (S.owned.P3) S.regions.forEach(r => { if (r.comp < 70) P.regCountries(r.id, false).forEach(c => { if (P.COUNTRY[c.id].stance < .3) c.rel = clamp(c.rel - .25, -100, 100); }); });
}

/* season forecast every 6 months: one continent is much more likely to be hit (hazardTick reads S.intel) */
function intelTick(){
  if (S.tick % 6 !== 1) return;
  const regs = S.regions.slice(), pick = P.rand();
  let tot = regs.reduce((s, r) => s + r.vuln + 20, 0), acc = 0, reg = regs[0];
  for (const r of regs){ acc += (r.vuln + 20) / tot; if (pick <= acc){ reg = r; break; } }
  const hz = [...new Set(P.regCountries(reg.id, false).flatMap(c => P.COUNTRY[c.id].hz))].slice(0, 3).map(h => L(P.HAZARDS[h].name)).join(", ");
  S.intel = {reg:reg.id, until:S.tick + 6};
  P.addLog(`[[radar]] ${L(TX.intel)}: ${L(TX.intelTxt).replace("{R}", L(P.RMETA[reg.id].name)).replace("{H}", hz)}`, "in");
  S.unread = (S.unread || 0) + 1;
}
/* opening the news panel: new forecasts are worth a few policy points */
function readNews(){
  const n = Math.min(3, S.unread || 0); S.unread = 0;
  if (!n) return 0;
  S.pc += n * 2; P.addLog(`[[newspaper]] ${L(TX.readNews)} · ${IC().pc} +${n * 2}`, "gd"); hook("sfx", "coin"); P.changed();
  return n * 2;
}

/* yearly report (every January), waiting in the statistics panel */
function reportTick(){
  if (S.tick % 12 !== 0 || S.tick === 0) return;
  const prev = S.hist[Math.max(0, S.hist.length - 13)], net = P.netCO2();
  const regs = S.regions.slice().sort((a, b) => b.co2 / b.co2_0 - a.co2 / a.co2_0);
  const angry = S.countries.filter(c => !c.rest && c.rel <= HOSTILE).sort((a, b) => a.rel - b.rel).map(c => c.id);
  const friends = S.countries.filter(c => !c.rest && c.rel >= 40).length;
  const top = S.countries.filter(c => !c.rest).sort((a, b) => b.co2 - a.co2).slice(0, 3).map(c => c.id);
  S.report = {y:2025 + S.tick / 12, net, dNet:net - prev.net, temp:S.temp, dTemp:S.temp - prev.temp, appr:S.appr, lag:regs[0].id, best:regs[regs.length - 1].id,
    angry:angry.slice(0, 5), nAngry:angry.length, friends, top, sanct:Object.keys(S.sanct || {}).filter(k => S.sanct[k] > 0), read:false, reward:5};
}
function readReport(){
  const r = S.report; if (!r || r.read) return 0;
  r.read = true; S.pc += r.reward; P.addLog(`[[chart-line]] ${L(TX.report)} ${r.y} · ${IC().pc} +${r.reward}`, "gd"); hook("sfx", "coin"); P.changed();
  return r.reward;
}

/* the first time two countries are friendly enough, point the player at bilateral deals */
function tipsTick(){
  if (!S.flags.bilatTip && S.countries.filter(c => !c.rest && c.rel >= 40).length >= 2){
    S.flags.bilatTip = 1; P.addLog(`[[handshake]] ${P.t("bilatTip")}`, "in");
    hook("toast", {id:"bilatTip", icon:"handshake", title:P.t("bilatTitle"), msg:P.t("bilatReady")});
  }
}
const _tick = P.v1Tick;
P.v1Tick = () => { if (_tick) _tick(); hostilityTick(); intelTick(); reportTick(); tipsTick(); };

/* older saves: add the countries that came in 1.1 (their CO₂ is taken out of "other countries" in the same continent) */
function fixCountries(){
  if (!S.countries || !S.countries.length) return;
  for (const r of S.regions){
    const missing = P.COUNTRIES.filter(c => c.reg === r.id && !S.countries.some(x => x.id === c.id)); if (!missing.length) continue;
    const rest = S.countries.find(x => x.id === "R_" + r.id); if (!rest) continue;
    const restW = P.REST_W[r.id] + missing.reduce((s, c) => s + c.w, 0);
    for (const c of missing){
      const f = c.w / restW, co2 = rest.co2 * f, co20 = rest.co2_0 * f;
      S.countries.push({id:c.id, reg:r.id, co2, co2_0:co20, rel:Math.round(c.stance * 30 + 10), adapt:0, cd:{}});
      rest.co2 -= co2; rest.co2_0 -= co20;
    }
  }
}
const _init = P.v1Init;
P.v1Init = () => { fixCountries(); if (_init) _init(); };

Object.assign(P, {HOSTILE, retaliate, sanction, sanctionsCost, sanctCost, readNews, readReport, fixCountries});
