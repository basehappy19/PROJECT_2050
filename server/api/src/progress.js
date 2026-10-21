/* The player's progress kept with the account so it follows them to every device:
   achievements, endings reached (unlocks Hard Core and the Continuous World), events and hazards seen (knowledge cards),
   characters played and a few counters. Two devices are merged, never overwritten: lists are joined, counters keep the larger value. */
const ID = /^[A-Za-z0-9_.:-]{1,48}$/;
const LISTS = ["seen", "haz", "charsDone"], COUNTS = ["greens", "aids", "evac", "cev", "daily"], STAMPS = ["got", "ends"], FLAGS = ["tut"];
const num = v => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, 1e13) : 0; };

export function cleanProgress(o){
  const out = {};
  if (!o || typeof o !== "object") return out;
  for (const k of LISTS) if (Array.isArray(o[k])) out[k] = [...new Set(o[k].filter(x => typeof x === "string" && ID.test(x)))].slice(0, 3000);
  for (const k of COUNTS) if (o[k] !== undefined) out[k] = Math.min(num(o[k]), 1e6);
  for (const k of STAMPS) if (o[k] && typeof o[k] === "object") out[k] = Object.fromEntries(Object.entries(o[k]).filter(([id, v]) => ID.test(id) && num(v)).slice(0, 500).map(([id, v]) => [id, num(v)]));
  for (const k of FLAGS) if (o[k]) out[k] = 1;
  return out;
}
export function mergeProgress(a, b){
  a = cleanProgress(a); b = cleanProgress(b);
  const out = {};
  for (const k of LISTS) if (a[k] || b[k]) out[k] = [...new Set([...(a[k] || []), ...(b[k] || [])])].slice(0, 3000);
  for (const k of COUNTS) if (a[k] !== undefined || b[k] !== undefined) out[k] = Math.max(a[k] || 0, b[k] || 0);
  // achievements keep the first time they were earned; endings keep the latest
  for (const k of STAMPS) if (a[k] || b[k]){
    const m = {...(a[k] || {})};
    for (const [id, v] of Object.entries(b[k] || {})) m[id] = m[id] ? (k === "got" ? Math.min(m[id], v) : Math.max(m[id], v)) : v;
    out[k] = m;
  }
  for (const k of FLAGS) if (a[k] || b[k]) out[k] = 1;
  return out;
}
