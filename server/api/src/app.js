import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { tx } from "./db.js";
import { hashPassword, checkPassword, accessToken, readAccess, issueRefresh, useRefresh, revokeRefresh, verifyGoogle, googleTicket, readGoogleTicket, newCode } from "./auth.js";
import { SHOP, RENAME_PRICE, CHARS, MODES, levelOf, ACH_TERRA, terraFor, scoreFor, xpFor, dailyFactor, dailySeed, gradeOf, checkSummary } from "./game-rules.js";
import { badWord } from "./words.js";
import { certificatePdf, verifyHtml } from "./certificate.js";
import { registerAdmin, registerStats, priceOf } from "./admin.js";
import { getSettings, originAllowed } from "./settings.js";

const fail = (reply, code, error, extra = {}) => reply.code(code).send({error, ...extra});
const USERNAME = /^[a-z0-9_]{3,16}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const cleanName = s => String(s || "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
const bkkDate = d => new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Bangkok", year:"numeric", month:"2-digit", day:"2-digit"}).format(d);

export function buildApp(pool, opts = {}){
  const app = Fastify({logger:opts.logger ?? {level:config.logLevel}, trustProxy:true, bodyLimit:2 * 1024 * 1024});
  app.register(cors, {origin:(origin, cb) => cb(null, originAllowed(origin)), methods:["GET", "POST", "PUT", "DELETE"]});
  app.addHook("onReady", async () => { await getSettings(pool, true); });   // settings from the database (admin page)
  app.register(rateLimit, {global:true, max:240, timeWindow:"1 minute", errorResponseBuilder:() => ({statusCode:429, error:"rate_limited"})});
  const authLimit = {config:{rateLimit:{max:12, timeWindow:"1 minute"}}};

  /* ---------- helpers ---------- */
  const balance = async (db, uid) => (await db.query("SELECT COALESCE(SUM(amount), 0)::int AS b FROM wallet_ledger WHERE user_id = $1", [uid])).rows[0].b;
  async function publicUser(db, uid){
    const u = (await db.query("SELECT id, username, email, display_name, renamed, role, flags FROM users WHERE id = $1", [uid])).rows[0];
    if (!u) return null;
    const w = (await db.query(`SELECT COUNT(*) FILTER (WHERE mode IN ('normal', 'daily')) > 0 AS normal, COUNT(*) FILTER (WHERE mode = 'hard') > 0 AS hard
      FROM game_results WHERE user_id = $1 AND ending = 'win' AND NOT flagged`, [uid])).rows[0];
    return {username:u.username, email:u.email, displayName:u.display_name, renamed:u.renamed, terra:await balance(db, uid), role:u.role, cleared:{normal:!!w.normal, hard:!!w.hard}};
  }
  async function meBody(db, uid){
    const user = await publicUser(db, uid);
    const owned = (await db.query("SELECT item FROM owned_items WHERE user_id = $1", [uid])).rows.map(r => r.item);
    const chars = Object.fromEntries((await db.query("SELECT char, xp FROM character_progress WHERE user_id = $1", [uid])).rows.map(r => [r.char, r.xp]));
    return {user, owned, chars};
  }
  async function session(db, uid){
    await db.query("UPDATE users SET last_login = now() WHERE id = $1", [uid]);
    return {access:await accessToken(uid), refresh:await issueRefresh(db, uid), ...(await meBody(db, uid))};
  }
  /* routes with {auth:true} need "Authorization: Bearer <access token>" */
  app.addHook("preHandler", async (req, reply) => {
    if (!req.routeOptions.config || !req.routeOptions.config.auth) return;
    const h = req.headers.authorization || "";
    try { req.uid = await readAccess(h.replace(/^Bearer\s+/i, "")); } catch { return fail(reply, 401, "unauthorized"); }
    const u = (await pool.query("SELECT banned FROM users WHERE id = $1", [req.uid])).rows[0];
    if (!u) return fail(reply, 401, "unauthorized");
    if (u.banned) return fail(reply, 403, "banned");
  });
  const AUTH = {config:{auth:true}};

  /* ---------- public ---------- */
  /* game settings: the server's defaults, overridden by what an admin set online (game_config) */
  app.get("/api/config", async () => {
    const c = await getSettings(pool), prices = {...Object.fromEntries(Object.entries(SHOP).map(([k, v]) => [k, v.price])), rename:RENAME_PRICE, ...c.prices};
    return {game:"p2050", version:3, googleClientId:c.googleClientId || null, certMinCards:c.certMinCards, prices,
      announcement:c.announcement.th || c.announcement.en ? c.announcement : null, disabledEvents:c.disabledEvents};
  });
  app.get("/api/health", async () => { await pool.query("SELECT 1"); return {ok:true}; });

  /* ---------- accounts ---------- */
  app.post("/api/auth/register", authLimit, async (req, reply) => {
    const b = req.body || {};
    const username = String(b.username || "").trim().toLowerCase(), email = String(b.email || "").trim().toLowerCase(), password = String(b.password || "");
    const displayName = cleanName(b.displayName || username).slice(0, 20);
    if (!USERNAME.test(username)) return fail(reply, 400, "bad_username");
    if (!EMAIL.test(email)) return fail(reply, 400, "bad_email");
    if (password.length < 8 || password.length > 200) return fail(reply, 400, "weak_password");
    if (displayName.length < 2) return fail(reply, 400, "bad_display");
    if (badWord(username) || badWord(displayName)) return fail(reply, 400, "bad_word");
    const ph = await hashPassword(password);
    try {
      return await tx(pool, async db => {
        const r = await db.query("INSERT INTO users(username, email, password_hash, display_name) VALUES ($1, $2, $3, $4) RETURNING id", [username, email, ph, displayName]);
        return session(db, r.rows[0].id);
      });
    } catch (e){
      if (e.code === "23505") return fail(reply, 409, /email/.test(e.constraint || e.detail || "") ? "email_taken" : "username_taken");
      throw e;
    }
  });
  app.post("/api/auth/login", authLimit, async (req, reply) => {
    const login = String((req.body || {}).login || "").trim().toLowerCase(), password = String((req.body || {}).password || "");
    if (!login || !password) return fail(reply, 400, "missing");
    const u = (await pool.query("SELECT id, password_hash, banned FROM users WHERE username = $1 OR email = $1", [login])).rows[0];
    if (!u || !(await checkPassword(u.password_hash, password))) return fail(reply, 401, "bad_login");
    if (u.banned) return fail(reply, 403, "banned");
    return tx(pool, db => session(db, u.id));
  });
  app.post("/api/auth/google", authLimit, async (req, reply) => {
    const gid = (await getSettings(pool)).googleClientId;
    if (!gid) return fail(reply, 400, "google_disabled");
    let g; try { g = await verifyGoogle(String((req.body || {}).idToken || ""), gid); } catch { g = null; }
    if (!g) return fail(reply, 401, "google_bad");
    const u = (await pool.query("SELECT id FROM users WHERE google_sub = $1", [g.sub])).rows[0];
    if (u) return tx(pool, db => session(db, u.id));
    if (g.email){   // an account with the same e-mail exists: link Google to it
      const e = (await pool.query("SELECT id FROM users WHERE email = $1 AND google_sub IS NULL", [g.email])).rows[0];
      if (e) return tx(pool, async db => { await db.query("UPDATE users SET google_sub = $1 WHERE id = $2", [g.sub, e.id]); return session(db, e.id); });
    }
    return {needUsername:true, ticket:await googleTicket(g)};
  });
  app.post("/api/auth/google/complete", authLimit, async (req, reply) => {
    let g; try { g = await readGoogleTicket(String((req.body || {}).ticket || "")); } catch { return fail(reply, 401, "google_bad"); }
    const username = String((req.body || {}).username || "").trim().toLowerCase();
    if (!USERNAME.test(username)) return fail(reply, 400, "bad_username");
    if (badWord(username)) return fail(reply, 400, "bad_word");
    const displayName = cleanName(g.name || username).slice(0, 20) || username;
    try {
      return await tx(pool, async db => {
        const r = await db.query("INSERT INTO users(username, email, google_sub, display_name) VALUES ($1, $2, $3, $4) RETURNING id", [username, g.email, g.sub, badWord(displayName) ? username : displayName]);
        return session(db, r.rows[0].id);
      });
    } catch (e){ if (e.code === "23505") return fail(reply, 409, /email/.test(e.constraint || "") ? "email_taken" : "username_taken"); throw e; }
  });
  app.post("/api/auth/refresh", {config:{rateLimit:{max:120, timeWindow:"1 minute"}}}, async (req, reply) => {
    return tx(pool, async db => {
      const uid = await useRefresh(db, (req.body || {}).refresh);
      if (!uid) return fail(reply, 401, "unauthorized");
      return {access:await accessToken(uid), refresh:await issueRefresh(db, uid)};
    });
  });
  app.post("/api/auth/logout", async req => { await revokeRefresh(pool, (req.body || {}).refresh); return {ok:true}; });

  /* ---------- profile ---------- */
  app.get("/api/me", AUTH, async (req, reply) => { const b = await meBody(pool, req.uid); return b.user ? b : fail(reply, 401, "unauthorized"); });
  app.post("/api/me/display-name", AUTH, async (req, reply) => {
    const name = cleanName((req.body || {}).displayName);
    if (name.length < 2 || name.length > 20) return fail(reply, 400, "bad_display");
    if (badWord(name)) return fail(reply, 400, "bad_word");
    return tx(pool, async db => {
      const u = (await db.query("SELECT renamed FROM users WHERE id = $1 FOR UPDATE", [req.uid])).rows[0];
      if (u.renamed){
        if (await balance(db, req.uid) < RENAME_PRICE) return fail(reply, 400, "not_enough_terra");
        await db.query("INSERT INTO wallet_ledger(user_id, amount, reason, ref) VALUES ($1, $2, 'rename', $3)", [req.uid, -RENAME_PRICE, name]);
      }
      await db.query("UPDATE users SET display_name = $1, renamed = TRUE WHERE id = $2", [name, req.uid]);
      return meBody(db, req.uid);
    });
  });

  /* ---------- shop ---------- */
  app.post("/api/shop/buy", AUTH, async (req, reply) => {
    const item = String((req.body || {}).item || "");
    if (!SHOP[item]) return fail(reply, 400, "unknown_item");
    return tx(pool, async db => {
      await db.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [req.uid]);       // one purchase at a time per player
      if ((await db.query("SELECT 1 FROM owned_items WHERE user_id = $1 AND item = $2", [req.uid, item])).rowCount) return fail(reply, 400, "already_owned");
      const price = await priceOf(db, item);
      if (await balance(db, req.uid) < price) return fail(reply, 400, "not_enough_terra");
      await db.query("INSERT INTO wallet_ledger(user_id, amount, reason, ref) VALUES ($1, $2, 'shop', $3)", [req.uid, -price, item]);
      await db.query("INSERT INTO owned_items(user_id, item) VALUES ($1, $2)", [req.uid, item]);
      return meBody(db, req.uid);
    });
  });

  /* ---------- game runs: the server pays Terra / XP and keeps the leaderboard ---------- */
  app.post("/api/runs", AUTH, async (req, reply) => {
    const b = req.body || {};
    const mode = MODES.includes(b.mode) ? b.mode : "normal", ch = CHARS.includes(b.char) ? b.char : "sci";
    if (ch !== "sci" && !(await pool.query("SELECT 1 FROM owned_items WHERE user_id = $1 AND item = $2", [req.uid, "char_" + ch])).rowCount) return fail(reply, 403, "char_locked");
    const now = new Date(), utc = now.toISOString().slice(0, 10);
    const daily = mode === "daily" ? (Number(b.seed) === dailySeed(utc) ? utc : null) : null;
    const ab = /^[A-Z]{1,4}$/.test(String(b.ab || "")) ? String(b.ab) : null;
    const r = await pool.query("INSERT INTO game_results(user_id, mode, char, seed, day, daily_date, ab, world) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
      [req.uid, mode === "daily" && !daily ? "normal" : mode, ch, Number.isFinite(Number(b.seed)) ? Number(b.seed) : null, bkkDate(now), daily, ab, !!b.world]);
    return {runId:r.rows[0].id};
  });
  app.post("/api/runs/:id/finish", AUTH, async (req, reply) => {
    const id = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/.test(id)) return fail(reply, 400, "bad_run");
    const s = req.body || {};
    return tx(pool, async db => {
      const run = (await db.query("SELECT * FROM game_results WHERE id = $1 AND user_id = $2 FOR UPDATE", [id, req.uid])).rows[0];
      if (!run) return fail(reply, 404, "bad_run");
      if (run.finished_at) return fail(reply, 409, "already_finished");
      const elapsed = (Date.now() - new Date(run.started_at).getTime()) / 1000;
      const speed3 = (await db.query("SELECT 1 FROM owned_items WHERE user_id = $1 AND item = 'speed3'", [req.uid])).rowCount > 0;
      const sum = {ending:s.ending, tick:s.tick, temp:Number(s.temp), net:Number(s.net), appr:Number(s.appr), rel:Number(s.rel), skills:Number(s.skills), mode:run.mode};
      const problem = checkSummary(sum, elapsed, speed3);
      let terra = 0, xp = 0, score = 0, note = problem;
      if (!problem){
        score = scoreFor(sum); xp = xpFor(sum, score);
        if (elapsed < (await getSettings(db)).minGameSeconds) note = "too_short";
        else {
          const before = (await db.query("SELECT COUNT(*)::int AS n FROM game_results WHERE user_id = $1 AND day = $2 AND finished_at IS NOT NULL AND NOT flagged AND terra > 0", [req.uid, run.day])).rows[0].n;
          const [f, n] = dailyFactor(before);
          terra = Math.round(terraFor(sum) * f); note = n;
        }
      }
      await db.query(`UPDATE game_results SET finished_at = now(), ending = $2, tick = $3, temp = $4, net = $5, appr = $6, rel = $7, skills = $8, real_sec = $9,
        score = $10, terra = $11, xp = $12, flagged = $13, note = $14 WHERE id = $1`,
        [id, sum.ending || null, Number.isInteger(sum.tick) ? sum.tick : null, sum.temp || null, sum.net || null, sum.appr || null, sum.rel || null, sum.skills || null, Math.round(Number(s.realSec) || 0), score, terra, xp, !!problem, note]);
      if (terra) await db.query("INSERT INTO wallet_ledger(user_id, amount, reason, ref) VALUES ($1, $2, 'game', $3)", [req.uid, terra, id]);
      let level = null, levelUp = false;
      if (xp){
        const before = (await db.query("SELECT xp FROM character_progress WHERE user_id = $1 AND char = $2", [req.uid, run.char])).rows[0];
        const r = await db.query("INSERT INTO character_progress(user_id, char, xp) VALUES ($1, $2, $3) ON CONFLICT (user_id, char) DO UPDATE SET xp = character_progress.xp + EXCLUDED.xp RETURNING xp", [req.uid, run.char, xp]);
        level = levelOf(r.rows[0].xp); levelUp = level > levelOf(before ? before.xp : 0);
      }
      const me = await meBody(db, req.uid);
      return {terra, xp, score, level, levelUp, note, flagged:!!problem, user:me.user, chars:me.chars};
    });
  });

  /* ---------- leaderboard: best score per player ---------- */
  app.get("/api/leaderboard", async (req, reply) => {
    const mode = MODES.includes(req.query.mode) ? req.query.mode : "normal", period = ["week", "all", "day"].includes(req.query.period) ? req.query.period : "week";
    const where = ["finished_at IS NOT NULL", "NOT flagged", "mode = $1"], args = [mode];
    if (mode === "daily"){ where.push("daily_date = $2"); args.push(new Date().toISOString().slice(0, 10)); }
    else if (period === "week") where.push("finished_at >= date_trunc('week', now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok'");
    const best = `SELECT DISTINCT ON (r.user_id) r.user_id, r.score, r.ending, r.char FROM game_results r WHERE ${where.join(" AND ")} ORDER BY r.user_id, r.score DESC, r.finished_at`;
    const ranked = `SELECT b.*, u.username, u.display_name, EXISTS(SELECT 1 FROM owned_items o WHERE o.user_id = b.user_id AND o.item = 'frame') AS frame,
      RANK() OVER (ORDER BY b.score DESC) AS rank FROM (${best}) b JOIN users u ON u.id = b.user_id`;
    const rows = (await pool.query(`${ranked} ORDER BY rank, u.username LIMIT 50`, args)).rows;
    let me = null;
    const h = req.headers.authorization || "";
    if (h){ try { const uid = await readAccess(h.replace(/^Bearer\s+/i, "")); const m = (await pool.query(`SELECT * FROM (${ranked}) x WHERE user_id = $${args.length + 1}`, [...args, uid])).rows[0]; if (m) me = {rank:Number(m.rank), score:m.score}; } catch {} }
    return {mode, period, rows:rows.map(r => ({rank:Number(r.rank), username:r.username, displayName:r.display_name, score:r.score, ending:r.ending, char:r.char, frame:r.frame})), me};
  });

  /* ---------- achievements (Terra once per achievement) + learning progress ---------- */
  app.post("/api/achievements", AUTH, async (req, reply) => {
    const ids = Array.isArray((req.body || {}).ids) ? [...new Set(req.body.ids.map(String))].filter(id => ACH_TERRA[id]).slice(0, 100) : [];
    return tx(pool, async db => {
      let awarded = 0;
      for (const id of ids){
        const r = await db.query("INSERT INTO achievements(user_id, ach) VALUES ($1, $2) ON CONFLICT DO NOTHING", [req.uid, id]);
        if (r.rowCount){ awarded += ACH_TERRA[id]; await db.query("INSERT INTO wallet_ledger(user_id, amount, reason, ref) VALUES ($1, $2, 'achievement', $3)", [req.uid, ACH_TERRA[id], id]); }
      }
      return {awarded, user:await publicUser(db, req.uid)};
    });
  });
  app.put("/api/progress", AUTH, async req => {
    const cards = Math.max(0, Math.min(500, Math.round(Number((req.body || {}).cards) || 0)));
    await pool.query("INSERT INTO progress(user_id, cards) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET cards = GREATEST(progress.cards, EXCLUDED.cards), updated_at = now()", [req.uid, cards]);
    return {ok:true};
  });

  /* ---------- cloud saves (3 slots) ---------- */
  const SLOT = s => (["s1", "s2", "s3"].includes(s) ? s : null);
  app.get("/api/saves", AUTH, async req => Object.fromEntries((await pool.query("SELECT slot, meta FROM cloud_saves WHERE user_id = $1", [req.uid])).rows.map(r => [r.slot, {meta:r.meta}])));
  app.get("/api/saves/:slot", AUTH, async (req, reply) => {
    const slot = SLOT(req.params.slot); if (!slot) return fail(reply, 400, "bad_slot");
    const r = (await pool.query("SELECT meta, state FROM cloud_saves WHERE user_id = $1 AND slot = $2", [req.uid, slot])).rows[0];
    return r || fail(reply, 404, "empty");
  });
  app.put("/api/saves/:slot", AUTH, async (req, reply) => {
    const slot = SLOT(req.params.slot), b = req.body || {}; if (!slot) return fail(reply, 400, "bad_slot");
    if (!b.state || typeof b.state !== "object" || !b.meta || typeof b.meta !== "object") return fail(reply, 400, "bad_save");
    await pool.query("INSERT INTO cloud_saves(user_id, slot, meta, state) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, slot) DO UPDATE SET meta = EXCLUDED.meta, state = EXCLUDED.state, updated_at = now()", [req.uid, slot, b.meta, b.state]);
    return {ok:true};
  });

  /* ---------- certificates ---------- */
  /* Certificate rules: win Mission 2050 in the normal mode (Daily counts) AND in Hard Core, and unlock enough knowledge cards.
     One certificate per player. An admin can give a one-time right to request one now (certOverride = true; used up when the
     certificate is issued) or block a player (certOverride = false). */
  async function certInfo(db, uid){
    const w = (await db.query(`SELECT COUNT(*) FILTER (WHERE mode IN ('normal', 'daily'))::int AS normal, COUNT(*) FILTER (WHERE mode = 'hard')::int AS hard, MIN(temp) AS best
      FROM game_results WHERE user_id = $1 AND ending = 'win' AND NOT flagged`, [uid])).rows[0];
    const cards = ((await db.query("SELECT cards FROM progress WHERE user_id = $1", [uid])).rows[0] || {cards:0}).cards;
    const list = (await db.query("SELECT code, full_name, grade, issued_at FROM certificates WHERE user_id = $1 ORDER BY issued_at DESC", [uid])).rows;
    const flags = ((await db.query("SELECT flags FROM users WHERE id = $1", [uid])).rows[0] || {}).flags || {};
    const need = (await getSettings(db)).certMinCards, issued = list.length > 0;
    const rules = w.normal >= 1 && w.hard >= 1 && cards >= need;
    const eligible = flags.certOverride === true ? true : flags.certOverride === false ? false : rules && !issued;
    return {eligibility:{eligible, issued, rules, winsNormal:w.normal, winsHard:w.hard, wins:w.normal + w.hard, cards, needCards:need, override:flags.certOverride ?? null}, bestTemp:w.best,
      list:list.map(c => ({code:c.code, fullName:c.full_name, grade:c.grade, issuedAt:c.issued_at}))};
  }
  app.get("/api/certificates", AUTH, async req => { const c = await certInfo(pool, req.uid); delete c.bestTemp; return c; });
  app.post("/api/certificates", {config:{auth:true, rateLimit:{max:5, timeWindow:"1 minute"}}}, async (req, reply) => {
    const raw = String((req.body || {}).fullName || "").replace(/\s+/g, " ").trim();
    if (raw.length < 3 || raw.length > 80 || !/^[\p{L}\p{M} .'-]+$/u.test(raw) || badWord(raw)) return fail(reply, 400, "bad_name");
    const name = raw;
    return tx(pool, async db => {
      const info = await certInfo(db, req.uid);
      if (!info.eligibility.eligible) return fail(reply, 403, info.eligibility.issued ? "already_issued" : "not_eligible");
      if (info.list.length >= 10) return fail(reply, 400, "too_many");
      const code = newCode();
      await db.query("INSERT INTO certificates(code, user_id, full_name, grade) VALUES ($1, $2, $3, $4)", [code, req.uid, name, info.bestTemp != null ? gradeOf(info.bestTemp) : null]);
      if (info.eligibility.override === true){   // the admin's one-time right is used up
        await db.query("UPDATE users SET flags = flags - 'certOverride' WHERE id = $1", [req.uid]);
        await db.query("INSERT INTO admin_log(admin_id, target_id, action, detail) VALUES (NULL, $1, 'cert_used', $2)", [req.uid, {code}]);
      }
      const c = await certInfo(db, req.uid); delete c.bestTemp; return c;
    });
  });
  app.get("/api/certificates/:code/pdf", async (req, reply) => {
    const c = (await pool.query("SELECT * FROM certificates WHERE code = $1", [String(req.params.code).toUpperCase()])).rows[0];
    if (!c) return fail(reply, 404, "not_found");
    const st = await getSettings(pool), pdf = await certificatePdf(c, req, {issuer:st.certIssuer, partner:st.certPartner});
    return reply.type("application/pdf").header("Content-Disposition", `inline; filename="${c.code}.pdf"`).send(pdf);
  });
  app.get("/verify/:code", async (req, reply) => {
    const code = String(req.params.code).toUpperCase();
    const c = (await pool.query("SELECT * FROM certificates WHERE code = $1", [code])).rows[0];
    return reply.type("text/html; charset=utf-8").code(c ? 200 : 404).send(verifyHtml(c, code));
  });

  /* admin tools, online settings and play statistics */
  registerAdmin(app, pool, {balance, meBody});
  registerStats(app, pool, async req => { const h = req.headers.authorization || ""; if (!h) return null; try { return await readAccess(h.replace(/^Bearer\s+/i, "")); } catch { return null; } });

  app.setErrorHandler((err, req, reply) => {
    if (err.statusCode === 429) return reply.code(429).send({error:"rate_limited"});
    if (err.validation || err.statusCode === 400) return reply.code(400).send({error:"bad_request"});
    req.log.error(err);
    reply.code(500).send({error:"server"});
  });
  return app;
}
