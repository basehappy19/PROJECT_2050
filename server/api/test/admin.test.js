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
  r = await call("POST", "/api/admin/users/student1/flags", {certOverride:true, abGroup:"B"}, admin); assert.equal(r.body.flags.abGroup, "B");
  r = await call("GET", "/api/certificates", null, player); assert.equal(r.body.eligibility.eligible, true);
  r = await call("GET", "/api/me", null, player); assert.equal(r.body.user.abGroup, "B");
  r = await call("GET", "/api/admin/log", null, admin); assert.ok(r.body.rows.length >= 4); assert.equal(r.body.rows[0].target, "student1");
});
test("online settings reach the game", async () => {
  let r = await call("PUT", "/api/admin/config/balance", {value:{presets:{A:{inc:1}, B:{inc:0.8, haz:1.3}}, weights:{A:30, B:70}}}, admin); assert.equal(r.status, 200);
  r = await call("PUT", "/api/admin/config/balance", {value:{presets:{A:{inc:99}}}}, admin); assert.equal(r.body.error, "bad_value");
  r = await call("PUT", "/api/admin/config/disabledEvents", {value:["EVT_43"]}, admin);
  r = await call("PUT", "/api/admin/config/prices", {value:{speed3:150}}, admin);
  r = await call("GET", "/api/config"); assert.equal(r.body.balance.weights.B, 70); assert.deepEqual(r.body.disabledEvents, ["EVT_43"]); assert.equal(r.body.prices.speed3, 150);
});
test("play statistics for the A/B test, guests included", async () => {
  let r = await call("POST", "/api/stats/start", {ab:"A", mode:"normal"}); const g = r.body.id; assert.ok(g);
  r = await call("POST", `/api/stats/${g}`, {tick:290, ending:"win", temp:1.85, realSec:2700}); assert.equal(r.status, 200);
  r = await call("POST", "/api/stats/start", {ab:"B", mode:"normal"}, player); const b = r.body.id;
  await call("POST", `/api/stats/${b}`, {tick:120});
  await pool.query("UPDATE play_stats SET updated_at = now() - interval '2 hours' WHERE id = $1", [b]);
  r = await call("GET", "/api/admin/stats/ab", null, admin);
  const A = r.body.rows.find(x => x.ab === "A"), B = r.body.rows.find(x => x.ab === "B");
  assert.equal(A.wins, 1); assert.equal(A.grade_a, 1); assert.equal(B.quit, 1); assert.equal(Number(B.quit_year), 2036);
});
test("banned players can't sign in", async () => {
  let r = await call("POST", "/api/admin/users/student1/flags", {banned:true}, admin); assert.equal(r.body.banned, true);
  r = await call("POST", "/api/auth/login", {login:"student1", password:"secret123"}); assert.equal(r.body.error, "banned");
  r = await call("GET", "/api/me", null, player); assert.equal(r.status, 403);
  r = await call("POST", "/api/admin/users/teacher/flags", {banned:true}, admin); assert.equal(r.body.error, "cant_ban_self");
});
