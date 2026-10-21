// Admin tools, online settings and play statistics (version 1.0): npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p2050adm-"));
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://p2050:p2050@localhost:5432/p2050_test";
process.env.MIN_GAME_SECONDS = "0"; process.env.CERT_MIN_CARDS = "3"; process.env.CERT_CONFIG = path.join(dir, "nope.json");
let app, pool;
const { makePool, migrate } = await import("../src/db.js");
const { buildApp } = await import("../src/app.js");
before(async () => {
  pool = makePool(process.env.DATABASE_URL);
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate(pool, {info(){}});
  app = buildApp(pool, {logger:false}); await app.ready();
});
after(async () => { await app.close(); await pool.end(); fs.rmSync(dir, {recursive:true, force:true}); });
const call = async (method, url, body, token) => { const r = await app.inject({method, url, payload:body, headers:token ? {authorization:"Bearer " + token} : {}}); let j = null; try { j = r.json(); } catch {} return {status:r.statusCode, body:j}; };
let admin, player;

test("only admins reach the admin API", async () => {
  let r = await call("POST", "/api/auth/register", {username:"teacher", email:"t@school.ac.th", password:"secret123"}); admin = r.body.access;
  r = await call("POST", "/api/auth/register", {username:"student1", email:"s1@school.ac.th", password:"secret123"}); player = r.body.access;
  r = await call("GET", "/api/admin/users", null, admin); assert.equal(r.status, 403);
  await pool.query("UPDATE users SET role = 'admin' WHERE username = 'teacher'");
  r = await call("GET", "/api/admin/users?q=stud", null, admin); assert.equal(r.status, 200); assert.equal(r.body.rows.length, 1); assert.equal(r.body.rows[0].username, "student1");
  r = await call("GET", "/api/admin/users", null, player); assert.equal(r.status, 403);
});
test("gems, items, levels and certificate rights; every change is logged", async () => {
  let r = await call("POST", "/api/admin/users/student1/gems", {amount:500, note:"test"}, admin); assert.equal(r.body.gems, 500);
  r = await call("GET", "/api/me", null, player); assert.equal(r.body.user.terra, 500);
  r = await call("POST", "/api/admin/users/student1/items", {add:["char_dip", "speed3"]}, admin); assert.deepEqual(r.body.owned.sort(), ["char_dip", "speed3"]);
  r = await call("POST", "/api/admin/users/student1/xp", {char:"dip", level:5}, admin); assert.equal(r.body.level, 5);
  r = await call("GET", "/api/certificates", null, player); assert.equal(r.body.eligibility.eligible, false);
  r = await call("POST", "/api/admin/users/student1/flags", {certOverride:true, note:"สอบแทน"}, admin); assert.equal(r.body.flags.certOverride, true);
  r = await call("GET", "/api/certificates", null, player); assert.equal(r.body.eligibility.eligible, true);
  r = await call("GET", "/api/admin/log", null, admin); assert.ok(r.body.rows.length >= 4); assert.equal(r.body.rows[0].target, "student1");
  assert.deepEqual(r.body.rows[0].detail.changes.certOverride, [null, true]);
  r = await call("GET", "/api/admin/log?action=gems", null, admin); assert.equal(r.body.rows.length, 1); assert.equal(r.body.rows[0].detail.amount, 500);
  r = await call("GET", "/api/admin/users/student1", null, admin); assert.equal(r.body.ledger[0].amount, 500); assert.ok(r.body.history.length >= 4);
});
test("settings live in the database and reach the game", async () => {
  let r = await call("PUT", "/api/admin/settings/disabledEvents", {value:["EVT_43", "NW_REDSEA"]}, admin); assert.equal(r.status, 200);
  r = await call("PUT", "/api/admin/settings/prices", {value:{speed3:150}}, admin);
  r = await call("PUT", "/api/admin/settings/prices", {value:{speed3:-1}}, admin); assert.equal(r.body.error, "bad_value");
  r = await call("PUT", "/api/admin/settings/googleClientId", {value:"not a client id"}, admin); assert.equal(r.body.error, "bad_value");
  r = await call("PUT", "/api/admin/settings/googleClientId", {value:"123456-abc.apps.googleusercontent.com"}, admin); assert.equal(r.status, 200);
  r = await call("PUT", "/api/admin/settings/certMinCards", {value:7}, admin);
  r = await call("PUT", "/api/admin/settings/announcement", {value:{th:"ปิดปรับปรุงคืนนี้", en:""}}, admin);
  r = await call("PUT", "/api/admin/settings/nope", {value:1}, admin); assert.equal(r.body.error, "bad_key");
  r = await call("GET", "/api/config");
  assert.deepEqual(r.body.disabledEvents, ["EVT_43", "NW_REDSEA"]); assert.equal(r.body.prices.speed3, 150); assert.equal(r.body.googleClientId, "123456-abc.apps.googleusercontent.com");
  assert.equal(r.body.certMinCards, 7); assert.equal(r.body.announcement.th, "ปิดปรับปรุงคืนนี้"); assert.equal(r.body.balance, undefined);
  r = await call("PUT", "/api/admin/settings/googleClientId", {value:null}, admin); r = await call("GET", "/api/config"); assert.equal(r.body.googleClientId, null);
  r = await call("GET", "/api/admin/log?action=setting", null, admin); assert.equal(r.body.rows[0].detail.key, "googleClientId");
  r = await call("GET", "/api/admin/settings", null, admin); assert.equal(r.body.settings.certMinCards, 7); assert.equal(r.body.updated.certMinCards.by, "teacher");
});
test("dashboard overview, guests' games included", async () => {
  let r = await call("POST", "/api/stats/start", {mode:"normal"}); const g = r.body.id; assert.ok(g);
  r = await call("POST", `/api/stats/${g}`, {tick:290, ending:"win", temp:1.85, realSec:2700}); assert.equal(r.status, 200);
  r = await call("POST", "/api/stats/start", {mode:"normal"}, player);
  r = await call("GET", "/api/admin/overview", null, admin);
  assert.equal(r.body.players.total, 2); assert.equal(r.body.games.started, 2); assert.equal(r.body.games.wins, 1); assert.equal(r.body.games.minutes, 45);
  assert.equal(r.body.days.length, 14); assert.equal(r.body.days[13].games, 2);
});
test("sessions last a year and survive two tabs refreshing at once", async () => {
  let r = await call("POST", "/api/auth/login", {login:"teacher", password:"secret123"}); const rt = r.body.refresh;
  const exp = (await pool.query("SELECT MAX(expires_at) AS e FROM refresh_tokens")).rows[0].e;
  assert.ok(new Date(exp) - Date.now() > 360 * 864e5);
  const [a, b] = await Promise.all([call("POST", "/api/auth/refresh", {refresh:rt}), call("POST", "/api/auth/refresh", {refresh:rt})]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  await pool.query("UPDATE refresh_tokens SET expires_at = now() - interval '1 second' WHERE expires_at < now() + interval '2 minutes'");
  r = await call("POST", "/api/auth/refresh", {refresh:rt}); assert.equal(r.status, 401);
  r = await call("POST", "/api/auth/refresh", {refresh:a.body.refresh}); assert.equal(r.status, 200);
});
test("banned players can't sign in", async () => {
  let r = await call("POST", "/api/admin/users/student1/flags", {banned:true}, admin); assert.equal(r.body.banned, true);
  r = await call("POST", "/api/auth/login", {login:"student1", password:"secret123"}); assert.equal(r.body.error, "banned");
  r = await call("GET", "/api/me", null, player); assert.equal(r.status, 403);
  r = await call("POST", "/api/admin/users/teacher/flags", {banned:true}, admin); assert.equal(r.body.error, "cant_ban_self");
});
