/* 1.8 · Weekly missions and the gem season pass.
   Everything is worked out from finished games on the server (game_results), so the client cannot fake progress.
   · Weekly missions: 3 per Bangkok week (Monday to Sunday), the same for everyone, picked from a pool by the week's date.
     Each pays gems (Terra) once and adds season XP.
   · Season: by default one calendar month (Bangkok time). The admin page can set a named season with its own dates,
     XP per tier and rewards. Every finished game gives season XP; tiers are claimed one by one. */
import { gradeOf, SHOP } from "./game-rules.js";

const bkkDate = d => new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Bangkok", year:"numeric", month:"2-digit", day:"2-digit"}).format(d);
const at7 = day => new Date(day + "T00:00:00+07:00");
const addDays = (day, n) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const T = (th, en) => ({th, en});

/* ---------------- weekly missions ---------------- */
export const MISSIONS = {
  finish3: {goal:3, tier:0, t:T("เล่นจบ 3 เกม", "Finish 3 games"), test:() => true},
  win1:    {goal:1, tier:0, t:T("ชนะ 1 เกม", "Win a game"), test:r => r.ending === "win"},
  playHard:{goal:1, tier:0, t:T("เล่นโหมด Hard Core จนจบ 1 เกม", "Finish a Hard Core game"), test:r => r.mode === "hard"},
  daily2:  {goal:2, tier:0, t:T("เล่นภารกิจประจำวัน 2 วัน", "Play the Daily Challenge on 2 days"), test:r => r.mode === "daily", distinct:"daily_date"},
  finish5: {goal:5, tier:1, t:T("เล่นจบ 5 เกม", "Finish 5 games"), test:() => true},
  win2:    {goal:2, tier:1, t:T("ชนะ 2 เกม", "Win 2 games"), test:r => r.ending === "win"},
  charWin: {goal:1, tier:1, t:T("ชนะด้วยตัวละครที่ไม่ใช่นักวิทยาศาสตร์", "Win with a character other than the Scientist"), test:r => r.ending === "win" && r.char !== "sci"},
  appr60:  {goal:1, tier:1, t:T("จบเกมโดยความนิยมยังเกิน 60%", "Finish a game with approval above 60%"), test:r => Number(r.appr) > 60},
  skills25:{goal:1, tier:1, t:T("จบเกมโดยปลดล็อก 25 สกิลขึ้นไป", "Finish a game with 25 or more skills"), test:r => Number(r.skills) >= 25},
  gradeA:  {goal:1, tier:2, t:T("ชนะด้วยเกรด A ขึ้นไป", "Win with grade A or better"), test:r => r.ending === "win" && gradeOf(Number(r.temp)) !== "B"},
  cool18:  {goal:1, tier:2, t:T("ชนะโดยโลกร้อนไม่ถึง +1.8°C", "Win with warming below +1.8°C"), test:r => r.ending === "win" && Number(r.temp) < 1.8},
  winHard: {goal:1, tier:2, t:T("ชนะโหมด Hard Core", "Win in Hard Core"), test:r => r.ending === "win" && r.mode === "hard"},
  score7500:{goal:1, tier:2, t:T("ทำคะแนน 7,500 ขึ้นไปในเกมเดียว", "Score 7,500 or more in one game"), test:r => Number(r.score) >= 7500},
};
export const WEEKLY_DEFAULT = {terra:[10, 15, 25], xp:40, off:[]};   // 1.7: halved
/* Monday (Bangkok) of the week that contains `now`, as YYYY-MM-DD */
export function weekKey(now = new Date()){
  const day = bkkDate(now), d = new Date(day + "T00:00:00Z"), dow = (d.getUTCDay() + 6) % 7;
  return addDays(day, -dow);
}
function hash(s){ let h = 2166136261; for (const ch of s){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
/* one easy, one medium, one hard mission; the same for everyone in a week */
export function weekMissions(week, cfg = WEEKLY_DEFAULT){
  const off = new Set(cfg.off || []), out = [];
  let h = hash("week:" + week);
  for (let tier = 0; tier < 3; tier++){
    let pool = Object.keys(MISSIONS).filter(id => MISSIONS[id].tier === tier && !off.has(id));
    if (!pool.length) pool = Object.keys(MISSIONS).filter(id => !off.has(id) && !out.includes(id));
    if (!pool.length) break;
    out.push(pool[h % pool.length]); h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
  }
  return out;
}

/* ---------------- season ---------------- */
export const DEFAULT_TIERS = [{terra:5}, {terra:8}, {terra:8}, {terra:10}, {terra:10, item:"frame"}, {terra:10}, {terra:12}, {terra:12}, {terra:15}, {terra:25, item:"theme_night"}];   // 1.7: halved
export const SEASON_STEP = 120;
const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const EN_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/* the season in force: the admin's season if today is inside its dates, otherwise this calendar month */
export function currentSeason(cfg, now = new Date()){
  const today = bkkDate(now);
  if (cfg && cfg.id && cfg.start <= today && today < cfg.end) return {...cfg, auto:false};
  const [y, m] = today.split("-").map(Number), start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return {id:start.slice(0, 7), name:T(`ซีซั่น ${TH_MONTH[m - 1]} ${y + 543}`, `Season ${EN_MONTH[m - 1]} ${y}`), start, end, step:SEASON_STEP, tiers:DEFAULT_TIERS, auto:true};
}
/* season XP for one finished game */
export const seasonXp = r => Math.round(20 + (r.ending === "win" ? 30 : 0) + Math.min(30, Math.max(0, Number(r.score) || 0) / 300) + (r.mode === "hard" ? 10 : 0));

async function finishedGames(db, uid, from, to){
  return (await db.query(`SELECT mode, ending, temp, appr, skills, char, score, daily_date FROM game_results
    WHERE user_id = $1 AND finished_at >= $2 AND finished_at < $3 AND NOT flagged AND ending IS NOT NULL`, [uid, from, to])).rows;
}
/* everything the game's season screen shows */
export async function seasonState(db, uid, settings, now = new Date()){
  const wcfg = {...WEEKLY_DEFAULT, ...(settings.weekly || {})}, season = currentSeason(settings.season, now);
  const week = weekKey(now), wEnd = addDays(week, 7);
  const wRows = await finishedGames(db, uid, at7(week), at7(wEnd));
  const wClaims = new Set((await db.query("SELECT mission FROM weekly_claims WHERE user_id = $1 AND week = $2", [uid, week])).rows.map(r => r.mission));
  const missions = weekMissions(week, wcfg).map((id, i) => {
    const M = MISSIONS[id], hits = wRows.filter(M.test);
    const progress = M.distinct ? new Set(hits.map(r => String(r[M.distinct]))).size : hits.length;
    return {id, name:M.t, goal:M.goal, progress:Math.min(progress, M.goal), done:progress >= M.goal, claimed:wClaims.has(id), terra:wcfg.terra[i] ?? wcfg.terra[wcfg.terra.length - 1], xp:wcfg.xp};
  });
  const sRows = await finishedGames(db, uid, at7(season.start), at7(season.end));
  const sClaimsW = (await db.query("SELECT COUNT(*)::int AS n FROM weekly_claims WHERE user_id = $1 AND created_at >= $2 AND created_at < $3", [uid, at7(season.start), at7(season.end)])).rows[0].n;
  const xp = sRows.reduce((s, r) => s + seasonXp(r), 0) + sClaimsW * wcfg.xp;
  const claimed = (await db.query("SELECT tier FROM season_claims WHERE user_id = $1 AND season = $2", [uid, season.id])).rows.map(r => r.tier);
  const owned = new Set((await db.query("SELECT item FROM owned_items WHERE user_id = $1", [uid])).rows.map(r => r.item));
  const reached = Math.min(season.tiers.length, Math.floor(xp / season.step));
  return {
    season:{id:season.id, name:season.name, start:season.start, end:season.end, step:season.step, auto:season.auto,
      tiers:season.tiers.map((t, i) => ({tier:i + 1, xp:(i + 1) * season.step, terra:t.terra + (t.item && owned.has(t.item) && !claimed.includes(i + 1) ? ITEM_SWAP : 0), item:t.item && !owned.has(t.item) ? t.item : null,
        reached:i < reached, claimed:claimed.includes(i + 1)}))},
    xp, reached, games:sRows.length,
    weekly:{week, ends:wEnd, missions},
  };
}
/* a season item the player already owns is paid in gems instead */
export const ITEM_SWAP = 20;

/* claim one season tier (inside a transaction) */
export async function claimTier(db, uid, settings, tier, now = new Date()){
  const st = await seasonState(db, uid, settings, now), t = st.season.tiers[tier - 1];
  if (!t) return "bad_tier";
  if (!t.reached) return "not_reached";
  if (t.claimed) return "already_claimed";
  const r = await db.query("INSERT INTO season_claims(user_id, season, tier, reward) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING", [uid, st.season.id, tier, t.item || null]);
  if (!r.rowCount) return "already_claimed";
  if (t.terra) await db.query("INSERT INTO wallet_ledger(user_id, amount, reason, ref) VALUES ($1, $2, 'season', $3)", [uid, t.terra, `${st.season.id}#${tier}`]);
  if (t.item && SHOP[t.item]) await db.query("INSERT INTO owned_items(user_id, item) VALUES ($1, $2) ON CONFLICT DO NOTHING", [uid, t.item]);
  return null;
}
/* claim one weekly mission's reward */
export async function claimMission(db, uid, settings, mission, now = new Date()){
  const st = await seasonState(db, uid, settings, now), m = st.weekly.missions.find(x => x.id === mission);
  if (!m) return "bad_mission";
  if (!m.done) return "not_done";
  if (m.claimed) return "already_claimed";
  const r = await db.query("INSERT INTO weekly_claims(user_id, week, mission, terra) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING", [uid, st.weekly.week, mission, m.terra]);
  if (!r.rowCount) return "already_claimed";
  await db.query("INSERT INTO wallet_ledger(user_id, amount, reason, ref) VALUES ($1, $2, 'weekly', $3)", [uid, m.terra, `${st.weekly.week}:${mission}`]);
  return null;
}

/* settings checks (settings.js) */
const isDay = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + "T00:00:00Z"));
export function checkSeason(v){
  if (v === null) return null;
  if (!v || typeof v !== "object") return undefined;
  const id = typeof v.id === "string" ? v.id.trim() : "";
  if (!/^[\w-]{1,40}$/.test(id) || !isDay(v.start) || !isDay(v.end) || v.end <= v.start) return undefined;
  const step = Number(v.step);
  if (!Number.isInteger(step) || step < 20 || step > 5000) return undefined;
  if (!Array.isArray(v.tiers) || !v.tiers.length || v.tiers.length > 30) return undefined;
  const tiers = [];
  for (const t of v.tiers){
    const terra = Number(t && t.terra);
    if (!Number.isInteger(terra) || terra < 0 || terra > 1000) return undefined;
    if (t.item && !SHOP[t.item]) return undefined;
    tiers.push(t.item ? {terra, item:t.item} : {terra});
  }
  const name = v.name && typeof v.name === "object" ? {th:String(v.name.th || "").slice(0, 80).trim(), en:String(v.name.en || "").slice(0, 80).trim()} : {th:id, en:id};
  return {id, name, start:v.start, end:v.end, step, tiers};
}
export function checkWeekly(v){
  if (!v || typeof v !== "object") return undefined;
  const terra = Array.isArray(v.terra) && v.terra.length === 3 && v.terra.every(x => Number.isInteger(Number(x)) && Number(x) >= 0 && Number(x) <= 1000) ? v.terra.map(Number) : undefined;
  const xp = Number.isInteger(Number(v.xp)) && Number(v.xp) >= 0 && Number(v.xp) <= 1000 ? Number(v.xp) : undefined;
  const off = Array.isArray(v.off) && v.off.every(x => MISSIONS[x]) ? [...new Set(v.off)] : undefined;
  if (!terra || xp === undefined || !off) return undefined;
  if (Object.keys(MISSIONS).filter(id => !off.includes(id)).length < 3) return undefined;
  return {terra, xp, off};
}
