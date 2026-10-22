/* Admin API (role = admin) and game settings that change online.
   Every change an admin makes is written to admin_log (who, what, when).
   Make the first admin from the server:  docker compose exec api node scripts/make-admin.js <username> */
import { tx } from "./db.js";
import { SHOP, CHARS, levelOf, LEVELS } from "./game-rules.js";
import { SETTINGS, SETTING_KEYS, getSettings, forgetSettings } from "./settings.js";
import { MISSIONS, DEFAULT_TIERS, SEASON_STEP, currentSeason, weekKey, weekMissions } from "./season.js";

const fail = (reply, code, error, extra = {}) => reply.code(code).send({error, ...extra});
const ROLES = ["player", "tester", "admin"];

export async function priceOf(db, item){
  const p = (await getSettings(db)).prices[item];
  return Number.isFinite(p) && p >= 0 ? p : (SHOP[item] ? SHOP[item].price : null);
}

export function registerAdmin(app, pool, {balance, meBody}){
  const ADMIN = {config:{auth:true, admin:true}};
  app.addHook("preHandler", async (req, reply) => {
    if (!req.routeOptions.config || !req.routeOptions.config.admin) return;
    const u = (await pool.query("SELECT role, banned FROM users WHERE id = $1", [req.uid])).rows[0];
    if (!u || u.role !== "admin" || u.banned) return fail(reply, 403, "not_admin");
  });
  const log = (db, req, target, action, detail) => db.query("INSERT INTO admin_log(admin_id, target_id, action, detail) VALUES ($1, $2, $3, $4)", [req.uid, target, action, detail || {}]);
  const userId = async (db, idOrName) => {
    const s = String(idOrName);
    const r = /^\d+$/.test(s) ? await db.query("SELECT id FROM users WHERE id = $1", [Number(s)]) : await db.query("SELECT id FROM users WHERE username = $1", [s.toLowerCase()]);
    return r.rows[0] ? r.rows[0].id : null;
  };

  /* ---------- players ---------- */
  app.get("/api/admin/users", ADMIN, async req => {
    const q = String(req.query.q || "").trim().toLowerCase();
    const rows = (await pool.query(`SELECT u.id, u.username, u.email, u.display_name, u.role, u.flags, u.banned, u.created_at, u.last_login,
        COALESCE((SELECT SUM(amount) FROM wallet_ledger w WHERE w.user_id = u.id), 0)::int AS gems,
        (SELECT COUNT(*) FROM game_results g WHERE g.user_id = u.id AND g.ending = 'win' AND NOT g.flagged)::int AS wins,
        (SELECT COUNT(*) FROM game_results g WHERE g.user_id = u.id AND g.finished_at IS NOT NULL)::int AS games
      FROM users u WHERE $1 = '' OR u.username LIKE '%' || $1 || '%' OR LOWER(u.email) LIKE '%' || $1 || '%' OR LOWER(u.display_name) LIKE '%' || $1 || '%'
      ORDER BY u.last_login DESC NULLS LAST LIMIT 100`, [q])).rows;
    return {rows};
  });
  app.get("/api/admin/users/:id", ADMIN, async (req, reply) => {
    const id = await userId(pool, req.params.id); if (!id) return fail(reply, 404, "not_found");
    const u = (await pool.query("SELECT id, username, email, display_name, role, flags, banned, created_at, last_login FROM users WHERE id = $1", [id])).rows[0];
    const me = await meBody(pool, id);
    const cards = ((await pool.query("SELECT cards FROM progress WHERE user_id = $1", [id])).rows[0] || {cards:0}).cards;
    const runs = (await pool.query("SELECT id, mode, world, char, ending, tick, temp, score, terra, xp, flagged, note, started_at, finished_at FROM game_results WHERE user_id = $1 ORDER BY started_at DESC LIMIT 30", [id])).rows;
    const certs = (await pool.query("SELECT code, full_name, grade, issued_at FROM certificates WHERE user_id = $1 ORDER BY issued_at DESC", [id])).rows;
    const ach = (await pool.query("SELECT ach FROM achievements WHERE user_id = $1", [id])).rows.map(r => r.ach);
    const ledger = (await pool.query("SELECT amount, reason, ref, created_at FROM wallet_ledger WHERE user_id = $1 ORDER BY id DESC LIMIT 20", [id])).rows;
    const history = (await pool.query("SELECT l.action, l.detail, l.created_at, a.username AS admin FROM admin_log l LEFT JOIN users a ON a.id = l.admin_id WHERE l.target_id = $1 ORDER BY l.id DESC LIMIT 20", [id])).rows;
    const flags = {...(u.flags || {})}; delete flags.abGroup;
    return {user:{...u, flags, gems:await balance(pool, id), cards}, owned:me.owned, chars:me.chars, runs, certs, ach, ledger, history, shop:Object.keys(SHOP), charsList:CHARS, levels:LEVELS};
  });
  app.post("/api/admin/users/:id/gems", ADMIN, async (req, reply) => {
    const id = await userId(pool, req.params.id); if (!id) return fail(reply, 404, "not_found");
    const amount = Math.round(Number((req.body || {}).amount)), note = String((req.body || {}).note || "").slice(0, 120);
    if (!Number.isFinite(amount) || !amount || Math.abs(amount) > 100000) return fail(reply, 400, "bad_amount");
    return tx(pool, async db => {
      await db.query("INSERT INTO wallet_ledger(user_id, amount, reason, ref) VALUES ($1, $2, 'admin', $3)", [id, amount, note || null]);
      await log(db, req, id, "gems", {amount, note});
      return {ok:true, gems:await balance(db, id)};
    });
  });
  app.post("/api/admin/users/:id/items", ADMIN, async (req, reply) => {
    const id = await userId(pool, req.params.id); if (!id) return fail(reply, 404, "not_found");
    const add = [].concat((req.body || {}).add || []).map(String).filter(k => SHOP[k]), remove = [].concat((req.body || {}).remove || []).map(String).filter(k => SHOP[k]);
    return tx(pool, async db => {
      const had = new Set((await db.query("SELECT item FROM owned_items WHERE user_id = $1", [id])).rows.map(r => r.item));
      for (const k of add) await db.query("INSERT INTO owned_items(user_id, item) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, k]);
      for (const k of remove) await db.query("DELETE FROM owned_items WHERE user_id = $1 AND item = $2", [id, k]);
      const given = add.filter(k => !had.has(k)), taken = remove.filter(k => had.has(k));
      if (given.length || taken.length) await log(db, req, id, "items", {add:given, remove:taken});
      return {ok:true, owned:(await db.query("SELECT item FROM owned_items WHERE user_id = $1", [id])).rows.map(r => r.item)};
    });
  });
  app.post("/api/admin/users/:id/xp", ADMIN, async (req, reply) => {
    const id = await userId(pool, req.params.id); if (!id) return fail(reply, 404, "not_found");
    const ch = String((req.body || {}).char || ""), b = req.body || {};
    if (!CHARS.includes(ch)) return fail(reply, 400, "bad_char");
    let xp = Math.round(Number(b.xp));
    if (b.level !== undefined){ const lv = Math.max(1, Math.min(LEVELS.length, Math.round(Number(b.level)))); xp = LEVELS[lv - 1]; }
    if (!Number.isFinite(xp) || xp < 0 || xp > 100000) return fail(reply, 400, "bad_xp");
    return tx(pool, async db => {
      const old = ((await db.query("SELECT xp FROM character_progress WHERE user_id = $1 AND char = $2", [id, ch])).rows[0] || {xp:0}).xp;
      await db.query("INSERT INTO character_progress(user_id, char, xp) VALUES ($1, $2, $3) ON CONFLICT (user_id, char) DO UPDATE SET xp = EXCLUDED.xp", [id, ch, xp]);
      await log(db, req, id, "xp", {char:ch, xp, level:levelOf(xp), from:levelOf(old)});
      return {ok:true, xp, level:levelOf(xp)};
    });
  });
  app.post("/api/admin/users/:id/cards", ADMIN, async (req, reply) => {
    const id = await userId(pool, req.params.id); if (!id) return fail(reply, 404, "not_found");
    const cards = Math.max(0, Math.min(500, Math.round(Number((req.body || {}).cards) || 0)));
    return tx(pool, async db => {
      const old = ((await db.query("SELECT cards FROM progress WHERE user_id = $1", [id])).rows[0] || {cards:0}).cards;
      await db.query("INSERT INTO progress(user_id, cards) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET cards = EXCLUDED.cards, updated_at = now()", [id, cards]);
      await log(db, req, id, "cards", {cards, from:old});
      return {ok:true, cards};
    });
  });
  /* special settings: certOverride (true = may request a certificate now, false = never, null = usual rules) · note · role · banned */
  app.post("/api/admin/users/:id/flags", ADMIN, async (req, reply) => {
    const id = await userId(pool, req.params.id); if (!id) return fail(reply, 404, "not_found");
    const b = req.body || {};
    return tx(pool, async db => {
      const u = (await db.query("SELECT flags, role, banned FROM users WHERE id = $1 FOR UPDATE", [id])).rows[0];
      const flags = {...u.flags}; delete flags.abGroup;
      if ("certOverride" in b) b.certOverride === null ? delete flags.certOverride : flags.certOverride = !!b.certOverride;
      if ("note" in b) flags.note = String(b.note || "").slice(0, 200);
      let role = u.role, banned = u.banned;
      if (b.role !== undefined){ if (!ROLES.includes(b.role)) return fail(reply, 400, "bad_role"); if (id === req.uid && b.role !== "admin") return fail(reply, 400, "cant_demote_self"); role = b.role; }
      if (b.banned !== undefined){ if (id === req.uid) return fail(reply, 400, "cant_ban_self"); banned = !!b.banned; }
      await db.query("UPDATE users SET flags = $2, role = $3, banned = $4 WHERE id = $1", [id, flags, role, banned]);
      if (banned) await db.query("DELETE FROM refresh_tokens WHERE user_id = $1", [id]);
      const changes = {};
      if ((u.flags || {}).certOverride !== flags.certOverride) changes.certOverride = [(u.flags || {}).certOverride ?? null, flags.certOverride ?? null];
      if (((u.flags || {}).note || "") !== (flags.note || "")) changes.note = [(u.flags || {}).note || "", flags.note || ""];
      if (u.role !== role) changes.role = [u.role, role];
      if (u.banned !== banned) changes.banned = [u.banned, banned];
      if (Object.keys(changes).length) await log(db, req, id, "flags", {changes});
      return {ok:true, flags, role, banned};
    });
  });
  /* reset parts of a player's progress */
  app.post("/api/admin/users/:id/reset", ADMIN, async (req, reply) => {
    const id = await userId(pool, req.params.id); if (!id) return fail(reply, 404, "not_found");
    const what = [].concat((req.body || {}).what || []).map(String);
    const ok = ["results", "achievements", "chars", "cards", "saves", "items"];
    if (!what.length || what.some(w => !ok.includes(w))) return fail(reply, 400, "bad_reset");
    return tx(pool, async db => {
      if (what.includes("results")) await db.query("DELETE FROM game_results WHERE user_id = $1", [id]);
      if (what.includes("achievements")) await db.query("DELETE FROM achievements WHERE user_id = $1", [id]);
      if (what.includes("chars")) await db.query("DELETE FROM character_progress WHERE user_id = $1", [id]);
      if (what.includes("cards")) await db.query("DELETE FROM progress WHERE user_id = $1", [id]);
      if (what.includes("saves")) await db.query("DELETE FROM cloud_saves WHERE user_id = $1", [id]);
      if (what.includes("items")) await db.query("DELETE FROM owned_items WHERE user_id = $1", [id]);
      await log(db, req, id, "reset", {what});
      return {ok:true};
    });
  });

  /* ---------- game settings (database) ---------- */
  app.get("/api/admin/settings", ADMIN, async () => {
    const st = await getSettings(pool, true);
    const rows = (await pool.query("SELECT c.key, c.updated_at, u.username FROM game_config c LEFT JOIN users u ON u.id = c.updated_by")).rows;
    const missions = Object.fromEntries(Object.entries(MISSIONS).map(([k, v]) => [k, {t:v.t, goal:v.goal, tier:v.tier}]));
    const claims = (await pool.query(`SELECT (SELECT COUNT(*)::int FROM weekly_claims WHERE week = $1) AS weekly, (SELECT COUNT(*)::int FROM season_claims WHERE season = $2) AS season`, [weekKey(), currentSeason(st.season).id])).rows[0];
    return {settings:st, updated:Object.fromEntries(rows.map(r => [r.key, {at:r.updated_at, by:r.username}])), shop:SHOP, chars:CHARS, levels:LEVELS,
      missions, seasonNow:currentSeason(st.season), defaultTiers:DEFAULT_TIERS, defaultStep:SEASON_STEP, week:weekKey(), weekMissions:weekMissions(weekKey(), st.weekly), claims};
  });
  app.put("/api/admin/settings/:key", ADMIN, async (req, reply) => {
    const key = String(req.params.key), def = SETTINGS[key]; if (!def) return fail(reply, 400, "bad_key");
    const raw = (req.body || {}).value, value = raw === null ? null : def.check(raw);
    if (value === undefined) return fail(reply, 400, "bad_value");
    return tx(pool, async db => {
      const before = (await getSettings(db, true))[key];
      if (value === null) await db.query("DELETE FROM game_config WHERE key = $1", [key]);
      else await db.query("INSERT INTO game_config(key, value, updated_at, updated_by) VALUES ($1, $2, now(), $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by", [key, JSON.stringify(value), req.uid]);
      forgetSettings();
      const after = (await getSettings(db, true))[key];
      if (JSON.stringify(before) !== JSON.stringify(after)) await log(db, req, null, "setting", {key, before, after});
      return {ok:true, value:after};
    });
  });

  /* ---------- overview numbers for the dashboard ---------- */
  app.get("/api/admin/overview", ADMIN, async () => {
    const one = async (sql, args = []) => (await pool.query(sql, args)).rows[0];
    const players = await one(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new7,
      COUNT(*) FILTER (WHERE last_login > now() - interval '1 day')::int AS active1, COUNT(*) FILTER (WHERE last_login > now() - interval '7 days')::int AS active7,
      COUNT(*) FILTER (WHERE banned)::int AS banned, COUNT(*) FILTER (WHERE role = 'admin')::int AS admins FROM users`);
    const games = await one(`SELECT COUNT(*)::int AS started, COUNT(*) FILTER (WHERE ending IS NOT NULL)::int AS finished, COUNT(*) FILTER (WHERE ending = 'win')::int AS wins,
      COUNT(*) FILTER (WHERE started_at > now() - interval '1 day')::int AS today, ROUND(AVG(real_sec) FILTER (WHERE ending IS NOT NULL)::numeric / 60)::int AS minutes,
      COUNT(*) FILTER (WHERE world)::int AS world FROM play_stats WHERE started_at > now() - interval '30 days'`);
    const gems = await one(`SELECT COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::int AS earned, COALESCE(-SUM(amount) FILTER (WHERE amount < 0), 0)::int AS spent FROM wallet_ledger WHERE created_at > now() - interval '30 days'`);
    const certs = await one(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE issued_at > now() - interval '30 days')::int AS month FROM certificates`);
    const days = (await pool.query(`SELECT to_char(d, 'YYYY-MM-DD') AS day, (SELECT COUNT(*) FROM play_stats p WHERE (p.started_at AT TIME ZONE 'Asia/Bangkok') >= d AND (p.started_at AT TIME ZONE 'Asia/Bangkok') < d + interval '1 day')::int AS games
      FROM generate_series(date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok') - interval '13 days', date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok'), interval '1 day') d ORDER BY d`)).rows;
    const top = (await pool.query(`SELECT u.username, u.display_name, MAX(g.score)::int AS score FROM game_results g JOIN users u ON u.id = g.user_id
      WHERE g.ending = 'win' AND NOT g.flagged AND g.finished_at > now() - interval '30 days' GROUP BY u.id ORDER BY score DESC LIMIT 5`)).rows;
    return {players, games, gems, certs, days, top};
  });

  /* ---------- 1.1.6 difficulty from real games (guests included): how games end, in which year players lose, the numbers at the end ---------- */
  app.get("/api/admin/difficulty", ADMIN, async req => {
    const q = req.query || {}, args = [], where = [];
    const mode = String(q.mode || "all"), days = String(q.days || "30"), ver = String(q.ver || "");
    if (mode === "world") where.push("world"); else if (["normal", "hard", "daily"].includes(mode)){ args.push(mode); where.push(`mode = $${args.length} AND NOT world`); }
    if (/^\d+$/.test(days)){ args.push(+days); where.push(`started_at > now() - ($${args.length} || ' days')::interval`); }
    if (/^\d+\.\d+(\.\d+)?$/.test(ver)){ args.push(ver); where.push(`ver = $${args.length}`); }
    const W = where.length ? "WHERE " + where.join(" AND ") : "";
    const one = async sql => (await pool.query(sql, args)).rows[0];
    const sum = await one(`SELECT COUNT(*)::int AS started, COUNT(*) FILTER (WHERE ending IS NOT NULL)::int AS finished,
      COUNT(*) FILTER (WHERE ending IS NULL AND updated_at < now() - interval '6 hours')::int AS abandoned,
      COUNT(*) FILTER (WHERE ending = 'win')::int AS win, COUNT(*) FILTER (WHERE ending = 'l1')::int AS l1, COUNT(*) FILTER (WHERE ending = 'l2')::int AS l2, COUNT(*) FILTER (WHERE ending = 'l3')::int AS l3,
      ROUND(AVG(real_sec) FILTER (WHERE ending IS NOT NULL)::numeric / 60, 1)::float AS minutes FROM play_stats ${W}`);
    const years = (await pool.query(`SELECT 2026 + LEAST(24, last_tick / 12) AS y, COALESCE(ending, 'quit') AS e, COUNT(*)::int AS n FROM play_stats ${W ? W + " AND" : "WHERE"}
      (ending IS NOT NULL OR updated_at < now() - interval '6 hours') GROUP BY 1, 2 ORDER BY 1`, args)).rows;
    const ends = (await pool.query(`SELECT ending AS e, COUNT(*)::int AS n, ROUND(AVG(temp)::numeric, 2)::float AS temp, ROUND(AVG(appr)::numeric, 1)::float AS appr, ROUND(AVG(net)::numeric, 1)::float AS net,
      ROUND(AVG(skills)::numeric, 1)::float AS skills, ROUND(AVG(ore_used)::numeric)::int AS ore, ROUND(AVG(last_tick)::numeric)::int AS tick, ROUND(AVG(real_sec)::numeric / 60, 1)::float AS minutes
      FROM play_stats ${W ? W + " AND" : "WHERE"} ending IS NOT NULL GROUP BY ending`, args)).rows;
    const vers = (await pool.query(`SELECT COALESCE(ver, '1.0') AS ver, COUNT(*)::int AS n FROM play_stats GROUP BY 1 ORDER BY 1 DESC LIMIT 12`)).rows;
    return {sum, years, ends, vers};
  });

  app.get("/api/admin/log", ADMIN, async req => {
    const q = req.query || {}, action = String(q.action || ""), who = String(q.user || "").toLowerCase().replace(/^@/, ""), before = Number(q.before) || null;
    const rows = (await pool.query(`SELECT l.id, l.action, l.detail, l.created_at, a.username AS admin, a.display_name AS admin_name, t.username AS target, t.display_name AS target_name
      FROM admin_log l LEFT JOIN users a ON a.id = l.admin_id LEFT JOIN users t ON t.id = l.target_id
      WHERE ($1 = '' OR l.action = $1) AND ($2 = '' OR a.username = $2 OR t.username = $2) AND ($3::bigint IS NULL OR l.id < $3)
      ORDER BY l.id DESC LIMIT 50`, [action, who, before])).rows;
    return {rows, more:rows.length === 50};
  });
}

/* ---------- play statistics (guests too): one row per game, updated once a year of game time ---------- */
export function registerStats(app, pool, readUid){
  const lim = {config:{rateLimit:{max:30, timeWindow:"1 minute"}}};
  const num = (v, lo, hi) => (typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null);
  app.post("/api/stats/start", lim, async req => {
    const b = req.body || {}, uid = await readUid(req);
    const ab = /^[A-Z]{1,4}$/.test(String(b.ab || "")) ? String(b.ab) : "A", mode = ["normal", "hard", "daily"].includes(b.mode) ? b.mode : "normal";
    const ver = /^\d+\.\d+(\.\d+)?$/.test(String(b.ver || "")) ? String(b.ver) : null;
    const r = await pool.query("INSERT INTO play_stats(user_id, ab, mode, world, ver) VALUES ($1, $2, $3, $4, $5) RETURNING id", [uid, ab, mode, !!b.world, ver]);
    return {id:r.rows[0].id};
  });
  app.post("/api/stats/:id", lim, async (req, reply) => {
    const id = String(req.params.id); if (!/^[0-9a-f-]{36}$/.test(id)) return reply.code(400).send({error:"bad_id"});
    const b = req.body || {};
    const ending = ["win", "l1", "l2", "l3"].includes(b.ending) ? b.ending : null;
    await pool.query(`UPDATE play_stats SET updated_at = now(), last_tick = GREATEST(last_tick, $2), ending = COALESCE(ending, $3), temp = COALESCE($4, temp), net = COALESCE($5, net),
      appr = COALESCE($6, appr), real_sec = COALESCE($7, real_sec), skills = COALESCE($8, skills), ore_used = COALESCE($9, ore_used) WHERE id = $1 AND ending IS NULL`,
      [id, Math.round(num(b.tick, 0, 100000) || 0), ending, num(b.temp, 0, 6), num(b.net, -100, 200), num(b.appr, 0, 100), b.realSec != null ? Math.round(num(b.realSec, 0, 1e7)) : null, b.skills != null ? Math.round(num(b.skills, 0, 99)) : null, b.ore != null ? Math.round(num(b.ore, 0, 1e6)) : null]);
    return {ok:true};
  });
}
