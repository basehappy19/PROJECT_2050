/* Rules the server checks and pays out. Keep these numbers in sync with the game's data files
   (web/src/engine/14-data-world.js: SHOP, PRICE, TERRA, LEVELS). */

export const SHOP = {
  speed3:{price:299}, char_dip:{price:449}, char_eco:{price:399}, char_act:{price:399}, char_oce:{price:299}, char_eng:{price:349},   // 1.7: dearer the more often a character wins
  theme_night:{price:149}, theme_paint:{price:149}, outfit:{price:199}, frame:{price:99},
};
export const RENAME_PRICE = 49;
export const CHARS = ["sci", "dip", "eco", "act", "oce", "eng"];
export const MODES = ["normal", "hard", "daily"];
export const LEVELS = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700];
export const levelOf = xp => { let l = 1; LEVELS.forEach((v, i) => { if (xp >= v) l = i + 1; }); return l; };

/* achievements: id → Terra paid once (easy 5 · medium 10 · hard 20) */
const EASY = ["start", "tutorial", "tech1", "action1", "event1", "saver", "ability1", "ore1"];
const HARD = ["allTech", "win15", "winEarly", "hardWin", "readAll", "lvl10", "charAll", "friends20", "unity", "read100", "fusion", "thrive", "green10"];
const ALL = ["start","tutorial","tech1","action1","event1","saver","greens","aids","rush","rich","branchE","branchP","branchN","allTech","fusion","unity","safe","peak","half","decade",
  "win","winEarly","win15","winLoved","loseTime","loseHeat","loseVote","chaoPhraya","read25","read100","readAll",
  "ability1","skill20","branchI","branchC","branchW","rel100","friends20","bilateral","alliance","cev10","stormSafe","evac5","hardWin","daily","charAll","lvl10","cards30",
  /* 1.0 */ "ore1","ore5c","pins30","green10","news10","world1","thrive"];
export const ACH_TERRA = Object.fromEntries(ALL.map(id => [id, EASY.includes(id) ? 3 : HARD.includes(id) ? 10 : 5]));   // 1.7: halved

/* Terra for one finished game (before the daily limit) */
export const TERRA = {win:15, l3:6, l2:3, l1:2, bonusMax:8, capGame:23, capHard:34, hardMult:1.5};   // 1.7: gems are rarer (was win 30, cap 45)
export function terraFor(s){
  const base = TERRA[s.ending] || 0;
  const bonus = (Math.max(0, Math.min(6, (2.0 - s.temp) / 0.6 * 6)) + Math.max(0, Math.min(5, s.appr / 100 * 5)) + Math.max(0, Math.min(4, s.rel / 100 * 4))) / 2;
  let t = base + Math.min(TERRA.bonusMax, bonus);
  if (s.mode === "hard") t *= TERRA.hardMult;
  return Math.round(Math.min(t, s.mode === "hard" ? TERRA.capHard : TERRA.capGame));
}
/* same formula as the game (20-engine.js · score) */
export function scoreFor(s){
  const left = Math.max(0, 300 - s.tick);
  const base = s.ending === "win" ? 5000 + left * 20 : Math.round((36 - s.net) * 80);
  return Math.max(0, Math.round(base + Math.max(0, 2.5 - s.temp) * 1500 + s.appr * 15 + Math.max(0, s.rel) * 10));
}
export const xpFor = (s, score) => Math.round(Math.min(160, 40 + score / 120) + (s.ending === "win" ? 60 : 0));
/* daily limit: games 1–3 of the (Bangkok) day pay in full, 4–6 pay half, later games 10% */
export function dailyFactor(gamesBefore){ return gamesBefore < 3 ? [1, null] : gamesBefore < 6 ? [0.5, "reduced"] : [0.1, "daily_cap"]; }
/* Daily Challenge seed: identical to P.dailySeed in the game (FNV-1a of the UTC date) */
export function dailySeed(dateStr){ let h = 2166136261; for (const ch of dateStr){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h | 0; }
export const gradeOf = temp => temp < 1.6 ? "S" : temp < 2.0 ? "A" : "B";

/* Is this result possible? Returns null when OK, otherwise the reason. */
export function checkSummary(s, elapsedSec, hasSpeed3){
  const num = (v, lo, hi) => typeof v === "number" && isFinite(v) && v >= lo && v <= hi;
  if (!["win", "l1", "l2", "l3"].includes(s.ending)) return "bad_ending";
  if (!Number.isInteger(s.tick) || !num(s.tick, 1, 300)) return "bad_tick";
  if (!num(s.temp, 0.8, 4) || !num(s.net, -60, 80) || !num(s.appr, 0, 100) || !num(s.rel, -100, 100) || !num(s.skills, 0, 60)) return "bad_values";
  if (s.ending === "win" && s.net > 0.05) return "bad_win";
  if (s.ending === "l1" && s.temp < 2.99) return "bad_l1";
  if (s.ending === "l2" && s.appr > 0.5) return "bad_l2";
  if (s.ending === "l3" && s.tick < 300) return "bad_l3";
  // one month takes at least 3 s at 3× (4/3 s in versions before 1.0) or 2 s at 2×; allow 15% for timer jitter
  const minSec = s.tick * (hasSpeed3 ? 4 / 3 : 2) * 0.85;
  if (elapsedSec < minSec) return "too_fast";
  return null;
}
