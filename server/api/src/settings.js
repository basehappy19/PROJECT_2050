/* Game settings kept in the database (table game_config) and edited on the admin page.
   .env only holds what the server needs before it can reach the database (DATABASE_URL, JWT_SECRET, ports).
   Each setting: a default, a check, and (for old installs) the environment variable it used to come from. */
import { config } from "./config.js";
import { checkSeason, checkWeekly, WEEKLY_DEFAULT } from "./season.js";

const env = process.env;
const str = max => v => (typeof v === "string" && v.length <= max ? v.trim() : undefined);
const int = (lo, hi) => v => (Number.isInteger(Number(v)) && Number(v) >= lo && Number(v) <= hi ? Number(v) : undefined);
const urlList = v => (Array.isArray(v) && v.length <= 20 && v.every(x => typeof x === "string" && /^https?:\/\/[^\s/]+$/.test(x.trim())) ? v.map(x => x.trim().replace(/\/$/, "")) : undefined);
const idList = v => (Array.isArray(v) && v.length <= 1000 && v.every(x => typeof x === "string" && /^[A-Za-z0-9_]{1,40}$/.test(x)) ? [...new Set(v)] : undefined);
const texts = v => (v && typeof v === "object" && ["th", "en"].every(k => v[k] === undefined || (typeof v[k] === "string" && v[k].length <= 500)) ? {th:(v.th || "").trim(), en:(v.en || "").trim()} : undefined);
const priceMap = v => (v && typeof v === "object" && Object.values(v).every(x => Number.isInteger(Number(x)) && Number(x) >= 0 && Number(x) <= 100000) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x)])) : undefined);

export const SETTINGS = {
  announcement:  {def:() => ({th:"", en:""}), check:texts},
  disabledEvents:{def:() => [], check:idList},
  prices:        {def:() => ({}), check:priceMap},
  certMinCards:  {def:() => Number(env.CERT_MIN_CARDS || 20), check:int(0, 500)},
  certIssuer:    {def:() => "", check:str(120)},
  certPartner:   {def:() => "", check:str(120)},
  minGameSeconds:{def:() => Number(env.MIN_GAME_SECONDS ?? 300), check:int(0, 7200)},
  googleClientId:{def:() => (env.GOOGLE_CLIENT_ID || "").trim(), check:v => (v === "" || (typeof v === "string" && /^[\w.-]{10,200}\.apps\.googleusercontent\.com$/.test(v.trim())) ? v.trim() : undefined)},
  extraOrigins:  {def:() => [], check:urlList},
  season:        {def:() => null, check:checkSeason},                 // 1.8: null = one season per calendar month
  weekly:        {def:() => ({...WEEKLY_DEFAULT}), check:checkWeekly},
};
export const SETTING_KEYS = Object.keys(SETTINGS);

let cache = null, cacheAt = 0;
/* every setting with its current value (database value, or the default) */
export async function getSettings(db, fresh = false){
  if (!fresh && cache && Date.now() - cacheAt < 5000) return cache;
  const rows = (await db.query("SELECT key, value FROM game_config")).rows, saved = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const out = {};
  for (const [k, s] of Object.entries(SETTINGS)){ const v = saved[k] === undefined || saved[k] === null ? undefined : s.check(saved[k]); out[k] = v === undefined ? s.def() : v; }
  cache = out; cacheAt = Date.now();
  return out;
}
export const forgetSettings = () => { cache = null; };
export const lastSettings = () => cache;

/* which web pages may call the API: the site itself (PUBLIC_URL), anything in CORS_ORIGIN (old installs) and extraOrigins */
export function originAllowed(origin){
  if (!origin) return true;
  const list = [...config.corsOrigin, ...((cache && cache.extraOrigins) || [])];
  if (config.publicUrl) list.push(config.publicUrl);
  if (!list.length || list.includes("*")) return true;
  return list.some(o => o.replace(/\/$/, "") === origin);
}
