// Integration tests against a real PostgreSQL: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
/* needs an empty PostgreSQL database you can wipe, e.g.
   TEST_DATABASE_URL=postgres://p2050:p2050@localhost:5432/p2050_test npm test   (the docker db works too) */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p2050test-"));
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://p2050:p2050@localhost:5432/p2050_test";
process.env.MIN_GAME_SECONDS = "0";
process.env.CERT_MIN_CARDS = "3";
process.env.CERT_CONFIG = path.join(dir, "nope.json");
let app, pool;
const { makePool, migrate } = await import("../src/db.js");
const { buildApp } = await import("../src/app.js");
const { dailySeed } = await import("../src/game-rules.js");

before(async () => {
  pool = makePool(process.env.DATABASE_URL);
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate(pool, {info(){}});
  app = buildApp(pool, {logger:false}); await app.ready();
});
after(async () => { await app.close(); await pool.end(); fs.rmSync(dir, {recursive:true, force:true}); });

const call = async (method, url, body, token) => {
  const r = await app.inject({method, url, payload:body, headers:token ? {authorization:"Bearer " + token} : {}});
  let j = null; try { j = r.json(); } catch {}
  return {status:r.statusCode, body:j, raw:r};
};
let tok, refresh;

test("config", async () => {
  const r = await call("GET", "/api/config");
  assert.equal(r.status, 200); assert.equal(r.body.game, "p2050"); assert.equal(r.body.googleClientId, null); assert.equal(r.body.prices.speed3, 199);
});
test("register, duplicate, bad input, login", async () => {
  let r = await call("POST", "/api/auth/register", {username:"phukhieo", email:"Teacher@School.ac.th", password:"secret123", displayName:"ภูเขียว"});
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.user.displayName, "ภูเขียว"); assert.equal(r.body.user.terra, 0);
  tok = r.body.access; refresh = r.body.refresh;
  r = await call("POST", "/api/auth/register", {username:"phukhieo", email:"x@y.zz", password:"secret123"}); assert.equal(r.body.error, "username_taken");
  r = await call("POST", "/api/auth/register", {username:"other", email:"teacher@school.ac.th", password:"secret123"}); assert.equal(r.body.error, "email_taken");
  r = await call("POST", "/api/auth/register", {username:"A!", email:"a@b.cc", password:"secret123"}); assert.equal(r.body.error, "bad_username");
  r = await call("POST", "/api/auth/register", {username:"abc", email:"a@b.cc", password:"short"}); assert.equal(r.body.error, "weak_password");
  r = await call("POST", "/api/auth/login", {login:"teacher@school.ac.th", password:"secret123"}); assert.equal(r.status, 200);
  r = await call("POST", "/api/auth/login", {login:"phukhieo", password:"nope12345"}); assert.equal(r.body.error, "bad_login");
  r = await call("POST", "/api/auth/google", {idToken:"x"}); assert.equal(r.body.error, "google_disabled");
});
test("refresh tokens rotate", async () => {
  let r = await call("POST", "/api/auth/refresh", {refresh}); assert.equal(r.status, 200);
  let r2 = await call("POST", "/api/auth/refresh", {refresh}); assert.equal(r2.status, 200);   // the old one still works for one minute (two tabs)
  await pool.query("UPDATE refresh_tokens SET expires_at = now() - interval '1 second' WHERE expires_at < now() + interval '2 minutes'");
  r2 = await call("POST", "/api/auth/refresh", {refresh}); assert.equal(r2.status, 401);   // then it is used up
  refresh = r.body.refresh; tok = r.body.access;
  r = await call("GET", "/api/me", null, tok); assert.equal(r.body.user.username, "phukhieo");
  r = await call("GET", "/api/me", null, "garbage"); assert.equal(r.status, 401);
});
test("a run pays Terra and XP; impossible results pay nothing", async () => {
  let r = await call("POST", "/api/runs", {mode:"normal", char:"sci", seed:1}, tok); assert.equal(r.status, 200); const id = r.body.runId;
  r = await call("POST", "/api/runs", {mode:"normal", char:"dip"}, tok); assert.equal(r.body.error, "char_locked");
  // pretend the run took 15 minutes
  await pool.query("UPDATE game_results SET started_at = now() - interval '15 minutes' WHERE id = $1", [id]);
  r = await call("POST", `/api/runs/${id}/finish`, {ending:"win", tick:290, temp:1.7, net:-0.2, appr:70, rel:30, skills:30, realSec:900}, tok);
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.flagged, false);
  assert.ok(r.body.terra >= 30 && r.body.terra <= 45, "terra " + r.body.terra); assert.ok(r.body.xp > 60);
  assert.equal(r.body.user.terra, r.body.terra);
  r = await call("POST", `/api/runs/${id}/finish`, {ending:"win", tick:290, temp:1.7, net:-0.2, appr:70, rel:30, skills:30}, tok); assert.equal(r.body.error, "already_finished");
  // too fast for 300 months → flagged
  r = await call("POST", "/api/runs", {mode:"normal", char:"sci"}, tok); const id2 = r.body.runId;
  r = await call("POST", `/api/runs/${id2}/finish`, {ending:"l3", tick:300, temp:2.2, net:10, appr:50, rel:10, skills:20}, tok);
  assert.equal(r.body.flagged, true); assert.equal(r.body.terra, 0); assert.equal(r.body.note, "too_fast");
  // a "win" that isn't one → flagged
  r = await call("POST", "/api/runs", {mode:"hard", char:"sci"}, tok); const id3 = r.body.runId;
  await pool.query("UPDATE game_results SET started_at = now() - interval '20 minutes' WHERE id = $1", [id3]);
  r = await call("POST", `/api/runs/${id3}/finish`, {ending:"win", tick:200, temp:1.7, net:5, appr:70, rel:30, skills:30}, tok);
  assert.equal(r.body.note, "bad_win");
});
test("daily reward limit", async () => {
  const pay = [];
  for (let i = 0; i < 7; i++){
    let r = await call("POST", "/api/runs", {mode:"normal", char:"sci"}, tok); const id = r.body.runId;
    await pool.query("UPDATE game_results SET started_at = now() - interval '12 minutes' WHERE id = $1", [id]);
    r = await call("POST", `/api/runs/${id}/finish`, {ending:"l3", tick:300, temp:2.0, net:5, appr:50, rel:0, skills:20}, tok);
    pay.push([r.body.terra, r.body.note]);
  }
  // 1 win already today → games 2–3 full, 4–6 half, 7+ 10%
  assert.ok(pay[0][0] > pay[2][0], JSON.stringify(pay)); assert.equal(pay[2][1], "reduced"); assert.equal(pay[5][1], "daily_cap");
});
test("daily challenge seed must match the date", async () => {
  const today = new Date().toISOString().slice(0, 10);
  let r = await call("POST", "/api/runs", {mode:"daily", char:"sci", seed:dailySeed(today)}, tok);
  let row = (await pool.query("SELECT mode, daily_date FROM game_results WHERE id = $1", [r.body.runId])).rows[0];
  assert.equal(row.mode, "daily"); assert.equal(row.daily_date, today);
  r = await call("POST", "/api/runs", {mode:"daily", char:"sci", seed:42}, tok);
  row = (await pool.query("SELECT mode FROM game_results WHERE id = $1", [r.body.runId])).rows[0];
  assert.equal(row.mode, "normal");
});
test("shop, rename, achievements", async () => {
  await pool.query("INSERT INTO wallet_ledger(user_id, amount, reason) SELECT id, 500, 'admin' FROM users WHERE username = 'phukhieo'");
  let r = await call("GET", "/api/me", null, tok); const bal = r.body.user.terra;
  r = await call("POST", "/api/shop/buy", {item:"speed3"}, tok); assert.equal(r.status, 200); assert.equal(r.body.user.terra, bal - 199); assert.ok(r.body.owned.includes("speed3"));
  r = await call("POST", "/api/shop/buy", {item:"speed3"}, tok); assert.equal(r.body.error, "already_owned");
  r = await call("POST", "/api/shop/buy", {item:"gold_bars"}, tok); assert.equal(r.body.error, "unknown_item");
  r = await call("POST", "/api/me/display-name", {displayName:"ครูภูเขียว"}, tok); assert.equal(r.body.user.displayName, "ครูภูเขียว"); const b2 = r.body.user.terra;
  r = await call("POST", "/api/me/display-name", {displayName:"ภูเขียว 2"}, tok); assert.equal(r.body.user.terra, b2 - 49);
  r = await call("POST", "/api/me/display-name", {displayName:"ไอ้สัตว์"}, tok); assert.equal(r.body.error, "bad_word");
  r = await call("POST", "/api/achievements", {ids:["start", "win", "fake", "start"]}, tok); assert.equal(r.body.awarded, 15);
  r = await call("POST", "/api/achievements", {ids:["start", "win"]}, tok); assert.equal(r.body.awarded, 0);
});
test("leaderboard shows the best run per player", async () => {
  let r = await call("GET", "/api/leaderboard?mode=normal&period=week", null, tok);
  assert.equal(r.status, 200); assert.equal(r.body.rows.length, 1); assert.equal(r.body.rows[0].username, "phukhieo"); assert.equal(r.body.me.rank, 1);
  assert.equal(r.body.rows[0].ending, "win");
  r = await call("GET", "/api/leaderboard?mode=hard&period=all"); assert.equal(r.body.rows.length, 0);   // the bad hard run was flagged
});
test("cloud saves", async () => {
  let r = await call("PUT", "/api/saves/s1", {meta:{tick:12}, state:{v:2, tick:12}}, tok); assert.equal(r.status, 200);
  r = await call("GET", "/api/saves", null, tok); assert.equal(r.body.s1.meta.tick, 12);
  r = await call("GET", "/api/saves/s1", null, tok); assert.equal(r.body.state.tick, 12);
  r = await call("PUT", "/api/saves/s9", {meta:{}, state:{}}, tok); assert.equal(r.body.error, "bad_slot");
});
test("certificate: eligibility, PDF and verify page", async () => {
  let r = await call("GET", "/api/certificates", null, tok); assert.equal(r.body.eligibility.wins, 1); assert.equal(r.body.eligibility.eligible, false);
  r = await call("POST", "/api/certificates", {fullName:"เด็กชายภูเขียว ใจดี"}, tok); assert.equal(r.body.error, "not_eligible");
  await call("PUT", "/api/progress", {cards:5}, tok);
  r = await call("GET", "/api/certificates", null, tok); assert.equal(r.body.eligibility.winsNormal, 1); assert.equal(r.body.eligibility.winsHard, 0); assert.equal(r.body.eligibility.eligible, false);   // Hard Core still needed
  const uid = (await pool.query("SELECT id FROM users WHERE username = 'phukhieo'")).rows[0].id;
  await pool.query("INSERT INTO game_results(user_id, mode, char, day, finished_at, ending, temp, score) VALUES ($1, 'hard', 'sci', CURRENT_DATE, now(), 'win', 1.7, 9000)", [uid]);
  r = await call("GET", "/api/me", null, tok); assert.deepEqual(r.body.user.cleared, {normal:true, hard:true});
  r = await call("POST", "/api/certificates", {fullName:"<script>"}, tok); assert.equal(r.body.error, "bad_name");
  r = await call("POST", "/api/certificates", {fullName:"เด็กชายภูเขียว ใจดี"}, tok); assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.eligibility.issued, true); assert.equal(r.body.eligibility.eligible, false);
  r = await call("POST", "/api/certificates", {fullName:"เด็กชายภูเขียว ใจดี"}, tok); assert.equal(r.body.error, "already_issued");   // one per player
  await pool.query("UPDATE users SET flags = flags || '{\"certOverride\": true}' WHERE id = $1", [uid]);      // admin gives a one-time right
  r = await call("POST", "/api/certificates", {fullName:"เด็กชายภูเขียว ใจดี"}, tok); assert.equal(r.status, 200); assert.equal(r.body.list.length, 2); assert.equal(r.body.eligibility.eligible, false);
  const c = r.body.list[1]; assert.match(c.code, /^P2050-[A-Z2-9]{4}-[A-Z2-9]{4}$/); assert.equal(c.grade, "A");
  r = await call("GET", `/api/certificates/${c.code}/pdf`); assert.equal(r.status, 200); assert.equal(r.raw.headers["content-type"], "application/pdf");
  fs.writeFileSync("/tmp/p2050-cert.pdf", r.raw.rawPayload);
  r = await call("GET", `/verify/${c.code}`); assert.equal(r.status, 200); assert.match(r.raw.body, /เด็กชายภูเขียว ใจดี/);
  r = await call("GET", "/verify/P2050-XXXX-XXXX"); assert.equal(r.status, 404);
});
test("logout revokes the refresh token", async () => {
  let r = await call("POST", "/api/auth/logout", {refresh}); assert.equal(r.status, 200);
  r = await call("POST", "/api/auth/refresh", {refresh}); assert.equal(r.status, 401);
});
