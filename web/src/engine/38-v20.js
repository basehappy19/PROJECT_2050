const P = window.P2050 = window.P2050 || {};
if (P.mods && P.mods.v20) return;
(P.mods = P.mods || {}).v20 = 1;
/* =========================================================================
   Version 2.0 · rules
   · Fast mode: about 15 minutes (3 s a month at 1×), no minerals and no groups of people, fewer events.
   · Yearly review (replaces the 5-year milestones in new games): every January the year that just ended
     gets a score 0–100 against the year's CO₂ target. 50+ = a good year: more funding and a little more trust.
     Under 50 = a bad year: trust falls. Each year has its own good and bad story (37-data-v20.js).
   · The ending depends on how the game ended and how many good years you had (12 endings).
   · Training mode support: no saves, no random disasters or events (20-engine.js), scripted from the UI.
   ========================================================================= */
const S = P.S, L = o => P.L(o);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hook = (name, ...a) => (P.H && P.H[name] ? P.H[name](...a) : undefined);

/* ---------------- Fast mode ---------------- */
P.MODES.fast = {ep:30, pc:22, haz:.9, dmg:.9};
Object.assign(P.UI, {
  mode_fast:{th:"โหมดเร็ว", en:"Fast mode"},
  modeD_fast:{th:"ราว 15 นาที · ไม่มีทรัพยากรและกลุ่มคน · เหตุการณ์น้อยลง · เหมาะกับเล่นครั้งแรก", en:"About 15 minutes · no minerals or groups · fewer events · great for a first game"},
  delayHit:{th:"ผลจากการตัดสินใจก่อนหน้ามาถึงแล้ว", en:"An earlier decision catches up"},
});
const FAST_SPEEDS = [0, 3, 2, 1.5];
/* Fast mode has no mineral limits, so skills cost a little more. 2.1.3 (bot test with the seasons): a sensible player
   wins about 35–50% (was {inc:1, cost:1.12, haz:1.05, growth:1.02}: every time) — a little kinder than Normal, as it is
   the first-game mode. Fast mode is close to a knife edge (no minerals or groups, few events), so small changes here
   move the win rate a lot. */
P.BALANCE.F = {inc:.92, cost:1.22, haz:1.071, growth:1.0355};
{ const _start = P.startGame; P.startGame = (lang, o = {}) => _start(lang, o && o.mode === "fast" && !o.ab ? {...o, ab:"F"} : o); }
/* seconds of real time per game month */
P.secPerMonth = (sp = S.speed) => (S.mode === "fast" ? FAST_SPEEDS : P.SPEEDS)[sp] || 4;
P.FAST_SPEEDS = FAST_SPEEDS;
/* no minerals in Fast mode: skills cost only money and policy points */
{
  const _unlock = P.unlockOre; P.unlockOre = () => (S.simple ? undefined : _unlock());
  const _matOk = P.matOk; P.matOk = n => (S.simple ? true : _matOk(n));
  const _matCost = P.matCost; P.matCost = n => (S.simple ? null : _matCost(n));
  const _spend = P.spendOre; P.spendOre = n => (S.simple ? undefined : _spend(n));
  const _full = P.isFullRes; P.isFullRes = () => (S.simple ? false : _full());
  const _ca = P.canAfford; P.canAfford = n => { if (!S.simple) return _ca(n); const c = P.nodeCost(n); return S.ep >= c.ep && S.pc >= c.pc && !P.atCapacity(n); };
}

/* ---------------- Yearly review ---------------- */
/* the target path for net CO₂ (Gt) at a given month: from today's 37 Gt down to 0 at the end of 2050 */
/* path0 · pathK: the target path · span: Gt above/below the target that make a score of 0/100 · rewards for a good year, the penalty for a bad one */
const YR = {path0:37.5, pathK:1.8, span:6, goodEp:4, epPer:.04, goodPc:2, goodAppr:0, badAppr:-.8, floor:45};
const yearTarget = tk => YR.path0 * (1 - Math.pow(clamp(tk / P.TOTAL_TICKS, 0, 1), YR.pathK));
/* the score of the year that ends at month tk: where you are against the target (±SPAN Gt = ±50),
   plus up to ±10 for moving faster or slower than the target moved this year */
function yearScore(tk = S.tick){
  const net = P.netCO2(), prevTk = Math.max(0, tk - 12), prev = (S.hist[prevTk] || S.hist[0]).net;
  const T1 = yearTarget(tk), T0 = yearTarget(prevTk);
  const pos = (T1 - net) / YR.span * 50, mom = clamp((prev - net) - (T0 - T1), -1, 1) * 10;
  return {score:Math.round(clamp(50 + pos + mom, 0, 100)), net, prev, target:T1, cut:prev - net, need:T0 - T1 + (prev - T0)};
}
function yearTick(){
  if (!S.v2 || S.world || S.over || S.training || S.tick % 12 !== 0 || S.tick === 0) return;
  const y = 2025 + S.tick / 12;
  S.years = S.years || [];
  if (S.years.some(x => x.y === y)) return;
  const r = yearScore(), good = r.score >= 50;
  const e0 = S.ep, p0 = S.pc, a0 = S.appr;
  if (good){ const ep = YR.goodEp + Math.round(r.score * YR.epPer); S.ep += ep; S.pc += YR.goodPc; if (YR.goodAppr) P.addAppr(YR.goodAppr); if (P.ledgerTag) P.ledgerTag("news", ep, YR.goodPc); }
  else if (YR.badAppr && S.appr > YR.floor) P.addAppr(Math.max(YR.badAppr, (YR.floor - S.appr) / P.APPR_DOWN));   // trust falls, but a bad year alone never pushes approval under 45%
  const rec = {y, s:r.score, g:good ? 1 : 0, net:+r.net.toFixed(2), tgt:+r.target.toFixed(2), cut:+r.cut.toFixed(2), ep:S.ep - e0, pc:S.pc - p0, appr:+(S.appr - a0).toFixed(2)};
  S.years.push(rec);
  P.addLog(`[[${good ? "trending-up" : "trending-down"}]] ${L(P.UI2.yrTitle)} ${y}: ${r.score}/100 · ${good ? L(P.UI2.yrGood) : L(P.UI2.yrBad)} · CO₂ ${r.net.toFixed(1)} / ${L(P.UI2.yrTarget)} ${r.target.toFixed(1)} Gt`, good ? "gd" : "al");
  hook("sfx", good ? "done" : "miss");
  hook("yearly", rec);
}
/* the year the game ended in also counts (a win counts as a good year) */
function finalYear(){
  if (!S.v2 || S.world || S.training) return;
  S.years = S.years || [];
  const y = 2026 + Math.floor((S.tick - 1) / 12);
  if (S.years.some(x => x.y === y) || y > 2050) return;
  const r = yearScore(), good = S.over === "win" || r.score >= 50;
  S.years.push({y, s:S.over === "win" ? Math.max(r.score, 80) : r.score, g:good ? 1 : 0, net:+r.net.toFixed(2), tgt:+r.target.toFixed(2), cut:+r.cut.toFixed(2), last:1});
}
const goodYears = () => (S.years || []).filter(x => x.g).length;
/* the story for a year and its ending */
P.yearStory = rec => { const s = P.YEAR_STORY[rec.y] || P.YEAR_STORY[2050]; return rec.g ? s.good : s.bad; };
P.ending2 = () => { const list = P.END2[S.over] || P.END2.l3; return list[P.endTier(goodYears())]; };
Object.assign(P, {yearTarget, yearScore, goodYears, YEAR_RULES:YR});

const _tick = P.tick;
P.tick = () => { _tick(); if (S.regions && S.started && !S.over) yearTick(); };
/* called by checkEnd (20-engine.js) just before the end screen opens */
const _onEnd = P.onEnd;
P.onEnd = () => { if (_onEnd) _onEnd(); finalYear(); };
