/* Admin API (role = admin) and game settings that change online.
   Every change an admin makes is written to admin_log (who, what, when).
   Make the first admin from the server:  docker compose exec api node scripts/make-admin.js <username> */
import { tx } from "./db.js";
import { SHOP, CHARS, levelOf, LEVELS } from "./game-rules.js";

const fail = (reply, code, error, extra = {}) => reply.code(code).send({error, ...extra});
const CONFIG_KEYS = ["balance", "announcement", "disabledEvents", "prices", "certMinCards"];
const ROLES = ["player", "tester", "admin"];

/* settings stored in game_config, merged over the defaults */
export async function readConfig(db){
  const rows = (await db.query("SELECT key, value FROM game_config")).rows;
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}
export async function priceOf(db, item){
  const cfg = await readConfig(db), p = cfg.prices && Number(cfg.prices[item]);
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
    const runs = (await pool.query("SELECT id, mode, ab, char, ending, tick, temp, score, terra, xp, flagged, note, started_at, finished_at FROM game_results WHERE user_id = $1 ORDER BY started_at DESC LIMIT 30", [id])).rows;
    const certs = (await pool.query("SELECT code, full_name, grade, issued_at FROM certificates WHERE user_id = $1 ORDER BY issued_at DESC", [id])).rows;
    const ach = (await pool.query("SELECT ach FROM achievements WHERE user_id = $1", [id])).rows.map(r => r.ach);
    return {user:{...u, gems:await balance(pool, id), cards}, owned:me.owned, chars:me.chars, runs, certs, ach, shop:Object.keys(SHOP), charsList:CHARS, levels:LEVELS};
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
      for (const k of add) await db.query("INSERT INTO owned_items(user_id, item) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, k]);
      for (const k of remove) await db.query("DELETE FROM owned_items WHERE user_id = $1 AND item = $2", [id, k]);
      await log(db, req, id, "items", {add, remove});
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
      await db.query("INSERT INTO character_progress(user_id, char, xp) VALUES ($1, $2, $3) ON CONFLICT (user_id, char) DO UPDATE SET xp = EXCLUDED.xp", [id, ch, xp]);
      await log(db, req, id, "xp", {char:ch, xp, level:levelOf(xp)});
      return {ok:true, xp, level:levelOf(xp)};
    });
  });
  app.post("/api/admin/users/:id/cards", ADMIN, async (req, reply) => {
    const id = await userId(pool, req.params.id); if (!id) return fail(reply, 404, "not_found");
    const cards = Math.max(0, Math.min(500, Math.round(Number((req.body || {}).cards) || 0)));
    return tx(pool, async db => {
      await db.query("INSERT INTO progress(user_id, cards) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET cards = EXCLUDED.cards, updated_at = now()", [id, cards]);
      await log(db, req, id, "cards", {cards});
      return {ok:true, cards};
    });
  });
  /* special settings: certOverride (true = may request a certificate now, false = never) · abGroup ("A"/"B"/…, null = random) · role · banned */
  app.post("/api/admin/users/:id/flags", ADMIN, async (req, reply) => {
    const id = await userId(pool, req.params.id); if (!id) return fail(reply, 404, "not_found");
    const b = req.body || {};
    return tx(pool, async db => {
      const u = (await db.query("SELECT flags, role, banned FROM users WHERE id = $1 FOR UPDATE", [id])).rows[0];
      const flags = {...u.flags};
      if ("certOverride" in b) b.certOverride === null ? delete flags.certOverride : flags.certOverride = !!b.certOverride;
      if ("abGroup" in b) b.abGroup ? flags.abGroup = String(b.abGroup).slice(0, 8) : delete flags.abGroup;
      if ("note" in b) flags.note = String(b.note || "").slice(0, 200);
      let role = u.role, banned = u.banned;
      if (b.role !== undefined){ if (!ROLES.includes(b.role)) return fail(reply, 400, "bad_role"); if (id === req.uid && b.role !== "admin") return fail(reply, 400, "cant_demote_self"); role = b.role; }
      if (b.banned !== undefined){ if (id === req.uid) return fail(reply, 400, "cant_ban_self"); banned = !!b.banned; }
      await db.query("UPDATE users SET flags = $2, role = $3, banned = $4 WHERE id = $1", [id, flags, role, banned]);
      if (banned) await db.query("DELETE FROM refresh_tokens WHERE user_id = $1", [id]);
      await log(db, req, id, "flags", {flags, role, banned});
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

  /* ---------- online game settings ---------- */
  app.get("/api/admin/config", ADMIN, async () => ({config:await readConfig(pool), keys:CONFIG_KEYS, shop:SHOP}));
  app.put("/api/admin/config/:key", ADMIN, async (req, reply) => {
    const key = String(req.params.key); if (!CONFIG_KEYS.includes(key)) return fail(reply, 400, "bad_key");
    const value = (req.body || {}).value;
    if (value === undefined || JSON.stringify(value).length > 20000) return fail(reply, 400, "bad_value");
    if (key === "balance"){
      const p = value && value.presets; if (!p || typeof p !== "object" || !Object.keys(p).length) return fail(reply, 400, "bad_value");
      for (const v of Object.values(p)) for (const k of ["inc", "cost", "haz", "growth"]) if (v[k] !== undefined && !(Number(v[k]) > 0 && Number(v[k]) < 5)) return fail(reply, 400, "bad_value");
    }
    return tx(pool, async db => {
      await db.query("INSERT INTO game_config(key, value, updated_at, updated_by) VALUES ($1, $2, now(), $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by", [key, JSON.stringify(value), req.uid]);
      await log(db, req, null, "config", {key, value});
      return {ok:true};
    });
  });

  /* ---------- A/B test results ---------- */
  app.get("/api/admin/stats/ab", ADMIN, async req => {
    const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
    const rows = (await pool.query(`SELECT ab, COUNT(*)::int AS games,
        COUNT(*) FILTER (WHERE ending = 'win')::int AS wins,
        COUNT(*) FILTER (WHERE ending IN ('l1','l2','l3'))::int AS losses,
        COUNT(*) FILTER (WHERE ending IS NULL AND updated_at < now() - interval '1 hour')::int AS quit,
        COUNT(*) FILTER (WHERE ending = 'win' AND temp < 1.6)::int AS grade_s,
        COUNT(*) FILTER (WHERE ending = 'win' AND temp >= 1.6 AND temp < 2.0)::int AS grade_a,
        COUNT(*) FILTER (WHERE ending = 'win' AND temp >= 2.0)::int AS grade_b,
        ROUND(AVG(temp) FILTER (WHERE ending = 'win')::numeric, 2) AS win_temp,
        ROUND(AVG(real_sec) FILTER (WHERE ending IS NOT NULL)::numeric / 60, 1) AS minutes,
        ROUND(AVG(last_tick) FILTER (WHERE ending IS NULL AND updated_at < now() - interval '1 hour')::numeric / 12 + 2026, 1) AS quit_year
      FROM play_stats WHERE NOT world AND mode = 'normal' AND started_at > now() - ($1 || ' days')::interval GROUP BY ab ORDER BY ab`, [String(days)])).rows;
    return {days, rows};
  });
  app.get("/api/admin/log", ADMIN, async () => ({rows:(await pool.query(`SELECT l.id, l.action, l.detail, l.created_at, a.username AS admin, t.username AS target
      FROM admin_log l LEFT JOIN users a ON a.id = l.admin_id LEFT JOIN users t ON t.id = l.target_id ORDER BY l.created_at DESC LIMIT 200`)).rows}));
}

/* ---------- play statistics (guests too): one row per game, updated once a year of game time ---------- */
export function registerStats(app, pool, readUid){
  const lim = {config:{rateLimit:{max:30, timeWindow:"1 minute"}}};
  const num = (v, lo, hi) => (typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null);
  app.post("/api/stats/start", lim, async req => {
    const b = req.body || {}, uid = await readUid(req);
    const ab = /^[A-Z]{1,4}$/.test(String(b.ab || "")) ? String(b.ab) : "A", mode = ["normal", "hard", "daily"].includes(b.mode) ? b.mode : "normal";
    const r = await pool.query("INSERT INTO play_stats(user_id, ab, mode, world) VALUES ($1, $2, $3, $4) RETURNING id", [uid, ab, mode, !!b.world]);
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
