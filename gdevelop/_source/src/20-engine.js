const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.engine) return;
(P.mods = P.mods || {}).engine = 1;
/* =========================================================================
   Engine · Simulation
   One tick = one in-game month. The scene's "tick" timer calls P.tick().
   Regions hold the totals; each region is split into countries (+ one pooled
   "other countries" entry) so CO₂ can be cut country by country.
   Everything visual goes through the hooks in P.H (set by the UI/Map/Audio modules).
   ========================================================================= */
const {UI, MONTHS, RESERVE, REGIONS, RIDS, RMETA, CITIES, ACTIONS, SKILLS, SKILL, SKILL_CATS, EVENTS, NEWS, ACH, IC,
  COUNTRIES, COUNTRY, REST_W, HAZARDS, CEVENTS, CE_FIXED, CHARS, CHAR, STORY, levelOf} = P;
const H = P.H = P.H || {};
const hook = (name, ...a) => (H[name] ? H[name](...a) : undefined);
const S = P.S = P.S || {};
const t = k => (UI[k] ? UI[k][S.lang || "th"] : k);
const L = o => (o && typeof o === "object" ? o[S.lang || "th"] : o);

const SAVE_VERSION = 2;
const TOTAL_TICKS = 300;
const TIP_TO_TEMP = 0.004;          // 1 'tipping %' ≈ +0.004 °C
const SPEEDS = [0, 4, 2, 4 / 3];    // seconds per month: 1× = 15 min game, 2× = 7.5 min, 3× = 5 min
const MAX_PROJECTS = 3;
const MODES = {normal:{ep:25, pc:20, haz:1, dmg:1}, hard:{ep:10, pc:12, haz:1.6, dmg:1.25}, daily:{ep:25, pc:20, haz:1.15, dmg:1}};

/* ---------------------------- Random numbers (seeded, so a Daily Challenge is the same for everyone) ---------------------------- */
function rand(){ let x = (S.rng = (S.rng + 0x6D2B79F5) | 0); x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }
const randSeed = () => (Math.random() * 2 ** 31) | 0;

function newState(lang, o = {}){
  const mode = MODES[o.mode] ? o.mode : "normal", M = MODES[mode];
  const st = {
    v:SAVE_VERSION, lang: lang || "th", mode, char:CHAR[o.char] ? o.char : "sci", charLv:o.charLv || 1, seed:o.seed ?? randSeed(), rng:0,
    speed:1, tick:0, realSec:0,
    temp:1.20, tip:10, ep:M.ep, pc:M.pc, appr:75, buys:[],
    epInc:0, damp:0, sink:0, discAll:1, disc:{}, p3:false,
    owned:{}, rollouts:[], crolls:[], delays:[], stall:0,
    used:[], ceUsed:[], lastEv:-3, bubbles:[], bubId:0, newsUsed:[], flags:{},
    regions: REGIONS.map(r => ({id:r.id, co2:r.co2, co2_0:r.co2, fossil0:r.fossil, comp:r.comp, compBase:r.comp, vuln:r.vuln, cd:{}, uses:{}})),
    countries:[], selC:null, haz:[], hazId:0, actCd:{}, buff:{}, bond:0, alli:{}, bilats:[], roles:{}, evacFree:{},
    stats:{help:{}, dmg:[], dec:[], evac:0, aid:0},
    story:{}, cev:null,
    hist:[{net:36, temp:1.2}], log:[],
    sel:"SEA", tab:null, node:"E1", skillCat:"energy", over:null, event:null, started:false, runId:null,
  };
  st.rng = st.seed | 0;
  return st;
}
function buildCountries(){
  S.countries = [];
  for (const r of S.regions){
    const list = COUNTRIES.filter(c => c.reg === r.id), tot = list.reduce((s, c) => s + c.w, 0) + REST_W[r.id];
    for (const c of list){
      const rel = Math.round(Math.max(-60, Math.min(70, c.stance * 30 + 10 + (rand() - .5) * 16)));
      S.countries.push({id:c.id, reg:r.id, co2:r.co2 * c.w / tot, co2_0:r.co2 * c.w / tot, rel, adapt:0, cd:{}});
    }
    S.countries.push({id:"R_" + r.id, reg:r.id, rest:true, co2:r.co2 * REST_W[r.id] / tot, co2_0:r.co2 * REST_W[r.id] / tot, rel:10, adapt:0, cd:{}});
  }
}
function resetState(o){ Object.keys(S).forEach(k => delete S[k]); Object.assign(S, o); }

/* ---------------------------- Helpers ---------------------------- */
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const R = id => S.regions.find(r => r.id === id);
const C = id => S.countries.find(c => c.id === id);
const regCountries = (reg, withRest = true) => S.countries.filter(c => c.reg === reg && (withRest || !c.rest));
const avg = f => S.regions.reduce((s,r) => s + f(r), 0) / S.regions.length;
const grossCO2 = () => S.regions.reduce((s,r) => s + r.co2, 0);
const sinkEff = () => clamp(1 - Math.max(0, S.temp - 1.2) * 0.3, 0.5, 1);
const netCO2 = () => grossCO2() - S.sink * sinkEff();
const lastMile = r => 0.2 + 0.8 * clamp(r.co2 / r.co2_0, 0, 1);
const dateStr = (tk = S.tick) => `${MONTHS[S.lang][tk % 12]} ${2026 + Math.floor(tk / 12)}`;
const fmt = (v,d=1) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d);
const pick = (arr, w) => { let s = arr.reduce((a,x) => a + w(x), 0), r = rand() * s; for (const x of arr){ r -= w(x); if (r <= 0) return x; } return arr[arr.length-1]; };
const cname = id => { if (!id) return ""; if (id.startsWith("R_")) return `${t("otherIn")} ${L(RMETA[id.slice(2)].name)}`; return L(COUNTRY[id].name); };
const joinNames = ids => { const n = ids.map(cname); if (n.length < 2) return n.join(""); return n.slice(0, -1).join(", ") + ` ${t("and")} ` + n[n.length - 1]; };
function addLog(txt, cls=""){ S.log.unshift({tk:S.tick, txt, cls}); if (S.log.length > 150) S.log.pop(); }
/* region totals = sum of their countries; a change to a whole region is shared out in proportion */
function syncRegion(r){ r.co2 = regCountries(r.id).reduce((s, c) => s + c.co2, 0); }
function setRegionCO2(r, v){
  v = Math.max(0, v); const old = r.co2, list = regCountries(r.id);
  if (old > 1e-9) list.forEach(c => c.co2 *= v / old); else { const tot = list.reduce((s, c) => s + c.co2_0, 0) || 1; list.forEach(c => c.co2 = v * c.co2_0 / tot); }
  r.co2 = v;
}
function addCountryCO2(c, d){ c.co2 = Math.max(0, c.co2 + d); syncRegion(R(c.reg)); }
function applyGlobalCO2(delta){ const g = grossCO2() || 1; S.regions.forEach(r => applyRegionCO2(r, delta * (r.co2 / g))); }
function applyRegionCO2(r, delta){ const d = delta < 0 ? delta * (r.comp / 100) * lastMile(r) : delta; setRegionCO2(r, r.co2 + d); }
function changeComp(id, v, permanent){ (id === "ALL" ? S.regions : [R(id)]).forEach(r => { r.comp = clamp(r.comp + v, 0, 100); if (permanent) r.compBase = clamp(r.compBase + v, 0, 100); }); }
function changeVuln(id, v){ (id === "ALL" ? S.regions : [R(id)]).forEach(r => { r.vuln = clamp(r.vuln + v, 0, 100); }); }
const charLvBonus = () => S.charLv >= 3;
function relMult(){ let m = 1; if (S.owned.D1) m += .2; if (S.char === "dip") m += charLvBonus() ? .25 : .15; return m; }
function changeRel(id, v){
  const c = C(id); if (!c) return 0;
  const d = v > 0 ? v * relMult() : v, before = c.rel;
  c.rel = clamp(c.rel + d, -100, 100);
  if (c.rel >= 100) Ach.unlock("rel100");
  return c.rel - before;
}
const avgRel = reg => { const l = regCountries(reg, false); return l.length ? l.reduce((s, c) => s + c.rel, 0) / l.length : 0; };
const relAll = () => { const l = S.countries.filter(c => !c.rest); return l.reduce((s, c) => s + c.rel, 0) / l.length; };

/* ---------------------------- Economy ---------------------------- */
function epGain(){
  let base = 2 + avg(r => r.comp) * 0.07 + S.appr / 30;
  if (S.char === "eco") base *= charLvBonus() ? 1.15 : 1.1;
  return Math.floor(base) + S.epInc;
}
const pcGain = () => Math.floor(1 + avg(r => r.comp) * 0.03);
const recentBuys = () => (S.buys || []).filter(tk => S.tick - tk < 12).length;
const rushMult = () => 1 + 0.2 * recentBuys();
function nodeCost(n){
  let m = (S.disc[n.id] ?? 1) * S.discAll * rushMult();
  if (S.char === "sci" && n.cat === "energy") m *= charLvBonus() ? .85 : .9;
  if (S.buff.disc) m *= .6;
  return {ep: Math.round(n.ep * m), pc: Math.round(n.pc * m)};
}
const busyIds = () => [...new Set(S.rollouts.map(r => r.id))];
const atCapacity = n => n.months > 0 && !S.buff.instant && busyIds().length >= MAX_PROJECTS;
function nodeState(n){ if (S.owned[n.id]) return "own"; return n.req.every(q => S.owned[q]) ? "ready" : "locked"; }
function actionCost(a, r, country){
  const m = Math.pow(1.25, r.uses[a.id] || 0) * (country ? .4 : 1);
  return {ep: Math.round(a.ep * RESERVE[RMETA[r.id].reserve].m * m), pc: Math.round(a.pc * m)};
}
function rollProgress(id){ const rs = S.rollouts.filter(r => r.id === id); if (!rs.length) return null; return Math.min(...rs.map(r => 1 - r.left / r.months)); }
/* how much a hazard type is softened by owned skills (0 = none … close to 1) */
function respOf(type){ let m = 1; for (const n of SKILLS) if (S.owned[n.id] && n.resp && n.resp[type]) m *= 1 - n.resp[type]; return 1 - m; }

/* ---------------------------- Player actions: skills ---------------------------- */
function buyNode(id){
  const n = SKILL[id]; if (!n || nodeState(n) !== "ready") return false;
  const c = nodeCost(n); if (S.ep < c.ep || S.pc < c.pc || atCapacity(n)) return false;
  S.ep -= c.ep; S.pc -= c.pc; S.owned[id] = true; (S.buys = S.buys || []).push(S.tick);
  const instant = !!S.buff.instant; S.buff.instant = 0; S.buff.disc = 0;
  const fx = n.fx;
  const boost = (n.cat === "energy" && id !== "E1" && S.owned.E1) ? 1.1 : 1;
  const dacEff = (id === "N4" && !S.owned.E2) ? 0.6 : 1;
  if (fx.appr) S.appr = clamp(S.appr + fx.appr, 0, 100);
  if (fx.compAll) changeComp("ALL", fx.compAll, true);
  if (fx.comp) Object.entries(fx.comp).forEach(([k,v]) => changeComp(k, v, true));
  if (fx.vuln) Object.entries(fx.vuln).forEach(([k,v]) => changeVuln(k, v));
  if (fx.vulnAll) changeVuln("ALL", fx.vulnAll);
  if (fx.epInc) S.epInc += fx.epInc;
  if (fx.damp) S.damp += fx.damp;
  if (fx.tip) S.temp += fx.tip * TIP_TO_TEMP;
  if (fx.p3) S.p3 = true;
  const per = {};
  if (fx.co2){ const g = grossCO2() || 1; S.regions.forEach(r => per[r.id] = (per[r.id]||0) + fx.co2 * boost * r.co2 / g); }
  if (fx.all) RIDS.forEach(k => per[k] = (per[k]||0) + fx.all * boost);
  if (fx.rco2) Object.entries(fx.rco2).forEach(([k,v]) => per[k] = (per[k]||0) + v * boost);
  const months = instant ? 1 : Math.max(1, n.months);
  if (Object.keys(per).length){
    if (instant) S.regions.forEach(r => { if (per[r.id]) setRegionCO2(r, r.co2 + per[r.id] * (r.comp / 100) * lastMile(r)); });
    else S.rollouts.push({id, kind:"co2", left:months, months, per});
  }
  if (fx.sink){ if (instant) S.sink += fx.sink * dacEff; else S.rollouts.push({id, kind:"sink", left:months, months, amt: fx.sink * dacEff}); }
  addLog(`${t("logTech")}: ${L(n.name)}`, "tc"); Ach.check();
  hook("sfx", "buy"); changed(); return true;
}
/* active skills and character abilities share one cooldown table (months) */
function abilityList(){
  const out = [];
  const ch = CHAR[S.char];
  if (ch) ch.acts.forEach(a => out.push({id:a.id, kind:"char", icon:a.icon, name:a.name, desc:a.desc, cd:a.cd, lock:a.lv && S.charLv < a.lv ? a.lv : 0}));
  SKILLS.filter(n => n.type === "active" && S.owned[n.id]).forEach(n => out.push({id:n.id, kind:"skill", icon:n.icon, name:n.name, desc:n.desc, cd:n.cd, target:n.target}));
  return out;
}
function abilityReady(a){ return !a.lock && !(S.actCd[a.id] > 0) && (a.target !== "country" || (S.selC && !S.selC.startsWith("R_"))); }
function useAbility(id){
  const a = abilityList().find(x => x.id === id); if (!a || !abilityReady(a) || S.over || S.event) return false;
  const c = S.selC ? C(S.selC) : null;
  switch (id){
    case "I4": addCountryCO2(c, -0.15 * c.co2); changeRel(c.id, -5); S.stats.help[c.id] = (S.stats.help[c.id] || 0) + 1; break;
    case "C6": S.evacFree[c.id] = 1; break;
    case "D4": S.ep += 80; S.appr = clamp(S.appr - 4, 0, 100); break;
    case "sci1": S.buff.instant = 1; break;
    case "sci2": S.buff.disc = 1; break;
    case "dip1": regCountries(S.sel, false).forEach(x => changeRel(x.id, 15)); break;
    case "dip2": changeComp("ALL", 8, false); break;
    case "eco1": S.ep += 120; S.bond = 12; break;
    case "eco2": if (S.pc < 20) return false; S.pc -= 20; S.ep += 70; break;
    case "act1": S.appr = clamp(S.appr + 12, 0, 100); break;
    case "act2": changeComp("ALL", 6, false); S.countries.forEach(x => { if (!x.rest) changeRel(x.id, 5); }); break;
    default: return false;
  }
  S.actCd[id] = a.cd;
  addLog(`${t("logAbility")}: ${L(a.name)}${a.target === "country" && c ? " → " + cname(c.id) : ""}`, "tc");
  hook("sfx", "action"); Ach.unlock("ability1");
  if (!checkEnd()) changed(); return true;
}

/* ---------------------------- Player actions: regions and countries ---------------------------- */
/* regional orders; when a country is selected the order can target just that country (cheaper, narrower) */
function doAction(aid, scope){
  const a = ACTIONS.find(x => x.id === aid), r = R(S.sel);
  const cc = scope === "country" && S.selC && !S.selC.startsWith("R_") ? C(S.selC) : null;
  if (!a || !r || (r.cd[aid] || 0) > 0) return;
  const c = actionCost(a, r, !!cc); if (S.ep < c.ep || S.pc < c.pc) return;
  S.ep -= c.ep; S.pc -= c.pc; r.uses[aid] = (r.uses[aid] || 0) + 1; r.cd[aid] = a.cd;
  if (!cc){
    if (aid === "fund")   setRegionCO2(r, r.co2 - 0.35 * r.comp / 100);
    if (aid === "diplo")  r.comp = clamp(r.comp + 8, 0, 100);
    if (aid === "adapt"){ r.vuln = clamp(r.vuln - 10, 0, 100); S.appr = clamp(S.appr + 1, 0, 100); }
    if (aid === "tariff"){ setRegionCO2(r, r.co2 - 0.8 * r.comp / 100); r.comp = clamp(r.comp - 6, 0, 100); regCountries(r.id, false).forEach(x => changeRel(x.id, -4)); }
  } else {
    if (aid === "fund"){ addCountryCO2(cc, -cc.co2 * 0.12 * r.comp / 100); changeRel(cc.id, 3); }
    if (aid === "diplo") changeRel(cc.id, 12);
    if (aid === "adapt"){ cc.adapt = clamp(cc.adapt + 20, 0, 100); changeRel(cc.id, 4); }
    if (aid === "tariff"){ addCountryCO2(cc, -cc.co2 * 0.25 * r.comp / 100); changeRel(cc.id, -12); }
    S.stats.help[cc.id] = (S.stats.help[cc.id] || 0) + 1;
  }
  addLog(`${t("logAct")}: ${L(a.name)} → ${cc ? cname(cc.id) : L(RMETA[r.id].name)}`, "tc"); Ach.unlock("action1"); hook("sfx", "action");
  if (!checkEnd()) changed();
}
/* orders for one country (relations) */
const CACTS = [
  {id:"talk",  icon:"message-circle", ep:0,  pc:6,  cd:6,  name:{th:"เจรจา",en:"Negotiate"}, desc:{th:"ความสัมพันธ์ +10",en:"Relation +10"}},
  {id:"fund",  icon:"hand-coins",     ep:50, pc:0,  cd:12, name:{th:"ส่งทุนสนับสนุน",en:"Send funding"}, desc:{th:"ความสัมพันธ์ +20 และ CO₂ ประเทศนี้ −8% ภายใน 12 เดือน",en:"Relation +20; this country's CO₂ −8% over 12 months"}},
  {id:"tech",  icon:"arrow-left-right", ep:0, pc:10, cd:12, req:"D2", name:{th:"แลกเปลี่ยนเทคโนโลยี",en:"Share technology"}, desc:{th:"ความสัมพันธ์ +8 และ CO₂ ประเทศนี้ −5% ทันที (ต้องมีสกิลอย่างน้อย 3 สกิล)",en:"Relation +8; this country's CO₂ −5% now (needs 3+ skills)"}},
  {id:"shield",icon:"shield-plus",    ep:25, pc:0,  cd:8,  name:{th:"ช่วยเตรียมรับมือภัย",en:"Help prepare for disasters"}, desc:{th:"ภัยในประเทศนี้เสียหายน้อยลง (การปรับตัว +20) และความสัมพันธ์ +4",en:"Hazards here do less damage (adaptation +20); relation +4"}},
];
function cactCost(a){ const m = 1; return {ep:Math.round(a.ep * m), pc:Math.round(a.pc * m)}; }
function cactOk(a, c){
  if (!c || c.rest) return false;
  if (a.req && !S.owned[a.req]) return false;
  if (a.id === "tech" && Object.keys(S.owned).length < 3) return false;
  const k = cactCost(a); return !(c.cd[a.id] > 0) && S.ep >= k.ep && S.pc >= k.pc;
}
function countryAction(aid){
  const a = CACTS.find(x => x.id === aid), c = S.selC && C(S.selC); if (!a || !cactOk(a, c)) return;
  const k = cactCost(a); S.ep -= k.ep; S.pc -= k.pc; c.cd[aid] = a.cd;
  if (aid === "talk") changeRel(c.id, 10);
  if (aid === "fund"){ changeRel(c.id, 20); S.crolls.push({c:c.id, left:12, months:12, frac:-0.08}); }
  if (aid === "tech"){ changeRel(c.id, 8); addCountryCO2(c, -0.05 * c.co2); }
  if (aid === "shield"){ c.adapt = clamp(c.adapt + 20, 0, 100); changeRel(c.id, 4); }
  S.stats.help[c.id] = (S.stats.help[c.id] || 0) + 1;
  addLog(`${t("logAct")}: ${L(a.name)} → ${cname(c.id)}`, "tc"); hook("sfx", "action"); Ach.unlock("action1");
  changed();
}
/* bilateral agreement between the selected country and a partner (both relation ≥ 40) */
const BILAT_COST = {ep:30, pc:15};
const bilatKey = (a, b) => [a, b].sort().join("|");
function bilatPartners(){
  const c = S.selC && C(S.selC); if (!c || c.rest || c.rel < 40) return [];
  return S.countries.filter(x => !x.rest && x.id !== c.id && x.rel >= 40 && !S.bilats.includes(bilatKey(c.id, x.id)));
}
function bilateral(pid){
  const c = S.selC && C(S.selC), p = C(pid);
  if (!c || !p || c.rel < 40 || p.rel < 40 || S.bilats.includes(bilatKey(c.id, p.id)) || S.ep < BILAT_COST.ep || S.pc < BILAT_COST.pc) return;
  S.ep -= BILAT_COST.ep; S.pc -= BILAT_COST.pc; S.bilats.push(bilatKey(c.id, p.id));
  [c, p].forEach(x => { S.crolls.push({c:x.id, left:24, months:24, frac:-0.10}); changeRel(x.id, 5); });
  addLog(`${t("logBilat")}: ${cname(c.id)} + ${cname(p.id)}`, "gd"); hook("sfx", "buy"); Ach.unlock("bilateral");
  changed();
}
/* alliance: 3+ countries in one region with relation ≥ 50 (needs skill D3) */
const ALLY_COST = {pc:25};
const allyCandidates = reg => regCountries(reg, false).filter(c => c.rel >= 50);
function canAlly(reg){ return !!S.owned.D3 && !S.alli[reg] && allyCandidates(reg).length >= 3 && S.pc >= ALLY_COST.pc; }
function formAlliance(reg){
  if (!canAlly(reg)) return;
  S.pc -= ALLY_COST.pc; const members = allyCandidates(reg).map(c => c.id);
  S.alli[reg] = {members, at:S.tick}; changeComp(reg, 8, true);
  addLog(`${t("logAlly")}: ${L(RMETA[reg].name)} (${joinNames(members)})`, "gd"); hook("sfx", "buy"); Ach.unlock("alliance");
  changed();
}
function allianceTick(){
  for (const reg of Object.keys(S.alli)){
    const al = S.alli[reg]; let broken = null;
    for (const id of al.members){ const c = C(id); if (!c) continue; addCountryCO2(c, -c.co2 * 0.0025); if (c.rel < 30) broken = id; }
    if (broken){
      al.members.forEach(id => { const c = C(id); if (c) c.rel = clamp(c.rel - 15, -100, 100); });
      changeComp(reg, -8, true); delete S.alli[reg];
      addLog(`${t("logAllyBreak")}: ${cname(broken)} · ${L(RMETA[reg].name)}`, "al"); hook("sfx", "warn");
    }
  }
}

/* ---------------------------- Effects of event options ---------------------------- */
function applyFx(fx, target, cev){
  if (fx.co2){ if (target) applyRegionCO2(R(target), fx.co2); else applyGlobalCO2(fx.co2); }
  if (fx.rco2) Object.entries(fx.rco2).forEach(([k,v]) => applyRegionCO2(R(k), v));
  if (fx.temp) S.temp += fx.temp;
  if (fx.tip)  S.temp += fx.tip * TIP_TO_TEMP;
  if (fx.appr) S.appr = clamp(S.appr + fx.appr, 0, 100);
  if (fx.ep)   S.ep = Math.max(0, S.ep + fx.ep);
  if (fx.pc)   S.pc = Math.max(0, S.pc + fx.pc);
  if (fx.comp) Object.entries(fx.comp).forEach(([k,v]) => changeComp(k === "T" ? (target || "ALL") : k, v, false));
  if (fx.vuln) Object.entries(fx.vuln).forEach(([k,v]) => {
    if (k === "T" && cev){ [...new Set([...cev.A, ...cev.B].map(id => C(id).reg))].forEach(rg => changeVuln(rg, v)); }
    else changeVuln(k === "T" ? (target || "ALL") : k, v);
  });
  if (fx.disc) Object.entries(fx.disc).forEach(([k,v]) => { if (k === "ALL") S.discAll *= (1 - v); else S.disc[k] = (S.disc[k] ?? 1) * (1 - v); });
  S.discAll = Math.max(.5, S.discAll);
  if (fx.damp) S.damp += fx.damp;
  if (fx.stall) S.stall += fx.stall;
  if (fx.delay) S.delays.push({at:S.tick + fx.delay.m, fx:fx.delay.fx, target});
  if (cev){
    if (fx.relA) cev.A.forEach(id => changeRel(id, fx.relA));
    if (fx.relB) cev.B.forEach(id => changeRel(id, fx.relB));
    if (fx.cA) cev.A.forEach(id => { const c = C(id); addCountryCO2(c, c.co2 * fx.cA); });
    if (fx.cB) cev.B.forEach(id => { const c = C(id); addCountryCO2(c, c.co2 * fx.cB); });
  }
}

/* ---------------------------- Bubbles (green = free Eco-Points; red = disaster aid after a hazard) ---------------------------- */
const RED_COST = 20;
const aidCost = () => Math.round(RED_COST * (S.owned.D1 ? .75 : 1));
function spawnGreens(){
  const greens = S.bubbles.filter(b => b.type === "green").length;
  if (greens < 1 && rand() < 0.10){
    const reg = pick(S.regions, r => 0.3 + r.comp / 100);
    const city = pick(CITIES[reg.id], c => c[2]);
    S.bubbles.push({id:++S.bubId, type:"green", reg:reg.id, lat:city[0], lon:city[1], ttl:4}); hook("sfx", "spawnGreen");
  }
}
function ageBubbles(){
  S.bubbles.forEach(b => {
    b.ttl--;
    if (b.ttl <= 0 && b.type === "red"){
      const r = R(b.reg); S.appr = clamp(S.appr - 1.5, 0, 100); r.vuln = clamp(r.vuln + 2, 0, 100); r.comp = clamp(r.comp - 2, 0, 100);
      if (b.cid) changeRel(b.cid, -6);
      hook("sfx", "miss"); addLog(`${t("redMiss")} ${b.cid ? cname(b.cid) : L(RMETA[b.reg].name)} · ${t("appr")} −1.5% · ${t("vuln")} +2%`, "al");
    }
  });
  S.bubbles = S.bubbles.filter(b => b.ttl > 0);
}
/* x, y = screen position (design units) for the floating text */
function popBubble(id, x, y){
  const b = S.bubbles.find(q => q.id === id); if (!b || S.over || S.event) return false;
  if (b.type === "green"){
    const gain = 2 + Math.round(avg(r => r.comp) / 40);
    S.ep += gain; hook("sfx", "pop"); Ach.green(); hook("floatText", x, y, `+${gain} ${IC.ep}`, "good");
  } else {
    const cost = aidCost();
    if (S.ep < cost) { hook("sfx", "error"); hook("floatText", x, y, t("cantAfford"), "bad"); return true; }
    const r = R(b.reg); S.ep -= cost; r.comp = clamp(r.comp + 3, 0, 100); r.vuln = clamp(r.vuln - 1, 0, 100); S.appr = clamp(S.appr + 1, 0, 100);
    if (b.cid){ changeRel(b.cid, 10); S.stats.help[b.cid] = (S.stats.help[b.cid] || 0) + 1; }
    S.stats.aid++;
    hook("sfx", "aid"); Ach.aid(); hook("floatText", x, y, `+1% ${IC.appr}`, "accent");
    addLog(`${t("redHelp")} ${b.cid ? cname(b.cid) : L(RMETA[b.reg].name)} · ${IC.ep} −${cost} · ${t("relation")} +10`, "gd");
  }
  S.bubbles = S.bubbles.filter(q => q.id !== id);
  changed(); return true;
}

/* ---------------------------- Local weather ---------------------------- */
const FORECAST = 3;   // months of warning before a hazard strikes
function hazardTick(){
  const M = MODES[S.mode] || MODES.normal;
  for (const h of S.haz.filter(h => S.tick >= h.at)) strike(h);
  S.haz = S.haz.filter(h => S.tick < h.at);
  const maxN = S.mode === "hard" ? 3 : 2;
  const p = (0.03 + Math.max(0, S.temp - 1.2) * 0.06) * M.haz;
  if (S.haz.length < maxN && rand() < p){
    const busy = new Set(S.haz.map(h => h.c));
    const list = S.countries.filter(c => !c.rest && !busy.has(c.id));
    const c = pick(list, x => COUNTRY[x.id].risk * (R(x.reg).vuln / 50) / (1 + x.adapt / 40));
    const type = COUNTRY[c.id].hz[Math.floor(rand() * COUNTRY[c.id].hz.length)];
    const h = {id:++S.hazId, type, c:c.id, at:S.tick + FORECAST, sev:0.7 + rand() * 0.6, evac:!!S.evacFree[c.id]};
    if (h.evac){ delete S.evacFree[c.id]; S.stats.evac++; }
    S.haz.push(h);
    addLog(`[[${HAZARDS[type].icon}]] ${t("forecast")}: ${L(HAZARDS[type].name)} · ${cname(c.id)} · ${FORECAST} ${t("months")}`, "al");
    hook("sfx", "warn"); hook("hazardWarn", h);
  }
}
const evacCost = () => 12;
function evacuate(hid){
  const h = S.haz.find(x => x.id === hid); if (!h || h.evac || S.over) return false;
  if (S.ep < evacCost()){ hook("sfx", "error"); return false; }
  S.ep -= evacCost(); h.evac = true; S.stats.evac++; AchStore.data.evac = (AchStore.data.evac || 0) + 1; AchStore.save();
  addLog(`${t("evacDone")} ${cname(h.c)} · ${IC.ep} −${evacCost()}`, "gd"); hook("sfx", "aid"); Ach.check(); changed(); return true;
}
function strike(h){
  const M = MODES[S.mode] || MODES.normal, Z = HAZARDS[h.type], c = C(h.c), r = R(c.reg);
  const d = h.sev * (1 + Math.max(0, S.temp - 1.2) * 0.6) * (1 - respOf(h.type)) * (h.evac ? 0.35 : 1) * M.dmg * (1 - c.adapt / 200);
  const epLoss = Math.round(Z.ep * d), apLoss = Z.appr * d * (S.owned.C3 ? 0.5 : 1);
  S.ep = Math.max(0, S.ep - epLoss + (S.owned.C3 ? 15 : 0));
  S.appr = clamp(S.appr - apLoss, 0, 100);
  r.vuln = clamp(r.vuln + Z.vuln * d, 0, 100);
  changeRel(c.id, -2 * d);
  if (Z.co2) applyRegionCO2(r, Z.co2 * d);
  if (h.type === "wildfire") S.temp += 0.003 * d;
  S.stats.dmg.push({type:h.type, c:c.id, tick:S.tick, d:+d.toFixed(2)});
  const ac = AchStore.data; ac.haz = ac.haz || []; if (!ac.haz.includes(h.type)){ ac.haz.push(h.type); AchStore.save(); }
  if (d < 0.25) Ach.unlock("stormSafe");
  addLog(`[[${Z.icon}]] ${L(Z.name)} ${t("hits")} ${cname(c.id)} · ${IC.ep} −${epLoss} · ${t("appr")} −${apLoss.toFixed(1)}%${h.evac ? " · " + t("evacuated") : ""}`, d > 0.6 ? "al" : "ev");
  // aid bubble at the country
  S.bubbles.push({id:++S.bubId, type:"red", reg:c.reg, cid:c.id, hz:h.type, ttl:5});
  hook("sfx", "spawnRed"); hook("hazardStrike", h, d);
}

/* ---------------------------- Tick engine ---------------------------- */
function tick(){
  if (!S.started || S.over || S.event) return;
  S.tick++;
  const prevTemp = S.temp;
  if (S.stall > 0) S.stall--;
  else {
    S.rollouts.forEach(ro => {
      if (ro.kind === "co2") S.regions.forEach(r => { const d = ro.per[r.id]; if (d) setRegionCO2(r, r.co2 + (d / ro.months) * (r.comp / 100) * lastMile(r)); });
      else S.sink += ro.amt / ro.months;
      ro.left--;
      if (ro.left === 0){ hook("sfx", "done"); addLog(`${L(SKILL[ro.id].name)} — ${t("logRollDone")}`, "tc"); }
    });
    S.rollouts = S.rollouts.filter(ro => ro.left > 0);
  }
  S.crolls.forEach(cr => { const c = C(cr.c); if (c) addCountryCO2(c, c.co2_0 * cr.frac / cr.months * (R(c.reg).comp / 100)); cr.left--; });
  S.crolls = S.crolls.filter(cr => cr.left > 0);
  S.delays.filter(d => d.at <= S.tick).forEach(d => applyFx(d.fx, d.target));
  S.delays = S.delays.filter(d => d.at > S.tick);
  const damp = Math.min(1.3, S.damp);
  S.regions.forEach(r => {
    const fossil = r.fossil0 * (r.co2 / r.co2_0);
    let v = r.co2 * (1 + 0.0022 * fossil * (1 - damp));
    if (S.p3 && r.comp < 70) v -= 0.3 / 12;
    setRegionCO2(r, v);
    const target = clamp(r.compBase + (S.appr - 75) * 0.25 + avgRel(r.id) * 0.08, 0, 100);
    r.comp = clamp(r.comp + (target - r.comp) * 0.02, 0, 100);
    Object.keys(r.cd).forEach(k => { if (r.cd[k] > 0) r.cd[k]--; });
  });
  S.countries.forEach(c => { Object.keys(c.cd).forEach(k => { if (c.cd[k] > 0) c.cd[k]--; }); c.rel += (Math.min(c.rel, 20) - c.rel) * 0.004; });
  Object.keys(S.actCd).forEach(k => { if (S.actCd[k] > 0) S.actCd[k]--; });
  if (S.bond > 0){ S.ep = Math.max(0, S.ep - 12); S.bond--; }
  allianceTick();
  const net = netCO2();
  S.temp += (net / 36.0) * 0.0035 + (S.tip / 100) * 0.0015;
  S.ep += epGain(); S.pc += pcGain();
  if (S.temp >= 2.5) S.tip += 1.2; else if (S.temp >= 2.0) S.tip += 0.6; else if (S.temp >= 1.5) S.tip += 0.2;
  S.tip = clamp(S.tip, 0, 100);
  if (prevTemp < 1.5 && S.temp >= 1.5) { addLog(t("logTipping"), "al"); hook("sfx", "warn"); }
  if (prevTemp < 2.0 && S.temp >= 2.0) { addLog(t("logTipping2"), "al"); hook("sfx", "warn"); }
  const calm = S.char === "act" ? (charLvBonus() ? .65 : .75) : 1;
  const stress = avg(r => r.vuln) / 100 * Math.max(0, S.temp - 1.3) * 0.6 * calm;
  S.appr = clamp(S.appr - stress + (60 - S.appr) * 0.004, 0, 100);
  ageBubbles(); spawnGreens(); hazardTick();
  S.hist.push({net, temp:S.temp}); Ach.check();
  if (checkEnd()) return;
  maybeNews();
  if (S.tick % 6 === 0) autosave();
  const act = STORY.find(a => a.at > 0 && S.tick >= a.at && !S.story[a.act]);
  if (act){ S.story[act.act] = 1; hook("story", act.act); changed(); return; }
  const p = Math.min(0.25, 0.08 + S.temp * 0.03);
  if (S.tick - S.lastEv >= 4 && rand() < p) triggerEvent();
  changed();
}
function maybeNews(){
  if (S.tick > 0 && S.tick % 12 === 0){
    const y = 2025 + S.tick / 12, prev = S.hist[Math.max(0, S.hist.length - 13)].net, net = netCO2();
    hook("sfx", "year"); addLog(`[[chart-line]] ${t("annual")} ${y}: ${t("co2")} ${net.toFixed(1)} Gt (${fmt(net - prev)}) · ΔT +${S.temp.toFixed(2)}°C · ${t("appr")} ${S.appr.toFixed(0)}%`, "tc");
  }
  S.regions.forEach(r => { if (!S.flags["half" + r.id] && r.co2 <= r.co2_0 / 2){ S.flags["half" + r.id] = 1; addLog(`${L(RMETA[r.id].name)} ${t("halved")}`, "gd"); } });
  if (rand() > 0.3) return;
  const idx = NEWS.map((n,i) => i).filter(i => !S.newsUsed.includes(i) && (!NEWS[i].c || NEWS[i].c(S)));
  if (!idx.length) return;
  const i = idx[Math.floor(rand() * idx.length)];
  S.newsUsed.push(i); if (S.newsUsed.length > 24) S.newsUsed.shift();
  const reg = REGIONS[Math.floor(rand() * REGIONS.length)], cities = CITIES[reg.id];
  const txt = NEWS[i][S.lang].replace("{C}", cities[Math.floor(rand() * cities.length)][3]).replace("{R}", L(reg.name)).replace("{Y}", 2025 + Math.floor(S.tick / 12));
  addLog("[[newspaper]] " + txt, "nw"); hook("sfx", "news");
}

/* ---------------------------- Events ---------------------------- */
function eligible(e){
  const c = e.cond || {}, y = 2026 + Math.floor(S.tick / 12);
  return !S.used.includes(e.id) && (!c.minTemp || S.temp >= c.minTemp) && (!c.minYear || y >= c.minYear) && (!c.req || S.owned[c.req]);
}
/* choose the countries for a country event: prefer those that have had that role less often */
function pickGroup(pool, role, avoid, n){
  let list = S.countries.filter(c => !c.rest && !avoid.has(c.id) && COUNTRY[c.id].tags.some(tg => pool.includes(tg)));
  const out = [];
  while (out.length < n && list.length){
    const c = pick(list, x => { const r = (S.roles[x.id] || {})[role] || 0; return (1 / (1 + 2 * r)) * (1 + Math.log10(COUNTRY[x.id].w) / 3); });
    out.push(c.id); list = list.filter(x => x.id !== c.id);
  }
  return out;
}
function triggerCountryEvent(){
  const pool = CEVENTS.filter(e => !S.ceUsed.includes(e.id)); if (!pool.length){ S.ceUsed = []; return false; }
  const e = pool[Math.floor(rand() * pool.length)];
  let A, B;
  const fixed = CE_FIXED[e.id];
  if (fixed && !(AchStore.data.ceFixed || {})[e.id]){ A = fixed.A.slice(); B = fixed.B.slice(); (AchStore.data.ceFixed = AchStore.data.ceFixed || {})[e.id] = 1; AchStore.save(); }
  else {
    A = pickGroup(e.poolA, "A", new Set(), 2 + (rand() < .4 ? 1 : 0));
    B = pickGroup(e.poolB, "B", new Set(A), 2 + (rand() < .4 ? 1 : 0));
  }
  if (A.length < 2 || B.length < 2) return false;
  A.forEach(id => { (S.roles[id] = S.roles[id] || {}).A = (S.roles[id].A || 0) + 1; });
  B.forEach(id => { (S.roles[id] = S.roles[id] || {}).B = (S.roles[id].B || 0) + 1; });
  S.ceUsed.push(e.id); S.lastEv = S.tick; S.event = e.id; S.cev = {id:e.id, A, B};
  hook("sfx", "event"); hook("amb", "crowd"); hook("mapFocus", C(A[0]).reg); hook("showEvent");
  return true;
}
function triggerEvent(){
  const y = 2026 + Math.floor(S.tick / 12);
  if (y >= 2027 && rand() < 0.35 && triggerCountryEvent()) return;
  const pool = EVENTS.filter(eligible); if (!pool.length) return;
  const e = pool[Math.floor(rand() * pool.length)];
  S.used.push(e.id); S.lastEv = S.tick; S.event = e.id; S.cev = null; hook("sfx", "event"); hook("amb", e.snd);
  if (e.target) hook("mapFocus", e.target);
  hook("showEvent");
}
/* the open event in one shape for the UI: {id, title, desc, options, target, A, B, country} */
function currentEvent(){
  if (!S.event) return null;
  if (S.cev && S.cev.id === S.event){
    const e = CEVENTS.find(x => x.id === S.event); if (!e) return null;
    const A = joinNames(S.cev.A), B = joinNames(S.cev.B);
    const sub = o => ({th:o.th.replace("{A}", A).replace("{B}", B), en:o.en.replace("{A}", A).replace("{B}", B)});
    return {id:e.id, country:true, title:e.title, desc:sub(e.desc), options:e.options, target:null, A:S.cev.A, B:S.cev.B};
  }
  const e = EVENTS.find(x => x.id === S.event); return e ? {...e, country:false} : null;
}
const POSTPONE = {appr:-6, tip:1};
function affordable(fx){ return (!(fx.ep < 0) || S.ep >= -fx.ep) && (!(fx.pc < 0) || S.pc >= -fx.pc); }
function fxMagnitude(fx){ return Math.abs(fx.co2 || 0) * 2 + Math.abs(fx.temp || 0) * 40 + Math.abs(fx.tip || 0) * .15 + Math.abs(fx.appr || 0) * .12 + Math.abs(fx.ep || 0) / 40 + Math.abs(fx.relA || 0) / 15 + Math.abs(fx.relB || 0) / 15; }
function chooseOption(i){
  const e = currentEvent(); if (!e) return;
  const opt = i === -1 ? {label:{th:UI.postpone.th,en:UI.postpone.en}, fx:POSTPONE} : e.options[i];
  if (i !== -1 && !affordable(opt.fx)) return;
  applyFx(opt.fx, e.target, e.country ? S.cev : null); hook("sfx", "choose"); Ach.unlock("event1");
  if (e.country){ AchStore.data.cev = (AchStore.data.cev || 0) + 1; AchStore.save(); }
  else Ach.sawEvent(e.id);
  if (e.id === "EVT_119" || e.id === "EVT_47") Ach.unlock("chaoPhraya");
  S.stats.dec.push({title:e.title, label:opt.label, mag:fxMagnitude(opt.fx), tk:S.tick});
  S.stats.dec.sort((a, b) => b.mag - a.mag); S.stats.dec = S.stats.dec.slice(0, 3);
  addLog(`${L(e.title)} → ${L(opt.label)} [${fxChips(opt.fx, e.target).map(c => c.txt).join(", ") || "—"}]`, "ev");
  S.event = null; S.cev = null; hook("closeModal"); hook("stopAmb");
  if (!checkEnd()) changed();
}

/* ---------------------------- End of game ---------------------------- */
function checkEnd(){
  let o = null;
  if (netCO2() <= 0) o = "win"; else if (S.temp >= 3.0) o = "l1"; else if (S.appr <= 0) o = "l2"; else if (S.tick >= TOTAL_TICKS) o = "l3";
  if (!o) return false;
  S.over = o; S.event = null; S.cev = null; S.grade = o === "win" ? P.gradeOf(S.temp) : null;
  hook("sfx", o === "win" ? "win" : "lose");
  const ends = AchStore.data.ends = AchStore.data.ends || {}; ends[o === "win" ? "win" + S.grade : o] = Date.now();
  const played = AchStore.data.charsDone = AchStore.data.charsDone || []; if (!played.includes(S.char)) played.push(S.char);
  if (S.mode === "daily") AchStore.data.daily = (AchStore.data.daily || 0) + 1;
  AchStore.save();
  Ach.check(); changed(); hook("showEnd"); hook("gameOver");
  const sv = readSaves(); if (sv && sv.auto){ delete sv.auto; try { localStorage.setItem(SAVE_KEY, JSON.stringify(sv)); } catch(e) {} }
  return true;
}
function score(){
  const left = Math.max(0, TOTAL_TICKS - S.tick);
  const base = S.over === "win" ? 5000 + left * 20 : Math.round((36 - netCO2()) * 80);
  return Math.max(0, Math.round(base + Math.max(0, 2.5 - S.temp) * 1500 + S.appr * 15 + Math.max(0, relAll()) * 10));
}
/* what the server needs to check the result and pay Terra (the server recomputes everything) */
function summary(){
  return {runId:S.runId, mode:S.mode, char:S.char, ending:S.over, tick:S.tick, temp:+S.temp.toFixed(3), net:+netCO2().toFixed(3), appr:+S.appr.toFixed(2),
    rel:+relAll().toFixed(2), skills:Object.keys(S.owned).length, realSec:Math.round(S.realSec), seed:S.seed, score:score()};
}
/* XP for the character (guests keep it on this device; accounts get it from the server) */
function xpFor(){ return Math.round(Math.min(160, 40 + score() / 120) + (S.over === "win" ? 60 : 0)); }
function endStory(){
  const best = Object.entries(S.stats.help).sort((a, b) => b[1] - a[1])[0];
  const worst = S.stats.dmg.slice().sort((a, b) => b.d - a.d)[0];
  return {best:best ? best[0] : null, worst, dec:S.stats.dec.slice(0, 3)};
}
function fxChips(fx, target){
  const c = [], rn = id => id === "ALL" ? (S.lang === "th" ? "ทั้งโลก" : "all") : (id === "T" ? (target || "ALL") : id);
  /* good = helps the player (green) · up = the number goes up (▲) · mag = rough size (1 ≈ normal) */
  const push = (txt, good, icon, mag, up) => c.push({txt, good, icon, mag, up});
  if (fx.co2) push(`${IC.co2} ${target ? target + " " : ""}${fmt(fx.co2)} Gt`, fx.co2 < 0, "cloud", Math.abs(fx.co2) / .5, fx.co2 > 0);
  if (fx.rco2) Object.entries(fx.rco2).forEach(([k,v]) => push(`${IC.co2} ${k} ${fmt(v)} Gt`, v < 0, "cloud", Math.abs(v) / .5, v > 0));
  if (fx.temp) push(`${IC.temp} ${fmt(fx.temp,2)}°C`, fx.temp < 0, "thermometer", Math.abs(fx.temp) / .02, fx.temp > 0);
  if (fx.ep) push(`${IC.ep} ${fmt(fx.ep,0)}`, fx.ep > 0, "leaf", Math.abs(fx.ep) / 35, fx.ep > 0);
  if (fx.pc) push(`${IC.pc} ${fmt(fx.pc,0)}`, fx.pc > 0, "landmark", Math.abs(fx.pc) / 12, fx.pc > 0);
  if (fx.appr) push(`${IC.appr} ${fmt(fx.appr,0)}%`, fx.appr > 0, "users", Math.abs(fx.appr) / 4, fx.appr > 0);
  if (fx.tip) push(`${IC.temp} ${fmt(fx.tip * TIP_TO_TEMP,2)}°C`, fx.tip < 0, "thermometer", Math.abs(fx.tip) / 4, fx.tip > 0);
  if (fx.comp) Object.entries(fx.comp).forEach(([k,v]) => push(`${IC.comp} ${rn(k)} ${fmt(v,0)}%`, v > 0, "handshake", Math.abs(v) / 5, v > 0));
  if (fx.vuln) Object.entries(fx.vuln).forEach(([k,v]) => push(`${IC.vuln} ${rn(k)} ${fmt(v,0)}%`, v < 0, "shield-alert", Math.abs(v) / 5, v > 0));
  if (fx.disc) Object.entries(fx.disc).forEach(([k,v]) => push(`[[flask-conical]] ${k === "ALL" ? (S.lang==="th"?"ทุกสกิล":"all") : k} ${v >= 0 ? "−" : "+"}${Math.round(Math.abs(v)*100)}%`, v >= 0, "flask-conical", Math.abs(v) / .15, v < 0));
  if (fx.damp) push(`${IC.co2} ${S.lang === "th" ? "โตช้าลง" : "growth ↓"}`, true, "cloud", 1, false);
  if (fx.stall) push(`[[flask-conical]] ${S.lang === "th" ? "ชะงัก" : "stall"} ${fx.stall} ${t("months")}`, false, "flask-conical", fx.stall / 3, false);
  if (fx.relA) push(`[[handshake]] ${t("sideA")} ${fmt(fx.relA,0)}`, fx.relA > 0, "handshake", Math.abs(fx.relA) / 8, fx.relA > 0);
  if (fx.relB) push(`[[handshake]] ${t("sideB")} ${fmt(fx.relB,0)}`, fx.relB > 0, "handshake", Math.abs(fx.relB) / 8, fx.relB > 0);
  if (fx.cA) push(`${IC.co2} ${t("sideA")} ${fmt(fx.cA * 100,0)}%`, fx.cA < 0, "cloud", Math.abs(fx.cA) / .02, fx.cA > 0);
  if (fx.cB) push(`${IC.co2} ${t("sideB")} ${fmt(fx.cB * 100,0)}%`, fx.cB < 0, "cloud", Math.abs(fx.cB) / .02, fx.cB > 0);
  if (fx.delay) fxChips(fx.delay.fx, target).forEach(x => push(`${x.txt} (${t("delayed")} ${fx.delay.m} ${t("months")})`, x.good, x.icon, x.mag, x.up));
  return c;
}
/* Something in the game state changed: redraw the HUD and the map colours. */
function changed(){ hook("dirty"); hook("mapRefresh"); }

/* ---------------------------- Session control ---------------------------- */
function setSpeed(v){
  if (v === 3 && !(P.Net && P.Net.owns("speed3"))){ hook("sfx", "error"); return; }
  S.speed = v; hook("sfx", v ? "speed" : "pause"); changed();
}
function setLang(l){ S.lang = l; try { localStorage.setItem("p2050-lang", l); } catch(e) {} changed(); }
/* "Ready to tick" = what the scene's tick timer checks every frame (scene variable Running). */
function running(){ return !!(S.started && S.speed > 0 && !S.over && !S.event && !(P.UIM && P.UIM.paused) && !(P.UIM && P.UIM.blocking)); }
function newGame(lang, o){ resetState(newState(lang, o)); buildCountries(); }
function startGame(lang, o = {}){
  const prev = {mode:S.mode, char:S.char, charLv:S.charLv};
  const opts = Object.assign({}, prev, o);
  if (opts.mode === "daily" && opts.seed === undefined) opts.seed = P.dailySeed();
  resetState(newState(lang, opts)); buildCountries(); S.started = true; S.speed = 1;
  addLog(t("logStart"), "tc"); hook("sfx", "start"); Ach.unlock("start");
  S.story[1] = 1;
  hook("closeModal"); changed(); autosave(); hook("gameStart");
}
/* Daily Challenge seed: the same for everyone on the same (UTC) date */
P.dailySeed = (d = new Date()) => { const s = d.toISOString().slice(0, 10); let h = 2166136261; for (const ch of s){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h | 0; };

/* ---------------------------- Save / Load ----------------------------
   localStorage key p2050-saves = {auto, s1, s2, s3}; each {meta, S}. Save codes = base64 JSON for moving between devices.
   Hard Core games only keep the autosave. */
const SAVE_KEY = "p2050-saves", SLOTS = ["auto","s1","s2","s3"];
function readSaves(){ try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; } catch(e) { return null; } }
function snapshot(){ const c = JSON.parse(JSON.stringify(S)); c.tab = null; return c; }
function slotMeta(){ return {tick:S.tick, temp:S.temp, net:netCO2(), appr:S.appr, at:Date.now(), mode:S.mode, char:S.char}; }
function writeSlot(slot){
  if (S.mode === "hard" && slot !== "auto") return false;
  const all = readSaves(); if (all === null) return false;
  all[slot] = {meta:slotMeta(), S:snapshot()};
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(all)); return true; } catch(e) { return false; }
}
function autosave(){ if (S.started && !S.over){ writeSlot("auto"); hook("autosaved"); } }
function validSave(o){ return o && o.v === SAVE_VERSION && Array.isArray(o.regions) && o.regions.length === 6 && Array.isArray(o.countries) && typeof o.tick === "number" && Array.isArray(o.hist); }
function loadState(obj){
  if (!validSave(obj)) return false;
  const lang = S.lang;
  resetState(Object.assign(newState(lang, {mode:obj.mode, char:obj.char, charLv:obj.charLv, seed:obj.seed}), obj, {lang, started:true, speed:0, tab:null}));
  if (S.speed === 3 && !(P.Net && P.Net.owns("speed3"))) S.speed = 1;
  return true;
}
function exportCode(){ return "P2050:" + btoa(unescape(encodeURIComponent(JSON.stringify(snapshot())))); }
function importCode(txt){ try { const raw = String(txt).trim().replace(/^P2050:/, ""); return JSON.parse(decodeURIComponent(escape(atob(raw)))); } catch(e) { return null; } }
function slotName(k){ return k === "auto" ? t("slotAuto") : `${t("slot")} ${k.slice(1)}`; }
function slotMetaLines(m){
  if (!m) return [t("empty")];
  const when = new Date(m.at).toLocaleString(S.lang === "th" ? "th-TH" : "en-GB", {dateStyle:"short", timeStyle:"short"});
  const tag = m.mode === "hard" ? " · HARD CORE" : m.mode === "daily" ? " · DAILY" : "";
  return [`${dateStr(m.tick)} · ΔT +${m.temp.toFixed(2)}°C · CO₂ ${m.net.toFixed(1)} Gt · ${t("appr")} ${m.appr.toFixed(0)}%`, when + tag];
}
const fmtTime = sec => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0"); };

/* ---------------------------- Achievements ---------------------------- */
const AchStore = (() => {
  const KEY = "p2050-ach";
  let data = {got:{}, greens:0, aids:0, seen:[], haz:[], ends:{}, evac:0, cev:0, charsDone:[], daily:0};
  try { data = Object.assign(data, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch(e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {} };
  return { get data(){ return data; }, save };
})();
const Ach = (() => {
  function unlock(id){
    const d = AchStore.data; if (d.got[id]) return;
    const a = ACH.find(x => x.id === id); if (!a) return;
    d.got[id] = Date.now(); AchStore.save(); hook("toast", a); hook("achUnlocked", id);
  }
  const byCat = cat => SKILLS.filter(n => n.cat === cat).every(n => S.owned[n.id]);
  function check(){
    const d = AchStore.data;
    if (d.greens >= 25) unlock("greens"); if (d.aids >= 10) unlock("aids");
    if (d.seen.length >= 25) unlock("read25"); if (d.seen.length >= 100) unlock("read100"); if (d.seen.length >= EVENTS.length) unlock("readAll");
    if ((d.evac || 0) >= 5) unlock("evac5");
    if ((d.cev || 0) >= 10) unlock("cev10");
    if ((d.charsDone || []).length >= 4) unlock("charAll");
    if ((d.daily || 0) >= 1) unlock("daily");
    if (P.cardCount && P.cardCount() >= 30) unlock("cards30");
    if (P.Net && P.Net.maxLevel && P.Net.maxLevel() >= 10) unlock("lvl10");
    if (!S || !S.started || !S.regions) return;
    const own = Object.keys(S.owned).length;
    if (own) unlock("tech1");
    if (own >= 20) unlock("skill20");
    if (recentBuys() >= 3) unlock("rush");
    if (S.ep >= 300) unlock("rich");
    if (byCat("energy")) unlock("branchE"); if (byCat("policy")) unlock("branchP"); if (byCat("nature")) unlock("branchN");
    if (byCat("industry")) unlock("branchI"); if (byCat("city")) unlock("branchC");
    if (SKILLS.every(n => S.owned[n.id])) unlock("allTech");
    if (S.owned.E5 && rollProgress("E5") === null) unlock("fusion");
    if (S.regions.every(r => r.comp >= 85)) unlock("unity");
    if (S.regions.every(r => r.vuln < 35)) unlock("safe");
    if (S.hist.length > 12 && S.hist[S.hist.length - 13].net - netCO2() >= 2) unlock("peak");
    if (netCO2() < 18) unlock("half");
    if (S.tick >= 120) unlock("decade");
    if (S.countries && S.countries.filter(c => !c.rest && c.rel >= 50).length >= 20) unlock("friends20");
    if (S.over === "win"){
      unlock("win");
      if (S.tick < 240) unlock("winEarly");
      if (S.temp < 1.5) unlock("win15");
      if (S.appr >= 70) unlock("winLoved");
      if (S.mode === "hard") unlock("hardWin");
    }
    if (S.over === "l3") unlock("loseTime");
    if (S.over === "l1") unlock("loseHeat");
    if (S.over === "l2") unlock("loseVote");
  }
  function count(){ return ACH.filter(a => AchStore.data.got[a.id]).length; }
  return {
    unlock, check, count,
    green(){ AchStore.data.greens++; AchStore.save(); check(); },
    aid(){ AchStore.data.aids++; AchStore.save(); check(); },
    sawEvent(id){ const s = AchStore.data.seen; if (!s.includes(id)){ s.push(id); AchStore.save(); } check(); },
  };
})();

Object.assign(P, {
  t, L, rand, SAVE_VERSION, TOTAL_TICKS, TIP_TO_TEMP, SPEEDS, MAX_PROJECTS, MODES, RED_COST, POSTPONE, FORECAST, CACTS, BILAT_COST, ALLY_COST,
  newState, resetState, buildCountries, clamp, R, C, regCountries, avg, grossCO2, netCO2, sinkEff, dateStr, fmt, fmtTime, addLog, cname, joinNames,
  epGain, pcGain, recentBuys, nodeCost, busyIds, atCapacity, nodeState, actionCost, rollProgress, respOf, aidCost, evacCost,
  buyNode, abilityList, abilityReady, useAbility, doAction, countryAction, cactCost, cactOk, bilatPartners, bilateral, canAlly, allyCandidates, formAlliance, avgRel, relAll, changeRel,
  applyFx, popBubble, evacuate, tick, eligible, triggerEvent, currentEvent, affordable, chooseOption, checkEnd, score, summary, xpFor, endStory, fxChips, changed,
  setSpeed, setLang, running, newGame, startGame,
  SAVE_KEY, SLOTS, readSaves, writeSlot, autosave, validSave, loadState, exportCode, importCode, slotName, slotMetaLines,
  AchStore, Ach,
});
if (!S.regions){ let lang = "th"; try { lang = localStorage.getItem("p2050-lang") || "th"; } catch(e) {} resetState(newState(lang)); buildCountries(); }
